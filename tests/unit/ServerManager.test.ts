// Mock the modules before imports
jest.mock('child_process');
jest.mock('../../src/lib/ProcessMonitor');

import { ServerManager } from '../../src/lib/ServerManager';
import { LLMServerConfig, MCPServerConfig } from '../../src/types/server';
import * as path from 'path';
import * as fs from 'fs';
import { promisify } from 'util';
import { jest, describe, it, expect, beforeEach, afterEach } from '@jest/globals';
import { EventEmitter } from 'events';
import { ChildProcess } from 'child_process';

const mkdir = promisify(fs.mkdir);
const writeFile = promisify(fs.writeFile);
const rm = promisify(fs.rm);
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
  private process: ChildProcess;

  constructor(process: ChildProcess) {
    super();
    this.process = process;
    this.start = jest.fn(() => {
      // Simulate initial stats collection with the expected values
      setTimeout(() => {
        this.emit('stats', {
          pid: this.process.pid,
          cpu: 5.5,
          memory: {
            rss: 1024,
            heapTotal: 2048,
            heapUsed: 1536
          },
          uptime: 1000
        });
      }, 0);
    });
    this.stop = jest.fn();
  }
}

// Create mock instances
const mockProcess = new MockProcess();
let mockMonitor: MockMonitor;

// Set up mock implementations
const childProcess = require('child_process');
const ProcessMonitor = require('../../src/lib/ProcessMonitor').ProcessMonitor;

childProcess.spawn = jest.fn(() => mockProcess);
ProcessMonitor.mockImplementation((process: ChildProcess) => {
  mockMonitor = new MockMonitor(process);
  return mockMonitor;
});

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
    
    // Create test directory and required files with proper permissions
    await mkdir(testConfigDir, { recursive: true });
    await chmod(testConfigDir, 0o777);
    
    await writeFile(testLLMConfig.modelPath, 'mock model data');
    await chmod(testLLMConfig.modelPath, 0o777);
    
    await writeFile(testLLMConfig.configPath, JSON.stringify({ schemaVersion: 1 }));
    await chmod(testLLMConfig.configPath, 0o777);
    
    await writeFile(testMCPConfig.configPath, JSON.stringify({ schemaVersion: 1 }));
    await chmod(testMCPConfig.configPath, 0o777);
    
    // Create manager instance
    manager = new ServerManager(testConfigDir);
    await manager.initialize();
  });

  afterEach(async () => {
    // Stop any running servers
    try {
      await manager.stopServer(testLLMConfig.id);
    } catch (error) {
      // Ignore errors if server wasn't running
    }

    try {
      await manager.stopServer(testMCPConfig.id);
    } catch (error) {
      // Ignore errors if server wasn't running
    }

    // Clean up test directory
    try {
      // Use recursive removal with force option
      await rm(testConfigDir, { recursive: true, force: true });
    } catch (error: any) {
      if (error.code !== 'ENOENT') { // Ignore if directory doesn't exist
        console.warn('Failed to clean up test directory:', error);
      }
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

      // Create promise before starting server
      const statsPromise = new Promise<void>((resolve) => {
        manager.once('server:stats', ({ id, stats }) => {
          expect(id).toBe(testLLMConfig.id);
          expect(stats).toEqual(mockStats);
          resolve();
        });
      });

      // Start server
      await manager.startServer(testLLMConfig.id);

      // Verify monitor was started
      expect(mockMonitor.start).toHaveBeenCalledTimes(1);

      // Emit stats event
      mockMonitor.emit('stats', mockStats);
      
      // Wait for promise with a reasonable timeout
      await expect(statsPromise).resolves.toBeUndefined();
    }, 5000); // 5 second timeout

    it('handles monitor errors gracefully', async () => {
      // Create promise before starting server
      const errorPromise = new Promise<void>((resolve) => {
        manager.once('server:monitor:error', ({ id, error }) => {
          expect(id).toBe(testLLMConfig.id);
          expect(error.message).toBe('Monitor error');
          resolve();
        });
      });

      // Start server
      await manager.startServer(testLLMConfig.id);

      // Verify monitor was started
      expect(mockMonitor.start).toHaveBeenCalledTimes(1);

      // Emit error event
      mockMonitor.emit('error', new Error('Monitor error'));
      
      // Wait for promise with a reasonable timeout
      await expect(errorPromise).resolves.toBeUndefined();
    }, 5000); // 5 second timeout

    it('stops monitoring when server is stopped', async () => {
      // Start server
      await manager.startServer(testLLMConfig.id);
      
      // Verify monitor was started
      expect(mockMonitor.start).toHaveBeenCalledTimes(1);
      
      // Clear any previous calls to stop
      mockMonitor.stop.mockClear();
      
      // Stop server
      await manager.stopServer(testLLMConfig.id);
      
      // Verify stop was called
      expect(mockMonitor.stop).toHaveBeenCalledTimes(1);
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