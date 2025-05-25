import { create } from 'zustand'
import { devtools, persist } from 'zustand/middleware'
import { immer } from 'zustand/middleware/immer'
import { shallow } from 'zustand/shallow'
import { useMemo } from 'react'

export type ServerStatus = 'disconnected' | 'connecting' | 'connected' | 'error' | 'installing'
export type ModelStatus = 'available' | 'downloading' | 'downloaded' | 'error' | 'installing'

export interface MCPServer {
  id: string
  name: string
  description: string
  version: string
  author: string
  status: ServerStatus
  config: {
    endpoint?: string
    apiKey?: string
    environment?: Record<string, string>
    enabled: boolean
  }
  capabilities: string[]
  lastConnected?: Date
  error?: string
  icon?: string
  category: string
  tags: string[]
  rating: number
  downloads: number
  repository?: string
  documentation?: string
}

export interface Model {
  id: string
  name: string
  description: string
  size: number
  sizeFormatted: string
  status: ModelStatus
  family: string
  version: string
  capabilities: string[]
  tags: string[]
  quantization?: string
  downloadProgress?: number
  error?: string
  serverId?: string
  lastUsed?: Date
  usageCount: number
  rating: number
  isLocal: boolean
  isRemote: boolean
}

export interface ServerInstallation {
  serverId: string
  status: 'pending' | 'installing' | 'completed' | 'failed'
  progress: number
  error?: string
  startedAt: Date
  completedAt?: Date
}

export interface ModelDownload {
  modelId: string
  status: 'pending' | 'downloading' | 'completed' | 'failed'
  progress: number
  speed: number
  error?: string
  startedAt: Date
  completedAt?: Date
  totalSize: number
  downloadedSize: number
}

export interface StoreFilters {
  category: string[]
  tags: string[]
  rating: number
  sortBy: 'name' | 'rating' | 'downloads' | 'updated'
  sortOrder: 'asc' | 'desc'
  searchQuery: string
}

export interface MCPState {
  // Servers
  servers: MCPServer[]
  installedServers: string[]
  
  // Models
  models: Model[]
  downloadedModels: string[]
  
  // Store data (from Smithery.ai)
  storeServers: MCPServer[]
  storeModels: Model[]
  
  // Active connections
  activeConnections: string[]
  
  // Installation/Download tracking
  installations: ServerInstallation[]
  downloads: ModelDownload[]
  
  // UI State
  selectedServerId: string | null
  selectedModelId: string | null
  storeView: 'servers' | 'models'
  
  // Filters and search
  filters: StoreFilters
  
  // Pagination
  pagination: {
    currentPage: number
    pageSize: number
    totalItems: number
    totalPages: number
  }
  
  // Actions - Server management
  addServer: (server: Omit<MCPServer, 'id'>) => string
  updateServer: (serverId: string, updates: Partial<MCPServer>) => void
  removeServer: (serverId: string) => void
  setServerStatus: (serverId: string, status: ServerStatus, error?: string) => void
  connectServer: (serverId: string) => void
  disconnectServer: (serverId: string) => void
  enableServer: (serverId: string, enabled: boolean) => void
  
  // Actions - Model management
  addModel: (model: Omit<Model, 'id'>) => string
  updateModel: (modelId: string, updates: Partial<Model>) => void
  removeModel: (modelId: string) => void
  setModelStatus: (modelId: string, status: ModelStatus, error?: string) => void
  
  // Actions - Installation/Download
  startServerInstallation: (serverId: string) => void
  updateInstallationProgress: (serverId: string, progress: number) => void
  completeInstallation: (serverId: string, success: boolean, error?: string) => void
  startModelDownload: (modelId: string) => void
  updateDownloadProgress: (modelId: string, progress: number, speed?: number, downloadedSize?: number) => void
  completeDownload: (modelId: string, success: boolean, error?: string) => void
  cancelDownload: (modelId: string) => void
  
  // Actions - Store data
  setStoreServers: (servers: MCPServer[]) => void
  setStoreModels: (models: Model[]) => void
  refreshStoreData: () => void
  
