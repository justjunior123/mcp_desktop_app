'use client';

import dynamic from 'next/dynamic';

// Dynamically import the ModelsPage component with no SSR
const ModelsPage = dynamic(() => import('./models/page'), {
  ssr: false,
  loading: () => (
    <div className="flex justify-center items-center h-64">
      <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500"></div>
    </div>
  ),
});

export default function Home() {
  return (
    <main className="container mx-auto px-4 py-8">
      <h1 className="text-4xl font-bold mb-8">MCP Desktop</h1>
      <p className="text-xl mb-8">Manage your local LLMs and MCP servers</p>
      <ModelsPage />
    </main>
  );
} 