import { MCPServer } from './MCPServer';
import { Tool } from '../types/protocol';

async function main() {
  const server = new MCPServer({
    port: 3100,
    name: 'test-mcp-server',
    version: '1.0.0'
  });

  // Add echo tool
  const echoTool: Tool = {
    name: 'echo',
    description: 'Echoes back the input',
    parameters: {
      type: 'object',
      properties: {
        message: {
          type: 'string',
          description: 'Message to echo back',
          required: true
        }
      },
      required: ['message']
    },
    returns: {
      type: 'object',
      properties: {
        message: {
          type: 'string',
          description: 'The echoed message'
        }
      }
    }
  };

  server.addTool(echoTool, async (params) => {
    const { message } = params as { message: string };
    return { message };
  });

  // Add system info tool
  const systemInfoTool: Tool = {
    name: 'systemInfo',
    description: 'Get system information',
    parameters: {
      type: 'object',
      properties: {},
      required: []
    },
    returns: {
      type: 'object',
      properties: {
        platform: { type: 'string' },
        arch: { type: 'string' },
        version: { type: 'string' },
        memory: { type: 'object' }
      }
    }
  };

  server.addTool(systemInfoTool, async () => {
    return {
      platform: process.platform,
      arch: process.arch,
      version: process.version,
      memory: process.memoryUsage()
    };
  });

  try {
    await server.start();
    console.log('Test MCP server running on http://localhost:3100');
  } catch (error) {
    console.error('Failed to start server:', error);
    process.exit(1);
  }
}

if (require.main === module) {
  main().catch(console.error);
} 