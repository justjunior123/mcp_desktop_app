import { Client } from "@modelcontextprotocol/client";
import { StreamableHTTPClientTransport } from "@modelcontextprotocol/client/streamableHttp";
import { Tool, ToolParameters } from "@modelcontextprotocol/protocol";

export class MCPClient {
  private client: Client;
  private transport: StreamableHTTPClientTransport;
  private isConnected: boolean = false;

  constructor(serverUrl: string) {
    this.client = new Client({
      name: "mcp-desktop-client",
      version: "1.0.0"
    });
    this.transport = new StreamableHTTPClientTransport(new URL(serverUrl));
  }

  public async connect(): Promise<void> {
    try {
      await this.client.connect(this.transport);
      this.isConnected = true;
    } catch (error) {
      this.isConnected = false;
      throw error;
    }
  }

  public async disconnect(): Promise<void> {
    try {
      await this.transport.disconnect();
      this.isConnected = false;
    } catch (error) {
      throw error;
    }
  }

  public async listTools(): Promise<Tool[]> {
    if (!this.isConnected) {
      throw new Error("Client not connected");
    }
    return this.client.listTools();
  }

  public async invokeTool(name: string, params: ToolParameters): Promise<unknown> {
    if (!this.isConnected) {
      throw new Error("Client not connected");
    }
    return this.client.invoke(name, params);
  }

  public getConnectionStatus(): boolean {
    return this.isConnected;
  }
} 