const { Client } = require('@modelcontextprotocol/sdk/client/index.js');
const { describe, it, expect, beforeEach, afterEach } = require('@jest/globals');
const { StdioClientTransport } = require('@modelcontextprotocol/sdk/client/stdio.js');
const path = require('path');

describe('MCP Integration', () => {
  /** @type {import('@modelcontextprotocol/sdk/client/index.js').Client} */
  let client;
  /** @type {import('@modelcontextprotocol/sdk/client/stdio.js').StdioClientTransport} */
  let clientTransport;

  beforeEach(async () => {
    // Set up and connect client
    client = new Client({
      name: 'test-client',
      version: '1.0.0'
    });

    clientTransport = new StdioClientTransport({
      command: 'node',
      args: [
        path.join(__dirname, 'test-server.cjs')
      ]
    });

    await client.connect(clientTransport);
  }, 10000); // Increase timeout to 10 seconds

  afterEach(async () => {
    // Clean up resources
    if (client) {
      await client.close();
    }
  });

  it('should successfully initialize client', () => {
    expect(client).toBeDefined();
  });

  it('should successfully list tools', async () => {
    const { tools } = await client.listTools();
    expect(tools).toHaveLength(1);
    expect(tools[0]).toHaveProperty('name', 'echo');
  });

  it('should successfully call the echo tool', async () => {
    const testMessage = 'Hello MCP!';
    const result = await client.callTool({
      name: 'echo',
      arguments: { message: testMessage }
    });

    expect(result).toEqual({
      content: [
        {
          type: 'text',
          text: testMessage
        }
      ]
    });
  });

  it('should handle tool errors gracefully', async () => {
    await expect(client.callTool({
      name: 'non-existent-tool',
      arguments: {}
    })).rejects.toThrow();
  });

  it('should validate tool parameters', async () => {
    await expect(client.callTool({
      name: 'echo',
      arguments: { wrongParam: 'test' }
    })).rejects.toThrow();
  });
}); 