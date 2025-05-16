import { app, BrowserWindow, session, ipcMain } from 'electron';
import { join } from 'path';
import { setupServer, cleanup } from './server';
import { autoUpdater, UpdateInfo, ProgressInfo } from 'electron-updater';

let mainWindow: BrowserWindow | null = null;
let serverInstance: Awaited<ReturnType<typeof setupServer>> | null = null;

const isDev = process.env.NODE_ENV === 'development';
const NEXT_PORT = process.env.PORT || 3002;

// Enable hot reload in development
if (isDev) {
  try {
    console.log('Enabling hot reload...');
    const path = require('path');
    const projectRoot = path.join(__dirname, '../..');
    
    require('electron-reloader')(module, {
      debug: true,
      watchRenderer: false, // We're using Next.js's own HMR
      ignore: [
        'node_modules',
        '.next',
        'dist',
        'release'
      ],
      // Watch these directories
      watch: [
        path.join(projectRoot, 'electron'),
        path.join(projectRoot, 'app'),
        path.join(projectRoot, 'src')
      ]
    });
  } catch (err) {
    console.error('Error setting up hot reload:', err);
  }
}

async function startServer() {
  console.log('Starting Express server...');
  try {
    serverInstance = await setupServer();
    console.log('Express server started successfully');
  } catch (err) {
    console.error('Failed to start Express server:', err);
    app.quit();
  }
}

async function createWindow() {
  console.log('Creating Electron window...');
  
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
  if (mainWindow) {
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
    console.log(`Loading development server at http://localhost:${NEXT_PORT}`);
    await mainWindow.loadURL(`http://localhost:${NEXT_PORT}`);
    mainWindow.webContents.openDevTools();

    // Listen for webContents 'did-fail-load' event
    mainWindow.webContents.on('did-fail-load', (event, errorCode, errorDescription) => {
      console.error('Failed to load URL:', errorDescription);
      // Retry loading after a short delay
      setTimeout(() => {
        if (mainWindow) {
          mainWindow.loadURL(`http://localhost:${NEXT_PORT}`);
        }
      }, 1000);
    });
  } else {
    // In production, use the built Next.js app
    await mainWindow.loadFile(join(__dirname, '../../out/index.html'));
  }

  // Initialize auto-updater
  autoUpdater.checkForUpdatesAndNotify();

  // Auto-updater events
  autoUpdater.on('checking-for-update', () => {
    console.log('Checking for updates...');
  });

  autoUpdater.on('update-available', (info: UpdateInfo) => {
    console.log('Update available:', info);
  });

  autoUpdater.on('update-not-available', (info: UpdateInfo) => {
    console.log('Update not available:', info);
  });

  autoUpdater.on('error', (err: Error) => {
    console.error('AutoUpdater error:', err);
  });

  autoUpdater.on('download-progress', (progressObj: ProgressInfo) => {
    console.log('Download progress:', progressObj);
  });

  autoUpdater.on('update-downloaded', (info: UpdateInfo) => {
    console.log('Update downloaded:', info);
    // Install on quit
    autoUpdater.quitAndInstall(false);
  });

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
  if (serverInstance) {
    cleanup();
  }
}); 