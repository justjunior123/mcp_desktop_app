'use client';

import React, { useState, useEffect } from 'react';
import { ModelList } from '@components/models/ModelList';
import { ModelDetails } from '@components/models/ModelDetails';
import { ModelConfigForm } from '@components/models/ModelConfigForm';
import { useWebSocket } from '@lib/hooks/useWebSocket';
import { OllamaModelDetails } from '@services/ollama/ModelManager';
import { ModelActions } from '@components/models/ModelActions';
import { ServerStatusCard } from '@components/ServerStatusCard';
import { getApiUrl, getWsUrl } from '@/config/api';
import type { WebSocketMessageUnion } from '@/types/websocket';

type ViewMode = 'list' | 'details' | 'config';

const ModelsPage: React.FC = () => {
  const [models, setModels] = useState<OllamaModelDetails[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedModel, setSelectedModel] = useState<OllamaModelDetails | null>(null);
  const [viewMode, setViewMode] = useState<ViewMode>('list');

  // WebSocket connection for real-time updates
  const { sendMessage, isConnected } = useWebSocket(getWsUrl('ws'), {
    onMessage: (message: WebSocketMessageUnion) => {
      try {
      if (message.type === 'initialStatus') {
          setModels(message.payload.models || []);
        setLoading(false);
          setError(null);
      } else if (message.type === 'modelStatusUpdate') {
          const { modelId, status, progress } = message.payload;
          updateModelStatus({
            modelId,
            status: status as OllamaModelDetails['status'],
            progress
          });
      } else if (message.type === 'modelDetails') {
        setSelectedModel(message.payload);
        setViewMode('details');
      } else if (message.type === 'parametersSaved') {
        fetchModels();
        setViewMode('details');
      } else if (message.type === 'error') {
          setError(message.payload.message);
        }
      } catch (err) {
        console.error('Error processing WebSocket message:', err);
        setError('Error processing server message');
      }
    },
    onConnect: () => {
      console.log('Connected to WebSocket server');
      sendMessage({ type: 'refreshModels' });
      setError(null);
    },
    onDisconnect: () => {
      console.log('Disconnected from WebSocket server');
      setError('Lost connection to server');
    },
  });

  // Fetch models on mount and when connection status changes
  useEffect(() => {
    if (isConnected) {
      fetchModels();
    }
  }, [isConnected]);

  // Update model status in the list
  const updateModelStatus = (update: { 
    modelId: string; 
    status: OllamaModelDetails['status']; 
    progress?: number 
  }) => {
    setModels((prevModels) => {
      return prevModels.map((model) => {
        if (model.id === update.modelId) {
          return {
            ...model,
            status: update.status,
            downloadProgress: update.progress
          };
        }
        return model;
      });
    });

    // Also update the selected model if it's affected
    if (selectedModel && selectedModel.id === update.modelId) {
      setSelectedModel((prev: OllamaModelDetails | null) => {
        if (!prev) return null;
        return {
          ...prev,
          status: update.status,
          downloadProgress: update.progress
        };
      });
    }
  };

  // Fetch models from the server
  const fetchModels = async () => {
    try {
      const response = await fetch(getApiUrl('models'));
      if (!response.ok) {
        throw new Error(`Error fetching models: ${response.statusText}`);
      }
      const data = await response.json();
      setModels(data.models);
    } catch (error) {
      console.error(error instanceof Error ? error.message : 'Unknown error fetching models');
    }
  };

  // Pull a model from Ollama
  const handlePullModel = async (modelName: string) => {
    try {
      const response = await fetch(`${getApiUrl('models')}/pull`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ modelName }),
      });

      if (!response.ok) {
        throw new Error(`Error pulling model: ${response.statusText}`);
      }

      // The WebSocket will update the model status
    } catch (error) {
      console.error(error instanceof Error ? error.message : 'Unknown error pulling model');
    }
  };

  // Delete a model from Ollama
  const handleDeleteModel = async (modelId: string) => {
    if (!confirm('Are you sure you want to delete this model?')) {
      return;
    }

    try {
      const response = await fetch(`${getApiUrl('models')}/${modelId}`, {
        method: 'DELETE',
      });

      if (!response.ok) {
        throw new Error(`Error deleting model: ${response.statusText}`);
      }

      // If the deleted model is the selected one, go back to list
      if (selectedModel && selectedModel.id === modelId) {
        setSelectedModel(null);
        setViewMode('list');
      }

      // The WebSocket will update the model list
    } catch (error) {
      console.error(error instanceof Error ? error.message : 'Unknown error deleting model');
    }
  };

  // View model details
  const handleViewDetails = async (modelId: string) => {
    try {
      const response = await fetch(`${getApiUrl('models')}/${modelId}`);
      if (!response.ok) {
        throw new Error(`Error fetching model details: ${response.statusText}`);
      }
      const data = await response.json();
      setSelectedModel(data.model || null);
      setViewMode('details');
    } catch (error) {
      console.error(error instanceof Error ? error.message : 'Unknown error fetching model details');
    }
  };

  // Configure model parameters
  const handleConfigureModel = (modelId: string) => {
    // Find the model in our current list
    const model = models.find((m) => m.id === modelId) || selectedModel;
    if (model) {
      setSelectedModel(model);
      setViewMode('config');
    }
  };

  // Save model parameters
  const handleSaveParameters = async (modelId: string, parameters: string) => {
    try {
      const response = await fetch(`${getApiUrl('models')}/${modelId}/parameters`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ parameters }),
      });

      if (!response.ok) {
        throw new Error(`Error saving parameters: ${response.statusText}`);
      }

      // The WebSocket will send a parametersSaved message
    } catch (error) {
      console.error(error instanceof Error ? error.message : 'Unknown error saving parameters');
    }
  };

  // Render the appropriate view
  const renderContent = () => {
    if (loading) {
      return (
        <div className="flex justify-center items-center h-64">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500"></div>
        </div>
      );
    }

    if (error) {
      return (
        <div className="flex flex-col items-center justify-center h-64">
          <div className="text-red-500 mb-4">{error}</div>
          <button 
            onClick={() => {
              setError(null);
              setLoading(true);
              fetchModels();
            }}
            className="px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600"
          >
            Retry
          </button>
        </div>
      );
    }

    if (viewMode === 'details' && selectedModel) {
      return (
          <ModelDetails
            model={selectedModel}
          onBack={() => setViewMode('list')}
            onConfigure={handleConfigureModel}
          />
      );
    }

    if (viewMode === 'config' && selectedModel) {
      return (
          <ModelConfigForm
            model={selectedModel}
            onSave={handleSaveParameters}
          onBack={() => setViewMode('details')}
          />
      );
    }

        return (
          <>
            <ModelList
              models={models}
              onViewDetails={handleViewDetails}
          onConfigureModel={handleConfigureModel}
          onPullModel={handlePullModel}
          onDeleteModel={handleDeleteModel}
        />
        {selectedModel && (
          <ModelActions
            model={selectedModel}
            onPull={handlePullModel}
            onDelete={handleDeleteModel}
              onConfigure={handleConfigureModel}
            />
        )}
        <ServerStatusCard
          isConnected={isConnected}
          onRefresh={() => sendMessage({ type: 'refreshModels' })}
        />
          </>
        );
  };

  return (
    <div className="container mx-auto px-4 py-8">
      <h1 className="text-3xl font-bold mb-8">Model Management</h1>
      {renderContent()}
    </div>
  );
};

export default ModelsPage; 