'use client'
import React, { useState, useEffect } from 'react'
import { clsx } from 'clsx'
import { Message as MessageType, MessageRole, MessageStatus } from '@/store/chat'

interface MessageProps {
  message: MessageType
  isStreaming?: boolean
  showTimestamp?: boolean
  onEdit?: (messageId: string, newContent: string) => void
  onDelete?: (messageId: string) => void
}

// Icons
const UserIcon = () => (
  <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24">
    <path d="M12 12c2.21 0 4-1.79 4-4s-1.79-4-4-4-4 1.79-4 4 1.79 4 4 4zm0 2c-2.67 0-8 1.34-8 4v2h16v-2c0-2.66-5.33-4-8-4z"/>
  </svg>
)

const BotIcon = () => (
  <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24">
    <path d="M12 2C13.1 2 14 2.9 14 4C14 5.1 13.1 6 12 6C10.9 6 10 5.1 10 4C10 2.9 10.9 2 12 2ZM21 9V7L15 1H5C3.89 1 3 1.89 3 3V7H9L12.5 3.5L14.5 5.5L21 9ZM7.5 13C7.5 11.61 8.61 10.5 10 10.5S12.5 11.61 12.5 13S11.39 15.5 10 15.5S7.5 14.39 7.5 13ZM16 10.5C17.39 10.5 18.5 11.61 18.5 13S17.39 15.5 16 15.5S14.5 14.39 14.5 13S15.61 10.5 16 10.5Z"/>
  </svg>
)

const SystemIcon = () => (
  <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24">
    <path d="M12 2L2 7L12 12L22 7L12 2ZM2 17L12 22L22 17M2 12L12 17L22 12"/>
  </svg>
)

const CopyIcon = () => (
  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" />
  </svg>
)

const EditIcon = () => (
  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
  </svg>
)

const DeleteIcon = () => (
  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
  </svg>
)

const getIcon = (role: MessageRole) => {
  switch (role) {
    case 'user': return <UserIcon />
    case 'assistant': return <BotIcon />
    case 'system': return <SystemIcon />
    default: return <BotIcon />
  }
}

const getStatusColor = (status: MessageStatus) => {
  switch (status) {
    case 'sending': return 'text-warning-500'
    case 'sent': return 'text-success-500'
    case 'error': return 'text-error-500'
    case 'streaming': return 'text-accent-500'
    default: return 'text-slate-400'
  }
}

const formatTimestamp = (timestamp: Date) => {
  const now = new Date()
  const diff = now.getTime() - timestamp.getTime()
  const minutes = Math.floor(diff / 60000)
  const hours = Math.floor(diff / 3600000)
  const days = Math.floor(diff / 86400000)

  if (minutes < 1) return 'Just now'
  if (minutes < 60) return `${minutes}m ago`
  if (hours < 24) return `${hours}h ago`
  if (days < 7) return `${days}d ago`
  return timestamp.toLocaleDateString()
}

