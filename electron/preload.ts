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

// Mock React DevTools hook
win.__REACT_DEVTOOLS_GLOBAL_HOOK__ = {
  supportsFiber: true,
  inject: () => {},
  onCommitFiberRoot: () => {},
  onCommitFiberUnmount: () => {},
  isDisabled: true,
  renderers: new Map()
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