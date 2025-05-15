import { DatabaseService } from '../../services/database/DatabaseService';
import { LocalMCPServer } from './LocalMCPServer';
import { MCPServer as MCPServerModel } from '@prisma/client';
import { createServer } from 'net';

export class MCPServerManager {
  private servers: Map<string, LocalMCPServer> = new Map();
  private db: DatabaseService;

  constructor(db: DatabaseService) {
    this.db = db;
  }

  /**
   * Check if a port is available
   */
  async isPortAvailable(port: number): Promise<boolean> {
    return new Promise((resolve) => {
      const server = createServer();
      server.once('error', (err: NodeJS.ErrnoException) => {
        server.close();
        if (err.code === 'EADDRINUSE') {
          resolve(false);
        } else {
          resolve(true);
        }
      });
      server.once('listening', () => {
        server.close();
        resolve(true);
      });
      server.listen(port);
    });
  }

  /**
   * Find next available port starting from a given port
   */
  private async findAvailablePort(startPort: number): Promise<number> {
    let port = startPort;
    while (!(await this.isPortAvailable(port))) {
      port++;
    }
    return port;
  }

  /**
   * Create a new MCP server instance and store it in the database
   */
  async createServer(name: string, port: number, modelId: string): Promise<MCPServerModel> {
    // Check if port is available, if not find next available port
    if (!(await this.isPortAvailable(port))) {
      throw new Error(`Port ${port} is already in use`);
    }
    
    // Create server record in database
    const serverRecord = await this.db.createMCPServer({
      name,
      port,
      status: 'stopped',
      model: {
        connect: { id: modelId }
      }
    });

    // Create server instance
    const server = new LocalMCPServer(port);
    this.servers.set(serverRecord.id, server);

    return serverRecord;
  }

  /**
   * Start an MCP server by its ID
   */
  async startServer(id: string): Promise<void> {
    let server = this.servers.get(id);
    if (!server) {
      throw new Error(`Server ${id} not found`);
    }

    const dbServer = await this.db.getMCPServer(id);
    if (!dbServer) {
      throw new Error(`Server ${id} not found in database`);
    }

    try {
      // Check if port is available
      if (!(await this.isPortAvailable(dbServer.port))) {
        // Try to find a new port
        const newPort = await this.findAvailablePort(dbServer.port + 1);
        await this.updateServer(id, { port: newPort });
        const newServer = new LocalMCPServer(newPort);
        this.servers.set(id, newServer);
        server = newServer;
      }

      await server.start();
      await this.db.updateMCPServer(id, { status: 'running' });
    } catch (error) {
      await this.db.updateMCPServer(id, { status: 'error' });
      throw error;
    }
  }

  /**
   * Stop an MCP server by its ID
   */
  async stopServer(id: string): Promise<void> {
    const server = this.servers.get(id);
    if (!server) {
      throw new Error(`Server ${id} not found`);
    }

    try {
      await Promise.race([
        server.stop(),
        new Promise((_, reject) => 
          setTimeout(() => reject(new Error('Server stop timeout')), 5000).unref()
        )
      ]);
      await this.db.updateMCPServer(id, { status: 'stopped' });
    } catch (error) {
      console.error(`Error stopping server ${id}:`, error);
      await this.db.updateMCPServer(id, { status: 'error' });
      throw error;
    }
  }

  /**
   * Get a server instance by its ID
   */
  getServer(id: string): LocalMCPServer | undefined {
    return this.servers.get(id);
  }

  /**
   * List all servers
   */
  async listServers(): Promise<MCPServerModel[]> {
    return this.db.listMCPServers();
  }

  /**
   * Delete a server by its ID
   */
  async deleteServer(id: string): Promise<void> {
    const server = this.servers.get(id);
    if (server) {
      try {
        await Promise.race([
          server.cleanup(),
          new Promise((_, reject) => 
            setTimeout(() => reject(new Error('Server cleanup timeout')), 5000).unref()
          )
        ]);
      } catch (error) {
        console.error(`Error cleaning up server ${id}:`, error);
      } finally {
        this.servers.delete(id);
      }
    }

    try {
      await this.db.deleteMCPServer(id);
    } catch (error) {
      // If server doesn't exist in DB, that's fine
      if (!(error instanceof Error && error.message.includes('Record to delete does not exist'))) {
        throw error;
      }
    }
  }

  /**
   * Load existing servers from database
   */
  async loadServers(): Promise<void> {
    const servers = await this.db.listMCPServers();
    
    for (const server of servers) {
      if (!this.servers.has(server.id)) {
        // Check if port is available
        const port = await this.findAvailablePort(server.port);
        if (port !== server.port) {
          // Update port in database if we had to change it
          await this.db.updateMCPServer(server.id, { port });
        }

        const instance = new LocalMCPServer(port);
        this.servers.set(server.id, instance);
        
        // Start server if it was running
        if (server.status === 'running') {
          try {
            await this.startServer(server.id);
          } catch (error) {
            console.error(`Error starting server ${server.id} during load:`, error);
            await this.db.updateMCPServer(server.id, { status: 'error' });
          }
        }
      }
    }
  }

  /**
   * Update server configuration
   */
  async updateServer(id: string, updates: {
    name?: string;
    port?: number;
    maxRequests?: number;
    timeout?: number;
  }): Promise<MCPServerModel> {
    const server = this.servers.get(id);
    if (!server) {
      throw new Error(`Server ${id} not found`);
    }

    // If port is being updated, verify it's available
    if (updates.port) {
      updates.port = await this.findAvailablePort(updates.port);
    }

    // Update database record
    const updated = await this.db.updateMCPServer(id, updates);

    // If port changed, we need to restart the server
    if (updates.port && updates.port !== server.getPort()) {
      const wasRunning = (await this.db.getMCPServer(id))?.status === 'running';
      
      try {
        if (wasRunning) {
          await this.stopServer(id);
        }
        
        const newServer = new LocalMCPServer(updates.port);
        this.servers.set(id, newServer);
        
        if (wasRunning) {
          await this.startServer(id);
        }
      } catch (error) {
        console.error(`Error updating server ${id} port:`, error);
        await this.db.updateMCPServer(id, { status: 'error' });
        throw error;
      }
    }

    return updated;
  }

  /**
   * Get server status from database
   */
  async getServerStatus(id: string): Promise<MCPServerModel | null> {
    const server = await this.db.getMCPServer(id);
    if (!server) return null;

    const instance = this.servers.get(id);
    if (!instance) {
      return server;
    }

    // Update status based on actual server state
    const currentStatus = instance.isServerRunning() ? 'running' : 'stopped';
    if (server.status !== currentStatus) {
      await this.db.updateMCPServer(id, { status: currentStatus });
      return await this.db.getMCPServer(id);
    }

    return server;
  }

  /**
   * Cleanup all servers
   */
  async cleanup(): Promise<void> {
    const servers = await this.listServers();
    await Promise.all(
      servers.map(async server => {
        try {
          await this.deleteServer(server.id);
        } catch (error) {
          console.error(`Error during cleanup of server ${server.id}:`, error);
        }
      })
    );
    this.servers.clear();
  }
} 