import React from 'react';
import { OllamaModelDetails } from '../../services/ollama/ModelManager';

interface ModelListProps {
  models: OllamaModelDetails[];
  onViewDetails: (modelId: string) => void;
  onConfigureModel: (modelId: string) => void;
  onPullModel: (modelName: string) => void;
  onDeleteModel: (modelId: string) => void;
}

export const ModelList: React.FC<ModelListProps> = ({
  models,
  onViewDetails,
  onConfigureModel,
  onPullModel,
  onDeleteModel,
}) => {
  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 p-4">
      {models.map((model) => (
        <div
          key={model.id}
          className="bg-white dark:bg-gray-800 rounded-lg shadow-md p-4 hover:shadow-lg transition-shadow"
        >
          <h3 className="text-lg font-semibold mb-2">{model.name}</h3>
          <div className="text-sm text-gray-600 dark:text-gray-400 mb-2">
            <p>Family: {model.family}</p>
            <p>Size: {(model.size / 1024 / 1024 / 1024).toFixed(2)} GB</p>
            <p>Status: {model.status}</p>
          </div>
          {model.downloadProgress !== undefined && model.status === 'DOWNLOADING' && (
            <div className="w-full bg-gray-200 rounded-full h-2.5 mb-4">
              <div
                className="bg-blue-600 h-2.5 rounded-full"
                style={{ width: `${model.downloadProgress}%` }}
              ></div>
            </div>
          )}
          <div className="flex gap-2 mt-4">
            <button
              onClick={() => onViewDetails(model.id)}
              className="px-3 py-1 bg-blue-500 text-white rounded hover:bg-blue-600"
            >
              Details
            </button>
            <button
              onClick={() => onConfigureModel(model.id)}
              className="px-3 py-1 bg-green-500 text-white rounded hover:bg-green-600"
            >
              Configure
            </button>
            {model.status === 'NOT_DOWNLOADED' && (
              <button
                onClick={() => onPullModel(model.name)}
                className="px-3 py-1 bg-purple-500 text-white rounded hover:bg-purple-600"
              >
                Pull
              </button>
            )}
            {model.status === 'AVAILABLE' && (
              <button
                onClick={() => onDeleteModel(model.id)}
                className="px-3 py-1 bg-red-500 text-white rounded hover:bg-red-600"
              >
                Delete
              </button>
            )}
          </div>
        </div>
      ))}
    </div>
  );
}; 