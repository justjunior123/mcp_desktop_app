import '@testing-library/jest-dom';
import { jest } from '@jest/globals';
import type { BrowserWindow } from 'electron';

// Extend NodeJS.ProcessEnv without redefining NODE_ENV
declare global {
  // eslint-disable-next-line @typescript-eslint/no-namespace
  namespace jest {
    interface Matchers<R> {
      toHaveEnumValue: (enumType: Record<string, unknown>, enumValue: string) => R;
    }
  }
}

// Define types for mock function parameters
interface DataParam<T = any> {
  data: T;
}

interface WhereParam<T = any> {
  where: T;
}

interface DataWhereParam<T = any, U = any> {
  data: T;
  where: U;
}

interface CreateUpdateParam<T = any, U = any> {
  create: T;
  update: U;
}

interface WhereIncludeParam<T = any, U = any> {
  where: T;
  include?: U;
}

// Mock the electron module
jest.mock('electron', () => {
  const mockBrowserWindow = jest.fn().mockImplementation(() => ({
    loadURL: jest.fn().mockResolvedValue(undefined),
    loadFile: jest.fn().mockResolvedValue(undefined),
    on: jest.fn(),
    webContents: {
      openDevTools: jest.fn()
    }
  }));

  return {
    app: {
      whenReady: jest.fn().mockResolvedValue(undefined),
      on: jest.fn(),
      quit: jest.fn()
    },
    BrowserWindow: mockBrowserWindow
  };
});

// Set environment for tests
// Use type assertion to avoid linter error about read-only property
(process.env as any).NODE_ENV = 'test';

// Mock child_process
jest.mock('child_process', () => ({
  spawn: jest.fn().mockReturnValue({
    on: jest.fn(),
    stdout: { on: jest.fn() },
    stderr: { on: jest.fn() },
    kill: jest.fn()
  }),
  exec: jest.fn().mockImplementation((cmd, cb) => cb(null, { stdout: 'success', stderr: '' }))
}));

// Mock fs/promises
jest.mock('fs/promises', () => ({
  readFile: jest.fn().mockResolvedValue('[]'),
  writeFile: jest.fn().mockResolvedValue(undefined),
  unlink: jest.fn().mockResolvedValue(undefined)
}));

