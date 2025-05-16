import { OllamaModelInfo } from './types';

export interface OllamaModelDetails extends OllamaModelInfo {
  id: string;
  status: 'AVAILABLE' | 'DOWNLOADING' | 'ERROR' | 'NOT_DOWNLOADED';
  downloadProgress?: number;
  error?: string;
  configuration?: {
    temperature?: number;
    topP?: number;
    topK?: number;
    repeatPenalty?: number;
    presencePenalty?: number;
    frequencyPenalty?: number;
    stop?: string[];
    maxTokens?: number;
    systemPrompt?: string;
    contextWindow?: number;
  };
} 