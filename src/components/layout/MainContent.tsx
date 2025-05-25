'use client'

import React from 'react'
import { useAppStore } from '@/store/app'

interface MainContentProps {
  children: React.ReactNode
}

export const MainContent: React.FC<MainContentProps> = ({ children }) => {
  const currentView = useAppStore((state) => state.currentView)

  return (
    <main className="flex-1 relative overflow-hidden bg-slate-50 dark:bg-slate-900">
      {/* Background Pattern */}
      <div className="absolute inset-0 opacity-5">
        <div 
          className="absolute inset-0"
          style={{
            backgroundImage: `radial-gradient(circle at 25px 25px, rgba(99, 102, 241, 0.2) 2px, transparent 0)`,
            backgroundSize: '50px 50px',
          }}
        />
      </div>

      {/* Content Container */}
      <div className="relative h-full flex flex-col">
        {/* View Header */}
        <div className="flex-shrink-0 bg-white/50 dark:bg-slate-800/50 backdrop-blur-sm border-b border-slate-200/50 dark:border-slate-700/50">
          <div className="px-6 py-4">
            <ViewHeader currentView={currentView} />
          </div>
        </div>

        {/* Main Content Area */}
        <div className="flex-1 overflow-hidden">
          <div className="h-full p-6">
            {children}
          </div>
        </div>
      </div>
    </main>
  )
}

interface ViewHeaderProps {
  currentView: string
}

const ViewHeader: React.FC<ViewHeaderProps> = ({ currentView }) => {
  const getViewInfo = () => {
    switch (currentView) {
      case 'chat':
        return {
          title: 'Chat',
          subtitle: 'Interact with AI models through MCP servers',
          icon: '💬',
        }
      case 'models':
        return {
          title: 'Models',
          subtitle: 'Manage and configure your AI models',
          icon: '🤖',
        }
      case 'store':
        return {
          title: 'MCP Store',
          subtitle: 'Discover and install MCP servers from the community',
          icon: '🏪',
        }
      case 'settings':
        return {
          title: 'Settings',
          subtitle: 'Configure your application preferences',
          icon: '⚙️',
        }
      default:
        return {
          title: 'MCP Desktop',
          subtitle: 'Model Context Protocol Desktop Application',
          icon: '🚀',
        }
    }
  }

  const viewInfo = getViewInfo()

  return (
    <div className="flex items-center space-x-4">
      <div className="w-12 h-12 bg-gradient-primary rounded-xl flex items-center justify-center text-2xl shadow-soft">
        {viewInfo.icon}
      </div>
      <div>
        <h1 className="text-2xl font-bold text-slate-900 dark:text-white">
          {viewInfo.title}
        </h1>
        <p className="text-slate-600 dark:text-slate-400 text-sm">
          {viewInfo.subtitle}
        </p>
      </div>
    </div>
  )
}