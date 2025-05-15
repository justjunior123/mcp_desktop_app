import { Request, Response, NextFunction } from 'express';
import { createRequestLogger, createErrorLogger } from '../../src/services/logging/middleware/expressMiddleware';
import { LoggerService } from '../../src/services/logging/LoggerService';
import { LogLevel, LogEntry, LogTransport, ILogger } from '../../src/services/logging/types';
import { EventEmitter } from 'events';

// Mock HTTP objects
class MockRequest extends EventEmitter {
  method: string = 'GET';
  url: string = '/test';
  originalUrl: string = '/test';
  headers: Record<string, string> = {};
  body: any = {};
  ip: string = '127.0.0.1';
  id?: string;
  
  constructor(options: Partial<MockRequest> = {}) {
    super();
    Object.assign(this, options);
  }
  
  get(header: string): string | undefined {
    return this.headers[header.toLowerCase()];
  }
}

class MockResponse extends EventEmitter {
  statusCode: number = 200;
  statusMessage: string = 'OK';
  headersSent: boolean = false;
  _headers: Record<string, string> = {};
  _contentLength?: number;
  
  constructor() {
    super();
    this.end = jest.fn().mockImplementation(() => this);
    this.write = jest.fn().mockReturnValue(true);
    this.setHeader = jest.fn().mockImplementation((name, value) => {
      this._headers[name.toLowerCase()] = value;
    });
    this.getHeader = jest.fn().mockImplementation((name) => {
      return this._headers[name.toLowerCase()];
    });
  }
  
  status(code: number): this {
    this.statusCode = code;
    return this;
  }
  
  json(body: any): this {
    this.end(JSON.stringify(body));
    return this;
  }
  
  end: jest.Mock;
  write: jest.Mock;
  setHeader: jest.Mock;
  getHeader: jest.Mock;
}

// Mock logger
class MockLogger implements ILogger {
  logs: Array<{level: LogLevel, message: string, context?: Record<string, any>}> = [];
  
  constructor() {
    this.debug = jest.fn().mockImplementation((message, context) => {
      this.logs.push({ level: LogLevel.DEBUG, message, context });
      return Promise.resolve();
    });
    
    this.info = jest.fn().mockImplementation((message, context) => {
      this.logs.push({ level: LogLevel.INFO, message, context });
      return Promise.resolve();
    });
    
    this.warn = jest.fn().mockImplementation((message, context) => {
      this.logs.push({ level: LogLevel.WARN, message, context });
      return Promise.resolve();
    });
    
    this.error = jest.fn().mockImplementation((message, context) => {
      this.logs.push({ level: LogLevel.ERROR, message, context });
      return Promise.resolve();
    });
    
    this.fatal = jest.fn().mockImplementation((message, context) => {
      this.logs.push({ level: LogLevel.FATAL, message, context });
      return Promise.resolve();
    });
    
    this.withCategory = jest.fn().mockReturnThis();
    this.withContext = jest.fn().mockReturnThis();
    this.withCorrelationId = jest.fn().mockReturnThis();
  }
  
  debug: jest.Mock;
  info: jest.Mock;
  warn: jest.Mock;
  error: jest.Mock;
  fatal: jest.Mock;
  
  withCategory: jest.Mock;
  withContext: jest.Mock;
  withCorrelationId: jest.Mock;
}

