import { AudioWaveform } from "@/components/ui/icons"

interface DynamicAIIconProps {
  isActive: boolean
}

export function DynamicAIIcon({ isActive }: DynamicAIIconProps) {
  return (
    <div className={`w-48 h-48 rounded-full flex items-center justify-center bg-blue-100 dark:bg-blue-900 transition-all duration-300 ${isActive ? 'scale-110' : 'scale-100'}`}>
      <AudioWaveform className={`w-24 h-24 text-blue-500 dark:text-blue-300 transition-all duration-300 ${isActive ? 'animate-pulse' : ''}`} />
    </div>
  )
} 