export const Message: React.FC<MessageProps> = ({ 
  message, 
  isStreaming = false, 
  showTimestamp = true,
  onEdit,
  onDelete 
}) => {
  const [isHovered, setIsHovered] = useState(false)
  const [showActions, setShowActions] = useState(false)
  const [isFading, setIsFading] = useState(false)
  const [opacity, setOpacity] = useState(1)
  const [copied, setCopied] = useState(false)

  const isUser = message.role === 'user'
  const isSystem = message.role === 'system'
  const hasError = message.status === 'error'
  const isSending = message.status === 'sending'

  // Fade out effect for user messages (as requested)
  useEffect(() => {
    if (isUser && message.status === 'sent') {
      const timer = setTimeout(() => {
        setIsFading(true)
        // Gradually reduce opacity over 30 seconds
        const fadeInterval = setInterval(() => {
          setOpacity(prev => {
            if (prev <= 0.3) {
              clearInterval(fadeInterval)
              return 0.3 // Don't fade completely, keep some visibility
            }
            return prev - 0.02
          })
        }, 300)
        
        return () => clearInterval(fadeInterval)
      }, 5000) // Start fading after 5 seconds

      return () => clearTimeout(timer)
    }
  }, [isUser, message.status])

  // Reset opacity on hover
  useEffect(() => {
    if (isHovered && isFading) {
      setOpacity(1)
    } else if (!isHovered && isFading) {
      setOpacity(0.3)
    }
  }, [isHovered, isFading])

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(message.content)
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    } catch (err) {
      console.error('Failed to copy message:', err)
    }
  }

  const handleEdit = () => {
    if (onEdit) {
      const newContent = prompt('Edit message:', message.content)
      if (newContent && newContent !== message.content) {
        onEdit(message.id, newContent)
      }
    }
  }

  const handleDelete = () => {
    if (onDelete && confirm('Delete this message?')) {
      onDelete(message.id)
    }
  }

  return (
    <div 
      className={clsx(
        'group relative transition-all duration-300 ease-in-out',
        'animate-slide-in',
        isUser ? 'ml-auto max-w-[85%]' : 'mr-auto max-w-[90%]'
      )}
      style={{ opacity }}
      onMouseEnter={() => {
        setIsHovered(true)
        setShowActions(true)
      }}
      onMouseLeave={() => {
        setIsHovered(false)
        setTimeout(() => setShowActions(false), 200)
      }}
    >
      <div className={clsx(
        'flex gap-3 p-4 rounded-2xl transition-all duration-200',
        isUser 
          ? 'bg-gradient-to-br from-primary-500 to-primary-600 text-white shadow-soft' 
          : isSystem
          ? 'bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-slate-700'
          : 'bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 shadow-soft',
        hasError && 'border-error-300 dark:border-error-600 bg-error-50 dark:bg-error-900/20',
        isSending && 'opacity-70',
        isStreaming && 'border-accent-300 dark:border-accent-600',
        'hover:shadow-medium group-hover:scale-[1.02]'
      )}>
        
        {/* Avatar */}
        <div className={clsx(
          'flex-shrink-0 w-8 h-8 rounded-full flex items-center justify-center',
          isUser 
            ? 'bg-white/20 text-white' 
            : isSystem
            ? 'bg-slate-200 dark:bg-slate-700 text-slate-600 dark:text-slate-300'
            : 'bg-gradient-to-br from-secondary-400 to-secondary-600 text-white'
        )}>
          {getIcon(message.role)}
        </div>

        {/* Content */}
        <div className="flex-1 min-w-0">
          {/* Message content */}
          <div className={clsx(
            'prose prose-sm max-w-none',
            isUser 
              ? 'prose-invert' 
              : 'prose-slate dark:prose-invert',
            'leading-relaxed whitespace-pre-wrap break-words'
          )}>
            {message.content}
            
            {/* Streaming cursor */}
            {isStreaming && (
              <span className="inline-block w-2 h-5 ml-1 bg-current animate-pulse" />
            )}
          </div>

          {/* Metadata */}
          <div className="flex items-center justify-between mt-2">
            <div className="flex items-center gap-2 text-xs">
              {/* Timestamp */}
              {showTimestamp && (
                <span className={clsx(
                  'transition-opacity duration-200',
                  isUser ? 'text-white/70' : 'text-slate-500 dark:text-slate-400'
                )}>
                  {formatTimestamp(message.timestamp)}
                </span>
              )}

              {/* Model info */}
              {message.metadata?.model && !isUser && (
                <span className={clsx(
                  'px-2 py-1 rounded-full text-xs',
                  'bg-slate-100 dark:bg-slate-700 text-slate-600 dark:text-slate-300'
                )}>
                  {message.metadata.model}
                </span>
              )}

              {/* Performance info */}
              {message.metadata?.tokens && (
                <span className="text-slate-400 dark:text-slate-500">
                  {message.metadata.tokens} tokens
                </span>
              )}
              
              {message.metadata?.duration && (
                <span className="text-slate-400 dark:text-slate-500">
                  {(message.metadata.duration / 1000).toFixed(1)}s
                </span>
              )}
            </div>

            {/* Status indicator */}
            <div className={clsx(
              'w-2 h-2 rounded-full transition-colors duration-200',
              getStatusColor(message.status)
            )} />
          </div>

          {/* Error message */}
          {hasError && message.metadata?.error && (
            <div className="mt-2 p-2 bg-error-100 dark:bg-error-900/30 border border-error-200 dark:border-error-800 rounded-lg">
              <p className="text-xs text-error-700 dark:text-error-300">
                Error: {message.metadata.error}
              </p>
            </div>
          )}
        </div>
      </div>

      {/* Action buttons */}
      {showActions && !isSending && (
        <div className={clsx(
          'absolute -top-2 transition-all duration-200',
          isUser ? 'left-0' : 'right-0',
          'flex items-center gap-1 px-2 py-1 bg-white dark:bg-slate-800 rounded-lg shadow-medium border border-slate-200 dark:border-slate-700'
        )}>
          <button
            onClick={handleCopy}
            className="p-1 hover:bg-slate-100 dark:hover:bg-slate-700 rounded text-slate-600 dark:text-slate-400 hover:text-slate-800 dark:hover:text-slate-200 transition-colors"
            title={copied ? 'Copied!' : 'Copy message'}
          >
            <CopyIcon />
          </button>

          {isUser && onEdit && (
            <button
              onClick={handleEdit}
              className="p-1 hover:bg-slate-100 dark:hover:bg-slate-700 rounded text-slate-600 dark:text-slate-400 hover:text-slate-800 dark:hover:text-slate-200 transition-colors"
              title="Edit message"
            >
              <EditIcon />
            </button>
          )}

          {onDelete && (
            <button
              onClick={handleDelete}
              className="p-1 hover:bg-slate-100 dark:hover:bg-slate-700 rounded text-slate-600 dark:text-slate-400 hover:text-error-600 dark:hover:text-error-400 transition-colors"
              title="Delete message"
            >
              <DeleteIcon />
            </button>
          )}
        </div>
      )}

      {/* Copied notification */}
      {copied && (
        <div className="absolute -top-8 left-1/2 transform -translate-x-1/2 px-2 py-1 bg-success-500 text-white text-xs rounded shadow-medium animate-fade-in">
          Copied!
        </div>
      )}
    </div>
  )
}