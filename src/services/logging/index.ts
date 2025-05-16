import { LoggerService } from './LoggerService';
import { ConsoleTransport } from './transports/ConsoleTransport';
import { FileTransport } from './transports/FileTransport';
import { LogLevel, LoggerConfig } from './types';
import path from 'path';

// Default configuration
const defaultConfig: LoggerConfig = {
    defaultLevel: LogLevel.INFO,
    transports: {
        console: {
            level: LogLevel.DEBUG
        },
        file: {
            level: LogLevel.INFO
        }
    }
};

/**
 * Initialize the logging system
 */
export function initializeLogging(config: Partial<LoggerConfig> = {}): LoggerService {
    const mergedConfig: LoggerConfig = {
        ...defaultConfig,
        ...config,
        transports: {
            ...defaultConfig.transports,
            ...(config.transports || {})
        }
    };

    const logger = new LoggerService(mergedConfig);

    // Set up console transport
    if (mergedConfig.transports.console) {
        const consoleTransport = new ConsoleTransport();
        logger.registerTransport('console', consoleTransport);
    }

    // Set up file transport
    if (mergedConfig.transports.file) {
        const logsDir = process.env.NODE_ENV === 'development'
            ? path.join(process.cwd(), 'logs')
            : path.join(process.env.HOME || process.cwd(), '.mcp-desktop-app', 'logs');

        const fileTransport = new FileTransport({
            filename: 'app.log',
            directory: logsDir,
            format: 'json'
        });
        logger.registerTransport('file', fileTransport);
    }

    return logger;
}

// Export singleton instance
export const logger = LoggerService.getInstance();

// Re-export types
export * from './types';
export { LoggerService } from './LoggerService';
export { ConsoleTransport } from './transports/ConsoleTransport';
export { FileTransport } from './transports/FileTransport'; 