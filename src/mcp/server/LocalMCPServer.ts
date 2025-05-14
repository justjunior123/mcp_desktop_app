import { MCPServer } from './MCPServer';
import { Tool } from '../types/protocol';

export class LocalMCPServer {
  private server: MCPServer;
  private tools: {
    echo?: ReturnType<MCPServer['tool']>;
    systemInfo?: ReturnType<MCPServer['tool']>;
  } = {};

  constructor(port: number = 3100) {
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
    await this.server.start();
  }

  public async stop(): Promise<void> {
    await this.server.stop();
  }

  public getPort(): number {
    return this.server['port'];
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