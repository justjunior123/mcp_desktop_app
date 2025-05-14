import { MockMCPServer, Tool, ToolParameters } from './mcp-mock';

export class TestServer extends MockMCPServer {
  constructor(port: number = 3100) {
    super({ port });
    this.registerTools();
  }

  private registerTools() {
    // Register a simple echo tool for testing
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
      },
      permission: 'read',
      enabled: true
    };

    this.addTool(echoTool, async (params: ToolParameters) => {
      const { message } = params as { message: string };
      return { message };
    });
  }

  async start(): Promise<void> {
    await super.start();
  }

  async stop(): Promise<void> {
    await super.stop();
  }
}

if (require.main === module) {
  const server = new TestServer();
  server.start().catch(console.error);
} 