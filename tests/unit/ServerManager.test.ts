import { ServerManager } from '../../src/lib/ServerManager';
import { LLMServerConfig, MCPServerConfig } from '../../src/types/server';
import * as path from 'path';
import * as fs from 'fs';
import { promisify } from 'util';
import { jest } from '@jest/globals';
import { EventEmitter } from 'events';
import { ChildProcess } from 'child_process';

const mkdir = promisify(fs.mkdir);
const writeFile = promisify(fs.writeFile);
const rmdir = promisify(fs.rmdir);
const unlink = promisify(fs.unlink);
const readdir = promisify(fs.readdir);
const chmod = promisify(fs.chmod);
const stat = promisify(fs.stat);

// Create a proper mock process type that extends EventEmitter
class MockProcess extends EventEmitter {
  kill: jest.Mock;
  pid: number;

  constructor() {
    super();
    this.kill = jest.fn();
    this.pid = 12345;
  }
}

// Create a proper mock monitor type that extends EventEmitter
class MockMonitor extends EventEmitter {
  start: jest.Mock;
  stop: jest.Mock;

  constructor() {
    super();
    this.start = jest.fn();
    this.stop = jest.fn();
  }
}

// Mock the child_process spawn function
jest.mock('child_process', () => ({
  spawn: jest.fn(() => new MockProcess())
}));

// Mock the ProcessMonitor
const mockMonitor = new MockMonitor();
jest.mock('../../src/lib/ProcessMonitor', () => ({
  ProcessMonitor: jest.fn(() => mockMonitor)
}));

