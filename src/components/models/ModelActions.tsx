import React, { useState } from 'react';
import type { OllamaModelDetails } from '@services/ollama/types.ts';

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
  const [progress, setProgress] = useState<number>(0);
  const [status, setStatus] = useState<string>('');

  const handlePull = async (modelName: string) => {
    setStatus('DOWNLOADING');
    setProgress(0);

    try {
      const response = await fetch(`/api/models/${modelName}/pull`);
      const reader = response.body?.getReader();
      const decoder = new TextDecoder();

      if (!reader) {
        throw new Error('Failed to start model pull');
      }

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        const chunk = decoder.decode(value);
        const lines = chunk.split('\n').filter(Boolean);

        for (const line of lines) {
          if (line.startsWith('data: ')) {
            const data = JSON.parse(line.slice(6));
            setStatus(data.status);
            if (data.progress !== undefined) {
              setProgress(data.progress);
            }
          }
        }
      }

      onPull(modelName);
    } catch (error) {
      setStatus('ERROR');
      console.error('Error pulling model:', error);
    }
  };

  return (
    <div className="flex gap-2">
      {model.status === 'NOT_DOWNLOADED' && (
        <button
          onClick={() => handlePull(model.name)}
          className="px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600"
          disabled={status === 'DOWNLOADING'}
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
      {status === 'DOWNLOADING' && (
        <div className="flex items-center gap-2">
          <div className="w-32 bg-gray-200 rounded-full h-2.5">
            <div
              className="bg-blue-500 h-2.5 rounded-full transition-all duration-300"
              style={{ width: `${progress}%` }}
            ></div>
          </div>
          <span>{Math.round(progress)}%</span>
        </div>
      )}
      {status === 'ERROR' && (
        <div className="text-red-500">
          Error: {model.error || 'Unknown error'}
        </div>
      )}
    </div>
  );
}; 