  // Actions - Selection
  setSelectedServer: (serverId: string | null) => void
  setSelectedModel: (modelId: string | null) => void
  setStoreView: (view: 'servers' | 'models') => void
  
  // Actions - Filters
  updateFilters: (filters: Partial<StoreFilters>) => void
  resetFilters: () => void
  applyFilters: () => void
  
  // Actions - Pagination
  setPage: (page: number) => void
  setPageSize: (size: number) => void
  
  // Actions - Utility
  getInstalledServers: () => MCPServer[]
  getDownloadedModels: () => Model[]
  getConnectedServers: () => MCPServer[]
  getActiveDownloads: () => ModelDownload[]
  getActiveInstallations: () => ServerInstallation[]
  searchServers: (query: string) => MCPServer[]
  searchModels: (query: string) => Model[]
  
  // Actions - Reset
  reset: () => void
}

const defaultFilters: StoreFilters = {
  category: [],
  tags: [],
  rating: 0,
  sortBy: 'rating',
  sortOrder: 'desc',
  searchQuery: '',
}

const initialState = {
  servers: [],
  installedServers: [],
  models: [],
  downloadedModels: [],
  storeServers: [],
  storeModels: [],
  activeConnections: [],
  installations: [],
  downloads: [],
  selectedServerId: null,
  selectedModelId: null,
  storeView: 'servers' as const,
  filters: defaultFilters,
  pagination: {
    currentPage: 1,
    pageSize: 20,
    totalItems: 0,
    totalPages: 0,
  },
}