// Create a simple mock prisma object
const mockPrisma = {
  user: {
    create: jest.fn().mockImplementation((params: DataParam) => ({ id: 'user-id', ...params.data })),
    findUnique: jest.fn().mockImplementation((params: WhereParam) => {
      if (params.where.id === 'deleted-user-id') {
        return null;
      }
      return { id: params.where.id, name: 'Test User', email: 'test@example.com' };
    }),
    findMany: jest.fn().mockImplementation(() => [{ id: 'user-id', name: 'Test User', email: 'test@example.com' }]),
    update: jest.fn().mockImplementation((params: DataWhereParam) => ({ id: params.where.id, ...params.data })),
    delete: jest.fn().mockImplementation((params: WhereParam) => {
      mockPrisma.user.findUnique.mockImplementationOnce(() => null);
      return { id: params.where.id, name: 'Test User', email: 'test@example.com' };
    }),
    deleteMany: jest.fn().mockImplementation(() => ({ count: 1 })),
  },
  setting: {
    create: jest.fn(),
    findUnique: jest.fn(),
    findMany: jest.fn(),
    update: jest.fn(),
    upsert: jest.fn(),
    delete: jest.fn(),
    deleteMany: jest.fn(),
  },
  settings: {
    create: jest.fn().mockImplementation((params: DataParam) => ({ id: 'setting-id', ...params.data })),
    findUnique: jest.fn().mockImplementation((params: WhereParam) => {
      if (params.where.key === 'deleted-key') {
        return null;
      }
      return { id: 'setting-id', key: params.where.key, value: 'test-value', description: 'test description' };
    }),
    findMany: jest.fn().mockImplementation(() => [{ id: 'setting-id', key: 'test-key', value: 'test-value' }]),
    update: jest.fn().mockImplementation((params: DataWhereParam) => ({ id: 'setting-id', key: params.where.key, ...params.data })),
    upsert: jest.fn().mockImplementation((params: CreateUpdateParam) => ({ id: 'setting-id', ...params.create })),
    delete: jest.fn().mockImplementation((params: WhereParam) => {
      mockPrisma.settings.findUnique.mockImplementationOnce(() => null);
      return { id: 'setting-id', key: params.where.key, value: 'test-value', description: 'test description' };
    }),
    deleteMany: jest.fn().mockImplementation(() => ({ count: 1 })),
  },
  mCPServer: {
    create: jest.fn().mockImplementation((params: DataParam) => {
      const serverData = { id: 'server-id', ...params.data };
      return serverData;
    }),
    findUnique: jest.fn().mockImplementation((params: WhereParam) => {
      return { 
        id: params.where.id, 
        name: 'Test Server', 
        port: 3000,
        model: { connect: { id: 'model-id' } }
      };
    }),
    findMany: jest.fn().mockImplementation(() => [
      { id: 'server-id-1', name: 'Server 1', port: 3000 },
      { id: 'server-id-2', name: 'Server 2', port: 3001 }
    ]),
    update: jest.fn().mockImplementation((params: DataWhereParam) => ({ id: params.where.id, ...params.data })),
    delete: jest.fn().mockImplementation(() => true),
    deleteMany: jest.fn().mockImplementation(() => ({ count: 1 })),
  },
  model: {
    create: jest.fn().mockImplementation((params: DataParam) => ({ id: 'model-id', ...params.data })),
    findUnique: jest.fn().mockImplementation((params: WhereParam) => ({ id: params.where.id, name: 'Test Model', status: 'not_installed', parameters: '{"test":true}' })),
    findMany: jest.fn().mockImplementation(() => [
      { id: 'model-id-1', name: 'Model 1', status: 'not_installed', parameters: '{"test":true}' },
      { id: 'model-id-2', name: 'Model 2', status: 'not_installed', parameters: '{"test":true}' }
    ]),
    findFirst: jest.fn().mockImplementation(() => ({ id: 'model-id', name: 'Test Model', status: 'not_installed', parameters: '{"test":true}' })),
    update: jest.fn().mockImplementation((params: DataWhereParam) => ({ id: params.where.id, ...params.data })),
    delete: jest.fn().mockImplementation(() => true),
    deleteMany: jest.fn().mockImplementation(() => ({ count: 1 })),
  },
  chatSession: {
    create: jest.fn().mockImplementation((params: DataParam) => ({ id: 'session-id', ...params.data })),
    findUnique: jest.fn().mockImplementation((params: WhereIncludeParam) => ({
      id: params.where.id,
      name: 'Test Chat',
      userId: 'user-id',
      modelId: 'model-id',
      messages: params.include?.messages ? [{ id: 'message-id', content: 'Test message', role: 'user', chatSessionId: params.where.id }] : undefined
    })),
    findMany: jest.fn().mockImplementation(() => [
      { id: 'session-id-1', name: 'Session 1', userId: 'user-id', modelId: 'model-id' },
      { id: 'session-id-2', name: 'Session 2', userId: 'user-id', modelId: 'model-id' }
    ]),
    update: jest.fn().mockImplementation((params: DataWhereParam) => ({ id: params.where.id, ...params.data })),
    delete: jest.fn().mockImplementation(() => true),
    deleteMany: jest.fn().mockImplementation(() => ({ count: 1 })),
  },
  message: {
    create: jest.fn().mockImplementation((params: DataParam) => {
      return { id: 'message-id', ...params.data };
    }),
    findUnique: jest.fn().mockImplementation((params: WhereParam) => {
      return { 
        id: params.where.id, 
        content: 'Test message', 
        role: 'user', 
        chatSession: { connect: { id: 'session-id' } }
      };
    }),
    findMany: jest.fn().mockImplementation(() => [{ id: 'message-id', content: 'Test message', role: 'user', chatSessionId: 'session-id' }]),
    update: jest.fn().mockImplementation((params: DataWhereParam) => ({ id: params.where.id, ...params.data })),
    delete: jest.fn().mockImplementation(() => true),
    deleteMany: jest.fn().mockImplementation(() => ({ count: 1 })),
  },
  $transaction: jest.fn().mockImplementation((operations: Array<any>) => Promise.all(operations)),
  $queryRaw: jest.fn(),
  $executeRaw: jest.fn(),
};

// Mock prisma
jest.mock('./src/services/database/client', () => ({
  __esModule: true,
  prisma: mockPrisma
}));

// Polyfill for TextEncoder/TextDecoder in tests
if (typeof TextEncoder === 'undefined') {
  global.TextEncoder = require('util').TextEncoder;
}

if (typeof TextDecoder === 'undefined') {
  global.TextDecoder = require('util').TextDecoder;
}

// Custom matchers
expect.extend({
  toHaveEnumValue(received, enumType, enumValue) {
    const pass = received === enumType[enumValue];
    return {
      message: () => 
        pass 
          ? `Expected ${received} not to equal enum value ${enumType[enumValue]}`
          : `Expected ${received} to equal enum value ${enumType[enumValue]}`,
      pass
    };
  }
}); 