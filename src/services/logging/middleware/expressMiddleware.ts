import { Request, Response, NextFunction } from 'express';
import { v4 as uuidv4 } from 'uuid';
import { ILogger } from '../types';

export interface RequestLoggingOptions {
  /**
   * Skip logging for certain paths
   */
  skip?: (req: Request) => boolean;
  
  /**
   * Generate a unique request ID
   */
  generateId?: () => string;
  
  /**
   * Include request body in logs (be careful with sensitive data)
   */
  logBody?: boolean;
  
  /**
   * Include request headers in logs (be careful with sensitive data)
   */
  logHeaders?: boolean;
  
  /**
   * Include response body in logs (can be expensive for large responses)
   */
  logResponseBody?: boolean;
}

/**
 * Create Express middleware for request logging
 */
export function createRequestLogger(logger: ILogger, options: RequestLoggingOptions = {}) {
  const opts = {
    skip: (req: Request) => false,
    generateId: uuidv4,
    logBody: false,
    logHeaders: false,
    logResponseBody: false,
    ...options
  };

  return (req: Request, res: Response, next: NextFunction) => {
    // Skip logging if requested
    if (opts.skip(req)) {
      return next();
    }

    // Generate request ID and add to request/response
    const reqId = opts.generateId();
    req.id = reqId;
    res.setHeader('X-Request-ID', reqId);

    // Create request-specific logger with correlation ID
    const requestLogger = logger.withCategory('http').withCorrelationId(reqId);

    // Get original response methods
    const originalEnd = res.end;
    const originalWrite = res.write;
    
    // Track response timing and data
    const startTime = Date.now();
    let responseBody: Buffer[] = [];
    let responseSize = 0;
    
    // Override write to capture response body if needed
    if (opts.logResponseBody) {
      res.write = function(chunk: any, encoding?: BufferEncoding, callback?: (error: Error | null | undefined) => void): boolean {
        if (Buffer.isBuffer(chunk)) {
          responseBody.push(chunk);
        } else {
          responseBody.push(Buffer.from(chunk));
        }
        responseSize += chunk.length;
        return originalWrite.call(res, chunk, encoding, callback);
      };
    }

    // Override end to log after response is sent
    res.end = function(chunk?: any, encoding?: BufferEncoding, callback?: () => void): Response {
      const duration = Date.now() - startTime;
      
      if (chunk && opts.logResponseBody) {
        if (Buffer.isBuffer(chunk)) {
          responseBody.push(chunk);
        } else if (chunk) {
          responseBody.push(Buffer.from(chunk));
        }
        responseSize += chunk ? chunk.length : 0;
      }

      // Create log context with request details
      const context: Record<string, any> = {
        method: req.method,
        url: req.originalUrl || req.url,
        status: res.statusCode,
        statusMessage: res.statusMessage,
        duration,
        ip: req.ip || req.socket.remoteAddress,
        userAgent: req.get('user-agent'),
        size: responseSize || (res as any)._contentLength,
      };

      // Add request headers if configured
      if (opts.logHeaders) {
        context.headers = req.headers;
      }

      // Add request body if configured and present
      if (opts.logBody && req.body) {
        context.body = req.body;
      }

      // Add response body if configured
      if (opts.logResponseBody && responseBody.length > 0) {
        try {
          // Try to parse as JSON first
          const body = Buffer.concat(responseBody).toString();
          try {
            context.responseBody = JSON.parse(body);
          } catch (e) {
            // If not JSON, just include as string (truncated if too large)
            context.responseBody = body.length > 1000 
              ? body.substring(0, 1000) + '...[truncated]' 
              : body;
          }
        } catch (e) {
          context.responseBody = '[Error parsing response body]';
        }
      }

      // Determine log level based on status code
      if (res.statusCode >= 500) {
        requestLogger.error(`HTTP ${res.statusCode} ${req.method} ${req.originalUrl || req.url}`, context);
      } else if (res.statusCode >= 400) {
        requestLogger.warn(`HTTP ${res.statusCode} ${req.method} ${req.originalUrl || req.url}`, context);
      } else {
        requestLogger.info(`HTTP ${res.statusCode} ${req.method} ${req.originalUrl || req.url}`, context);
      }

      return originalEnd.apply(res, [chunk, encoding, callback]);
    };

    // Log request start
    requestLogger.debug(`Started ${req.method} ${req.originalUrl || req.url}`, {
      method: req.method,
      url: req.originalUrl || req.url,
      ip: req.ip || req.socket.remoteAddress,
      userAgent: req.get('user-agent')
    });

    next();
  };
}

/**
 * Create Express middleware for error logging
 */
export function createErrorLogger(logger: ILogger) {
  return (err: Error, req: Request, res: Response, next: NextFunction) => {
    // Get or create request ID
    const reqId = (req as any).id || req.get('X-Request-ID') || uuidv4();
    
    // Create error-specific logger
    const errorLogger = logger
      .withCategory('http-error')
      .withCorrelationId(reqId);

    // Log the error
    errorLogger.error(`HTTP Error: ${err.message}`, {
      method: req.method,
      url: req.originalUrl || req.url,
      error: {
        name: err.name,
        message: err.message,
        stack: err.stack
      },
      ip: req.ip || req.socket.remoteAddress,
      userAgent: req.get('user-agent')
    });

    next(err);
  };
}

// Add request ID to Express Request interface
declare global {
  namespace Express {
    interface Request {
      id?: string;
    }
  }
} 