import { Request, Response, NextFunction } from 'express';
import { APILogger, createErrorResponse, APIErrorCode, RequestWithCorrelationId } from './api-logger';
import { OllamaError } from '../services/ollama/errors';

// Global error handler
export const globalErrorHandler = (
  error: any,
  req: RequestWithCorrelationId,
  res: Response,
  next: NextFunction
) => {
  const logger = new APILogger({ correlationId: req.correlationId });
  
  // Log the error with full context
  logger.error('Unhandled error in API request', error, {
    method: req.method,
    url: req.originalUrl,
    userAgent: req.headers['user-agent'],
    ip: req.ip,
    body: req.body,
    params: req.params,
    query: req.query
  });
  
  // Don't send error response if headers already sent
  if (res.headersSent) {
    return next(error);
  }
  
  // Handle specific error types
  if (error instanceof OllamaError) {
    const statusCode = error.statusCode || 500;
    let apiErrorCode = APIErrorCode.OLLAMA_REQUEST_FAILED;
    
    if (error.message.includes('timeout')) {
      apiErrorCode = APIErrorCode.OLLAMA_TIMEOUT;
    } else if (error.message.includes('connection') || error.message.includes('ECONNREFUSED')) {
      apiErrorCode = APIErrorCode.OLLAMA_SERVICE_UNAVAILABLE;
    } else if (error.message.includes('not found')) {
      apiErrorCode = APIErrorCode.MODEL_NOT_FOUND;
    }
    
    return res.status(statusCode).json(createErrorResponse(
      apiErrorCode,
      error.message,
      { errorType: 'OllamaError' },
      req.correlationId
    ));
  }
  
  // Handle validation errors (from Zod or other validators)
  if (error.name === 'ZodError' || error.issues) {
    return res.status(400).json(createErrorResponse(
      APIErrorCode.INVALID_REQUEST,
      'Request validation failed',
      { 
        validationErrors: error.issues || error.errors,
        errorType: 'ValidationError'
      },
      req.correlationId
    ));
  }
  
  // Handle database errors
  if (error.code && error.code.startsWith('P')) { // Prisma error codes
    logger.error('Database error', error);
    return res.status(500).json(createErrorResponse(
      APIErrorCode.DATABASE_ERROR,
      'Database operation failed',
      { 
        errorType: 'DatabaseError',
        // Don't expose internal database details
        code: 'DB_ERROR'
      },
      req.correlationId
    ));
  }
  
  // Handle network/connection errors
  if (error.code === 'ECONNREFUSED' || error.code === 'ENOTFOUND' || error.code === 'ETIMEDOUT') {
    return res.status(503).json(createErrorResponse(
      APIErrorCode.NETWORK_ERROR,
      'External service unavailable',
      { 
        errorType: 'NetworkError',
        service: 'ollama'
      },
      req.correlationId
    ));
  }
  
  // Handle rate limiting errors
  if (error.status === 429) {
    return res.status(429).json(createErrorResponse(
      APIErrorCode.RATE_LIMIT_EXCEEDED,
      'Rate limit exceeded',
      { errorType: 'RateLimitError' },
      req.correlationId
    ));
  }
  
  // Handle authentication errors
  if (error.status === 401) {
    return res.status(401).json(createErrorResponse(
      APIErrorCode.UNAUTHORIZED,
      'Authentication required',
      { errorType: 'AuthError' },
      req.correlationId
    ));
  }
  
  // Handle authorization errors
  if (error.status === 403) {
    return res.status(403).json(createErrorResponse(
      APIErrorCode.FORBIDDEN,
      'Access forbidden',
      { errorType: 'AuthorizationError' },
      req.correlationId
    ));
  }
  
  // Handle syntax errors (malformed JSON, etc.)
  if (error instanceof SyntaxError && 'body' in error) {
    return res.status(400).json(createErrorResponse(
      APIErrorCode.INVALID_REQUEST,
      'Invalid JSON in request body',
      { errorType: 'SyntaxError' },
      req.correlationId
    ));
  }
  
  // Default error handling
  const statusCode = error.status || error.statusCode || 500;
  const message = process.env.NODE_ENV === 'production' 
    ? 'Internal server error' 
    : (error.message || 'Unknown error');
  
  res.status(statusCode).json(createErrorResponse(
    APIErrorCode.INTERNAL_SERVER_ERROR,
    message,
    process.env.NODE_ENV === 'development' ? {
      errorType: error.constructor.name,
      stack: error.stack,
      details: error
    } : { errorType: 'InternalError' },
    req.correlationId
  ));
};

