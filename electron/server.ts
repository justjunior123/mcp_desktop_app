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

        // Set up WebSocket server with external access support
        wss = new WebSocketServer({ 
          server: server as HttpServer,
          // Add WebSocket specific configurations
          perMessageDeflate: {
            zlibDeflateOptions: {
              chunkSize: 1024,
              memLevel: 7,
              level: 3
            },
            zlibInflateOptions: {
              chunkSize: 10 * 1024
            },
            clientNoContextTakeover: true,
            serverNoContextTakeover: true,
            serverMaxWindowBits: 10,
            concurrencyLimit: 10,
            threshold: 1024
          }
        });

        wss.on('connection', (ws: WebSocket, req: IncomingMessage) => {
          const clientIp = req.socket.remoteAddress;
          console.log(`WebSocket client connected from ${clientIp}`);

          // Keep connection alive
          const pingInterval = setInterval(() => {
            if (ws.readyState === WebSocket.OPEN) {
              ws.ping();
            }
          }, 30000);

          ws.on('message', async (message: RawData) => {
            try {
              const data = JSON.parse(message.toString()) as WebSocketMessageUnion;
              
              if (data.type === 'refreshModels') {
                // Check Ollama health before syncing
                const isHealthy = await ollamaClient.healthCheck();
                if (!isHealthy) {
                  ws.send(JSON.stringify({
                    type: 'error',
                    payload: {
                      code: 'SERVICE_UNAVAILABLE',
                      message: 'Ollama server is not available'
                    }
                  }));
                  return;
                }

                // Sync with Ollama and send updated model list
                await modelManager.syncModels();
                const models = await modelManager.listModels();
                ws.send(JSON.stringify({
                  type: 'initialStatus',
                  payload: { data: models }
                }));
              }
            } catch (error) {
              console.error('Error handling WebSocket message:', error);
              ws.send(JSON.stringify({
                type: 'error',
                payload: {
                  code: 'INTERNAL_ERROR',
                  message: error instanceof Error ? error.message : 'Unknown error'
                }
              }));
            }
          });

          ws.on('close', () => {
            clearInterval(pingInterval);
            console.log(`WebSocket client disconnected from ${clientIp}`);
          });

          ws.on('error', (error) => {
            console.error(`WebSocket error from ${clientIp}:`, error);
            clearInterval(pingInterval);
          });
        });

        resolve(server as HttpServer);
      });

      // Add error handler for the server
      server.on('error', (error) => {
        console.error('Server error:', error);
        const fs = require('fs');
        const errorMsg = (error instanceof Error) ? error.message : String(error);
        fs.appendFileSync('parameters-debug.log', `[${new Date().toISOString()}] server.ts: Server error: ${errorMsg}\n`);
      });
    } catch (err) {
      const fs = require('fs');
      const errorMsg = (err instanceof Error) ? err.message : String(err);
      fs.appendFileSync('parameters-debug.log', `[${new Date().toISOString()}] setupServer: Caught error: ${errorMsg}\n`);
      reject(err);
    }
  });
}

export function cleanup() {
  if (wss) {
    wss.close();
    wss = null;
  }
  if (server) {
    server.close();
    server = null;
  }
} 