import React from 'react';
import { render, screen } from '@testing-library/react';
import { Header } from './Header';

describe('Header', () => {
  it('renders the app title', () => {
    render(<Header />);
    expect(screen.getByText('MCP Desktop')).toBeInTheDocument();
  });

  it('renders navigation buttons', () => {
    render(<Header />);
    expect(screen.getByText('Settings')).toBeInTheDocument();
    expect(screen.getByText('New Chat')).toBeInTheDocument();
  });

  it('applies correct styling classes', () => {
    render(<Header />);
    const header = screen.getByRole('banner');
    const headerClasses = [
      'bg-white',
      'border-b',
      'border-gray-200',
      'h-16',
      'flex',
      'items-center',
      'px-6'
    ];
    
    headerClasses.forEach(className => {
      expect(header.className).toContain(className);
    });
  });

  it('has correct button styles', () => {
    render(<Header />);
    const settingsButton = screen.getByText('Settings');
    const newChatButton = screen.getByText('New Chat');

    ['text-gray-600', 'hover:text-gray-800'].forEach(className => {
      expect(settingsButton.className).toContain(className);
    });

    ['bg-blue-500', 'text-white', 'rounded-md', 'hover:bg-blue-600'].forEach(className => {
      expect(newChatButton.className).toContain(className);
    });
  });
}); 