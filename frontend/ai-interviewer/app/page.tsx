'use client'

import { useState, useRef, useEffect } from 'react'
import { Mic, MicOff, AudioWaveformIcon as Waveform } from 'lucide-react'

const DynamicAIIcon = ({ isActive }) => {
  return (
    <div className={`w-48 h-48 rounded-full flex items-center justify-center bg-blue-100 dark:bg-blue-900 transition-all duration-300 ${isActive ? 'scale-110' : 'scale-100'}`}>
      <Waveform className={`w-24 h-24 text-blue-500 dark:text-blue-300 transition-all duration-300 ${isActive ? 'animate-pulse' : ''}`} />
    </div>
  )
}

export default function VoiceAIChat() {
  const [messages, setMessages] = useState([
    { id: 1, text: "Hello! How can I assist you today?", sender: "ai" },
    { id: 2, text: "Can you tell me about the weather?", sender: "user" },
    { id: 3, text: "The weather today is sunny with a high of 75°F (24°C) and a low of 60°F (16°C). It's a perfect day to spend some time outdoors!", sender: "ai" },
  ])
  const [isRecording, setIsRecording] = useState(false)
  const [isAISpeaking, setIsAISpeaking] = useState(false)
  const [status, setStatus] = useState("Tap to speak")
  const chatContainerRef = useRef(null)

  const toggleRecording = () => {
    setIsRecording(!isRecording)
    setStatus(isRecording ? "Tap to speak" : "Listening...")
    // Simulate AI response after a short delay
    if (!isRecording) {
      setTimeout(() => {
        setIsAISpeaking(true)
        setStatus("AI is responding...")
        setTimeout(() => {
          setMessages(prev => [...prev, { id: prev.length + 1, text: "Here's a simulated AI response. How else can I help you?", sender: "ai" }])
          setIsAISpeaking(false)
          setStatus("Tap to speak")
        }, 3000)
      }, 2000)
    }
  }

  useEffect(() => {
    if (chatContainerRef.current) {
      chatContainerRef.current.scrollTop = chatContainerRef.current.scrollHeight
    }
  }, [messages])

  return (
    <div className="flex h-screen bg-gray-100 dark:bg-gray-900">
      <aside className="w-1/3 bg-white dark:bg-gray-800 shadow-lg overflow-hidden flex flex-col">
        <header className="bg-blue-500 dark:bg-blue-700 p-4">
          <h1 className="text-2xl font-bold text-white">Voice AI Chat</h1>
        </header>
        <div 
          ref={chatContainerRef}
          className="flex-grow overflow-y-auto p-4 space-y-4 scrollbar-thin scrollbar-thumb-gray-400 scrollbar-track-gray-200"
        >
          {messages.map((message) => (
            <div
              key={message.id}
              className={`flex ${message.sender === 'user' ? 'justify-end' : 'justify-start'}`}
            >
              <div
                className={`max-w-xs sm:max-w-sm md:max-w-md lg:max-w-lg xl:max-w-xl rounded-lg p-3 ${
                  message.sender === 'user'
                    ? 'bg-blue-500 text-white'
                    : 'bg-gray-200 dark:bg-gray-700 text-gray-900 dark:text-white'
                }`}
              >
                {message.text}
              </div>
            </div>
          ))}
        </div>
      </aside>
      <main className="flex-grow flex flex-col items-center justify-center p-4">
        <DynamicAIIcon isActive={isAISpeaking} />
        <p className="text-sm text-gray-500 dark:text-gray-400 mt-4 mb-2" aria-live="polite">
          {status}
        </p>
        <button
          onClick={toggleRecording}
          className={`w-16 h-16 rounded-full flex items-center justify-center focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 ${
            isRecording
              ? 'bg-red-500 hover:bg-red-600'
              : 'bg-blue-500 hover:bg-blue-600'
          }`}
          aria-label={isRecording ? "Stop recording" : "Start recording"}
        >
          {isRecording ? (
            <MicOff className="w-8 h-8 text-white" />
          ) : (
            <Mic className="w-8 h-8 text-white" />
          )}
        </button>
      </main>
    </div>
  )
}