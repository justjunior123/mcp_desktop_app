import React from 'react';
import { OllamaModelDetails } from '../../services/ollama/ModelManager';

interface ModelDetailsProps {
  model: OllamaModelDetails;
  onBack: () => void;
  onConfigure: (modelId: string) => void;
}

export const ModelDetails: React.FC<ModelDetailsProps> = ({
  model,
  onBack,
  onConfigure,
}) => {
  return (
    <div className="bg-white dark:bg-gray-800 rounded-lg shadow-md p-6">
      <div className="flex justify-between items-center mb-6">
        <h2 className="text-2xl font-bold">{model.name}</h2>
        <div className="flex gap-2">
          <button
            onClick={onBack}
            className="px-4 py-2 bg-gray-500 text-white rounded hover:bg-gray-600"
          >
            Back
          </button>
          <button
            onClick={() => onConfigure(model.id)}
            className="px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600"
          >
            Configure
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div>
          <h3 className="text-lg font-semibold mb-4">Model Information</h3>
          <div className="space-y-2">
            <p><span className="font-medium">Family:</span> {model.family}</p>
            <p><span className="font-medium">Format:</span> {model.format}</p>
            <p><span className="font-medium">Size:</span> {(model.size / 1024 / 1024 / 1024).toFixed(2)} GB</p>
            <p><span className="font-medium">Status:</span> {model.status}</p>
            <p><span className="font-medium">Digest:</span> {model.digest}</p>
          </div>
        </div>

        {model.configuration && (
          <div>
            <h3 className="text-lg font-semibold mb-4">Configuration</h3>
            <div className="space-y-2">
              {model.configuration.temperature !== undefined && (
                <p><span className="font-medium">Temperature:</span> {model.configuration.temperature}</p>
              )}
              {model.configuration.topP !== undefined && (
                <p><span className="font-medium">Top P:</span> {model.configuration.topP}</p>
              )}
              {model.configuration.topK !== undefined && (
                <p><span className="font-medium">Top K:</span> {model.configuration.topK}</p>
              )}
              {model.configuration.repeatPenalty !== undefined && (
                <p><span className="font-medium">Repeat Penalty:</span> {model.configuration.repeatPenalty}</p>
              )}
              {model.configuration.contextWindow !== undefined && (
                <p><span className="font-medium">Context Window:</span> {model.configuration.contextWindow}</p>
              )}
              {model.configuration.systemPrompt && (
                <div>
                  <p className="font-medium">System Prompt:</p>
                  <pre className="mt-2 p-3 bg-gray-100 dark:bg-gray-700 rounded overflow-auto">
                    {model.configuration.systemPrompt}
                  </pre>
                </div>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}; 