import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import { Sidebar } from '@/components/layout/Sidebar';

// Mock store dependencies
const mockCreateSession = jest.fn();
const mockSetCurrentSession = jest.fn();
const mockPinSession = jest.fn();
const mockArchiveSession = jest.fn();
const mockDeleteSession = jest.fn();

const mockSessions = [
  {
    id: 'session-1',
    title: 'Chat Session 1',
    messages: [{}, {}],
    tags: ['important', 'work'],
    isPinned: true,
    isArchived: false,
    updatedAt: new Date('2024-01-15'),
  },
  {
    id: 'session-2',
    title: 'Chat Session 2',
    messages: [{}],
    tags: [],
    isPinned: false,
    isArchived: false,
    updatedAt: new Date('2024-01-14'),
  },
];

const mockModels = [
  {
    id: 'model-1',
    name: 'llama2:7b',
    sizeFormatted: '3.8GB',
  },
  {
    id: 'model-2',
    name: 'mistral:latest',
    sizeFormatted: '4.1GB',
  },
];

jest.mock('@store/app', () => ({
  useAppStore: () => ({
    sidebarCollapsed: false,
    currentView: 'chat',
  }),
}));

jest.mock('@store/chat', () => ({
  useChatStore: () => ({
    createSession: mockCreateSession,
    setCurrentSession: mockSetCurrentSession,
    currentSessionId: 'session-1',
    pinSession: mockPinSession,
    archiveSession: mockArchiveSession,
    deleteSession: mockDeleteSession,
  }),
  useFilteredSessions: () => mockSessions,
}));

jest.mock('@store/mcp', () => ({
  useConnectedServers: () => ['server1', 'server2'],
  useDownloadedModels: () => mockModels,
}));

