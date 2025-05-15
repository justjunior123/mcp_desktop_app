import axios, { AxiosInstance, AxiosRequestConfig } from 'axios';
import {
  OllamaOptions,
  GenerateRequest, 
  GenerateResponse,
  ChatRequest,
  ChatResponse,
  ListModelsResponse,
  ShowModelRequest,
  ShowModelResponse,
  EmbeddingsRequest,
  EmbeddingsResponse,
  PullModelRequest,
  PullModelResponse
} from './types';

/**
 * Client for interacting with the Ollama API.
 */
export class OllamaClient {
  private http: AxiosInstance;
  private baseUrl: string;
  private defaultTimeout: number;

  /**
   * Creates a new Ollama API client.
   * @param options Configuration options for the client
   */
  constructor(options: OllamaOptions) {
    this.baseUrl = options.baseUrl.replace(/\/+$/, ''); // Remove trailing slashes
    this.defaultTimeout = options.timeoutMs || 30000;

    this.http = axios.create({
      baseURL: this.baseUrl,
      headers: {
        'Content-Type': 'application/json'
      },
      timeout: this.defaultTimeout
    });
  }

  /**
   * Generate a completion from a prompt.
   * @param request The request parameters
   * @returns The completion response
   */
  public async generate(request: GenerateRequest): Promise<GenerateResponse> {
    try {
      // Force stream: false to get a single response
      const data = { ...request, stream: false };
      const response = await this.http.post<GenerateResponse>('/api/generate', data);
      return response.data;
    } catch (error) {
      this.handleError(error, 'Failed to generate completion');
    }
  }

  /**
   * Generate a chat completion from a series of messages.
   * @param request The chat request parameters
   * @returns The chat completion response
   */
  public async chat(request: ChatRequest): Promise<ChatResponse> {
    try {
      // Force stream: false to get a single response
      const data = { ...request, stream: false };
      const response = await this.http.post<ChatResponse>('/api/chat', data);
      return response.data;
    } catch (error) {
      this.handleError(error, 'Failed to generate chat completion');
    }
  }

  /**
   * List all available models.
   * @returns A list of available models
   */
  public async listModels(): Promise<ListModelsResponse> {
    try {
      const response = await this.http.get<ListModelsResponse>('/api/tags');
      return response.data;
    } catch (error) {
      this.handleError(error, 'Failed to list models');
    }
  }

  /**
   * Get detailed information about a specific model.
   * @param request The show model request
   * @returns Detailed information about the model
   */
  public async showModel(request: ShowModelRequest): Promise<ShowModelResponse> {
    try {
      const response = await this.http.post<ShowModelResponse>('/api/show', request);
      return response.data;
    } catch (error) {
      this.handleError(error, 'Failed to get model information');
    }
  }

  /**
   * Generate embeddings for a prompt.
   * @param request The embeddings request
   * @returns The generated embeddings
   */
  public async createEmbeddings(request: EmbeddingsRequest): Promise<EmbeddingsResponse> {
    try {
      const response = await this.http.post<EmbeddingsResponse>('/api/embeddings', request);
      return response.data;
    } catch (error) {
      this.handleError(error, 'Failed to create embeddings');
    }
  }

  /**
   * Pull a model from the Ollama registry.
   * @param request The pull model request
   * @returns The pull model response
   */
  public async pullModel(request: PullModelRequest): Promise<PullModelResponse> {
    try {
      // Force stream: false to get a single response
      const data = { ...request, stream: false };
      
      // Set a longer timeout for model pulling
      const config: AxiosRequestConfig = {
        timeout: 3600000 // 1 hour timeout for model pulling
      };
      
      const response = await this.http.post<PullModelResponse>('/api/pull', data, config);
      return response.data;
    } catch (error) {
      this.handleError(error, 'Failed to pull model');
    }
  }

  /**
   * Gets the base URL of the Ollama API.
   * @returns The base URL
   */
  public getBaseUrl(): string {
    return this.baseUrl;
  }

  /**
   * Handle errors from the Ollama API.
   * @param error The error object
   * @param defaultMessage The default error message
   */
  private handleError(error: any, defaultMessage: string): never {
    // Handle mocked Axios errors in tests
    if (error && error.isAxiosError === true && error.response) {
      const status = error.response.status;
      const message = error.response.data?.error || error.message || 'Unknown error';
      throw new Error(`Ollama API Error (${status}): ${message}`);
    }
    
    // Handle real Axios errors
    if (axios.isAxiosError(error) && error.response) {
      const status = error.response.status;
      const message = error.response.data?.error || error.message || 'Unknown error';
      throw new Error(`Ollama API Error (${status}): ${message}`);
    }
    
    // Handle non-Axios errors or Axios errors without response
    const errorMessage = error instanceof Error ? error.message : String(error);
    throw new Error(`${defaultMessage}: ${errorMessage}`);
  }
}