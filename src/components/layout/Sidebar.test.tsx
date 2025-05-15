import React from 'react';
import { render, screen } from '@testing-library/react';
import { Sidebar } from './Sidebar';

// Mock next/link
jest.mock('next/link', () => {
  const MockLink = ({ children, href, className }: { children: React.ReactNode; href: string; className?: string }) => (
    <a href={href} className={className}>{children}</a>
  );
  MockLink.displayName = 'Link';
  return MockLink;
});

// Mock TestIcon component
const TestIcon = () => <span data-testid="test-icon">Icon</span>;
TestIcon.displayName = 'TestIcon';

// Test navigation items
const testNavItems = [
  { label: 'Chat', href: '/chat' },
  { label: 'Models', href: '/models' },
  { label: 'Servers', href: '/servers' },
  { label: 'Test', href: '/test', icon: <TestIcon /> }
];

describe('Sidebar', () => {
  it('renders the logo', () => {
    render(<Sidebar navItems={testNavItems} />);
    const logo = screen.getByAltText('Logo');
    expect(logo).toBeInTheDocument();
    expect(logo).toHaveClass('h-8');
  });

  it('renders all navigation items', () => {
    render(<Sidebar navItems={testNavItems} />);
    expect(screen.getByText('Chat')).toBeInTheDocument();
    expect(screen.getByText('Models')).toBeInTheDocument();
    expect(screen.getByText('Servers')).toBeInTheDocument();
    expect(screen.getByText('Test')).toBeInTheDocument();
  });

  it('renders navigation links with correct hrefs', () => {
    render(<Sidebar navItems={testNavItems} />);
    expect(screen.getByText('Chat').closest('a')).toHaveAttribute('href', '/chat');
    expect(screen.getByText('Models').closest('a')).toHaveAttribute('href', '/models');
    expect(screen.getByText('Servers').closest('a')).toHaveAttribute('href', '/servers');
    expect(screen.getByText('Test').closest('a')).toHaveAttribute('href', '/test');
  });

  it('applies correct styling to navigation items', () => {
    render(<Sidebar navItems={testNavItems} />);
    const navItems = screen.getAllByRole('link');
    navItems.forEach(item => {
      expect(item).toHaveClass('flex items-center px-4 py-2 text-gray-600 hover:bg-gray-50 rounded-md');
    });
  });

  it('renders icons when provided', () => {
    render(<Sidebar navItems={testNavItems} />);
    expect(screen.getByTestId('test-icon')).toBeInTheDocument();
  });
}); 