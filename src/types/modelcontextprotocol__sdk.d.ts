declare module '@modelcontextprotocol/sdk' {
  import { IncomingMessage, ServerResponse } from 'http';
  import { Express } from 'express';
  import { StreamableHTTPServerTransport } from '@modelcontextprotocol/sdk';
  export { StreamableHTTPServerTransport };

declare module '@modelcontextprotocol/sdk/server/streamableHttp' {
  export * from '@modelcontextprotocol/sdk/dist/esm/server/streamableHttp';
} 
  interface McpServerConfig {
    name: string;
    version: string;
  }

  interface McpServerOptions {
    // Add any additional options here
  }

  interface Transport {
    start(): Promise<void>;
    close(): Promise<void>;
    send(message: any): Promise<void>;
  }

  interface StreamableHTTPServerTransportOptions {
    sessionIdGenerator: (() => string) | undefined;
    enableJsonResponse?: boolean;
    onsessioninitialized?: (sessionId: string) => void;
  }

  export class StreamableHTTPServerTransport implements Transport {
    constructor(options: StreamableHTTPServerTransportOptions);
    start(): Promise<void>;
    close(): Promise<void>;
    send(message: any): Promise<void>;
    handleRequest(req: IncomingMessage, res: ServerResponse, parsedBody?: unknown): Promise<void>;
  }

  export class McpServer {
    constructor(config: McpServerConfig, options?: McpServerOptions);
    connect(transport: Transport): Promise<void>;
    close(): Promise<void>;
    tool(name: string, schema: any, handler: (params: any) => Promise<any>): void;
  }
} 