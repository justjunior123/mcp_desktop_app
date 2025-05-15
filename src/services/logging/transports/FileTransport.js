import fs from 'fs';
import path from 'path';
import { app } from 'electron';
/**
 * File transport for logging to files
 */
export class FileTransport {
    constructor(config) {
        this.currentSize = 0;
        this.stream = null;
        this.MAX_SIZE_DEFAULT = 10 * 1024 * 1024; // 10MB
        this.MAX_FILES_DEFAULT = 5;
        this.config = {
            directory: app ? path.join(app.getPath('userData'), 'logs') : path.join(process.cwd(), 'logs'),
            maxSize: this.MAX_SIZE_DEFAULT,
            maxFiles: this.MAX_FILES_DEFAULT,
            format: 'json',
            ...config
        };
        this.initializeLogDirectory();
        this.openStream();
    }
    /**
     * Log to file
     */
    async log(entry) {
        return new Promise((resolve, reject) => {
            if (!this.stream) {
                this.openStream();
            }
            if (!this.stream) {
                reject(new Error('Failed to open log file stream'));
                return;
            }
            const data = this.formatEntry(entry);
            const written = this.stream.write(data + '\n', (err) => {
                if (err) {
                    reject(err);
                }
                else {
                    resolve();
                }
            });
            // Update the current file size
            this.currentSize += Buffer.byteLength(data) + 1; // +1 for newline
            // Check if we need to rotate
            if (this.currentSize >= this.config.maxSize) {
                this.rotate().catch(err => {
                    console.error('Error rotating log file:', err);
                });
            }
            // Handle backpressure
            if (!written) {
                this.stream.once('drain', resolve);
            }
        });
    }
    /**
     * Rotate log file
     */
    async rotate() {
        return new Promise((resolve, reject) => {
            if (this.stream) {
                this.stream.end(async () => {
                    this.stream = null;
                    this.currentSize = 0;
                    try {
                        await this.rotateFiles();
                        this.openStream();
                        resolve();
                    }
                    catch (err) {
                        reject(err);
                    }
                });
            }
            else {
                resolve();
            }
        });
    }
    /**
     * Clean up resources
     */
    async cleanup() {
        return new Promise((resolve) => {
            if (this.stream) {
                this.stream.end(() => {
                    this.stream = null;
                    resolve();
                });
            }
            else {
                resolve();
            }
        });
    }
    /**
     * Format log entry for file
     */
    formatEntry(entry) {
        if (this.config.format === 'json') {
            return JSON.stringify({
                timestamp: entry.timestamp.toISOString(),
                level: entry.level,
                message: entry.message,
                category: entry.category,
                correlationId: entry.correlationId,
                source: entry.source,
                context: entry.context,
                stack: entry.stack
            });
        }
        else {
            const parts = [
                entry.timestamp.toISOString(),
                entry.level.toUpperCase(),
                entry.category,
                entry.source || 'unknown',
                entry.correlationId || '-',
                entry.message
            ];
            let result = parts.join(' | ');
            if (entry.context && Object.keys(entry.context).length > 0) {
                result += '\nContext: ' + JSON.stringify(entry.context, null, 2);
            }
            if (entry.stack) {
                result += '\nStack: ' + entry.stack;
            }
            return result;
        }
    }
    /**
     * Initialize log directory
     */
    initializeLogDirectory() {
        try {
            if (!fs.existsSync(this.config.directory)) {
                fs.mkdirSync(this.config.directory, { recursive: true });
            }
        }
        catch (err) {
            console.error('Failed to create log directory:', err);
        }
    }
    /**
     * Open log file stream
     */
    openStream() {
        const filePath = path.join(this.config.directory, this.config.filename);
        try {
            // Check if file exists to determine initial size
            if (fs.existsSync(filePath)) {
                const stats = fs.statSync(filePath);
                this.currentSize = stats.size;
            }
            else {
                this.currentSize = 0;
            }
            this.stream = fs.createWriteStream(filePath, { flags: 'a' });
            this.stream.on('error', (err) => {
                console.error('Error with log file stream:', err);
                this.stream = null;
            });
        }
        catch (err) {
            console.error('Failed to open log file stream:', err);
            this.stream = null;
        }
    }
    /**
     * Rotate log files
     */
    async rotateFiles() {
        try {
            const baseFilename = this.config.filename;
            const directory = this.config.directory;
            // Delete the oldest log file if it exists
            const oldestFile = path.join(directory, `${baseFilename}.${this.config.maxFiles - 1}`);
            if (fs.existsSync(oldestFile)) {
                await fs.promises.unlink(oldestFile);
            }
            // Rotate all other files
            for (let i = this.config.maxFiles - 2; i >= 0; i--) {
                const oldFile = i === 0
                    ? path.join(directory, baseFilename)
                    : path.join(directory, `${baseFilename}.${i}`);
                const newFile = path.join(directory, `${baseFilename}.${i + 1}`);
                if (fs.existsSync(oldFile)) {
                    await fs.promises.rename(oldFile, newFile);
                }
            }
        }
        catch (err) {
            console.error('Error rotating log files:', err);
        }
    }
}
//# sourceMappingURL=FileTransport.js.map