import express, { Request, Response, NextFunction } from 'express';
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
import { McpService } from '../src/services/mcp/service';
import { mockOllamaClient, mockModelManager } from '../tests/setup';
import { OllamaChatMessage } from '../src/services/ollama/types';
import fs from 'fs';

let server: HttpServer | null = null;
let wss: WebSocketServer | null = null;
const API_PORT = parseInt(process.env.API_PORT || '3100', 10);
const API_HOST = process.env.API_HOST || '0.0.0.0';

// Allow list of origins - can be configured via environment variables
const ALLOWED_ORIGINS = [
  'http://localhost:3002',
  'ws://localhost:3100',
  // Add Replit domains
  'https://*.replit.com',
  // Development and production URLs
  process.env.NEXT_PUBLIC_APP_URL,
  process.env.REPLIT_URL,
].filter(Boolean); // Remove undefined values

// Error handling middleware
const errorHandler = (err: Error, req: Request, res: Response, next: NextFunction) => {
  console.error('Unhandled error:', err);
  res.status(500).json({
    error: {
      code: 'INTERNAL_ERROR',
      message: err.message || 'An unexpected error occurred'
    }
  });
};

// Not found middleware
const notFoundHandler = (req: Request, res: Response) => {
  res.status(404).json({
    error: {
      code: 'NOT_FOUND',
      message: `Resource not found: ${req.method} ${req.path}`
    }
  });
};

const isTest = process.env.NODE_ENV === 'test';
const ollamaClient = isTest ? mockOllamaClient : new OllamaClient();
const modelManager = isTest ? mockModelManager : new OllamaModelManager(prisma, ollamaClient as OllamaClient);

// Utility to safely serialize BigInt values to strings
function serializeBigInt(obj: any): any {
  if (obj === null || obj === undefined) return obj;
  if (typeof obj === 'bigint') return obj.toString();
  if (Array.isArray(obj)) return obj.map(serializeBigInt);
  if (typeof obj === 'object') {
    return Object.fromEntries(
      Object.entries(obj).map(([key, value]) => [key, serializeBigInt(value)])
    );
  }
  return obj;
}

