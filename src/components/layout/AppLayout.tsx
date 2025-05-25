import React from 'react'
import { clsx } from 'clsx'
import { Header } from './Header'
import { Sidebar } from './Sidebar'
import { MainContent } from './MainContent'
import { useAppStore } from '@store/app'

interface AppLayoutProps {
  children: React.ReactNode
}

export const AppLayout: React.FC<AppLayoutProps> = ({ children }) => {
  const sidebarCollapsed = useAppStore((state) => state.sidebarCollapsed)
  const isLoading = useAppStore((state) => state.isLoading)
  const loadingMessage = useAppStore((state) => state.loadingMessage)
  const error = useAppStore((state) => state.error)

  return (
    <div className="flex h-screen bg-slate-50 dark:bg-slate-900 overflow-hidden">
      {/* Sidebar */}
      <div
        className={clsx(
          'transition-all duration-300 ease-in-out bg-white dark:bg-slate-800 border-r border-slate-200 dark:border-slate-700 flex flex-col',
          sidebarCollapsed ? 'w-16' : 'w-80'
        )}
      >
        <Sidebar />
      </div>

      {/* Main Content Area */}
      <div className="flex-1 flex flex-col min-w-0">
        {/* Header */}
        <div className="h-16 bg-white dark:bg-slate-800 border-b border-slate-200 dark:border-slate-700 flex-shrink-0">
          <Header />
        </div>

        {/* Main Content */}
        <div className="flex-1 relative overflow-hidden">
          <MainContent>
            {children}
          </MainContent>

          {/* Global Loading Overlay */}
          {isLoading && (
            <div className="absolute inset-0 bg-white/80 dark:bg-slate-900/80 backdrop-blur-sm flex items-center justify-center z-50">
              <div className="flex flex-col items-center space-y-4">
                <div className="w-8 h-8 border-4 border-primary-200 border-t-primary-500 rounded-full animate-spin" />
                {loadingMessage && (
                  <p className="text-sm text-slate-600 dark:text-slate-400">
                    {loadingMessage}
                  </p>
                )}
              </div>
            </div>
          )}

          {/* Global Error Toast */}
          {error && (
            <div className="absolute top-4 right-4 bg-error-500 text-white px-4 py-3 rounded-lg shadow-lg flex items-center space-x-3 z-50 animate-slide-in">
              <svg
                className="w-5 h-5 flex-shrink-0"
                fill="currentColor"
                viewBox="0 0 20 20"
              >
                <path
                  fillRule="evenodd"
                  d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z"
                  clipRule="evenodd"
                />
              </svg>
              <span className="flex-1">{error}</span>
              <button
                onClick={() => useAppStore.getState().clearError()}
                className="text-white/80 hover:text-white transition-colors"
              >
                <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
                  <path
                    fillRule="evenodd"
                    d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z"
                    clipRule="evenodd"
                  />
                </svg>
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}