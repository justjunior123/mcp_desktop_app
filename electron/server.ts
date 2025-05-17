import express from 'express';
import { Server as HttpServer } from 'http';
import cors from 'cors';
import WebSocket from 'ws';
import ollamaRouter from '../src/api/routes/ollama';
import { WebSocketMessageUnion } from '../src/types/websocket';
import { OllamaModelManager } from '../src/services/ollama/model-manager';
import { prisma } from '../src/services/database/client';
import { OllamaClient } from '../src/services/ollama/client';

let server: HttpServer | null = null;
let wss: WebSocket.Server | null = null;
const API_PORT = process.env.API_PORT || 3100;

export async function setupServer() {
  const app = express();
  const ollamaClient = new OllamaClient();
  const modelManager = new OllamaModelManager(prisma, ollamaClient);

  // Basic middleware
  app.use(express.json());
  app.use(cors({
    origin: ['http://localhost:3002', 'app://rse', 'ws://localhost:3100'],
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization']
  }));

  // Basic health check endpoint
  app.get('/health', (req, res) => {
    res.json({ status: 'ok' });
  });

  // Check Ollama health before adding routes
  const isOllamaHealthy = await ollamaClient.healthCheck();
  if (!isOllamaHealthy) {
    console.error('⚠️ Warning: Ollama server is not available. Some features may not work.');
  } else {
    console.log('✅ Ollama server is healthy');
  }

  // Add Ollama routes
  app.use('/api/ollama', ollamaRouter);

  // Start the server
  return new Promise<HttpServer>((resolve, reject) => {
    try {
      server = app.listen(API_PORT, () => {
        console.log(`API Server running on port ${API_PORT}`);

        // Set up WebSocket server
        wss = new WebSocket.Server({ server: server as HttpServer });

        wss.on('connection', (ws) => {
          console.log('WebSocket client connected');

          ws.on('message', async (message) => {
            try {
              const data = JSON.parse(message.toString()) as WebSocketMessageUnion;
              
              if (data.type === 'refreshModels') {
                // Check Ollama health before syncing
                const isHealthy = await ollamaClient.healthCheck();
                if (!isHealthy) {
                  ws.send(JSON.stringify({
                    type: 'error',
                    payload: {
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
                  payload: { models }
                }));
              }
            } catch (error) {
              console.error('Error handling WebSocket message:', error);
              ws.send(JSON.stringify({
                type: 'error',
                payload: {
                  message: error instanceof Error ? error.message : 'Unknown error'
                }
              }));
            }
          });

          ws.on('close', () => {
            console.log('WebSocket client disconnected');
          });
        });

        resolve(server as HttpServer);
      });
    } catch (err) {
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