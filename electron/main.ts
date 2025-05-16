import { app, BrowserWindow } from 'electron';
import { join } from 'path';
import { setupServer, cleanup } from './server';
import { initializeLogging } from '../src/services/logging';

let mainWindow: BrowserWindow | null = null;
let serverInstance: Awaited<ReturnType<typeof setupServer>> | null = null;
const logger = initializeLogging();

const isDev = process.env.NODE_ENV === 'development';
const NEXT_PORT = process.env.PORT || 3002;

async function startServer() {
  logger.info('Starting Express server...');
  try {
    serverInstance = await setupServer();
    logger.info('Express server started successfully');
  } catch (err) {
    const error = err as Error;
    logger.error('Failed to start Express server:', {
      message: error.message,
      stack: error.stack
    });
    app.quit();
  }
}

async function createWindow() {
  logger.info('Creating Electron window...');
  mainWindow = new BrowserWindow({
    width: 1200,
    height: 800,
    webPreferences: {
      nodeIntegration: true,
      contextIsolation: false,
      webSecurity: !isDev
    }
  });

  // In development, use the Next.js dev server
  if (isDev) {
    logger.info(`Attempting to load development server at http://localhost:${NEXT_PORT}`);
    try {
      await mainWindow?.loadURL(`http://localhost:${NEXT_PORT}`);
      mainWindow?.webContents.openDevTools();
      logger.info(`Development server loaded at http://localhost:${NEXT_PORT}`);
    } catch (err) {
      const error = err as Error;
      logger.error('Failed to load development server:', {
        message: error.message,
        stack: error.stack
      });
      logger.info('Falling back to static files...');
      // Fallback to static files if dev server fails
      await mainWindow?.loadFile(join(__dirname, '../../out/index.html'));
    }
  } else {
    // In production, use the built Next.js app
    logger.info('Loading production build...');
    try {
      await mainWindow?.loadFile(join(__dirname, '../../out/index.html'));
      logger.info('Production build loaded successfully');
    } catch (err) {
      const error = err as Error;
      logger.error('Failed to load production build:', {
        message: error.message,
        stack: error.stack
      });
      app.quit();
    }
  }

  // Handle window closed
  mainWindow?.on('closed', () => {
    logger.info('Main window closed');
    mainWindow = null;
  });
}

// App lifecycle events
app.whenReady().then(async () => {
  logger.info('Electron app ready, initializing...');
  try {
    // Start the Express server first
    logger.info('Starting server...');
    await startServer();
    
    // Then create the browser window
    logger.info('Creating window...');
    await createWindow();

    app.on('activate', async () => {
      logger.info('App activated');
      if (BrowserWindow.getAllWindows().length === 0) {
        await createWindow();
      }
    });
  } catch (err) {
    const error = err as Error;
    logger.error('Failed to initialize application:', {
      message: error.message,
      stack: error.stack
    });
    app.quit();
  }
});

app.on('window-all-closed', () => {
  logger.info('All windows closed');
  if (process.platform !== 'darwin') {
    app.quit();
  }
});

app.on('before-quit', () => {
  logger.info('App quitting...');
  if (serverInstance) {
    cleanup();
    logger.info('Express server closed');
  }
}); 