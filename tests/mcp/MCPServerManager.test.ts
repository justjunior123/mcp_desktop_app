import { DatabaseService } from '../../src/services/database/DatabaseService';
import { MCPServerManager } from '../../src/mcp/server/MCPServerManager';
import { MCPServer, Model } from '@prisma/client';
import { createTestModel } from '../helpers/database';

describe('MCPServerManager', () => {
  let db: DatabaseService;
  let manager: MCPServerManager;
  let testModel: Model;

  beforeAll(async () => {
    db = new DatabaseService();
    manager = new MCPServerManager(db);
    
    // Create a test model that will be used by all tests
    testModel = await db.createModel({
      name: 'Test Model',
      status: 'installed',
      parameters: JSON.stringify({
        contextSize: 2048,
        temperature: 0.7
      })
    });
  });

  beforeEach(async () => {
    // Clean up any existing servers
    const servers = await manager.listServers();
    await Promise.all(servers.map(s => manager.deleteServer(s.id)));
  });

  afterEach(async () => {
    // Clean up after each test
    await manager.cleanup();
  });

  afterAll(async () => {
    // Clean up test model
    await db.deleteModel(testModel.id);
    await manager.cleanup();
    // Add a small delay to ensure all servers are properly shut down
    await new Promise(resolve => setTimeout(resolve, 100));
  });

  describe('Server Management', () => {
    it('creates a new server', async () => {
      const server = await manager.createServer('Test Server', 3201, testModel.id);
      expect(server).toBeDefined();
      expect(server.name).toBe('Test Server');
      expect(server.port).toBe(3201);
      expect(server.status).toBe('stopped');
    });

    it('starts and stops a server', async () => {
      const server = await manager.createServer('Test Server', 3201, testModel.id);
      
      await manager.startServer(server.id);
      let updated = await db.getMCPServer(server.id);
      expect(updated?.status).toBe('running');

      await manager.stopServer(server.id);
      updated = await db.getMCPServer(server.id);
      expect(updated?.status).toBe('stopped');
    });

    it('deletes a server', async () => {
      const server = await manager.createServer('Test Server', 3202, testModel.id);
      await manager.deleteServer(server.id);
      
      const deleted = await db.getMCPServer(server.id);
      expect(deleted).toBeNull();
    });

    it('updates server configuration', async () => {
      const server = await manager.createServer('Test Server', 3203, testModel.id);
      const updated = await manager.updateServer(server.id, {
        name: 'Updated Server',
        maxRequests: 20,
        timeout: 60000
      });

      expect(updated.name).toBe('Updated Server');
      expect(updated.maxRequests).toBe(20);
      expect(updated.timeout).toBe(60000);
    });

    it('loads existing servers from database', async () => {
      // Create a few servers
      await manager.createServer('Server 1', 3204, testModel.id);
      const running = await manager.createServer('Server 2', 3205, testModel.id);
      await manager.startServer(running.id);

      // Create new manager instance
      const newManager = new MCPServerManager(db);
      await newManager.loadServers();

      try {
        // Check if servers were loaded
        const servers = await newManager.listServers();
        expect(servers).toHaveLength(2);
        
        const runningServer = servers.find(s => s.id === running.id);
        expect(runningServer?.status).toBe('running');
      } finally {
        // Clean up the new manager
        await newManager.cleanup();
      }
    });

    it('handles server not found errors', async () => {
      await expect(manager.startServer('nonexistent')).rejects.toThrow('Server nonexistent not found');
      await expect(manager.stopServer('nonexistent')).rejects.toThrow('Server nonexistent not found');
      await expect(manager.updateServer('nonexistent', { name: 'test' })).rejects.toThrow('Server nonexistent not found');
    });

    it('handles server state transitions', async () => {
      const server = await manager.createServer('Test Server', 3206, testModel.id);
      
      // Test start
      await manager.startServer(server.id);
      let status = (await db.getMCPServer(server.id))?.status;
      expect(status).toBe('running');

      // Test stop
      await manager.stopServer(server.id);
      status = (await db.getMCPServer(server.id))?.status;
      expect(status).toBe('stopped');

      // Test port update while stopped
      await manager.updateServer(server.id, { port: 3207 });
      const updated = await db.getMCPServer(server.id);
      expect(updated?.port).toBe(3207);
      expect(updated?.status).toBe('stopped');
    });
  });
}); 