export async function setupServer() {
  const app = express();
  const mcpService = new McpService(modelManager as OllamaModelManager);

  // Enhanced middleware
  app.use(express.json());
  app.use(cors({
    origin: (origin, callback) => {
      // Allow requests with no origin (like mobile apps or curl requests)
      if (!origin) return callback(null, true);
      
      // Check if the origin is allowed
      const isAllowed = ALLOWED_ORIGINS.some(allowedOrigin => {
        if (allowedOrigin?.includes('*')) {
          const pattern = new RegExp(allowedOrigin.replace('*', '.*'));
          return pattern.test(origin);
        }
        return allowedOrigin === origin;
      });

      if (isAllowed) {
        callback(null, true);
      } else {
        callback(new Error('Not allowed by CORS'));
      }
    },
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With']
  }));

  // Add logging middleware
  app.use((req, res, next) => {
    const logMessage = `${new Date().toISOString()} - ${req.method} ${req.path}\n`;
    fs.appendFileSync('api-debug.log', logMessage);
    next();
  });

  // Health check endpoint
  app.get('/health', (req, res) => {
    res.status(200).json({ status: 'ok' });
  });

  // MCP endpoint
  app.all('/mcp', async (req, res) => {
    await mcpService.handleRequest(req, res);
  });

  // Models endpoints
  app.get('/api/models', async (req, res) => {
    try {
      const models = await modelManager.listModels();
      res.json({ data: serializeBigInt(models) });
    } catch (error) {
      console.error('Error listing models:', error);
      res.status(500).json({ error: { code: 'INTERNAL_ERROR', message: 'Failed to list models' } });
    }
  });

  app.get('/api/models/:name', async (req, res) => {
    try {
      const model = await modelManager.getModel(req.params.name);
      if (!model) {
        res.status(404).json({ error: { code: 'NOT_FOUND', message: 'Model not found' } });
        return;
      }
      res.json({ data: serializeBigInt(model) });
    } catch (error) {
      if (error && typeof error === 'object' && 'message' in error && (error as any).message === 'Model not found') {
        res.status(404).json({ error: { code: 'NOT_FOUND', message: 'Model not found' } });
      } else {
        console.error('Error getting model:', error);
        res.status(500).json({ error: { code: 'INTERNAL_ERROR', message: 'Failed to get model' } });
      }
    }
  });

  app.post('/api/models', async (req, res) => {
    try {
      const { name } = req.body;
      if (!name) {
        res.status(400).json({ error: { code: 'INVALID_REQUEST', message: 'Model name is required' } });
        return;
      }
      const model = await modelManager.pullModel(name);
      res.status(201).json({ data: serializeBigInt(model) });
    } catch (error) {
      console.error('Error creating model:', error);
      res.status(500).json({ error: { code: 'INTERNAL_ERROR', message: 'Failed to create model' } });
    }
  });

  app.put('/api/models/:name', async (req, res) => {
    try {
      const { name } = req.params;
      const config = req.body;
      const model = await modelManager.updateModel(name, config);
      res.json({ data: serializeBigInt(model) });
    } catch (error) {
      if (error && typeof error === 'object' && 'message' in error && (error as any).message === 'Model not found') {
        res.status(404).json({ error: { code: 'NOT_FOUND', message: 'Model not found' } });
      } else {
        console.error('Error updating model:', error);
        res.status(500).json({ error: { code: 'INTERNAL_ERROR', message: 'Failed to update model' } });
      }
    }
  });

  app.delete('/api/models/:name', async (req, res) => {
    try {
      await modelManager.deleteModel(req.params.name);
      res.status(204).send();
    } catch (error) {
      if (error && typeof error === 'object' && 'message' in error && (error as any).message === 'Model not found') {
        res.status(404).json({ error: { code: 'NOT_FOUND', message: 'Model not found' } });
      } else {
        console.error('Error deleting model:', error);
        res.status(500).json({ error: { code: 'INTERNAL_ERROR', message: 'Failed to delete model' } });
      }
    }
  });

  // Chat endpoints
  app.post('/api/models/:name/chat', async (req, res) => {
    try {
      const { messages } = req.body;
      if (!messages || !Array.isArray(messages)) {
        res.status(400).json({ error: { code: 'INVALID_REQUEST', message: 'Messages array is required' } });
        return;
      }
      const response = await ollamaClient.chat({
        model: req.params.name,
        messages: messages
      });
      res.json({ data: response });
    } catch (error) {
      console.error('Error in chat:', error);
      res.status(500).json({ error: { code: 'INTERNAL_ERROR', message: 'Failed to process chat request' } });
    }
  });

  app.post('/api/models/:name/chat/stream', async (req, res) => {
    try {
      const { messages } = req.body;
      if (!messages || !Array.isArray(messages)) {
        res.status(400).json({ error: { code: 'INVALID_REQUEST', message: 'Messages array is required' } });
        return;
      }

      res.setHeader('Content-Type', 'text/event-stream');
      res.setHeader('Cache-Control', 'no-cache');
      res.setHeader('Connection', 'keep-alive');

      const stream = ollamaClient.chatStream({
        model: req.params.name,
        messages: messages
      });

      // Write each chunk as an SSE event
      for await (const chunk of stream) {
        res.write(`data: ${JSON.stringify(chunk)}\n\n`);
      }
      res.end();
    } catch (error) {
      console.error('Error in streaming chat:', error);
      res.status(500).json({ error: { code: 'INTERNAL_ERROR', message: 'Failed to process streaming chat request' } });
    }
  });

  // Tools endpoints
  app.get('/api/tools', (req, res) => {
    res.json({ data: [] });
  });

  app.get('/api/tools/:name', (req, res) => {
    res.status(404).json({ error: { code: 'NOT_FOUND', message: 'Tool not found' } });
  });

  // Prompts endpoints
  app.get('/api/prompts', (req, res) => {
    res.json({ data: [] });
  });

  app.get('/api/prompts/:name', (req, res) => {
    res.status(404).json({ error: { code: 'NOT_FOUND', message: 'Prompt not found' } });
  });

  // Add error logging middleware
  app.use((err: any, req: any, res: any, next: any) => {
    const errorLog = `${new Date().toISOString()} - Error in ${req.method} ${req.path}\n${err.stack}\n`;
    fs.appendFileSync('api-error.log', errorLog);
    next(err);
  });

  // Error handling
  app.use(notFoundHandler);
  app.use(errorHandler);

  // Start the server
  return new Promise<HttpServer>((resolve, reject) => {
    try {
      server = app.listen(API_PORT, API_HOST, () => {
        console.log(`API Server running on ${API_HOST}:${API_PORT}`);
        resolve(server as HttpServer);
      });
    } catch (err) {
      reject(err);
    }
  });
}

export async function cleanup() {
  if (wss) {
    wss.close();
    wss = null;
  }
  if (server) {
    server.close();
    server = null;
  }
  await prisma.$disconnect();
} 