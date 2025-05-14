import { McpServer } from "@modelcontextprotocol/server";
import { StreamableHTTPServerTransport } from "@modelcontextprotocol/server/streamableHttp";
import express from "express";
import { Tool } from "@modelcontextprotocol/protocol";
import { Server } from "http";

export class LocalMCPServer {
  private server: McpServer;
  private app: express.Express;
  private httpServer: Server | null = null;
  private port: number;

  constructor(port: number = 3100) {
    this.port = port;
    this.app = express();
    this.app.use(express.json());

    // Initialize MCP Server
    this.server = new McpServer({
      name: "mcp-desktop-local",
      version: "1.0.0"
    });

    // Setup basic tools
    this.registerDefaultTools();
  }

  private registerDefaultTools() {
    // Echo tool for testing
    const echoTool: Tool = {
      name: "echo",
      description: "Echoes back the input",
      parameters: {
        type: "object",
        properties: {
          message: {
            type: "string",
            description: "Message to echo back"
          }
        },
        required: ["message"]
      }
    };

    this.server.addTool(echoTool, async (params) => {
      return { message: params.message };
    });

    // System info tool
    const systemInfoTool: Tool = {
      name: "systemInfo",
      description: "Get system information",
      parameters: {
        type: "object",
        properties: {},
        required: []
      }
    };

    this.server.addTool(systemInfoTool, async () => {
      return {
        platform: process.platform,
        arch: process.arch,
        version: process.version,
        memory: process.memoryUsage()
      };
    });
  }

  public async start(): Promise<void> {
    // Create HTTP server
    this.httpServer = new Server(this.app);

    // Setup MCP transport
    const transport = new StreamableHTTPServerTransport(this.app, "/mcp");
    await this.server.connect(transport);

    // Start listening
    return new Promise((resolve, reject) => {
      this.httpServer?.listen(this.port, () => {
        console.log(`MCP Server listening on port ${this.port}`);
        resolve();
      }).on('error', reject);
    });
  }

  public async stop(): Promise<void> {
    return new Promise((resolve, reject) => {
      if (this.httpServer) {
        this.httpServer.close((err) => {
          if (err) reject(err);
          else resolve();
        });
      } else {
        resolve();
      }
    });
  }

  public getPort(): number {
    return this.port;
  }

  public getServer(): McpServer {
    return this.server;
  }
} 