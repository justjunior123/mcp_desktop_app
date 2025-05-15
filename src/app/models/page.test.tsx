import React from 'react';
import { render, screen, fireEvent, waitFor, act } from '@testing-library/react';
import ModelsPage from './page';
import * as useWebSocketModule from '../../lib/hooks/useWebSocket';
import '@testing-library/jest-dom';

// Mock the components that would be used in the page
jest.mock('../../components/models/ModelList', () => ({
  ModelList: ({ models, onPull, onDelete, onConfigure, onViewDetails, isLoading }: any) => (
    <div data-testid="model-list">
      <div data-testid="model-count">{models.length}</div>
      <div data-testid="loading-state">{isLoading.toString()}</div>
      <button data-testid="pull-button" onClick={() => onPull('test-model')}>Pull Model</button>
      <button data-testid="delete-button" onClick={() => onDelete('model-1')}>Delete Model</button>
      <button data-testid="configure-button" onClick={() => onConfigure('model-1')}>Configure Model</button>
      <button data-testid="view-details-button" onClick={() => onViewDetails('model-1')}>View Details</button>
    </div>
  )
}));

jest.mock('../../components/models/ModelDetails', () => ({
  ModelDetails: ({ model, onBack, onConfigure, onDelete }: any) => (
    <div data-testid="model-details">
      <div data-testid="model-id">{model.id}</div>
      <button data-testid="back-button" onClick={onBack}>Back</button>
      <button data-testid="configure-detail-button" onClick={() => onConfigure(model.id)}>Configure</button>
      <button data-testid="delete-detail-button" onClick={() => onDelete(model.id)}>Delete</button>
    </div>
  )
}));

jest.mock('../../components/models/ModelConfigForm', () => ({
  ModelConfigForm: ({ model, onSave, onCancel }: any) => (
    <div data-testid="model-config-form">
      <div data-testid="config-model-id">{model.id}</div>
      <button data-testid="save-button" onClick={() => onSave(model.id, '{"test": true}')}>Save</button>
      <button data-testid="cancel-button" onClick={onCancel}>Cancel</button>
    </div>
  )
}));

// Mock the useWebSocket hook
jest.mock('../../lib/hooks/useWebSocket', () => ({
  useWebSocket: jest.fn(),
}));

