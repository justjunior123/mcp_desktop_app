import { MockMCPClient } from './mcp-mock';
import { TestServer } from './test-server';

describe('MCP Integration Tests', () => {
  let server: TestServer;
  let client: MockMCPClient;
  const TEST_PORT = 3100;

  beforeAll(async () => {
    server = new TestServer(TEST_PORT);
    await server.start();
    client = new MockMCPClient(`http://localhost:${TEST_PORT}`);
    client.setServer(server);
  });

  afterAll(async () => {
    await server.stop();
  });

  it('should connect to the server', async () => {
    const isConnected = await client.isConnected();
    expect(isConnected).toBe(true);
  });

  it('should list available tools', async () => {
    const tools = await client.listTools();
    expect(tools).toHaveLength(1);
    expect(tools[0].name).toBe('echo');
  });

  it('should invoke the echo tool', async () => {
    const testMessage = 'Hello MCP!';
    const result = await client.invoke('echo', { message: testMessage });
    expect(result).toEqual({ message: testMessage });
  });

  it('should handle invalid tool invocations', async () => {
    await expect(client.invoke('nonexistent', {}))
      .rejects.toThrow('Tool nonexistent not found');
  });

  it('should handle invalid parameters', async () => {
    await expect(client.invoke('echo', {}))
      .rejects.toThrow('Missing required parameter: message');
  });
}); 