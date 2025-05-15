import { MCPServer } from './MCPServer';
import { OllamaBridge } from '../../services/ollama/OllamaBridge';
import { OllamaService } from '../../services/ollama/OllamaService';
import { logger } from '../../services/logging';

export class LocalMCPServer {
  private server: MCPServer;
  private tools: {
    echo?: ReturnType<MCPServer['tool']>;
    systemInfo?: ReturnType<MCPServer['tool']>;
  } = {};
  private isRunning: boolean = false;
  private port: number;
  private ollamaService?: OllamaService;
  private ollamaBridge?: OllamaBridge;

  constructor(port: number = 3100, ollamaBaseUrl: string = 'http://localhost:11434') {
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

    // Initialize Ollama service
    this.ollamaService = new OllamaService(ollamaBaseUrl);
    this.ollamaBridge = new OllamaBridge(this.server, this.ollamaService);

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
      // Start the server first
      await this.server.start();
      this.isRunning = true;
      
      // Register Ollama tools if available
      if (this.ollamaBridge) {
        try {
          await this.ollamaBridge.registerTools();
        } catch (error) {
          logger.warn('Failed to register Ollama tools but server is running', { error });
        }
      }
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
      // Clean up Ollama tools first
      if (this.ollamaBridge) {
        try {
          this.ollamaBridge.cleanup();
        } catch (error) {
          logger.warn('Error cleaning up Ollama tools', { error });
        }
      }
      
      // Stop the server
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
      logger.error(`Error during cleanup of server on port ${this.port}:`, { error });
    }
  }

  /**
   * Update Ollama tools when models change
   * This should be called when models are added or removed
   */
  public async updateOllamaTools(): Promise<void> {
    if (!this.isRunning || !this.ollamaBridge) {
      return;
    }
    
    try {
      await this.ollamaBridge.updateTools();
    } catch (error) {
      logger.error('Failed to update Ollama tools', { error });
      throw error;
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

  public getOllamaService(): OllamaService | undefined {
    return this.ollamaService;
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