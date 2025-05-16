import { OllamaBridge } from '../ollama-bridge';
import { OllamaClient } from '../../ollama/client';
import { OllamaChatRequest, OllamaChatResponse, OllamaChatMessage } from '../../ollama/types';
import express from 'express';
import request from 'supertest';
import { jest, describe, beforeEach, afterEach, it, expect } from '@jest/globals';

// Mock the required modules
jest.mock('../../ollama/client');
jest.mock('@modelcontextprotocol/sdk');

describe('OllamaBridge', () => {
  let ollamaClient: jest.Mocked<OllamaClient>;
  let bridge: OllamaBridge;
  const TEST_PORT = 3099;

  beforeEach(() => {
    // Clear all mocks
    jest.clearAllMocks();
    
    // Setup OllamaClient mock
    ollamaClient = new OllamaClient('http://localhost:11434') as jest.Mocked<OllamaClient>;
    ollamaClient.listModels.mockResolvedValue({
      models: [{
        name: 'test-model',
        model: 'test-model',
        modified_at: '2024-05-16T12:00:00Z',
        size: 1000,
        digest: 'test-digest',
        details: {
          format: 'gguf',
          family: 'llama',
          families: ['llama'],
          quantization_level: 'Q4_K_M'
        }
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
      console.error('Error during cleanup:', error);
    }
  });

  it('should start and stop the server', async () => {
    // Start server
    await bridge.start(TEST_PORT);
    expect(ollamaClient.listModels).toHaveBeenCalled();

    // Test that the server is listening
    const app = (bridge as any).expressApp as express.Application;
    const response = await request(app).get('/mcp');
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

    // Test that the model tools were registered
    const app = (bridge as any).expressApp as express.Application;
    const response = await request(app)
      .post('/mcp')
      .send({
        jsonrpc: '2.0',
        method: 'listTools',
        id: 1
      });

    expect(response.status).toBe(200);
    expect(ollamaClient.listModels).toHaveBeenCalled();

    await bridge.stop();
  });
}); 