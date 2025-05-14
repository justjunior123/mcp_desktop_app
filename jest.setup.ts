import '@testing-library/jest-dom';
import { jest } from '@jest/globals';
import type { BrowserWindow } from 'electron';

declare global {
  namespace NodeJS {
    interface ProcessEnv {
      NODE_ENV: 'development' | 'production' | 'test';
    }
  }
  // eslint-disable-next-line @typescript-eslint/no-namespace
  namespace jest {
    interface Matchers<R> {
      toBeInTheDocument(): R;
    }
  }
}

// Mock the electron module
jest.mock('electron', () => {
  const mockBrowserWindow = jest.fn().mockImplementation(() => ({
    loadURL: jest.fn().mockResolvedValue(void 0),
    loadFile: jest.fn().mockResolvedValue(void 0),
    on: jest.fn(),
    webContents: {
      openDevTools: jest.fn()
    }
  })) as unknown as typeof BrowserWindow;

  return {
    app: {
      whenReady: jest.fn().mockResolvedValue(void 0),
      on: jest.fn(),
      quit: jest.fn()
    },
    BrowserWindow: mockBrowserWindow
  };
});

// Set environment for tests
process.env.NODE_ENV = 'test' as const;

// Mock child_process
jest.mock('child_process', () => ({
  spawn: jest.fn().mockImplementation(() => ({
    on: jest.fn(),
    kill: jest.fn()
  }))
}));

// Mock fs/promises
jest.mock('fs/promises', () => ({
  access: jest.fn().mockResolvedValue(undefined),
  readFile: jest.fn().mockResolvedValue('[]'),
  writeFile: jest.fn().mockResolvedValue(undefined),
  unlink: jest.fn().mockResolvedValue(undefined)
})); 