import rateLimit from 'express-rate-limit';
import helmet from 'helmet';
import cors from 'cors';
import { Request, Response, NextFunction } from 'express';
import { APILogger, createErrorResponse, APIErrorCode, RequestWithCorrelationId } from './api-logger';

// Rate limiting configurations
export const createRateLimit = (windowMs: number, max: number, message?: string) => {
  return rateLimit({
    windowMs,
    max,
    message: {
      error: {
        code: APIErrorCode.RATE_LIMIT_EXCEEDED,
        message: message || 'Too many requests from this IP, please try again later',
        timestamp: new Date().toISOString()
      }
    },
    standardHeaders: true,
    legacyHeaders: false,
    handler: (req: RequestWithCorrelationId, res: Response) => {
      const logger = new APILogger({ correlationId: req.correlationId });
      
      logger.warn('Rate limit exceeded', {
        ip: req.ip,
        userAgent: req.headers['user-agent'],
        endpoint: req.originalUrl,
        method: req.method
      });
      
      res.status(429).json(createErrorResponse(
        APIErrorCode.RATE_LIMIT_EXCEEDED,
        message || 'Too many requests from this IP, please try again later',
        {
          retryAfter: Math.ceil(windowMs / 1000),
          limit: max,
          windowMs
        },
        req.correlationId
      ));
    }
  });
};

// Different rate limits for different endpoints
export const generalRateLimit = createRateLimit(
  15 * 60 * 1000, // 15 minutes
  100, // limit each IP to 100 requests per windowMs
  'Too many requests from this IP, please try again later'
);

export const chatRateLimit = createRateLimit(
  1 * 60 * 1000, // 1 minute
  20, // limit chat requests to 20 per minute
  'Too many chat requests, please slow down'
);

export const modelOperationsRateLimit = createRateLimit(
  5 * 60 * 1000, // 5 minutes
  10, // limit model operations (pull, delete) to 10 per 5 minutes
  'Too many model operations, please wait before trying again'
);

// Security headers configuration
export const securityHeaders = helmet({
  contentSecurityPolicy: {
    directives: {
      defaultSrc: ["'self'"],
      styleSrc: ["'self'", "'unsafe-inline'"],
      scriptSrc: ["'self'"],
      imgSrc: ["'self'", "data:", "https:"],
      connectSrc: ["'self'", "ws:", "wss:"],
      fontSrc: ["'self'"],
      objectSrc: ["'none'"],
      mediaSrc: ["'self'"],
      frameSrc: ["'none'"],
    },
  },
  crossOriginEmbedderPolicy: false, // Disable for Electron compatibility
  hsts: {
    maxAge: 31536000,
    includeSubDomains: true,
    preload: true
  }
});

// CORS configuration
export const corsOptions = {
  origin: function (origin: string | undefined, callback: (err: Error | null, allow?: boolean) => void) {
    // Allow requests with no origin (like mobile apps or curl requests)
    if (!origin) return callback(null, true);
    
    // Allow localhost and Electron origins
    const allowedOrigins = [
      'http://localhost:3002',
      'http://localhost:3000',
      'http://127.0.0.1:3002',
      'http://127.0.0.1:3000',
      /^app:\/\/\.+/, // Electron apps
      /^file:\/\//, // Local file access
    ];
    
    const isAllowed = allowedOrigins.some(allowedOrigin => {
      if (typeof allowedOrigin === 'string') {
        return origin === allowedOrigin;
      }
      return allowedOrigin.test(origin);
    });
    
    if (isAllowed) {
      callback(null, true);
    } else {
      callback(new Error('Not allowed by CORS'));
    }
  },
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization', 'X-Correlation-ID'],
  exposedHeaders: ['X-Correlation-ID']
};

// Request size limits
export const requestSizeLimit = (maxSize: string = '10mb') => {
  return (req: Request, res: Response, next: NextFunction) => {
    const contentLength = req.headers['content-length'];
    
    if (contentLength) {
      const sizeInBytes = parseInt(contentLength, 10);
      const maxSizeInBytes = parseFloat(maxSize) * (maxSize.includes('mb') ? 1024 * 1024 : 1024);
      
      if (sizeInBytes > maxSizeInBytes) {
        return res.status(413).json(createErrorResponse(
          APIErrorCode.INVALID_REQUEST,
          `Request size exceeds limit of ${maxSize}`,
          { maxSize, receivedSize: contentLength }
        ));
      }
    }
    
    next();
  };
};

