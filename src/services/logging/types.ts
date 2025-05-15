/**
 * Logging levels in order of increasing severity
 */
export enum LogLevel {
  DEBUG = 'debug',
  INFO = 'info',
  WARN = 'warn',
  ERROR = 'error',
  FATAL = 'fatal'
}

/**
 * Structured log entry
 */
export interface LogEntry {
  timestamp: Date;
  level: LogLevel;
  message: string;
  category: string;
  context?: Record<string, any>;
  source?: string;
  correlationId?: string;
  stack?: string;
}

/**
 * Log transport interface for writing logs
 */
export interface LogTransport {
  log(entry: LogEntry): Promise<void>;
  rotate?(): Promise<void>;
  cleanup?(): Promise<void>;
}

/**
 * Configuration for a transport
 */
export interface TransportConfig {
  level: LogLevel;
  category?: string[];
  [key: string]: any;
}

/**
 * Logger configuration
 */
export interface LoggerConfig {
  defaultLevel: LogLevel;
  transports: {
    [key: string]: TransportConfig;
  };
}

/**
 * Logger interface
 */
export interface ILogger {
  debug(message: string, context?: Record<string, any>): Promise<void>;
  info(message: string, context?: Record<string, any>): Promise<void>;
  warn(message: string, context?: Record<string, any>): Promise<void>;
  error(message: string, context?: Record<string, any>): Promise<void>;
  fatal(message: string, context?: Record<string, any>): Promise<void>;
  withCategory(category: string): ILogger;
  withContext(context: Record<string, any>): ILogger;
  withCorrelationId(correlationId: string): ILogger;
} 