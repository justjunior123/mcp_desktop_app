import { MCPServer } from '../../src/mcp/server/MCPServer';
import { Tool } from '../../src/mcp/types/protocol';
import { MockMCPClient } from '../mcp/mcp-mock';

describe('MCPServer Unit Tests', () => {
  let server: MCPServer;
  let client: MockMCPClient;
  const TEST_PORT = 3101;

  beforeEach(async () => {
    server = new MCPServer({
      port: TEST_PORT,
      name: 'test-server',
      version: '1.0.0'
    });
    await server.start();
    
    client = new MockMCPClient(`http://localhost:${TEST_PORT}`);
    client.setServer(server as any); // Type assertion needed since server implementations differ slightly
  });

  afterEach(async () => {
    await server.stop();
  });

  describe('Server Connection', () => {
    it('should connect successfully', async () => {
      expect(await client.isConnected()).toBe(true);
    });
  });

  describe('Tool Management', () => {
    const testTool: Tool = {
      name: 'test',
      description: 'A test tool',
      parameters: {
        type: 'object',
        properties: {
          input: {
            type: 'string',
            description: 'Test input',
            required: true
          }
        },
        required: ['input']
      }
    };

    it('should list registered tools', async () => {
      server.addTool(testTool, async (params) => ({ output: params.input }));
      
      const tools = await client.listTools();
      expect(tools).toHaveLength(1);
      expect(tools[0]).toEqual(testTool);
    });

    it('should successfully invoke a registered tool', async () => {
      server.addTool(testTool, async (params) => ({ output: params.input }));
      
      const result = await client.invoke('test', {
        input: 'test-value'
      });
      
      expect(result).toEqual({ output: 'test-value' });
    });

    it('should handle non-existent tools', async () => {
      await expect(client.invoke('nonexistent', {}))
        .rejects.toThrow('Tool nonexistent not found');
    });

    it('should validate required parameters', async () => {
      server.addTool(testTool, async (params) => ({ output: params.input }));
      
      await expect(client.invoke('test', {}))
        .rejects.toThrow('Missing required parameter: input');
    });
  });
}); 