import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { StreamableHTTPServerTransport } from "@modelcontextprotocol/sdk/server/streamableHttp.js";
import { Request, Response } from 'express';
import { SessionManager } from './session-manager';
import { OllamaModelManager } from '../ollama/model-manager';
import { OllamaClient } from '../ollama/client';
import { z } from 'zod';

export class McpService {
  private server: McpServer;
  private sessionManager: SessionManager;
  private modelManager: OllamaModelManager;
  
  constructor(modelManager: OllamaModelManager) {
    this.server = new McpServer({
      name: "mcp-desktop-app",
      version: "1.0.0"
    });
    this.sessionManager = new SessionManager();
    this.modelManager = modelManager;
    this.setupHandlers();
  }

  private setupHandlers() {
    // Model handlers
    this.server.tool('listModels', {
      title: 'List Models',
      description: 'List all available models'
    }, async (args, extra) => {
      const models = await this.modelManager.listModels();
      return {
        content: [{
          type: 'text',
          text: JSON.stringify(models)
        }]
      };
    });

    this.server.tool('getModel', {
      title: 'Get Model',
      description: 'Get details for a specific model',
      params: z.object({
        name: z.string()
      })
    }, async (args, extra) => {
      const model = await this.modelManager.getModel(args.name);
      return {
        content: [{
          type: 'text',
          text: JSON.stringify(model)
        }]
      };
    });

    // Tool handlers
    this.server.tool('listTools', {
      title: 'List Tools',
      description: 'List all available tools'
    }, async (args, extra) => {
      return {
        content: [{
          type: 'text',
          text: JSON.stringify({ tools: [] })
        }]
      };
    });

    // Prompt handlers
    this.server.tool('listPrompts', {
      title: 'List Prompts',
      description: 'List all available prompts'
    }, async (args, extra) => {
      return {
        content: [{
          type: 'text',
          text: JSON.stringify({ prompts: [] })
        }]
      };
    });
  }

  public async handleRequest(req: Request, res: Response) {
    const sessionId = this.sessionManager.createSession();
    
    const transport = new StreamableHTTPServerTransport({
      sessionIdGenerator: () => sessionId,
      enableJsonResponse: true,
      onsessioninitialized: (sid: string) => {
        this.sessionManager.initializeSession(sid);
      }
    });

    try {
      await this.server.connect(transport);
      await transport.handleRequest(req, res, req.body);
    } catch (error) {
      this.handleError(error, res);
    }
  }

  private handleError(error: unknown, res: Response) {
    console.error('MCP Error:', error);
    res.status(500).json({
      error: {
        code: 'INTERNAL_ERROR',
        message: error instanceof Error ? error.message : 'An unexpected error occurred'
      }
    });
  }
} 