import { LogLevel, LogEntry, LogTransport, LoggerConfig, ILogger } from './types';

/**
 * Core logger service that manages log transports and provides logging methods
 */
export class LoggerService implements ILogger {
  private static instance: LoggerService;
  private transports: Map<string, LogTransport> = new Map();
  private config: LoggerConfig;
  private category: string = 'app';
  private context: Record<string, unknown> = {};
  private correlationId?: string;

  /**
   * Get the singleton instance of LoggerService
   */
  public static getInstance(): LoggerService {
    if (!LoggerService.instance) {
      LoggerService.instance = new LoggerService({
        defaultLevel: LogLevel.INFO,
        transports: {
          console: {
            level: LogLevel.DEBUG
          }
        }
      });
    }
    return LoggerService.instance;
  }

  /**
   * Initialize logger with configuration
   */
  constructor(config: LoggerConfig) {
    this.config = config;
  }

  /**
   * Register a transport with the logger
   */
  public registerTransport(name: string, transport: LogTransport): void {
    this.transports.set(name, transport);
  }

  /**
   * Remove a transport from the logger
   */
  public removeTransport(name: string): boolean {
    return this.transports.delete(name);
  }

  /**
   * Log a message at DEBUG level
   */
  public async debug(message: string, context?: Record<string, unknown>): Promise<void> {
    return this.log(LogLevel.DEBUG, message, context);
  }

  /**
   * Log a message at INFO level
   */
  public async info(message: string, context?: Record<string, unknown>): Promise<void> {
    return this.log(LogLevel.INFO, message, context);
  }

  /**
   * Log a message at WARN level
   */
  public async warn(message: string, context?: Record<string, unknown>): Promise<void> {
    return this.log(LogLevel.WARN, message, context);
  }

  /**
   * Log a message at ERROR level
   */
  public async error(message: string, context?: Record<string, unknown>): Promise<void> {
    return this.log(LogLevel.ERROR, message, context);
  }

  /**
   * Log a message at FATAL level
   */
  public async fatal(message: string, context?: Record<string, unknown>): Promise<void> {
    return this.log(LogLevel.FATAL, message, context);
  }

  /**
   * Log an Error object with stack trace
   */
  public async logError(error: Error, level: LogLevel = LogLevel.ERROR, context?: Record<string, unknown>): Promise<void> {
    return this.log(level, error.message, {
      ...context,
      stack: error.stack,
      name: error.name
    });
  }

  /**
   * Create a new logger with a specific category
   */
  public withCategory(category: string): ILogger {
    const logger = this.clone();
    logger.category = category;
    return logger;
  }

  /**
   * Create a new logger with additional context
   */
  public withContext(context: Record<string, unknown>): ILogger {
    const logger = this.clone();
    logger.context = { ...this.context, ...context };
    return logger;
  }

  /**
   * Create a new logger with a correlation ID for request tracking
   */
  public withCorrelationId(correlationId: string): ILogger {
    const logger = this.clone();
    logger.correlationId = correlationId;
    return logger;
  }

  /**
   * Core logging method
   */
  private async log(level: LogLevel, message: string, context?: Record<string, unknown>): Promise<void> {
    const entry: LogEntry = {
      timestamp: new Date(),
      level,
      message,
      category: this.category,
      context: { ...this.context, ...context },
      source: this.getCallerInfo(),
      correlationId: this.correlationId,
    };

    const promises = Array.from(this.transports.entries())
      .filter(([name]) => {
        const transportConfig = this.config.transports[name];
        // Skip if transport level is higher than log level
        if (this.getLevelValue(transportConfig.level) > this.getLevelValue(level)) {
          return false;
        }
        // Skip if transport is filtered by category
        if (transportConfig.category && !transportConfig.category.includes(this.category)) {
          return false;
        }
        return true;
      })
      .map(([, transport]) => transport.log(entry).catch(err => {
        console.error(`Error in log transport: ${err.message}`);
      }));

    await Promise.all(promises);
  }

  /**
   * Get numeric value for log level for comparison
   */
  private getLevelValue(level: LogLevel): number {
    const levels: Record<LogLevel, number> = {
      [LogLevel.DEBUG]: 0,
      [LogLevel.INFO]: 1,
      [LogLevel.WARN]: 2,
      [LogLevel.ERROR]: 3,
      [LogLevel.FATAL]: 4
    };
    return levels[level];
  }

  /**
   * Extract caller information (filename and line number)
   */
  private getCallerInfo(): string {
    const error = new Error();
    const stack = error.stack?.split('\n');
    
    if (!stack || stack.length < 4) {
      return 'unknown';
    }
    
    // Find the first non-logger call in the stack
    let callerLine: string | undefined;
    for (let i = 3; i < stack.length; i++) {
      if (!stack[i].includes('LoggerService')) {
        callerLine = stack[i];
        break;
      }
    }
    
    if (!callerLine) {
      return 'unknown';
    }
    
    // Parse the caller line
    const match = callerLine.match(/at\s+(.*)\s+\((.*):(\d+):(\d+)\)/);
    if (match) {
      const [, , file, line] = match;
      return `${file}:${line}`;
    }
    
    return 'unknown';
  }

  /**
   * Create a clone of the current logger instance
   */
  private clone(): LoggerService {
    const logger = new LoggerService(this.config);
    logger.transports = this.transports;
    logger.category = this.category;
    logger.context = { ...this.context };
    logger.correlationId = this.correlationId;
    return logger;
  }
} 