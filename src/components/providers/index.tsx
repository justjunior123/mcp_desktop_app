import React from 'react'
import { QueryProvider } from './QueryProvider'
import { ThemeProvider } from '@lib/hooks/useTheme'
import { ToastProvider } from '@/components/ui/Toast'

interface AppProvidersProps {
  children: React.ReactNode
}

export const AppProviders: React.FC<AppProvidersProps> = ({ children }) => {
  return (
    <ThemeProvider defaultTheme="system" storageKey="mcp-theme">
      <QueryProvider>
        <ToastProvider position="top-right" maxToasts={5}>
          {children}
        </ToastProvider>
      </QueryProvider>
    </ThemeProvider>
  )
}

// Re-export individual providers for flexibility
export { QueryProvider, ThemeProvider, ToastProvider }