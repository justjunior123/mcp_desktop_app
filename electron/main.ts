import { app, BrowserWindow, session, ipcMain } from 'electron';
import { join } from 'path';
import { setupServer, cleanup } from './server';
import { autoUpdater } from 'electron-updater';

let mainWindow: BrowserWindow | null = null;
let serverInstance: Awaited<ReturnType<typeof setupServer>> | null = null;

const isDev = process.env.NODE_ENV === 'development';
const NEXT_PORT = process.env.PORT || 3002;

// Enable hot reload in development
if (isDev) {
  try {
    console.log('🔄 Enabling hot reload...');
    const path = require('path');
    const projectRoot = path.join(__dirname, '../..');
    
    require('electron-reloader')(module, {
      debug: true,
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

async function startServer() {
  console.log('🚀 Starting Express server...');
  try {
    serverInstance = await setupServer();
    console.log('✅ Express server started successfully');
  } catch (err) {
    console.error('❌ Failed to start Express server:', err);
    app.quit();
  }
}

async function createWindow() {
  console.log('🎯 Creating Electron window...');
  
  // Set up Content Security Policy in development
  if (isDev) {
    session.defaultSession.webRequest.onHeadersReceived((details, callback) => {
      callback({
        responseHeaders: {
          ...details.responseHeaders,
          'Content-Security-Policy': ["default-src 'self' 'unsafe-inline' 'unsafe-eval' http://localhost:* data: blob:"]
        }
      });
    });
  }

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
      webSecurity: true,
      allowRunningInsecureContent: false,
      preload: join(__dirname, 'preload.js')
    }
  });

  // In development, use the Next.js dev server
  if (isDev) {
    const devServerUrl = `http://localhost:${NEXT_PORT}`;
    console.log(`🌐 Loading development server at ${devServerUrl}`);
    
    try {
      await mainWindow.loadURL(devServerUrl);
      console.log('✅ Development server loaded successfully');
      mainWindow.webContents.openDevTools();

      // Watch for Next.js HMR events
      mainWindow.webContents.on('console-message', (event, level, message) => {
        // Listen for Next.js compilation messages
        if (message.includes('Compiled successfully') || 
            message.includes('Fast Refresh') ||
            message.includes('webpack') ||
            message.includes('HMR')) {
          console.log('📦 Next.js compilation detected:', message);
          if (mainWindow && !mainWindow.isDestroyed()) {
            console.log('🔄 Reloading window...');
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

// App lifecycle events
app.whenReady().then(async () => {
  await startServer();
  await createWindow();

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

app.on('before-quit', () => {
  cleanup();
}); 