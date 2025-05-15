import { LoggerService } from '../../src/services/logging/LoggerService';
import { LogLevel, LogEntry, LogTransport } from '../../src/services/logging/types';

// Mock transport for testing
class MockTransport implements LogTransport {
  public logs: LogEntry[] = [];
  
  async log(entry: LogEntry): Promise<void> {
    this.logs.push(entry);
  }

  async rotate(): Promise<void> {
    // Nothing to do for mock
  }

  async cleanup(): Promise<void> {
    this.logs = [];
  }

  getLogs(level?: LogLevel): LogEntry[] {
    if (level) {
      return this.logs.filter(entry => entry.level === level);
    }
    return this.logs;
  }

  clear(): void {
    this.logs = [];
  }
}

describe('LoggerService', () => {
  let logger: LoggerService;
  let mockTransport: MockTransport;

  beforeEach(() => {
    logger = new LoggerService({
      defaultLevel: LogLevel.INFO,
      transports: {
        mock: {
          level: LogLevel.DEBUG
        }
      }
    });
    
    mockTransport = new MockTransport();
    logger.registerTransport('mock', mockTransport);
  });

  afterEach(() => {
    mockTransport.clear();
  });

  describe('Log Levels', () => {
    it('respects minimum log level', async () => {
      // Create a transport with INFO level
      const infoTransport = new MockTransport();
      logger.registerTransport('info', infoTransport);
      logger['config'].transports['info'] = { level: LogLevel.INFO };
      
      // Log at DEBUG level
      await logger.debug('Debug message');
      
      // Check transports
      expect(mockTransport.getLogs()).toHaveLength(1); // DEBUG transport should receive it
      expect(infoTransport.getLogs()).toHaveLength(0); // INFO transport should not
      
      // Log at INFO level
      await logger.info('Info message');
      
      // Both should receive it
      expect(mockTransport.getLogs()).toHaveLength(2);
      expect(infoTransport.getLogs()).toHaveLength(1);
    });

    it('logs at all levels', async () => {
      await logger.debug('Debug message');
      await logger.info('Info message');
      await logger.warn('Warning message');
      await logger.error('Error message');
      await logger.fatal('Fatal message');
      
      expect(mockTransport.getLogs(LogLevel.DEBUG)).toHaveLength(1);
      expect(mockTransport.getLogs(LogLevel.INFO)).toHaveLength(1);
      expect(mockTransport.getLogs(LogLevel.WARN)).toHaveLength(1);
      expect(mockTransport.getLogs(LogLevel.ERROR)).toHaveLength(1);
      expect(mockTransport.getLogs(LogLevel.FATAL)).toHaveLength(1);
      expect(mockTransport.getLogs()).toHaveLength(5);
    });
  });

  describe('Context', () => {
    it('includes context in log entries', async () => {
      await logger.info('Message with context', { key: 'value' });
      
      const logs = mockTransport.getLogs();
      expect(logs).toHaveLength(1);
      expect(logs[0].context).toEqual(expect.objectContaining({ key: 'value' }));
    });

    it('maintains context across calls', async () => {
      const contextLogger = logger.withContext({ userId: '123' });
      
      await contextLogger.info('User action');
      
      const logs = mockTransport.getLogs();
      expect(logs).toHaveLength(1);
      expect(logs[0].context).toEqual(expect.objectContaining({ userId: '123' }));
    });

    it('merges context from different sources', async () => {
      const baseLogger = logger.withContext({ app: 'test' });
      const userLogger = baseLogger.withContext({ userId: '123' });
      
      await userLogger.info('User login', { action: 'login' });
      
      const logs = mockTransport.getLogs();
      expect(logs).toHaveLength(1);
      expect(logs[0].context).toEqual(expect.objectContaining({
        app: 'test',
        userId: '123',
        action: 'login'
      }));
    });
  });

  describe('Categories', () => {
    it('sets category on logger', async () => {
      const dbLogger = logger.withCategory('database');
      await dbLogger.info('Database connected');
      
      const logs = mockTransport.getLogs();
      expect(logs).toHaveLength(1);
      expect(logs[0].category).toBe('database');
    });

    it('category-specific loggers do not affect each other', async () => {
      const dbLogger = logger.withCategory('database');
      const httpLogger = logger.withCategory('http');
      
      await dbLogger.info('Database connected');
      await httpLogger.info('HTTP request received');
      
      const logs = mockTransport.getLogs();
      expect(logs).toHaveLength(2);
      expect(logs[0].category).toBe('database');
      expect(logs[1].category).toBe('http');
    });
  });

  describe('Error Logging', () => {
    it('logs error objects with stack traces', async () => {
      const error = new Error('Test error');
      await logger.logError(error);
      
      const logs = mockTransport.getLogs();
      expect(logs).toHaveLength(1);
      expect(logs[0].level).toBe(LogLevel.ERROR);
      expect(logs[0].message).toBe('Test error');
      expect(logs[0].context).toHaveProperty('stack');
      expect(logs[0].context).toHaveProperty('name', 'Error');
    });
  });

  describe('Correlation IDs', () => {
    it('adds correlation ID to log entries', async () => {
      const correlatedLogger = logger.withCorrelationId('request-123');
      await correlatedLogger.info('Handling request');
      
      const logs = mockTransport.getLogs();
      expect(logs).toHaveLength(1);
      expect(logs[0].correlationId).toBe('request-123');
    });
  });

  describe('Transport Management', () => {
    it('allows transports to be added and removed dynamically', async () => {
      // Create an additional transport
      const secondTransport = new MockTransport();
      logger.registerTransport('second', secondTransport);
      logger['config'].transports['second'] = { level: LogLevel.INFO };
      
      // Log a message
      await logger.info('Test message');
      
      // Both transports should receive it
      expect(mockTransport.getLogs()).toHaveLength(1);
      expect(secondTransport.getLogs()).toHaveLength(1);
      
      // Remove the second transport
      const removed = logger.removeTransport('second');
      expect(removed).toBe(true);
      
      // Log another message
      await logger.info('After removal');
      
      // Only the first transport should receive it
      expect(mockTransport.getLogs()).toHaveLength(2);
      expect(secondTransport.getLogs()).toHaveLength(1);
    });
    
    it('handles errors in transports gracefully', async () => {
      // Create a transport that throws errors
      const errorTransport: LogTransport = {
        log: jest.fn().mockRejectedValue(new Error('Transport failure'))
      };
      
      // Spy on console.error
      const consoleErrorSpy = jest.spyOn(console, 'error');
      consoleErrorSpy.mockImplementation(() => {});
      
      logger.registerTransport('error', errorTransport);
      logger['config'].transports['error'] = { level: LogLevel.INFO };
      
      // Log should not throw despite transport error
      await expect(logger.info('This should not throw')).resolves.not.toThrow();
      
      // Error should be logged to console
      expect(consoleErrorSpy).toHaveBeenCalled();
      expect(errorTransport.log).toHaveBeenCalled();
      
      // Cleanup
      consoleErrorSpy.mockRestore();
    });
  });

  describe('Caller Information', () => {
    it('captures source information in log entries', async () => {
      await logger.info('Message with source');
      
      const logs = mockTransport.getLogs();
      expect(logs[0].source).toBeDefined();
      // The source might vary depending on Jest environment
      // Just verify it's a string with some content
      expect(typeof logs[0].source).toBe('string');
      expect(logs[0].source?.length || 0).toBeGreaterThan(0);
    });
    
    it('handles different call stacks correctly', async () => {
      // Define a function that logs at a different call depth
      function nestedLog() {
        return logger.info('Nested log message');
      }
      
      await nestedLog();
      
      const logs = mockTransport.getLogs();
      expect(logs[0].source).toBeDefined();
      // The source might vary depending on Jest environment
      // Just verify it's a string with some content
      expect(typeof logs[0].source).toBe('string');
      expect(logs[0].source?.length || 0).toBeGreaterThan(0);
    });
  });

  describe('Log Filtering', () => {
    it('filters logs by category', async () => {
      // Create category-specific transports
      const dbTransport = new MockTransport();
      const httpTransport = new MockTransport();
      
      logger.registerTransport('db', dbTransport);
      logger.registerTransport('http', httpTransport);
      
      logger['config'].transports['db'] = { 
        level: LogLevel.INFO,
        category: ['database']
      };
      
      logger['config'].transports['http'] = { 
        level: LogLevel.INFO,
        category: ['http']
      };
      
      // Create category loggers
      const dbLogger = logger.withCategory('database');
      const httpLogger = logger.withCategory('http');
      const appLogger = logger.withCategory('app');
      
      // Log to each category
      await dbLogger.info('Database message');
      await httpLogger.info('HTTP message');
      await appLogger.info('App message');
      
      // Check filtering
      expect(dbTransport.getLogs()).toHaveLength(1);
      expect(dbTransport.getLogs()[0].message).toBe('Database message');
      
      expect(httpTransport.getLogs()).toHaveLength(1);
      expect(httpTransport.getLogs()[0].message).toBe('HTTP message');
      
      // The original transport should get all messages
      expect(mockTransport.getLogs()).toHaveLength(3);
    });
  });

  describe('Performance', () => {
    it('handles high volume logging without errors', async () => {
      const logCount = 1000;
      const promises = [];
      
      for (let i = 0; i < logCount; i++) {
        promises.push(logger.info(`Message ${i}`));
      }
      
      await Promise.all(promises);
      expect(mockTransport.getLogs()).toHaveLength(logCount);
    });
  });

  describe('Singleton Pattern', () => {
    it('returns the same instance from getInstance', () => {
      const instance1 = LoggerService.getInstance();
      const instance2 = LoggerService.getInstance();
      
      expect(instance1).toBe(instance2);
    });
    
    it('configures the singleton with default values', () => {
      // Reset the instance to test default initialization
      (LoggerService as any)['instance'] = undefined;
      
      // Get a fresh instance
      const instance = LoggerService.getInstance();
      
      // Register a transport to ensure it works
      instance.registerTransport('console', new MockTransport());
      expect(instance['transports'].size).toBeGreaterThan(0);
      
      // Default category should be 'app'
      expect(instance['category']).toBe('app');
    });
  });
}); 