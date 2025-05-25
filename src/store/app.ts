import { create } from 'zustand'
import { devtools, persist } from 'zustand/middleware'
import { immer } from 'zustand/middleware/immer'

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
  isOnline: navigator.onLine,
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

// Selectors for optimized re-renders
export const useUser = () => useAppStore((state) => state.user)
export const useIsAuthenticated = () => useAppStore((state) => state.isAuthenticated)
export const useSidebarCollapsed = () => useAppStore((state) => state.sidebarCollapsed)
export const useCurrentView = () => useAppStore((state) => state.currentView)
export const useConnectionStatus = () => useAppStore((state) => state.connectionStatus)
export const useIsOnline = () => useAppStore((state) => state.isOnline)
export const useLoading = () => useAppStore((state) => ({ 
  isLoading: state.isLoading, 
  message: state.loadingMessage 
}))
export const useError = () => useAppStore((state) => state.error)