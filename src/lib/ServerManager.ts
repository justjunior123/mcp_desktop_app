import { 
  ServerConfig, 
  ServerStatus, 
  LLMServerConfig, 
  MCPServerConfig 
} from '../types/server';
import { EventEmitter } from 'events';
import { spawn, ChildProcess } from 'child_process';
import * as fs from 'fs/promises';
import * as path from 'path';
import { ProcessMonitor, ProcessStats } from './ProcessMonitor';
import { ConfigurationManager } from './ConfigurationManager';

export class ServerManager extends EventEmitter {
  private servers: Map<string, ChildProcess>;
  private configs: Map<string, ServerConfig>;
  private monitors: Map<string, ProcessMonitor>;
  private configManager: ConfigurationManager;

  constructor(configDir: string) {
    super();
    this.servers = new Map();
    this.configs = new Map();
    this.monitors = new Map();
    this.configManager = new ConfigurationManager(configDir);

    // Forward configuration events
    this.configManager.on('config:updated', (event) => this.emit('config:updated', event));
    this.configManager.on('config:deleted', (event) => this.emit('config:deleted', event));
  }

  async initialize(): Promise<void> {
    await this.configManager.initialize();
    
    // Load all configurations
    const configs = await this.configManager.listConfigs();
    for (const config of configs) {
      this.configs.set(config.id, config);
    }
  }

  async startServer(id: string): Promise<void> {
    const config = this.configs.get(id);
    if (!config) throw new Error(`Server ${id} not found`);
    if (this.servers.has(id)) throw new Error(`Server ${id} is already running`);

    try {
      let serverProcess: ChildProcess;
      
      if (config.type === 'llm') {
        const llmConfig = config as LLMServerConfig;
        serverProcess = spawn('python', [
          '-m', 'llama_cpp.server',
          '--model', llmConfig.modelPath,
          '--port', llmConfig.port.toString(),
          '--ctx-size', llmConfig.contextSize.toString(),
        ]);
      } else {
        const mcpConfig = config as MCPServerConfig;
        // Assuming MCP server is a Node.js application
        serverProcess = spawn('node', [
          path.join(process.cwd(), 'mcp', 'server.js'),
          '--port', mcpConfig.port.toString(),
          '--config', mcpConfig.configPath,
        ]);
      }

      this.servers.set(id, serverProcess);
      
      // Set up process monitoring
      const monitor = new ProcessMonitor(serverProcess);
      this.monitors.set(id, monitor);
      
      monitor.on('stats', (stats: ProcessStats) => {
        this.emit('server:stats', { id, stats });
      });

      monitor.on('error', (error: Error) => {
        this.emit('server:monitor:error', { id, error });
      });

      monitor.start();

      serverProcess.on('error', (error) => {
        this.emit('server:error', { id, error });
        this.updateServerStatus(id, 'error', error.message);
      });

      serverProcess.on('exit', (code) => {
        this.servers.delete(id);
        this.monitors.get(id)?.stop();
        this.monitors.delete(id);
        
        if (code !== 0) {
          this.updateServerStatus(id, 'error', `Process exited with code ${code}`);
        } else {
          this.updateServerStatus(id, 'stopped');
        }
        
        this.emit('server:stopped', { id, code });
      });

      // Update config with running status
      await this.updateServerStatus(id, 'running');
      this.emit('server:started', { id });
    } catch (error) {
      await this.updateServerStatus(
        id, 
        'error', 
        error instanceof Error ? error.message : 'Unknown error'
      );
      throw error;
    }
  }

  async stopServer(id: string): Promise<void> {
    const process = this.servers.get(id);
    if (!process) throw new Error(`Server ${id} is not running`);

    // Stop monitoring before killing the process
    const monitor = this.monitors.get(id);
    if (monitor) {
      monitor.stop();
      this.monitors.delete(id);
    }

    process.kill();
    this.servers.delete(id);
    await this.updateServerStatus(id, 'stopped');
  }

  async getStatus(id: string): Promise<ServerStatus> {
    const config = this.configs.get(id);
    if (!config) throw new Error(`Server ${id} not found`);

    const process = this.servers.get(id);
    const status: ServerStatus = {
      id,
      status: config.status,
      lastError: config.lastError
    };

    if (process && config.status === 'running') {
      // Add uptime if server is running
      const startTime = config.lastStarted?.getTime() || Date.now();
      status.uptime = Date.now() - startTime;
      
      // Add process stats if available
      const monitor = this.monitors.get(id);
      if (monitor) {
        status.memory = {
          used: 0, // Will be updated by monitor events
          total: 0
        };
        status.activeConnections = 0; // Will be updated by server events
      }
    }

    return status;
  }

  async updateConfig(id: string, config: ServerConfig): Promise<void> {
    // For new servers, validate and add them
    if (!this.configs.has(id)) {
      await this.configManager.saveConfig(config);
      this.configs.set(id, config);
      return;
    }

    // For existing servers, check if they're running
    if (this.servers.has(id)) {
      throw new Error(`Cannot update config while server ${id} is running`);
    }

    // Validate and save the updated config
    await this.configManager.saveConfig(config);
    this.configs.set(id, config);
  }

  async listServers(): Promise<ServerConfig[]> {
    return Array.from(this.configs.values());
  }

  private async updateServerStatus(
    id: string, 
    status: 'running' | 'stopped' | 'error',
    lastError?: string
  ): Promise<void> {
    const config = this.configs.get(id);
    if (!config) return;

    const updatedConfig = {
      ...config,
      status,
      lastError,
      lastStarted: status === 'running' ? new Date() : config.lastStarted
    };

    this.configs.set(id, updatedConfig);
    await this.configManager.saveConfig(updatedConfig);
  }
} 