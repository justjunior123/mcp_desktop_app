import React, { useState, useMemo } from 'react';
import { Model } from '@prisma/client';
import { OllamaModelDetails } from '../../services/ollama/ModelManager';
import { ModelCard } from './ModelCard';

interface ModelListProps {
  models: (Model & { ollamaDetails?: OllamaModelDetails | null })[];
  onPull: (modelName: string) => void;
  onDelete: (modelId: string) => void;
  onConfigure: (modelId: string) => void;
  onViewDetails: (modelId: string) => void;
  isLoading?: boolean;
}

export const ModelList: React.FC<ModelListProps> = ({
  models,
  onPull,
  onDelete,
  onConfigure,
  onViewDetails,
  isLoading = false,
}) => {
  const [searchQuery, setSearchQuery] = useState('');
  const [filter, setFilter] = useState<string>('all');

  // Filter and sort models
  const filteredModels = useMemo(() => {
    return models
      .filter(model => {
        // Apply text search
        const matchesSearch = 
          model.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
          (model.ollamaDetails?.family || '').toLowerCase().includes(searchQuery.toLowerCase());
        
        // Apply status filter
        if (filter === 'all') return matchesSearch;
        if (filter === 'installed') return matchesSearch && model.status === 'installed';
        if (filter === 'not_installed') return matchesSearch && model.status === 'not_installed';
        if (filter === 'downloading') return matchesSearch && model.status === 'downloading';
        
        return matchesSearch;
      })
      .sort((a, b) => {
        // Sort installed models first, then by name
        if (a.status === 'installed' && b.status !== 'installed') return -1;
        if (a.status !== 'installed' && b.status === 'installed') return 1;
        return a.name.localeCompare(b.name);
      });
  }, [models, searchQuery, filter]);

  // Render loading state
  if (isLoading) {
    return (
      <div className="flex justify-center items-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-blue-500"></div>
      </div>
    );
  }

  // Render empty state
  if (models.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center h-64 text-center p-4">
        <h3 className="text-xl font-medium text-gray-700 dark:text-gray-300 mb-2">
          No models found
        </h3>
        <p className="text-gray-500 dark:text-gray-400 mb-4">
          You don't have any models yet. Pull a model to get started.
        </p>
        <div className="flex gap-4">
          <button
            onClick={() => onPull('llama2')}
            className="bg-blue-500 hover:bg-blue-600 text-white px-4 py-2 rounded"
          >
            Pull llama2
          </button>
          <button
            onClick={() => onPull('mistral')}
            className="bg-purple-500 hover:bg-purple-600 text-white px-4 py-2 rounded"
          >
            Pull mistral
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Search and filter controls */}
      <div className="flex flex-col sm:flex-row gap-4 mb-6">
        <div className="flex-1">
          <input
            type="text"
            placeholder="Search models..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full p-2 border border-gray-300 dark:border-gray-700 rounded-md dark:bg-gray-800 focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          />
        </div>
        <div className="flex gap-2">
          <button
            onClick={() => setFilter('all')}
            className={`px-3 py-1 rounded ${
              filter === 'all'
                ? 'bg-blue-500 text-white'
                : 'bg-gray-200 dark:bg-gray-700 text-gray-800 dark:text-white'
            }`}
          >
            All
          </button>
          <button
            onClick={() => setFilter('installed')}
            className={`px-3 py-1 rounded ${
              filter === 'installed'
                ? 'bg-green-500 text-white'
                : 'bg-gray-200 dark:bg-gray-700 text-gray-800 dark:text-white'
            }`}
          >
            Installed
          </button>
          <button
            onClick={() => setFilter('not_installed')}
            className={`px-3 py-1 rounded ${
              filter === 'not_installed'
                ? 'bg-gray-500 text-white'
                : 'bg-gray-200 dark:bg-gray-700 text-gray-800 dark:text-white'
            }`}
          >
            Available
          </button>
        </div>
      </div>

      {/* Model cards grid */}
      {filteredModels.length > 0 ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {filteredModels.map((model) => (
            <ModelCard
              key={model.id}
              model={model}
              onPull={onPull}
              onDelete={onDelete}
              onConfigure={onConfigure}
              onViewDetails={onViewDetails}
            />
          ))}
        </div>
      ) : (
        <div className="text-center py-10 text-gray-500 dark:text-gray-400">
          No models match your search criteria.
        </div>
      )}
    </div>
  );
}; 