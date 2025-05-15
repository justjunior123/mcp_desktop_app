import { test, expect } from '@playwright/test';
import { WebSocketTestClient } from '../helpers/websocket';
import { MockModelManager, MockOllamaService } from '../mocks/ollama';
import express from 'express';
import { createServer } from 'http';
import { WebSocketManager } from '@/services/ollama/WebSocketManager';

let server: ReturnType<typeof createServer>;
let wsClient: WebSocketTestClient;
let wsManager: WebSocketManager;
let modelManager: MockModelManager;
let ollamaService: MockOllamaService;

test.describe('WebSocket Integration Tests', () => {
  test.beforeAll(async () => {
    // Set up server
    const app = express();
    server = createServer(app);
    modelManager = new MockModelManager();
    ollamaService = new MockOllamaService();
    wsManager = new WebSocketManager(server, modelManager, ollamaService);

    // Start server
    await new Promise<void>((resolve) => {
      server.listen(3100, () => {
        console.log('Test server started on port 3100');
        resolve();
      });
    });
  });

  test.afterAll(async () => {
    // Clean up
    wsManager.closeAll();
    await new Promise<void>((resolve) => {
      server.close(() => resolve());
    });
  });

  test.beforeEach(async () => {
    // Create new WebSocket connection before each test
    wsClient = new WebSocketTestClient('ws://localhost:3100/ws');
    await wsClient.waitForConnection();
  });

  test.afterEach(() => {
    // Close WebSocket connection after each test
    wsClient.close();
  });

  test('should receive initial status on connection', async () => {
    const message = await wsClient.waitForMessage();
    expect(message.type).toBe('initialStatus');
    expect(message.payload).toHaveProperty('models');
    expect(Array.isArray(message.payload.models)).toBeTruthy();
  });

  test('should handle refreshModels request', async () => {
    // Clear initial status message
    await wsClient.waitForMessage();

    // Send refresh request
    wsClient.send({ type: 'refreshModels', payload: {} });

    const message = await wsClient.waitForMessage();
    expect(message.type).toBe('modelList');
    expect(message.payload).toHaveProperty('models');
    expect(Array.isArray(message.payload.models)).toBeTruthy();
  });

  test('should handle invalid message format', async () => {
    // Clear initial status message
    await wsClient.waitForMessage();

    // Send invalid message
    wsClient.sendRaw('invalid json');

    const message = await wsClient.waitForMessage();
    expect(message.type).toBe('error');
    expect(message.payload).toHaveProperty('message', 'Invalid message format');
  });

  test('should handle unknown message type', async () => {
    // Clear initial status message
    await wsClient.waitForMessage();

    // Send unknown message type
    wsClient.send({ type: 'unknownType', payload: {} });

    const message = await wsClient.waitForMessage();
    expect(message.type).toBe('error');
    expect(message.payload.message).toContain('Unknown message type');
  });

  test('should handle model pull request', async () => {
    // Clear initial status message
    await wsClient.waitForMessage();

    // Send pull request
    wsClient.send({
      type: 'pullModel',
      payload: { modelName: 'llama2' }
    });

    // Should receive pullStarted message
    const pullStarted = await wsClient.waitForMessageOfType('pullStarted');
    expect(pullStarted.payload).toHaveProperty('name', 'llama2');
    expect(pullStarted.payload).toHaveProperty('modelId');

    // Should receive status updates
    const statusUpdate = await wsClient.waitForMessageOfType('modelStatusUpdate');
    expect(statusUpdate.payload).toHaveProperty('modelId');
    expect(statusUpdate.payload).toHaveProperty('status');
  });

  test('should handle concurrent connections', async () => {
    // Create additional WebSocket connections
    const ws2 = new WebSocketTestClient('ws://localhost:3100/ws');
    const ws3 = new WebSocketTestClient('ws://localhost:3100/ws');

    // Wait for all connections to be established
    await Promise.all([
      ws2.waitForConnection(),
      ws3.waitForConnection()
    ]);

    // Clear initial status messages
    await Promise.all([
      wsClient.waitForMessage(),
      ws2.waitForMessage(),
      ws3.waitForMessage()
    ]);

    // Send a message that should be broadcast to all clients
    wsClient.send({ type: 'refreshModels', payload: {} });

    // Collect messages from all clients
    const messages = await Promise.all([
      wsClient.waitForMessage(),
      ws2.waitForMessage(),
      ws3.waitForMessage()
    ]);

    // All clients should receive the same modelList message
    messages.forEach(message => {
      expect(message.type).toBe('modelList');
      expect(message.payload).toHaveProperty('models');
    });

    // Clean up additional connections
    ws2.close();
    ws3.close();
  });

  test('should handle connection errors', async () => {
    // Create a WebSocket connection to a non-existent endpoint
    const badWs = new WebSocketTestClient('ws://localhost:3100/invalid');

    let error: Error | undefined;
    badWs.onError((err) => {
      error = err;
    });

    await new Promise<void>((resolve) => {
      badWs.onClose(() => resolve());
    });

    expect(error).toBeTruthy();
    badWs.close();
  });

  test('should handle client disconnection gracefully', async () => {
    // Create a new connection
    const ws = new WebSocketTestClient('ws://localhost:3100/ws');
    await ws.waitForConnection();

    // Clear initial status message
    await ws.waitForMessage();

    // Close the connection
    ws.close();

    // Wait a bit to ensure server processes the disconnection
    await new Promise(resolve => setTimeout(resolve, 100));

    // Clear initial status message from main client
    await wsClient.waitForMessage();

    // Send a message through the original client to verify server is still functioning
    wsClient.send({ type: 'refreshModels', payload: {} });

    const message = await wsClient.waitForMessage();
    expect(message.type).toBe('modelList');
  });

  test('should handle model status updates', async () => {
    // Clear initial status message
    await wsClient.waitForMessage();

    // Simulate a model status update
    modelManager.emitStatusUpdate({
      modelId: 'test-model',
      status: 'downloading',
      downloadProgress: 50
    });

    // Should receive the status update
    const message = await wsClient.waitForMessage();
    expect(message.type).toBe('modelStatusUpdate');
    expect(message.payload).toHaveProperty('modelId', 'test-model');
    expect(message.payload).toHaveProperty('status', 'downloading');
    expect(message.payload).toHaveProperty('downloadProgress', 50);
  });

  test('should handle model parameter updates', async () => {
    // Clear initial status message
    await wsClient.waitForMessage();

    const modelId = 'test-model-1';
    const parameters = {
      temperature: 0.7,
      topP: 0.9,
      maxTokens: 100
    };

    // Send parameter update request
    wsClient.send({
      type: 'saveModelParameters',
      payload: { modelId, parameters: JSON.stringify(parameters) }
    });

    // Should receive confirmation
    const message = await wsClient.waitForMessageOfType('parametersSaved');
    expect(message.payload).toHaveProperty('modelId', modelId);
  });
}); 