import express, { Request, Response, NextFunction } from 'express';
import { Server } from 'http';
import cors from 'cors';
import helmet from 'helmet';
import { 
  correlationMiddleware, 
  requestLoggingMiddleware 
} from '../../src/lib/api-logger';
import { 
  corsOptions,
  securityHeaders,
  sanitizeHeaders,
  healthCheckBypass,
  securityErrorHandler
} from '../../src/lib/security';
import {
  globalErrorHandler,
  notFoundHandler,
  performanceMonitoring,
  healthCheckErrorHandler
} from '../../src/lib/error-handling';
import ollamaRoutes from '../../src/api/routes/ollama';
import { apiDocumentation } from '../../src/lib/api-docs';
// Import mocks
import './test-security';
import './ollama-mock';
import './prisma-mock';
import { mockOllamaClient, mockModelManager } from './ollama-mock';

export interface TestAppSetup {
  app: express.Express;
  server: Server;
}

export async function setupTestApp(): Promise<TestAppSetup> {
  const app = express();

  // Trust proxy for rate limiting in tests
  app.set('trust proxy', 1);

  // Health check (before rate limiting)
  app.use('/health', (req: Request, res: Response, next: NextFunction) => {
    healthCheckErrorHandler(req, res, next);
  });

  // Security middleware
  app.use(securityHeaders);
  app.use(cors(corsOptions));
  app.use(sanitizeHeaders);

  // Request correlation and logging
  app.use(correlationMiddleware);
  app.use(requestLoggingMiddleware);
  app.use(performanceMonitoring);

  // Rate limiting (disabled for tests)
  app.use(healthCheckBypass);
  // Skip rate limiting in tests for faster execution

  // Body parsing
  app.use(express.json({ limit: '10mb' }));
  app.use(express.urlencoded({ extended: true, limit: '10mb' }));

  // API Documentation endpoint
  app.get('/api/docs', (req, res) => {
    res.setHeader('Content-Type', 'text/html');
    res.send(apiDocumentation.generateHtml());
  });

  app.get('/api/docs/spec', (req, res) => {
    res.json(apiDocumentation.openApiSpec);
  });

  // API Routes
  app.use('/api', ollamaRoutes);

  // Error handling
  app.use((err: any, req: Request, res: Response, next: NextFunction) => {
    securityErrorHandler(err, req, res, next);
  });
  app.use(notFoundHandler);
  app.use((err: any, req: Request, res: Response, next: NextFunction) => {
    globalErrorHandler(err, req, res, next);
  });

  // Start server
  const server = app.listen(0); // Use port 0 for random available port

  return { app, server };
}

export { mockOllamaClient, mockModelManager };