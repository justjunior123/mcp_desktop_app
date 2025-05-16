const API_BASE_URL = process.env.NEXT_PUBLIC_API_BASE_URL || 'http://localhost:3000';
const WS_BASE_URL = process.env.NEXT_PUBLIC_WS_BASE_URL || 'ws://localhost:3000';

type ApiEndpoint = 'models' | 'chat' | 'generate' | 'embeddings';

export const getApiUrl = (endpoint: ApiEndpoint): string => {
  return `${API_BASE_URL}/api/${endpoint}`;
};

export const getWsUrl = (endpoint: string): string => {
  return `${WS_BASE_URL}/${endpoint}`;
}; 