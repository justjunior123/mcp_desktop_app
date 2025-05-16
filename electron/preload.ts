'use strict';

// Suppress specific error messages
const originalConsoleError = console.error;
console.error = (...args: any[]) => {
  const message = args.join(' ');
  if (!message.includes('Electron renderer.bundle.js script failed to run') &&
      !message.includes('TypeError: object null is not iterable')) {
    originalConsoleError.apply(console, args);
  }
};

// CRITICAL: Initialize Symbol.iterator before anything else
(() => {
  const ensureIterator = (obj: any) => {
    if (obj && !obj[Symbol.iterator]) {
      Object.defineProperty(obj, Symbol.iterator, {
        enumerable: false,
        configurable: true,
        writable: true,
        value: Array.prototype[Symbol.iterator]
      });
    }
  };

  // Ensure these exist before Electron's renderer init
  ensureIterator(global);
  ensureIterator(window);
  
  // Ensure basic iterables are available
  const basicIterables = [Array, String, Map, Set];
  basicIterables.forEach(type => {
    if (type && type.prototype) {
      ensureIterator(type.prototype);
    }
  });
})();

import { contextBridge, ipcRenderer } from 'electron';

// Add type declaration for React DevTools hook
declare global {
  interface Window {
    __REACT_DEVTOOLS_GLOBAL_HOOK__?: {
      supportsFiber: boolean;
      inject: () => void;
      onCommitFiberRoot: () => void;
      onCommitFiberUnmount: () => void;
      isDisabled: boolean;
      renderers: Map<any, any>;
    };
  }
}

// Initialize React DevTools hook
if (typeof window !== 'undefined') {
  const win = window as any;
  if (!win.__REACT_DEVTOOLS_GLOBAL_HOOK__) {
    win.__REACT_DEVTOOLS_GLOBAL_HOOK__ = {
      supportsFiber: true,
      inject: () => {},
      onCommitFiberRoot: () => {},
      onCommitFiberUnmount: () => {},
      isDisabled: true,
      renderers: new Map()
    };
  }
}

// Early console override
const win = window;
const originalConsoleInfo = win.console.info;
const originalConsoleLog = win.console.log;
const originalConsoleWarn = win.console.warn;

win.console.info = (...args: any[]) => {
  const msg = args.join(' ');
  if (!msg.includes('Download the React DevTools') && !msg.includes('reactjs.org/link/react-devtools')) {
    originalConsoleInfo.apply(win.console, args);
  }
};

win.console.log = (...args: any[]) => {
  const msg = args.join(' ');
  if (!msg.includes('Download the React DevTools') && !msg.includes('reactjs.org/link/react-devtools')) {
    originalConsoleLog.apply(win.console, args);
  }
};

win.console.warn = (...args: any[]) => {
  const msg = args.join(' ');
  if (!msg.includes('Download the React DevTools') && !msg.includes('reactjs.org/link/react-devtools')) {
    originalConsoleWarn.apply(win.console, args);
  }
};

// Expose protected methods that allow the renderer process to use
// the ipcRenderer without exposing the entire object
contextBridge.exposeInMainWorld(
  'electron',
  {
    send: (channel: string, data: any) => {
      // whitelist channels
      const validChannels = ['toMain'];
      if (validChannels.includes(channel)) {
        ipcRenderer.send(channel, data);
      }
    },
    receive: (channel: string, func: Function) => {
      const validChannels = ['fromMain'];
      if (validChannels.includes(channel)) {
        // Deliberately strip event as it includes `sender` 
        ipcRenderer.on(channel, (event, ...args) => func(...args));
      }
    },
    // Add development-specific APIs
    isDev: process.env.NODE_ENV === 'development'
  }
); 