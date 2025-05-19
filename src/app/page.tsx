import ModelsPage from './models/page.tsx';

export default async function Home() {
  return (
    <main className="container mx-auto px-4 py-8">
      <h1 className="text-4xl font-bold mb-8">MCP Desktop</h1>
      <p className="text-xl mb-8">Manage your local LLMs and MCP servers</p>
      {/* @ts-expect-error Async Server Component */}
      <ModelsPage />
    </main>
  );
} 