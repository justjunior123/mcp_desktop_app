import { app, BrowserWindow } from 'electron';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';
import { setupServer, cleanup } from './server.js';
import { logger } from '../src/services/logging/index.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

let mainWindow: BrowserWindow | null = null;
let serverInstance: Awaited<ReturnType<typeof setupServer>> | null = null;

const isDev = process.env.NODE_ENV === 'development';
const NEXT_PORT = process.env.PORT || 3002;

async function startServer() {
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
    try {
      await mainWindow.loadURL(`http://localhost:${NEXT_PORT}`);
      mainWindow.webContents.openDevTools();
      logger.info(`Development server loaded at http://localhost:${NEXT_PORT}`);
    } catch (err) {
      const error = err as Error;
      logger.error('Failed to load development server:', {
        message: error.message,
        stack: error.stack
      });
      // Fallback to static files if dev server fails
      await mainWindow.loadFile(join(__dirname, '../../out/index.html'));
    }
  } else {
    // In production, use the built Next.js app
    try {
      await mainWindow.loadFile(join(__dirname, '../../out/index.html'));
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
  mainWindow.on('closed', () => {
    mainWindow = null;
  });
}

// App lifecycle events
app.whenReady().then(async () => {
  try {
    // Start the Express server first
    await startServer();
    
    // Then create the browser window
    await createWindow();

    app.on('activate', async () => {
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
  if (process.platform !== 'darwin') {
    app.quit();
  }
});

app.on('before-quit', () => {
  if (serverInstance) {
    cleanup(serverInstance.services);
    logger.info('Express server closed');
  }
}); 