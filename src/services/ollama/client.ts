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
      await this.request('/api/tags');
      return true;
    } catch (error) {
      return false;
    }
  }

  async getModel(name: string): Promise<OllamaModelInfo> {
    return this.request<OllamaModelInfo>(`/api/tags/${name}`);
  }

  async listModels(): Promise<OllamaModelInfo[]> {
    const response = await this.request<{ models: OllamaModelInfo[] }>('/api/tags');
    return response.models;
  }

  async pullModel(name: string): Promise<OllamaModelInfo> {
    return this.request<OllamaModelInfo>('/api/pull', {
      method: 'POST',
      body: JSON.stringify({ name }),
    });
  }

  async deleteModel(name: string): Promise<void> {
    await this.request(`/api/delete`, {
      method: 'DELETE',
      body: JSON.stringify({ name }),
    });
  }

  async generate(request: OllamaGenerateRequest): Promise<OllamaGenerateResponse> {
    return this.request<OllamaGenerateResponse>('/api/generate', {
      method: 'POST',
      body: JSON.stringify(request),
    });
  }

  async chat(request: OllamaChatRequest): Promise<OllamaChatResponse> {
    return this.request<OllamaChatResponse>('/api/chat', {
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
      throw new OllamaError('No response body received');
    }

    const reader = (response.body as unknown as ReadableStream<Uint8Array>).getReader();
    const decoder = new TextDecoder();
    let buffer = '';

    try {
      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        buffer += decoder.decode(value, { stream: true });
        const lines = buffer.split('\n');
        buffer = lines.pop() || '';

        for (const line of lines) {
          if (!line.trim()) continue;
          try {
            const data = JSON.parse(line) as OllamaChatResponse;
            if ('error' in data) {
              throw new OllamaError(data.error as string);
            }
            yield data;
          } catch (parseError) {
            console.warn(`[OllamaClient] Failed to parse chat response line: ${line}`);
          }
        }
      }
    } finally {
      reader.releaseLock();
    }
  }

  async embeddings(request: OllamaEmbeddingRequest): Promise<OllamaEmbeddingResponse> {
    return this.request<OllamaEmbeddingResponse>('/api/embeddings', {
      method: 'POST',
      body: JSON.stringify(request),
    });
  }
} 