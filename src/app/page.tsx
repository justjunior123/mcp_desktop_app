'use client'
import { useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { useAppStore } from '@/store/app'

export default function Home() {
  const router = useRouter()
  const currentView = useAppStore((state) => state.currentView)

  useEffect(() => {
    // Redirect to chat view by default
    if (currentView === 'chat') {
      router.push('/chat')
    }
  }, [currentView, router])

  // Render different content based on current view
  switch (currentView) {
    case 'chat':
      return null // Avoid flash while redirecting
    case 'models':
      return (
        <div className="flex h-full items-center justify-center">
          <div className="text-center">
            <h2 className="text-2xl font-bold text-slate-900 dark:text-white mb-4">Models</h2>
            <p className="text-slate-600 dark:text-slate-400">Model management interface coming soon...</p>
          </div>
        </div>
      )
    case 'store':
      return (
        <div className="flex h-full items-center justify-center">
          <div className="text-center">
            <h2 className="text-2xl font-bold text-slate-900 dark:text-white mb-4">MCP Store</h2>
            <p className="text-slate-600 dark:text-slate-400">Browse and install MCP servers coming soon...</p>
          </div>
        </div>
      )
    case 'settings':
      return (
        <div className="flex h-full items-center justify-center">
          <div className="text-center">
            <h2 className="text-2xl font-bold text-slate-900 dark:text-white mb-4">Settings</h2>
            <p className="text-slate-600 dark:text-slate-400">Application settings coming soon...</p>
          </div>
        </div>
      )
    default:
      return (
        <div className="flex h-full items-center justify-center">
          <div className="text-center">
            <h1 className="text-4xl font-bold text-slate-900 dark:text-white mb-4">Welcome to MCP Desktop App</h1>
            <p className="text-slate-600 dark:text-slate-400 mb-8">
              Click the Chat button in the header to start using the AI chat interface.
            </p>
          </div>
        </div>
      )
  }
} 