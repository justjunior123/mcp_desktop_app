import { create } from 'zustand'
import { devtools, persist } from 'zustand/middleware'
import { immer } from 'zustand/middleware/immer'
import { useMemo } from 'react'

export type MessageRole = 'user' | 'assistant' | 'system'
export type MessageStatus = 'sending' | 'sent' | 'error' | 'streaming'

export interface Message {
  id: string
  role: MessageRole
  content: string
  timestamp: Date
  status: MessageStatus
  metadata?: {
    model?: string
    tokens?: number
    duration?: number
    error?: string
  }
}

export interface ChatSession {
  id: string
  title: string
  messages: Message[]
  createdAt: Date
  updatedAt: Date
  modelId?: string
  serverName?: string
  isArchived: boolean
  isPinned: boolean
  tags: string[]
}

export interface StreamingState {
  isStreaming: boolean
  currentMessageId: string | null
  partialContent: string
}

export interface ChatSettings {
  autoSave: boolean
  retainHistory: boolean
  maxHistoryLength: number
  streamingEnabled: boolean
  modelSettings: {
    temperature: number
    maxTokens: number
    topP: number
    frequencyPenalty: number
    presencePenalty: number
  }
}

export interface ChatState {
  // Sessions
  sessions: ChatSession[]
  currentSessionId: string | null
  
  // Active conversation
  messages: Message[]
  
  // Streaming state
  streaming: StreamingState
  
  // UI state
  inputValue: string
  isTyping: boolean
  selectedModel: string | null
  selectedServer: string | null
  
  // Settings
  settings: ChatSettings
  
  // Search and filters
  searchQuery: string
  filteredSessions: ChatSession[]
  
  // Actions - Session management
  createSession: (title?: string) => string
  deleteSession: (sessionId: string) => void
  updateSessionTitle: (sessionId: string, title: string) => void
  setCurrentSession: (sessionId: string | null) => void
  duplicateSession: (sessionId: string) => string
  archiveSession: (sessionId: string) => void
  pinSession: (sessionId: string) => void
  addSessionTag: (sessionId: string, tag: string) => void
  removeSessionTag: (sessionId: string, tag: string) => void
  
  // Actions - Message management
  addMessage: (message: Omit<Message, 'id' | 'timestamp'>) => string
  updateMessage: (messageId: string, content: string) => void
  deleteMessage: (messageId: string) => void
  setMessageStatus: (messageId: string, status: MessageStatus) => void
  clearMessages: () => void
  
  // Actions - Streaming
  startStreaming: (messageId: string) => void
  appendToStream: (content: string) => void
  endStreaming: () => void
  
  // Actions - UI state
  setInputValue: (value: string) => void
  setTyping: (typing: boolean) => void
  setSelectedModel: (modelId: string | null) => void
  setSelectedServer: (serverName: string | null) => void
  
  // Actions - Settings
  updateSettings: (settings: Partial<ChatSettings>) => void
  
  // Actions - Search
  setSearchQuery: (query: string) => void
  filterSessions: () => void
  
  // Actions - Utility
  exportSession: (sessionId: string) => string
  importSession: (sessionData: string) => void
  reset: () => void
}

const defaultSettings: ChatSettings = {
  autoSave: true,
  retainHistory: true,
  maxHistoryLength: 100,
  streamingEnabled: true,
  modelSettings: {
    temperature: 0.7,
    maxTokens: 2048,
    topP: 1.0,
    frequencyPenalty: 0,
    presencePenalty: 0,
  },
}

const initialState = {
  sessions: [],
  currentSessionId: null,
  messages: [],
  streaming: {
    isStreaming: false,
    currentMessageId: null,
    partialContent: '',
  },
  inputValue: '',
  isTyping: false,
  selectedModel: null,
  selectedServer: null,
  settings: defaultSettings,
  searchQuery: '',
  filteredSessions: [],
}

