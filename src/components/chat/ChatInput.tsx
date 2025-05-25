'use client'
import React, { useState, useRef, useEffect } from 'react'
import { clsx } from 'clsx'
import { useChatStore, useInputValue, useStreamingState, useSelectedModel } from '@/store/chat'
import { Button } from '@/components/ui/Button'

// Icons (using text for now, could be replaced with icon library)
const SendIcon = () => (
  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 19l9 2-9-18-9 18 9-2zm0 0v-8" />
  </svg>
)

const StopIcon = () => (
  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 10a1 1 0 011-1h4a1 1 0 011 1v4a1 1 0 01-1 1h-4a1 1 0 01-1-1v-4z" />
  </svg>
)

const MicIcon = () => (
  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 11a7 7 0 01-7 7m0 0a7 7 0 01-7-7m7 7v4m0 0H8m4 0h4m-4-8a3 3 0 01-3-3V5a3 3 0 116 0v6a3 3 0 01-3 3z" />
  </svg>
)

const AttachIcon = () => (
  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.172 7l-6.586 6.586a2 2 0 102.828 2.828l6.414-6.586a4 4 0 00-5.656-5.656l-6.415 6.585a6 6 0 108.486 8.486L20.5 13" />
  </svg>
)

export const ChatInput: React.FC = () => {
  const textareaRef = useRef<HTMLTextAreaElement>(null)
  const [rows, setRows] = useState(1)
  const maxRows = 6
  
  // Store hooks
  const inputValue = useInputValue()
  const streaming = useStreamingState()
  const selectedModel = useSelectedModel()
  const { setInputValue, addMessage, createSession, currentSessionId } = useChatStore()

  // Local state
  const [isFocused, setIsFocused] = useState(false)
  const [isComposing, setIsComposing] = useState(false)

  // Auto-resize textarea
  useEffect(() => {
    if (textareaRef.current) {
      const textarea = textareaRef.current
      textarea.style.height = 'auto'
      const scrollHeight = textarea.scrollHeight
      const lineHeight = 24 // Approximate line height
      const newRows = Math.min(Math.max(Math.ceil(scrollHeight / lineHeight), 1), maxRows)
      setRows(newRows)
      textarea.style.height = `${Math.min(scrollHeight, lineHeight * maxRows)}px`
    }
  }, [inputValue])

  const handleSubmit = () => {
    if (!inputValue.trim() || streaming.isStreaming || isComposing) return
    if (!selectedModel) {
      // TODO: Show toast notification to select a model
      return
    }

    // Create session if none exists
    let sessionId = currentSessionId
    if (!sessionId) {
      sessionId = createSession()
    }

    // Add user message
    addMessage({
      role: 'user',
      content: inputValue.trim(),
      status: 'sent'
    })

    // Clear input
    setInputValue('')
    setRows(1)

    // TODO: Here we would call the API to get the assistant response
    // For now, we'll add a mock response after a delay
    setTimeout(() => {
      addMessage({
        role: 'assistant',
        content: `This is a mock response to: "${inputValue.trim()}"\n\nThe backend is ready and this will be connected to the real API soon!`,
        status: 'sent',
        metadata: {
          model: selectedModel || 'unknown',
          tokens: 25,
          duration: 1200
        }
      })
    }, 1000)
  }

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey && !isComposing) {
      e.preventDefault()
      handleSubmit()
    }
  }

  const handleStopGeneration = () => {
    // TODO: Implement stop generation
    console.log('Stop generation')
  }

  const isDisabled = !selectedModel || (!inputValue.trim() && !streaming.isStreaming)

  return (
    <div className="fixed bottom-0 left-0 right-0 z-50">
      {/* Background blur effect */}
      <div className="absolute inset-0 bg-gradient-to-t from-white via-white/80 to-transparent dark:from-slate-900 dark:via-slate-900/80 backdrop-blur-sm" />
      
      {/* Main input container */}
      <div className="relative max-w-4xl mx-auto px-4 pb-6 pt-4">
        <div className={clsx(
          'relative bg-white dark:bg-slate-800 rounded-2xl border transition-all duration-300',
          'shadow-soft hover:shadow-medium focus-within:shadow-strong',
          isFocused 
            ? 'border-primary-300 dark:border-primary-600 ring-2 ring-primary-100 dark:ring-primary-900/50' 
            : 'border-slate-200 dark:border-slate-700',
          streaming.isStreaming && 'ring-2 ring-accent-200 dark:ring-accent-800 border-accent-300 dark:border-accent-600'
        )}>
          
          {/* Model not selected warning */}
          {!selectedModel && (
            <div className="absolute -top-12 left-0 right-0 flex justify-center">
              <div className="bg-warning-100 dark:bg-warning-900/50 border border-warning-300 dark:border-warning-700 text-warning-800 dark:text-warning-200 px-3 py-2 rounded-lg text-sm animate-slide-in">
                Please select a model to start chatting
              </div>
            </div>
          )}

          {/* Top edge glow effect when focused */}
          {isFocused && (
            <div className="absolute -top-px left-4 right-4 h-px bg-gradient-to-r from-transparent via-primary-400 to-transparent opacity-60" />
          )}

          <div className="flex items-end p-4 gap-3">
            
            {/* Left actions */}
            <div className="flex items-center gap-2 pb-2">
              <Button
                variant="ghost"
                size="sm"
                className="text-slate-500 hover:text-slate-700 dark:text-slate-400 dark:hover:text-slate-200 p-2"
                disabled
              >
                <AttachIcon />
              </Button>
              <Button
                variant="ghost"
                size="sm"
                className="text-slate-500 hover:text-slate-700 dark:text-slate-400 dark:hover:text-slate-200 p-2"
                disabled
              >
                <MicIcon />
              </Button>
            </div>

            {/* Main input area */}
            <div className="flex-1 relative">
              <textarea
                ref={textareaRef}
                value={inputValue}
                onChange={(e) => setInputValue(e.target.value)}
                onKeyDown={handleKeyDown}
                onFocus={() => setIsFocused(true)}
                onBlur={() => setIsFocused(false)}
                onCompositionStart={() => setIsComposing(true)}
                onCompositionEnd={() => setIsComposing(false)}
                placeholder={selectedModel ? "Type your message..." : "Select a model first..."}
                disabled={!selectedModel}
                rows={rows}
                className={clsx(
                  'w-full resize-none border-0 bg-transparent text-slate-900 dark:text-white',
                  'placeholder-slate-500 dark:placeholder-slate-400',
                  'focus:outline-none focus:ring-0',
                  'text-base leading-6',
                  !selectedModel && 'cursor-not-allowed opacity-50'
                )}
                style={{ 
                  minHeight: '24px',
                  maxHeight: `${24 * maxRows}px`,
                  scrollbarWidth: 'thin'
                }}
              />
              
              {/* Character count for very long messages */}
              {inputValue.length > 1000 && (
                <div className={clsx(
                  'absolute -bottom-5 right-0 text-xs',
                  inputValue.length > 2000 ? 'text-warning-600 dark:text-warning-400' : 'text-slate-400 dark:text-slate-500'
                )}>
                  {inputValue.length.toLocaleString()}/32,000
                </div>
              )}
            </div>

            {/* Right actions */}
            <div className="flex items-center gap-2 pb-2">
              {streaming.isStreaming ? (
                <Button
                  variant="danger"
                  size="sm"
                  onClick={handleStopGeneration}
                  className="px-4 py-2 animate-pulse"
                >
                  <StopIcon />
                  <span className="ml-2">Stop</span>
                </Button>
              ) : (
                <Button
                  variant="primary"
                  size="sm"
                  onClick={handleSubmit}
                  disabled={isDisabled}
                  className={clsx(
                    'px-4 py-2 transition-all duration-200',
                    !isDisabled && 'hover:scale-105 active:scale-95',
                    !isDisabled && 'shadow-glow hover:shadow-strong'
                  )}
                >
                  <SendIcon />
                  <span className="ml-2">Send</span>
                </Button>
              )}
            </div>
          </div>

          {/* Bottom gradient effect */}
          <div className="absolute bottom-0 left-0 right-0 h-1 bg-gradient-to-r from-primary-500 via-secondary-500 to-accent-500 rounded-b-2xl opacity-20" />
        </div>

        {/* Streaming indicator */}
        {streaming.isStreaming && (
          <div className="flex items-center justify-center mt-3 gap-2 text-accent-600 dark:text-accent-400">
            <div className="flex space-x-1">
              <div className="w-2 h-2 bg-current rounded-full animate-bounce" style={{ animationDelay: '0ms' }} />
              <div className="w-2 h-2 bg-current rounded-full animate-bounce" style={{ animationDelay: '150ms' }} />
              <div className="w-2 h-2 bg-current rounded-full animate-bounce" style={{ animationDelay: '300ms' }} />
            </div>
            <span className="text-sm font-medium">AI is thinking...</span>
          </div>
        )}
      </div>
    </div>
  )
}