export interface ServerConfig {
  id: string;
  name: string;
  type: 'llm' | 'mcp';
  status: 'running' | 'stopped' | 'error';
  port: number;
  modelPath?: string;  // For LLM servers
  configPath: string;
  lastStarted?: Date;
  lastError?: string;
  schemaVersion?: number;
}

export interface LLMServerConfig extends ServerConfig {
  type: 'llm';
  modelPath: string;
  modelType: string;
  quantization: string;
  contextSize: number;
  maxTokens: number;
}

export interface MCPServerConfig extends ServerConfig {
  type: 'mcp';
  apiKey?: string;
  maxConcurrentRequests: number;
  timeout: number;
}

export interface ServerStatus {
  id: string;
  status: 'running' | 'stopped' | 'error';
  uptime?: number;
  memory?: {
    used: number;
    total: number;
  };
  activeConnections?: number;
  lastError?: string;
}

export interface ServerManager {
  startServer(id: string): Promise<void>;
  stopServer(id: string): Promise<void>;
  getStatus(id: string): Promise<ServerStatus>;
  updateConfig(id: string, config: Partial<ServerConfig>): Promise<void>;
  listServers(): Promise<ServerConfig[]>;
} 