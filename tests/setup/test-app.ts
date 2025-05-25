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
  
  // Add input validation middleware for testing
  app.use((req: Request, res: Response, next: NextFunction): void => {
    // Mock input sanitization that rejects dangerous content
    if (req.body && typeof req.body === 'object') {
      const bodyStr = JSON.stringify(req.body);
      
      // Check for dangerous patterns
      if (bodyStr.includes('\x00') || bodyStr.includes('\x01') || 
          bodyStr.includes('\x02') || bodyStr.includes('\x03')) {
        res.status(400).json({
          error: {
            code: 'INVALID_REQUEST',
            message: 'Invalid characters in request',
            timestamp: new Date().toISOString(),
            correlationId: req.headers['x-correlation-id'] || 'test-correlation-id'
          }
        });
        return;
      }
      
      // Check for extremely long content
      if (bodyStr.length > 50000) {  // Smaller limit for test
        res.status(413).json({
          error: {
            code: 'REQUEST_ENTITY_TOO_LARGE',
            message: 'Request payload too large',
            timestamp: new Date().toISOString(),
            correlationId: req.headers['x-correlation-id'] || 'test-correlation-id'
          }
        });
        return;
      }
    }
    
    next();
  });

  // Request correlation and logging
  app.use(correlationMiddleware);
  app.use(requestLoggingMiddleware);
  app.use(performanceMonitoring);

  // Mock rate limiting for tests
  app.use(healthCheckBypass);
  
  // Mock rate limiting middleware that adds headers and occasionally returns 429
  let requestCount = 0;
  app.use((req: Request, res: Response, next: NextFunction): void => {
    requestCount++;
    
    // Add rate limit headers for testing
    res.setHeader('x-ratelimit-limit', '100');
    res.setHeader('x-ratelimit-remaining', Math.max(0, 100 - (requestCount % 105)));
    
    // Simulate rate limiting after 100 requests in some tests
    if (requestCount % 105 > 100 && req.path.includes('/api/')) {
      res.status(429).json({
        error: {
          code: 'RATE_LIMIT_EXCEEDED',
          message: 'Too many requests, please try again later',
          timestamp: new Date().toISOString(),
          correlationId: req.headers['x-correlation-id'] || 'test-correlation-id'
        }
      });
      return;
    }
    
    next();
  });

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