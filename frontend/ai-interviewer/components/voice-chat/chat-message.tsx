interface ChatMessageProps {
  message: {
    id: number
    text: string
    sender: 'user' | 'ai'
  }
}

export function ChatMessage({ message }: ChatMessageProps) {
  return (
    <div
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
  )
} 