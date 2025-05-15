import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import { ModelCard } from './ModelCard';
import '@testing-library/jest-dom';

describe('ModelCard', () => {
  const mockModel = {
    id: 'model-1',
    name: 'llama2',
    status: 'installed',
    parameters: null,
    createdAt: new Date(),
    updatedAt: new Date(),
    ollamaDetails: {
      id: 'detail-1',
      modelId: 'model-1',
      size: BigInt(5000000000),
      family: 'llama',
      parameterSize: '7B',
      quantizationLevel: 'Q4_0',
      downloadProgress: 100,
      downloadStatus: 'completed',
      createdAt: new Date(),
      updatedAt: new Date(),
    }
  };

  const mockHandlers = {
    onPull: jest.fn(),
    onDelete: jest.fn(),
    onConfigure: jest.fn(),
    onViewDetails: jest.fn(),
  };

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('renders model info correctly', () => {
    render(<ModelCard model={mockModel} {...mockHandlers} />);
    
    expect(screen.getByText('llama2')).toBeInTheDocument();
    expect(screen.getByText(/7B/)).toBeInTheDocument();
    expect(screen.getByText(/Q4_0/)).toBeInTheDocument();
    expect(screen.getByText('Installed')).toBeInTheDocument();
  });

  it('shows configure and delete buttons for installed models', () => {
    render(<ModelCard model={mockModel} {...mockHandlers} />);
    
    expect(screen.getByText('Configure')).toBeInTheDocument();
    expect(screen.getByText('Delete')).toBeInTheDocument();
    expect(screen.queryByText('Pull Model')).not.toBeInTheDocument();
  });

  it('shows pull button for not installed models', () => {
    const notInstalledModel = {
      ...mockModel,
      status: 'not_installed',
    };
    
    render(<ModelCard model={notInstalledModel} {...mockHandlers} />);
    
    expect(screen.getByText('Pull Model')).toBeInTheDocument();
    expect(screen.queryByText('Configure')).not.toBeInTheDocument();
    expect(screen.queryByText('Delete')).not.toBeInTheDocument();
  });

  it('shows progress bar for downloading models', () => {
    const downloadingModel = {
      ...mockModel,
      status: 'downloading',
      ollamaDetails: {
        ...mockModel.ollamaDetails,
        downloadProgress: 45,
        downloadStatus: 'downloading',
      }
    };
    
    render(<ModelCard model={downloadingModel} {...mockHandlers} />);
    
    expect(screen.getByText('Downloading')).toBeInTheDocument();
    expect(screen.getByText('45%')).toBeInTheDocument();
    // Check that the progress bar is in the document
    const progressBar = document.querySelector('.bg-blue-600');
    expect(progressBar).toBeInTheDocument();
    expect(progressBar).toHaveStyle({ width: '45%' });
  });

  it('shows error message when model has error', () => {
    const errorModel = {
      ...mockModel,
      status: 'error',
      ollamaDetails: {
        ...mockModel.ollamaDetails,
        downloadStatus: 'error',
        errorMessage: 'Failed to pull model',
      }
    };
    
    render(<ModelCard model={errorModel} {...mockHandlers} />);
    
    expect(screen.getByText('Error')).toBeInTheDocument();
    expect(screen.getByText('Failed to pull model')).toBeInTheDocument();
  });

  it('calls appropriate handlers when buttons are clicked', () => {
    render(<ModelCard model={mockModel} {...mockHandlers} />);
    
    fireEvent.click(screen.getByText('Configure'));
    expect(mockHandlers.onConfigure).toHaveBeenCalledWith('model-1');
    
    fireEvent.click(screen.getByText('Delete'));
    expect(mockHandlers.onDelete).toHaveBeenCalledWith('model-1');
    
    fireEvent.click(screen.getByText('Details'));
    expect(mockHandlers.onViewDetails).toHaveBeenCalledWith('model-1');
  });

  it('calls onPull when Pull Model button is clicked', () => {
    const notInstalledModel = {
      ...mockModel,
      status: 'not_installed',
    };
    
    render(<ModelCard model={notInstalledModel} {...mockHandlers} />);
    
    fireEvent.click(screen.getByText('Pull Model'));
    expect(mockHandlers.onPull).toHaveBeenCalledWith('llama2');
  });
}); 