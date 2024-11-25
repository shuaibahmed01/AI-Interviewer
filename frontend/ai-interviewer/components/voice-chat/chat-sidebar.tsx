import { useRef, useEffect } from 'react'
import { ChatMessage } from './chat-message'

export interface Message {
  id: number
  text: string
  sender: 'user' | 'ai'
}

interface ChatSidebarProps {
  messages: Message[]
}

export function ChatSidebar({ messages }: ChatSidebarProps) {
  const chatContainerRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (chatContainerRef.current) {
      chatContainerRef.current.scrollTop = chatContainerRef.current.scrollHeight
    }
  }, [messages])

  return (
    <aside className="w-1/3 bg-white dark:bg-gray-800 shadow-lg overflow-hidden flex flex-col">
      <header className="bg-blue-500 dark:bg-blue-700 p-4">
        <h1 className="text-2xl font-bold text-white">Voice AI Chat</h1>
      </header>
      <div 
        ref={chatContainerRef}
        className="flex-grow overflow-y-auto p-4 space-y-4 scrollbar-thin scrollbar-thumb-gray-400 scrollbar-track-gray-200"
      >
        {messages.map((message) => (
          <ChatMessage key={message.id} message={message} />
        ))}
      </div>
    </aside>
  )
} 