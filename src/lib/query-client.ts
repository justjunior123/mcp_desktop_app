import { QueryClient, DefaultOptions } from '@tanstack/react-query'

const queryConfig: DefaultOptions = {
  queries: {
    // Stale time: 5 minutes
    staleTime: 1000 * 60 * 5,
    // Cache time: 10 minutes
    gcTime: 1000 * 60 * 10,
    // Retry failed requests 3 times
    retry: (failureCount, error: any) => {
      // Don't retry on 4xx errors (client errors)
      if (error?.status >= 400 && error?.status < 500) {
        return false
      }
      // Retry up to 3 times for other errors
      return failureCount < 3
    },
    // Retry delay with exponential backoff
    retryDelay: (attemptIndex) => Math.min(1000 * 2 ** attemptIndex, 30000),
    // Refetch on window focus in production
    refetchOnWindowFocus: process.env.NODE_ENV === 'production',
    // Don't refetch on reconnect automatically
    refetchOnReconnect: false,
    // Refetch on mount if data is stale
    refetchOnMount: true,
  },
  mutations: {
    // Retry failed mutations once
    retry: 1,
    // Retry delay for mutations
    retryDelay: 1000,
  },
}

export const queryClient = new QueryClient({
  defaultOptions: queryConfig,
})

// Query keys factory for consistent key management
export const queryKeys = {
  // MCP Servers
  servers: ['servers'] as const,
  server: (id: string) => ['servers', id] as const,
  serverStatus: (id: string) => ['servers', id, 'status'] as const,
  
  // Models
  models: ['models'] as const,
  model: (id: string) => ['models', id] as const,
  modelStatus: (id: string) => ['models', id, 'status'] as const,
  ollamaModels: ['models', 'ollama'] as const,
  
  // Chat
  chatSessions: ['chat', 'sessions'] as const,
  chatSession: (id: string) => ['chat', 'sessions', id] as const,
  chatMessages: (sessionId: string) => ['chat', 'sessions', sessionId, 'messages'] as const,
  
  // Store data (Smithery.ai)
  storeServers: (filters?: any) => ['store', 'servers', filters] as const,
  storeModels: (filters?: any) => ['store', 'models', filters] as const,
  storeCategories: ['store', 'categories'] as const,
  storeTags: ['store', 'tags'] as const,
  
  // Analytics
  analytics: ['analytics'] as const,
  usage: (period: string) => ['analytics', 'usage', period] as const,
  
  // System
  systemInfo: ['system', 'info'] as const,
  health: ['system', 'health'] as const,
} as const

// Type-safe query key helper
export type QueryKeys = typeof queryKeys

// Error types for better error handling
export interface ApiError {
  message: string
  status: number
  code?: string
  details?: any
}

export class QueryError extends Error {
  constructor(
    message: string,
    public status: number,
    public code?: string,
    public details?: any
  ) {
    super(message)
    this.name = 'QueryError'
  }
}

// Query options factory for common patterns
export const queryOptions = {
  // Real-time data that changes frequently
  realTime: {
    staleTime: 0,
    gcTime: 1000 * 60, // 1 minute
    refetchInterval: 5000, // 5 seconds
    refetchOnWindowFocus: true,
  },
  
  // Static data that rarely changes
  static: {
    staleTime: 1000 * 60 * 60, // 1 hour
    gcTime: 1000 * 60 * 60 * 24, // 24 hours
    refetchOnWindowFocus: false,
    refetchOnReconnect: false,
  },
  
  // User-specific data
  user: {
    staleTime: 1000 * 60 * 5, // 5 minutes
    gcTime: 1000 * 60 * 30, // 30 minutes
    refetchOnWindowFocus: true,
  },
  
  // Long-running operations
  longRunning: {
    staleTime: 1000 * 60 * 10, // 10 minutes
    gcTime: 1000 * 60 * 60, // 1 hour
    retry: 1,
  },
}

// Utility function for handling API responses
export const handleApiResponse = async <T>(response: Response): Promise<T> => {
  if (!response.ok) {
    let errorMessage = `HTTP ${response.status}: ${response.statusText}`
    let errorDetails: any = null
    
    try {
      const errorData = await response.json()
      errorMessage = errorData.message || errorMessage
      errorDetails = errorData.details || errorData
    } catch {
      // If we can't parse the error response, use the status text
    }
    
    throw new QueryError(errorMessage, response.status, undefined, errorDetails)
  }
  
  try {
    return await response.json()
  } catch (error) {
    throw new QueryError('Invalid JSON response', response.status, 'INVALID_JSON')
  }
}

// Pre-configured fetch function with error handling
export const apiFetch = async <T>(
  url: string, 
  options: RequestInit = {}
): Promise<T> => {
  const baseUrl = process.env.NODE_ENV === 'development' 
    ? 'http://localhost:3002'
    : ''
  
  const response = await fetch(`${baseUrl}${url}`, {
    headers: {
      'Content-Type': 'application/json',
      ...options.headers,
    },
    ...options,
  })
  
  return handleApiResponse<T>(response)
}

// Optimistic update helper
export const optimisticUpdate = <T>(
  queryKey: any[],
  updater: (oldData: T | undefined) => T
) => {
  return queryClient.setQueryData<T>(queryKey, updater)
}

// Invalidate related queries helper
export const invalidateQueries = (queryKey: any[]) => {
  return queryClient.invalidateQueries({ queryKey })
}

// Cancel ongoing queries helper
export const cancelQueries = (queryKey: any[]) => {
  return queryClient.cancelQueries({ queryKey })
}