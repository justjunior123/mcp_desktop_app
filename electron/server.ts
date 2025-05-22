import express from 'express';
import { Server as HttpServer } from 'http';
import cors from 'cors';
import { WebSocket, WebSocketServer } from 'ws';
import { IncomingMessage } from 'http';
import { RawData } from 'ws';
import mcpRouter from '../src/api/routes/mcp';
import { WebSocketMessageUnion } from '../src/types/websocket';
import { OllamaModelManager } from '../src/services/ollama/model-manager';
import { prisma } from '../src/services/database/client';
import { OllamaClient } from '../src/services/ollama/client';
import { OllamaBridge } from '../src/services/mcp/ollama-bridge';
import { McpServer } from '@modelcontextprotocol/sdk/server/mcp';
import { StreamableHTTPServerTransport } from '@modelcontextprotocol/sdk/server/streamableHttp';

let server: HttpServer | null = null;
let wss: WebSocketServer | null = null;
const API_PORT = parseInt(process.env.API_PORT || '3100', 10);
const API_HOST = process.env.API_HOST || '0.0.0.0';

// Allow list of origins - can be configured via environment variables
const ALLOWED_ORIGINS = [
  'http://localhost:3002',
  'app://rse',
  'ws://localhost:3100',
  // Add Replit domains
  'https://*.repl.co',
  'https://*.repl.it',
  'https://*.replit.com',
  // Development and production URLs
  process.env.NEXT_PUBLIC_APP_URL,
  process.env.REPLIT_URL,
].filter(Boolean); // Remove undefined values

// Error handling middleware
const errorHandler = (err: Error, req: express.Request, res: express.Response, next: express.NextFunction) => {
  console.error('Unhandled error:', err);
  res.status(500).json({
    error: {
      code: 'INTERNAL_ERROR',
      message: err.message || 'An unexpected error occurred'
    }
  });
};

// Not found middleware
const notFoundHandler = (req: express.Request, res: express.Response) => {
  res.status(404).json({
    error: {
      code: 'NOT_FOUND',
      message: `Resource not found: ${req.method} ${req.path}`
    }
  });
};

export async function setupServer() {
  const fs = require('fs');
  fs.appendFileSync('parameters-debug.log', `[${new Date().toISOString()}] setupServer: called\n`);
  const app = express();
  const ollamaClient = new OllamaClient();
  const modelManager = new OllamaModelManager(prisma, ollamaClient);

  // Mount MCP bridge at /mcp
  const ollamaBridge = new OllamaBridge(ollamaClient);
  app.use('/mcp', ollamaBridge.expressAppInstance);

  // Enhanced middleware
  app.use(express.json());

  // --- MCP Streamable HTTP endpoint for Inspector and MCP clients ---
  const mcpServer = new McpServer({
    name: 'my-mcp-server',
    version: '1.0.0',
    // Register tools/resources here as needed
  });

  app.all('/mcp', async (req, res) => {
    const transport = new StreamableHTTPServerTransport({
      sessionIdGenerator: () => Math.random().toString(36).slice(2),
      enableJsonResponse: true,
      onsessioninitialized: (sessionId: string) => {
        // Optionally track session
      }
    });
    // The connect method is valid per SDK types
    // @ts-ignore
    await mcpServer.connect(transport);
    await transport.handleRequest(req, res, req.body);
  });

  // Basic health check endpoint
  app.get('/health', (req, res) => {
    res.json({ 
      status: 'ok',
      timestamp: new Date().toISOString(),
      environment: process.env.NODE_ENV
    });
  });

  // Check Ollama health before adding routes
  const isOllamaHealthy = await ollamaClient.healthCheck();
  if (!isOllamaHealthy) {
    console.error('⚠️ Warning: Ollama server is not available. Some features may not work.');
  } else {
    console.log('✅ Ollama server is healthy');
  }

  // Add MCP routes
  app.use('/api', mcpRouter);

  // Add error handling middleware
  app.use(notFoundHandler);
  app.use(errorHandler);

  // Start the server
  return new Promise<HttpServer>((resolve, reject) => {
    try {
      server = app.listen(API_PORT, API_HOST, () => {
        console.log(`API Server running on ${API_HOST}:${API_PORT}`);
        const fs = require('fs');
        fs.appendFileSync('parameters-debug.log', `[${new Date().toISOString()}] server.ts: API Server running on ${API_HOST}:${API_PORT}\n`);
      });
      resolve(server);
    } catch (err) {
      reject(err);
    }
  });
}
