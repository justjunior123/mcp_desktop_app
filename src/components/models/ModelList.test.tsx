import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import { ModelList } from './ModelList';
import { Model } from '@prisma/client';
import { OllamaModelDetails } from '../../services/ollama/ModelManager';
import '@testing-library/jest-dom';

interface MockModelCardProps {
  model: Model & { ollamaDetails?: OllamaModelDetails | null };
  onPull: (modelName: string) => void;
  onDelete: (modelId: string) => void;
  onConfigure: (modelId: string) => void;
  onViewDetails: (modelId: string) => void;
}

// Mock ModelCard component
jest.mock('./ModelCard', () => ({
  ModelCard: ({ model, onPull, onDelete, onConfigure, onViewDetails }: MockModelCardProps) => (
    <div data-testid={`model-card-${model.id}`}>
      <p>Name: {model.name}</p>
      <p>Status: {model.status}</p>
      <button onClick={() => onPull(model.name)}>Pull</button>
      <button onClick={() => onDelete(model.id)}>Delete</button>
      <button onClick={() => onConfigure(model.id)}>Configure</button>
      <button onClick={() => onViewDetails(model.id)}>Details</button>
    </div>
  ),
}));

describe('ModelList', () => {
  const mockModels = [
    {
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
    },
    {
      id: 'model-2',
      name: 'mistral',
      status: 'not_installed',
      parameters: null,
      createdAt: new Date(),
      updatedAt: new Date(),
      ollamaDetails: null
    },
    {
      id: 'model-3',
      name: 'llama2-uncensored',
      status: 'downloading',
      parameters: null,
      createdAt: new Date(),
      updatedAt: new Date(),
      ollamaDetails: {
        id: 'detail-3',
        modelId: 'model-3',
        size: BigInt(8000000000),
        family: 'llama',
        parameterSize: '13B',
        quantizationLevel: 'Q5_K_M',
        downloadProgress: 45,
        downloadStatus: 'downloading',
        createdAt: new Date(),
        updatedAt: new Date(),
      }
    }
  ];

  const mockHandlers = {
    onPull: jest.fn(),
    onDelete: jest.fn(),
    onConfigure: jest.fn(),
    onViewDetails: jest.fn(),
  };

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('renders loading spinner when isLoading is true', () => {
    render(
      <ModelList
        models={[]}
        isLoading={true}
        {...mockHandlers}
      />
    );
    
    // There should be a loading spinner
    const spinner = document.querySelector('.animate-spin');
    expect(spinner).toBeInTheDocument();
  });

  it('renders empty state when no models are available', () => {
    render(
      <ModelList
        models={[]}
        isLoading={false}
        {...mockHandlers}
      />
    );
    
    expect(screen.getByText('No models found')).toBeInTheDocument();
    expect(screen.getByText(/Pull llama2/)).toBeInTheDocument();
    expect(screen.getByText(/Pull mistral/)).toBeInTheDocument();
  });

  it('renders all models when loaded', () => {
    render(
      <ModelList
        models={mockModels}
        isLoading={false}
        {...mockHandlers}
      />
    );
    
    expect(screen.getByTestId('model-card-model-1')).toBeInTheDocument();
    expect(screen.getByTestId('model-card-model-2')).toBeInTheDocument();
    expect(screen.getByTestId('model-card-model-3')).toBeInTheDocument();
  });

  it('filters models by search query', () => {
    render(
      <ModelList
        models={mockModels}
        isLoading={false}
        {...mockHandlers}
      />
    );
    
    // Type in search box
    const searchInput = screen.getByPlaceholderText('Search models...');
    fireEvent.change(searchInput, { target: { value: 'mistral' } });
    
    // Should only show the mistral model
    expect(screen.getByTestId('model-card-model-2')).toBeInTheDocument();
    expect(screen.queryByTestId('model-card-model-1')).not.toBeInTheDocument();
    expect(screen.queryByTestId('model-card-model-3')).not.toBeInTheDocument();
  });

  it('filters models by status', () => {
    render(
      <ModelList
        models={mockModels}
        isLoading={false}
        {...mockHandlers}
      />
    );
    
    // Click on the Installed filter
    fireEvent.click(screen.getByText('Installed'));
    
    // Should only show the installed model
    expect(screen.getByTestId('model-card-model-1')).toBeInTheDocument();
    expect(screen.queryByTestId('model-card-model-2')).not.toBeInTheDocument();
    expect(screen.queryByTestId('model-card-model-3')).not.toBeInTheDocument();
    
    // Click on the Available filter
    fireEvent.click(screen.getByText('Available'));
    
    // Should only show the not installed model
    expect(screen.queryByTestId('model-card-model-1')).not.toBeInTheDocument();
    expect(screen.getByTestId('model-card-model-2')).toBeInTheDocument();
    expect(screen.queryByTestId('model-card-model-3')).not.toBeInTheDocument();
  });

  it('passes handlers to ModelCard components', () => {
    render(
      <ModelList
        models={mockModels}
        isLoading={false}
        {...mockHandlers}
      />
    );
    
    // Find a model card's button and click it
    const deleteButtons = screen.getAllByText('Delete');
    fireEvent.click(deleteButtons[0]); // First delete button
    
    // Check if the handler was called
    expect(mockHandlers.onDelete).toHaveBeenCalled();
  });

  it('shows message when filtered results are empty', () => {
    render(
      <ModelList
        models={mockModels}
        isLoading={false}
        {...mockHandlers}
      />
    );
    
    // Search for something that doesn't exist
    const searchInput = screen.getByPlaceholderText('Search models...');
    fireEvent.change(searchInput, { target: { value: 'nonexistent' } });
    
    // Should show no matches message
    expect(screen.getByText('No models match your search criteria.')).toBeInTheDocument();
  });
}); 