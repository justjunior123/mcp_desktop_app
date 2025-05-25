'use client'

import React from 'react'
import { clsx } from 'clsx'
import {
  SunIcon,
  MoonIcon,
  ComputerDesktopIcon,
} from '@heroicons/react/24/outline'
import { useTheme } from '@lib/hooks/useTheme'
import { Button } from './Button'

export interface ThemeToggleProps {
  className?: string
  showLabel?: boolean
  variant?: 'button' | 'dropdown'
}

export const ThemeToggle: React.FC<ThemeToggleProps> = ({
  className,
  showLabel = true,
  variant = 'button',
}) => {
  const { theme, setTheme, toggleTheme } = useTheme()

  const getThemeIcon = () => {
    switch (theme) {
      case 'light':
        return <SunIcon className="w-4 h-4" />
      case 'dark':
        return <MoonIcon className="w-4 h-4" />
      case 'system':
        return <ComputerDesktopIcon className="w-4 h-4" />
    }
  }

  const getThemeLabel = () => {
    switch (theme) {
      case 'light':
        return 'Light'
      case 'dark':
        return 'Dark'
      case 'system':
        return 'System'
    }
  }

  if (variant === 'dropdown') {
    return <ThemeDropdown className={className} />
  }

  return (
    <button
      onClick={toggleTheme}
      className={clsx(
        'flex items-center space-x-2 px-3 py-2 rounded-lg',
        'hover:bg-slate-100 dark:hover:bg-slate-700',
        'transition-all duration-200',
        'text-slate-600 dark:text-slate-400',
        'hover:text-slate-900 dark:hover:text-white',
        'focus:outline-none focus:ring-2 focus:ring-primary-500 focus:ring-offset-2',
        className
      )}
      title={`Current theme: ${getThemeLabel()}. Click to cycle.`}
      aria-label={`Switch to next theme. Current: ${getThemeLabel()}`}
    >
      {getThemeIcon()}
      {showLabel && <span className="text-sm">{getThemeLabel()}</span>}
    </button>
  )
}

export const ThemeDropdown: React.FC<{ className?: string }> = ({ className }) => {
  const { theme, setTheme } = useTheme()
  const [isOpen, setIsOpen] = React.useState(false)

  const themes = [
    { value: 'light' as const, label: 'Light', icon: SunIcon },
    { value: 'dark' as const, label: 'Dark', icon: MoonIcon },
    { value: 'system' as const, label: 'System', icon: ComputerDesktopIcon },
  ]

  const currentTheme = themes.find(t => t.value === theme)

  return (
    <div className={clsx('relative', className)}>
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="flex items-center space-x-2 px-3 py-2 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-700 transition-colors text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white"
        aria-expanded={isOpen}
        aria-haspopup="true"
      >
        {currentTheme && <currentTheme.icon className="w-4 h-4" />}
        <span className="text-sm">{currentTheme?.label}</span>
        <svg
          className={clsx('w-4 h-4 transition-transform', isOpen && 'rotate-180')}
          fill="none"
          viewBox="0 0 24 24"
          stroke="currentColor"
        >
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
        </svg>
      </button>

      {isOpen && (
        <>
          {/* Backdrop */}
          <div
            className="fixed inset-0 z-10"
            onClick={() => setIsOpen(false)}
          />
          
          {/* Dropdown menu */}
          <div className="absolute right-0 top-full mt-1 w-48 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-600 rounded-lg shadow-lg z-20">
            {themes.map((themeOption) => {
              const Icon = themeOption.icon
              const isSelected = theme === themeOption.value
              
              return (
                <button
                  key={themeOption.value}
                  onClick={() => {
                    setTheme(themeOption.value)
                    setIsOpen(false)
                  }}
                  className={clsx(
                    'w-full flex items-center space-x-3 px-3 py-2 text-sm text-left',
                    'hover:bg-slate-100 dark:hover:bg-slate-700',
                    'transition-colors',
                    isSelected
                      ? 'text-primary-600 dark:text-primary-400 bg-primary-50 dark:bg-primary-900/20'
                      : 'text-slate-700 dark:text-slate-300',
                    'first:rounded-t-lg last:rounded-b-lg'
                  )}
                >
                  <Icon className="w-4 h-4" />
                  <span>{themeOption.label}</span>
                  {isSelected && (
                    <div className="ml-auto w-2 h-2 bg-primary-500 rounded-full" />
                  )}
                </button>
              )
            })}
          </div>
        </>
      )}
    </div>
  )
}

// Compact theme toggle for toolbar/header use
export const CompactThemeToggle: React.FC<{ className?: string }> = ({ className }) => {
  const { theme, toggleTheme } = useTheme()

  const getIcon = () => {
    switch (theme) {
      case 'light':
        return <SunIcon className="w-5 h-5" />
      case 'dark':
        return <MoonIcon className="w-5 h-5" />
      case 'system':
        return <ComputerDesktopIcon className="w-5 h-5" />
    }
  }

  return (
    <Button
      variant="ghost"
      size="sm"
      onClick={toggleTheme}
      className={className}
      aria-label={`Switch theme. Current: ${theme}`}
    >
      {getIcon()}
    </Button>
  )
}