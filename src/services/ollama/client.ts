import {
  OllamaModelInfo,
  OllamaGenerateRequest,
  OllamaGenerateResponse,
  OllamaChatRequest,
  OllamaChatResponse,
  OllamaEmbeddingRequest,
  OllamaEmbeddingResponse,
} from './types';

export class OllamaError extends Error {
  constructor(message: string, public statusCode?: number) {
    super(message);
    this.name = 'OllamaError';
  }
}

export class OllamaClient {
  private baseUrl: string;

  constructor(baseUrl: string = process.env.OLLAMA_HOST || 'http://127.0.0.1:11434') {
    // Ensure baseUrl has http:// prefix and no trailing slash
    this.baseUrl = baseUrl.startsWith('http://') ? baseUrl : `http://${baseUrl}`;
    this.baseUrl = this.baseUrl.endsWith('/') ? this.baseUrl.slice(0, -1) : this.baseUrl;
    
    // Force IPv4
    this.baseUrl = this.baseUrl.replace('localhost', '127.0.0.1');
    
    // Log the configured URL in debug mode
    if (process.env.OLLAMA_DEBUG) {
      console.log('Ollama client initialized with URL:', this.baseUrl);
    }
  }

  async healthCheck(): Promise<boolean> {
    try {
      const response = await fetch(`${this.baseUrl}/api/tags`);
      if (!response.ok) {
        console.error('Ollama health check failed with status:', response.status);
        return false;
      }
      return true;
    } catch (error) {
      console.error('Ollama health check failed:', error);
      return false;
    }
  }

  private async request<T>(endpoint: string, options: RequestInit = {}): Promise<T> {
    try {
      const response = await fetch(`${this.baseUrl}${endpoint}`, {
        ...options,
        headers: {
          'Content-Type': 'application/json',
          ...options.headers,
        },
      });

      if (!response.ok) {
        throw new OllamaError(`HTTP error ${response.status}`, response.status);
      }

      const text = await response.text();
      console.log('Raw API response:', text); // Debug logging
      
      try {
        return JSON.parse(text) as T;
      } catch (parseError) {
        console.error('Error parsing JSON response:', text);
        throw new OllamaError('Invalid JSON response from server');
      }
    } catch (error) {
      if (error instanceof OllamaError) {
        throw error;
      }
      if (error instanceof Error) {
        throw new OllamaError(error.message);
      }
      throw new OllamaError('Unknown error occurred');
    }
  }

  async listModels(): Promise<{ models: OllamaModelInfo[] }> {
    try {
      // Get raw response first to see what we're dealing with
      const response = await fetch(`${this.baseUrl}/api/tags`);
      const text = await response.text();
      console.log('Raw /api/tags response:', text);
      
      const data = JSON.parse(text);
      
      // The Ollama API returns an array directly, so we need to wrap it
      if (Array.isArray(data)) {
        return { models: data };
      }
      
      // If it's already in the expected format, return as is
      if (data && Array.isArray(data.models)) {
        return data;
      }
      
      throw new OllamaError('Invalid response format from /api/tags');
    } catch (error) {
      console.error('Error in listModels:', error);
      throw error instanceof OllamaError ? error : new OllamaError('Failed to list models');
    }
  }

  async getModel(name: string): Promise<OllamaModelInfo> {
    return this.request(`/api/show`, {
      method: 'POST',
      body: JSON.stringify({ name }),
    });
  }

  async pullModel(name: string): Promise<void> {
    await this.request('/api/pull', {
      method: 'POST',
      body: JSON.stringify({ name }),
    });
  }

  async generate(request: OllamaGenerateRequest): Promise<OllamaGenerateResponse> {
    return this.request('/api/generate', {
      method: 'POST',
      body: JSON.stringify(request),
    });
  }

  async *generateStream(request: OllamaGenerateRequest): AsyncGenerator<OllamaGenerateResponse> {
    const response = await fetch(`${this.baseUrl}/api/generate`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ ...request, stream: true }),
    });

    if (!response.ok) {
      throw new OllamaError(`HTTP error ${response.status}`, response.status);
    }

    if (!response.body) {
      throw new OllamaError('No response body');
    }

    const reader = response.body.getReader();
    const decoder = new TextDecoder();

    try {
      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        const chunk = decoder.decode(value);
        const lines = chunk.split('\n').filter(Boolean);

        for (const line of lines) {
          yield JSON.parse(line) as OllamaGenerateResponse;
        }
      }
    } finally {
      reader.releaseLock();
    }
  }

  async chat(request: OllamaChatRequest): Promise<OllamaChatResponse> {
    return this.request('/api/chat', {
      method: 'POST',
      body: JSON.stringify(request),
    });
  }

  async *chatStream(request: OllamaChatRequest): AsyncGenerator<OllamaChatResponse> {
    const response = await fetch(`${this.baseUrl}/api/chat`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ ...request, stream: true }),
    });

    if (!response.ok) {
      throw new OllamaError(`HTTP error ${response.status}`, response.status);
    }

    if (!response.body) {
      throw new OllamaError('No response body');
    }

    const reader = response.body.getReader();
    const decoder = new TextDecoder();

    try {
      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        const chunk = decoder.decode(value);
        const lines = chunk.split('\n').filter(Boolean);

        for (const line of lines) {
          yield JSON.parse(line) as OllamaChatResponse;
        }
      }
    } finally {
      reader.releaseLock();
    }
  }

  async embeddings(request: OllamaEmbeddingRequest): Promise<OllamaEmbeddingResponse> {
    return this.request('/api/embeddings', {
      method: 'POST',
      body: JSON.stringify(request),
    });
  }
} 