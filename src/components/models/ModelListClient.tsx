'use client';

import React, { useState, useEffect } from 'react';
import { ModelList } from './ModelList.tsx';
import type { OllamaModelDetails } from '../../services/ollama/ModelManager.ts';
import { getApiUrl } from '../../config/api.ts';

interface ModelListClientProps {
  initialModels: OllamaModelDetails[];
}

export const ModelListClient: React.FC<ModelListClientProps> = ({ initialModels }) => {
  const [models, setModels] = useState<OllamaModelDetails[]>(initialModels);
  const [loading, setLoading] = useState(false);

  const fetchModels = async () => {
    setLoading(true);
    try {
      const res = await fetch(getApiUrl('models'));
      if (!res.ok) throw new Error(res.statusText);
      const data = await res.json();
      setModels(data.models);
    } catch (error) {
      console.error('Error fetching models:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchModels();
  }, []);

  return (
    <>
      <button
        onClick={fetchModels}
        disabled={loading}
        className="mb-4 px-4 py-2 bg-blue-500 text-white rounded"
      >
        {loading ? 'Loading...' : 'Refresh Models'}
      </button>
      <ModelList
        models={models}
        onViewDetails={() => {}}
        onConfigureModel={() => {}}
        onPullModel={() => {}}
        onDeleteModel={() => {}}
      />
    </>
  );
}; 