describe('Express Logging Middleware', () => {
  let mockLogger: MockLogger;
  let mockRequest: MockRequest;
  let mockResponse: MockResponse;
  let nextFunction: jest.Mock;
  
  beforeEach(() => {
    mockLogger = new MockLogger();
    mockRequest = new MockRequest();
    mockResponse = new MockResponse();
    nextFunction = jest.fn();
  });
  
  describe('Request Logger', () => {
    it('adds a request ID to the request object', () => {
      const middleware = createRequestLogger(mockLogger);
      middleware(mockRequest as any, mockResponse as any, nextFunction);
      
      expect(mockRequest.id).toBeDefined();
      expect(mockResponse.setHeader).toHaveBeenCalledWith('X-Request-ID', mockRequest.id);
    });
    
    it('logs the start of a request', () => {
      const middleware = createRequestLogger(mockLogger);
      middleware(mockRequest as any, mockResponse as any, nextFunction);
      
      expect(mockLogger.debug).toHaveBeenCalled();
      expect(mockLogger.withCategory).toHaveBeenCalledWith('http');
      expect(mockLogger.withCorrelationId).toHaveBeenCalled();
    });
    
    it('logs successful responses as info', () => {
      const middleware = createRequestLogger(mockLogger);
      middleware(mockRequest as any, mockResponse as any, nextFunction);
      
      // Simulate response completion
      mockResponse.statusCode = 200;
      mockResponse.end();
      
      // Verify that info was logged for 2xx
      expect(mockLogger.info).toHaveBeenCalled();
      expect(mockLogger.info.mock.calls[0][0]).toContain('HTTP 200');
    });
    
    it('logs client errors as warnings', () => {
      const middleware = createRequestLogger(mockLogger);
      middleware(mockRequest as any, mockResponse as any, nextFunction);
      
      // Simulate client error
      mockResponse.statusCode = 404;
      mockResponse.end();
      
      // Verify that warn was logged for 4xx
      expect(mockLogger.warn).toHaveBeenCalled();
      expect(mockLogger.warn.mock.calls[0][0]).toContain('HTTP 404');
    });
    
    it('logs server errors as errors', () => {
      const middleware = createRequestLogger(mockLogger);
      middleware(mockRequest as any, mockResponse as any, nextFunction);
      
      // Simulate server error
      mockResponse.statusCode = 500;
      mockResponse.end();
      
      // Verify that error was logged for 5xx
      expect(mockLogger.error).toHaveBeenCalled();
      expect(mockLogger.error.mock.calls[0][0]).toContain('HTTP 500');
    });
    
    it('respects the skip option', () => {
      const middleware = createRequestLogger(mockLogger, {
        skip: () => true
      });
      
      middleware(mockRequest as any, mockResponse as any, nextFunction);
      
      // Should skip logging and just call next
      expect(nextFunction).toHaveBeenCalled();
      expect(mockLogger.debug).not.toHaveBeenCalled();
    });
    
    it('includes request body when configured', () => {
      const middleware = createRequestLogger(mockLogger, {
        logBody: true
      });
      
      mockRequest.body = { user: 'test' };
      middleware(mockRequest as any, mockResponse as any, nextFunction);
      
      // Simulate response completion
      mockResponse.end();
      
      // Get the context passed to the logger
      const logContext = mockLogger.info.mock.calls[0][1];
      
      // Verify body is included
      expect(logContext).toHaveProperty('body', { user: 'test' });
    });
    
    it('includes request headers when configured', () => {
      const middleware = createRequestLogger(mockLogger, {
        logHeaders: true
      });
      
      mockRequest.headers = { 'user-agent': 'test-agent' };
      middleware(mockRequest as any, mockResponse as any, nextFunction);
      
      // Simulate response completion
      mockResponse.end();
      
      // Get the context passed to the logger
      const logContext = mockLogger.info.mock.calls[0][1];
      
      // Verify headers are included
      expect(logContext).toHaveProperty('headers', { 'user-agent': 'test-agent' });
    });
    
    it('includes response duration', () => {
      // Mock Date.now to control timing
      const realNow = Date.now;
      const mockNow = jest.fn()
        .mockReturnValueOnce(1000) // Start time
        .mockReturnValueOnce(1500); // End time = 500ms later
      
      Date.now = mockNow;
      
      const middleware = createRequestLogger(mockLogger);
      middleware(mockRequest as any, mockResponse as any, nextFunction);
      
      // Simulate response completion
      mockResponse.end();
      
      // Get the context passed to the logger
      const logContext = mockLogger.info.mock.calls[0][1];
      
      // Verify duration is included and accurate
      expect(logContext).toHaveProperty('duration', 500);
      
      // Restore original Date.now
      Date.now = realNow;
    });
  });
  
  describe('Error Logger', () => {
    it('logs errors with appropriate context', () => {
      const middleware = createErrorLogger(mockLogger);
      const error = new Error('Test error');
      
      middleware(error, mockRequest as any, mockResponse as any, nextFunction);
      
      expect(mockLogger.error).toHaveBeenCalled();
      expect(mockLogger.error.mock.calls[0][0]).toContain('Test error');
      
      const context = mockLogger.error.mock.calls[0][1];
      expect(context).toHaveProperty('error.name', 'Error');
      expect(context).toHaveProperty('error.message', 'Test error');
      expect(context).toHaveProperty('error.stack');
    });
    
    it('uses existing request ID if available', () => {
      const middleware = createErrorLogger(mockLogger);
      const error = new Error('Test error');
      
      mockRequest.id = 'existing-id';
      middleware(error, mockRequest as any, mockResponse as any, nextFunction);
      
      expect(mockLogger.withCorrelationId).toHaveBeenCalledWith('existing-id');
    });
    
    it('creates a new request ID if none exists', () => {
      const middleware = createErrorLogger(mockLogger);
      const error = new Error('Test error');
      
      middleware(error, mockRequest as any, mockResponse as any, nextFunction);
      
      expect(mockLogger.withCorrelationId).toHaveBeenCalled();
      expect(mockLogger.withCorrelationId.mock.calls[0][0]).not.toBe(undefined);
    });
    
    it('uses X-Request-ID header if no request ID', () => {
      const middleware = createErrorLogger(mockLogger);
      const error = new Error('Test error');
      
      mockRequest.headers['x-request-id'] = 'header-id';
      middleware(error, mockRequest as any, mockResponse as any, nextFunction);
      
      expect(mockLogger.withCorrelationId).toHaveBeenCalledWith('header-id');
    });
    
    it('calls next with the error', () => {
      const middleware = createErrorLogger(mockLogger);
      const error = new Error('Test error');
      
      middleware(error, mockRequest as any, mockResponse as any, nextFunction);
      
      expect(nextFunction).toHaveBeenCalledWith(error);
    });
  });
}); 