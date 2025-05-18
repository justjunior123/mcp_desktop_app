import React from 'react';
import { ModelListClient } from '../components/models/ModelListClient.tsx';
import { getApiUrl } from '../config/api.ts';
import type { OllamaModelDetails } from '../services/ollama/ModelManager.ts';

interface ModelsPageProps {
  initialModels: OllamaModelDetails[];
}

export async function getServerSideProps() {
  const res = await fetch(getApiUrl('models'));
  if (!res.ok) return { notFound: true };
  const data: { models: OllamaModelDetails[] } = await res.json();
  return { props: { initialModels: data.models } };
}

export default function ModelsPage({ initialModels }: ModelsPageProps) {
  return (
    <div className="container mx-auto px-4 py-8">
      <h1 className="text-3xl font-bold mb-8">Model Management</h1>
      <ModelListClient initialModels={initialModels} />
    </div>
  );
} 