import React from 'react'
import { clsx } from 'clsx'
import {
  PlusIcon,
  MagnifyingGlassIcon,
  ServerIcon,
  CubeIcon,
  ChatBubbleLeftIcon,
  EllipsisVerticalIcon,
  StarIcon,
  ArchiveBoxIcon,
  TrashIcon,
} from '@heroicons/react/24/outline'
import { StarIcon as StarSolidIcon } from '@heroicons/react/24/solid'
import { useAppStore } from '@store/app'
import { useChatStore, useFilteredSessions } from '@store/chat'
import { useConnectedServers, useDownloadedModels } from '@store/mcp'

export const Sidebar: React.FC = () => {
  const { sidebarCollapsed, currentView } = useAppStore()
  const { createSession, setCurrentSession, currentSessionId } = useChatStore()
  const connectedServers = useConnectedServers()
  const downloadedModels = useDownloadedModels()
  const filteredSessions = useFilteredSessions()
  const [searchQuery, setSearchQuery] = React.useState('')

  const handleCreateNewChat = () => {
    const sessionId = createSession('New Chat')
    setCurrentSession(sessionId)
  }

  const formatDate = (date: Date) => {
    const now = new Date()
    const diffMs = now.getTime() - date.getTime()
    const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24))
    
    if (diffDays === 0) return 'Today'
    if (diffDays === 1) return 'Yesterday'
    if (diffDays < 7) return `${diffDays} days ago`
    return date.toLocaleDateString()
  }

  const groupSessionsByDate = (sessions: typeof filteredSessions) => {
    const groups: Record<string, typeof sessions> = {}
    
    sessions.forEach((session) => {
      const dateKey = formatDate(session.updatedAt)
      if (!groups[dateKey]) {
        groups[dateKey] = []
      }
      groups[dateKey].push(session)
    })
    
    return groups
  }

  const sessionGroups = groupSessionsByDate(filteredSessions)

  if (sidebarCollapsed) {
    return (
      <div className="h-full flex flex-col p-2">
        {/* Collapsed view - just icons */}
        <div className="space-y-2">
          <button
            onClick={handleCreateNewChat}
            className="w-12 h-12 bg-primary-500 hover:bg-primary-600 text-white rounded-lg flex items-center justify-center transition-colors"
            title="New Chat"
          >
            <PlusIcon className="w-5 h-5" />
          </button>
          
          <div className="flex flex-col space-y-1">
            <div className="w-12 h-8 flex items-center justify-center">
              <ServerIcon className="w-4 h-4 text-slate-400" />
            </div>
            <div className="text-xs text-center text-slate-500 font-medium">
              {connectedServers.length}
            </div>
          </div>
          
          <div className="flex flex-col space-y-1">
            <div className="w-12 h-8 flex items-center justify-center">
              <CubeIcon className="w-4 h-4 text-slate-400" />
            </div>
            <div className="text-xs text-center text-slate-500 font-medium">
              {downloadedModels.length}
            </div>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="h-full flex flex-col">
      {/* Header Section */}
      <div className="p-4 border-b border-slate-200 dark:border-slate-700">
        <button
          onClick={handleCreateNewChat}
          className="w-full bg-primary-500 hover:bg-primary-600 text-white rounded-lg py-3 px-4 flex items-center justify-center space-x-2 transition-colors"
        >
          <PlusIcon className="w-4 h-4" />
          <span className="font-medium">New Chat</span>
        </button>
      </div>

      {/* Current View Content */}
      <div className="flex-1 overflow-hidden">
        {currentView === 'chat' && (
          <ChatSidebar
            searchQuery={searchQuery}
            setSearchQuery={setSearchQuery}
            sessionGroups={sessionGroups}
            currentSessionId={currentSessionId}
            setCurrentSession={setCurrentSession}
          />
        )}
        
        {currentView === 'models' && (
          <ModelsSidebar models={downloadedModels} />
        )}
        
        {currentView === 'store' && (
          <StoreSidebar />
        )}
        
        {currentView === 'settings' && (
          <SettingsSidebar />
        )}
      </div>

      {/* Footer Section */}
      <div className="p-4 border-t border-slate-200 dark:border-slate-700">
        <div className="grid grid-cols-2 gap-4 text-sm">
          <div className="text-center">
            <div className="flex items-center justify-center space-x-1 text-slate-500">
              <ServerIcon className="w-4 h-4" />
              <span>{connectedServers.length}</span>
            </div>
            <div className="text-xs text-slate-400">Servers</div>
          </div>
          <div className="text-center">
            <div className="flex items-center justify-center space-x-1 text-slate-500">
              <CubeIcon className="w-4 h-4" />
              <span>{downloadedModels.length}</span>
            </div>
            <div className="text-xs text-slate-400">Models</div>
          </div>
        </div>
      </div>
    </div>
  )
}

