import request from 'supertest';
import { setupServer, cleanup } from '../../electron/server';
import { prisma } from '../setup';
import fs from 'fs';
import path from 'path';

// Set test environment
Object.defineProperty(process.env, 'NODE_ENV', {
  value: 'test',
  writable: true
});

describe('Chat E2E Tests', () => {
  jest.setTimeout(60000); // Increase timeout for e2e tests
  let server: any;
  const TEST_PORT = 3100;
  const OLLAMA_HOST = 'http://127.0.0.1:11434';

  beforeAll(async () => {
    // Start the server
    server = await setupServer();
    
    // Wait for server to be ready
    const waitForServerReady = async (retries = 20, delay = 250) => {
      for (let i = 0; i < retries; i++) {
        try {
          const res = await request(getBaseUrl()).get('/health');
          if (res.status === 200) return;
        } catch (e) {
          // ignore
        }
        await new Promise(r => setTimeout(r, delay));
      }
      throw new Error('Server did not become ready in time');
    };
    await waitForServerReady();
    
    // Custom logger to write logs to a file
    const logFile = path.join(__dirname, 'chat-e2e.log');
    console.log = (...args) => {
      fs.appendFileSync(logFile, args.map(arg => JSON.stringify(arg, null, 2)).join(' ') + '\n');
    };
  });

  afterAll(async () => {
    await cleanup();
    await new Promise(resolve => setTimeout(resolve, 100));
    await prisma.$disconnect();
  });

  // Helper function to get the base URL for requests
  const getBaseUrl = () => `http://localhost:${TEST_PORT}`;

  describe('Model Management', () => {
    it('should pull a model successfully', async () => {
      const modelName = 'mistral:latest';
      const response = await request(getBaseUrl())
        .post('/api/models')
        .send({ name: modelName })
        .expect('Content-Type', /json/)
        .expect(201);

      expect(response.body).toHaveProperty('data');
      expect(response.body.data).toHaveProperty('name', modelName);
    });

    it('should return 404 for non-existent model', async () => {
      const response = await request(getBaseUrl())
        .get('/api/models/non-existent-model')
        .expect('Content-Type', /json/)
        .expect(404);

      expect(response.body).toHaveProperty('error');
      expect(response.body.error).toHaveProperty('code', 'NOT_FOUND');
    });
  });

  describe('Basic Chat', () => {
    it('should handle a simple chat request', async () => {
      const modelName = 'mistral:latest';
      const response = await request(getBaseUrl())
        .post(`/api/models/${modelName}/chat`)
        .send({
          messages: [{ role: 'user', content: 'What is 2+2?' }]
        })
        .expect('Content-Type', /json/)
        .expect(200);

      expect(response.body).toHaveProperty('data');
      expect(response.body.data).toHaveProperty('message');
      expect(response.body.data.message).toHaveProperty('role', 'assistant');
      expect(response.body.data.message).toHaveProperty('content');
    });

    it('should return 400 for invalid request format', async () => {
      const response = await request(getBaseUrl())
        .post('/api/models/mistral:latest/chat')
        .send({})  // Missing messages array
        .expect('Content-Type', /json/)
        .expect(400);

      expect(response.body).toHaveProperty('error');
      expect(response.body.error).toHaveProperty('code', 'INVALID_REQUEST');
    });
  });

  describe('Streaming Chat', () => {
    it('should handle a streaming chat request', async () => {
      const modelName = 'mistral:latest';
      const response = await request(getBaseUrl())
        .post(`/api/models/${modelName}/chat/stream`)
        .send({
          messages: [{ role: 'user', content: 'What is 3+3?' }]
        })
        .expect('Content-Type', 'text/event-stream')
        .expect(200);

      const lines = response.text.split('\n\n').filter(Boolean);
      expect(lines.length).toBeGreaterThan(0);

      const firstChunk = JSON.parse(lines[0].replace('data: ', ''));
      expect(firstChunk).toHaveProperty('model', modelName);
      expect(firstChunk).toHaveProperty('message');
      expect(firstChunk.message).toHaveProperty('role', 'assistant');
      expect(firstChunk.message).toHaveProperty('content');
    });

    it('should handle streaming errors gracefully', async () => {
      const response = await request(getBaseUrl())
        .post('/api/models/non-existent-model/chat/stream')
        .send({
          messages: [{ role: 'user', content: 'Hello' }]
        })
        .expect('Content-Type', /json/)
        .expect(404);

      expect(response.body).toHaveProperty('error');
      expect(response.body.error).toHaveProperty('code', 'NOT_FOUND');
    });
  });

  describe('Error Handling', () => {
    it('should return 404 for non-existent model in chat', async () => {
      const response = await request(getBaseUrl())
        .post('/api/models/non-existent-model/chat')
        .send({
          messages: [{ role: 'user', content: 'Hello' }]
        })
        .expect('Content-Type', /json/)
        .expect(404);

      expect(response.body).toHaveProperty('error');
      expect(response.body.error).toHaveProperty('code', 'NOT_FOUND');
    });

    it('should return 400 for malformed messages array', async () => {
      const response = await request(getBaseUrl())
        .post('/api/models/mistral:latest/chat')
        .send({
          messages: [{ role: 'invalid-role', content: 'Hello' }]
        })
        .expect('Content-Type', /json/)
        .expect(400);

      expect(response.body).toHaveProperty('error');
      expect(response.body.error).toHaveProperty('code', 'INVALID_REQUEST');
    });
  });
}); 