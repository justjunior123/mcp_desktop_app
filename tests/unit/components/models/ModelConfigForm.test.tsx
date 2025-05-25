import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { ModelConfigForm } from '@/components/models/ModelConfigForm';
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
  configuration: {
    temperature: 0.8,
    topP: 0.95,
    topK: 50,
    repeatPenalty: 1.05,
    presencePenalty: 0.1,
    frequencyPenalty: 0.2,
    contextWindow: 4096,
    systemPrompt: 'You are a helpful AI assistant.',
  },
};

const mockProps = {
  model: mockModel,
  onSave: jest.fn(),
  onBack: jest.fn(),
};

describe('ModelConfigForm Component', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('renders form title with model name', () => {
    render(<ModelConfigForm {...mockProps} />);
    
    expect(screen.getByText('Configure llama2:7b')).toBeInTheDocument();
  });

  it('renders back button', () => {
    render(<ModelConfigForm {...mockProps} />);
    
    expect(screen.getByText('Back')).toBeInTheDocument();
  });

  it('calls onBack when back button is clicked', () => {
    render(<ModelConfigForm {...mockProps} />);
    
    const backButton = screen.getByText('Back');
    fireEvent.click(backButton);
    
    expect(mockProps.onBack).toHaveBeenCalledTimes(1);
  });

  it('initializes form with model configuration values', () => {
    render(<ModelConfigForm {...mockProps} />);
    
    expect(screen.getByDisplayValue('0.8')).toBeInTheDocument(); // Temperature
    expect(screen.getByDisplayValue('0.95')).toBeInTheDocument(); // Top P
    expect(screen.getByDisplayValue('50')).toBeInTheDocument(); // Top K
    expect(screen.getByDisplayValue('1.05')).toBeInTheDocument(); // Repeat Penalty
    expect(screen.getByDisplayValue('0.1')).toBeInTheDocument(); // Presence Penalty
    expect(screen.getByDisplayValue('0.2')).toBeInTheDocument(); // Frequency Penalty
    expect(screen.getByDisplayValue('4096')).toBeInTheDocument(); // Context Window
    expect(screen.getByDisplayValue('You are a helpful AI assistant.')).toBeInTheDocument(); // System Prompt
  });

  it('uses default values when model configuration is missing', () => {
    const modelWithoutConfig = {
      ...mockModel,
      configuration: undefined,
    };
    
    render(<ModelConfigForm {...mockProps} model={modelWithoutConfig} />);
    
    expect(screen.getByDisplayValue('0.7')).toBeInTheDocument(); // Default temperature
    expect(screen.getByDisplayValue('0.9')).toBeInTheDocument(); // Default top P
    expect(screen.getByDisplayValue('40')).toBeInTheDocument(); // Default top K
    expect(screen.getByDisplayValue('1.1')).toBeInTheDocument(); // Default repeat penalty
    expect(screen.getByDisplayValue('0')).toBeInTheDocument(); // Default presence penalty
    expect(screen.getByDisplayValue('4096')).toBeInTheDocument(); // Default context window
    expect(screen.getByDisplayValue('')).toBeInTheDocument(); // Default system prompt
  });

  it('renders all form fields with correct labels', () => {
    render(<ModelConfigForm {...mockProps} />);
    
    expect(screen.getByLabelText('Temperature')).toBeInTheDocument();
    expect(screen.getByLabelText('Top P')).toBeInTheDocument();
    expect(screen.getByLabelText('Top K')).toBeInTheDocument();
    expect(screen.getByLabelText('Repeat Penalty')).toBeInTheDocument();
    expect(screen.getByLabelText('Presence Penalty')).toBeInTheDocument();
    expect(screen.getByLabelText('Frequency Penalty')).toBeInTheDocument();
    expect(screen.getByLabelText('Context Window')).toBeInTheDocument();
    expect(screen.getByLabelText('System Prompt')).toBeInTheDocument();
  });

  it('updates form values when inputs change', () => {
    render(<ModelConfigForm {...mockProps} />);
    
    const temperatureInput = screen.getByLabelText('Temperature');
    fireEvent.change(temperatureInput, { target: { value: '0.5' } });
    expect(temperatureInput).toHaveValue(0.5);
    
    const topPInput = screen.getByLabelText('Top P');
    fireEvent.change(topPInput, { target: { value: '0.85' } });
    expect(topPInput).toHaveValue(0.85);
    
    const topKInput = screen.getByLabelText('Top K');
    fireEvent.change(topKInput, { target: { value: '30' } });
    expect(topKInput).toHaveValue(30);
    
    const systemPromptInput = screen.getByLabelText('System Prompt');
    fireEvent.change(systemPromptInput, { target: { value: 'New system prompt' } });
    expect(systemPromptInput).toHaveValue('New system prompt');
  });

  it('calls onSave with correct parameters when form is submitted', async () => {
    render(<ModelConfigForm {...mockProps} />);
    
    // Modify some values
    const temperatureInput = screen.getByLabelText('Temperature');
    fireEvent.change(temperatureInput, { target: { value: '0.6' } });
    
    const systemPromptInput = screen.getByLabelText('System Prompt');
    fireEvent.change(systemPromptInput, { target: { value: 'Updated prompt' } });
    
    const saveButton = screen.getByText('Save Configuration');
    fireEvent.click(saveButton);
    
    await waitFor(() => {
      expect(mockProps.onSave).toHaveBeenCalledTimes(1);
    });
    
    const [modelId, configJson] = mockProps.onSave.mock.calls[0];
    expect(modelId).toBe('model-1');
    
    const config = JSON.parse(configJson);
    expect(config.temperature).toBe(0.6);
    expect(config.systemPrompt).toBe('Updated prompt');
    expect(config.topP).toBe(0.95); // Unchanged
  });

  it('prevents form submission with default behavior', async () => {
    render(<ModelConfigForm {...mockProps} />);
    
    const form = screen.getByRole('form') || screen.getByText('Save Configuration').closest('form');
    expect(form).toBeInTheDocument();
    
    const saveButton = screen.getByText('Save Configuration');
    fireEvent.click(saveButton);
    
    await waitFor(() => {
      expect(mockProps.onSave).toHaveBeenCalled();
    });
  });

  it('has correct input constraints', () => {
    render(<ModelConfigForm {...mockProps} />);
    
    const temperatureInput = screen.getByLabelText('Temperature');
    expect(temperatureInput).toHaveAttribute('min', '0');
    expect(temperatureInput).toHaveAttribute('max', '2');
    expect(temperatureInput).toHaveAttribute('step', '0.1');
    
    const topPInput = screen.getByLabelText('Top P');
    expect(topPInput).toHaveAttribute('min', '0');
    expect(topPInput).toHaveAttribute('max', '1');
    expect(topPInput).toHaveAttribute('step', '0.1');
    
    const topKInput = screen.getByLabelText('Top K');
    expect(topKInput).toHaveAttribute('min', '1');
    expect(topKInput).toHaveAttribute('step', '1');
    
    const presencePenaltyInput = screen.getByLabelText('Presence Penalty');
    expect(presencePenaltyInput).toHaveAttribute('min', '-2');
    expect(presencePenaltyInput).toHaveAttribute('max', '2');
    
    const contextWindowInput = screen.getByLabelText('Context Window');
    expect(contextWindowInput).toHaveAttribute('min', '512');
    expect(contextWindowInput).toHaveAttribute('step', '512');
  });

  it('handles partial configuration correctly', () => {
    const modelWithPartialConfig = {
      ...mockModel,
      configuration: {
        temperature: 0.9,
        topP: 0.8,
        // Missing other fields
      },
    };
    
    render(<ModelConfigForm {...mockProps} model={modelWithPartialConfig} />);
    
    expect(screen.getByDisplayValue('0.9')).toBeInTheDocument(); // From config
    expect(screen.getByDisplayValue('0.8')).toBeInTheDocument(); // From config
    expect(screen.getByDisplayValue('40')).toBeInTheDocument(); // Default topK
    expect(screen.getByDisplayValue('1.1')).toBeInTheDocument(); // Default repeatPenalty
  });

  it('uses responsive grid layout', () => {
    const { container } = render(<ModelConfigForm {...mockProps} />);
    
    const gridContainer = container.querySelector('.grid');
    expect(gridContainer).toHaveClass('grid-cols-1 md:grid-cols-2 gap-6');
  });

  it('applies correct styling to form elements', () => {
    render(<ModelConfigForm {...mockProps} />);
    
    const temperatureInput = screen.getByLabelText('Temperature');
    expect(temperatureInput).toHaveClass('w-full p-2 border rounded focus:ring-2 focus:ring-blue-500');
    
    const systemPromptTextarea = screen.getByLabelText('System Prompt');
    expect(systemPromptTextarea).toHaveClass('w-full p-2 border rounded focus:ring-2 focus:ring-blue-500');
    expect(systemPromptTextarea).toHaveAttribute('rows', '4');
  });

  it('handles numeric input parsing correctly', () => {
    render(<ModelConfigForm {...mockProps} />);
    
    // Test float parsing
    const temperatureInput = screen.getByLabelText('Temperature');
    fireEvent.change(temperatureInput, { target: { value: '0.123' } });
    expect(temperatureInput).toHaveValue(0.123);
    
    // Test integer parsing
    const topKInput = screen.getByLabelText('Top K');
    fireEvent.change(topKInput, { target: { value: '25' } });
    expect(topKInput).toHaveValue(25);
  });

  it('saves configuration with all field types correctly', async () => {
    render(<ModelConfigForm {...mockProps} />);
    
    // Update all types of fields
    fireEvent.change(screen.getByLabelText('Temperature'), { target: { value: '0.3' } });
    fireEvent.change(screen.getByLabelText('Top K'), { target: { value: '20' } });
    fireEvent.change(screen.getByLabelText('Context Window'), { target: { value: '2048' } });
    fireEvent.change(screen.getByLabelText('System Prompt'), { target: { value: 'Test prompt' } });
    
    fireEvent.click(screen.getByText('Save Configuration'));
    
    await waitFor(() => {
      expect(mockProps.onSave).toHaveBeenCalled();
    });
    
    const [, configJson] = mockProps.onSave.mock.calls[0];
    const config = JSON.parse(configJson);
    
    expect(config.temperature).toBe(0.3);
    expect(config.topK).toBe(20);
    expect(config.contextWindow).toBe(2048);
    expect(config.systemPrompt).toBe('Test prompt');
  });
});