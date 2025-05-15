'use client';

import React, { useState, useEffect } from 'react';
import { ModelList } from '../../components/models/ModelList';
import { ModelDetails } from '../../components/models/ModelDetails';
import { ModelConfigForm } from '../../components/models/ModelConfigForm';
import { useWebSocket } from '../../lib/hooks/useWebSocket';
import { Model } from '@prisma/client';
import { OllamaModelDetails } from '../../services/ollama/ModelManager';

type ModelWithDetails = Model & { ollamaDetails?: OllamaModelDetails | null };
type ViewMode = 'list' | 'details' | 'config';

const ModelsPage: React.FC = () => {
  const [models, setModels] = useState<ModelWithDetails[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedModel, setSelectedModel] = useState<ModelWithDetails | null>(null);
  const [viewMode, setViewMode] = useState<ViewMode>('list');

  // WebSocket connection for real-time updates
  const { isConnected, sendMessage } = useWebSocket('/api/ws', {
    onMessage: (message) => {
      if (message.type === 'initialStatus') {
        // Initial status with model list
        setModels(message.payload.models);
        setLoading(false);
      } else if (message.type === 'modelStatusUpdate') {
        // Update model status in the list
        updateModelStatus(message.payload);
      } else if (message.type === 'modelDetails') {
        // Detailed model information
        setSelectedModel(message.payload);
        setViewMode('details');
      } else if (message.type === 'parametersSaved') {
        // Confirmation of saved parameters
        fetchModels();
        setViewMode('details');
      } else if (message.type === 'error') {
        // Error message
        setError(message.payload.message);
      }
    },
    onConnect: () => {
      console.log('Connected to WebSocket server');
      // Request initial model list
      sendMessage({ type: 'refreshModels' });
    },
    onDisconnect: () => {
      console.log('Disconnected from WebSocket server');
    },
  });

  // Update model status in the list
  const updateModelStatus = (update: any) => {
    setModels((prevModels) => {
      return prevModels.map((model) => {
        if (model.id === update.modelId) {
          return {
            ...model,
            status: update.status,
            ollamaDetails: model.ollamaDetails
              ? {
                  ...model.ollamaDetails,
                  downloadProgress: update.downloadProgress || model.ollamaDetails.downloadProgress,
                  downloadStatus: update.status,
                  errorMessage: update.error || model.ollamaDetails.errorMessage,
                }
              : null,
          };
        }
        return model;
      });
    });

    // Also update the selected model if it's affected
    if (selectedModel && selectedModel.id === update.modelId) {
      setSelectedModel((prev) => {
        if (!prev) return null;
        return {
          ...prev,
          status: update.status,
          ollamaDetails: prev.ollamaDetails
            ? {
                ...prev.ollamaDetails,
                downloadProgress: update.downloadProgress || prev.ollamaDetails.downloadProgress,
                downloadStatus: update.status,
                errorMessage: update.error || prev.ollamaDetails.errorMessage,
              }
            : null,
        };
      });
    }
  };

  // Fetch models from the API
  const fetchModels = async () => {
    try {
      const response = await fetch('/api/models');
      if (!response.ok) {
        throw new Error(`Error fetching models: ${response.statusText}`);
      }
      const data = await response.json();
      setModels(data);
      setLoading(false);
    } catch (error) {
      setError(error instanceof Error ? error.message : 'Unknown error fetching models');
      setLoading(false);
    }
  };

  // Pull a model from Ollama
  const handlePullModel = async (modelName: string) => {
    try {
      const response = await fetch('/api/models/pull', {
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
      setError(error instanceof Error ? error.message : 'Unknown error pulling model');
    }
  };

  // Delete a model from Ollama
  const handleDeleteModel = async (modelId: string) => {
    if (!confirm('Are you sure you want to delete this model?')) {
      return;
    }

    try {
      const response = await fetch(`/api/models/${modelId}`, {
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
      setError(error instanceof Error ? error.message : 'Unknown error deleting model');
    }
  };

  // View model details
  const handleViewDetails = async (modelId: string) => {
    try {
      const response = await fetch(`/api/models/${modelId}`);
      if (!response.ok) {
        throw new Error(`Error fetching model details: ${response.statusText}`);
      }
      const model = await response.json();
      setSelectedModel(model);
      setViewMode('details');
    } catch (error) {
      setError(error instanceof Error ? error.message : 'Unknown error fetching model details');
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
      const response = await fetch(`/api/models/${modelId}/parameters`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ parameters }),
      });

      if (!response.ok) {
        throw new Error(`Error saving parameters: ${response.statusText}`);
      }

      // Refresh model details
      await handleViewDetails(modelId);
    } catch (error) {
      setError(error instanceof Error ? error.message : 'Unknown error saving parameters');
      throw error;
    }
  };

  // Initial data load
  useEffect(() => {
    fetchModels();
  }, []);

  // Render content based on the current view mode
  const renderContent = () => {
    if (loading) return <div className="text-center py-10">Loading models...</div>;

    switch (viewMode) {
      case 'list':
        return (
          <ModelList
            models={models}
            isLoading={loading}
            onPull={handlePullModel}
            onDelete={handleDeleteModel}
            onConfigure={handleConfigureModel}
            onViewDetails={handleViewDetails}
          />
        );
      case 'details':
        return selectedModel ? (
          <ModelDetails
            model={selectedModel}
            onBack={() => setViewMode('list')}
            onConfigure={handleConfigureModel}
            onDelete={handleDeleteModel}
          />
        ) : (
          <div className="text-center py-10">No model selected</div>
        );
      case 'config':
        return selectedModel ? (
          <ModelConfigForm
            model={selectedModel}
            onSave={handleSaveParameters}
            onCancel={() => setViewMode('details')}
          />
        ) : (
          <div className="text-center py-10">No model selected</div>
        );
      default:
        return <div className="text-center py-10">Unknown view mode</div>;
    }
  };

  return (
    <div className="container mx-auto px-4 py-8">
      <div className="flex justify-between items-center mb-8">
        <h1 className="text-3xl font-bold text-gray-800 dark:text-white">
          Ollama Models
        </h1>
        <div className="flex items-center space-x-2">
          <div className={`h-3 w-3 rounded-full ${isConnected ? 'bg-green-500' : 'bg-red-500'}`}></div>
          <span className="text-sm text-gray-500 dark:text-gray-400">
            {isConnected ? 'Connected' : 'Disconnected'}
          </span>
        </div>
      </div>

      {error && (
        <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded mb-6 flex justify-between items-center">
          <span>{error}</span>
          <button
            onClick={() => setError(null)}
            className="text-red-700 hover:text-red-900 focus:outline-none"
          >
            &times;
          </button>
        </div>
      )}

      {renderContent()}
    </div>
  );
};

export default ModelsPage; 