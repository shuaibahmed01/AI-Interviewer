'use client'

import { useState, useEffect, useRef } from 'react'
import { ChatSidebar } from '@/components/voice-chat/chat-sidebar'
import { VoiceControl } from '@/components/voice-chat/voice-control'
import { Message } from '@/components/voice-chat/chat-sidebar'

const SAMPLE_RATE = 16000
const NUM_CHANNELS = 1
declare const protobuf: any

export default function VoiceAIChat() {
  const [messages, setMessages] = useState<Message[]>([
    { id: 1, text: "Hello! I'm your AI interviewer. Shall we begin?", sender: "ai" },
  ])
  const [isRecording, setIsRecording] = useState(false)
  const [isAISpeaking, setIsAISpeaking] = useState(false)
  const [status, setStatus] = useState("Loading protobuf...")
  
  const audioContextRef = useRef<AudioContext | null>(null)
  const webSocketRef = useRef<WebSocket | null>(null)
  const scriptProcessorRef = useRef<ScriptProcessorNode | null>(null)
  const audioSourceRef = useRef<MediaStreamAudioSourceNode | null>(null)
  const frameRef = useRef<any>(null)
  const streamRef = useRef<MediaStream | null>(null)

  useEffect(() => {
    let isCurrentMount = true
    let scriptElement: HTMLScriptElement | null = null

    const loadProtobuf = async () => {
      return new Promise<void>((resolve, reject) => {
        scriptElement = document.createElement('script')
        scriptElement.src = 'https://cdn.jsdelivr.net/npm/protobufjs@7.X.X/dist/protobuf.min.js'
        scriptElement.async = true
        
        scriptElement.onload = async () => {
          if (!isCurrentMount) return
          try {
            const root = await protobuf.load("/frames.proto")
            frameRef.current = root.lookupType("pipecat.Frame")
            setStatus("Connecting to server...")
            connectWebSocket()
            resolve()
          } catch (error) {
            console.error('Error loading protobuf:', error)
            setStatus("Error loading protobuf")
            reject(error)
          }
        }
        
        scriptElement.onerror = (error) => {
          console.error('Error loading protobuf script:', error)
          setStatus("Error loading protobuf")
          reject(error)
        }
        
        document.body.appendChild(scriptElement)
      })
    }

    const connectWebSocket = () => {
      if (!isCurrentMount) return
      
      const ws = new WebSocket('ws://localhost:8765')
      console.log('Attempting WebSocket connection...')
      
      ws.onopen = () => {
        if (!isCurrentMount) {
          ws.close()
          return
        }
        console.log('WebSocket connected')
        setStatus('Ready to begin')
        webSocketRef.current = ws
      }

      ws.onmessage = async (event) => {
        if (!isCurrentMount) return
        console.log('Received WebSocket message')
        try {
          const arrayBuffer = await event.data.arrayBuffer()
          if (!frameRef.current) return

          const parsedFrame = frameRef.current.decode(new Uint8Array(arrayBuffer))
          console.log('Parsed frame:', parsedFrame)

          if (parsedFrame.audio && audioContextRef.current) {
            const audioData = new Uint8Array(parsedFrame.audio.audio)
            audioContextRef.current.decodeAudioData(
              audioData.buffer,
              (buffer) => {
                if (!isCurrentMount || !audioContextRef.current) return
                const source = audioContextRef.current.createBufferSource()
                source.buffer = buffer
                source.connect(audioContextRef.current.destination)
                source.start()
                setIsAISpeaking(true)
                source.onended = () => {
                  if (!isCurrentMount) return
                  setIsAISpeaking(false)
                  setStatus('Tap to speak')
                }
              },
              (error) => console.error('Audio decoding error:', error)
            )
          }

          if (parsedFrame.text) {
            setMessages(prev => [...prev, { 
              id: prev.length + 1, 
              text: parsedFrame.text.text, 
              sender: "ai" 
            }])
          }
        } catch (error) {
          console.error('Error handling message:', error)
        }
      }

      ws.onerror = (error) => {
        if (!isCurrentMount) return
        console.error('WebSocket error:', error)
        setStatus('Connection error')
      }

      ws.onclose = () => {
        if (!isCurrentMount) return
        console.log('WebSocket closed')
        setStatus('Connection closed')
        // Try to reconnect after a delay
        setTimeout(() => {
          if (isCurrentMount) {
            connectWebSocket()
          }
        }, 3000)
      }
    }

    loadProtobuf().catch(console.error)

    return () => {
      isCurrentMount = false
      cleanupResources()
      if (scriptElement && document.body.contains(scriptElement)) {
        document.body.removeChild(scriptElement)
      }
    }
  }, [])

  const cleanupResources = () => {
    if (scriptProcessorRef.current) {
      scriptProcessorRef.current.disconnect()
      scriptProcessorRef.current = null
    }
    if (audioSourceRef.current) {
      audioSourceRef.current.disconnect()
      audioSourceRef.current = null
    }
    if (streamRef.current) {
      streamRef.current.getTracks().forEach(track => track.stop())
      streamRef.current = null
    }
    if (webSocketRef.current) {
      webSocketRef.current.close()
      webSocketRef.current = null
    }
    if (audioContextRef.current) {
      audioContextRef.current.close()
      audioContextRef.current = null
    }
  }

  const startRecording = async () => {
    try {
      // Create audio context on user interaction
      if (!audioContextRef.current || audioContextRef.current.state === 'closed') {
        audioContextRef.current = new AudioContext({ sampleRate: SAMPLE_RATE })
      }
      await audioContextRef.current.resume()

      const stream = await navigator.mediaDevices.getUserMedia({
        audio: {
          sampleRate: SAMPLE_RATE,
          channelCount: NUM_CHANNELS,
          autoGainControl: true,
          echoCancellation: true,
          noiseSuppression: true,
        }
      })
      
      streamRef.current = stream
      const source = audioContextRef.current.createMediaStreamSource(stream)
      const processor = audioContextRef.current.createScriptProcessor(512, 1, 1)
      
      source.connect(processor)
      processor.connect(audioContextRef.current.destination)

      processor.onaudioprocess = (e) => {
        if (webSocketRef.current?.readyState === WebSocket.OPEN && frameRef.current) {
          const audioData = e.inputBuffer.getChannelData(0)
          const pcmData = new Int16Array(audioData.length)
          for (let i = 0; i < audioData.length; i++) {
            const s = Math.max(-1, Math.min(1, audioData[i]))
            pcmData[i] = s < 0 ? s * 0x8000 : s * 0x7FFF
          }
          
          const frame = frameRef.current.create({
            audio: {
              audio: Array.from(new Uint8Array(pcmData.buffer)),
              sampleRate: SAMPLE_RATE,
              numChannels: NUM_CHANNELS
            }
          })
          const encodedFrame = frameRef.current.encode(frame).finish()
          webSocketRef.current.send(encodedFrame)
        }
      }

      audioSourceRef.current = source
      scriptProcessorRef.current = processor
      setIsRecording(true)
      setStatus('Recording...')

    } catch (error) {
      console.error('Error starting recording:', error)
      setStatus('Error accessing microphone')
    }
  }

  const stopRecording = () => {
    if (scriptProcessorRef.current) {
      scriptProcessorRef.current.disconnect()
    }
    if (audioSourceRef.current) {
      audioSourceRef.current.disconnect()
    }
    if (streamRef.current) {
      streamRef.current.getTracks().forEach(track => track.stop())
    }
    setIsRecording(false)
    setStatus('Processing...')
  }

  const toggleRecording = async () => {
    if (!isRecording) {
      await startRecording()
    } else {
      stopRecording()
    }
  }

  return (
    <div className="flex h-screen bg-gray-100 dark:bg-gray-900">
      <ChatSidebar messages={messages} />
      <VoiceControl
        isRecording={isRecording}
        isAISpeaking={isAISpeaking}
        status={status}
        onToggleRecording={toggleRecording}
      />
    </div>
  )
}