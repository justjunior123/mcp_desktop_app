// Initialize Symbol.iterator before anything else
import { contextBridge, ipcRenderer } from 'electron';
import * as path from 'path';

interface SafeGlobal {
  process: {
    env: {
      NODE_ENV: string | undefined;
      ELECTRON_HMR: string | undefined;
    };
    platform: NodeJS.Platform;
    version: string;
  };
  Buffer: {
    from: (data: any, encoding?: string) => Buffer;
    isBuffer: (obj: any) => obj is Buffer;
  };
  [Symbol.iterator]: () => Generator<any, void, unknown>;
  [key: string]: any;
}

// Initialize required globals before anything else
(() => {
  try {
    // Create safe versions of Node.js globals
    const safeProcess = {
      env: {
        NODE_ENV: process.env.NODE_ENV,
        ELECTRON_HMR: process.env.ELECTRON_HMR
      },
      platform: process.platform,
      version: process.version
    };

    const safeBuffer = {
      from: (data: any, encoding?: string) => Buffer.from(data, encoding as BufferEncoding),
      isBuffer: (obj: any) => Buffer.isBuffer(obj)
    };

    // Initialize Symbol.iterator if needed
    if (typeof Symbol !== 'undefined' && !Symbol.iterator) {
      Object.defineProperty(Symbol, 'iterator', {
        value: Symbol('iterator'),
        writable: false,
        enumerable: false,
        configurable: false
      });
    }

    // Create a safe global object that's extensible
    const safeGlobal: SafeGlobal = {
      process: safeProcess,
      Buffer: safeBuffer,
      [Symbol.iterator]: function* () {
        for (const key of Object.keys(this)) {
          yield this[key];
        }
      }
    };

    // Make the global object extensible
    Object.defineProperty(safeGlobal, '__webpack_require__', {
      enumerable: false,
      writable: true,
      configurable: true,
      value: undefined
    });

    // Expose IPC communication
    contextBridge.exposeInMainWorld('electron', {
      ipcRenderer: {
        send: (channel: string, data: any) => {
          const validChannels = ['toMain', 'ping', 'database', 'ollama'];
          if (validChannels.includes(channel)) {
            ipcRenderer.send(channel, data);
          }
        },
        on: (channel: string, func: Function) => {
          const validChannels = ['fromMain', 'pong', 'database-response', 'ollama-response'];
          if (validChannels.includes(channel)) {
            ipcRenderer.on(channel, (event, ...args) => func(...args));
          }
        },
        once: (channel: string, func: Function) => {
          const validChannels = ['fromMain', 'pong', 'database-response', 'ollama-response'];
          if (validChannels.includes(channel)) {
            ipcRenderer.once(channel, (event, ...args) => func(...args));
          }
        },
        removeListener: (channel: string, func: Function) => {
          const validChannels = ['fromMain', 'pong', 'database-response', 'ollama-response'];
          if (validChannels.includes(channel)) {
            ipcRenderer.removeListener(channel, func as any);
          }
        }
      }
    });

    // Expose Node.js globals safely
    contextBridge.exposeInMainWorld('nodeProcess', safeProcess);
    contextBridge.exposeInMainWorld('nodeBuffer', safeBuffer);
    contextBridge.exposeInMainWorld('global', safeGlobal);

    // Initialize required globals in renderer context
    contextBridge.exposeInMainWorld('__NEXT_DATA__', {
      process: safeProcess,
      Buffer: safeBuffer,
      global: safeGlobal
    });

  } catch (error) {
    console.error('Error in preload script:', error);
  }
})(); 