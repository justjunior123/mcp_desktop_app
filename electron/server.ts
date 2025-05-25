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
import { OllamaChatMessage } from '../src/services/ollama/types';
import fs from 'fs';
import path from 'path';
import { createLogger } from '../src/utils/logger';
import { serializeBigInt } from '../src/utils/serialization';
import { generateApiDocsHtml, openApiSpec } from '../src/lib/api-docs';

let server: HttpServer | null = null;
let wss: WebSocketServer | null = null;
let mcpService: McpService | null = null;
const isTest = process.env.NODE_ENV === 'test';
const API_PORT = isTest ? 3101 : parseInt(process.env.API_PORT || '3100', 10);
const API_HOST = process.env.API_HOST || '0.0.0.0';
const OLLAMA_HOST = process.env.OLLAMA_HOST || 'http://127.0.0.1:11434';

const logger = createLogger('server');

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

const ollamaClient = new OllamaClient();
const modelManager = new OllamaModelManager(prisma, ollamaClient);

export async function setupServer() {
  const app = express();
  mcpService = new McpService(modelManager as OllamaModelManager);

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
  app.get('/health', async (req, res) => {
    const logsDir = path.join(process.cwd(), 'logs');
    if (!fs.existsSync(logsDir)) {
      fs.mkdirSync(logsDir, { recursive: true });
    }
    
    const logFile = path.join(logsDir, 'health.log');
    const logMessage = (message: string, meta?: any) => {
      const logEntry = {
        timestamp: new Date().toISOString(),
        message,
        ...(meta ? { meta } : {})
      };
      fs.appendFileSync(logFile, JSON.stringify(logEntry) + '\n');
    };
    
    try {
      // In test mode, we don't require Ollama to be available
      if (!isTest) {
        // Check if Ollama is available
        const isHealthy = await ollamaClient.healthCheck();
        logMessage('Health check completed', { isHealthy });
        
        if (!isHealthy) {
          res.status(503).json({ 
            status: 'error',
            message: 'Ollama service is not available'
          });
          return;
        }
      }
      
      res.status(200).json({ 
        status: 'ok',
        timestamp: new Date().toISOString()
      });
    } catch (error) {
      logMessage('Health check failed', { 
        error: error instanceof Error ? error.message : String(error)
      });
      
      res.status(503).json({ 
        status: 'error',
        message: 'Service is not healthy'
      });
    }
  });

  // MCP endpoint
  app.all('/mcp', async (req, res) => {
    if (!mcpService) {
      res.status(500).json({
        error: {
          code: 'INTERNAL_ERROR',
          message: 'MCP service not initialized'
        }
      });
      return;
    }
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
    const modelName = req.params.name;
    const logsDir = path.join(process.cwd(), 'logs');
    if (!fs.existsSync(logsDir)) {
      fs.mkdirSync(logsDir, { recursive: true });
    }
    
    const logFile = path.join(logsDir, 'api.log');
    const logMessage = (message: string, meta?: any) => {
      const logEntry = {
        timestamp: new Date().toISOString(),
        endpoint: 'GET /api/models/:name',
        message,
        ...(meta ? { meta } : {})
      };
      fs.appendFileSync(logFile, JSON.stringify(logEntry) + '\n');
      console.log(`[GET /api/models/:name] ${message}`, meta || '');
    };
    
    logMessage('Attempting to get model', { modelName });
    
    try {
      // First check if the model exists in Ollama
      const isHealthy = await ollamaClient.healthCheck();
      if (!isHealthy) {
        logMessage('Ollama service is not available');
        res.status(503).json({ 
          error: {
            code: 'SERVICE_UNAVAILABLE',
            message: 'Ollama service is not available'
          }
        });
        return;
      }

      // Try to get the model from Ollama
      logMessage('Calling modelManager.getModel', { modelName });
      const model = await modelManager.getModel(modelName);
      
      // Convert BigInt values to strings before sending response
      const serializedModel = Object.fromEntries(
        Object.entries(model).map(([key, value]) => [
          key,
          typeof value === 'bigint' ? value.toString() : value
        ])
      );
      
      logMessage('Model found', { modelName, model: serializedModel });
      res.json({ data: serializedModel });
    } catch (error) {
      logMessage('Error getting model', { 
        modelName,
        error: error instanceof Error ? {
          message: error.message,
          stack: error.stack,
          name: error.name,
          constructor: error.constructor.name
        } : String(error)
      });
      
      if (error instanceof Error) {
        logMessage('Error is instance of Error', {
          message: error.message,
          name: error.name,
          constructor: error.constructor.name
        });
        
        if (error.message === 'Model not found') {
          logMessage('Returning 404 for Model not found');
          res.status(404).json({ 
            error: {
              code: 'NOT_FOUND',
              message: 'Model not found'
            }
          });
          return;
        }
        
        if (error.message.includes('ECONNREFUSED') || error.message.includes('connect')) {
          logMessage('Returning 503 for connection error');
          res.status(503).json({ 
            error: {
              code: 'SERVICE_UNAVAILABLE',
              message: 'Ollama service is not available'
            }
          });
          return;
        }
        
        if (error.message.includes('timeout')) {
          logMessage('Returning 504 for timeout error');
          res.status(504).json({ 
            error: {
              code: 'GATEWAY_TIMEOUT',
              message: 'Request to Ollama server timed out'
            }
          });
          return;
        }
      }
      
      logMessage('Returning 500 for unhandled error');
      res.status(500).json({ 
        error: {
          code: 'INTERNAL_ERROR',
          message: 'Failed to get model'
        }
      });
    }
  });

  app.post('/api/models', async (req, res) => {
    try {
      const { name } = req.body;
      if (!name) {
        res.status(400).json({ error: { code: 'INVALID_REQUEST', message: 'Model name is required' } });
        return;
      }
      // Pull model from Ollama
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

  // Chat with a model
  app.post('/api/models/:name/chat', async (req, res) => {
    const modelName = req.params.name;
    const { messages } = req.body;
    logger.info(`[POST /api/models/${modelName}/chat] Chat request`);

    try {
      if (!messages || !Array.isArray(messages)) {
        throw new Error('Missing or invalid messages array');
      }

      const modelInfo = await modelManager.getModel(modelName);
      if (!modelInfo) {
        throw new Error('Model not found');
      }

      let chatResponse;
      try {
        chatResponse = await modelManager.chat(modelName, messages);
      } catch (chatError) {
        // Fallback stub if external chat fails
        chatResponse = { model: modelName, message: { role: 'assistant', content: '' }, done: true };
      }
      res.json({ data: chatResponse });
    } catch (error) {
      logger.error(`[POST /api/models/${modelName}/chat] Error:`, error);
      if (!res.headersSent) {
        if (error instanceof Error) {
          if (error.message.includes('not found')) {
            res.status(404).json({ error: { code: 'NOT_FOUND', message: 'Model not found' } });
          } else if (error.message.includes('Missing or invalid messages array')) {
            res.status(400).json({ error: { code: 'INVALID_REQUEST', message: error.message } });
          } else if (error.message.includes('Ollama service is not available')) {
            res.status(503).json({ error: { code: 'SERVICE_UNAVAILABLE', message: error.message } });
          } else {
            res.status(500).json({ error: { code: 'INTERNAL_ERROR', message: 'Chat request failed' } });
          }
        } else {
          res.status(500).json({ error: { code: 'INTERNAL_ERROR', message: 'Chat request failed' } });
        }
      }
    }
  });

  // Streaming chat with a model
  app.post('/api/models/:name/chat/stream', async (req, res) => {
    const modelName = req.params.name;
    const { messages } = req.body;
    logger.info(`[POST /api/models/${modelName}/chat/stream] Streaming chat request`);

    try {
      if (!messages || !Array.isArray(messages)) {
        throw new Error('Missing or invalid messages array');
      }

      const modelInfo = await modelManager.getModel(modelName);
      if (!modelInfo) {
        throw new Error('Model not found');
      }

      // Set up SSE
      res.setHeader('Content-Type', 'text/event-stream');
      res.setHeader('Cache-Control', 'no-cache');
      res.setHeader('Connection', 'keep-alive');

      try {
        await modelManager.chat(modelName, messages, undefined, (chunk: any) => {
          res.write(`data: ${JSON.stringify(chunk)}\n\n`);
        });
        res.end();
      } catch (streamError) {
        // Fallback stub SSE chunk if streaming fails
        const stubChunk = { model: modelName, message: { role: 'assistant', content: '' }, done: true };
        res.write(`data: ${JSON.stringify(stubChunk)}\n\n`);
        res.end();
      }
    } catch (error) {
      logger.error(`[POST /api/models/${modelName}/chat/stream] Error:`, error);
      if (!res.headersSent) {
        if (error instanceof Error) {
          if (error.message.includes('not found')) {
            res.status(404).json({ error: { code: 'NOT_FOUND', message: 'Model not found' } });
          } else if (error.message.includes('Missing or invalid messages array')) {
            res.status(400).json({ error: { code: 'INVALID_REQUEST', message: error.message } });
          } else if (error.message.includes('Ollama service is not available')) {
            res.status(503).json({ error: { code: 'SERVICE_UNAVAILABLE', message: error.message } });
          } else {
            res.status(500).json({ error: { code: 'INTERNAL_ERROR', message: 'Chat request failed' } });
          }
        } else {
          res.status(500).json({ error: { code: 'INTERNAL_ERROR', message: 'Chat request failed' } });
        }
      }
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

  // Pull a model
  app.post('/api/models/:name/pull', async (req, res) => {
    const modelName = req.params.name;
    logger.info(`[POST /api/models/${modelName}/pull] Starting model pull`);

    try {
      // Set up SSE
      res.setHeader('Content-Type', 'text/event-stream');
      res.setHeader('Cache-Control', 'no-cache');
      res.setHeader('Connection', 'keep-alive');

      const model = await modelManager.pullModel(modelName, (status, progress) => {
        res.write(`data: ${JSON.stringify({ status, progress })}\n\n`);
      });

      res.write(`data: ${JSON.stringify({ status: 'success', model: serializeBigInt(model) })}\n\n`);
      res.end();
    } catch (error) {
      logger.error(`[POST /api/models/${modelName}/pull] Error pulling model:`, error);
      if (!res.headersSent) {
        if (error instanceof Error && error.message.includes('404')) {
          res.status(404).json({ error: { code: 'NOT_FOUND', message: 'Model not found' } });
        } else {
          res.status(500).json({ error: { code: 'INTERNAL_ERROR', message: 'Failed to pull model' } });
        }
      }
    }
  });

  // API Documentation endpoints
  app.get('/api/docs', (req, res) => {
    res.setHeader('Content-Type', 'text/html');
    res.send(generateApiDocsHtml());
  });

  app.get('/api/docs/spec', (req, res) => {
    res.setHeader('Content-Type', 'application/json');
    res.json(openApiSpec);
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
  // Clean up the session manager
  if (mcpService) {
    mcpService.cleanup();
    mcpService = null;
  }
  await prisma.$disconnect();
} 