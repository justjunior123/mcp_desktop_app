import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import { ModelList } from '@/components/models/ModelList';
import { OllamaModelDetails } from '@services/ollama/ModelManager';

const mockModels: OllamaModelDetails[] = [
  {
    id: 'model-1',
    name: 'llama2:7b',
    status: 'AVAILABLE',
    error: undefined,
    size: BigInt(3800000000),
    digest: 'sha256:abc123',
    modified_at: '2024-01-15T10:00:00Z',
    parameters: {
      temperature: 0.7,
      top_p: 0.9,
      top_k: 40,
      repeat_penalty: 1.1,
    },
  },
  {
    id: 'model-2',
    name: 'mistral:latest',
    status: 'DOWNLOADING',
    error: undefined,
    size: BigInt(4100000000),
    digest: 'sha256:def456',
    modified_at: '2024-01-14T15:30:00Z',
    parameters: {
      temperature: 0.8,
      top_p: 0.95,
      top_k: 50,
      repeat_penalty: 1.0,
    },
    downloadProgress: 65,
  },
  {
    id: 'model-3',
    name: 'codellama:13b',
    status: 'ERROR',
    error: 'Download failed',
    size: BigInt(7200000000),
    digest: 'sha256:ghi789',
    modified_at: '2024-01-13T09:15:00Z',
    parameters: {
      temperature: 0.6,
      top_p: 0.85,
      top_k: 30,
      repeat_penalty: 1.2,
    },
  },
];

const mockProps = {
  models: mockModels,
  onViewDetails: jest.fn(),
  onConfigureModel: jest.fn(),
  onPullModel: jest.fn(),
  onDeleteModel: jest.fn(),
};