export const useChatStore = create<ChatState>()(
  devtools(
    persist(
      immer((set, get) => ({
        ...initialState,
        
        // Session management
        createSession: (title = 'New Chat') => {
          const id = `session_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`
          const session: ChatSession = {
            id,
            title,
            messages: [],
            createdAt: new Date(),
            updatedAt: new Date(),
            isArchived: false,
            isPinned: false,
            tags: [],
          }
          
          set((state) => {
            state.sessions.push(session)
            state.currentSessionId = id
            state.messages = []
          })
          
          return id
        },
        
        deleteSession: (sessionId) => set((state) => {
          state.sessions = state.sessions.filter(s => s.id !== sessionId)
          if (state.currentSessionId === sessionId) {
            state.currentSessionId = null
            state.messages = []
          }
        }),
        
        updateSessionTitle: (sessionId, title) => set((state) => {
          const session = state.sessions.find(s => s.id === sessionId)
          if (session) {
            session.title = title
            session.updatedAt = new Date()
          }
        }),
        
        setCurrentSession: (sessionId) => set((state) => {
          state.currentSessionId = sessionId
          const session = state.sessions.find(s => s.id === sessionId)
          state.messages = session ? [...session.messages] : []
        }),
        
        duplicateSession: (sessionId) => {
          const session = get().sessions.find(s => s.id === sessionId)
          if (!session) return ''
          
          const newId = `session_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`
          const duplicatedSession: ChatSession = {
            ...session,
            id: newId,
            title: `${session.title} (Copy)`,
            createdAt: new Date(),
            updatedAt: new Date(),
          }
          
          set((state) => {
            state.sessions.push(duplicatedSession)
          })
          
          return newId
        },
        
        archiveSession: (sessionId) => set((state) => {
          const session = state.sessions.find(s => s.id === sessionId)
          if (session) {
            session.isArchived = !session.isArchived
            session.updatedAt = new Date()
          }
        }),
        
        pinSession: (sessionId) => set((state) => {
          const session = state.sessions.find(s => s.id === sessionId)
          if (session) {
            session.isPinned = !session.isPinned
            session.updatedAt = new Date()
          }
        }),
        
        addSessionTag: (sessionId, tag) => set((state) => {
          const session = state.sessions.find(s => s.id === sessionId)
          if (session && !session.tags.includes(tag)) {
            session.tags.push(tag)
            session.updatedAt = new Date()
          }
        }),
        
        removeSessionTag: (sessionId, tag) => set((state) => {
          const session = state.sessions.find(s => s.id === sessionId)
          if (session) {
            session.tags = session.tags.filter(t => t !== tag)
            session.updatedAt = new Date()
          }
        }),
        
        // Message management
        addMessage: (messageData) => {
          const id = `msg_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`
          const message: Message = {
            ...messageData,
            id,
            timestamp: new Date(),
          }
          
          set((state) => {
            state.messages.push(message)
            
            // Update current session
            if (state.currentSessionId) {
              const session = state.sessions.find(s => s.id === state.currentSessionId)
              if (session) {
                session.messages.push(message)
                session.updatedAt = new Date()
                
                // Auto-generate title for first user message
                if (session.messages.length === 1 && message.role === 'user') {
                  session.title = message.content.slice(0, 50) + (message.content.length > 50 ? '...' : '')
                }
              }
            }
          })
          
          return id
        },
        
        updateMessage: (messageId, content) => set((state) => {
          const messageIndex = state.messages.findIndex(m => m.id === messageId)
          if (messageIndex !== -1) {
            state.messages[messageIndex].content = content
            
            // Update in session
            if (state.currentSessionId) {
              const session = state.sessions.find(s => s.id === state.currentSessionId)
              if (session) {
                const sessionMessageIndex = session.messages.findIndex(m => m.id === messageId)
                if (sessionMessageIndex !== -1) {
                  session.messages[sessionMessageIndex].content = content
                  session.updatedAt = new Date()
                }
              }
            }
          }
        }),
        
        deleteMessage: (messageId) => set((state) => {
          state.messages = state.messages.filter(m => m.id !== messageId)
          
          // Update in session
          if (state.currentSessionId) {
            const session = state.sessions.find(s => s.id === state.currentSessionId)
            if (session) {
              session.messages = session.messages.filter(m => m.id !== messageId)
              session.updatedAt = new Date()
            }
          }
        }),
        
        setMessageStatus: (messageId, status) => set((state) => {
          const message = state.messages.find(m => m.id === messageId)
          if (message) {
            message.status = status
            
            // Update in session
            if (state.currentSessionId) {
              const session = state.sessions.find(s => s.id === state.currentSessionId)
              if (session) {
                const sessionMessage = session.messages.find(m => m.id === messageId)
                if (sessionMessage) {
                  sessionMessage.status = status
                  session.updatedAt = new Date()
                }
              }
            }
          }
        }),
        
        clearMessages: () => set((state) => {
          state.messages = []
        }),
        
        // Streaming
        startStreaming: (messageId) => set((state) => {
          state.streaming.isStreaming = true
          state.streaming.currentMessageId = messageId
          state.streaming.partialContent = ''
        }),
        
        appendToStream: (content) => set((state) => {
          if (state.streaming.isStreaming) {
            state.streaming.partialContent += content
            
            // Update the message content
            if (state.streaming.currentMessageId) {
              const message = state.messages.find(m => m.id === state.streaming.currentMessageId)
              if (message) {
                message.content = state.streaming.partialContent
              }
            }
          }
        }),
        
        endStreaming: () => set((state) => {
          if (state.streaming.currentMessageId) {
            const message = state.messages.find(m => m.id === state.streaming.currentMessageId)
            if (message) {
              message.status = 'sent'
            }
          }
          
          state.streaming.isStreaming = false
          state.streaming.currentMessageId = null
          state.streaming.partialContent = ''
        }),
        
        // UI state
        setInputValue: (value) => set((state) => {
          state.inputValue = value
        }),
        
        setTyping: (typing) => set((state) => {
          state.isTyping = typing
        }),
        
        setSelectedModel: (modelId) => set((state) => {
          state.selectedModel = modelId
        }),
        
        setSelectedServer: (serverName) => set((state) => {
          state.selectedServer = serverName
        }),
        
        // Settings
        updateSettings: (settings) => set((state) => {
          state.settings = { ...state.settings, ...settings }
        }),
        
        // Search
        setSearchQuery: (query) => set((state) => {
          state.searchQuery = query
        }),
        
        filterSessions: () => set((state) => {
          const query = state.searchQuery.toLowerCase()
          if (!query) {
            state.filteredSessions = state.sessions
          } else {
            state.filteredSessions = state.sessions.filter(session =>
              session.title.toLowerCase().includes(query) ||
              session.tags.some(tag => tag.toLowerCase().includes(query)) ||
              session.messages.some(msg => msg.content.toLowerCase().includes(query))
            )
          }
        }),
        
        // Utility
        exportSession: (sessionId) => {
          const session = get().sessions.find(s => s.id === sessionId)
          return session ? JSON.stringify(session, null, 2) : ''
        },
        
        importSession: (sessionData) => {
          try {
            const session: ChatSession = JSON.parse(sessionData)
            session.id = `session_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`
            session.createdAt = new Date()
            session.updatedAt = new Date()
            
            set((state) => {
              state.sessions.push(session)
            })
          } catch (error) {
            console.error('Failed to import session:', error)
          }
        },
        
        reset: () => set((state) => {
          Object.assign(state, initialState)
        }),
      })),
      {
        name: 'mcp-chat-store',
        partialize: (state) => ({
          sessions: state.sessions,
          currentSessionId: state.currentSessionId,
          selectedModel: state.selectedModel,
          selectedServer: state.selectedServer,
          settings: state.settings,
        }),
      }
    ),
    {
      name: 'chat-store',
    }
  )
)

