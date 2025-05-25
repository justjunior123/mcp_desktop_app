'use client'
import React from 'react'
import { AppLayout } from './AppLayout'
import { AppProviders } from '../providers'
import { ClientOnly } from '../ClientOnly'

interface MainLayoutProps {
  children: React.ReactNode
}

const LoadingFallback = () => (
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

export const MainLayout: React.FC<MainLayoutProps> = ({ children }) => {
  return (
    <AppProviders>
      <ClientOnly fallback={<LoadingFallback />}>
        <AppLayout>
          {children}
        </AppLayout>
      </ClientOnly>
    </AppProviders>
  )
}

// Re-export all layout components for easy access
export { AppLayout } from './AppLayout'
export { Header } from './Header'
export { Sidebar } from './Sidebar'
export { MainContent } from './MainContent' 