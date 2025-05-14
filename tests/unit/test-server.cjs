const { McpServer } = require('@modelcontextprotocol/sdk/server/mcp.js');
const { StdioServerTransport } = require('@modelcontextprotocol/sdk/server/stdio.js');
const { z } = require('zod');

async function main() {
  // Create MCP server
  const mcpServer = new McpServer({
    name: 'test-server',
    version: '1.0.0'
  });

  // Register the echo tool
  mcpServer.tool(
    'echo',
    {
      message: z.string().describe('Message to echo back')
    },
    async (args) => {
      return {
        content: [{
          type: 'text',
          text: args.message
        }]
      };
    }
  );

  // Set up server transport
  const serverTransport = new StdioServerTransport();
  await mcpServer.connect(serverTransport);

  // Keep the process running
  process.on('SIGTERM', async () => {
    await mcpServer.close();
    process.exit(0);
  });
}

main().catch(console.error); 