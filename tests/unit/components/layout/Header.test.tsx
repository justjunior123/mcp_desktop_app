import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import { Header } from '@/components/layout/Header';

// Mock the store and other dependencies
const mockToggleSidebar = jest.fn();
const mockSetCurrentView = jest.fn();

jest.mock('@store/app', () => ({
  useAppStore: () => ({
    sidebarCollapsed: false,
    currentView: 'chat',
    connectionStatus: 'connected',
    isOnline: true,
    user: {
      id: '1',
      name: 'John Doe',
      email: 'john@example.com',
      avatar: null,
    },
    toggleSidebar: mockToggleSidebar,
    setCurrentView: mockSetCurrentView,
  }),
}));

jest.mock('@/components/ui/ThemeToggle', () => ({
  ThemeToggle: ({ showLabel }: { showLabel?: boolean }) => (
    <div data-testid="theme-toggle">
      {showLabel ? 'Theme Toggle with Label' : 'Theme Toggle'}
    </div>
  ),
}));

describe('Header Component', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('renders app title', () => {
    render(<Header />);
    expect(screen.getByText('MCP Desktop')).toBeInTheDocument();
  });

  it('renders sidebar toggle button', () => {
    render(<Header />);
    const toggleButton = screen.getByLabelText('Toggle sidebar');
    expect(toggleButton).toBeInTheDocument();
  });

  it('calls toggleSidebar when sidebar toggle is clicked', () => {
    render(<Header />);
    const toggleButton = screen.getByLabelText('Toggle sidebar');
    fireEvent.click(toggleButton);
    expect(mockToggleSidebar).toHaveBeenCalledTimes(1);
  });

  it('renders navigation items', () => {
    render(<Header />);
    
    expect(screen.getByText('Chat')).toBeInTheDocument();
    expect(screen.getByText('Models')).toBeInTheDocument();
    expect(screen.getByText('Store')).toBeInTheDocument();
    expect(screen.getByText('Settings')).toBeInTheDocument();
  });

  it('highlights active navigation item', () => {
    render(<Header />);
    
    const chatButton = screen.getByText('Chat').closest('button');
    expect(chatButton).toHaveClass('bg-primary-100 dark:bg-primary-900/20 text-primary-700 dark:text-primary-300');
  });

  it('calls setCurrentView when navigation item is clicked', () => {
    render(<Header />);
    
    const modelsButton = screen.getByText('Models');
    fireEvent.click(modelsButton);
    
    expect(mockSetCurrentView).toHaveBeenCalledWith('models');
  });

  it('renders connection status when connected', () => {
    render(<Header />);
    expect(screen.getByText('Connected')).toBeInTheDocument();
  });

  it('renders theme toggle with label', () => {
    render(<Header />);
    expect(screen.getByTestId('theme-toggle')).toBeInTheDocument();
    expect(screen.getByText('Theme Toggle with Label')).toBeInTheDocument();
  });

  it('renders user information when user is provided', () => {
    render(<Header />);
    
    expect(screen.getByText('John Doe')).toBeInTheDocument();
    expect(screen.getByText('john@example.com')).toBeInTheDocument();
  });

  it('renders user initial when no avatar is provided', () => {
    render(<Header />);
    
    expect(screen.getByText('J')).toBeInTheDocument();
  });
});

describe('Header Component - Different States', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('renders offline status', () => {
    jest.doMock('@store/app', () => ({
      useAppStore: () => ({
        sidebarCollapsed: false,
        currentView: 'chat',
        connectionStatus: 'disconnected',
        isOnline: false,
        user: null,
        toggleSidebar: mockToggleSidebar,
        setCurrentView: mockSetCurrentView,
      }),
    }));

    // Re-import to get the mocked version
    const { Header } = require('@/components/layout/Header');
    render(<Header />);
    
    expect(screen.getByText('Offline')).toBeInTheDocument();
  });

  it('renders connecting status', () => {
    jest.doMock('@store/app', () => ({
      useAppStore: () => ({
        sidebarCollapsed: false,
        currentView: 'chat',
        connectionStatus: 'connecting',
        isOnline: true,
        user: null,
        toggleSidebar: mockToggleSidebar,
        setCurrentView: mockSetCurrentView,
      }),
    }));

    const { Header } = require('@/components/layout/Header');
    render(<Header />);
    
    expect(screen.getByText('Connecting...')).toBeInTheDocument();
  });

  it('renders error status', () => {
    jest.doMock('@store/app', () => ({
      useAppStore: () => ({
        sidebarCollapsed: false,
        currentView: 'chat',
        connectionStatus: 'error',
        isOnline: true,
        user: null,
        toggleSidebar: mockToggleSidebar,
        setCurrentView: mockSetCurrentView,
      }),
    }));

    const { Header } = require('@/components/layout/Header');
    render(<Header />);
    
    expect(screen.getByText('Connection Error')).toBeInTheDocument();
  });

  it('does not render user section when no user', () => {
    jest.doMock('@store/app', () => ({
      useAppStore: () => ({
        sidebarCollapsed: false,
        currentView: 'chat',
        connectionStatus: 'connected',
        isOnline: true,
        user: null,
        toggleSidebar: mockToggleSidebar,
        setCurrentView: mockSetCurrentView,
      }),
    }));

    const { Header } = require('@/components/layout/Header');
    render(<Header />);
    
    expect(screen.queryByText('John Doe')).not.toBeInTheDocument();
  });

  it('renders user avatar when provided', () => {
    jest.doMock('@store/app', () => ({
      useAppStore: () => ({
        sidebarCollapsed: false,
        currentView: 'chat',
        connectionStatus: 'connected',
        isOnline: true,
        user: {
          id: '1',
          name: 'Jane Doe',
          email: 'jane@example.com',
          avatar: 'https://example.com/avatar.jpg',
        },
        toggleSidebar: mockToggleSidebar,
        setCurrentView: mockSetCurrentView,
      }),
    }));

    const { Header } = require('@/components/layout/Header');
    render(<Header />);
    
    const avatar = screen.getByAltText('Jane Doe');
    expect(avatar).toBeInTheDocument();
    expect(avatar).toHaveAttribute('src', 'https://example.com/avatar.jpg');
  });
});