export const useMCPStore = create<MCPState>()(
  devtools(
    persist(
      immer((set, get) => ({
        ...initialState,
        
        // Server management
        addServer: (serverData) => {
          const id = `server_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`
          const server: MCPServer = {
            ...serverData,
            id,
          }
          
          set((state) => {
            state.servers.push(server)
            if (server.config.enabled) {
              state.installedServers.push(id)
            }
          })
          
          return id
        },
        
        updateServer: (serverId, updates) => set((state) => {
          const serverIndex = state.servers.findIndex(s => s.id === serverId)
          if (serverIndex !== -1) {
            Object.assign(state.servers[serverIndex], updates)
          }
        }),
        
        removeServer: (serverId) => set((state) => {
          state.servers = state.servers.filter(s => s.id !== serverId)
          state.installedServers = state.installedServers.filter(id => id !== serverId)
          state.activeConnections = state.activeConnections.filter(id => id !== serverId)
        }),
        
        setServerStatus: (serverId, status, error) => set((state) => {
          const server = state.servers.find(s => s.id === serverId)
          if (server) {
            server.status = status
            if (error) {
              server.error = error
            } else {
              delete server.error
            }
            if (status === 'connected') {
              server.lastConnected = new Date()
              if (!state.activeConnections.includes(serverId)) {
                state.activeConnections.push(serverId)
              }
            } else {
              state.activeConnections = state.activeConnections.filter(id => id !== serverId)
            }
          }
        }),
        
        connectServer: (serverId) => set((state) => {
          const server = state.servers.find(s => s.id === serverId)
          if (server) {
            server.status = 'connecting'
          }
        }),
        
        disconnectServer: (serverId) => set((state) => {
          const server = state.servers.find(s => s.id === serverId)
          if (server) {
            server.status = 'disconnected'
          }
          state.activeConnections = state.activeConnections.filter(id => id !== serverId)
        }),
        
        enableServer: (serverId, enabled) => set((state) => {
          const server = state.servers.find(s => s.id === serverId)
          if (server) {
            server.config.enabled = enabled
            if (enabled && !state.installedServers.includes(serverId)) {
              state.installedServers.push(serverId)
            } else if (!enabled) {
              state.installedServers = state.installedServers.filter(id => id !== serverId)
              state.activeConnections = state.activeConnections.filter(id => id !== serverId)
            }
          }
        }),
        
        // Model management
        addModel: (modelData) => {
          const id = `model_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`
          const model: Model = {
            ...modelData,
            id,
          }
          
          set((state) => {
            state.models.push(model)
            if (model.status === 'downloaded') {
              state.downloadedModels.push(id)
            }
          })
          
          return id
        },
        
        updateModel: (modelId, updates) => set((state) => {
          const modelIndex = state.models.findIndex(m => m.id === modelId)
          if (modelIndex !== -1) {
            Object.assign(state.models[modelIndex], updates)
            
            const model = state.models[modelIndex]
            if (model.status === 'downloaded' && !state.downloadedModels.includes(modelId)) {
              state.downloadedModels.push(modelId)
            } else if (model.status !== 'downloaded') {
              state.downloadedModels = state.downloadedModels.filter(id => id !== modelId)
            }
          }
        }),
        
        removeModel: (modelId) => set((state) => {
          state.models = state.models.filter(m => m.id !== modelId)
          state.downloadedModels = state.downloadedModels.filter(id => id !== modelId)
        }),
        
        setModelStatus: (modelId, status, error) => set((state) => {
          const model = state.models.find(m => m.id === modelId)
          if (model) {
            model.status = status
            if (error) {
              model.error = error
            } else {
              delete model.error
            }
            
            if (status === 'downloaded') {
              if (!state.downloadedModels.includes(modelId)) {
                state.downloadedModels.push(modelId)
              }
            } else {
              state.downloadedModels = state.downloadedModels.filter(id => id !== modelId)
            }
          }
        }),
        
        
        // Installation/Download tracking
        startServerInstallation: (serverId) => set((state) => {
          const installation: ServerInstallation = {
            serverId,
            status: 'installing',
            progress: 0,
            startedAt: new Date(),
          }
          
          const existingIndex = state.installations.findIndex(i => i.serverId === serverId)
          if (existingIndex !== -1) {
            state.installations[existingIndex] = installation
          } else {
            state.installations.push(installation)
          }
        }),
        
        updateInstallationProgress: (serverId, progress) => set((state) => {
          const installation = state.installations.find(i => i.serverId === serverId)
          if (installation) {
            installation.progress = progress
          }
        }),
        
        completeInstallation: (serverId, success, error) => set((state) => {
          const installation = state.installations.find(i => i.serverId === serverId)
          if (installation) {
            installation.status = success ? 'completed' : 'failed'
            installation.completedAt = new Date()
            if (error) {
              installation.error = error
            }
          }
        }),
        
        startModelDownload: (modelId) => set((state) => {
          const model = state.models.find(m => m.id === modelId)
          const download: ModelDownload = {
            modelId,
            status: 'downloading',
            progress: 0,
            speed: 0,
            startedAt: new Date(),
            totalSize: model?.size || 0,
            downloadedSize: 0,
          }
          
          const existingIndex = state.downloads.findIndex(d => d.modelId === modelId)
          if (existingIndex !== -1) {
            state.downloads[existingIndex] = download
          } else {
            state.downloads.push(download)
          }
        }),
        
        updateDownloadProgress: (modelId: string, progress: number, speed?: number, downloadedSize?: number) => set((state) => {
          const download = state.downloads.find(d => d.modelId === modelId)
          if (download) {
            download.progress = progress
            if (speed !== undefined) download.speed = speed
            if (downloadedSize !== undefined) download.downloadedSize = downloadedSize
          }
          
          // Also update the model
          const model = state.models.find(m => m.id === modelId)
          if (model) {
            model.downloadProgress = progress
          }
        }),
        
        completeDownload: (modelId, success, error) => set((state) => {
          const download = state.downloads.find(d => d.modelId === modelId)
          if (download) {
            download.status = success ? 'completed' : 'failed'
            download.completedAt = new Date()
            if (error) {
              download.error = error
            }
          }
        }),
        
        cancelDownload: (modelId) => set((state) => {
          state.downloads = state.downloads.filter(d => d.modelId !== modelId)
          const model = state.models.find(m => m.id === modelId)
          if (model) {
            model.status = 'available'
            delete model.downloadProgress
          }
        }),
        
        // Store data
        setStoreServers: (servers) => set((state) => {
          state.storeServers = servers
        }),
        
        setStoreModels: (models) => set((state) => {
          state.storeModels = models
        }),
        
        refreshStoreData: () => {
          // This would trigger a refetch in the component
        },
        
        // Selection
        setSelectedServer: (serverId) => set((state) => {
          state.selectedServerId = serverId
        }),
        
        setSelectedModel: (modelId) => set((state) => {
          state.selectedModelId = modelId
        }),
        
        setStoreView: (view) => set((state) => {
          state.storeView = view
        }),
        
        // Filters
        updateFilters: (filters) => set((state) => {
          state.filters = { ...state.filters, ...filters }
        }),
        
        resetFilters: () => set((state) => {
          state.filters = defaultFilters
        }),
        
        applyFilters: () => {
          // This would be handled by React Query with the filter parameters
        },
        
        // Pagination
        setPage: (page) => set((state) => {
          state.pagination.currentPage = page
        }),
        
        setPageSize: (size) => set((state) => {
          state.pagination.pageSize = size
          state.pagination.currentPage = 1 // Reset to first page
        }),
        
        // Utility functions (memoized for stable references)
        getInstalledServers: () => {
          const state = get()
          return state.servers.filter(s => state.installedServers.includes(s.id))
        },
        
        getDownloadedModels: () => {
          const state = get()
          return state.models.filter(m => state.downloadedModels.includes(m.id))
        },
        
        getConnectedServers: () => {
          const state = get()
          return state.servers.filter(s => state.activeConnections.includes(s.id))
        },
        
        getActiveDownloads: () => {
          const state = get()
          return state.downloads.filter(d => d.status === 'downloading')
        },
        
        getActiveInstallations: () => {
          const state = get()
          return state.installations.filter(i => i.status === 'installing')
        },
        
        searchServers: (query) => {
          const state = get()
          const lowerQuery = query.toLowerCase()
          return state.servers.filter(server =>
            server.name.toLowerCase().includes(lowerQuery) ||
            server.description.toLowerCase().includes(lowerQuery) ||
            server.tags.some(tag => tag.toLowerCase().includes(lowerQuery))
          )
        },
        
        searchModels: (query) => {
          const state = get()
          const lowerQuery = query.toLowerCase()
          return state.models.filter(model =>
            model.name.toLowerCase().includes(lowerQuery) ||
            model.description.toLowerCase().includes(lowerQuery) ||
            model.tags.some(tag => tag.toLowerCase().includes(lowerQuery))
          )
        },
        
        reset: () => set((state) => {
          Object.assign(state, initialState)
        }),
      })),
      {
        name: 'mcp-store',
        partialize: (state) => ({
          servers: state.servers,
          installedServers: state.installedServers,
          models: state.models,
          downloadedModels: state.downloadedModels,
          selectedServerId: state.selectedServerId,
          selectedModelId: state.selectedModelId,
          filters: state.filters,
          pagination: state.pagination,
        }),
      }
    ),
    {
      name: 'mcp-store',
    }
  )
)

// Create memoized selectors to prevent infinite loops

// Selectors for optimized re-renders with proper memoization
export const useInstalledServers = () => {
  const selector = useMemo(
    () => (state: MCPState) => state.servers.filter(s => state.installedServers.includes(s.id)),
    []
  )
  return useMCPStore(selector, shallow)
}

export const useConnectedServers = () => {
  const selector = useMemo(
    () => (state: MCPState) => state.servers.filter(s => state.activeConnections.includes(s.id)),
    []
  )
  return useMCPStore(selector, shallow)
}

export const useDownloadedModels = () => {
  const selector = useMemo(
    () => (state: MCPState) => state.models.filter(m => state.downloadedModels.includes(m.id)),
    []
  )
  return useMCPStore(selector, shallow)
}

export const useActiveDownloads = () => {
  const selector = useMemo(
    () => (state: MCPState) => state.downloads.filter(d => d.status === 'downloading'),
    []
  )
  return useMCPStore(selector, shallow)
}

export const useStoreFilters = () => {
  const selector = useMemo(() => (state: MCPState) => state.filters, [])
  return useMCPStore(selector)
}

export const useStorePagination = () => {
  const selector = useMemo(() => (state: MCPState) => state.pagination, [])
  return useMCPStore(selector)
}