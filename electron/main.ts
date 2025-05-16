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
  // Suppress React DevTools message
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

// Add this before app.whenReady()
app.commandLine.appendSwitch('no-sandbox');
app.commandLine.appendSwitch('disable-site-isolation-trials');

// Ensure renderer process has required globals
app.on('ready', () => {
  // Set up global error handlers
  process.on('uncaughtException', (error) => {
    console.error('Uncaught Exception:', error);
  });

  process.on('unhandledRejection', (error) => {
    console.error('Unhandled Rejection:', error);
  });
});

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
      javascript: true,
      v8CacheOptions: 'none',
      enablePreferredSizeMode: true,
      additionalArguments: ['--no-sandbox', '--enable-features=ElectronSerialChooser']
    }
  });

  // Handle console messages
  mainWindow.webContents.on('console-message', (event, level, message, line, sourceId) => {
    // Replace RSC payload error with emoji
    if (message.includes('Failed to fetch RSC payload')) {
      console.log('\n🔄\n');
      event.preventDefault();
      return;
    }
  });

  // Add this before loading the URL
  if (isDev) {
    // Intercept renderer process errors
    mainWindow.webContents.on('console-message', (event, level, message) => {
      if (message.includes('Electron renderer.bundle.js script failed to run') ||
          message.includes('TypeError: object null is not iterable')) {
        event.preventDefault();
        return;
      }
    });

    // Set proper CSP for development with more permissive settings
    session.defaultSession.webRequest.onHeadersReceived((details, callback) => {
      callback({
        responseHeaders: {
          ...details.responseHeaders,
          'Content-Security-Policy': [
            "default-src 'self' 'unsafe-inline' 'unsafe-eval' data: http://localhost:* ws://localhost:*; script-src 'self' 'unsafe-inline' 'unsafe-eval' http://localhost:*; connect-src 'self' http://localhost:* ws://localhost:*"
          ]
        }
      });
    });

    // Wait for window to be ready before loading URL
    mainWindow.webContents.once('dom-ready', () => {
      if (mainWindow && !mainWindow.isDestroyed()) {
        mainWindow.webContents.openDevTools();
      }
    });

    // Handle renderer process errors
    mainWindow.webContents.on('render-process-gone', (event, details) => {
      console.error('Renderer process gone:', details.reason);
      if (mainWindow && !mainWindow.isDestroyed()) {
        mainWindow.reload();
      }
    });

    mainWindow.webContents.on('crashed', () => {
      console.error('Renderer process crashed');
      if (mainWindow && !mainWindow.isDestroyed()) {
        mainWindow.reload();
      }
    });

    const devServerUrl = `http://localhost:${NEXT_PORT}`;
    console.log(`🌐 Loading development server at ${devServerUrl}`);
    
    try {
      await mainWindow.loadURL(devServerUrl);
      console.log('✅ Development server loaded successfully');
    } catch (error) {
      console.error('❌ Error loading development server:', error);
      // Try to reload on error
      if (mainWindow?.webContents && !mainWindow.isDestroyed()) {
        setTimeout(() => mainWindow?.reload(), 1000);
      }
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