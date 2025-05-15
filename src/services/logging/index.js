import { LoggerService } from './LoggerService';
import { ConsoleTransport } from './transports/ConsoleTransport';
import { FileTransport } from './transports/FileTransport';
import { LogLevel } from './types';
import path from 'path';
import { app } from 'electron';
// Default configuration
const defaultConfig = {
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
export function initializeLogging(config = {}) {
    const mergedConfig = {
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
        const logsDir = app
            ? path.join(app.getPath('userData'), 'logs')
            : path.join(process.cwd(), 'logs');
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
//# sourceMappingURL=index.js.map