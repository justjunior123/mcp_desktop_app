import express, { ErrorRequestHandler } from 'express';
import { createServer } from 'http';
import { DatabaseService } from '@/services/database/DatabaseService.js';
import { setupOllamaServices } from '@/services/ollama/setup.js';
import { logger } from '../src/services/logging/index.js';

// Custom error class for API errors
export class APIError extends Error {
  constructor(
    public statusCode: number,
    message: string,
    public details?: any
  ) {
    super(message);
    this.name = 'APIError';
  }
}

// Error handling middleware
const errorHandler: ErrorRequestHandler = (err, req, res, _next) => {
  logger.error('Error processing request:', {
    error: err,
    path: req.path,
    method: req.method,
    query: req.query,
    body: req.body,
    stack: err.stack
  });

  if (err instanceof APIError) {
    res.status(err.statusCode).json({
      error: err.message,
      details: err.details
    });
    return;
  }

  // Handle other types of errors
  res.status(500).json({
    error: 'Internal Server Error',
    message: process.env.NODE_ENV === 'development' ? err.message : 'An unexpected error occurred'
  });
};

export async function setupServer() {
  const app = express();
  const server = createServer(app);
  
  // Initialize services
  const db = new DatabaseService();
  await setupOllamaServices(app, server, db);
  
  // Add error handling middleware - must be after all other middleware
  app.use(errorHandler);
  
  // Start server
  const port = process.env.PORT ? parseInt(process.env.PORT) : 3100;
  
  await new Promise<void>((resolve, reject) => {
    try {
      server.listen(port, () => {
        logger.info(`Server listening on port ${port}`);
        resolve();
      });
      
      server.on('error', (error: NodeJS.ErrnoException) => {
        const errorDetails = {
          code: error.code,
          syscall: error.syscall
        };
        
        logger.error('Server error:', { error: errorDetails });
        
        if (error.code === 'EADDRINUSE') {
          logger.error(`Port ${port} is already in use`);
        }
        
        reject(error);
      });
    } catch (error) {
      logger.error('Failed to start server:', { 
        error,
        stack: error instanceof Error ? error.stack : undefined
      });
      reject(error);
    }
  });

  return server;
}

// Handle cleanup
export function cleanup(services: ReturnType<typeof setupOllamaServices>) {
  try {
    services.cleanup();
    logger.info('Server cleanup completed successfully');
  } catch (error) {
    logger.error('Error during server cleanup:', { error });
  }
} 