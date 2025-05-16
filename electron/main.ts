import { app, BrowserWindow, session } from 'electron';
import { join } from 'path';
import { setupServer, cleanup } from './server';
import { autoUpdater, UpdateInfo, ProgressInfo } from 'electron-updater';

// Enable hot reload in development
try {
  if (process.env.NODE_ENV === 'development') {
    console.log('Enabling hot reload...');
    const path = require('path');
    const projectRoot = path.join(__dirname, '../..');
    
    // eslint-disable-next-line @typescript-eslint/no-var-requires
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
  }
} catch (err) {
  console.error('Error setting up hot reload:', err);
}

let mainWindow: BrowserWindow | null = null;
let serverInstance: Awaited<ReturnType<typeof setupServer>> | null = null;

const isDev = process.env.NODE_ENV === 'development';
const NEXT_PORT = process.env.PORT || 3002;

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

  mainWindow = new BrowserWindow({
    width: 1200,
    height: 800,
    webPreferences: {
      nodeIntegration: true,
      contextIsolation: false,
      webSecurity: true, // Enable web security
      allowRunningInsecureContent: false // Disable running insecure content
    }
  });

  // In development, use the Next.js dev server
  if (isDev) {
    console.log(`Loading development server at http://localhost:${NEXT_PORT}`);
    await mainWindow.loadURL(`http://localhost:${NEXT_PORT}`);
    mainWindow.webContents.openDevTools();
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