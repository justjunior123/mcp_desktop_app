import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import { ModelDetails } from '@/components/models/ModelDetails';
import { OllamaModelDetails } from '@services/ollama/ModelManager';

const mockModel: OllamaModelDetails = {
  id: 'model-1',
  name: 'llama2:7b',
  status: 'AVAILABLE',
  error: undefined,
  size: BigInt(3800000000),
  digest: 'sha256:abc123def456',
  modified_at: '2024-01-15T10:00:00Z',
  parameters: {
    temperature: 0.7,
    top_p: 0.9,
    top_k: 40,
    repeat_penalty: 1.1,
  },
  details: {
    family: 'llama',
    format: 'gguf',
    parameter_size: '7B',
    quantization_level: 'Q4_0',
  },
  configuration: {
    temperature: 0.8,
    topP: 0.95,
    topK: 50,
    repeatPenalty: 1.05,
    contextWindow: 4096,
    systemPrompt: 'You are a helpful AI assistant.',
  },
};

const mockProps = {
  model: mockModel,
  onBack: jest.fn(),
  onConfigure: jest.fn(),
};

describe('ModelDetails Component', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('renders model name as title', () => {
    render(<ModelDetails {...mockProps} />);
    
    expect(screen.getByText('llama2:7b')).toBeInTheDocument();
    expect(screen.getByText('llama2:7b')).toHaveClass('text-2xl font-bold');
  });

  it('renders back and configure buttons', () => {
    render(<ModelDetails {...mockProps} />);
    
    expect(screen.getByText('Back')).toBeInTheDocument();
    expect(screen.getByText('Configure')).toBeInTheDocument();
  });

  it('calls onBack when back button is clicked', () => {
    render(<ModelDetails {...mockProps} />);
    
    const backButton = screen.getByText('Back');
    fireEvent.click(backButton);
    
    expect(mockProps.onBack).toHaveBeenCalledTimes(1);
  });

  it('calls onConfigure when configure button is clicked', () => {
    render(<ModelDetails {...mockProps} />);
    
    const configureButton = screen.getByText('Configure');
    fireEvent.click(configureButton);
    
    expect(mockProps.onConfigure).toHaveBeenCalledWith('model-1');
  });

  it('displays model information section', () => {
    render(<ModelDetails {...mockProps} />);
    
    expect(screen.getByText('Model Information')).toBeInTheDocument();
    expect(screen.getByText('Family:')).toBeInTheDocument();
    expect(screen.getByText('llama')).toBeInTheDocument();
    expect(screen.getByText('Format:')).toBeInTheDocument();
    expect(screen.getByText('gguf')).toBeInTheDocument();
    expect(screen.getByText('Size:')).toBeInTheDocument();
    expect(screen.getByText('3.54 GB')).toBeInTheDocument();
    expect(screen.getByText('Status:')).toBeInTheDocument();
    expect(screen.getByText('AVAILABLE')).toBeInTheDocument();
    expect(screen.getByText('Digest:')).toBeInTheDocument();
    expect(screen.getByText('sha256:abc123def456')).toBeInTheDocument();
  });

  it('displays configuration section when configuration exists', () => {
    render(<ModelDetails {...mockProps} />);
    
    expect(screen.getByText('Configuration')).toBeInTheDocument();
    expect(screen.getByText('Temperature:')).toBeInTheDocument();
    expect(screen.getByText('0.8')).toBeInTheDocument();
    expect(screen.getByText('Top P:')).toBeInTheDocument();
    expect(screen.getByText('0.95')).toBeInTheDocument();
    expect(screen.getByText('Top K:')).toBeInTheDocument();
    expect(screen.getByText('50')).toBeInTheDocument();
    expect(screen.getByText('Repeat Penalty:')).toBeInTheDocument();
    expect(screen.getByText('1.05')).toBeInTheDocument();
    expect(screen.getByText('Context Window:')).toBeInTheDocument();
    expect(screen.getByText('4096')).toBeInTheDocument();
  });

  it('displays system prompt when available', () => {
    render(<ModelDetails {...mockProps} />);
    
    expect(screen.getByText('System Prompt:')).toBeInTheDocument();
    expect(screen.getByText('You are a helpful AI assistant.')).toBeInTheDocument();
  });

  it('handles model without details gracefully', () => {
    const modelWithoutDetails = {
      ...mockModel,
      details: undefined,
    };
    
    render(<ModelDetails {...mockProps} model={modelWithoutDetails} />);
    
    expect(screen.getByText('Unknown')).toBeInTheDocument(); // Family: Unknown
    expect(screen.getAllByText('Unknown')).toHaveLength(2); // Family and Format
  });

  it('handles model without configuration', () => {
    const modelWithoutConfig = {
      ...mockModel,
      configuration: undefined,
    };
    
    render(<ModelDetails {...mockProps} model={modelWithoutConfig} />);
    
    expect(screen.queryByText('Configuration')).not.toBeInTheDocument();
  });

  it('displays only defined configuration parameters', () => {
    const modelWithPartialConfig = {
      ...mockModel,
      configuration: {
        temperature: 0.7,
        topP: 0.9,
        // Missing topK, repeatPenalty, contextWindow, systemPrompt
      },
    };
    
    render(<ModelDetails {...mockProps} model={modelWithPartialConfig} />);
    
    expect(screen.getByText('Temperature:')).toBeInTheDocument();
    expect(screen.getByText('0.7')).toBeInTheDocument();
    expect(screen.getByText('Top P:')).toBeInTheDocument();
    expect(screen.getByText('0.9')).toBeInTheDocument();
    
    // These should not be displayed
    expect(screen.queryByText('Top K:')).not.toBeInTheDocument();
    expect(screen.queryByText('Repeat Penalty:')).not.toBeInTheDocument();
    expect(screen.queryByText('Context Window:')).not.toBeInTheDocument();
    expect(screen.queryByText('System Prompt:')).not.toBeInTheDocument();
  });

  it('formats bytes correctly', () => {
    const testCases = [
      { size: BigInt(0), expected: '0 Bytes' },
      { size: BigInt(1024), expected: '1 KB' },
      { size: BigInt(1048576), expected: '1 MB' },
      { size: BigInt(1073741824), expected: '1 GB' },
    ];

    testCases.forEach(({ size, expected }) => {
      const testModel = { ...mockModel, size };
      const { rerender } = render(<ModelDetails {...mockProps} model={testModel} />);
      
      expect(screen.getByText(expected)).toBeInTheDocument();
      
      rerender(<div />); // Clear for next test
    });
  });

  it('uses responsive grid layout', () => {
    const { container } = render(<ModelDetails {...mockProps} />);
    
    const gridContainer = container.querySelector('.grid');
    expect(gridContainer).toHaveClass('grid-cols-1 md:grid-cols-2 gap-6');
  });

  it('applies correct styling to system prompt', () => {
    render(<ModelDetails {...mockProps} />);
    
    const systemPromptElement = screen.getByText('You are a helpful AI assistant.');
    expect(systemPromptElement.closest('pre')).toHaveClass('mt-2 p-3 bg-gray-100 dark:bg-gray-700 rounded overflow-auto');
  });

  it('handles zero configuration values correctly', () => {
    const modelWithZeroValues = {
      ...mockModel,
      configuration: {
        temperature: 0,
        topP: 0,
        topK: 0,
        repeatPenalty: 0,
        contextWindow: 0,
        systemPrompt: '',
      },
    };
    
    render(<ModelDetails {...mockProps} model={modelWithZeroValues} />);
    
    // Zero values should still be displayed
    expect(screen.getByText('Temperature:')).toBeInTheDocument();
    expect(screen.getByText('0')).toBeInTheDocument();
    
    // Empty string system prompt should not display the section
    expect(screen.queryByText('System Prompt:')).not.toBeInTheDocument();
  });

  it('handles large numbers in digest correctly', () => {
    const modelWithLongDigest = {
      ...mockModel,
      digest: 'sha256:' + 'a'.repeat(64),
    };
    
    render(<ModelDetails {...mockProps} model={modelWithLongDigest} />);
    
    const digestText = 'sha256:' + 'a'.repeat(64);
    expect(screen.getByText(digestText)).toBeInTheDocument();
  });
});