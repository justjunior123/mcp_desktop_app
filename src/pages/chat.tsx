'use client'
import React, { useEffect, useRef, useState } from 'react'
import { clsx } from 'clsx'
import { useChatStore, useMessages, useCurrentSession, useSelectedModel } from '@/store/chat'
import { Message } from '@/components/chat/Message'
import { ChatInput } from '@/components/chat/ChatInput'
import { ModelSelector } from '@/components/chat/ModelSelector'

// Icons
const ChatIcon = () => (
  <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-3.582 8-8 8a8.959 8.959 0 01-4.906-1.681L3 21l2.319-5.094A7.96 7.96 0 013 12c0-4.418 3.582-8 8-8s8 3.582 8 8z" />
  </svg>
)

const SparklesIcon = () => (
  <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 3v4M3 5h4M6 17v4m-2-2h4m5-16l2.286 6.857L21 12l-5.714 2.143L13 21l-2.286-6.857L5 12l5.714-2.143L13 3z" />
  </svg>
)

const NewChatIcon = () => (
  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
  </svg>
)

const SettingsIcon = () => (
  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
  </svg>
)

const WELCOME_PROMPTS = [
  "Help me brainstorm ideas for a new project",
  "Explain a complex concept in simple terms",
  "Write some code to solve a problem",
  "Help me plan my day efficiently",
  "Create a creative story or poem",
  "Analyze data or solve a math problem"
]

