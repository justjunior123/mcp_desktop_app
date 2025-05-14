import { LocalMCPServer } from '../../src/mcp/server/LocalMCPServer';
import { MCPClient } from '../../src/mcp/client/MCPClient';

describe('Local MCP Integration Tests', () => {
  let server: LocalMCPServer;
  let client: MCPClient;
  const TEST_PORT = 3100;

  beforeAll(async () => {
    // Start server
    server = new LocalMCPServer(TEST_PORT);
    await server.start();

    // Connect client
    client = new MCPClient(`http://localhost:${TEST_PORT}`, {
      name: 'test-client',
      version: '1.0.0'
    });
    await client.connect();
  });

  afterAll(async () => {
    await client.disconnect();
    await server.stop();
  });

  describe('Server Connection', () => {
    it('should connect successfully', () => {
      expect(client.getConnectionStatus()).toBe(true);
    });

    it('should have correct server URL', () => {
      expect(client.getServerUrl()).toBe(`http://localhost:${TEST_PORT}`);
    });
  });

  describe('Tool Management', () => {
    it('should list available tools', async () => {
      const tools = await client.listTools();
      expect(tools).toHaveLength(2); // echo and systemInfo tools
      expect(tools.map(t => t.name)).toContain('echo');
      expect(tools.map(t => t.name)).toContain('systemInfo');
    });

    it('should invoke echo tool', async () => {
      const testMessage = 'Hello MCP!';
      const result = await client.invoke('echo', { message: testMessage });
      expect(result).toEqual({ message: testMessage });
    });

    it('should invoke systemInfo tool', async () => {
      const result = await client.invoke('systemInfo', {});
      expect(result).toHaveProperty('platform');
      expect(result).toHaveProperty('arch');
      expect(result).toHaveProperty('version');
      expect(result).toHaveProperty('memory');
    });

    it('should handle invalid tool invocations', async () => {
      await expect(client.invoke('nonexistent', {}))
        .rejects.toThrow();
    });

    it('should handle invalid parameters', async () => {
      await expect(client.invoke('echo', {}))
        .rejects.toThrow('Missing required parameter: message');
    });
  });

  describe('Tool State Management', () => {
    it('should handle tool enable/disable', async () => {
      // Disable echo tool
      server.disableTool('echo');
      await expect(client.invoke('echo', { message: 'test' }))
        .rejects.toThrow('Tool echo is disabled');

      // Re-enable echo tool
      server.enableTool('echo');
      const result = await client.invoke('echo', { message: 'test' });
      expect(result).toEqual({ message: 'test' });
    });

    it('should handle tool removal', async () => {
      // Remove systemInfo tool
      server.removeTool('systemInfo');
      
      const tools = await client.listTools();
      expect(tools.map(t => t.name)).not.toContain('systemInfo');
      
      await expect(client.invoke('systemInfo', {}))
        .rejects.toThrow('Tool systemInfo not found');
    });
  });
}); 