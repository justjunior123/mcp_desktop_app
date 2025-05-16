import express, { ErrorRequestHandler } from 'express';
import { createServer } from 'http';
import { DatabaseService } from '../src/services/database/DatabaseService';
import { logger } from '../src/services/logging';
import cors from 'cors';
import rateLimit from 'express-rate-limit';
import bodyParser from 'body-parser';

// Custom error class for API errors
export class APIError extends Error {
  statusCode: number;
  details?: any;

  constructor(statusCode: number, message: string, details?: any) {
    super(message);
    this.name = 'APIError';
    this.statusCode = statusCode;
    this.details = details;
  }
}

// Rate limiting middleware
const limiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 100, // Limit each IP to 100 requests per windowMs
  message: 'Too many requests from this IP, please try again later'
});

// Error handling middleware
const errorHandler: ErrorRequestHandler = (err, req, res) => {
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
  logger.info('Starting server setup...');
  
  const app = express();
  const server = createServer(app);
  
  logger.info('Applying middleware...');
  
  // Apply middleware
  app.use(cors({
    origin: process.env.NODE_ENV === 'development' ? 'http://localhost:3002' : false,
    credentials: true
  }));
  app.use(bodyParser.json());
  app.use(limiter);
  
  logger.info('Initializing database service...');
  
  // Initialize services
  const db = new DatabaseService();
  
  logger.info('Setting up routes...');
  
  // Health check endpoint
  app.get('/api/health', async (req, res) => {
    try {
      logger.info('Health check requested');
      const dbStatus = await db.isHealthy();
      
      res.json({
        status: 'ok',
        services: {
          database: dbStatus ? 'healthy' : 'unhealthy'
        }
      });
    } catch (error) {
      logger.error('Health check failed:', { error });
      res.status(500).json({
        status: 'error',
        message: error instanceof Error ? error.message : 'Unknown error occurred'
      });
    }
  });
  
  // Add error handling middleware - must be after all other middleware
  app.use(errorHandler);
  
  // Start server
  const port = process.env.API_PORT ? parseInt(process.env.API_PORT) : 3100;
  
  logger.info(`Attempting to start server on port ${port}...`);
  
  await new Promise<void>((resolve, reject) => {
    try {
      const serverInstance = server.listen(port, () => {
        logger.info(`Server listening on port ${port}`);
        resolve();
      });
      
      serverInstance.on('error', (error: NodeJS.ErrnoException) => {
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

  logger.info('Server setup completed successfully');
  return { server, db };
}

// Handle cleanup
export function cleanup() {
  logger.info('Starting server cleanup...');
  try {
    logger.info('Server cleanup completed successfully');
  } catch (error) {
    logger.error('Error during cleanup:', { error });
  }
} 