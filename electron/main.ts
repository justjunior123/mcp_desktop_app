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
  interface CustomIterable {
    [Symbol.iterator]?: () => Iterator<any>;
  }

  const proto = Object.prototype as unknown as CustomIterable;
  if (!proto[Symbol.iterator]) {
    Object.defineProperty(proto, Symbol.iterator, {
      enumerable: false,
      writable: true,
      configurable: true,
      value: function* () {
        yield* Object.values(this);
      }
    });
  }
})();

import { app, BrowserWindow, session } from 'electron';
import { join } from 'path';
import { setupServer, cleanup as cleanupServer } from './server';
import { autoUpdater } from 'electron-updater';
import { DatabaseService } from './services/database/DatabaseService';
import installExtension, { REACT_DEVELOPER_TOOLS } from 'electron-devtools-installer';

// Define pattern at module scope for reuse
const reactDevToolsPattern = /(?:Download the React DevTools|Download React DevTools|React DevTools download|reactjs\.org\/link\/react-devtools)/i;
const webpackInternalPattern = /webpack-internal:\/\/.*react-dom\.development\.js/i;
const rendererErrorPattern = /(?:Electron renderer\.bundle\.js script failed to run|TypeError: object null is not iterable)/i;
const rscPayloadPattern = /Failed to fetch RSC payload.*Falling back to browser navigation/i;

// Suppress specific Electron warnings in development
if (process.env.NODE_ENV === 'development') {
  process.env.ELECTRON_DISABLE_SECURITY_WARNINGS = 'true';
  process.env.REACT_DEVTOOLS_INSTALLED = 'true';
  
  // Enhanced console filtering
  const originalConsole = console;
  
  // Add newline after every console message
  const withNewline = (fn: Function) => (...args: any[]) => {
    fn.apply(console, args);
    process.stdout.write('\n');
  };
  
  console = {
    ...console,
    log: withNewline(originalConsole.log),
    info: withNewline(originalConsole.info),
    warn: withNewline(originalConsole.warn),
    error: withNewline(originalConsole.error)
  };
}

let mainWindow: BrowserWindow | null = null;
let serverInstance: Awaited<ReturnType<typeof setupServer>> | null = null;
const dbService = DatabaseService.getInstance();

const isDev = process.env.NODE_ENV === 'development';
const NEXT_PORT = process.env.PORT || 3002;

// Enable hot reload in development
if (isDev) {
  try {
    console.log('🔄 Enabling hot reload...');
    require('electron-reloader')(module, {
      debug: false,
      watchRenderer: true
    });
  } catch (err) {
    console.error('❌ Error setting up hot reload:', err);
  }
}

// Add this before app.whenReady()
app.commandLine.appendSwitch('no-sandbox');
app.commandLine.appendSwitch('disable-site-isolation-trials');

// Disable features known to cause WebView issues
app.commandLine.appendSwitch('disable-features', 'CrossOriginOpenerPolicy');

// Ensure renderer process has required globals
app.on('ready', () => {
  // Set up global error handlers
  process.on('uncaughtException', (error) => {
    console.error('Uncaught Exception:', error);
  });

  process.on('unhandledRejection', (error) => {
    console.error('Unhandled Rejection:', error);
  });

  // Initialize renderer process globals
  session.defaultSession.webRequest.onBeforeRequest((details, callback) => {
    callback({ cancel: false });
  });
});

async function installDevTools() {
  if (isDev) {
    try {
      const reactDevToolsPath = await installExtension(REACT_DEVELOPER_TOOLS, {
        loadExtensionOptions: {
          allowFileAccess: true
        }
      });

      if (reactDevToolsPath) {
        process.env.REACT_DEVTOOLS_INSTALLED = 'true';
        console.log('✅ React DevTools installed');
      }
    } catch (err) {
      console.error('❌ Error installing React DevTools:', err);
    }
  }
}

async function createWindow() {
  console.log('🎯 Creating Electron window...');

  mainWindow = new BrowserWindow({
    width: 1200,
    height: 800,
    webPreferences: {
      nodeIntegration: false,
      contextIsolation: true,
      sandbox: false,
      webSecurity: true,
      preload: join(__dirname, 'preload.js')
    }
  });

  // Set up content security policy
  session.defaultSession.webRequest.onHeadersReceived((details, callback) => {
    callback({
      responseHeaders: {
        ...details.responseHeaders,
        'Content-Security-Policy': ["default-src 'self' 'unsafe-inline' 'unsafe-eval' data: http://localhost:* ws://localhost:*"]
      }
    });
  });

  // Load the development server or production build
  const url = isDev
    ? `http://localhost:${NEXT_PORT}`
    : `file://${join(__dirname, '../.next/server/pages/index.html')}`;

  console.log('🌐 Loading development server at', url);
  
  try {
    await mainWindow.loadURL(url);
    console.log('✅ Development server loaded successfully');
  } catch (err) {
    console.error('❌ Error loading development server:', err);
  }

  if (isDev) {
    mainWindow.webContents.openDevTools();
  }

  // Handle window close
  mainWindow.on('closed', () => {
    mainWindow = null;
  });
}

async function startApp() {
  try {
    console.log('🚀 Starting application...');

    // Install dev tools first
    await installDevTools();

    // Initialize database
    console.log('📊 Initializing database...');
    await dbService.init();
    console.log('✅ Database initialized');

    // Set up server
    serverInstance = await setupServer();
    console.log('✅ Server started');

    // Create window
    await createWindow();

  } catch (err) {
    console.error('❌ Error starting application:', err);
  }
}

// App event handlers
app.on('ready', startApp);

app.on('window-all-closed', async () => {
  if (process.platform !== 'darwin') {
    if (serverInstance) {
      await cleanupServer();
    }
    app.quit();
  }
});

app.on('activate', () => {
  if (mainWindow === null) {
    startApp();
  }
}); 