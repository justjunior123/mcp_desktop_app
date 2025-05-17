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
  interface Iterable {
    [Symbol.iterator]?: () => Iterator<any>;
  }

  const proto = Object.prototype as unknown as Iterable;
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

  // Make global object iterable
  if (typeof global !== 'undefined') {
    const globalObj = global as unknown as Iterable;
    if (!globalObj[Symbol.iterator]) {
      Object.defineProperty(global, Symbol.iterator, {
        enumerable: false,
        writable: true,
        configurable: true,
        value: function* () {
          yield* Object.values(this);
        }
      });
    }
  }
})();

import { app, BrowserWindow, ipcMain } from 'electron';
import * as path from 'path';
import * as isDev from 'electron-is-dev';
import installExtension, { REACT_DEVELOPER_TOOLS } from 'electron-devtools-installer';
import { DatabaseService } from './services/database/DatabaseService';
import { setupServer } from './server';

// Enable hot reload in development
if (isDev) {
  try {
    require('electron-reloader')(module, {
      debug: true,
      watchRenderer: true
    });
  } catch (_) { console.log('Error loading electron-reloader'); }
}

let mainWindow: BrowserWindow | null = null;

async function createWindow() {
  console.log('🎯 Creating Electron window...');

  mainWindow = new BrowserWindow({
    width: 1200,
    height: 800,
    webPreferences: {
      nodeIntegration: false,
      contextIsolation: true,
      sandbox: true,
      webSecurity: true,
      preload: path.join(__dirname, 'preload.js'),
      devTools: true // Explicitly enable devTools
    }
  });

  // Initialize server and database before loading the app
  try {
    await setupServer();
    const dbService = DatabaseService.getInstance();
    await dbService.init();
  } catch (error) {
    console.error('Failed to initialize services:', error);
  }

  // Load the app
  const startURL = isDev
    ? 'http://localhost:3002'
    : `file://${path.join(__dirname, '../build/index.html')}`;

  console.log('🌐 Loading development server at', startURL);
  await mainWindow.loadURL(startURL);

  // Open DevTools automatically in development mode
  if (isDev) {
    mainWindow.webContents.openDevTools();
    try {
      await installExtension(REACT_DEVELOPER_TOOLS);
      console.log('✅ React DevTools installed');
    } catch (err) {
      console.error('Failed to install React DevTools:', err);
    }
  }

  mainWindow.once('ready-to-show', () => {
    console.log('✅ Window ready to show');
    mainWindow?.show();
  });

  mainWindow.on('closed', () => {
    mainWindow = null;
  });
}

app.on('ready', async () => {
    console.log('🚀 Starting application...');
  
  if (isDev) {
    console.log('🔄 Enabling hot reload...');
  }
  
      await createWindow();
});

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit();
  }
});

app.on('activate', async () => {
  if (mainWindow === null) {
    await createWindow();
  }
});

// Handle IPC communication
ipcMain.on('toMain', (event, data) => {
  // Handle IPC messages from renderer
  console.log('Received message from renderer:', data);
});

ipcMain.handle('toMain', async (event, data) => {
  // Handle async IPC messages from renderer
  return { success: true, data };
}); 