import React from 'react';
import { Model } from '@prisma/client';
import { OllamaModelDetails } from '../../services/ollama/ModelManager';
import { formatBytes } from '../../lib/utils';

interface ModelDetailsProps {
  model: Model & { ollamaDetails?: OllamaModelDetails | null };
  onBack: () => void;
  onConfigure: (modelId: string) => void;
  onDelete: (modelId: string) => void;
}

export const ModelDetails: React.FC<ModelDetailsProps> = ({
  model,
  onBack,
  onConfigure,
  onDelete,
}) => {
  const { id, name, status, createdAt, updatedAt, parameters, ollamaDetails } = model;

  // Format dates
  const formattedCreatedAt = new Date(createdAt).toLocaleString();
  const formattedUpdatedAt = new Date(updatedAt).toLocaleString();

  // Get model configuration parameters
  let modelParams = {};
  if (parameters) {
    try {
      modelParams = JSON.parse(parameters);
    } catch (e) {
      console.error('Error parsing model parameters:', e);
    }
  }

  return (
    <div className="bg-white dark:bg-gray-800 shadow rounded-lg p-6">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <h2 className="text-2xl font-semibold text-gray-900 dark:text-white">{name}</h2>
        <button
          onClick={onBack}
          className="text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-white"
        >
          ← Back to list
        </button>
      </div>

      {/* Status badge */}
      <div className="mb-6">
        <span 
          className={`inline-flex items-center px-3 py-1 rounded-full text-sm font-medium
            ${status === 'installed' ? 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200' : ''}
            ${status === 'not_installed' ? 'bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-200' : ''}
            ${status === 'downloading' ? 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200' : ''}
            ${status === 'error' ? 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200' : ''}
          `}
        >
          {status.charAt(0).toUpperCase() + status.slice(1).replace('_', ' ')}
        </span>
      </div>

      {/* Details grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8">
        <div>
          <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-4">
            Basic Information
          </h3>
          <div className="space-y-3">
            <div>
              <span className="text-sm font-medium text-gray-500 dark:text-gray-400 block">Model ID</span>
              <span className="text-gray-800 dark:text-gray-200">{id}</span>
            </div>
            <div>
              <span className="text-sm font-medium text-gray-500 dark:text-gray-400 block">Created</span>
              <span className="text-gray-800 dark:text-gray-200">{formattedCreatedAt}</span>
            </div>
            <div>
              <span className="text-sm font-medium text-gray-500 dark:text-gray-400 block">Last Updated</span>
              <span className="text-gray-800 dark:text-gray-200">{formattedUpdatedAt}</span>
            </div>
          </div>
        </div>

        {ollamaDetails && (
          <div>
            <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-4">
              Ollama Details
            </h3>
            <div className="space-y-3">
              {ollamaDetails.family && (
                <div>
                  <span className="text-sm font-medium text-gray-500 dark:text-gray-400 block">Family</span>
                  <span className="text-gray-800 dark:text-gray-200">{ollamaDetails.family}</span>
                </div>
              )}
              {ollamaDetails.parameterSize && (
                <div>
                  <span className="text-sm font-medium text-gray-500 dark:text-gray-400 block">Parameter Size</span>
                  <span className="text-gray-800 dark:text-gray-200">{ollamaDetails.parameterSize}</span>
                </div>
              )}
              {ollamaDetails.quantizationLevel && (
                <div>
                  <span className="text-sm font-medium text-gray-500 dark:text-gray-400 block">Quantization</span>
                  <span className="text-gray-800 dark:text-gray-200">{ollamaDetails.quantizationLevel}</span>
                </div>
              )}
              {ollamaDetails.size && (
                <div>
                  <span className="text-sm font-medium text-gray-500 dark:text-gray-400 block">Size</span>
                  <span className="text-gray-800 dark:text-gray-200">{formatBytes(Number(ollamaDetails.size))}</span>
                </div>
              )}
              {ollamaDetails.format && (
                <div>
                  <span className="text-sm font-medium text-gray-500 dark:text-gray-400 block">Format</span>
                  <span className="text-gray-800 dark:text-gray-200">{ollamaDetails.format}</span>
                </div>
              )}
            </div>
          </div>
        )}
      </div>

      {/* Model Parameters */}
      {Object.keys(modelParams).length > 0 && (
        <div className="mb-8">
          <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-4">
            Model Parameters
          </h3>
          <div className="bg-gray-100 dark:bg-gray-700 p-4 rounded-md overflow-auto">
            <pre className="text-sm text-gray-800 dark:text-gray-200">
              {JSON.stringify(modelParams, null, 2)}
            </pre>
          </div>
        </div>
      )}

      {/* Error Message (if any) */}
      {status === 'error' && ollamaDetails?.errorMessage && (
        <div className="mb-8">
          <h3 className="text-lg font-medium text-red-600 dark:text-red-400 mb-2">
            Error Information
          </h3>
          <div className="bg-red-50 dark:bg-red-900/30 border border-red-200 dark:border-red-800 p-4 rounded-md">
            <pre className="text-sm text-red-800 dark:text-red-200 whitespace-pre-wrap">
              {ollamaDetails.errorMessage}
            </pre>
          </div>
        </div>
      )}

      {/* Actions */}
      <div className="flex flex-wrap gap-4 mt-6">
        {status === 'installed' && (
          <>
            <button
              onClick={() => onConfigure(id)}
              className="bg-purple-500 hover:bg-purple-600 text-white px-4 py-2 rounded"
            >
              Configure Parameters
            </button>
            <button
              onClick={() => onDelete(id)}
              className="bg-red-500 hover:bg-red-600 text-white px-4 py-2 rounded"
            >
              Delete Model
            </button>
          </>
        )}
      </div>
    </div>
  );
}; 