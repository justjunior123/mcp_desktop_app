import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { ServerStatusCard } from './ServerStatusCard';
import { ServerConfig, ServerStatus, LLMServerConfig } from '../../types/server';

describe('ServerStatusCard', () => {
  const mockServer: LLMServerConfig = {
    id: 'test-server',
    name: 'Test Server',
    type: 'llm',
    status: 'stopped',
    port: 8080,
    modelPath: '/path/to/model',
    configPath: '/path/to/config',
    modelType: 'llama',
    quantization: 'q4_k_m',
    contextSize: 4096,
    maxTokens: 2048
  };

  const mockStatus: ServerStatus = {
    id: 'test-server',
    status: 'stopped',
    uptime: 3600,
    memory: {
      used: 1024 * 1024 * 100, // 100 MB
      total: 1024 * 1024 * 1000 // 1000 MB
    },
    activeConnections: 5
  };

  const mockOnStart = jest.fn();
  const mockOnStop = jest.fn();

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('renders server information correctly', () => {
    render(
      <ServerStatusCard
        server={mockServer}
        status={mockStatus}
        onStart={mockOnStart}
        onStop={mockOnStop}
      />
    );

    expect(screen.getByText('Test Server')).toBeInTheDocument();
    expect(screen.getByText('LLM')).toBeInTheDocument();
    expect(screen.getByText('8080')).toBeInTheDocument();
    expect(screen.getByText('1h 0m 0s')).toBeInTheDocument();
    expect(screen.getByText('100 MB / 1000 MB')).toBeInTheDocument();
    expect(screen.getByText('5')).toBeInTheDocument();
  });

  it('shows start button when server is stopped', () => {
    render(
      <ServerStatusCard
        server={mockServer}
        status={{ ...mockStatus, status: 'stopped' }}
        onStart={mockOnStart}
        onStop={mockOnStop}
      />
    );

    expect(screen.getByText('Start Server')).toBeInTheDocument();
    expect(screen.queryByText('Stop Server')).not.toBeInTheDocument();
  });

  it('shows stop button when server is running', () => {
    render(
      <ServerStatusCard
        server={mockServer}
        status={{ ...mockStatus, status: 'running' }}
        onStart={mockOnStart}
        onStop={mockOnStop}
      />
    );

    expect(screen.getByText('Stop Server')).toBeInTheDocument();
    expect(screen.queryByText('Start Server')).not.toBeInTheDocument();
  });

  it('calls onStart when start button is clicked', async () => {
    render(
      <ServerStatusCard
        server={mockServer}
        status={{ ...mockStatus, status: 'stopped' }}
        onStart={mockOnStart}
        onStop={mockOnStop}
      />
    );

    fireEvent.click(screen.getByText('Start Server'));
    await waitFor(() => {
      expect(mockOnStart).toHaveBeenCalledWith('test-server');
    });
    expect(mockOnStop).not.toHaveBeenCalled();
  });

  it('calls onStop when stop button is clicked', async () => {
    render(
      <ServerStatusCard
        server={mockServer}
        status={{ ...mockStatus, status: 'running' }}
        onStart={mockOnStart}
        onStop={mockOnStop}
      />
    );

    fireEvent.click(screen.getByText('Stop Server'));
    await waitFor(() => {
      expect(mockOnStop).toHaveBeenCalledWith('test-server');
    });
    expect(mockOnStart).not.toHaveBeenCalled();
  });

  it('displays error message when present', () => {
    const errorMessage = 'Failed to start server';
    render(
      <ServerStatusCard
        server={mockServer}
        status={{ ...mockStatus, lastError: errorMessage }}
        onStart={mockOnStart}
        onStop={mockOnStop}
      />
    );

    expect(screen.getByText(`Error: ${errorMessage}`)).toBeInTheDocument();
  });

  it('handles missing optional status fields gracefully', () => {
    const minimalStatus: ServerStatus = {
      id: 'test-server',
      status: 'stopped'
    };

    render(
      <ServerStatusCard
        server={mockServer}
        status={minimalStatus}
        onStart={mockOnStart}
        onStop={mockOnStop}
      />
    );

    expect(screen.getByText('0s')).toBeInTheDocument();
    expect(screen.getByText('0 MB / 0 MB')).toBeInTheDocument();
    expect(screen.queryByText('Active Connections:')).not.toBeInTheDocument();
  });

  it('applies correct status styles', () => {
    const { rerender } = render(
      <ServerStatusCard
        server={mockServer}
        status={{ ...mockStatus, status: 'running' }}
        onStart={mockOnStart}
        onStop={mockOnStop}
      />
    );

    expect(screen.getByText('running')).toHaveClass('running');

    rerender(
      <ServerStatusCard
        server={mockServer}
        status={{ ...mockStatus, status: 'stopped' }}
        onStart={mockOnStart}
        onStop={mockOnStop}
      />
    );

    expect(screen.getByText('stopped')).toHaveClass('stopped');

    rerender(
      <ServerStatusCard
        server={mockServer}
        status={{ ...mockStatus, status: 'error' }}
        onStart={mockOnStart}
        onStop={mockOnStop}
      />
    );

    expect(screen.getByText('error')).toHaveClass('error');
  });
}); 