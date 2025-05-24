import {
  OllamaModelInfo,
  OllamaGenerateRequest,
  OllamaGenerateResponse,
  OllamaChatRequest,
  OllamaChatResponse,
  OllamaEmbeddingRequest,
  OllamaEmbeddingResponse,
} from './types';
import fetch, { RequestInit, Response } from 'node-fetch';
import { Readable } from 'stream';
import path from 'path';
import fs from 'fs';
import { OllamaError } from './errors';

export class OllamaClient {
  private baseUrl: string;
  private maxRetries: number;
  private retryDelay: number;

  constructor(baseUrl: string = 'http://localhost:11434', maxRetries: number = 3, retryDelay: number = 1000) {
    this.baseUrl = baseUrl;
    this.maxRetries = maxRetries;
    this.retryDelay = retryDelay;
  }

  private transformModelInfo(model: any): OllamaModelInfo {
    return {
      ...model,
      size: BigInt(model.size || 0),
    };
  }

  private async request<T>(endpoint: string, options: RequestInit = {}): Promise<T> {
    let lastError: Error | null = null;
    
    for (let attempt = 0; attempt < this.maxRetries; attempt++) {
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

        const data = await response.json();
        return data as T;
      } catch (error) {
        lastError = error instanceof Error ? error : new Error(String(error));
        if (attempt < this.maxRetries - 1) {
          await new Promise(resolve => setTimeout(resolve, this.retryDelay));
        }
      }
    }

    throw lastError || new Error('Request failed after all retries');
  }

  async healthCheck(): Promise<boolean> {
    try {
      await this.request('/api/version');
      return true;
    } catch (error) {
      return false;
    }
  }

  async getModel(name: string): Promise<OllamaModelInfo> {
    const response = await this.request<any>('/api/show', {
      method: 'POST',
      body: JSON.stringify({ name })
    });

    return {
      name,
      digest: response.digest || '',
      size: BigInt(response.size || 0),
      details: {
        format: response.format || 'gguf',
        family: response.family || 'llama',
        parameter_size: response.model_info?.['parameter_size'] || '7B',
        quantization_level: response.model_info?.['general.quantization_version'] ? `Q${response.model_info['general.quantization_version']}` : 'Q4_0'
      }
    };
  }

  async listModels(): Promise<OllamaModelInfo[]> {
    const response = await this.request<{ models: any[] }>('/api/tags');
    if (!response.models) {
      throw new OllamaError('Invalid response from Ollama API');
    }
    return response.models.map(this.transformModelInfo);
  }

  async *pullModelStream(name: string): AsyncGenerator<{ status?: string; digest?: string }> {
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
      throw new OllamaError('No response body received');
    }

    const reader = response.body as unknown as Readable;
    for await (const chunk of reader) {
      try {
        const data = JSON.parse(chunk.toString());
        if (data.error) {
          throw new OllamaError(data.error);
        }
        yield data;
      } catch (parseError) {
        // Ignore parse errors for partial chunks
      }
    }
  }

  async pullModel(name: string, onProgress?: (status: string, progress?: number) => void): Promise<OllamaModelInfo> {
    for await (const chunk of this.pullModelStream(name)) {
      if (chunk.status) {
        onProgress?.(chunk.status, undefined);
      }
    }
    return this.getModel(name);
  }

  async deleteModel(name: string): Promise<void> {
    const response = await fetch(`${this.baseUrl}/api/delete`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ name }),
    });

    if (!response.ok) {
      throw new OllamaError(`HTTP error ${response.status}`, response.status);
    }

    // Wait for the response to complete
    await response.text();
  }

  async generate(request: OllamaGenerateRequest): Promise<OllamaGenerateResponse> {
    return this.request<OllamaGenerateResponse>('/api/generate', {
      method: 'POST',
      body: JSON.stringify(request),
    });
  }

  async chat(request: OllamaChatRequest): Promise<OllamaChatResponse> {
    const { model, messages, options } = request;
    const response = await fetch(`${this.baseUrl}/api/chat`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ model, messages, options }),
    });

    if (!response.ok) {
      throw new OllamaError(`HTTP error ${response.status}`, response.status);
    }

    if (!response.body) {
      throw new OllamaError('No response body received');
    }

    // Read the response as a text stream
    const reader = response.body as unknown as Readable;
    let content = '';
    let lastChunk: any = null;
    
    return new Promise((resolve, reject) => {
      reader.on('data', (chunk: Buffer) => {
        try {
          const data = JSON.parse(chunk.toString());
          if (data.message?.content) {
            content += data.message.content;
          }
          lastChunk = data;
        } catch (error) {
          // Ignore parse errors for partial chunks
        }
      });

      reader.on('end', () => {
        try {
          if (!lastChunk) {
            throw new Error('No response received');
          }
          // Return the final response with accumulated content
          resolve({
            ...lastChunk,
            message: {
              ...lastChunk.message,
              content
            }
          });
        } catch (error) {
          reject(new OllamaError(`Failed to parse chat response: ${error instanceof Error ? error.message : String(error)}`));
        }
      });

      reader.on('error', (error) => {
        reject(new OllamaError(`Stream error: ${error.message}`));
      });
    });
  }

  async *chatStream(request: OllamaChatRequest): AsyncGenerator<OllamaChatResponse> {
    const { model, messages, options } = request;
    const response = await fetch(
      `${this.baseUrl}/api/chat`,
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ model, messages, options, stream: true }),
      }
    );

    if (!response.ok) {
      const error = await response.json().catch(() => ({ error: 'Unknown error' }));
      throw new OllamaError(error.error || 'Failed to start chat stream', response.status);
    }

    if (!response.body) {
      throw new OllamaError('Response body is null', 500);
    }

    const reader = (response.body as unknown as Readable);
    const decoder = new TextDecoder();
    let buffer = '';

    try {
      for await (const chunk of reader) {
        buffer += decoder.decode(chunk, { stream: true });
        const lines = buffer.split('\n');
        buffer = lines.pop() || '';

        for (const line of lines) {
          if (line.trim()) {
            try {
              const chunk = JSON.parse(line) as OllamaChatResponse;
              yield chunk;
            } catch (e) {
              console.warn('Failed to parse chunk:', line);
            }
          }
        }
      }
    } finally {
      reader.destroy?.();
    }
  }

  async embeddings(request: OllamaEmbeddingRequest): Promise<OllamaEmbeddingResponse> {
    return this.request<OllamaEmbeddingResponse>('/api/embeddings', {
      method: 'POST',
      body: JSON.stringify(request),
    });
  }
}