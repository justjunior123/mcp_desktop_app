import express from 'express';
import { Server } from 'http';
import cors from 'cors';
import ollamaRouter from '../src/api/routes/ollama';

let server: Server | null = null;
const API_PORT = process.env.API_PORT || 3100;

export async function setupServer() {
  const app = express();

  // Basic middleware
  app.use(express.json());
  app.use(cors({
    origin: ['http://localhost:3002', 'app://rse'],
    credentials: true
  }));

  // Basic health check endpoint
  app.get('/health', (req, res) => {
    res.json({ status: 'ok' });
  });

  // Add Ollama routes
  app.use('/api/ollama', ollamaRouter);

  // Start the server
  return new Promise<Server>((resolve, reject) => {
    try {
      server = app.listen(API_PORT, () => {
        console.log(`API Server running on port ${API_PORT}`);
        resolve(server as Server);
      });
    } catch (err) {
      reject(err);
    }
  });
}

export function cleanup() {
  if (server) {
    server.close();
    server = null;
  }
} 