// Selectors for optimized re-renders with proper memoization
export const useCurrentSession = () => {
  const selector = useMemo(
    () => (state: ChatState) => state.sessions.find(s => s.id === state.currentSessionId),
    []
  )
  return useChatStore(selector)
}

export const useMessages = () => {
  const selector = useMemo(() => (state: ChatState) => state.messages, [])
  return useChatStore(selector)
}

export const useStreamingState = () => {
  const selector = useMemo(() => (state: ChatState) => state.streaming, [])
  return useChatStore(selector)
}

export const useInputValue = () => {
  const selector = useMemo(() => (state: ChatState) => state.inputValue, [])
  return useChatStore(selector)
}

export const useSelectedModel = () => {
  const selector = useMemo(() => (state: ChatState) => state.selectedModel, [])
  return useChatStore(selector)
}

export const useSelectedServer = () => {
  const selector = useMemo(() => (state: ChatState) => state.selectedServer, [])
  return useChatStore(selector)
}

export const useChatSettings = () => {
  const selector = useMemo(() => (state: ChatState) => state.settings, [])
  return useChatStore(selector)
}

export const useFilteredSessions = () => {
  const selector = useMemo(
    () => (state: ChatState) => state.searchQuery ? state.filteredSessions : state.sessions,
    []
  )
  return useChatStore(selector)
}