describe('Sidebar Component', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('renders new chat button', () => {
    render(<Sidebar />);
    expect(screen.getByText('New Chat')).toBeInTheDocument();
  });

  it('creates new session when new chat button is clicked', () => {
    mockCreateSession.mockReturnValue('new-session-id');
    
    render(<Sidebar />);
    const newChatButton = screen.getByText('New Chat');
    fireEvent.click(newChatButton);
    
    expect(mockCreateSession).toHaveBeenCalledWith('New Chat');
    expect(mockSetCurrentSession).toHaveBeenCalledWith('new-session-id');
  });

  it('displays server and model counts in footer', () => {
    render(<Sidebar />);
    
    expect(screen.getByText('2')).toBeInTheDocument(); // Server count
    expect(screen.getByText('Servers')).toBeInTheDocument();
    expect(screen.getByText('Models')).toBeInTheDocument();
  });

  describe('Chat View', () => {
    it('renders search input', () => {
      render(<Sidebar />);
      expect(screen.getByPlaceholderText('Search conversations...')).toBeInTheDocument();
    });

    it('renders chat sessions', () => {
      render(<Sidebar />);
      
      expect(screen.getByText('Chat Session 1')).toBeInTheDocument();
      expect(screen.getByText('Chat Session 2')).toBeInTheDocument();
    });

    it('shows message count for sessions', () => {
      render(<Sidebar />);
      
      expect(screen.getByText('2 messages')).toBeInTheDocument();
      expect(screen.getByText('1 messages')).toBeInTheDocument();
    });

    it('shows pinned indicator for pinned sessions', () => {
      const { container } = render(<Sidebar />);
      
      // First session is pinned
      const pinnedIcon = container.querySelector('.text-warning-500');
      expect(pinnedIcon).toBeInTheDocument();
    });

    it('shows tags for sessions', () => {
      render(<Sidebar />);
      
      expect(screen.getByText('important')).toBeInTheDocument();
      expect(screen.getByText('work')).toBeInTheDocument();
    });

    it('highlights active session', () => {
      render(<Sidebar />);
      
      const activeSession = screen.getByText('Chat Session 1').closest('button');
      expect(activeSession).toHaveClass('bg-primary-100 dark:bg-primary-900/20');
    });

    it('changes current session when session is clicked', () => {
      render(<Sidebar />);
      
      const session2 = screen.getByText('Chat Session 2');
      fireEvent.click(session2);
      
      expect(mockSetCurrentSession).toHaveBeenCalledWith('session-2');
    });

    it('shows empty state when no sessions', () => {
      jest.doMock('@store/chat', () => ({
        useChatStore: () => ({
          createSession: mockCreateSession,
          setCurrentSession: mockSetCurrentSession,
          currentSessionId: null,
          pinSession: mockPinSession,
          archiveSession: mockArchiveSession,
          deleteSession: mockDeleteSession,
        }),
        useFilteredSessions: () => [],
      }));

      const { Sidebar } = require('@/components/layout/Sidebar');
      render(<Sidebar />);
      
      expect(screen.getByText('No conversations yet. Start a new chat!')).toBeInTheDocument();
    });
  });

  describe('Session Context Menu', () => {
    it('shows context menu when three dots are clicked', () => {
      const { container } = render(<Sidebar />);
      
      const menuButton = container.querySelector('[data-testid="menu-button"]') || 
                         container.querySelector('button:has(svg)');
      
      if (menuButton) {
        fireEvent.click(menuButton);
        
        expect(screen.getByText('Pin')).toBeInTheDocument();
        expect(screen.getByText('Archive')).toBeInTheDocument();
        expect(screen.getByText('Delete')).toBeInTheDocument();
      }
    });

    it('calls pin function when pin is clicked', () => {
      const { container } = render(<Sidebar />);
      
      // Find and click the menu button (three dots)
      const menuButtons = container.querySelectorAll('button');
      const menuButton = Array.from(menuButtons).find(btn => 
        btn.querySelector('svg') && !btn.textContent?.includes('New Chat')
      );
      
      if (menuButton) {
        fireEvent.click(menuButton);
        
        const pinButton = screen.getByText('Unpin'); // First session is pinned
        fireEvent.click(pinButton);
        
        expect(mockPinSession).toHaveBeenCalledWith('session-1');
      }
    });
  });

  describe('Collapsed State', () => {
    it('renders collapsed view with icons only', () => {
      jest.doMock('@store/app', () => ({
        useAppStore: () => ({
          sidebarCollapsed: true,
          currentView: 'chat',
        }),
      }));

      const { Sidebar } = require('@/components/layout/Sidebar');
      render(<Sidebar />);
      
      // Should show just the plus icon and counts
      expect(screen.queryByText('New Chat')).not.toBeInTheDocument();
      expect(screen.getByText('2')).toBeInTheDocument(); // Server count
    });

    it('creates new session when collapsed new chat button is clicked', () => {
      mockCreateSession.mockReturnValue('new-session-id');
      
      jest.doMock('@store/app', () => ({
        useAppStore: () => ({
          sidebarCollapsed: true,
          currentView: 'chat',
        }),
      }));

      const { Sidebar } = require('@/components/layout/Sidebar');
      render(<Sidebar />);
      
      const newChatButton = screen.getByTitle('New Chat');
      fireEvent.click(newChatButton);
      
      expect(mockCreateSession).toHaveBeenCalledWith('New Chat');
      expect(mockSetCurrentSession).toHaveBeenCalledWith('new-session-id');
    });
  });

  describe('Different Views', () => {
    it('renders models sidebar when view is models', () => {
      jest.doMock('@store/app', () => ({
        useAppStore: () => ({
          sidebarCollapsed: false,
          currentView: 'models',
        }),
      }));

      const { Sidebar } = require('@/components/layout/Sidebar');
      render(<Sidebar />);
      
      expect(screen.getByText('Downloaded Models')).toBeInTheDocument();
      expect(screen.getByText('llama2:7b')).toBeInTheDocument();
      expect(screen.getByText('3.8GB')).toBeInTheDocument();
    });

    it('shows empty state for models when no models downloaded', () => {
      jest.doMock('@store/app', () => ({
        useAppStore: () => ({
          sidebarCollapsed: false,
          currentView: 'models',
        }),
      }));

      jest.doMock('@store/mcp', () => ({
        useConnectedServers: () => [],
        useDownloadedModels: () => [],
      }));

      const { Sidebar } = require('@/components/layout/Sidebar');
      render(<Sidebar />);
      
      expect(screen.getByText('No models downloaded yet')).toBeInTheDocument();
    });

    it('renders store sidebar when view is store', () => {
      jest.doMock('@store/app', () => ({
        useAppStore: () => ({
          sidebarCollapsed: false,
          currentView: 'store',
        }),
      }));

      const { Sidebar } = require('@/components/layout/Sidebar');
      render(<Sidebar />);
      
      expect(screen.getByText('Browse Categories')).toBeInTheDocument();
      expect(screen.getByText('Popular')).toBeInTheDocument();
      expect(screen.getByText('AI Assistants')).toBeInTheDocument();
    });

    it('renders settings sidebar when view is settings', () => {
      jest.doMock('@store/app', () => ({
        useAppStore: () => ({
          sidebarCollapsed: false,
          currentView: 'settings',
        }),
      }));

      const { Sidebar } = require('@/components/layout/Sidebar');
      render(<Sidebar />);
      
      expect(screen.getByText('Settings')).toBeInTheDocument();
      expect(screen.getByText('General')).toBeInTheDocument();
      expect(screen.getByText('Appearance')).toBeInTheDocument();
    });
  });
});