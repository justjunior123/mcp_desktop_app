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

  private transformModelInfo(model: any): OllamaModelInfo {
    return {
      ...model,
      size: BigInt(model.size || 0),
    };
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
    const logPrefix = `[OllamaClient] ${endpoint}`;
    try {
      const reqBody = options.body ? (typeof options.body === 'string' ? options.body : JSON.stringify(options.body)) : undefined;
      const truncatedBody = reqBody && reqBody.length > 500 ? reqBody.slice(0, 500) + '...[truncated]' : reqBody;
      console.log(`${logPrefix} REQUEST:`, {
        method: options.method || 'GET',
        body: truncatedBody
      });

      const response = await fetch(`${this.baseUrl}${endpoint}`, {
        ...options,
        headers: {
          'Content-Type': 'application/json',
          ...options.headers,
        },
      });

      const text = await response.text();
      
      // Log the full response for debugging
      console.log(`${logPrefix} RAW RESPONSE:`, {
        status: response.status,
        statusText: response.statusText,
        headers: Object.fromEntries(response.headers.entries()),
        body: text.length > 1000 ? text.slice(0, 1000) + '...[truncated]' : text
      });

      // Handle empty responses
      if (!text.trim()) {
        if (response.ok) {
          // For successful empty responses (like 204 No Content), return empty object
          return {} as T;
        }
        throw new OllamaError(`Empty response with status ${response.status}`, response.status);
      }

      if (!response.ok) {
        // Try to parse error details if possible
        try {
          const errJson = JSON.parse(text);
          if (errJson && errJson.error) {
            throw new OllamaError(`HTTP error ${response.status}: ${errJson.error}`, response.status);
          }
        } catch (error) {
          // If we can't parse the error as JSON, include the raw text in the error
          const errorMessage = error instanceof Error ? error.message : 'Unknown parse error';
          throw new OllamaError(
            `HTTP error ${response.status}: ${text.length > 100 ? text.slice(0, 100) + '...' : text} (${errorMessage})`,
            response.status
          );
        }
        throw new OllamaError(`HTTP error ${response.status}`, response.status);
      }

      let data: any;
      try {
        data = JSON.parse(text);
      } catch (parseError: unknown) {
        // Log the parse error with more context
        console.error(`${logPrefix} JSON PARSE ERROR:`, {
          error: parseError instanceof Error ? parseError.message : String(parseError),
          responseText: text.length > 1000 ? text.slice(0, 1000) + '...[truncated]' : text,
          endpoint,
          status: response.status
        });
        throw new OllamaError(
          `Invalid JSON response from server (${endpoint}): ${parseError instanceof Error ? parseError.message : String(parseError)}`,
          response.status
        );
      }

      // If the response contains an error field, treat as error
      if (data && typeof data === 'object' && data.error) {
        console.error(`${logPrefix} API ERROR:`, {
          error: data.error,
          endpoint,
          status: response.status
        });
        throw new OllamaError(data.error, response.status);
      }

      return data as T;
    } catch (error) {
      // Enhance error logging with more context
      console.error(`${logPrefix} ERROR:`, {
        error,
        endpoint,
        method: options.method || 'GET',
        requestBody: options.body ? (typeof options.body === 'string' ? options.body : JSON.stringify(options.body)) : undefined
      });
      
      if (error instanceof OllamaError) {
        throw error;
      }
      if (error instanceof Error) {
        throw new OllamaError(`${error.message} (${endpoint})`);
      }
      throw new OllamaError(`Unknown error occurred (${endpoint})`);
    }
  }

  async listModels(): Promise<{ models: OllamaModelInfo[] }> {
    try {
      // Get raw response first to see what we're dealing with
      const response = await fetch(`${this.baseUrl}/api/tags`);
      const text = await response.text();
      console.log('Raw /api/tags response:', text);
      
      const data = JSON.parse(text);
      
      // Transform the response to handle BigInt
      if (Array.isArray(data)) {
        return { models: data.map(this.transformModelInfo) };
      }
      
      if (data && Array.isArray(data.models)) {
        return { models: data.models.map(this.transformModelInfo) };
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
    const response = await fetch(`${this.baseUrl}/api/pull`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ name }),
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
          try {
            const data = JSON.parse(line);
            // Log progress updates
            if (data.status) {
              console.log(`[OllamaClient] Pull progress: ${data.status}`);
            }
            // If we get a final success message, we're done
            if (data.status === 'success') {
              return;
            }
          } catch (parseError) {
            console.warn(`[OllamaClient] Failed to parse pull response line: ${line}`);
          }
        }
      }
    } finally {
      reader.releaseLock();
    }
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