import winston from 'winston';
import path from 'path';
import { Request, Response, NextFunction } from 'express';
import { v4 as uuidv4 } from 'uuid';

// Create logs directory if it doesn't exist
import fs from 'fs';
const logsDir = path.join(process.cwd(), 'logs');
if (!fs.existsSync(logsDir)) {
  fs.mkdirSync(logsDir, { recursive: true });
}

// Configure Winston logger
const logger = winston.createLogger({
  level: process.env.LOG_LEVEL || 'info',
  format: winston.format.combine(
    winston.format.timestamp({
      format: 'YYYY-MM-DD HH:mm:ss.SSS'
    }),
    winston.format.errors({ stack: true }),
    winston.format.json()
  ),
  defaultMeta: {
    service: 'mcp-desktop-api',
    version: process.env.npm_package_version || '1.0.0'
  },
  transports: [
    // Write all logs to console
    new winston.transports.Console({
      format: winston.format.combine(
        winston.format.colorize(),
        winston.format.simple()
      )
    }),
    // Write all logs with level `info` and below to `combined.log`
    new winston.transports.File({
      filename: path.join(logsDir, 'api-error.log'),
      level: 'error',
      maxsize: 10 * 1024 * 1024, // 10MB
      maxFiles: 5
    }),
    new winston.transports.File({
      filename: path.join(logsDir, 'api-combined.log'),
      maxsize: 10 * 1024 * 1024, // 10MB
      maxFiles: 5
    })
  ]
});

// Request correlation middleware
export interface RequestWithCorrelationId extends Request {
  correlationId?: string;
  startTime?: number;
}

export const correlationMiddleware = (req: RequestWithCorrelationId, res: Response, next: NextFunction) => {
  req.correlationId = req.headers['x-correlation-id'] as string || uuidv4();
  req.startTime = Date.now();
  
  // Add correlation ID to response headers
  res.setHeader('X-Correlation-ID', req.correlationId);
  
  // Log incoming request
  logger.info('Incoming request', {
    correlationId: req.correlationId,
    method: req.method,
    url: req.originalUrl,
    userAgent: req.headers['user-agent'],
    ip: req.ip,
    timestamp: new Date().toISOString()
  });
  
  next();
};

// Request logging middleware
export const requestLoggingMiddleware = (req: RequestWithCorrelationId, res: Response, next: NextFunction) => {
  const originalSend = res.send;
  
  res.send = function(data) {
    const duration = req.startTime ? Date.now() - req.startTime : 0;
    
    logger.info('Request completed', {
      correlationId: req.correlationId,
      method: req.method,
      url: req.originalUrl,
      statusCode: res.statusCode,
      duration: `${duration}ms`,
      contentLength: res.get('content-length') || 0,
      timestamp: new Date().toISOString()
    });
    
    return originalSend.call(this, data);
  };
  
  next();
};

// Structured logging interface
export interface LogContext {
  correlationId?: string;
  userId?: string;
  modelName?: string;
  endpoint?: string;
  duration?: number;
  [key: string]: any;
}

// API Logger class
export class APILogger {
  private context: LogContext;
  
  constructor(baseContext: LogContext = {}) {
    this.context = baseContext;
  }
  
  withContext(additionalContext: LogContext): APILogger {
    return new APILogger({ ...this.context, ...additionalContext });
  }
  
  info(message: string, meta: LogContext = {}) {
    logger.info(message, { ...this.context, ...meta });
  }
  
  warn(message: string, meta: LogContext = {}) {
    logger.warn(message, { ...this.context, ...meta });
  }
  
  error(message: string, error?: Error | unknown, meta: LogContext = {}) {
    const errorMeta = error instanceof Error ? {
      error: {
        message: error.message,
        stack: error.stack,
        name: error.name
      }
    } : error ? { error } : {};
    
    logger.error(message, { ...this.context, ...meta, ...errorMeta });
  }
  
  debug(message: string, meta: LogContext = {}) {
    logger.debug(message, { ...this.context, ...meta });
  }
  
  // Performance timing
  time(label: string): () => void {
    const start = Date.now();
    return () => {
      const duration = Date.now() - start;
      this.info(`Timer: ${label}`, { duration: duration });
    };
  }
  
