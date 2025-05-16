import { Request, Response } from 'express';
import { jest } from '@jest/globals';

export class McpServer {
  connect = jest.fn().mockReturnValue(Promise.resolve());
  close = jest.fn().mockReturnValue(Promise.resolve());
  tool = jest.fn();

  constructor(config: { name: string; version: string }) {}
}

export class StreamableHTTPServerTransport {
  handleRequest = jest.fn((req: Request, res: Response) => res.status(200).end());
  start = jest.fn().mockReturnValue(Promise.resolve());
  close = jest.fn().mockReturnValue(Promise.resolve());

  constructor(options: { sessionIdGenerator?: () => string; enableJsonResponse?: boolean }) {}
} 