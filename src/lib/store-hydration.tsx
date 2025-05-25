'use client'
import { useEffect, useState } from 'react'

// Hook to handle SSR-safe store hydration
export function useHydration() {
  const [isHydrated, setIsHydrated] = useState(false)

  useEffect(() => {
    setIsHydrated(true)
  }, [])

  return isHydrated
}

// SSR-safe store hook wrapper
export function useSSRSafeStore<T>(
  storeHook: () => T,
  fallback: T
): T {
  const isHydrated = useHydration()
  const storeValue = storeHook()
  
  return isHydrated ? storeValue : fallback
}

// Component to wrap content that uses stores
export function StoreHydration({ children }: { children: React.ReactNode }) {
  const isHydrated = useHydration()

  if (!isHydrated) {
    // Return a loading state or minimal UI during SSR
    return (
      <div className="flex h-screen bg-slate-50 dark:bg-slate-900">
        <div className="w-80 bg-white dark:bg-slate-800 border-r border-slate-200 dark:border-slate-700"></div>
        <div className="flex-1 flex flex-col">
          <div className="h-16 bg-white dark:bg-slate-800 border-b border-slate-200 dark:border-slate-700"></div>
          <div className="flex-1 flex items-center justify-center">
            <div className="w-8 h-8 border-4 border-primary-200 border-t-primary-500 rounded-full animate-spin" />
          </div>
        </div>
      </div>
    )
  }

  return <>{children}</>
}