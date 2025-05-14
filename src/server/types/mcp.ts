export interface MCPRequest {
  id: string;
  prompt: string;
  model: string;
  parameters?: {
    temperature?: number;
    maxTokens?: number;
    topP?: number;
    frequencyPenalty?: number;
    presencePenalty?: number;
    stop?: string[];
  };
  metadata?: Record<string, unknown>;
  createdAt: Date;
}

export interface MCPResponse {
  id: string;
  requestId: string;
  content: string;
  model: string;
  usage: {
    promptTokens: number;
    completionTokens: number;
    totalTokens: number;
  };
  metadata?: Record<string, unknown>;
  createdAt: Date;
  completedAt: Date;
}

export interface MCPError {
  id: string;
  requestId: string;
  error: string;
  code: string;
  metadata?: Record<string, unknown>;
  timestamp: Date;
}

export interface MCPModelInfo {
  id: string;
  name: string;
  provider: string;
  type: 'local' | 'remote';
  status: 'available' | 'unavailable' | 'loading';
  capabilities: {
    maxTokens: number;
    supportedFeatures: string[];
  };
  metadata?: {
    quantization?: string;
    contextSize?: number;
    modelSize?: string;
    license?: string;
    [key: string]: unknown;
  };
}

export interface MCPStats {
  requestsTotal: number;
  requestsSuccessful: number;
  requestsFailed: number;
  averageLatency: number;
  tokensGenerated: number;
  activeConnections: number;
  uptime: number;
  memory: {
    used: number;
    total: number;
    free: number;
  };
}

export interface MCPQueueItem {
  request: MCPRequest;
  priority: number;
  status: 'pending' | 'processing' | 'completed' | 'failed';
  assignedModel?: string;
  queuedAt: Date;
  startedAt?: Date;
  completedAt?: Date;
}

export interface MCPServerConfig {
  port: number;
  host: string;
  maxConcurrentRequests: number;
  queueSize: number;
  defaultModel: string;
  models: {
    [key: string]: {
      path: string;
      type: 'local' | 'remote';
      provider: string;
      config: Record<string, unknown>;
    };
  };
  auth: {
    enabled: boolean;
    apiKeys: string[];
  };
  logging: {
    level: 'debug' | 'info' | 'warn' | 'error';
    file?: string;
  };
  monitoring: {
    enabled: boolean;
    interval: number;
    retention: number;
  };
} 