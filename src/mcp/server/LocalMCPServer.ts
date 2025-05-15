import { MCPServer } from './MCPServer';
import { Tool } from '../types/protocol';

export class LocalMCPServer {
  private server: MCPServer;
  private tools: {
    echo?: ReturnType<MCPServer['tool']>;
    systemInfo?: ReturnType<MCPServer['tool']>;
  } = {};
  private isRunning: boolean = false;
  private port: number;

  constructor(port: number = 3100) {
    this.port = port;
    this.server = new MCPServer({
      port,
      name: "mcp-desktop-local",
      version: "1.0.0",
      capabilities: {
        tools: true,
        prompts: false,
        resources: false
      }
    });

    // Setup basic tools
    this.registerDefaultTools();
  }

  private registerDefaultTools() {
    // Echo tool for testing
    this.tools.echo = this.server.tool(
      "echo",
      {
        type: "object",
        properties: {
          message: {
            type: "string",
            description: "Message to echo back"
          }
        },
        required: ["message"]
      },
      async (params) => {
        const { message } = params as { message: string };
        return { message };
      }
    );

    // System info tool
    this.tools.systemInfo = this.server.tool(
      "systemInfo",
      {
        type: "object",
        properties: {},
        required: []
      },
      async () => {
        return {
          platform: process.platform,
          arch: process.arch,
          version: process.version,
          memory: process.memoryUsage()
        };
      }
    );
  }

  public async start(): Promise<void> {
    if (this.isRunning) {
      return;
    }
    
    try {
      await this.server.start();
      this.isRunning = true;
    } catch (error) {
      this.isRunning = false;
      throw error;
    }
  }

  public async stop(): Promise<void> {
    if (!this.isRunning) {
      return;
    }

    try {
      await this.server.stop();
    } finally {
      this.isRunning = false;
    }
  }

  public async cleanup(): Promise<void> {
    try {
      if (this.isRunning) {
        await this.stop();
      }
      // Cleanup tools
      Object.keys(this.tools).forEach(toolName => {
        this.removeTool(toolName);
      });
      this.tools = {};
    } catch (error) {
      console.error(`Error during cleanup of server on port ${this.port}:`, error);
    }
  }

  public getPort(): number {
    return this.port;
  }

  public isServerRunning(): boolean {
    return this.isRunning;
  }

  public getServer(): MCPServer {
    return this.server;
  }

  // Tool management methods
  public enableTool(name: string): void {
    const tool = this.tools[name as keyof typeof this.tools];
    if (tool) {
      tool.enable();
    }
  }

  public disableTool(name: string): void {
    const tool = this.tools[name as keyof typeof this.tools];
    if (tool) {
      tool.disable();
    }
  }

  public removeTool(name: string): void {
    const tool = this.tools[name as keyof typeof this.tools];
    if (tool) {
      tool.remove();
      delete this.tools[name as keyof typeof this.tools];
    }
  }
} 