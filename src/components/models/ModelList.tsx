'use client';

import { Model } from '@prisma/client';
import { OllamaModelDetails } from '@/services/ollama/ModelManager';

type ModelWithDetails = Model & {
  ollamaDetails: OllamaModelDetails | null;
};

interface ModelListProps {
  models: ModelWithDetails[];
  isLoading: boolean;
  onDelete: (modelId: string) => Promise<void>;
  onConfigure: (modelId: string) => void;
  onViewDetails: (modelId: string) => Promise<void>;
}

export function ModelList({
  models,
  isLoading,
  onDelete,
  onConfigure,
  onViewDetails
}: ModelListProps) {
  if (isLoading) {
    return <div>Loading models...</div>;
  }

  if (models.length === 0) {
    return (
      <div className="text-center py-8 text-gray-500">
        No models available. Click &quot;Pull Model&quot; to add one.
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {models.map((model) => (
        <div
          key={model.id}
          className="border rounded-lg p-4 hover:bg-gray-50 transition-colors"
        >
          <div className="flex justify-between items-start">
            <div>
              <h3 className="text-lg font-medium">{model.name}</h3>
              <p className="text-sm text-gray-500">ID: {model.id}</p>
            </div>
            <div className="text-right">
              <span className={`inline-block px-2 py-1 rounded text-sm ${
                model.status === 'ready' ? 'bg-green-100 text-green-800' :
                model.status === 'downloading' ? 'bg-blue-100 text-blue-800' :
                'bg-gray-100 text-gray-800'
              }`}>
                {model.status}
              </span>
              {model.ollamaDetails?.downloadProgress !== undefined && (
                <div className="text-sm text-gray-500 mt-1">
                  {model.ollamaDetails.downloadProgress}% downloaded
                </div>
              )}
            </div>
          </div>
          
          <div className="mt-4 flex space-x-2">
            <button
              onClick={() => onViewDetails(model.id)}
              className="text-sm text-blue-600 hover:text-blue-800"
            >
              View Details
            </button>
            <button
              onClick={() => onConfigure(model.id)}
              className="text-sm text-blue-600 hover:text-blue-800"
            >
              Edit Parameters
            </button>
            <button
              onClick={() => onDelete(model.id)}
              className="text-sm text-red-600 hover:text-red-800"
            >
              Delete
            </button>
          </div>
        </div>
      ))}
    </div>
  );
} 