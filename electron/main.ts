import { app, BrowserWindow, session } from 'electron';
import { join } from 'path';
import { setupServer, cleanup as cleanupServer } from './server';
import { autoUpdater } from 'electron-updater';
import { DatabaseService } from './services/database/DatabaseService';
import installExtension, { REACT_DEVELOPER_TOOLS } from 'electron-devtools-installer';

// Define pattern at module scope for reuse
const reactDevToolsPattern = /(?:Download the React DevTools|Download React DevTools|React DevTools download|reactjs\.org\/link\/react-devtools)/i;
const webpackInternalPattern = /webpack-internal:\/\/.*react-dom\.development\.js/i;

// Suppress specific Electron warnings in development
if (process.env.NODE_ENV === 'development') {
  process.env.ELECTRON_DISABLE_SECURITY_WARNINGS = 'true';
  // Suppress React DevTools message
  process.env.REACT_DEVTOOLS_INSTALLED = 'true';
  
  // Enhanced console filtering
  const originalConsole = console;
  
  console = {
    ...console,
    info: (...args: any[]) => {
      const message = args.join(' ');
      const source = args.find(arg => typeof arg === 'string' && webpackInternalPattern.test(arg));
      // Enhanced regex pattern for React DevTools message
      if ((!source || !webpackInternalPattern.test(source)) &&
          !reactDevToolsPattern.test(message) &&
          !/\[.*:INFO:CONSOLE.*\].*Download.*React.*DevTools/.test(message) &&
          !message.includes('chrome.action') && 
          !message.includes('Electron Security Warning') &&
          !message.includes('extension_action_api') &&
          !message.includes('Failed to load URL')) {
        originalConsole.info(...args);
      }
    },
    warn: (...args: any[]) => {
      const message = args.join(' ');
      if (!message.includes('Electron Security Warning') &&
          !message.includes('electron_extension_loader') &&
          !message.includes('Unrecognized manifest key')) {
        originalConsole.warn(...args);
      }
    },
    error: (...args: any[]) => {
      const message = args.join(' ');
      // Filter out specific error messages with regex
      if (!/Electron.*renderer\.bundle\.js script failed to run/.test(message) &&
          !/TypeError: object null is not iterable/.test(message) &&
          !/Error: An object could not be cloned/.test(message) &&
          !message.includes('uniqueContextId') &&
          !message.includes('Request Runtime.evaluate failed') &&
          !message.includes('Extension server error: Inspector protocol')) {
        originalConsole.error(...args);
      }
    },
    log: (...args: any[]) => {
      const message = args.join(' ');
      if (!message.includes('Failed to load URL')) {
        originalConsole.log(...args);
      }
    }
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
    const path = require('path');
    const projectRoot = path.join(__dirname, '../..');
    
    require('electron-reloader')(module, {
      debug: false, // Disable debug messages
      watchRenderer: true,
      ignore: [
        'node_modules',
        '.next',
        'dist',
        'release'
      ],
      watch: [
        path.join(projectRoot, 'electron'),
        path.join(projectRoot, 'app'),
        path.join(projectRoot, 'src')
      ]
    });
  } catch (err) {
    console.error('❌ Error setting up hot reload:', err);
  }
}

