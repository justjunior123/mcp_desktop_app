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
    client = new MCPClient(`http://localhost:${TEST_PORT}/mcp`);
    await client.connect();
  });

  afterAll(async () => {
    await client.disconnect();
    await server.stop();
  });

  it('should connect successfully', () => {
    expect(client.getConnectionStatus()).toBe(true);
  });

  it('should list available tools', async () => {
    const tools = await client.listTools();
    expect(tools).toHaveLength(2); // echo and systemInfo tools
    expect(tools.map(t => t.name)).toContain('echo');
    expect(tools.map(t => t.name)).toContain('systemInfo');
  });

  it('should invoke echo tool', async () => {
    const testMessage = 'Hello MCP!';
    const result = await client.invokeTool('echo', { message: testMessage });
    expect(result).toEqual({ message: testMessage });
  });

  it('should invoke systemInfo tool', async () => {
    const result = await client.invokeTool('systemInfo', {});
    expect(result).toHaveProperty('platform');
    expect(result).toHaveProperty('arch');
    expect(result).toHaveProperty('version');
    expect(result).toHaveProperty('memory');
  });

  it('should handle invalid tool invocations', async () => {
    await expect(client.invokeTool('nonexistent', {}))
      .rejects.toThrow();
  });

  it('should handle invalid parameters', async () => {
    await expect(client.invokeTool('echo', {}))
      .rejects.toThrow();
  });
}); 