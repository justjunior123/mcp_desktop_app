import {
  OllamaModelInfo,
  OllamaGenerateRequest,
  OllamaGenerateResponse,
  OllamaChatRequest,
  OllamaChatResponse,
  OllamaEmbeddingRequest,
  OllamaEmbeddingResponse,
} from './types';
import fetch from 'node-fetch';
import { Readable } from 'stream';
import path from 'path';
import fs from 'fs';

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

      // Create headers as a plain object
      const headers: Record<string, string> = {
        'Content-Type': 'application/json',
      };

      // Merge any additional headers
      if (options.headers) {
        if (options.headers instanceof Headers) {
          options.headers.forEach((value, key) => {
            headers[key] = value;
          });
        } else if (typeof options.headers === 'object') {
          Object.assign(headers, options.headers);
        }
      }

      const response = await fetch(`${this.baseUrl}${endpoint}`, {
        ...options,
        headers,
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
      const data = await this.request<{ models: any[] }>('/api/tags');
      
      if (!data || !Array.isArray(data.models)) {
        throw new OllamaError('Invalid response format from /api/tags');
      }
      
      return {
        models: data.models.map(model => ({
          name: model.name,
          size: BigInt(model.size || 0),
          digest: model.digest || '',
          format: model.format || 'gguf',
          family: model.family || 'unknown',
          parameters: {
            architecture: model.architecture || 'llama',
            parameter_size: model.parameter_size || '7.2B',
            context_length: model.context_length || 32768,
            embedding_length: model.embedding_length || 4096,
            quantization: model.quantization || 'Q4_0',
            capabilities: model.capabilities || ['completion', 'tools'],
            stop_sequences: model.stop || ['[INST]', '[/INST]'],
            families: model.families || [],
            quantization_level: model.quantization_level || undefined,
            parent_model: model.parent_model || '',
            format: model.format || 'gguf',
            family: model.family || 'unknown',
            license: model.license || 'Apache License Version 2.0, January 2004'
          }
        }))
      };
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

    const text = await response.text();
    const lines = text.split('\n').filter(Boolean);

    let success = false;
    let error = null;

    for (const line of lines) {
      try {
        const data = JSON.parse(line);
        // Log progress updates
        if (data.status) {
          console.log(`[OllamaClient] Pull progress: ${data.status}`);
          if (data.status === 'success') {
            success = true;
          }
        }
        // Check for errors
        if (data.error) {
          error = data.error;
        }
      } catch (parseError) {
        console.warn(`[OllamaClient] Failed to parse pull response line: ${line}`);
      }
    }

    if (error) {
      throw new OllamaError(`Model pull failed: ${error}`);
    }

    if (!success) {
      throw new OllamaError('Model pull did not complete successfully');
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
    const response = await fetch(`${this.baseUrl}/api/chat`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(request),
    });

    if (!response.ok) {
      throw new OllamaError(`HTTP error ${response.status}`, response.status);
    }

    const text = await response.text();
    const lines = text.split('\n').filter(Boolean);
    let lastResponse: OllamaChatResponse | null = null;

    for (const line of lines) {
      try {
        const data = JSON.parse(line);
        if (data.done) {
          lastResponse = data;
        }
      } catch (parseError) {
        console.warn(`[OllamaClient] Failed to parse chat response line: ${line}`);
      }
    }

    if (!lastResponse) {
      throw new OllamaError('No valid response received from chat endpoint');
    }

    return lastResponse;
  }

  async *chatStream(request: OllamaChatRequest): AsyncGenerator<OllamaChatResponse> {
    const logFile = path.join(process.cwd(), 'logs', 'ollama-client.log');
    const logMessage = (message: string, meta?: any) => {
      const logEntry = {
        timestamp: new Date().toISOString(),
        message,
        ...(meta ? { meta } : {})
      };
      fs.appendFileSync(logFile, JSON.stringify(logEntry) + '\n');
    };

    logMessage('Starting chat stream request', {
      model: request.model,
      messageCount: request.messages.length,
      stream: true
    });

    const response = await fetch(`${this.baseUrl}/api/chat`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ ...request, stream: true }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      logMessage('Chat stream request failed', {
        status: response.status,
        statusText: response.statusText,
        error: errorText,
        headers: Object.fromEntries(response.headers.entries())
      });
      throw new OllamaError(`HTTP error ${response.status}: ${errorText}`, response.status);
    }

    if (!response.body) {
      logMessage('No response body received');
      throw new OllamaError('No response body');
    }

    // Cast to unknown first to avoid TypeScript errors
    const stream = response.body as unknown as ReadableStream<Uint8Array>;
    const reader = stream.getReader();
    const decoder = new TextDecoder();
    let buffer = '';
    let chunkCount = 0;

    try {
      while (true) {
        const { done, value } = await reader.read();
        if (done) {
          logMessage('Stream reading completed', { totalChunks: chunkCount });
          break;
        }

        buffer += decoder.decode(value, { stream: true });
        const lines = buffer.split('\n');
        buffer = lines.pop() || '';

        for (const line of lines) {
          if (!line.trim()) continue;
          try {
            const data = JSON.parse(line);
            chunkCount++;
            logMessage('Processing chunk', {
              chunkNumber: chunkCount,
              done: data.done,
              contentLength: data.message?.content?.length
            });

            if (data.error) {
              logMessage('Error in chunk', { error: data.error });
              throw new OllamaError(data.error);
            }
            yield data;
          } catch (parseError) {
            logMessage('Failed to parse chunk', {
              error: parseError instanceof Error ? parseError.message : String(parseError),
              line
            });
          }
        }
      }
    } catch (error) {
      logMessage('Error during stream processing', {
        error: error instanceof Error ? error.message : String(error),
        stack: error instanceof Error ? error.stack : undefined,
        chunkCount
      });
      throw error;
    } finally {
      reader.releaseLock();
      logMessage('Stream processing completed', { totalChunks: chunkCount });
    }
  }

  async embeddings(request: OllamaEmbeddingRequest): Promise<OllamaEmbeddingResponse> {
    return this.request('/api/embeddings', {
      method: 'POST',
      body: JSON.stringify(request),
    });
  }
} 