import { ModelListClient } from '../../components/models/ModelListClient.tsx';
import { getApiUrl } from '../../config/api.ts';
import type { OllamaModelDetails } from '../../services/ollama/ModelManager.ts';

async function getModels() {
  const res = await fetch(getApiUrl('models'), { cache: 'no-store' });
  if (!res.ok) throw new Error(res.statusText);
  const data: { models: OllamaModelDetails[] } = await res.json();
  return data.models;
}

export default async function ModelsPage() {
  const initialModels = await getModels();

  return (
    <div className="container mx-auto px-4 py-8">
      <h1 className="text-3xl font-bold mb-8">Model Management</h1>
      <ModelListClient initialModels={initialModels} />
    </div>
  );
} 