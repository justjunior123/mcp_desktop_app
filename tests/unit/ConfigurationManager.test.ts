import { ConfigurationManager } from '../../src/lib/ConfigurationManager';
import { LLMServerConfig, MCPServerConfig } from '../../src/types/server';
import * as path from 'path';
import * as fs from 'fs';
import { promisify } from 'util';
import { jest } from '@jest/globals';
import { migrations } from '../../src/lib/migrations';

const mkdir = promisify(fs.mkdir);
const writeFile = promisify(fs.writeFile);
const readFile = promisify(fs.readFile);
const readdir = promisify(fs.readdir);
const unlink = promisify(fs.unlink);
const access = promisify(fs.access);
const rmdir = promisify(fs.rmdir);

describe('ConfigurationManager', () => {
  let configManager: ConfigurationManager;
  const testConfigDir = path.join(process.cwd(), 'test-configs');

  const validLLMConfig: LLMServerConfig = {
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

  const validMCPConfig: MCPServerConfig = {
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
    // Create test directory
    await mkdir(testConfigDir, { recursive: true });
    configManager = new ConfigurationManager(testConfigDir);
    await configManager.initialize();
  });

  afterEach(async () => {
    try {
      const files = await readdir(testConfigDir);
      for (const file of files) {
        await unlink(path.join(testConfigDir, file));
      }
      await rmdir(testConfigDir);
    } catch (error) {
      console.warn('Failed to clean up test directory:', error);
    }
  });

  describe('initialization', () => {
    it('creates config directory if it does not exist', async () => {
      const customDir = path.join(testConfigDir, 'custom');
      const manager = new ConfigurationManager(customDir);
      await manager.initialize();

      const exists = await access(customDir)
        .then(() => true)
        .catch(() => false);
      expect(exists).toBe(true);
    });
  });

  describe('validation', () => {
    describe('LLM config validation', () => {
      it('validates a valid LLM config', async () => {
        const result = await configManager.validateConfig(validLLMConfig);
        expect(result.isValid).toBe(true);
        expect(result.errors).toHaveLength(0);
      });

      it('validates required fields', async () => {
        const invalidConfig = { ...validLLMConfig, modelPath: '', modelType: '' };
        const result = await configManager.validateConfig(invalidConfig);
        expect(result.isValid).toBe(false);
        expect(result.errors).toContainEqual({
          field: 'modelPath',
          message: 'Model path is required'
        });
        expect(result.errors).toContainEqual({
          field: 'modelType',
          message: 'Model type is required'
        });
      });

      it('validates port range', async () => {
        const invalidConfig = { ...validLLMConfig, port: 80 };
        const result = await configManager.validateConfig(invalidConfig);
        expect(result.isValid).toBe(false);
        expect(result.errors).toContainEqual({
          field: 'port',
          message: 'Port must be between 1024 and 65535'
        });
      });

      it('validates context size', async () => {
        const invalidConfig = { ...validLLMConfig, contextSize: 256 };
        const result = await configManager.validateConfig(invalidConfig);
        expect(result.isValid).toBe(false);
        expect(result.errors).toContainEqual({
          field: 'contextSize',
          message: 'Context size must be between 512 and 32768'
        });
      });

      it('validates quantization', async () => {
        const invalidConfig = { ...validLLMConfig, quantization: 'invalid' };
        const result = await configManager.validateConfig(invalidConfig);
        expect(result.isValid).toBe(false);
        expect(result.errors).toContainEqual({
          field: 'quantization',
          message: expect.stringContaining('Quantization must be one of:')
        });
      });
    });

    describe('MCP config validation', () => {
      it('validates a valid MCP config', async () => {
        const result = await configManager.validateConfig(validMCPConfig);
        expect(result.isValid).toBe(true);
        expect(result.errors).toHaveLength(0);
      });

      it('validates required fields', async () => {
        const invalidConfig = { ...validMCPConfig, configPath: '' };
        const result = await configManager.validateConfig(invalidConfig);
        expect(result.isValid).toBe(false);
        expect(result.errors).toContainEqual({
          field: 'configPath',
          message: 'Config path is required'
        });
      });

      it('validates port range', async () => {
        const invalidConfig = { ...validMCPConfig, port: 80 };
        const result = await configManager.validateConfig(invalidConfig);
        expect(result.isValid).toBe(false);
        expect(result.errors).toContainEqual({
          field: 'port',
          message: 'Port must be between 1024 and 65535'
        });
      });

      it('validates max concurrent requests', async () => {
        const invalidConfig = { ...validMCPConfig, maxConcurrentRequests: 0 };
        const result = await configManager.validateConfig(invalidConfig);
        expect(result.isValid).toBe(false);
        expect(result.errors).toContainEqual({
          field: 'maxConcurrentRequests',
          message: 'Max concurrent requests must be between 1 and 100'
        });
      });

      it('validates timeout', async () => {
        const invalidConfig = { ...validMCPConfig, timeout: 500 };
        const result = await configManager.validateConfig(invalidConfig);
        expect(result.isValid).toBe(false);
        expect(result.errors).toContainEqual({
          field: 'timeout',
          message: 'Timeout must be between 1000ms and 300000ms'
        });
      });
    });
  });

  describe('config management', () => {
    it('saves and loads a config', async () => {
      await configManager.saveConfig(validLLMConfig);
      const loadedConfig = await configManager.loadConfig(validLLMConfig.id);
      expect(loadedConfig).toEqual({
        ...validLLMConfig,
        schemaVersion: 1
      });
    });

    it('lists all configs', async () => {
      await configManager.saveConfig(validLLMConfig);
      await configManager.saveConfig(validMCPConfig);

      const configs = await configManager.listConfigs();
      expect(configs).toHaveLength(2);
      expect(configs).toEqual(
        expect.arrayContaining([
          expect.objectContaining({ id: validLLMConfig.id }),
          expect.objectContaining({ id: validMCPConfig.id })
        ])
      );
    });

    it('deletes a config', async () => {
      await configManager.saveConfig(validLLMConfig);
      await configManager.deleteConfig(validLLMConfig.id);

      await expect(configManager.loadConfig(validLLMConfig.id))
        .rejects.toThrow('Failed to load configuration');
    });

    it('emits events on config changes', async () => {
      const updatePromise = new Promise<void>((resolve) => {
        configManager.once('config:updated', ({ id, config }) => {
          expect(id).toBe(validLLMConfig.id);
          expect(config).toEqual(validLLMConfig);
          resolve();
        });
      });

      const deletePromise = new Promise<void>((resolve) => {
        configManager.once('config:deleted', ({ id }) => {
          expect(id).toBe(validLLMConfig.id);
          resolve();
        });
      });

      await configManager.saveConfig(validLLMConfig);
      await updatePromise;

      await configManager.deleteConfig(validLLMConfig.id);
      await deletePromise;
    });

    it('validates config before saving', async () => {
      const invalidConfig = { ...validLLMConfig, port: 80 };
      await expect(configManager.saveConfig(invalidConfig))
        .rejects.toThrow('Invalid configuration');
    });

    it('handles schema version mismatch', async () => {
      await configManager.saveConfig(validLLMConfig);
      
      // Manually modify the saved config to have a different schema version
      const configPath = path.join(testConfigDir, `${validLLMConfig.id}.json`);
      const configData = JSON.parse(await readFile(configPath, 'utf-8'));
      configData.schemaVersion = 2;
      await writeFile(configPath, JSON.stringify(configData));

      await expect(configManager.loadConfig(validLLMConfig.id))
        .rejects.toThrow('Schema version mismatch');
    });
  });

  describe('migrations', () => {
    it('handles missing schema version as version 1', async () => {
      const configWithoutVersion = { ...validLLMConfig };
      delete (configWithoutVersion as any).schemaVersion;
      
      await writeFile(
        path.join(testConfigDir, `${configWithoutVersion.id}.json`),
        JSON.stringify(configWithoutVersion)
      );

      const loadedConfig = await configManager.loadConfig(configWithoutVersion.id);
      expect(loadedConfig.schemaVersion).toBe(1);
    });

    it('emits migration events', async () => {
      // Register a test migration
      const testMigration = {
        version: 2,
        description: 'Test migration',
        migrate: async (config: any) => ({
          ...config,
          migratedField: true
        })
      };
      
      // Update schema version and register migrations
      (configManager as any).schemaVersion = 2;
      (configManager as any).migrationRegistry.registerMigration(testMigration);

      // Save config with old version
      const oldConfig = { ...validLLMConfig, schemaVersion: 1 };
      await configManager.saveConfig(oldConfig);

      // Set up event listener
      let migrationEventReceived = false;
      configManager.once('config:migrated', ({ id, fromVersion, toVersion }) => {
        expect(id).toBe(validLLMConfig.id);
        expect(fromVersion).toBe(1);
        expect(toVersion).toBe(2);
        migrationEventReceived = true;
      });

      const migratedConfig = await configManager.loadConfig(validLLMConfig.id) as any;

      // Wait for event to be processed
      await new Promise(resolve => setTimeout(resolve, 100));

      expect(migrationEventReceived).toBe(true);
      expect(migratedConfig.schemaVersion).toBe(2);
      expect(migratedConfig.migratedField).toBe(true);
    }, 5000);

    it('handles multiple migrations in sequence', async () => {
      // Register test migrations
      const testMigrations = [
        {
          version: 2,
          description: 'First test migration',
          migrate: async (config: any) => ({
            ...config,
            field1: 'value1'
          })
        },
        {
          version: 3,
          description: 'Second test migration',
          migrate: async (config: any) => ({
            ...config,
            field2: 'value2'
          })
        }
      ];

      // Update schema version and register migrations
      (configManager as any).schemaVersion = 3;
      testMigrations.forEach(migration => {
        (configManager as any).migrationRegistry.registerMigration(migration);
      });

      // Save config with old version
      const oldConfig = { ...validLLMConfig, schemaVersion: 1 };
      await configManager.saveConfig(oldConfig);

      // Track migration events
      let migrationsCompleted = 0;
      configManager.on('config:migrated', () => {
        migrationsCompleted++;
      });

      const migratedConfig = await configManager.loadConfig(validLLMConfig.id) as any;

      // Wait for events to be processed
      await new Promise(resolve => setTimeout(resolve, 100));

      expect(migrationsCompleted).toBe(2);
      expect(migratedConfig.schemaVersion).toBe(3);
      expect(migratedConfig.field1).toBe('value1');
      expect(migratedConfig.field2).toBe('value2');
    }, 5000);
  });
}); 