import { McpServer } from '@modelcontextprotocol/sdk/server/mcp';
import { StreamableHTTPServerTransport } from '@modelcontextprotocol/sdk/server/streamableHttp';
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
import fs from 'fs';
import path from 'path';

interface ToolParams {
  model: string;
  messages: OllamaChatMessage[];
  options?: OllamaChatRequest['options'];
  prompt?: string;
  system?: string;
  text?: string;
}

export class OllamaBridge {
  private ollamaClient: OllamaClient;
  private expressApp: express.Application;
  private httpServer: any;
  private updateInterval: NodeJS.Timeout | null = null;
  private logFile: string;
  private transports: { [sessionId: string]: StreamableHTTPServerTransport } = {};
  private servers: { [sessionId: string]: McpServer } = {};
  private isRunning: boolean = false;

  constructor(ollamaClient: OllamaClient) {
    this.ollamaClient = ollamaClient;
    this.logFile = path.join(process.cwd(), 'logs', 'mcp-bridge.log');
    fs.mkdirSync(path.dirname(this.logFile), { recursive: true });

    this.expressApp = express();
    this.expressApp.use(bodyParser.json());
    
    this.expressApp.post('/mcp', async (req, res) => {
      // DEBUG: Log raw headers and body at the very start
      fs.appendFileSync(this.logFile, JSON.stringify({
        timestamp: new Date().toISOString(),
        level: 'debug',
        message: 'RAW MCP REQUEST',
        headers: req.headers,
        body: req.body
      }) + '\n');
      // Production-level logging: log all incoming requests
      const requestId = randomUUID();
      this.log('info', `Incoming MCP request [${requestId}]`, {
        headers: req.headers,
        body: req.body
      });
      try {
        const sessionId = req.headers['mcp-session-id'] as string | undefined;
        let transport: StreamableHTTPServerTransport;
        let server: McpServer;

        if (sessionId && this.transports[sessionId] && this.servers[sessionId]) {
          this.log('debug', `Branch: existing session [${requestId}]`, { sessionId });
          transport = this.transports[sessionId];
          server = this.servers[sessionId];
        } else if (!sessionId && req.body.method === 'initialize') {
          this.log('debug', `Branch: initialize (no session) [${requestId}]`, { body: req.body });
          transport = new StreamableHTTPServerTransport({
      sessionIdGenerator: () => randomUUID(),
            enableJsonResponse: true,
            onsessioninitialized: (sid: string) => {
              this.transports[sid] = transport;
              this.servers[sid] = server;
              this.log('info', `Session initialized: ${sid}`);
            }
          });
          server = this.createServer();
        } else {
          this.log('debug', `Branch: 400 error (no valid session) [${requestId}]`, {
            sessionId,
            method: req.body.method,
            headers: req.headers,
            body: req.body
          });
          this.log('warn', `Bad Request: No valid session ID provided [${requestId}]`, {
            headers: req.headers,
            body: req.body
          });
          res.status(400).json({
            jsonrpc: '2.0',
            error: { code: -32000, message: 'Bad Request: No valid session ID provided' },
            id: null
          });
          return;
        }

        try {
          this.log('debug', `Before handleRequest [${requestId}]`, {
            method: req.body.method,
            sessionId: sessionId || 'new',
            headers: req.headers,
            body: req.body
          });
          await transport.handleRequest(req, res, req.body);
          this.log('debug', `After handleRequest [${requestId}]`, {
            method: req.body.method,
            sessionId: sessionId || 'new',
            status: res.statusCode
          });
        } catch (error) {
          this.log('error', `Error in handleRequest [${requestId}]`, {
            error: error instanceof Error ? error.stack || error.message : error,
            method: req.body.method,
            sessionId: sessionId || 'new',
            headers: req.headers,
            body: req.body
          });
          throw error;
        }

        this.log('info', `Handled MCP request [${requestId}]`, {
          method: req.body.method,
          sessionId: sessionId || 'new',
          status: res.statusCode
        });
      } catch (error) {
        this.log('error', `Error handling MCP request [${requestId}]`, {
          error: error instanceof Error ? error.stack || error.message : error,
          headers: req.headers,
          body: req.body
        });
        res.status(500).json({
          jsonrpc: '2.0',
          error: {
            code: -32000,
            message: 'Internal server error'
          },
          id: req.body?.id || null
        });
      }
    });
  }

  private log(level: 'info' | 'error' | 'warn' | 'debug', message: string, data?: any) {
    const timestamp = new Date().toISOString();
    const logEntry = {
      timestamp,
      level,
      message,
      ...(data && { data })
    };
    fs.appendFileSync(this.logFile, JSON.stringify(logEntry) + '\n');
    if (process.env.NODE_ENV !== 'production') {
      console.log(`[${level.toUpperCase()}] ${message}`, data || '');
    }
  }

  private createServer(): McpServer {
    const server = new McpServer({
      name: 'ollama-mcp-bridge',
      version: '1.0.0'
    });
    // Register tools/resources/prompts
    server.tool('listModels', {}, async () => {
      this.log('info', 'Listing models');
      const { models } = await this.ollamaClient.listModels();
      return {
        content: [{
          type: 'text',
          text: JSON.stringify(models, null, 2)
        }]
      };
    });
    server.tool('pullModel', {
      model: { type: 'string', description: 'Name of the model to pull' }
    }, async ({ model }: Pick<ToolParams, 'model'>) => {
      this.log('info', `Pulling model: ${model}`);
      await this.ollamaClient.pullModel(model);
      return {
        content: [{
          type: 'text',
          text: `Successfully pulled model: ${model}`
        }]
      };
    });
    // You can add more tools/resources here as needed
    return server;
  }

  async start(port: number) {
    if (this.isRunning) {
      throw new Error('Server is already running');
    }
    this.log('info', `Starting Ollama MCP bridge on port ${port}...`);
      this.httpServer = this.expressApp.listen(port);
      this.isRunning = true;
    this.log('info', 'Ollama MCP bridge started successfully');
  }

  async stop() {
    if (!this.isRunning) {
      return;
    }
      if (this.httpServer) {
        await new Promise<void>((resolve, reject) => {
          this.httpServer.close((err?: Error) => {
            if (err) reject(err);
            else resolve();
          });
        });
      }
      this.isRunning = false;
    this.log('info', 'Ollama MCP bridge stopped successfully');
    }

  get expressAppInstance() {
    return this.expressApp;
  }
} 