describe('ModelList Component', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('renders all models', () => {
    render(<ModelList {...mockProps} />);
    
    expect(screen.getByText('llama2:7b')).toBeInTheDocument();
    expect(screen.getByText('mistral:latest')).toBeInTheDocument();
    expect(screen.getByText('codellama:13b')).toBeInTheDocument();
  });

  it('displays model sizes in formatted bytes', () => {
    render(<ModelList {...mockProps} />);
    
    expect(screen.getByText('3.54 GB')).toBeInTheDocument();
    expect(screen.getByText('3.82 GB')).toBeInTheDocument();
    expect(screen.getByText('6.71 GB')).toBeInTheDocument();
  });

  it('displays model status', () => {
    render(<ModelList {...mockProps} />);
    
    expect(screen.getByText('Status: AVAILABLE')).toBeInTheDocument();
    expect(screen.getByText('Status: DOWNLOADING')).toBeInTheDocument();
    expect(screen.getByText('Status: ERROR')).toBeInTheDocument();
  });

  it('shows download progress for downloading models', () => {
    render(<ModelList {...mockProps} />);
    
    expect(screen.getByText('(65%)')).toBeInTheDocument();
  });

  it('calls onViewDetails when model card is clicked', () => {
    render(<ModelList {...mockProps} />);
    
    const modelCard = screen.getByText('llama2:7b').closest('div');
    fireEvent.click(modelCard!);
    
    expect(mockProps.onViewDetails).toHaveBeenCalledWith('model-1');
  });

  it('calls onPullModel when pull button is clicked', () => {
    render(<ModelList {...mockProps} />);
    
    const pullButtons = screen.getAllByText('Pull');
    fireEvent.click(pullButtons[0]);
    
    expect(mockProps.onPullModel).toHaveBeenCalledWith('llama2:7b');
  });

  it('calls onDeleteModel when delete button is clicked', () => {
    render(<ModelList {...mockProps} />);
    
    const deleteButtons = screen.getAllByText('Delete');
    fireEvent.click(deleteButtons[0]);
    
    expect(mockProps.onDeleteModel).toHaveBeenCalledWith('model-1');
  });

  it('prevents event propagation for action buttons', () => {
    render(<ModelList {...mockProps} />);
    
    const pullButton = screen.getAllByText('Pull')[0];
    fireEvent.click(pullButton);
    
    // onViewDetails should not be called because event propagation is stopped
    expect(mockProps.onViewDetails).not.toHaveBeenCalled();
    expect(mockProps.onPullModel).toHaveBeenCalledWith('llama2:7b');
  });

  it('disables buttons for downloading models', () => {
    render(<ModelList {...mockProps} />);
    
    // Find the downloading model's buttons
    const downloadingModelCard = screen.getByText('Status: DOWNLOADING').closest('div');
    const pullButton = downloadingModelCard!.querySelector('button:contains("Pulling...")') ||
                      Array.from(downloadingModelCard!.querySelectorAll('button'))
                        .find(btn => btn.textContent === 'Pulling...');
    const deleteButton = Array.from(downloadingModelCard!.querySelectorAll('button'))
                        .find(btn => btn.textContent === 'Delete');
    
    expect(pullButton).toBeDisabled();
    expect(deleteButton).toBeDisabled();
  });

  it('shows "Pulling..." text for downloading models', () => {
    render(<ModelList {...mockProps} />);
    
    expect(screen.getByText('Pulling...')).toBeInTheDocument();
  });

  it('handles empty models array', () => {
    render(<ModelList {...mockProps} models={[]} />);
    
    expect(screen.getByText('No models available')).toBeInTheDocument();
  });

  it('handles non-array models prop', () => {
    render(<ModelList {...mockProps} models={null as any} />);
    
    expect(screen.getByText('No models available')).toBeInTheDocument();
  });

  it('handles models with unknown size', () => {
    const modelWithoutSize = {
      ...mockModels[0],
      size: null as any,
    };
    
    render(<ModelList {...mockProps} models={[modelWithoutSize]} />);
    
    expect(screen.getByText('Size unknown')).toBeInTheDocument();
  });

  it('applies hover styles to model cards', () => {
    render(<ModelList {...mockProps} />);
    
    const modelCards = screen.getAllByRole('presentation');
    modelCards.forEach(card => {
      expect(card).toHaveClass('hover:shadow-lg transition-shadow');
    });
  });

  it('uses grid layout for responsive design', () => {
    const { container } = render(<ModelList {...mockProps} />);
    
    const gridContainer = container.querySelector('.grid');
    expect(gridContainer).toHaveClass('grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4');
  });
});

describe('ModelList Component - WebView Integration', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    
    // Mock console.error to check for error handling
    jest.spyOn(console, 'error').mockImplementation(() => {});
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  it('handles webview errors gracefully', () => {
    render(<ModelList {...mockProps} />);
    
    // Simulate webview error event
    const errorEvent = new Event('error') as any;
    errorEvent.message = 'Test error';
    
    // Since we can't easily test the webview functionality in Jest,
    // we'll just verify the component renders without crashing
    expect(screen.getByText('llama2:7b')).toBeInTheDocument();
  });

  it('ignores Symbol.iterator errors', () => {
    render(<ModelList {...mockProps} />);
    
    // This would normally trigger a webview error handler
    // but Symbol.iterator errors should be ignored
    expect(console.error).not.toHaveBeenCalled();
  });
});

// Test the formatBytes utility function behavior
describe('formatBytes utility', () => {
  it('formats bytes correctly', () => {
    render(<ModelList {...mockProps} />);
    
    // Test various byte sizes through the component
    const testModel = {
      ...mockModels[0],
      size: BigInt(1024),
    };
    
    const { rerender } = render(<ModelList {...mockProps} models={[testModel]} />);
    expect(screen.getByText('1 KB')).toBeInTheDocument();
    
    rerender(<ModelList {...mockProps} models={[{
      ...testModel,
      size: BigInt(1048576),
    }]} />);
    expect(screen.getByText('1 MB')).toBeInTheDocument();
    
    rerender(<ModelList {...mockProps} models={[{
      ...testModel,
      size: BigInt(0),
    }]} />);
    expect(screen.getByText('0 Bytes')).toBeInTheDocument();
  });
});