const API_BASE_URL = process.env.NEXT_PUBLIC_API_BASE_URL || 'http://localhost:3100';
const WS_BASE_URL = process.env.NEXT_PUBLIC_WS_BASE_URL || 'ws://localhost:3100';

type ApiEndpoint = 'models' | 'chat' | 'generate' | 'embeddings';

export const getApiUrl = (endpoint: ApiEndpoint): string => {
  return `${API_BASE_URL}/api/ollama/${endpoint}`;
};

export const getWsUrl = (endpoint: string): string => {
  return `${WS_BASE_URL}/${endpoint}`;
}; 