  // Chat-specific logging methods
  chatRequest(modelName: string, messageCount: number, meta: LogContext = {}) {
    this.info('Chat request initiated', {
      modelName,
      messageCount,
      ...meta
    });
  }
  
  chatResponse(modelName: string, responseLength: number, duration: number, meta: LogContext = {}) {
    this.info('Chat response completed', {
      modelName,
      responseLength,
      duration: duration,
      ...meta
    });
  }
  
  chatError(modelName: string, error: Error | unknown, meta: LogContext = {}) {
    this.error('Chat request failed', error, {
      modelName,
      ...meta
    });
  }
  
  streamStart(modelName: string, meta: LogContext = {}) {
    this.info('Stream started', {
      modelName,
      ...meta
    });
  }
  
  streamChunk(modelName: string, chunkSize: number, meta: LogContext = {}) {
    this.debug('Stream chunk sent', {
      modelName,
      chunkSize,
      ...meta
    });
  }
  
  streamEnd(modelName: string, totalChunks: number, duration: number, meta: LogContext = {}) {
    this.info('Stream completed', {
      modelName,
      totalChunks,
      duration: duration,
      ...meta
    });
  }
  
  streamError(modelName: string, error: Error | unknown, meta: LogContext = {}) {
    this.error('Stream failed', error, {
      modelName,
      ...meta
    });
  }
  
  modelOperation(operation: string, modelName: string, meta: LogContext = {}) {
    this.info(`Model ${operation}`, {
      operation,
      modelName,
      ...meta
    });
  }
}

// Factory function to create logger with request context
export const createRequestLogger = (req: RequestWithCorrelationId): APILogger => {
  return new APILogger({
    correlationId: req.correlationId,
    method: req.method,
    url: req.originalUrl,
    ip: req.ip
  });
};

// Error response standardization
export interface StandardErrorResponse {
  error: {
    code: string;
    message: string;
    details?: any;
    correlationId?: string;
    timestamp: string;
  };
}

export interface StandardSuccessResponse<T = any> {
  success: true;
  data: T;
  correlationId?: string;
  timestamp: string;
}

// Error response helper
export const createErrorResponse = (
  code: string,
  message: string,
  details?: any,
  correlationId?: string
): StandardErrorResponse => ({
  error: {
    code,
    message,
    details,
    correlationId,
    timestamp: new Date().toISOString()
  }
});

// Success response helper
export const createSuccessResponse = <T>(
  data: T,
  correlationId?: string
): StandardSuccessResponse<T> => ({
  success: true,
  data,
  correlationId,
  timestamp: new Date().toISOString()
});

// Error codes enum
export enum APIErrorCode {
  // Validation errors
  INVALID_REQUEST = 'INVALID_REQUEST',
  MISSING_REQUIRED_FIELD = 'MISSING_REQUIRED_FIELD',
  INVALID_MODEL_NAME = 'INVALID_MODEL_NAME',
  INVALID_MESSAGE_FORMAT = 'INVALID_MESSAGE_FORMAT',
  MESSAGE_TOO_LONG = 'MESSAGE_TOO_LONG',
  
  // Model errors
  MODEL_NOT_FOUND = 'MODEL_NOT_FOUND',
  MODEL_NOT_READY = 'MODEL_NOT_READY',
  MODEL_UNAVAILABLE = 'MODEL_UNAVAILABLE',
  
  // Service errors
  OLLAMA_SERVICE_UNAVAILABLE = 'OLLAMA_SERVICE_UNAVAILABLE',
  OLLAMA_REQUEST_FAILED = 'OLLAMA_REQUEST_FAILED',
  OLLAMA_TIMEOUT = 'OLLAMA_TIMEOUT',
  
  // System errors
  INTERNAL_SERVER_ERROR = 'INTERNAL_SERVER_ERROR',
  DATABASE_ERROR = 'DATABASE_ERROR',
  NETWORK_ERROR = 'NETWORK_ERROR',
  
  // Rate limiting
  RATE_LIMIT_EXCEEDED = 'RATE_LIMIT_EXCEEDED',
  
  // Authentication
  UNAUTHORIZED = 'UNAUTHORIZED',
  FORBIDDEN = 'FORBIDDEN'
}

export default logger;