interface ChatSidebarProps {
  searchQuery: string
  setSearchQuery: (query: string) => void
  sessionGroups: Record<string, any[]>
  currentSessionId: string | null
  setCurrentSession: (id: string) => void
}

const ChatSidebar: React.FC<ChatSidebarProps> = ({
  searchQuery,
  setSearchQuery,
  sessionGroups,
  currentSessionId,
  setCurrentSession,
}) => {
  const { pinSession, archiveSession, deleteSession } = useChatStore()

  return (
    <div className="h-full flex flex-col">
      {/* Search */}
      <div className="p-4">
        <div className="relative">
          <MagnifyingGlassIcon className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-slate-400" />
          <input
            type="text"
            placeholder="Search conversations..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-10 pr-4 py-2 border border-slate-200 dark:border-slate-600 rounded-lg bg-white dark:bg-slate-700 text-slate-900 dark:text-white placeholder-slate-500 dark:placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent"
          />
        </div>
      </div>

      {/* Sessions List */}
      <div className="flex-1 overflow-y-auto px-4 pb-4">
        {Object.entries(sessionGroups).map(([dateGroup, sessions]) => (
          <div key={dateGroup} className="mb-6">
            <h3 className="text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider mb-2">
              {dateGroup}
            </h3>
            <div className="space-y-1">
              {sessions.map((session) => (
                <SessionItem
                  key={session.id}
                  session={session}
                  isActive={session.id === currentSessionId}
                  onSelect={() => setCurrentSession(session.id)}
                  onPin={() => pinSession(session.id)}
                  onArchive={() => archiveSession(session.id)}
                  onDelete={() => deleteSession(session.id)}
                />
              ))}
            </div>
          </div>
        ))}
        
        {Object.keys(sessionGroups).length === 0 && (
          <div className="text-center py-8">
            <ChatBubbleLeftIcon className="w-12 h-12 text-slate-300 dark:text-slate-600 mx-auto mb-3" />
            <p className="text-slate-500 dark:text-slate-400 text-sm">
              No conversations yet. Start a new chat!
            </p>
          </div>
        )}
      </div>
    </div>
  )
}

interface SessionItemProps {
  session: any
  isActive: boolean
  onSelect: () => void
  onPin: () => void
  onArchive: () => void
  onDelete: () => void
}

