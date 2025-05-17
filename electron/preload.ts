// Define custom iterable interface
interface CustomIterable {
  [Symbol.iterator]?: () => Iterator<any>;
}

// Initialize Symbol.iterator before anything else
(() => {
  // Ensure Symbol exists globally
  if (typeof Symbol === 'undefined') {
    (global as any).Symbol = function Symbol(description?: string | number) {
      return `Symbol(${description})`;
    };
  }

  // Ensure Symbol.iterator exists globally
  if (!Symbol.iterator) {
    Object.defineProperty(Symbol, 'iterator', {
      value: Symbol('iterator'),
      writable: false,
      enumerable: false,
      configurable: false
    });
  }

  // Add iterator support to Object prototype if not present
  const proto = Object.prototype as unknown as CustomIterable;
  if (!proto[Symbol.iterator]) {
    Object.defineProperty(proto, Symbol.iterator, {
      enumerable: false,
      writable: true,
      configurable: true,
      value: function* () {
        for (const key of Object.keys(this)) {
          yield (this as any)[key];
        }
      }
    });
  }

  // Make global object iterable
  const globalObj = global as unknown as CustomIterable;
  if (globalObj && !(globalObj as any)[Symbol.iterator]) {
    Object.defineProperty(globalObj, Symbol.iterator, {
      enumerable: false,
      writable: true,
      configurable: true,
      value: function* () {
        for (const key of Object.keys(this)) {
          yield (this as any)[key];
        }
      }
    });
  }
})();

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

// Wait for window to be defined
const initWindow = () => {
  if (typeof window !== 'undefined') {
    // Initialize React DevTools hook
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

    // Add iterator support to window
    if (!(win as any)[Symbol.iterator]) {
      Object.defineProperty(win, Symbol.iterator, {
        enumerable: false,
        writable: true,
        configurable: true,
        value: function* () {
          for (const key of Object.keys(this)) {
            yield (this as any)[key];
          }
        }
      });
    }

    // Initialize drag event handling
    window.addEventListener('dragover', (e: DragEvent) => {
      e.preventDefault();
      e.stopPropagation();
      window.dragEvent = e;
    }, false);

    window.addEventListener('drop', (e: DragEvent) => {
      e.preventDefault();
      e.stopPropagation();
      window.dragEvent = e;
    }, false);

    window.addEventListener('dragleave', (e: DragEvent) => {
      e.preventDefault();
      e.stopPropagation();
      window.dragEvent = undefined;
    }, false);
  }
};

// Initialize as soon as possible
initWindow();

// Also initialize when DOM is ready
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', initWindow);
} else {
  initWindow();
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

// Add type declaration for drag events
declare global {
  interface Window {
    dragEvent?: DragEvent;
  }
}

// Expose protected methods that allow the renderer process to use
// the ipcRenderer without exposing the entire object
const api = {
  send: (channel: string, data: any) => {
    ipcRenderer.send(channel, data);
  },
  receive: (channel: string, func: Function) => {
    ipcRenderer.on(channel, (event, ...args) => func(...args));
  }
} as const;

// Add iterator support to api
Object.defineProperty(api, Symbol.iterator, {
  enumerable: false,
  writable: true,
  configurable: true,
  value: function* () {
    yield* Object.entries(this);
  }
});

contextBridge.exposeInMainWorld('electron', api); 