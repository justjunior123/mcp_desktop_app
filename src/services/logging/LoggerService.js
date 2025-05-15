import { LogLevel } from './types';
import path from 'path';
/**
 * Core logger service that manages log transports and provides logging methods
 */
export class LoggerService {
    /**
     * Get the singleton instance of LoggerService
     */
    static getInstance() {
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
    constructor(config) {
        this.transports = new Map();
        this.category = 'app';
        this.context = {};
        this.config = config;
    }
    /**
     * Register a transport with the logger
     */
    registerTransport(name, transport) {
        this.transports.set(name, transport);
    }
    /**
     * Remove a transport from the logger
     */
    removeTransport(name) {
        return this.transports.delete(name);
    }
    /**
     * Log a message at DEBUG level
     */
    async debug(message, context) {
        return this.log(LogLevel.DEBUG, message, context);
    }
    /**
     * Log a message at INFO level
     */
    async info(message, context) {
        return this.log(LogLevel.INFO, message, context);
    }
    /**
     * Log a message at WARN level
     */
    async warn(message, context) {
        return this.log(LogLevel.WARN, message, context);
    }
    /**
     * Log a message at ERROR level
     */
    async error(message, context) {
        return this.log(LogLevel.ERROR, message, context);
    }
    /**
     * Log a message at FATAL level
     */
    async fatal(message, context) {
        return this.log(LogLevel.FATAL, message, context);
    }
    /**
     * Log an Error object with stack trace
     */
    async logError(error, level = LogLevel.ERROR, context) {
        return this.log(level, error.message, {
            ...context,
            stack: error.stack,
            name: error.name
        });
    }
    /**
     * Create a new logger with a specific category
     */
    withCategory(category) {
        const logger = this.clone();
        logger.category = category;
        return logger;
    }
    /**
     * Create a new logger with additional context
     */
    withContext(context) {
        const logger = this.clone();
        logger.context = { ...this.context, ...context };
        return logger;
    }
    /**
     * Create a new logger with a correlation ID for request tracking
     */
    withCorrelationId(correlationId) {
        const logger = this.clone();
        logger.correlationId = correlationId;
        return logger;
    }
    /**
     * Core logging method
     */
    async log(level, message, context) {
        const entry = {
            timestamp: new Date(),
            level,
            message,
            category: this.category,
            context: { ...this.context, ...context },
            source: this.getCallerInfo(),
            correlationId: this.correlationId,
        };
        const promises = Array.from(this.transports.entries())
            .filter(([name, _]) => {
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
            .map(([_, transport]) => transport.log(entry).catch(err => {
            console.error(`Error in log transport: ${err.message}`);
        }));
        await Promise.all(promises);
    }
    /**
     * Get numeric value for log level for comparison
     */
    getLevelValue(level) {
        const levels = {
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
    getCallerInfo() {
        const error = new Error();
        const stack = error.stack?.split('\n');
        if (!stack || stack.length < 4) {
            return 'unknown';
        }
        // Find the first non-logger call in the stack
        let callerLine;
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
            const [_, functionName, filePath, line, column] = match;
            const fileName = path.basename(filePath);
            return `${fileName}:${line} (${functionName})`;
        }
        return callerLine.trim();
    }
    /**
     * Create a clone of this logger
     */
    clone() {
        const logger = new LoggerService(this.config);
        logger.transports = this.transports;
        logger.category = this.category;
        logger.context = { ...this.context };
        logger.correlationId = this.correlationId;
        return logger;
    }
}
//# sourceMappingURL=LoggerService.js.map