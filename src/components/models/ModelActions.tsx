import React from 'react';
import { OllamaModelDetails } from '../../services/ollama/ModelManager';

interface ModelActionsProps {
  model: OllamaModelDetails;
  onPull: (modelName: string) => void;
  onDelete: (modelId: string) => void;
  onConfigure: (modelId: string) => void;
}

export const ModelActions: React.FC<ModelActionsProps> = ({
  model,
  onPull,
  onDelete,
  onConfigure,
}) => {
  return (
    <div className="flex gap-2">
      {model.status === 'NOT_DOWNLOADED' && (
        <button
          onClick={() => onPull(model.name)}
          className="px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600"
        >
          Pull Model
        </button>
      )}
      {model.status === 'AVAILABLE' && (
        <>
          <button
            onClick={() => onConfigure(model.id)}
            className="px-4 py-2 bg-green-500 text-white rounded hover:bg-green-600"
          >
            Configure
          </button>
          <button
            onClick={() => onDelete(model.id)}
            className="px-4 py-2 bg-red-500 text-white rounded hover:bg-red-600"
          >
            Delete
          </button>
        </>
      )}
      {model.status === 'DOWNLOADING' && (
        <div className="flex items-center gap-2">
          <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-blue-500"></div>
          <span>Downloading...</span>
        </div>
      )}
      {model.status === 'ERROR' && (
        <div className="text-red-500">
          Error: {model.error || 'Unknown error'}
        </div>
      )}
    </div>
  );
}; 