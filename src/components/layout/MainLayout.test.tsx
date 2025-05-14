import React from 'react';
import { render, screen } from '@testing-library/react';
import { MainLayout } from './MainLayout';

// Mock the child components
jest.mock('./Header', () => ({
  Header: () => <div data-testid="mock-header">Header</div>,
}));

jest.mock('./Sidebar', () => ({
  Sidebar: () => <div data-testid="mock-sidebar">Sidebar</div>,
}));

describe('MainLayout', () => {
  it('renders all layout components', () => {
    render(
      <MainLayout>
        <div data-testid="test-content">Content</div>
      </MainLayout>
    );

    expect(screen.getByTestId('mock-header')).toBeInTheDocument();
    expect(screen.getByTestId('mock-sidebar')).toBeInTheDocument();
    expect(screen.getByTestId('test-content')).toBeInTheDocument();
  });

  it('applies correct layout classes', () => {
    render(
      <MainLayout>
        <div>Content</div>
      </MainLayout>
    );

    const container = screen.getByTestId('mock-header').parentElement?.parentElement;
    expect(container?.className).toContain('min-h-screen');
    expect(container?.className).toContain('bg-gray-50');
    expect(container?.className).toContain('flex');
  });

  it('wraps content in main tag with correct classes', () => {
    render(
      <MainLayout>
        <div>Content</div>
      </MainLayout>
    );

    const main = screen.getByRole('main');
    expect(main.className).toContain('flex-1');
    expect(main.className).toContain('overflow-y-auto');
    expect(main.className).toContain('p-6');
  });
}); 