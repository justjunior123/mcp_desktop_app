import { ServerManager } from '../../src/lib/ServerManager';
import { LLMServerConfig, MCPServerConfig } from '../../src/types/server';
import * as path from 'path';
import * as fs from 'fs/promises';
import { jest } from '@jest/globals';

jest.mock('child_process', () => ({
  spawn: jest.fn().mockImplementation(() => ({
    on: jest.fn(),
    kill: jest.fn()
  }))
}));

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
      await expect(manager.updateConfig(testLLMConfig.id, { port: 8002 }))
        .rejects.toThrow('Cannot update config while server');
    });
  });
}); 