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

  constructor(baseUrl: string = 'http://localhost:11434') {
    this.baseUrl = baseUrl;
  }

  private async request<T>(endpoint: string, options: RequestInit = {}): Promise<T> {
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

    return response.json() as Promise<T>;
  }

  async listModels(): Promise<{ models: OllamaModelInfo[] }> {
    return this.request('/api/tags');
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