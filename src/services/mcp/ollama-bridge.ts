import { McpServer, StreamableHTTPServerTransport } from '@modelcontextprotocol/sdk';
import { OllamaClient } from '../ollama/client';
import { 
  OllamaModelInfo, 
  OllamaChatMessage,
  OllamaGenerateRequest,
  OllamaChatRequest 
} from '../ollama/types';
import express from 'express';
import { randomUUID } from 'crypto';
import bodyParser from 'body-parser';

interface ToolParams {
  model: string;
  messages: OllamaChatMessage[];
  options?: OllamaChatRequest['options'];
  prompt?: string;
  system?: string;
  text?: string;
}

export class OllamaBridge {
  private server: McpServer;
  private ollamaClient: OllamaClient;
  private models: Map<string, OllamaModelInfo> = new Map();
  private isRunning: boolean = false;
  private expressApp: express.Application;
  private httpServer: any;
  private transport: StreamableHTTPServerTransport;
  private updateInterval: NodeJS.Timeout | null = null;

  constructor(ollamaClient: OllamaClient) {
    this.ollamaClient = ollamaClient;
    this.server = new McpServer({
      name: 'ollama-mcp-bridge',
      version: '1.0.0'
    });

    // Create Express app and configure middleware
    this.expressApp = express();
    this.expressApp.use(bodyParser.json());
    
    // Create transport
    this.transport = new StreamableHTTPServerTransport({
      sessionIdGenerator: () => randomUUID(),
      enableJsonResponse: false
    });

    // Set up the MCP endpoint
    this.expressApp.all('/mcp', (req, res) => {
      this.transport.handleRequest(req, res, req.body);
    });
    
    this.initializeServer();
  }

  private async initializeServer() {
    // Register base tools that don't depend on specific models
    this.server.tool('listModels', {}, async () => {
      const { models } = await this.ollamaClient.listModels();
      return {
        content: [{
          type: 'text',
          text: JSON.stringify(models, null, 2)
        }]
      };
    });

    this.server.tool('pullModel', {
      model: { type: 'string', description: 'Name of the model to pull' }
    }, async ({ model }: Pick<ToolParams, 'model'>) => {
      await this.ollamaClient.pullModel(model);
      return {
        content: [{
          type: 'text',
          text: `Successfully pulled model: ${model}`
        }]
      };
    });

    // Register model-specific tools when models are available
    await this.updateModelTools();
  }

  private async updateModelTools() {
    try {
      const { models } = await this.ollamaClient.listModels();
      
      for (const model of models) {
        if (!this.models.has(model.name)) {
          this.models.set(model.name, model);
          this.registerModelTools(model);
        }
      }
    } catch (error) {
      console.error('Failed to update model tools:', error);
    }
  }

  private registerModelTools(model: OllamaModelInfo) {
    // Chat completion tool
    this.server.tool(`chat_${model.name}`, {
      messages: {
        type: 'array',
        items: {
          type: 'object',
          properties: {
            role: { type: 'string', enum: ['system', 'user', 'assistant'] },
            content: { type: 'string' }
          }
        }
      },
      options: {
        type: 'object',
        properties: {
          temperature: { type: 'number' },
          top_p: { type: 'number' },
          top_k: { type: 'number' },
          stream: { type: 'boolean' }
        },
        optional: true
      }
    }, async ({ messages, options }: Pick<ToolParams, 'messages' | 'options'>) => {
      const response = await this.ollamaClient.chat({
        model: model.name,
        messages,
        options
      });

      return {
        content: [{
          type: 'text',
          text: response.message.content
        }]
      };
    });

    // Text generation tool
    this.server.tool(`generate_${model.name}`, {
      prompt: { type: 'string' },
      system: { type: 'string', optional: true },
      options: {
        type: 'object',
        properties: {
          temperature: { type: 'number' },
          top_p: { type: 'number' },
          top_k: { type: 'number' },
          stream: { type: 'boolean' }
        },
        optional: true
      }
    }, async ({ prompt, system, options }: Pick<ToolParams, 'prompt' | 'system' | 'options'>) => {
      const response = await this.ollamaClient.generate({
        model: model.name,
        prompt: prompt || '',
        system,
        options
      });

      return {
        content: [{
          type: 'text',
          text: response.response
        }]
      };
    });

    // Embeddings tool
    this.server.tool(`embeddings_${model.name}`, {
      text: { type: 'string' }
    }, async ({ text }: Pick<ToolParams, 'text'>) => {
      const response = await this.ollamaClient.embeddings({
        model: model.name,
        prompt: text || ''
      });

      return {
        content: [{
          type: 'text',
          text: JSON.stringify(response.embedding)
        }]
      };
    });
  }

  async start(port: number) {
    if (this.isRunning) {
      throw new Error('Server is already running');
    }

    console.log(`Starting Ollama MCP bridge on port ${port}...`);

    // Set up periodic model tool updates
    this.updateInterval = setInterval(() => this.updateModelTools(), 60000);

    try {
      // Connect the MCP server to the transport
      await this.server.connect(this.transport);

      // Start the HTTP server
      this.httpServer = this.expressApp.listen(port);
      
      this.isRunning = true;
      console.log('Ollama MCP bridge started successfully');
    } catch (error) {
      if (this.updateInterval) {
        clearInterval(this.updateInterval);
        this.updateInterval = null;
      }
      console.error('Failed to start Ollama MCP bridge:', error);
      throw error;
    }
  }

  async stop() {
    if (!this.isRunning) {
      return;
    }

    try {
      // Clear the update interval
      if (this.updateInterval) {
        clearInterval(this.updateInterval);
        this.updateInterval = null;
      }

      // Close the MCP server connection
      await this.server.close();
      
      // Close the HTTP server if it exists
      if (this.httpServer) {
        await new Promise<void>((resolve, reject) => {
          this.httpServer.close((err?: Error) => {
            if (err) reject(err);
            else resolve();
          });
        });
      }

      this.isRunning = false;
      console.log('Ollama MCP bridge stopped successfully');
    } catch (error) {
      console.error('Error stopping Ollama MCP bridge:', error);
      throw error;
    }
  }
} 