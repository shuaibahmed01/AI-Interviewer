import { Button } from "@/components/ui/button"
import { Mic, MicOff } from "lucide-react"
import { DynamicAIIcon } from "./dynamic-ai-icon"

interface VoiceControlProps {
  isRecording: boolean
  isAISpeaking: boolean
  status: string
  onToggleRecording: () => void
}

export function VoiceControl({ 
  isRecording, 
  isAISpeaking, 
  status, 
  onToggleRecording 
}: VoiceControlProps) {
  return (
    <main className="flex-grow flex flex-col items-center justify-center p-4">
      <DynamicAIIcon isActive={isAISpeaking} />
      <p className="text-sm text-gray-500 dark:text-gray-400 mt-4 mb-2" aria-live="polite">
        {status}
      </p>
      <Button
        onClick={onToggleRecording}
        size="icon"
        variant={isRecording ? "destructive" : "default"}
        className="w-16 h-16 rounded-full"
        aria-label={isRecording ? "Stop recording" : "Start recording"}
      >
        {isRecording ? (
          <MicOff className="w-8 h-8" />
        ) : (
          <Mic className="w-8 h-8" />
        )}
      </Button>
    </main>
  )
} 