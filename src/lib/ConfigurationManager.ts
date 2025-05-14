import { LLMServerConfig, MCPServerConfig, ServerConfig } from '../types/server';
import { EventEmitter } from 'events';
import * as fs from 'fs';
import * as path from 'path';
import { promisify } from 'util';
import { ConfigMigrationRegistry, migrations } from './migrations';

const mkdir = promisify(fs.mkdir);
const writeFile = promisify(fs.writeFile);
const readFile = promisify(fs.readFile);
const readdir = promisify(fs.readdir);
const unlink = promisify(fs.unlink);
const access = promisify(fs.access);

export interface ValidationResult {
  isValid: boolean;
  errors: ValidationError[];
}

export interface ValidationError {
  field: string;
  message: string;
}

export class ConfigurationManager extends EventEmitter {
  private configDir: string;
  private schemaVersion: number = 1;
  private migrationRegistry: ConfigMigrationRegistry;

  constructor(configDir: string) {
    super();
    this.configDir = configDir;
    this.migrationRegistry = new ConfigMigrationRegistry(this.schemaVersion);
    
    // Register all migrations
    migrations.forEach(migration => {
      this.migrationRegistry.registerMigration(migration);
    });
  }

  async initialize(): Promise<void> {
    try {
      await mkdir(this.configDir, { recursive: true });
    } catch (error) {
      throw new Error(`Failed to create config directory: ${error}`);
    }
  }

  async validateLLMConfig(config: LLMServerConfig): Promise<ValidationResult> {
    const errors: ValidationError[] = [];

    // Required fields
    if (!config.modelPath) {
      errors.push({ field: 'modelPath', message: 'Model path is required' });
    }
    if (!config.configPath) {
      errors.push({ field: 'configPath', message: 'Config path is required' });
    }
    if (!config.modelType) {
      errors.push({ field: 'modelType', message: 'Model type is required' });
    }

    // Port validation
    if (config.port < 1024 || config.port > 65535) {
      errors.push({ field: 'port', message: 'Port must be between 1024 and 65535' });
    }

    // Context size validation
    if (config.contextSize < 512 || config.contextSize > 32768) {
      errors.push({ field: 'contextSize', message: 'Context size must be between 512 and 32768' });
    }

    // Quantization validation
    const validQuantizations = ['q4_k_m', 'q5_k_m', 'q6_k', 'q8_0'];
    if (!validQuantizations.includes(config.quantization)) {
      errors.push({ field: 'quantization', message: `Quantization must be one of: ${validQuantizations.join(', ')}` });
    }

    return {
      isValid: errors.length === 0,
      errors
    };
  }

  async validateMCPConfig(config: MCPServerConfig): Promise<ValidationResult> {
    const errors: ValidationError[] = [];

    // Required fields
    if (!config.configPath) {
      errors.push({ field: 'configPath', message: 'Config path is required' });
    }

    // Port validation
    if (config.port < 1024 || config.port > 65535) {
      errors.push({ field: 'port', message: 'Port must be between 1024 and 65535' });
    }

    // Max concurrent requests validation
    if (config.maxConcurrentRequests < 1 || config.maxConcurrentRequests > 100) {
      errors.push({ field: 'maxConcurrentRequests', message: 'Max concurrent requests must be between 1 and 100' });
    }

    // Timeout validation
    if (config.timeout < 1000 || config.timeout > 300000) {
      errors.push({ field: 'timeout', message: 'Timeout must be between 1000ms and 300000ms' });
    }

    return {
      isValid: errors.length === 0,
      errors
    };
  }

  async validateConfig(config: ServerConfig): Promise<ValidationResult> {
    // Common validation
    const errors: ValidationError[] = [];

    if (!config.id) {
      errors.push({ field: 'id', message: 'ID is required' });
    }
    if (!config.name) {
      errors.push({ field: 'name', message: 'Name is required' });
    }
    if (!config.type) {
      errors.push({ field: 'type', message: 'Type is required' });
    }

    // Type-specific validation
    let typeValidation: ValidationResult = { isValid: false, errors: [] };
    if (config.type === 'llm') {
      typeValidation = await this.validateLLMConfig(config as LLMServerConfig);
    } else if (config.type === 'mcp') {
      typeValidation = await this.validateMCPConfig(config as MCPServerConfig);
    } else {
      errors.push({ field: 'type', message: 'Type must be either "llm" or "mcp"' });
      return { isValid: false, errors };
    }

    return {
      isValid: errors.length === 0 && typeValidation.isValid,
      errors: [...errors, ...typeValidation.errors]
    };
  }