const SessionItem: React.FC<SessionItemProps> = ({
  session,
  isActive,
  onSelect,
  onPin,
  onArchive,
  onDelete,
}) => {
  const [showMenu, setShowMenu] = React.useState(false)

  return (
    <div className="relative group">
      <button
        onClick={onSelect}
        className={clsx(
          'w-full text-left p-3 rounded-lg transition-colors relative',
          isActive
            ? 'bg-primary-100 dark:bg-primary-900/20 text-primary-700 dark:text-primary-300'
            : 'hover:bg-slate-100 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300'
        )}
      >
        <div className="flex items-start justify-between">
          <div className="flex-1 min-w-0">
            <div className="flex items-center space-x-2">
              {session.isPinned && (
                <StarSolidIcon className="w-3 h-3 text-warning-500 flex-shrink-0" />
              )}
              <h4 className="font-medium truncate text-sm">
                {session.title}
              </h4>
            </div>
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
              {session.messages.length} messages
            </p>
          </div>
          
          <button
            onClick={(e) => {
              e.stopPropagation()
              setShowMenu(!showMenu)
            }}
            className="opacity-0 group-hover:opacity-100 p-1 hover:bg-slate-200 dark:hover:bg-slate-600 rounded transition-all"
          >
            <EllipsisVerticalIcon className="w-4 h-4" />
          </button>
        </div>
        
        {session.tags.length > 0 && (
          <div className="flex flex-wrap gap-1 mt-2">
            {session.tags.slice(0, 2).map((tag: string) => (
              <span
                key={tag}
                className="text-xs px-2 py-1 bg-slate-200 dark:bg-slate-600 text-slate-600 dark:text-slate-300 rounded-full"
              >
                {tag}
              </span>
            ))}
            {session.tags.length > 2 && (
              <span className="text-xs text-slate-400">
                +{session.tags.length - 2}
              </span>
            )}
          </div>
        )}
      </button>

      {/* Context Menu */}
      {showMenu && (
        <div className="absolute right-0 top-full mt-1 w-48 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-600 rounded-lg shadow-lg z-10">
          <button
            onClick={(e) => {
              e.stopPropagation()
              onPin()
              setShowMenu(false)
            }}
            className="w-full flex items-center space-x-2 px-3 py-2 text-sm text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-700 first:rounded-t-lg"
          >
            <StarIcon className="w-4 h-4" />
            <span>{session.isPinned ? 'Unpin' : 'Pin'}</span>
          </button>
          
          <button
            onClick={(e) => {
              e.stopPropagation()
              onArchive()
              setShowMenu(false)
            }}
            className="w-full flex items-center space-x-2 px-3 py-2 text-sm text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-700"
          >
            <ArchiveBoxIcon className="w-4 h-4" />
            <span>{session.isArchived ? 'Unarchive' : 'Archive'}</span>
          </button>
          
          <button
            onClick={(e) => {
              e.stopPropagation()
              onDelete()
              setShowMenu(false)
            }}
            className="w-full flex items-center space-x-2 px-3 py-2 text-sm text-error-600 hover:bg-error-50 dark:hover:bg-error-900/20 last:rounded-b-lg"
          >
            <TrashIcon className="w-4 h-4" />
            <span>Delete</span>
          </button>
        </div>
      )}
    </div>
  )
}

const ModelsSidebar: React.FC<{ models: any[] }> = ({ models }) => {
  return (
    <div className="p-4">
      <h3 className="text-sm font-semibold text-slate-900 dark:text-white mb-3">
        Downloaded Models
      </h3>
      {models.length === 0 ? (
        <div className="text-center py-8">
          <CubeIcon className="w-12 h-12 text-slate-300 dark:text-slate-600 mx-auto mb-3" />
          <p className="text-slate-500 dark:text-slate-400 text-sm">
            No models downloaded yet
          </p>
        </div>
      ) : (
        <div className="space-y-2">
          {models.map((model) => (
            <div
              key={model.id}
              className="p-3 border border-slate-200 dark:border-slate-600 rounded-lg"
            >
              <h4 className="font-medium text-sm text-slate-900 dark:text-white">
                {model.name}
              </h4>
              <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
                {model.sizeFormatted}
              </p>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}

const StoreSidebar: React.FC = () => {
  return (
    <div className="p-4">
      <h3 className="text-sm font-semibold text-slate-900 dark:text-white mb-3">
        Browse Categories
      </h3>
      <div className="space-y-1">
        {['Popular', 'AI Assistants', 'Developer Tools', 'Data Analysis', 'Content'].map((category) => (
          <button
            key={category}
            className="w-full text-left px-3 py-2 text-sm text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-700 rounded-lg transition-colors"
          >
            {category}
          </button>
        ))}
      </div>
    </div>
  )
}

const SettingsSidebar: React.FC = () => {
  return (
    <div className="p-4">
      <h3 className="text-sm font-semibold text-slate-900 dark:text-white mb-3">
        Settings
      </h3>
      <div className="space-y-1">
        {['General', 'Appearance', 'Models', 'Servers', 'Privacy', 'About'].map((section) => (
          <button
            key={section}
            className="w-full text-left px-3 py-2 text-sm text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-700 rounded-lg transition-colors"
          >
            {section}
          </button>
        ))}
      </div>
    </div>
  )
} 