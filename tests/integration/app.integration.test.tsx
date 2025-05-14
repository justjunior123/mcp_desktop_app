import React from 'react';
import { render, screen } from '@testing-library/react';
import { describe, beforeEach, it, expect } from '@jest/globals';
import '@testing-library/jest-dom';
import Home from '@/app/page';

describe('Home Page', () => {
  beforeEach(() => {
    render(<Home />);
  });

  it('renders the main heading', () => {
    const heading = screen.getByRole('heading', { name: /MCP Desktop/i });
    expect(heading).toBeInTheDocument();
  });

  it('renders the description text', () => {
    const description = screen.getByText(/Manage your local LLMs and MCP servers/i);
    expect(description).toBeInTheDocument();
  });

  it('is contained within a main element', () => {
    const mainElement = screen.getByRole('main');
    expect(mainElement).toBeInTheDocument();
  });
}); 