// 404 handler
export const notFoundHandler = (req: RequestWithCorrelationId, res: Response) => {
  const logger = new APILogger({ correlationId: req.correlationId });
  
  logger.warn('Route not found', {
    method: req.method,
    url: req.originalUrl,
    ip: req.ip,
    userAgent: req.headers['user-agent']
  });
  
  res.status(404).json(createErrorResponse(
    'ROUTE_NOT_FOUND',
    `Route ${req.method} ${req.originalUrl} not found`,
    {
      method: req.method,
      path: req.originalUrl,
      availableRoutes: [
        'GET /api/models',
        'GET /api/models/:name',
        'POST /api/models/:name/pull',
        'PUT /api/models/:name/config',
        'DELETE /api/models/:name',
        'POST /api/chat',
        'POST /api/chat/stream'
      ]
    },
    req.correlationId
  ));
};

// Async error wrapper
export const asyncErrorHandler = (fn: Function) => {
  return (req: RequestWithCorrelationId, res: Response, next: NextFunction) => {
    Promise.resolve(fn(req, res, next)).catch(next);
  };
};

// Error recovery middleware
export const errorRecoveryMiddleware = (
  error: any,
  req: RequestWithCorrelationId,
  res: Response,
  next: NextFunction
) => {
  const logger = new APILogger({ correlationId: req.correlationId });
  
  // Attempt to recover from certain types of errors
  if (error.code === 'ECONNRESET' || error.code === 'EPIPE') {
    logger.warn('Client connection reset, cleaning up', {
      errorCode: error.code,
      url: req.originalUrl
    });
    
    // Client disconnected, just clean up and don't send response
    return;
  }
  
  // For timeout errors, try to clean up any ongoing operations
  if (error.code === 'ETIMEDOUT' || error.message?.includes('timeout')) {
    logger.warn('Request timeout, attempting cleanup', {
      url: req.originalUrl,
      method: req.method
    });
    
    // Could add cleanup logic here for ongoing operations
  }
  
  // Pass to main error handler
  next(error);
};

// Health check error handler
export const healthCheckErrorHandler = (req: Request, res: Response, next: NextFunction) => {
  const logger = new APILogger();
  
  if (req.path === '/health' || req.path === '/api/health') {
    return res.status(200).json({
      status: 'ok',
      timestamp: new Date().toISOString(),
      service: 'mcp-desktop-api',
      version: process.env.npm_package_version || '1.0.0'
    });
  }
  
  next();
};

// Performance monitoring middleware
export const performanceMonitoring = (req: RequestWithCorrelationId, res: Response, next: NextFunction) => {
  const logger = new APILogger({ correlationId: req.correlationId });
  const startTime = Date.now();
  
  // Monitor response time
  res.on('finish', () => {
    const duration = Date.now() - startTime;
    const statusCode = res.statusCode;
    
    // Log slow requests
    if (duration > 5000) { // 5 seconds
      logger.warn('Slow request detected', {
        duration: duration,
        method: req.method,
        url: req.originalUrl,
        statusCode
      });
    }
    
    // Log error responses
    if (statusCode >= 400) {
      logger.info('Error response', {
        statusCode,
        method: req.method,
        url: req.originalUrl,
        duration: duration
      });
    }
    
    // Performance metrics (could be sent to monitoring service)
    if (process.env.NODE_ENV === 'development') {
      logger.debug('Request performance', {
        method: req.method,
        url: req.originalUrl,
        statusCode,
        duration: duration,
        contentLength: res.get('content-length') || 0
      });
    }
  });
  
  next();
};

// Circuit breaker pattern for external services
export class CircuitBreaker {
  private failures: number = 0;
  private lastFailureTime: number = 0;
  private isOpen: boolean = false;
  
  constructor(
    private failureThreshold: number = 5,
    private resetTimeoutMs: number = 60000, // 1 minute
    private serviceName: string = 'external-service'
  ) {}
  
  async execute<T>(operation: () => Promise<T>): Promise<T> {
    if (this.isOpen) {
      const now = Date.now();
      if (now - this.lastFailureTime > this.resetTimeoutMs) {
        // Try to reset circuit breaker
        this.isOpen = false;
        this.failures = 0;
      } else {
        throw new Error(`Circuit breaker is open for ${this.serviceName}`);
      }
    }
    
    try {
      const result = await operation();
      // Reset on success
      this.failures = 0;
      return result;
    } catch (error) {
      this.failures++;
      this.lastFailureTime = Date.now();
      
      if (this.failures >= this.failureThreshold) {
        this.isOpen = true;
      }
      
      throw error;
    }
  }
  
  getStatus() {
    return {
      isOpen: this.isOpen,
      failures: this.failures,
      lastFailureTime: this.lastFailureTime,
      serviceName: this.serviceName
    };
  }
}

// Create circuit breaker instance for Ollama service
export const ollamaCircuitBreaker = new CircuitBreaker(5, 60000, 'ollama-service');