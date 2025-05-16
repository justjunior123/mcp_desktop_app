import React, { useState } from 'react';
import { OllamaModelDetails } from '../../services/ollama/ModelManager';

interface ModelConfigFormProps {
  model: OllamaModelDetails;
  onSave: (modelId: string, parameters: string) => void;
  onBack: () => void;
}

export const ModelConfigForm: React.FC<ModelConfigFormProps> = ({
  model,
  onSave,
  onBack,
}) => {
  const [config, setConfig] = useState({
    temperature: model.configuration?.temperature ?? 0.7,
    topP: model.configuration?.topP ?? 0.9,
    topK: model.configuration?.topK ?? 40,
    repeatPenalty: model.configuration?.repeatPenalty ?? 1.1,
    presencePenalty: model.configuration?.presencePenalty ?? 0,
    frequencyPenalty: model.configuration?.frequencyPenalty ?? 0,
    contextWindow: model.configuration?.contextWindow ?? 4096,
    systemPrompt: model.configuration?.systemPrompt ?? '',
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSave(model.id, JSON.stringify(config));
  };

  return (
    <div className="bg-white dark:bg-gray-800 rounded-lg shadow-md p-6">
      <div className="flex justify-between items-center mb-6">
        <h2 className="text-2xl font-bold">Configure {model.name}</h2>
        <button
          onClick={onBack}
          className="px-4 py-2 bg-gray-500 text-white rounded hover:bg-gray-600"
        >
          Back
        </button>
      </div>

      <form onSubmit={handleSubmit} className="space-y-6">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium mb-1">Temperature</label>
              <input
                type="number"
                step="0.1"
                min="0"
                max="2"
                value={config.temperature}
                onChange={(e) => setConfig({ ...config, temperature: parseFloat(e.target.value) })}
                className="w-full p-2 border rounded focus:ring-2 focus:ring-blue-500"
              />
            </div>

            <div>
              <label className="block text-sm font-medium mb-1">Top P</label>
              <input
                type="number"
                step="0.1"
                min="0"
                max="1"
                value={config.topP}
                onChange={(e) => setConfig({ ...config, topP: parseFloat(e.target.value) })}
                className="w-full p-2 border rounded focus:ring-2 focus:ring-blue-500"
              />
            </div>

            <div>
              <label className="block text-sm font-medium mb-1">Top K</label>
              <input
                type="number"
                step="1"
                min="1"
                value={config.topK}
                onChange={(e) => setConfig({ ...config, topK: parseInt(e.target.value) })}
                className="w-full p-2 border rounded focus:ring-2 focus:ring-blue-500"
              />
            </div>

            <div>
              <label className="block text-sm font-medium mb-1">Repeat Penalty</label>
              <input
                type="number"
                step="0.1"
                min="1"
                value={config.repeatPenalty}
                onChange={(e) => setConfig({ ...config, repeatPenalty: parseFloat(e.target.value) })}
                className="w-full p-2 border rounded focus:ring-2 focus:ring-blue-500"
              />
            </div>
          </div>

          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium mb-1">Presence Penalty</label>
              <input
                type="number"
                step="0.1"
                min="-2"
                max="2"
                value={config.presencePenalty}
                onChange={(e) => setConfig({ ...config, presencePenalty: parseFloat(e.target.value) })}
                className="w-full p-2 border rounded focus:ring-2 focus:ring-blue-500"
              />
            </div>

            <div>
              <label className="block text-sm font-medium mb-1">Frequency Penalty</label>
              <input
                type="number"
                step="0.1"
                min="-2"
                max="2"
                value={config.frequencyPenalty}
                onChange={(e) => setConfig({ ...config, frequencyPenalty: parseFloat(e.target.value) })}
                className="w-full p-2 border rounded focus:ring-2 focus:ring-blue-500"
              />
            </div>

            <div>
              <label className="block text-sm font-medium mb-1">Context Window</label>
              <input
                type="number"
                step="512"
                min="512"
                value={config.contextWindow}
                onChange={(e) => setConfig({ ...config, contextWindow: parseInt(e.target.value) })}
                className="w-full p-2 border rounded focus:ring-2 focus:ring-blue-500"
              />
            </div>
          </div>
        </div>

        <div>
          <label className="block text-sm font-medium mb-1">System Prompt</label>
          <textarea
            value={config.systemPrompt}
            onChange={(e) => setConfig({ ...config, systemPrompt: e.target.value })}
            rows={4}
            className="w-full p-2 border rounded focus:ring-2 focus:ring-blue-500"
          />
        </div>

        <div className="flex justify-end">
          <button
            type="submit"
            className="px-6 py-2 bg-blue-500 text-white rounded hover:bg-blue-600"
          >
            Save Configuration
          </button>
        </div>
      </form>
    </div>
  );
}; 