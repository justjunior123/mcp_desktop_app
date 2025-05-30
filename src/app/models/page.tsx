import React from 'react';
import { ModelListClient } from '../../components/models/ModelListClient.tsx';
import { getApiUrl } from '../../config/api.ts';
import type { OllamaModelDetails } from '../../services/ollama/ModelManager.ts';

async function getModels(): Promise<OllamaModelDetails[]> {
  try {
    const res = await fetch(getApiUrl('models'), { 
      cache: 'no-store',
      headers: {
        'Accept': 'application/json'
      }
    });
    if (!res.ok) throw new Error(`Failed to fetch models: ${res.statusText}`);
    const data = await res.json();
    return data.data || [];
  } catch (error) {
    console.error('Error fetching models:', error);
    return [];
  }
}

export default async function ModelsPage() {
  const initialModels = await getModels();

  return (
    <div className="container mx-auto px-4 py-8">
      <h1 className="text-3xl font-bold mb-8">Model Management</h1>
      <div className="bg-white dark:bg-slate-800 rounded-lg shadow-lg">
        <ModelListClient initialModels={initialModels} />
      </div>
    </div>
  );
} 