import React from 'react';
import { Model } from '@prisma/client';
import { OllamaModelDetails } from '../../services/ollama/ModelManager';
import { formatBytes } from '../../lib/utils';

type ModelStatus = 'installed' | 'not_installed' | 'downloading' | 'error' | 'deleting';

interface ModelCardProps {
  model: Model & { ollamaDetails?: OllamaModelDetails | null };
  onPull: (modelName: string) => void;
  onDelete: (modelId: string) => void;
  onConfigure: (modelId: string) => void;
  onViewDetails: (modelId: string) => void;
}

export const ModelCard: React.FC<ModelCardProps> = ({
  model,
  onPull,
  onDelete,
  onConfigure,
  onViewDetails,
}) => {
  const { id, name, status, ollamaDetails } = model;
  
  // Format model size if available
  const formattedSize = ollamaDetails?.size 
    ? formatBytes(Number(ollamaDetails.size)) 
    : 'Unknown size';
  
  // Determine the status color and text
  const getStatusInfo = (status: string) => {
    switch (status) {
      case 'installed':
        return { color: 'bg-green-500', text: 'Installed' };
      case 'not_installed':
        return { color: 'bg-gray-500', text: 'Not Installed' };
      case 'downloading':
        return { color: 'bg-blue-500', text: 'Downloading' };
      case 'error':
        return { color: 'bg-red-500', text: 'Error' };
      case 'deleting':
        return { color: 'bg-yellow-500', text: 'Deleting' };
      default:
        return { color: 'bg-gray-500', text: status };
    }
  };
  
  const { color, text } = getStatusInfo(status);
  
  // Get parameter size and quantization info
  const modelInfo = ollamaDetails ? (
    <div className="text-sm text-gray-500">
      {ollamaDetails.parameterSize && <span>{ollamaDetails.parameterSize} • </span>}
      {ollamaDetails.quantizationLevel && <span>{ollamaDetails.quantizationLevel} • </span>}
      <span>{formattedSize}</span>
    </div>
  ) : (
    <div className="text-sm text-gray-500">No details available</div>
  );
  
  // Calculate download progress if applicable
  const downloadProgress = ollamaDetails?.downloadProgress || 0;
  const showProgress = status === 'downloading' && downloadProgress < 100;

  return (
    <div className="bg-white dark:bg-gray-800 shadow rounded-lg p-4 hover:shadow-md transition-shadow">
      <div className="flex justify-between items-start">
        <div>
          <h3 className="text-lg font-medium text-gray-900 dark:text-white">{name}</h3>
          {modelInfo}
        </div>
        <div className={`${color} text-white text-xs px-2 py-1 rounded-full`}>
          {text}
        </div>
      </div>
      
      {/* Download progress */}
      {showProgress && (
        <div className="mt-3">
          <div className="w-full bg-gray-200 rounded-full h-2.5 dark:bg-gray-700">
            <div 
              className="bg-blue-600 h-2.5 rounded-full" 
              style={{ width: `${downloadProgress}%` }}
            ></div>
          </div>
          <div className="text-xs text-gray-500 mt-1 text-right">
            {downloadProgress.toFixed(0)}%
          </div>
        </div>
      )}
      
      {/* Error message */}
      {status === 'error' && ollamaDetails?.errorMessage && (
        <div className="mt-2 text-sm text-red-500">
          {ollamaDetails.errorMessage}
        </div>
      )}
      
      {/* Action buttons */}
      <div className="mt-4 flex flex-wrap gap-2">
        {status === 'not_installed' ? (
          <button
            onClick={() => onPull(name)}
            className="bg-blue-500 hover:bg-blue-600 text-white px-3 py-1 text-sm rounded"
          >
            Pull Model
          </button>
        ) : status === 'installed' ? (
          <>
            <button
              onClick={() => onConfigure(id)}
              className="bg-purple-500 hover:bg-purple-600 text-white px-3 py-1 text-sm rounded"
            >
              Configure
            </button>
            <button
              onClick={() => onDelete(id)}
              className="bg-red-500 hover:bg-red-600 text-white px-3 py-1 text-sm rounded"
            >
              Delete
            </button>
          </>
        ) : null}
        
        <button
          onClick={() => onViewDetails(id)}
          className="bg-gray-200 hover:bg-gray-300 dark:bg-gray-700 dark:hover:bg-gray-600 text-gray-800 dark:text-white px-3 py-1 text-sm rounded"
        >
          Details
        </button>
      </div>
    </div>
  );
}; 