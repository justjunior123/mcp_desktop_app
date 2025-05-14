import { ServerManager } from '../../src/lib/ServerManager';
import { LLMServerConfig, MCPServerConfig } from '../../src/types/server';
import * as path from 'path';
import * as fs from 'fs/promises';
import { jest } from '@jest/globals';
import { EventEmitter } from 'events';
import { ChildProcess } from 'child_process';

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

jest.mock('child_process', () => ({
  spawn: jest.fn().mockImplementation(() => new MockProcess())
}));

jest.mock('../../src/lib/ProcessMonitor', () => {
  return {
    ProcessMonitor: jest.fn().mockImplementation(() => new MockMonitor())
  };
});

describe('ServerManager', () => {
  let manager: ServerManager;
  const testConfigPath = path.join(process.cwd(), 'test-servers.json');
  
  const testLLMConfig: LLMServerConfig = {
    id: 'test-llm',
    name: 'Test LLM',
    type: 'llm',
    status: 'stopped',
    port: 8000,
    modelPath: '/path/to/model',
    configPath: '/path/to/config',
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
    configPath: '/path/to/mcp/config',
    maxConcurrentRequests: 10,
    timeout: 30000
  };

  beforeEach(async () => {
    // Clear any existing test config file
    try {
      await fs.unlink(testConfigPath);
    } catch (error) {
      // Ignore if file doesn't exist
    }
    
    // Clear all mocks
    jest.clearAllMocks();
    
    manager = new ServerManager(testConfigPath);
    await manager.initialize();
  });

  afterEach(async () => {
    // Clean up test config file
    try {
      await fs.unlink(testConfigPath);
    } catch (error) {
      // Ignore if file doesn't exist
    }
  });

  describe('initialization', () => {
    it('creates a new config file if none exists', async () => {
      const exists = await fs.access(testConfigPath)
        .then(() => true)
        .catch(() => false);
      expect(exists).toBe(true);

      const content = await fs.readFile(testConfigPath, 'utf-8');
      expect(JSON.parse(content)).toEqual([]);
    });
  });

  describe('server management', () => {
    beforeEach(async () => {
      await manager.updateConfig(testLLMConfig.id, testLLMConfig);
      await manager.updateConfig(testMCPConfig.id, testMCPConfig);
    });

    it('lists configured servers', async () => {
      const servers = await manager.listServers();
      expect(servers).toHaveLength(2);
      expect(servers).toEqual(expect.arrayContaining([testLLMConfig, testMCPConfig]));
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
      
      // Get the mock monitor
      const { ProcessMonitor } = require('../../src/lib/ProcessMonitor');
      const mockMonitor = ProcessMonitor.mock.results[0].value;
      
      // Emit stats
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
      
      // Get the mock monitor
      const { ProcessMonitor } = require('../../src/lib/ProcessMonitor');
      const mockMonitor = ProcessMonitor.mock.results[0].value;
      
      // Emit error
      mockMonitor.emit('error', mockError);
      
      await errorPromise;
    });

    it('stops monitoring when server is stopped', async () => {
      await manager.startServer(testLLMConfig.id);
      
      // Get the mock monitor
      const { ProcessMonitor } = require('../../src/lib/ProcessMonitor');
      const mockMonitor = ProcessMonitor.mock.results[0].value;
      
      await manager.stopServer(testLLMConfig.id);
      expect(mockMonitor.stop).toHaveBeenCalled();
    });

    it('includes memory stats in server status', async () => {
      await manager.startServer(testLLMConfig.id);
      const status = await manager.getStatus(testLLMConfig.id);
      
      expect(status.memory).toBeDefined();
      expect(status.memory?.used).toBeDefined();
      expect(status.memory?.total).toBeDefined();
    });
  });
}); 