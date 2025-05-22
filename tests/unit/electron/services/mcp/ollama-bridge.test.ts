import { OllamaBridge } from 'src/services/mcp/ollama-bridge';
import { OllamaClient } from 'src/services/ollama/client';
import { OllamaChatRequest, OllamaChatResponse, OllamaChatMessage } from 'src/services/ollama/types';
import express from 'express';
import request from 'supertest';
import { jest, describe, beforeEach, afterEach, it, expect } from '@jest/globals';
import fs from 'fs';
import path from 'path';
import { randomUUID } from 'crypto';

// Mock the required modules
jest.mock('src/services/ollama/client');

describe('OllamaBridge', () => {
  let ollamaClient: jest.Mocked<OllamaClient>;
  let bridge: OllamaBridge;
  const TEST_PORT = 3099;
  const DEBUG_LOG_FILE = path.join(__dirname, 'mcp-debug.log');

  beforeEach(() => {
    // Clear all mocks
    jest.clearAllMocks();
    
    // Setup OllamaClient mock
    ollamaClient = new OllamaClient('http://localhost:11434') as jest.Mocked<OllamaClient>;
    ollamaClient.listModels.mockResolvedValue({
      models: [{
        name: 'test-model',
        size: BigInt(1000),
        digest: 'test-digest',
        format: 'gguf',
        family: 'llama',
        families: ['llama'],
        parameter_size: '7B',
        quantization_level: 'Q4_K_M',
        parent_model: ''
      }]
    });
    
    // Create bridge instance
    bridge = new OllamaBridge(ollamaClient);
  });

  afterEach(async () => {
    // Cleanup
    try {
      await bridge.stop();
    } catch (error) {
      fs.appendFileSync(DEBUG_LOG_FILE, `Error during cleanup: ${error}\n`);
    }
  });

  it('should start and stop the server', async () => {
    // Start server
    await bridge.start(TEST_PORT);

    // Test that the server is listening
    const app = (bridge as any).expressApp as express.Application;
    const agent = request.agent(app);

    // Use request(app) for the first initialize request (NO session ID)
    const initHeaders = {
      'Accept': 'application/json, text/event-stream',
      'Content-Type': 'application/json',
      'X-MCP-Version': '1.0.0',
      'X-MCP-Client': 'test-client'
    };
    console.log('Initialize request headers:', initHeaders);
    const initResponse = await request(app)
      .post('/mcp')
      .set(initHeaders)
      .send({
        jsonrpc: '2.0',
        method: 'initialize',
        id: 1,
        params: {
          capabilities: {
            textDocumentSync: 1,
            completionProvider: {
              triggerCharacters: ['.']
            },
            hoverProvider: true,
            signatureHelpProvider: {
              triggerCharacters: ['(', ',']
            },
            definitionProvider: true,
            referencesProvider: true,
            documentSymbolProvider: true,
            workspaceSymbolProvider: true,
            codeActionProvider: true,
            documentFormattingProvider: true,
            documentRangeFormattingProvider: true,
            documentOnTypeFormattingProvider: {
              firstTriggerCharacter: '}',
              moreTriggerCharacter: [';']
            },
            renameProvider: true,
            documentLinkProvider: {
              resolveProvider: true
            },
            colorProvider: true,
            foldingRangeProvider: true,
            selectionRangeProvider: true
          },
          clientInfo: { 
            name: 'test-client', 
            version: '1.0.0' 
          },
          rootUri: 'file:///',
          workspaceFolders: [
            {
              uri: 'file:///',
              name: 'root'
            }
          ]
        }
      });

    // Extract session ID from response headers (if present)
    const sessionId = initResponse.headers['mcp-session-id'];
    expect(initResponse.status).toBe(200);
    expect(sessionId).toBeDefined();

    // Now send listTools with session ID using request(app)
    const response = await request(app)
      .post('/mcp')
      .set('mcp-session-id', sessionId)
      .set('Accept', 'application/json, text/event-stream')
      .set('Content-Type', 'application/json')
      .set('X-MCP-Version', '1.0.0')
      .set('X-MCP-Client', 'test-client')
      .send({
        jsonrpc: '2.0',
        method: 'listTools',
        id: 2
      });
    expect(response.status).toBe(200);

    // Stop server
    await bridge.stop();
  });

  it('should prevent multiple server starts', async () => {
    // Start server first time
    await bridge.start(TEST_PORT);

    // Attempt to start server again
    await expect(bridge.start(TEST_PORT)).rejects.toThrow('Server is already running');

    // Cleanup
    await bridge.stop();
  });

  it('should register model-specific tools', async () => {
    const mockChatResponse: OllamaChatResponse = {
      message: { content: 'test response', role: 'assistant' } as OllamaChatMessage,
      model: 'test-model',
      done: true,
      total_duration: 100,
      load_duration: 10,
      prompt_eval_duration: 50,
      eval_duration: 40
    };

    // Create a typed mock function
    const mockChat = jest.fn() as jest.MockedFunction<(request: OllamaChatRequest) => Promise<OllamaChatResponse>>;
    mockChat.mockResolvedValue(mockChatResponse);
    (ollamaClient as any).chat = mockChat;

    await bridge.start(TEST_PORT);

    const app = (bridge as any).expressApp as express.Application;
    const agent = request.agent(app);

    // Use request(app) for the first initialize request (NO session ID)
    const initHeaders = {
      'Accept': 'application/json, text/event-stream',
      'Content-Type': 'application/json',
      'X-MCP-Version': '1.0.0',
      'X-MCP-Client': 'test-client'
    };
    console.log('Initialize request headers:', initHeaders);
    const initResponse = await request(app)
      .post('/mcp')
      .set(initHeaders)
      .send({
        jsonrpc: '2.0',
        method: 'initialize',
        id: 1,
        params: {
          capabilities: {
            textDocumentSync: 1,
            completionProvider: {
              triggerCharacters: ['.']
            },
            hoverProvider: true,
            signatureHelpProvider: {
              triggerCharacters: ['(', ',']
            },
            definitionProvider: true,
            referencesProvider: true,
            documentSymbolProvider: true,
            workspaceSymbolProvider: true,
            codeActionProvider: true,
            documentFormattingProvider: true,
            documentRangeFormattingProvider: true,
            documentOnTypeFormattingProvider: {
              firstTriggerCharacter: '}',
              moreTriggerCharacter: [';']
            },
            renameProvider: true,
            documentLinkProvider: {
              resolveProvider: true
            },
            colorProvider: true,
            foldingRangeProvider: true,
            selectionRangeProvider: true
          },
          clientInfo: { 
            name: 'test-client', 
            version: '1.0.0' 
          },
          rootUri: 'file:///',
          workspaceFolders: [
            {
              uri: 'file:///',
              name: 'root'
            }
          ]
        }
      });

    // Extract session ID from response headers (if present)
    const sessionId = initResponse.headers['mcp-session-id'];
    expect(initResponse.status).toBe(200);
    expect(sessionId).toBeDefined();

    // Now send listTools with session ID using request(app)
    const response = await request(app)
      .post('/mcp')
      .set('mcp-session-id', sessionId)
      .set('Accept', 'application/json, text/event-stream')
      .set('Content-Type', 'application/json')
      .set('X-MCP-Version', '1.0.0')
      .set('X-MCP-Client', 'test-client')
      .send({
        jsonrpc: '2.0',
        method: 'listTools',
        id: 2
      });
    expect(response.status).toBe(200);
    expect(ollamaClient.listModels).toHaveBeenCalled();

    await bridge.stop();
  });

  it('should handle initialize request correctly', async () => {
    await bridge.start(TEST_PORT);
    const app = (bridge as any).expressApp as express.Application;
    const agent = request.agent(app);

    // Use request(app) for the first initialize request (NO session ID)
    const initHeaders = {
      'Accept': 'application/json, text/event-stream',
      'Content-Type': 'application/json',
      'X-MCP-Version': '1.0.0',
      'X-MCP-Client': 'test-client'
    };
    console.log('Initialize request headers:', initHeaders);
    const initResponse = await request(app)
      .post('/mcp')
      .set(initHeaders)
      .send({
        jsonrpc: '2.0',
        method: 'initialize',
        id: 1,
        params: {
          capabilities: {
            textDocumentSync: 1,
            completionProvider: {
              triggerCharacters: ['.']
            },
            hoverProvider: true,
            signatureHelpProvider: {
              triggerCharacters: ['(', ',']
            },
            definitionProvider: true,
            referencesProvider: true,
            documentSymbolProvider: true,
            workspaceSymbolProvider: true,
            codeActionProvider: true,
            documentFormattingProvider: true,
            documentRangeFormattingProvider: true,
            documentOnTypeFormattingProvider: {
              firstTriggerCharacter: '}',
              moreTriggerCharacter: [';']
            },
            renameProvider: true,
            documentLinkProvider: {
              resolveProvider: true
            },
            colorProvider: true,
            foldingRangeProvider: true,
            selectionRangeProvider: true
          },
          clientInfo: { 
            name: 'test-client', 
            version: '1.0.0' 
          },
          rootUri: 'file:///',
          workspaceFolders: [
            {
              uri: 'file:///',
              name: 'root'
            }
          ]
        }
      });

    // Extract session ID from response headers (if present)
    const sessionId = initResponse.headers['mcp-session-id'];
    expect(initResponse.status).toBe(200);
    expect(sessionId).toBeDefined();

    await bridge.stop();
  });
}); 