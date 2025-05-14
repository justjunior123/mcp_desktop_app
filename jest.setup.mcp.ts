import { TextEncoder, TextDecoder } from 'util';
import { jest } from '@jest/globals';

global.TextEncoder = TextEncoder;
global.TextDecoder = TextDecoder as any;

// Mock fs/promises for config and file operations
jest.mock('fs/promises', () => ({
  access: jest.fn().mockResolvedValue(void 0),
  readFile: jest.fn().mockResolvedValue('[]' as string),
  writeFile: jest.fn().mockResolvedValue(void 0),
  unlink: jest.fn().mockResolvedValue(void 0)
}));

// Set test environment
Object.defineProperty(process.env, 'NODE_ENV', { value: 'test', configurable: true });

// Increase timeout for MCP operations
jest.setTimeout(30000);

// Mock child_process specifically for MCP server
jest.mock('child_process', () => ({
  spawn: jest.fn().mockImplementation(() => ({
    on: jest.fn(),
    kill: jest.fn(),
    stdout: {
      on: jest.fn((event: string, callback: (data: Buffer) => void) => {
        if (event === 'data') {
          // Simulate server ready message
          callback(Buffer.from('Server listening on port'));
        }
      })
    },
    stderr: { on: jest.fn() }
  }))
})); 