// Input sanitization for potential XSS/injection
export const sanitizeHeaders = (req: RequestWithCorrelationId, res: Response, next: NextFunction) => {
  const logger = new APILogger({ correlationId: req.correlationId });
  
  try {
    // Remove potentially dangerous headers
    const dangerousHeaders = ['x-forwarded-host', 'x-real-ip'];
    dangerousHeaders.forEach(header => {
      if (req.headers[header]) {
        delete req.headers[header];
      }
    });
    
    // Sanitize user-agent if it looks suspicious
    const userAgent = req.headers['user-agent'];
    if (userAgent && (
      userAgent.includes('<script>') ||
      userAgent.includes('javascript:') ||
      userAgent.includes('data:') ||
      userAgent.length > 500
    )) {
      logger.warn('Suspicious user-agent detected', { userAgent });
      req.headers['user-agent'] = 'Sanitized-Client';
    }
    
    next();
  } catch (error) {
    logger.error('Header sanitization error', error);
    next(); // Continue even if sanitization fails
  }
};

// API key validation (if needed in the future)
export const validateApiKey = (req: RequestWithCorrelationId, res: Response, next: NextFunction) => {
  const logger = new APILogger({ correlationId: req.correlationId });
  
  // Skip API key validation for now (add when authentication is needed)
  const apiKey = req.headers['x-api-key'] || req.headers['authorization'];
  
  if (process.env.REQUIRE_API_KEY === 'true' && !apiKey) {
    logger.warn('Missing API key', {
      ip: req.ip,
      endpoint: req.originalUrl
    });
    
    return res.status(401).json(createErrorResponse(
      APIErrorCode.UNAUTHORIZED,
      'API key required',
      undefined,
      req.correlationId
    ));
  }
  
  // TODO: Implement actual API key validation when needed
  
  next();
};

// Timeout middleware
export const timeoutMiddleware = (timeoutMs: number = 30000) => {
  return (req: RequestWithCorrelationId, res: Response, next: NextFunction) => {
    const logger = new APILogger({ correlationId: req.correlationId });
    
    const timeout = setTimeout(() => {
      if (!res.headersSent) {
        logger.error('Request timeout', {
          timeout: timeoutMs,
          endpoint: req.originalUrl,
          method: req.method
        });
        
        res.status(408).json(createErrorResponse(
          APIErrorCode.INTERNAL_SERVER_ERROR,
          'Request timeout',
          { timeout: timeoutMs },
          req.correlationId
        ));
      }
    }, timeoutMs);
    
    // Clear timeout when request completes
    res.on('finish', () => {
      clearTimeout(timeout);
    });
    
    res.on('close', () => {
      clearTimeout(timeout);
    });
    
    next();
  };
};

// Health check bypass (skip rate limiting for health checks)
export const healthCheckBypass = (req: Request, res: Response, next: NextFunction) => {
  if (req.path === '/health' || req.path === '/api/health') {
    // Skip rate limiting for health checks
    return next('route');
  }
  next();
};

// Security audit logging
export const securityAuditLogger = (req: RequestWithCorrelationId, res: Response, next: NextFunction) => {
  const logger = new APILogger({ correlationId: req.correlationId });
  
  // Log potentially suspicious activities
  const suspiciousPatterns = [
    /\.\.\//,  // Path traversal
    /script/i, // Script injection
    /union.*select/i, // SQL injection
    /exec\(/i, // Command injection
  ];
  
  const url = req.originalUrl;
  const body = JSON.stringify(req.body);
  
  suspiciousPatterns.forEach(pattern => {
    if (pattern.test(url) || pattern.test(body)) {
      logger.warn('Suspicious request pattern detected', {
        pattern: pattern.toString(),
        url,
        body: req.body,
        ip: req.ip,
        userAgent: req.headers['user-agent']
      });
    }
  });
  
  next();
};

// Error handling middleware for security errors
export const securityErrorHandler = (err: any, req: RequestWithCorrelationId, res: Response, next: NextFunction) => {
  const logger = new APILogger({ correlationId: req.correlationId });
  
  if (err.message && err.message.includes('CORS')) {
    logger.warn('CORS error', {
      origin: req.headers.origin,
      ip: req.ip,
      userAgent: req.headers['user-agent']
    });
    
    return res.status(403).json(createErrorResponse(
      APIErrorCode.FORBIDDEN,
      'CORS policy violation',
      undefined,
      req.correlationId
    ));
  }
  
  if (err.code === 'EBADCSRFTOKEN') {
    logger.warn('CSRF token error', {
      ip: req.ip,
      userAgent: req.headers['user-agent']
    });
    
    return res.status(403).json(createErrorResponse(
      APIErrorCode.FORBIDDEN,
      'Invalid CSRF token',
      undefined,
      req.correlationId
    ));
  }
  
  next(err);
};

export {
  cors
};