export interface OllamaModelInfo {
  name: string;
  size: number;
  digest: string;
  format: string;
  family: string;
  parameters?: {
    context_length: number;
    gpu_layers: number;
    [key: string]: any;
  };
}

export interface OllamaGenerateRequest {
  model: string;
  prompt: string;
  system?: string;
  template?: string;
  context?: number[];
  options?: {
    temperature?: number;
    top_p?: number;
    top_k?: number;
    num_predict?: number;
    stop?: string[];
    repeat_penalty?: number;
    presence_penalty?: number;
    frequency_penalty?: number;
    tfs_z?: number;
    mirostat?: number;
    mirostat_tau?: number;
    mirostat_eta?: number;
    seed?: number;
  };
}

export interface OllamaGenerateResponse {
  model: string;
  created_at: string;
  response: string;
  done: boolean;
  context?: number[];
  total_duration?: number;
  load_duration?: number;
  prompt_eval_duration?: number;
  eval_duration?: number;
}

export interface OllamaChatMessage {
  role: 'system' | 'user' | 'assistant';
  content: string;
}

export interface OllamaChatRequest {
  model: string;
  messages: OllamaChatMessage[];
  stream?: boolean;
  options?: OllamaGenerateRequest['options'];
}

export interface OllamaChatResponse {
  model: string;
  message: OllamaChatMessage;
  done: boolean;
  total_duration?: number;
  load_duration?: number;
  prompt_eval_duration?: number;
  eval_duration?: number;
}

export interface OllamaEmbeddingRequest {
  model: string;
  prompt: string;
  options?: OllamaGenerateRequest['options'];
}

export interface OllamaEmbeddingResponse {
  embedding: number[];
} 