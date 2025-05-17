// Initialize Symbol.iterator before anything else
import { contextBridge, ipcRenderer } from 'electron';
import * as path from 'path';

// Initialize required globals before anything else
(() => {
  try {
    // Initialize global object
    if (typeof global === 'undefined') {
      (window as any).global = window;
    }

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

    // Expose minimal globals to renderer
    contextBridge.exposeInMainWorld('global', {
      process: process,
      Buffer: Buffer,
      global: global
    });

  } catch (error) {
    console.error('Error in preload script:', error);
  }
})(); 