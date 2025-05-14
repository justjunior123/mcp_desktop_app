// Mock interfaces for MCP testing based on official SDK
export interface Tool {
  name: string;
  description: string;
  parameters: {
    type: 'object';
    properties: Record<string, {
      type: string;
      description: string;
      required?: boolean;
    }>;
    required: string[];
  };
  returns?: {
    type: 'object';
    properties: Record<string, unknown>;
  };
  permission?: 'read' | 'write' | 'admin';
  enabled?: boolean;
}

export interface ToolParameters {
  [key: string]: unknown;
}

export class MockMCPServer {
  private port: number;
  private tools: Map<string, { 
    tool: Tool; 
    handler: (params: ToolParameters) => Promise<unknown>;
    enabled: boolean;
  }>;
  private isRunning: boolean;

  constructor(options: { port: number }) {
    this.port = options.port;
    this.tools = new Map();
    this.isRunning = false;
  }

  addTool(tool: Tool, handler: (params: ToolParameters) => Promise<unknown>): void {
    this.tools.set(tool.name, { 
      tool, 
      handler,
      enabled: tool.enabled ?? true
    });
  }

  enableTool(name: string): void {
    const tool = this.tools.get(name);
    if (tool) {
      tool.enabled = true;
    }
  }

  disableTool(name: string): void {
    const tool = this.tools.get(name);
    if (tool) {
      tool.enabled = false;
    }
  }

  removeTool(name: string): void {
    this.tools.delete(name);
  }

  async start(): Promise<void> {
    this.isRunning = true;
  }

  async stop(): Promise<void> {
    this.isRunning = false;
  }

  async invokeTool(name: string, params: ToolParameters): Promise<unknown> {
    if (!this.isRunning) {
      throw new Error('Server not running');
    }

    const tool = this.tools.get(name);
    if (!tool) {
      throw new Error(`Tool ${name} not found`);
    }

    if (!tool.enabled) {
      throw new Error(`Tool ${name} is disabled`);
    }

    // Validate required parameters
    for (const required of tool.tool.parameters.required) {
      if (!(required in params)) {
        throw new Error(`Missing required parameter: ${required}`);
      }
    }

    return tool.handler(params);
  }

  getTools(): Tool[] {
    return Array.from(this.tools.values())
      .filter(({ enabled }) => enabled)
      .map(({ tool }) => tool);
  }
}

export class MockMCPClient {
  private serverUrl: string;
  private server?: MockMCPServer;

  constructor(serverUrl: string) {
    this.serverUrl = serverUrl;
  }

  setServer(server: MockMCPServer): void {
    this.server = server;
  }

  async isConnected(): Promise<boolean> {
    return !!this.server;
  }

  async listTools(): Promise<Tool[]> {
    if (!this.server) {
      throw new Error('Not connected to server');
    }
    return this.server.getTools();
  }

  async invoke(toolName: string, params: ToolParameters): Promise<unknown> {
    if (!this.server) {
      throw new Error('Not connected to server');
    }
    return this.server.invokeTool(toolName, params);
  }
} 