  async saveConfig(config: ServerConfig): Promise<void> {
    // Skip validation for configs that are being migrated
    if (!config.schemaVersion || config.schemaVersion === this.schemaVersion) {
      const validation = await this.validateConfig(config);
      if (!validation.isValid) {
        throw new Error(`Invalid configuration: ${validation.errors.map(e => `${e.field}: ${e.message}`).join(', ')}`);
      }
    }

    const configPath = path.join(this.configDir, `${config.id}.json`);
    const configData = {
      ...config,
      schemaVersion: config.schemaVersion || this.schemaVersion
    };

    try {
      await writeFile(configPath, JSON.stringify(configData, null, 2));
      this.emit('config:updated', { id: config.id, config });
    } catch (error) {
      throw new Error(`Failed to save configuration: ${error}`);
    }
  }

  async loadConfig(id: string): Promise<ServerConfig> {
    const configPath = path.join(this.configDir, `${id}.json`);
    try {
      const configData = await readFile(configPath, 'utf-8');
      let config = JSON.parse(configData);

      // Set default schema version if missing
      if (!config.schemaVersion) {
        config.schemaVersion = 1;
        await this.saveConfig(config);
      }

      // Handle migration if needed
      if (config.schemaVersion !== this.schemaVersion) {
        try {
          config = await this.migrateConfig(config);
        } catch (error) {
          if (error instanceof Error && error.name === 'ConfigMigrationError') {
            throw new Error(`Schema version mismatch. Expected ${this.schemaVersion}, got ${config.schemaVersion}`);
          }
          throw error;
        }
      }

      return config;
    } catch (error) {
      throw new Error(`Failed to load configuration: ${error}`);
    }
  }

  private async migrateConfig(config: any): Promise<ServerConfig> {
    const fromVersion = config.schemaVersion || 1;
    
    // Don't allow downgrading
    if (fromVersion > this.schemaVersion) {
      throw new Error(`Schema version mismatch. Expected ${this.schemaVersion}, got ${fromVersion}`);
    }

    const migrations = this.migrationRegistry.getMigrationPath(fromVersion, this.schemaVersion);

    let migratedConfig = { ...config };
    for (const migration of migrations) {
      try {
        // Apply migration while preserving previous fields
        const result = await migration.migrate(migratedConfig);
        migratedConfig = {
          ...migratedConfig,  // Keep existing fields
          ...result,          // Add new fields from migration
          schemaVersion: migration.version
        };
        
        // Save the migrated config after each successful migration
        await this.saveConfig(migratedConfig);
        
        // Emit migration event after successful migration and save
        this.emit('config:migrated', {
          id: config.id,
          fromVersion: migration.version - 1,
          toVersion: migration.version,
          description: migration.description
        });
      } catch (error: any) {
        throw new Error(`Migration to version ${migration.version} failed: ${error.message}`);
      }
    }

    return migratedConfig;
  }

  async listConfigs(): Promise<ServerConfig[]> {
    try {
      const files = await readdir(this.configDir);
      const configFiles = files.filter(file => file.endsWith('.json'));
      
      const configs = await Promise.all(
        configFiles.map(async file => {
          try {
            const id = path.basename(file, '.json');
            return await this.loadConfig(id);
          } catch (error) {
            console.warn(`Failed to load config ${file}:`, error);
            return null;
          }
        })
      );

      return configs.filter((config): config is ServerConfig => config !== null);
    } catch (error) {
      throw new Error(`Failed to list configurations: ${error}`);
    }
  }

  async deleteConfig(id: string): Promise<void> {
    const configPath = path.join(this.configDir, `${id}.json`);
    try {
      await unlink(configPath);
      this.emit('config:deleted', { id });
    } catch (error) {
      throw new Error(`Failed to delete configuration: ${error}`);
    }
  }
} 