describe('ModelsPage', () => {
  let mockSendMessage: jest.Mock;
  let mockHandleMessage: (message: any) => void;
  
  beforeEach(() => {
    mockSendMessage = jest.fn();
    
    // Mock the useWebSocket hook implementation
    (useWebSocketModule.useWebSocket as jest.Mock).mockImplementation((url, options) => {
      // Store the message handler so we can trigger it in tests
      mockHandleMessage = options?.onMessage || (() => {});
      
      // Execute onConnect callback if provided
      if (options?.onConnect) {
        setTimeout(() => options.onConnect(), 0);
      }
      
      return {
        isConnected: true,
        sendMessage: mockSendMessage,
        error: null,
        reconnectAttempts: 0,
        connect: jest.fn(),
        disconnect: jest.fn(),
      };
    });
    
    // Mock fetch
    global.fetch = jest.fn().mockImplementation((url) => {
      if (url === '/api/models') {
        return Promise.resolve({
          ok: true,
          json: () => Promise.resolve({
            models: [
              { id: 'model-1', name: 'test-model', status: 'installed' },
            ]
          }),
        });
      }
      
      if (url === '/api/models/model-1') {
        return Promise.resolve({
          ok: true,
          json: () => Promise.resolve({
            model: { id: 'model-1', name: 'test-model', status: 'installed' }
          }),
        });
      }
      
      return Promise.resolve({
        ok: true,
        json: () => Promise.resolve({}),
      });
    });

    // Mock window.confirm
    window.confirm = jest.fn().mockReturnValue(true);
  });
  
  afterEach(() => {
    jest.clearAllMocks();
  });
  
  it('renders loading state initially', async () => {
    render(<ModelsPage />);
    
    // Wait for the component to render with loading state
    await waitFor(() => {
      expect(screen.getByText('Loading models...')).toBeInTheDocument();
    });
  });
  
  it('loads models when WebSocket sends initialStatus', async () => {
    render(<ModelsPage />);
    
    // Simulate WebSocket initialStatus message
    act(() => {
      mockHandleMessage({
        type: 'initialStatus',
        payload: {
          models: [
            { id: 'model-1', name: 'test-model', status: 'installed' },
            { id: 'model-2', name: 'another-model', status: 'not_installed' },
          ],
        },
      });
    });
    
    // Should now have 2 models
    await waitFor(() => {
      expect(screen.getByTestId('model-count').textContent).toBe('2');
      expect(screen.getByTestId('loading-state').textContent).toBe('false');
    });
  });
  
  it('updates model status when WebSocket sends statusUpdate', async () => {
    // First render the component and initialize with models
    render(<ModelsPage />);
    
    // Simulate initial status with one model
    act(() => {
      mockHandleMessage({
        type: 'initialStatus',
        payload: {
          models: [
            { id: 'model-1', name: 'test-model', status: 'not_installed' },
          ],
        },
      });
    });
    
    // Verify initial state
    await waitFor(() => {
      expect(screen.getByTestId('model-count').textContent).toBe('1');
    });
    
    // Now simulate a status update for that model
    act(() => {
      mockHandleMessage({
        type: 'modelStatusUpdate',
        payload: {
          modelId: 'model-1',
          status: 'downloading',
          downloadProgress: 50,
        },
      });
    });
    
    // Model should still be in the list, just with updated status
    expect(screen.getByTestId('model-count').textContent).toBe('1');
  });
  
  it('changes view to details when details button is clicked', async () => {
    // Setup - render and initialize with a model
    render(<ModelsPage />);
    
    act(() => {
      mockHandleMessage({
        type: 'initialStatus',
        payload: {
          models: [
            { id: 'model-1', name: 'test-model', status: 'installed' },
          ],
        },
      });
    });
    
    // Wait for models to load
    await waitFor(() => {
      expect(screen.getByTestId('model-count').textContent).toBe('1');
    });
    
    // Click the view details button
    fireEvent.click(screen.getByTestId('view-details-button'));
    
    // Should show details view
    await waitFor(() => {
      expect(screen.getByTestId('model-details')).toBeInTheDocument();
      expect(screen.getByTestId('model-id').textContent).toBe('model-1');
    });
    
    // Click the back button to return to list
    fireEvent.click(screen.getByTestId('back-button'));
    
    // Should be back to list view
    await waitFor(() => {
      expect(screen.getByTestId('model-list')).toBeInTheDocument();
    });
  });
  
  it('changes view to config form when configure button is clicked', async () => {
    // Setup - render and initialize with a model
    render(<ModelsPage />);
    
    act(() => {
      mockHandleMessage({
        type: 'initialStatus',
        payload: {
          models: [
            { id: 'model-1', name: 'test-model', status: 'installed' },
          ],
        },
      });
    });
    
    // Wait for models to load
    await waitFor(() => {
      expect(screen.getByTestId('model-count').textContent).toBe('1');
    });
    
    // Click the configure button
    fireEvent.click(screen.getByTestId('configure-button'));
    
    // Should show config form
    await waitFor(() => {
      expect(screen.getByTestId('model-config-form')).toBeInTheDocument();
      expect(screen.getByTestId('config-model-id').textContent).toBe('model-1');
    });
    
    // Click cancel to go back to details view first, then back to list
    fireEvent.click(screen.getByTestId('cancel-button'));
    
    // Cancel should take us back to details view
    await waitFor(() => {
      expect(screen.getByTestId('model-details')).toBeInTheDocument();
    });
    
    // Now click the back button to go to list view
    fireEvent.click(screen.getByTestId('back-button'));
    
    // Should be back to list view
    await waitFor(() => {
      expect(screen.getByTestId('model-list')).toBeInTheDocument();
    });
  });
  
  it('handles pull model action', async () => {
    // Setup - render component
    render(<ModelsPage />);
    
    act(() => {
      mockHandleMessage({
        type: 'initialStatus',
        payload: { models: [] },
      });
    });
    
    // Wait for initial state
    await waitFor(() => {
      expect(screen.getByTestId('loading-state').textContent).toBe('false');
    });
    
    // Click the pull button
    fireEvent.click(screen.getByTestId('pull-button'));
    
    // Should call fetch to pull model
    await waitFor(() => {
      expect(global.fetch).toHaveBeenCalledWith('/api/models/pull', expect.objectContaining({
        method: 'POST',
        body: expect.any(String),
      }));
    });
  });
  
  it('handles delete model action', async () => {
    // Setup - render component
    render(<ModelsPage />);
    
    act(() => {
      mockHandleMessage({
        type: 'initialStatus',
        payload: {
          models: [
            { id: 'model-1', name: 'test-model', status: 'installed' },
          ],
        },
      });
    });
    
    // Wait for initial state
    await waitFor(() => {
      expect(screen.getByTestId('model-count').textContent).toBe('1');
    });
    
    // Click the delete button
    fireEvent.click(screen.getByTestId('delete-button'));
    
    // Should call fetch to delete model
    await waitFor(() => {
      expect(global.fetch).toHaveBeenCalledWith('/api/models/model-1', expect.objectContaining({
        method: 'DELETE',
      }));
    });
  });
  
  it('shows error message when fetch fails', async () => {
    // Mock fetch to fail
    (global.fetch as jest.Mock).mockImplementationOnce(() => 
      Promise.resolve({
        ok: false,
        statusText: 'Internal Server Error',
      })
    );
    
    // Setup - render component
    render(<ModelsPage />);
    
    // Wait for initial fetch to fail
    await waitFor(() => {
      expect(screen.getByText(/Error fetching models/)).toBeInTheDocument();
    });
    
    // Should be able to dismiss the error
    fireEvent.click(screen.getByText('×'));
    
    await waitFor(() => {
      expect(screen.queryByText(/Error fetching models/)).not.toBeInTheDocument();
    });
  });
}); 