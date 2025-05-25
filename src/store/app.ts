import { create } from 'zustand'
import { devtools, persist } from 'zustand/middleware'
import { immer } from 'zustand/middleware/immer'
import { useMemo } from 'react'

export interface User {
  id: string
  name: string
  email: string
  avatar?: string
  preferences: {
    theme: 'light' | 'dark' | 'system'
    language: string
    notifications: boolean
  }
}

export interface AppState {
  // User state
  user: User | null
  isAuthenticated: boolean
  
  // UI state
  sidebarCollapsed: boolean
  currentView: 'chat' | 'models' | 'settings' | 'store'
  
  // Connection state
  isOnline: boolean
  connectionStatus: 'connected' | 'connecting' | 'disconnected' | 'error'
  
  // Loading states
  isLoading: boolean
  loadingMessage: string
  
  // Error state
  error: string | null
  
  // Actions
  setUser: (user: User | null) => void
  setAuthenticated: (authenticated: boolean) => void
  setSidebarCollapsed: (collapsed: boolean) => void
  setCurrentView: (view: AppState['currentView']) => void
  setConnectionStatus: (status: AppState['connectionStatus']) => void
  setOnline: (online: boolean) => void
  setLoading: (loading: boolean, message?: string) => void
  setError: (error: string | null) => void
  clearError: () => void
  
  // Theme actions
  setTheme: (theme: User['preferences']['theme']) => void
  toggleSidebar: () => void
  
  // Reset action
  reset: () => void
}

const initialState = {
  user: null,
  isAuthenticated: false,
  sidebarCollapsed: false,
  currentView: 'chat' as const,
  isOnline: typeof navigator !== 'undefined' ? navigator.onLine : true,
  connectionStatus: 'disconnected' as const,
  isLoading: false,
  loadingMessage: '',
  error: null,
}

export const useAppStore = create<AppState>()(
  devtools(
    persist(
      immer((set, get) => ({
        ...initialState,
        
        setUser: (user) => set((state) => {
          state.user = user
        }),
        
        setAuthenticated: (authenticated) => set((state) => {
          state.isAuthenticated = authenticated
        }),
        
        setSidebarCollapsed: (collapsed) => set((state) => {
          state.sidebarCollapsed = collapsed
        }),
        
        setCurrentView: (view) => set((state) => {
          state.currentView = view
        }),
        
        setConnectionStatus: (status) => set((state) => {
          state.connectionStatus = status
        }),
        
        setOnline: (online) => set((state) => {
          state.isOnline = online
        }),
        
        setLoading: (loading, message = '') => set((state) => {
          state.isLoading = loading
          state.loadingMessage = message
        }),
        
        setError: (error) => set((state) => {
          state.error = error
        }),
        
        clearError: () => set((state) => {
          state.error = null
        }),
        
        setTheme: (theme) => set((state) => {
          if (state.user) {
            state.user.preferences.theme = theme
          }
        }),
        
        toggleSidebar: () => set((state) => {
          state.sidebarCollapsed = !state.sidebarCollapsed
        }),
        
        reset: () => set((state) => {
          Object.assign(state, initialState)
        }),
      })),
      {
        name: 'mcp-app-store',
        partialize: (state) => ({
          user: state.user,
          isAuthenticated: state.isAuthenticated,
          sidebarCollapsed: state.sidebarCollapsed,
          currentView: state.currentView,
        }),
      }
    ),
    {
      name: 'app-store',
    }
  )
)

// Selectors for optimized re-renders with proper memoization
export const useUser = () => {
  const selector = useMemo(() => (state: AppState) => state.user, [])
  return useAppStore(selector)
}

export const useIsAuthenticated = () => {
  const selector = useMemo(() => (state: AppState) => state.isAuthenticated, [])
  return useAppStore(selector)
}

export const useSidebarCollapsed = () => {
  const selector = useMemo(() => (state: AppState) => state.sidebarCollapsed, [])
  return useAppStore(selector)
}

export const useCurrentView = () => {
  const selector = useMemo(() => (state: AppState) => state.currentView, [])
  return useAppStore(selector)
}

export const useConnectionStatus = () => {
  const selector = useMemo(() => (state: AppState) => state.connectionStatus, [])
  return useAppStore(selector)
}

export const useIsOnline = () => {
  const selector = useMemo(() => (state: AppState) => state.isOnline, [])
  return useAppStore(selector)
}

export const useLoading = () => {
  const selector = useMemo(() => (state: AppState) => ({ 
    isLoading: state.isLoading, 
    message: state.loadingMessage 
  }), [])
  return useAppStore(selector)
}

export const useError = () => {
  const selector = useMemo(() => (state: AppState) => state.error, [])
  return useAppStore(selector)
}