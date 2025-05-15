'use client';

import { useState } from 'react';

export function ModelActions() {
  const [modelName, setModelName] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handlePullModel = async () => {
    if (!modelName.trim()) {
      setError('Please enter a model name');
      return;
    }

    setIsLoading(true);
    setError(null);

    try {
      const response = await fetch('/api/models', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ modelName: modelName.trim() }),
      });

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || 'Failed to pull model');
      }

      setModelName('');
      // Could emit an event or use a callback to refresh the model list
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to pull model');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="flex items-center gap-4">
      <div className="relative">
        <input
          type="text"
          value={modelName}
          onChange={(e) => setModelName(e.target.value)}
          placeholder="Enter model name"
          className="px-4 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
        />
        {error && (
          <div className="absolute top-full mt-1 text-sm text-red-600">
            {error}
          </div>
        )}
      </div>
      
      <button
        onClick={handlePullModel}
        disabled={isLoading}
        className={`px-4 py-2 rounded-lg text-white ${
          isLoading
            ? 'bg-blue-400 cursor-not-allowed'
            : 'bg-blue-600 hover:bg-blue-700'
        }`}
      >
        {isLoading ? 'Pulling...' : 'Pull Model'}
      </button>
    </div>
  );
} 