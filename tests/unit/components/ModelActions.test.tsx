import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import { ModelActions } from '@/components/models/ModelActions';
import type { OllamaModelDetails } from '@/services/ollama/types';

describe('ModelActions Component', () => {
  const mockModel: OllamaModelDetails = {
    id: '1',
    name: 'test-model',
    status: 'AVAILABLE' as const,
    error: null,
    size: BigInt(1000000),
    digest: 'sha256:test-digest',
    modified_at: new Date().toISOString(),
    parameters: {
      temperature: 0.7,
      top_p: 0.9,
      top_k: 40,
      repeat_penalty: 1.1
    }
  };

  const mockOnPull = jest.fn();
  const mockOnDelete = jest.fn();
  const mockOnConfigure = jest.fn();

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('renders pull button when model is not downloaded', () => {
    const notDownloadedModel = { ...mockModel, status: 'NOT_DOWNLOADED' as const };
    render(
      <ModelActions
        model={notDownloadedModel}
        onPull={mockOnPull}
        onDelete={mockOnDelete}
        onConfigure={mockOnConfigure}
      />
    );

    const pullButton = screen.getByText('Pull Model');
    expect(pullButton).toBeInTheDocument();
    fireEvent.click(pullButton);
    expect(mockOnPull).toHaveBeenCalledWith('test-model');
  });

  it('renders configure and delete buttons when model is available', () => {
    render(
      <ModelActions
        model={mockModel}
        onPull={mockOnPull}
        onDelete={mockOnDelete}
        onConfigure={mockOnConfigure}
      />
    );

    const configureButton = screen.getByText('Configure');
    const deleteButton = screen.getByText('Delete');

    expect(configureButton).toBeInTheDocument();
    expect(deleteButton).toBeInTheDocument();

    fireEvent.click(configureButton);
    expect(mockOnConfigure).toHaveBeenCalledWith('1');

    fireEvent.click(deleteButton);
    expect(mockOnDelete).toHaveBeenCalledWith('1');
  });

  it('shows loading state when model is downloading', () => {
    const downloadingModel = { ...mockModel, status: 'DOWNLOADING' as const };
    render(
      <ModelActions
        model={downloadingModel}
        onPull={mockOnPull}
        onDelete={mockOnDelete}
        onConfigure={mockOnConfigure}
      />
    );

    expect(screen.getByText('Downloading...')).toBeInTheDocument();
    expect(screen.getByRole('status')).toHaveClass('animate-spin');
  });

  it('displays error message when model has error', () => {
    const errorModel = { ...mockModel, status: 'ERROR' as const, error: 'Test error' };
    render(
      <ModelActions
        model={errorModel}
        onPull={mockOnPull}
        onDelete={mockOnDelete}
        onConfigure={mockOnConfigure}
      />
    );

    expect(screen.getByText('Error: Test error')).toBeInTheDocument();
  });
}); 