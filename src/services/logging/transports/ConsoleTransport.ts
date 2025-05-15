import { LogTransport, LogEntry, LogLevel } from '../types';

/**
 * Configuration for console transport
 */
export interface ConsoleTransportConfig {
  colorize?: boolean;
  showTimestamp?: boolean;
  showLevel?: boolean;
  showCategory?: boolean;
  showSource?: boolean;
}

/**
 * Console transport for logging to stdout/stderr
 */
export class ConsoleTransport implements LogTransport {
  private config: ConsoleTransportConfig;

  constructor(config: ConsoleTransportConfig = {}) {
    this.config = {
      colorize: true,
      showTimestamp: true,
      showLevel: true,
      showCategory: true,
      showSource: true,
      ...config
    };
  }

  /**
   * Log to console
   */
  public async log(entry: LogEntry): Promise<void> {
    const formattedMessage = this.formatMessage(entry);
    
    switch (entry.level) {
      case LogLevel.DEBUG:
        console.debug(formattedMessage);
        break;
      case LogLevel.INFO:
        console.info(formattedMessage);
        break;
      case LogLevel.WARN:
        console.warn(formattedMessage);
        break;
      case LogLevel.ERROR:
      case LogLevel.FATAL:
        console.error(formattedMessage);
        
        // Log additional context for errors
        if (entry.context && Object.keys(entry.context).length > 0) {
          console.error(JSON.stringify(entry.context, null, 2));
        }
        
        // Log stack trace if available
        if (entry.stack) {
          console.error(entry.stack);
        }
        break;
    }
  }

  /**
   * Format log message for console output
   */
  private formatMessage(entry: LogEntry): string {
    const parts: string[] = [];
    
    // Add timestamp
    if (this.config.showTimestamp) {
      const timestamp = entry.timestamp.toISOString();
      parts.push(`[${timestamp}]`);
    }
    
    // Add log level
    if (this.config.showLevel) {
      const level = this.config.colorize ? this.colorizeLevel(entry.level) : entry.level.toUpperCase();
      parts.push(`[${level}]`);
    }
    
    // Add category
    if (this.config.showCategory) {
      parts.push(`[${entry.category}]`);
    }
    
    // Add source
    if (this.config.showSource && entry.source) {
      parts.push(`[${entry.source}]`);
    }
    
    // Add correlation ID if present
    if (entry.correlationId) {
      parts.push(`[${entry.correlationId}]`);
    }
    
    // Add message
    parts.push(entry.message);
    
    return parts.join(' ');
  }

  /**
   * Apply ANSI color codes to log level
   */
  private colorizeLevel(level: LogLevel): string {
    const colors = {
      [LogLevel.DEBUG]: '\x1b[34m', // Blue
      [LogLevel.INFO]: '\x1b[32m',  // Green
      [LogLevel.WARN]: '\x1b[33m',  // Yellow
      [LogLevel.ERROR]: '\x1b[31m', // Red
      [LogLevel.FATAL]: '\x1b[35m'  // Magenta
    };
    
    const reset = '\x1b[0m';
    return `${colors[level]}${level.toUpperCase()}${reset}`;
  }
} 