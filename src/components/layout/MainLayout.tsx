import React from 'react'
import { AppLayout } from './AppLayout'

interface MainLayoutProps {
  children: React.ReactNode
}

export const MainLayout: React.FC<MainLayoutProps> = ({ children }) => {
  return (
    <AppLayout>
      {children}
    </AppLayout>
  )
}

// Re-export all layout components for easy access
export { AppLayout } from './AppLayout'
export { Header } from './Header'
export { Sidebar } from './Sidebar'
export { MainContent } from './MainContent' 