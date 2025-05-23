import fs from 'fs';
import path from 'path';

// Create logs directory if it doesn't exist
const logsDir = path.join(process.cwd(), 'logs');
if (!fs.existsSync(logsDir)) {
  fs.mkdirSync(logsDir);
}

// Get current date for log file name
const getLogFileName = () => {
  const date = new Date();
  return `logs/${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}.log`;
};

// Custom JSON stringify replacer to handle BigInt
function jsonReplacer(_key: string, value: any) {
  if (typeof value === 'bigint') {
    return value.toString();
  }
  return value;
}

export function createLogger(module: string) {
  return {
    debug: (message: string, meta?: any) => {
      const logEntry = {
        timestamp: new Date().toISOString(),
        level: 'debug',
        module,
        message,
        ...(meta ? { meta } : {})
      };
      const line = JSON.stringify(logEntry, jsonReplacer);
      fs.appendFileSync(getLogFileName(), line + '\n');
      if (process.env.NODE_ENV !== 'production') {
        console.log(line);
      }
    },
    info: (message: string, meta?: any) => {
      const logEntry = {
        timestamp: new Date().toISOString(),
        level: 'info',
        module,
        message,
        ...(meta ? { meta } : {})
      };
      const line = JSON.stringify(logEntry, jsonReplacer);
      fs.appendFileSync(getLogFileName(), line + '\n');
      console.log(line);
    },
    warn: (message: string, meta?: any) => {
      const logEntry = {
        timestamp: new Date().toISOString(),
        level: 'warn',
        module,
        message,
        ...(meta ? { meta } : {})
      };
      const line = JSON.stringify(logEntry, jsonReplacer);
      fs.appendFileSync(getLogFileName(), line + '\n');
      console.warn(line);
    },
    error: (message: string, meta?: any) => {
      const logEntry = {
        timestamp: new Date().toISOString(),
        level: 'error',
        module,
        message,
        ...(meta ? { meta } : {})
      };
      const line = JSON.stringify(logEntry, jsonReplacer);
      fs.appendFileSync(getLogFileName(), line + '\n');
      console.error(line);
    }
  };
} 