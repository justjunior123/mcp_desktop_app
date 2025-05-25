'use client'

import React from 'react'
import { clsx } from 'clsx'
import {
  Bars3Icon,
  ChatBubbleLeftIcon,
  CubeIcon,
  Cog6ToothIcon,
  BuildingStorefrontIcon,
  SunIcon,
  MoonIcon,
  ComputerDesktopIcon,
  WifiIcon,
  ExclamationTriangleIcon,
} from '@heroicons/react/24/outline'
import { useAppStore } from '@/store/app'
import { ThemeToggle } from '@/components/ui/ThemeToggle'

export const Header: React.FC = () => {
  const {
    sidebarCollapsed,
    currentView,
    connectionStatus,
    isOnline,
    user,
    toggleSidebar,
    setCurrentView,
  } = useAppStore()

  const navigationItems = [
    {
      id: 'chat' as const,
      label: 'Chat',
      icon: ChatBubbleLeftIcon,
    },
    {
      id: 'models' as const,
      label: 'Models',
      icon: CubeIcon,
    },
    {
      id: 'store' as const,
      label: 'Store',
      icon: BuildingStorefrontIcon,
    },
    {
      id: 'settings' as const,
      label: 'Settings',
      icon: Cog6ToothIcon,
    },
  ]

  const getConnectionIcon = () => {
    if (!isOnline) {
      return <ExclamationTriangleIcon className="w-4 h-4 text-error-500" />
    }
    
    switch (connectionStatus) {
      case 'connected':
        return <WifiIcon className="w-4 h-4 text-success-500" />
      case 'connecting':
        return <WifiIcon className="w-4 h-4 text-warning-500 animate-pulse" />
      case 'error':
        return <ExclamationTriangleIcon className="w-4 h-4 text-error-500" />
      default:
        return <WifiIcon className="w-4 h-4 text-slate-400" />
    }
  }

  const getConnectionText = () => {
    if (!isOnline) return 'Offline'
    
    switch (connectionStatus) {
      case 'connected':
        return 'Connected'
      case 'connecting':
        return 'Connecting...'
      case 'error':
        return 'Connection Error'
      default:
        return 'Disconnected'
    }
  }

  return (
    <header className="h-full flex items-center justify-between px-4 bg-white dark:bg-slate-800 border-b border-slate-200 dark:border-slate-700">
      {/* Left Section */}
      <div className="flex items-center space-x-4">
        {/* Sidebar Toggle */}
        <button
          onClick={toggleSidebar}
          className="p-2 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-700 transition-colors"
          aria-label="Toggle sidebar"
        >
          <Bars3Icon className="w-5 h-5 text-slate-600 dark:text-slate-400" />
        </button>

        {/* App Logo/Title */}
        <div className="flex items-center space-x-3">
          <div className="w-8 h-8 bg-gradient-primary rounded-lg flex items-center justify-center">
            <CubeIcon className="w-5 h-5 text-white" />
          </div>
          <h1 className="text-lg font-semibold text-slate-900 dark:text-white">
            MCP Desktop
          </h1>
        </div>
      </div>

      {/* Center Section - Navigation */}
      <div className="flex items-center space-x-1">
        {navigationItems.map((item) => {
          const Icon = item.icon
          const isActive = currentView === item.id
          
          return (
            <button
              key={item.id}
              onClick={() => setCurrentView(item.id)}
              className={clsx(
                'flex items-center space-x-2 px-4 py-2 rounded-lg text-sm font-medium transition-colors',
                isActive
                  ? 'bg-primary-100 dark:bg-primary-900/20 text-primary-700 dark:text-primary-300'
                  : 'text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-700 hover:text-slate-900 dark:hover:text-white'
              )}
            >
              <Icon className="w-4 h-4" />
              <span>{item.label}</span>
            </button>
          )
        })}
      </div>

      {/* Right Section */}
      <div className="flex items-center space-x-4">
        {/* Connection Status */}
        <div className="flex items-center space-x-2 text-sm">
          {getConnectionIcon()}
          <span className="text-slate-600 dark:text-slate-400">
            {getConnectionText()}
          </span>
        </div>

        {/* Theme Toggle */}
        <ThemeToggle showLabel />

        {/* User Menu */}
        {user && (
          <div className="flex items-center space-x-3">
            <div className="text-right">
              <div className="text-sm font-medium text-slate-900 dark:text-white">
                {user.name}
              </div>
              <div className="text-xs text-slate-500 dark:text-slate-400">
                {user.email}
              </div>
            </div>
            <div className="w-8 h-8 bg-gradient-primary rounded-full flex items-center justify-center">
              {user.avatar ? (
                <img
                  src={user.avatar}
                  alt={user.name}
                  className="w-8 h-8 rounded-full"
                />
              ) : (
                <span className="text-sm font-medium text-white">
                  {user.name.charAt(0).toUpperCase()}
                </span>
              )}
            </div>
          </div>
        )}
      </div>
    </header>
  )
}

 