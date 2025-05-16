declare module '@modelcontextprotocol/sdk/server/mcp' {
  interface McpServerConfig {
    name: string;
    version: string;
  }

  interface ToolSchema {
    [key: string]: {
      type: string;
      description?: string;
      enum?: string[];
      optional?: boolean;
      items?: {
        type: string;
        properties?: Record<string, unknown>;
      };
      properties?: Record<string, {
        type: string;
        enum?: string[];
        optional?: boolean;
      }>;
    };
  }

  interface ToolResponse {
    content: Array<{
      type: string;
      text: string;
    }>;
  }

  export class McpServer {
    constructor(config: McpServerConfig);
    
    tool(
      name: string,
      schema: ToolSchema,
      handler: (params: any) => Promise<ToolResponse>
    ): void;
    
    listen(port: number): Promise<void>;
    close(): Promise<void>;
  }
} 