export default function ChatPage() {
  const messagesEndRef = useRef<HTMLDivElement>(null)
  const messagesContainerRef = useRef<HTMLDivElement>(null)
  const [showScrollToBottom, setShowScrollToBottom] = useState(false)

  // Store hooks
  const messages = useMessages()
  const currentSession = useCurrentSession()
  const selectedModel = useSelectedModel()
  const { 
    createSession, 
    setInputValue, 
    updateMessage, 
    deleteMessage,
    currentSessionId
  } = useChatStore()

  // Auto-scroll to bottom when new messages arrive
  useEffect(() => {
    if (messagesEndRef.current) {
      const behavior = messages.length > 10 ? 'smooth' : 'auto'
      messagesEndRef.current.scrollIntoView({ behavior })
    }
  }, [messages])

  // Handle scroll to show/hide scroll to bottom button
  useEffect(() => {
    const container = messagesContainerRef.current
    if (!container) return

    const handleScroll = () => {
      const { scrollTop, scrollHeight, clientHeight } = container
      const isNearBottom = scrollHeight - scrollTop - clientHeight < 200
      setShowScrollToBottom(!isNearBottom && messages.length > 0)
    }

    container.addEventListener('scroll', handleScroll)
    return () => container.removeEventListener('scroll', handleScroll)
  }, [messages.length])

  const handleScrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }

  const handleNewChat = () => {
    createSession()
  }

  const handlePromptClick = (prompt: string) => {
    setInputValue(prompt)
    // Focus will be handled by the ChatInput component
  }

  const hasMessages = messages.length > 0

  return (
    <div className="flex flex-col h-screen bg-gradient-to-br from-slate-50 via-white to-slate-50 dark:from-slate-900 dark:via-slate-800 dark:to-slate-900">
      
      {/* Header */}
      <div className="sticky top-0 z-40 bg-white/80 dark:bg-slate-900/80 backdrop-blur-sm border-b border-slate-200 dark:border-slate-700">
        <div className="max-w-4xl mx-auto px-4 py-4">
          <div className="flex items-center justify-between">
            
            {/* Left side - Session info */}
            <div className="flex items-center gap-4">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 bg-gradient-to-br from-primary-500 to-secondary-500 rounded-xl flex items-center justify-center text-white">
                  <ChatIcon />
                </div>
                <div>
                  <h1 className="text-xl font-bold text-slate-900 dark:text-white">
                    {currentSession?.title || 'New Chat'}
                  </h1>
                  <p className="text-sm text-slate-500 dark:text-slate-400">
                    {hasMessages ? `${messages.length} messages` : 'Start a conversation'}
                  </p>
                </div>
              </div>
            </div>

            {/* Right side - Actions */}
            <div className="flex items-center gap-3">
              {/* Model selector */}
              <div className="w-64">
                <ModelSelector />
              </div>

              {/* New chat button */}
              <button
                onClick={handleNewChat}
                className="flex items-center gap-2 px-4 py-2 bg-primary-500 hover:bg-primary-600 text-white rounded-lg transition-colors duration-200"
              >
                <NewChatIcon />
                <span className="hidden sm:block">New Chat</span>
              </button>

              {/* Settings button */}
              <button className="p-2 text-slate-500 hover:text-slate-700 dark:text-slate-400 dark:hover:text-slate-200 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors duration-200">
                <SettingsIcon />
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Main content area */}
      <div className="flex-1 relative">
        
        {/* Messages container */}
        <div 
          ref={messagesContainerRef}
          className="h-full overflow-y-auto pb-32"
          style={{ scrollbarWidth: 'thin' }}
        >
          {hasMessages ? (
            // Messages list
            <div className="max-w-4xl mx-auto px-4 py-6 space-y-6">
              {messages.map((message) => (
                <Message
                  key={message.id}
                  message={message}
                  isStreaming={message.status === 'streaming'}
                  onEdit={updateMessage}
                  onDelete={deleteMessage}
                />
              ))}
              <div ref={messagesEndRef} />
            </div>
          ) : (
            // Welcome screen
            <div className="h-full flex flex-col items-center justify-center px-4">
              <div className="max-w-2xl mx-auto text-center">
                
                {/* Hero section */}
                <div className="mb-12">
                  <div className="w-20 h-20 bg-gradient-to-br from-primary-500 via-secondary-500 to-accent-500 rounded-3xl flex items-center justify-center text-white mb-6 mx-auto shadow-strong">
                    <SparklesIcon />
                  </div>
                  
                  <h2 className="text-4xl font-bold text-slate-900 dark:text-white mb-4">
                    Welcome to AI Chat
                  </h2>
                  
                  <p className="text-lg text-slate-600 dark:text-slate-300 mb-8">
                    {selectedModel 
                      ? "Start a conversation with your AI assistant. Ask questions, get help, or just chat!"
                      : "Select a model above to begin chatting with AI"
                    }
                  </p>

                  {!selectedModel && (
                    <div className="p-4 bg-primary-50 dark:bg-primary-900/20 border border-primary-200 dark:border-primary-700 rounded-xl">
                      <p className="text-primary-800 dark:text-primary-200 font-medium">
                        👆 Choose an AI model from the dropdown above to get started
                      </p>
                    </div>
                  )}
                </div>

                {/* Quick prompts */}
                {selectedModel && (
                  <div className="space-y-4">
                    <h3 className="text-lg font-semibold text-slate-800 dark:text-slate-200 mb-4">
                      💡 Try asking about:
                    </h3>
                    
                    <div className="grid gap-3 md:grid-cols-2">
                      {WELCOME_PROMPTS.map((prompt, index) => (
                        <button
                          key={index}
                          onClick={() => handlePromptClick(prompt)}
                          className={clsx(
                            'p-4 text-left bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl',
                            'hover:shadow-medium hover:border-primary-300 dark:hover:border-primary-600',
                            'transition-all duration-200 hover:scale-[1.02]',
                            'text-slate-700 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white'
                          )}
                        >
                          <span className="block font-medium">
                            {prompt}
                          </span>
                        </button>
                      ))}
                    </div>
                  </div>
                )}

                {/* Tips */}
                <div className="mt-12 p-6 bg-slate-50 dark:bg-slate-800/50 rounded-2xl border border-slate-200 dark:border-slate-700">
                  <h4 className="font-semibold text-slate-800 dark:text-slate-200 mb-3">
                    💡 Pro Tips:
                  </h4>
                  <ul className="text-sm text-slate-600 dark:text-slate-400 space-y-2 text-left">
                    <li>• Use <kbd className="px-2 py-1 bg-slate-200 dark:bg-slate-700 rounded text-xs">Shift + Enter</kbd> for line breaks</li>
                    <li>• Your messages will fade over time, but stay visible when hovering</li>
                    <li>• Click on messages to copy, edit, or delete them</li>
                    <li>• Switch models anytime using the dropdown above</li>
                  </ul>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Scroll to bottom button */}
        {showScrollToBottom && (
          <button
            onClick={handleScrollToBottom}
            className="fixed bottom-32 right-8 z-30 w-12 h-12 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-full shadow-strong hover:shadow-medium transition-all duration-200 hover:scale-110 flex items-center justify-center text-slate-600 dark:text-slate-400 hover:text-slate-800 dark:hover:text-slate-200"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 14l-7 7m0 0l-7-7m7 7V3" />
            </svg>
          </button>
        )}

        {/* Chat input - positioned at bottom */}
        <ChatInput />
      </div>
    </div>
  )
}