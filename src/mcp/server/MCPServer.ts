import express from 'express';
import { Server } from 'http';
import { Tool, ToolRequest, ToolResponse, ServerInfo } from '../types/protocol';

export class MCPServer {
  private app: express.Express;
  private httpServer: Server | null = null;
  private port: number;
  private tools: Map<string, { 
    tool: Tool;
    handler: (params: Record<string, unknown>) => Promise<unknown>;
    enabled: boolean;
  }> = new Map();
  private info: ServerInfo;

  constructor(options: { 
    port: number; 
    name: string; 
    version: string;
    capabilities?: {
      tools?: boolean;
      prompts?: boolean;
      resources?: boolean;
    }
  }) {
    this.port = options.port;
    this.app = express();
    this.app.use(express.json());
    
    this.info = {
      name: options.name,
      version: options.version,
      capabilities: {
        tools: true,
        ...options.capabilities
      }
    };

    this.setupRoutes();
  }

  private setupRoutes() {
    // Server info endpoint
    this.app.get('/info', (req, res) => {
      res.json(this.info);
    });

    // List tools endpoint
    this.app.get('/tools', (req, res) => {
      const tools = this.getTools();
      res.json({ tools });
    });

    // Tool invocation endpoint
    this.app.post('/tools/:name', async (req, res) => {
      const toolName = req.params.name;
      const toolRequest: ToolRequest = {
        name: toolName,
        arguments: req.body
      };

      try {
        const result = await this.invokeTool(toolName, toolRequest.arguments);
        const response: ToolResponse = { result };
        res.json(response);
      } catch (error) {
        const statusCode = error instanceof Error && error.message.includes('not found') ? 404 : 400;
        res.status(statusCode).json({ error: error instanceof Error ? error.message : 'Unknown error' });
      }
    });
  }

  public tool(
    name: string, 
    parameters: Tool['parameters'], 
    handler: (params: Record<string, unknown>) => Promise<unknown>
  ) {
    const tool: Tool = {
      name,
      description: `Tool: ${name}`,
      parameters
    };

    const toolInstance = {
      enable: () => this.enableTool(name),
      disable: () => this.disableTool(name),
      remove: () => this.removeTool(name),
      update: (updates: Partial<Tool>) => {
        const existingTool = this.tools.get(name);
        if (existingTool) {
          this.tools.set(name, {
            ...existingTool,
            tool: { ...existingTool.tool, ...updates }
          });
        }
      }
    };

    this.addTool(tool, handler);
    return toolInstance;
  }

  public addTool(tool: Tool, handler: (params: Record<string, unknown>) => Promise<unknown>): void {
    this.tools.set(tool.name, { 
      tool, 
      handler,
      enabled: true
    });
  }

  public enableTool(name: string): void {
    const tool = this.tools.get(name);
    if (tool) {
      tool.enabled = true;
    }
  }

  public disableTool(name: string): void {
    const tool = this.tools.get(name);
    if (tool) {
      tool.enabled = false;
    }
  }

  public removeTool(name: string): void {
    this.tools.delete(name);
  }

  public getTools(): Tool[] {
    return Array.from(this.tools.values())
      .filter(({ enabled }) => enabled)
      .map(({ tool }) => tool);
  }

  public async invokeTool(name: string, params: Record<string, unknown>): Promise<unknown> {
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

  public async start(): Promise<void> {
    return new Promise((resolve, reject) => {
      this.httpServer = this.app.listen(this.port, () => {
        console.log(`MCP Server listening on port ${this.port}`);
        resolve();
      });

      this.httpServer.on('error', reject);
    });
  }

  public async stop(): Promise<void> {
    return new Promise((resolve, reject) => {
      if (this.httpServer) {
        this.httpServer.close((err) => {
          if (err) reject(err);
          else resolve();
        });
      } else {
        resolve();
      }
    });
  }
} 