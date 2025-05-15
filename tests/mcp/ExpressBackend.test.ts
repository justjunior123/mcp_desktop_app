import { Express } from 'express';
import request from 'supertest';
import { DatabaseService } from '../../src/services/database/DatabaseService';
import { MCPServerManager } from '../../src/mcp/server/MCPServerManager';
import { createTestModel } from '../helpers/database';
import { setupExpressApp } from '../../src/mcp/server/express-setup';

// Set shorter timeout for tests
jest.setTimeout(10000);

describe('Express Backend Tests', () => {
  let app: Express;
  let db: DatabaseService;
  let manager: MCPServerManager;
  let testModel: { id: string };
  let createdServerIds: string[] = [];

  // Helper function to safely stop and delete a server
  const cleanupServer = async (id: string) => {
    try {
      const dbServer = await manager.getServerStatus(id);
      if (dbServer?.status === 'running') {
        await manager.stopServer(id);
      }
      await manager.deleteServer(id);
    } catch (error) {
      console.error(`Error cleaning up server ${id}:`, error);
    }
  };

  beforeAll(async () => {
    db = new DatabaseService();
    manager = new MCPServerManager(db);
    testModel = await createTestModel('Test Model');
    app = setupExpressApp(manager);
  });

  beforeEach(async () => {
    createdServerIds = [];
    // Ensure cleanup from previous tests
    await Promise.all((await manager.listServers()).map(s => cleanupServer(s.id)));
    jest.clearAllMocks();
  });

  afterEach(async () => {
    // Clean up any servers created during the test
    await Promise.all(createdServerIds.map(cleanupServer));
    createdServerIds = [];
    // Use setImmediate instead of setTimeout for cleanup delays
    await new Promise(resolve => setImmediate(resolve));
  });

  afterAll(async () => {
    // Final cleanup
    await Promise.all((await manager.listServers()).map(s => cleanupServer(s.id)));
    await manager.cleanup();
    // Use setImmediate instead of setTimeout for cleanup delays
    await new Promise(resolve => setImmediate(resolve));
  });

  // Helper function to track created servers
  const trackServer = (serverId: string) => {
    createdServerIds.push(serverId);
  };

  describe('Server Management API', () => {
    describe('GET /api/servers', () => {
      it('returns empty list when no servers exist', async () => {
        const response = await request(app)
          .get('/api/servers')
          .expect(200);
        
        expect(response.body).toEqual([]);
      });

      it('returns list of existing servers', async () => {
        const server1 = await manager.createServer('Server 1', 3300, testModel.id);
        const server2 = await manager.createServer('Server 2', 3301, testModel.id);
        trackServer(server1.id);
        trackServer(server2.id);

        const response = await request(app)
          .get('/api/servers')
          .expect(200);

        expect(response.body).toHaveLength(2);
        expect(response.body.map((s: any) => s.name)).toContain('Server 1');
        expect(response.body.map((s: any) => s.name)).toContain('Server 2');
      });
    });

    describe('POST /api/servers', () => {
      it('creates a new server with valid data', async () => {
        const response = await request(app)
          .post('/api/servers')
          .send({
            name: 'New Server',
            port: 3302,
            modelId: testModel.id
          })
          .expect(201);

        trackServer(response.body.id);
        expect(response.body.name).toBe('New Server');
        expect(response.body.port).toBe(3302);
        expect(response.body.status).toBe('stopped');
      });

      it('handles missing required fields', async () => {
        await request(app)
          .post('/api/servers')
          .send({
            name: 'Invalid Server'
            // missing port and modelId
          })
          .expect(400);
      });

      it('handles duplicate port numbers', async () => {
        const server = await manager.createServer('Server 1', 3303, testModel.id);
        trackServer(server.id);

        const response = await request(app)
          .post('/api/servers')
          .send({
            name: 'Server 2',
            port: 3303,
            modelId: testModel.id
          })
          .expect(409);

        expect(response.body.error).toBe('Port already in use');
      });
    });

    describe('Server State Management', () => {
      it('handles complete server lifecycle', async () => {
        // Create server
        const createResponse = await request(app)
          .post('/api/servers')
          .send({
            name: 'Lifecycle Test Server',
            port: 3304,
            modelId: testModel.id
          })
          .expect(201);

        const serverId = createResponse.body.id;
        trackServer(serverId);

        // Start server
        await request(app)
          .post(`/api/servers/${serverId}/start`)
          .expect(200);

        // Verify running status
        const runningResponse = await request(app)
          .get(`/api/servers/${serverId}`)
          .expect(200);
        expect(runningResponse.body.status).toBe('running');

        // Stop server
        await request(app)
          .post(`/api/servers/${serverId}/stop`)
          .expect(200);

        // Verify stopped status
        const stoppedResponse = await request(app)
          .get(`/api/servers/${serverId}`)
          .expect(200);
        expect(stoppedResponse.body.status).toBe('stopped');

        // Delete server
        await request(app)
          .delete(`/api/servers/${serverId}`)
          .expect(204);

        // Verify deletion
        await request(app)
          .get(`/api/servers/${serverId}`)
          .expect(404);
      });
    });

    describe('Error Handling', () => {
      it('handles invalid JSON in request body', async () => {
        await request(app)
          .post('/api/servers')
          .set('Content-Type', 'application/json')
          .send('{"invalid": json}')
          .expect(400);
      });

      it.skip('handles rate limiting', async () => {
        const requests = Array(10).fill(null).map(() =>
          request(app).get('/api/servers')
        );

        const responses = await Promise.all(requests);
        expect(responses.some(r => r.status === 429)).toBe(true);
      });

      it('handles database connection errors', async () => {
        const originalGetServer = manager.getServer.bind(manager);
        (manager as any).getServer = async () => { throw new Error('Database connection error'); };

        await request(app)
          .get('/api/servers/test-id')
          .expect(500)
          .expect(res => {
            expect(res.body.error).toBe('Internal server error');
          });

        manager.getServer = originalGetServer;
      });

      it('handles concurrent requests gracefully', async () => {
        const requests = Array(3).fill(null).map((_, i) =>
          request(app)
            .post('/api/servers')
            .send({
              name: `Concurrent Server ${i}`,
              port: 3400 + i,
              modelId: testModel.id
            })
        );

        const responses = await Promise.all(requests);
        responses.forEach(r => {
          if (r.status === 201) {
            trackServer(r.body.id);
          }
        });
        
        expect(responses.every(r => r.status === 201)).toBe(true);
        
        const ports = responses.map(r => r.body.port);
        const uniquePorts = new Set(ports);
        expect(uniquePorts.size).toBe(ports.length);
      });
    });

    describe('Health Check', () => {
      it('returns health status', async () => {
        const response = await request(app)
          .get('/api/health')
          .expect(200);

        expect(response.body).toHaveProperty('status', 'ok');
        expect(response.body).toHaveProperty('timestamp');
        expect(response.body).toHaveProperty('uptime');
      });

      it('health check is not rate limited', async () => {
        const requests = Array(10).fill(null).map(() =>
          request(app).get('/api/health')
        );

        const responses = await Promise.all(requests);
        expect(responses.every(r => r.status === 200)).toBe(true);
      });
    });
  });
}); 