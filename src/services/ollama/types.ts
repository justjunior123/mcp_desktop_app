/**
 * Types for the Ollama API client
 */

export interface OllamaOptions {
  baseUrl: string;
  timeoutMs?: number;
}

/**
 * Common response metrics returned by Ollama API
 */
export interface OllamaMetrics {
  total_duration?: number;
  load_duration?: number;
  prompt_eval_count?: number;
  prompt_eval_duration?: number;
  eval_count?: number;
  eval_duration?: number;
}

/**
 * Generate API
 */
export interface GenerateRequest {
  model: string;
  prompt: string;
  system?: string;
  template?: string;
  context?: number[];
  stream?: boolean;
  raw?: boolean;
  format?: 'json';
  options?: ModelOptions;
}

export interface GenerateResponse extends OllamaMetrics {
  model: string;
  created_at: string;
  response: string;
  done: boolean;
  context?: number[];
  done_reason?: 'stop' | 'length' | 'error';
}

/**
 * Chat API
 */
export interface ChatMessage {
  role: 'system' | 'user' | 'assistant';
  content: string;
  images?: string[]; // base64 encoded images
}

export interface ChatRequest {
  model: string;
  messages: ChatMessage[];
  stream?: boolean;
  format?: 'json';
  options?: ModelOptions;
}

export interface ChatResponse extends OllamaMetrics {
  model: string;
  created_at: string;
  message: ChatMessage;
  done: boolean;
  done_reason?: 'stop' | 'length' | 'error';
}

/**
 * Model Options
 */
export interface ModelOptions {
  mirostat?: number;       // Enable Mirostat sampling for controlling perplexity
  mirostat_eta?: number;   // Learning rate for Mirostat
  mirostat_tau?: number;   // Controls the balance between coherence and diversity
  num_ctx?: number;        // Sets the size of the context window for the model
  num_predict?: number;    // Maximum number of tokens to predict
  seed?: number;           // Random seed for consistent sampling
  temperature?: number;    // Controls randomness (0.0 = deterministic, 1.0 = more random)
  repeat_penalty?: number; // Penalty for repeated tokens
  repeat_last_n?: number;  // How far back to look for repetitions
  top_k?: number;          // Sample from top K options
  top_p?: number;          // Sample from top P options by probability mass
}

/**
 * List Models API
 */
export interface ListModelsResponse {
  models: ModelInfo[];
}

export interface ModelInfo {
  name: string;
  model: string;
  modified_at: string;
  size: number;
  digest: string;
  details: ModelDetails;
}

export interface ModelDetails {
  parent_model?: string;
  format?: string;
  family?: string;
  families?: string[];
  parameter_size?: string;
  quantization_level?: string;
}

/**
 * Show Model API
 */
export interface ShowModelRequest {
  model: string;
  verbose?: boolean;
}

export interface ShowModelResponse {
  license?: string;
  modelfile?: string;
  parameters?: string;
  template?: string;
  system?: string;
  details?: ModelDetails;
  model_info?: Record<string, any>; // varies based on model
  modified_at?: string;
}

/**
 * Embeddings API
 */
export interface EmbeddingsRequest {
  model: string;
  prompt: string;
  options?: ModelOptions;
}

export interface EmbeddingsResponse {
  embedding: number[];
}

/**
 * Pull Model API
 */
export interface PullModelRequest {
  model: string;
  stream?: boolean;
}

export interface PullModelResponse {
  status: string;
  digest?: string;
  total?: number;
  completed?: number;
} 