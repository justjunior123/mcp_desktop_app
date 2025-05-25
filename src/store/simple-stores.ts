'use client'
import { create } from 'zustand'
import { devtools } from 'zustand/middleware'

// Simple app store without persist middleware
export interface SimpleAppState {
  sidebarCollapsed: boolean
  currentView: 'chat' | 'models' | 'settings' | 'store'
  isLoading: boolean
  loadingMessage: string
  error: string | null
  
  setSidebarCollapsed: (collapsed: boolean) => void
  setCurrentView: (view: SimpleAppState['currentView']) => void
  setLoading: (loading: boolean, message?: string) => void
  setError: (error: string | null) => void
  clearError: () => void
  toggleSidebar: () => void
}

export const useSimpleAppStore = create<SimpleAppState>()(
  devtools((set) => ({
    sidebarCollapsed: false,
    currentView: 'chat',
    isLoading: false,
    loadingMessage: '',
    error: null,
    
    setSidebarCollapsed: (collapsed) => set({ sidebarCollapsed: collapsed }),
    setCurrentView: (view) => set({ currentView: view }),
    setLoading: (loading, message = '') => set({ isLoading: loading, loadingMessage: message }),
    setError: (error) => set({ error }),
    clearError: () => set({ error: null }),
    toggleSidebar: () => set((state) => ({ sidebarCollapsed: !state.sidebarCollapsed })),
  }))
)

// Simple MCP store without persist middleware
export interface SimpleMCPServer {
  id: string
  name: string
  status: 'connected' | 'disconnected'
}

export interface SimpleModel {
  id: string
  name: string
  sizeFormatted: string
}

export interface SimpleMCPState {
  servers: SimpleMCPServer[]
  models: SimpleModel[]
  connectedServers: SimpleMCPServer[]
  downloadedModels: SimpleModel[]
  
  addServer: (server: SimpleMCPServer) => void
  addModel: (model: SimpleModel) => void
  setServerStatus: (serverId: string, status: 'connected' | 'disconnected') => void
}

export const useSimpleMCPStore = create<SimpleMCPState>()(
  devtools((set, get) => ({
    servers: [],
    models: [],
    connectedServers: [],
    downloadedModels: [],
    
    addServer: (server) => set((state) => ({
      servers: [...state.servers, server],
      connectedServers: server.status === 'connected' 
        ? [...state.connectedServers, server]
        : state.connectedServers
    })),
    
    addModel: (model) => set((state) => ({
      models: [...state.models, model],
      downloadedModels: [...state.downloadedModels, model]
    })),
    
    setServerStatus: (serverId, status) => set((state) => {
      const servers = state.servers.map(s => 
        s.id === serverId ? { ...s, status } : s
      )
      const connectedServers = servers.filter(s => s.status === 'connected')
      
      return { servers, connectedServers }
    }),
  }))
)

// Simple chat store without persist middleware
export interface SimpleChatSession {
  id: string
  title: string
  messages: any[]
  updatedAt: Date
  isPinned: boolean
  isArchived: boolean
  tags: string[]
}

export interface SimpleChatState {
  sessions: SimpleChatSession[]
  currentSessionId: string | null
  
  createSession: (title?: string) => string
  setCurrentSession: (sessionId: string | null) => void
  deleteSession: (sessionId: string) => void
  pinSession: (sessionId: string) => void
  archiveSession: (sessionId: string) => void
}

export const useSimpleChatStore = create<SimpleChatState>()(
  devtools((set, get) => ({
    sessions: [],
    currentSessionId: null,
    
    createSession: (title = 'New Chat') => {
      const id = `session_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`
      const session: SimpleChatSession = {
        id,
        title,
        messages: [],
        updatedAt: new Date(),
        isPinned: false,
        isArchived: false,
        tags: [],
      }
      
      set((state) => ({
        sessions: [...state.sessions, session],
        currentSessionId: id
      }))
      
      return id
    },
    
    setCurrentSession: (sessionId) => set({ currentSessionId: sessionId }),
    
    deleteSession: (sessionId) => set((state) => ({
      sessions: state.sessions.filter(s => s.id !== sessionId),
      currentSessionId: state.currentSessionId === sessionId ? null : state.currentSessionId
    })),
    
    pinSession: (sessionId) => set((state) => ({
      sessions: state.sessions.map(s => 
        s.id === sessionId ? { ...s, isPinned: !s.isPinned, updatedAt: new Date() } : s
      )
    })),
    
    archiveSession: (sessionId) => set((state) => ({
      sessions: state.sessions.map(s => 
        s.id === sessionId ? { ...s, isArchived: !s.isArchived, updatedAt: new Date() } : s
      )
    })),
  }))
)

// Helper hooks with stable selectors
export const useConnectedServers = () => useSimpleMCPStore(state => state.connectedServers)
export const useDownloadedModels = () => useSimpleMCPStore(state => state.downloadedModels)
export const useFilteredSessions = () => useSimpleChatStore(state => state.sessions)