async function installDevTools() {
  if (isDev) {
    try {
      // Set permissions for DevTools
      session.defaultSession.setPermissionRequestHandler((webContents, permission, callback) => {
        const parsedUrl = new URL(webContents.getURL());
        // Allow DevTools and localhost permissions
        if (parsedUrl.hostname === 'localhost' || 
            webContents.getURL().startsWith('chrome-extension://') ||
            permission === 'clipboard-sanitized-write' ||
            permission === 'clipboard-read') {
          callback(true);
        } else {
          callback(false);
        }
      });

      // Set up content security policy for DevTools
      session.defaultSession.webRequest.onHeadersReceived((details, callback) => {
        callback({
          responseHeaders: {
            ...details.responseHeaders,
            'Content-Security-Policy': ["default-src 'self' 'unsafe-inline' 'unsafe-eval' data: chrome-extension:"]
          }
        });
      });

      // Install React DevTools silently
      const reactDevToolsPath = await installExtension(REACT_DEVELOPER_TOOLS, {
        loadExtensionOptions: {
          allowFileAccess: true
        }
      });

      // Set environment variable to indicate React DevTools is installed
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

  // Prevent multiple windows from being created
  if (mainWindow && !mainWindow.isDestroyed()) {
    if (mainWindow.isMinimized()) mainWindow.restore();
    mainWindow.focus();
    return;
  }

  mainWindow = new BrowserWindow({
    width: 1200,
    height: 800,
    webPreferences: {
      nodeIntegration: false,
      contextIsolation: true,
      sandbox: false,
      webSecurity: true,
      allowRunningInsecureContent: false,
      preload: join(__dirname, 'preload.js'),
      backgroundThrottling: false,
      spellcheck: false,
      devTools: isDev,
      webgl: true,
      javascript: true
    }
  });

  // Add this before loading the URL
  if (isDev) {
    // Disable sandbox warnings in development
    app.commandLine.appendSwitch('no-sandbox');
    
    // Set proper CSP for development
    session.defaultSession.webRequest.onHeadersReceived((details, callback) => {
      callback({
        responseHeaders: {
          ...details.responseHeaders,
          'Content-Security-Policy': ["default-src 'self' 'unsafe-inline' 'unsafe-eval' data: http://localhost:* ws://localhost:*"]
        }
      });
    });

    // Enhanced renderer process filtering
    app.on('web-contents-created', (event, contents) => {
      // Intercept console messages at the protocol level
      contents.session.webRequest.onBeforeRequest({ urls: ['*://*/*'] }, (details, callback) => {
        if (details.url.includes('react-devtools')) {
          callback({ cancel: true });
          return;
        }
        callback({});
      });

      // Set up console message filtering before any scripts run
      contents.on('console-message', (event, level, message, line, sourceId) => {
        if (message.includes('Download the React DevTools') || 
            message.includes('reactjs.org/link/react-devtools') ||
            (sourceId && sourceId.includes('react-dom.development.js'))) {
          event.preventDefault();
          return;
        }
      });

      // Inject early console override
      contents.on('did-start-loading', () => {
        contents.executeJavaScript(`
          {
            const win = window;
            const originalConsoleInfo = win.console.info;
            const originalConsoleLog = win.console.log;
            const originalConsoleWarn = win.console.warn;
            
            win.console.info = (...args) => {
              const msg = args.join(' ');
              if (!msg.includes('Download the React DevTools') && !msg.includes('reactjs.org/link/react-devtools')) {
                originalConsoleInfo.apply(win.console, args);
              }
            };
            
            win.console.log = (...args) => {
              const msg = args.join(' ');
              if (!msg.includes('Download the React DevTools') && !msg.includes('reactjs.org/link/react-devtools')) {
                originalConsoleLog.apply(win.console, args);
              }
            };
            
            win.console.warn = (...args) => {
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
          }
        `, true);
      });

      // Prevent DevTools download message in iframes
      contents.on('did-frame-finish-load', () => {
        contents.executeJavaScript(`
          if (window !== window.top) {
            const win = window;
            const originalConsoleInfo = win.console.info;
            win.console.info = (...args) => {
              const msg = args.join(' ');
              if (!msg.includes('Download the React DevTools') && !msg.includes('reactjs.org/link/react-devtools')) {
                originalConsoleInfo.apply(win.console, args);
              }
            };
          }
        `, true);
      });

      // Block React DevTools extension installation attempts
      contents.session.webRequest.onBeforeRequest(
        { urls: ['*://reactjs.org/link/react-devtools', '*://*.reactjs.org/link/react-devtools'] },
        (details, callback) => {
          callback({ cancel: true });
        }
      );

      contents.on('will-navigate', (event, navigationUrl) => {
        const parsedUrl = new URL(navigationUrl);
        if (parsedUrl.origin !== 'http://localhost:' + NEXT_PORT) {
          event.preventDefault();
        }
      });
    });
    
    const devServerUrl = `http://localhost:${NEXT_PORT}`;
    console.log(`🌐 Loading development server at ${devServerUrl}`);
    
    try {
      await mainWindow.loadURL(devServerUrl);
      console.log('✅ Development server loaded successfully');
      
      // Open DevTools after a short delay to ensure proper initialization
      setTimeout(() => {
        if (mainWindow && !mainWindow.isDestroyed()) {
          mainWindow.webContents.openDevTools();
        }
      }, 1000);

      // Watch for Next.js HMR events
      mainWindow.webContents.on('console-message', (event, level, message) => {
        // Filter out React DevTools message
        if (message.includes('Download the React DevTools') || 
            message.includes('https://reactjs.org/link/react-devtools')) {
          return;
        }
        
        // Listen for Next.js compilation messages
        if (message.includes('Compiled successfully') || 
            message.includes('Fast Refresh') ||
            message.includes('webpack') ||
            message.includes('HMR')) {
          if (mainWindow && !mainWindow.isDestroyed()) {
            console.log('🔄 Hot reload detected, refreshing...');
            mainWindow.webContents.reload();
          }
        }
      });

      // Watch for page errors
      mainWindow.webContents.on('did-fail-load', (event, errorCode, errorDescription) => {
        console.error('❌ Failed to load URL:', errorDescription);
        if (mainWindow && !mainWindow.isDestroyed()) {
          setTimeout(() => {
            console.log('🔄 Retrying to load development server...');
            mainWindow?.loadURL(devServerUrl);
          }, 1000);
        }
      });

    } catch (error) {
      console.error('❌ Error loading development server:', error);
    }
  } else {
    // In production, use the built Next.js app
    await mainWindow.loadFile(join(__dirname, '../../out/index.html'));
  }

  // Initialize auto-updater
  if (!isDev) {
    autoUpdater.checkForUpdatesAndNotify();
  }

  mainWindow.on('closed', () => {
    mainWindow = null;
  });
}

// Handle promise rejections
process.on('unhandledRejection', (error) => {
  console.error('Unhandled promise rejection:', error);
});

// App lifecycle events
app.whenReady().then(async () => {
  try {
    console.log('🚀 Starting application...');
    await installDevTools();
    console.log('📊 Initializing database...');
    await dbService.init();
    console.log('✅ Database initialized');
    serverInstance = await setupServer();
    console.log('✅ Server started');
    await createWindow();
  } catch (error) {
    console.error('❌ Error during startup:', error);
    app.quit();
  }

  app.on('activate', async () => {
    if (BrowserWindow.getAllWindows().length === 0) {
      await createWindow();
    }
  });
});

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit();
  }
});

app.on('before-quit', async () => {
  // Cleanup both server and database
  await Promise.all([
    cleanupServer(),
    dbService.cleanup()
  ]).catch(err => {
    console.error('❌ Error during cleanup:', err);
  });
}); 