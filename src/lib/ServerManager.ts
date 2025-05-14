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

export class ServerManager extends EventEmitter {
  private servers: Map<string, ChildProcess>;
  private configs: Map<string, ServerConfig>;
  private monitors: Map<string, ProcessMonitor>;
  private configPath: string;

  constructor(configPath: string) {
    super();
    this.servers = new Map();
    this.configs = new Map();
    this.monitors = new Map();
    this.configPath = configPath;
  }

  async initialize(): Promise<void> {
    try {
      await fs.access(this.configPath);
      const configData = await fs.readFile(this.configPath, 'utf-8');
      const configs = JSON.parse(configData) as ServerConfig[];
      configs.forEach(config => this.configs.set(config.id, config));
    } catch (error) {
      // If config file doesn't exist, create it
      await fs.writeFile(this.configPath, JSON.stringify([], null, 2));
    }
  }

  private async saveConfigs(): Promise<void> {
    const configs = Array.from(this.configs.values());
    await fs.writeFile(this.configPath, JSON.stringify(configs, null, 2));
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
        this.configs.set(id, { ...config, status: 'error', lastError: error.message });
        this.saveConfigs();
      });

      serverProcess.on('exit', (code) => {
        this.servers.delete(id);
        this.monitors.get(id)?.stop();
        this.monitors.delete(id);
        
        if (code !== 0) {
          this.configs.set(id, { 
            ...config, 
            status: 'error', 
            lastError: `Process exited with code ${code}` 
          });
        } else {
          this.configs.set(id, { ...config, status: 'stopped' });
        }
        this.saveConfigs();
        this.emit('server:stopped', { id, code });
      });

      // Update config with running status
      this.configs.set(id, { ...config, status: 'running', lastStarted: new Date() });
      await this.saveConfigs();
      
      this.emit('server:started', { id });
    } catch (error) {
      this.configs.set(id, { 
        ...config, 
        status: 'error', 
        lastError: error instanceof Error ? error.message : 'Unknown error' 
      });
      await this.saveConfigs();
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
    
    const config = this.configs.get(id);
    if (config) {
      this.configs.set(id, { ...config, status: 'stopped' });
      await this.saveConfigs();
    }
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
    // For new servers, just add them
    if (!this.configs.has(id)) {
      this.configs.set(id, { ...config, status: 'stopped' });
      await this.saveConfigs();
      return;
    }

    // For existing servers, check if they're running
    const existingConfig = this.configs.get(id)!;
    if (this.servers.has(id)) {
      throw new Error(`Cannot update config while server ${id} is running`);
    }

    this.configs.set(id, { ...existingConfig, ...config });
    await this.saveConfigs();
  }

  async listServers(): Promise<ServerConfig[]> {
    return Array.from(this.configs.values());
  }
} 