describe('ServerManager', () => {
  let manager: ServerManager;
  const testConfigDir = path.join(process.cwd(), 'test-server-configs');
  
  const testLLMConfig: LLMServerConfig = {
    id: 'test-llm',
    name: 'Test LLM',
    type: 'llm',
    status: 'stopped',
    port: 8000,
    modelPath: path.join(testConfigDir, 'model.bin'),
    configPath: path.join(testConfigDir, 'config.json'),
    modelType: 'llama',
    quantization: 'q4_k_m',
    contextSize: 4096,
    maxTokens: 2048
  };

  const testMCPConfig: MCPServerConfig = {
    id: 'test-mcp',
    name: 'Test MCP',
    type: 'mcp',
    status: 'stopped',
    port: 8001,
    configPath: path.join(testConfigDir, 'mcp-config.json'),
    maxConcurrentRequests: 10,
    timeout: 30000
  };

  beforeEach(async () => {
    // Clear all mocks
    jest.clearAllMocks();
    mockMonitor.removeAllListeners();
    
    // Create test directory and required files with proper permissions
    await mkdir(testConfigDir, { recursive: true });
    await chmod(testConfigDir, 0o777);
    
    await writeFile(testLLMConfig.modelPath, 'mock model data');
    await chmod(testLLMConfig.modelPath, 0o777);
    
    await writeFile(testLLMConfig.configPath, JSON.stringify({ schemaVersion: 1 }));
    await chmod(testLLMConfig.configPath, 0o777);
    
    await writeFile(testMCPConfig.configPath, JSON.stringify({ schemaVersion: 1 }));
    await chmod(testMCPConfig.configPath, 0o777);
    
    manager = new ServerManager(testConfigDir);
    await manager.initialize();
  });

  afterEach(async () => {
    try {
      // Clean up test directory
      const files = await readdir(testConfigDir);
      
      // Change permissions and delete files
      await Promise.all(
        files.map(async (file) => {
          const filePath = path.join(testConfigDir, file);
          try {
            const stats = await stat(filePath);
            if (stats.isDirectory()) {
              // Handle directories recursively
              const subFiles = await readdir(filePath);
              await Promise.all(
                subFiles.map(async (subFile) => {
                  const subPath = path.join(filePath, subFile);
                  await chmod(subPath, 0o777);
                  await unlink(subPath);
                })
              );
              await chmod(filePath, 0o777);
              await rmdir(filePath);
            } else {
              // Handle regular files
              await chmod(filePath, 0o777);
              await unlink(filePath);
            }
          } catch (error) {
            console.warn(`Failed to delete ${file}:`, error);
          }
        })
      );
      
      // Change directory permissions and remove it
      try {
        await chmod(testConfigDir, 0o777);
        await rmdir(testConfigDir);
      } catch (error: any) {
        // If directory is not empty or already deleted, that's okay
        if (error.code !== 'ENOTEMPTY' && error.code !== 'ENOENT') {
          console.warn('Failed to remove test directory:', error);
        }
      }
    } catch (error) {
      console.warn('Failed to clean up test directory:', error);
    }
  });

  describe('initialization', () => {
    it('creates a new config file if none exists', async () => {
      const customDir = path.join(testConfigDir, 'custom');
      const customManager = new ServerManager(customDir);
      await customManager.initialize();

      const exists = await promisify(fs.access)(customDir)
        .then(() => true)
        .catch(() => false);
      expect(exists).toBe(true);
    });
  });

  describe('server management', () => {
    beforeEach(async () => {
      await manager.updateConfig(testLLMConfig.id, testLLMConfig);
      await manager.updateConfig(testMCPConfig.id, testMCPConfig);
    });

    it('lists configured servers', async () => {
      const servers = await manager.listServers();
      expect(servers.filter(s => s.id)).toHaveLength(2);
      expect(servers).toEqual(expect.arrayContaining([
        expect.objectContaining({ id: testLLMConfig.id }),
        expect.objectContaining({ id: testMCPConfig.id })
      ]));
    });

    it('starts an LLM server', async () => {
      await manager.startServer(testLLMConfig.id);
      const status = await manager.getStatus(testLLMConfig.id);
      expect(status.status).toBe('running');
    });

    it('starts an MCP server', async () => {
      await manager.startServer(testMCPConfig.id);
      const status = await manager.getStatus(testMCPConfig.id);
      expect(status.status).toBe('running');
    });

    it('stops a running server', async () => {
      await manager.startServer(testLLMConfig.id);
      await manager.stopServer(testLLMConfig.id);
      const status = await manager.getStatus(testLLMConfig.id);
      expect(status.status).toBe('stopped');
    });

    it('prevents config updates while server is running', async () => {
      await manager.startServer(testLLMConfig.id);
      const updateConfig = {
        ...testLLMConfig,
        port: 8002
      };
      await expect(manager.updateConfig(testLLMConfig.id, updateConfig))
        .rejects.toThrow('Cannot update config while server');
    });
  });

  describe('process monitoring', () => {
    beforeEach(async () => {
      await manager.updateConfig(testLLMConfig.id, testLLMConfig);
    });

    it('emits server stats events', async () => {
      const mockStats = {
        pid: 12345,
        cpu: 5.5,
        memory: {
          rss: 1024,
          heapTotal: 2048,
          heapUsed: 1536
        },
        uptime: 1000
      };

      const statsPromise = new Promise<void>((resolve) => {
        manager.on('server:stats', ({ id, stats }) => {
          expect(id).toBe(testLLMConfig.id);
          expect(stats).toEqual(mockStats);
          resolve();
        });
      });

      await manager.startServer(testLLMConfig.id);
      mockMonitor.emit('stats', mockStats);
      
      await statsPromise;
    });

    it('handles monitor errors gracefully', async () => {
      const mockError = new Error('Monitor error');

      const errorPromise = new Promise<void>((resolve) => {
        manager.on('server:monitor:error', ({ id, error }) => {
          expect(id).toBe(testLLMConfig.id);
          expect(error).toBe(mockError);
          resolve();
        });
      });

      await manager.startServer(testLLMConfig.id);
      mockMonitor.emit('error', mockError);
      
      await errorPromise;
    });

    it('stops monitoring when server is stopped', async () => {
      await manager.startServer(testLLMConfig.id);
      await manager.stopServer(testLLMConfig.id);
      expect(mockMonitor.stop).toHaveBeenCalled();
    });

    it('includes memory stats in server status', async () => {
      await manager.startServer(testLLMConfig.id);
      const status = await manager.getStatus(testLLMConfig.id);
      expect(status.memory).toBeDefined();
      expect(status.memory).toEqual({
        used: 0,
        total: 0
      });
    });
  });
}); 