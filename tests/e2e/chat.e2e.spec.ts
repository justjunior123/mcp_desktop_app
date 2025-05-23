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
  jest.setTimeout(120000); // 2 minute timeout for all tests
  let server: any;
  const TEST_PORT = 3101; // Use a different port
  const OLLAMA_HOST = 'http://127.0.0.1:11434';

  beforeAll(async () => {
    server = await setupServer();
    // Wait for server to be ready
    await new Promise(resolve => setTimeout(resolve, 1000));
  }, 120000); // 2 minute timeout for beforeAll

  afterAll(async () => {
    if (server) {
      await new Promise<void>((resolve) => {
        server.close(() => {
          console.log('Server closed');
          resolve();
        });
      });
    }
  }, 30000); // 30 second timeout for afterAll

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
    }, 30000);

    it('should return 404 for non-existent model', async () => {
      const response = await request(getBaseUrl())
        .get('/api/models/non-existent-model')
        .expect('Content-Type', /json/)
        .expect(404);

      expect(response.body).toHaveProperty('error');
      expect(response.body.error).toHaveProperty('code', 'NOT_FOUND');
    }, 30000);
  });

  describe('Basic Chat', () => {
    it('should handle a simple chat request', async () => {
      const modelName = 'mistral:latest';
      const response = await request(getBaseUrl())
        .post(`/api/models/${modelName}/chat`)
        .send({
          messages: [{ role: 'user', content: 'Hello' }]
        })
        .expect('Content-Type', /json/)
        .expect(200);

      expect(response.body).toHaveProperty('data');
      expect(response.body.data).toHaveProperty('message');
    }, 60000);

    it('should return 400 for invalid request format', async () => {
      const response = await request(getBaseUrl())
        .post('/api/models/mistral:latest/chat')
        .send({})  // Missing messages array
        .expect('Content-Type', /json/)
        .expect(400);

      expect(response.body).toHaveProperty('error');
      expect(response.body.error).toHaveProperty('code', 'INVALID_REQUEST');
    }, 30000);
  });

  describe('Streaming Chat', () => {
    it('should handle a streaming chat request', async () => {
      const modelName = 'mistral:latest';
      const response = await request(getBaseUrl())
        .post(`/api/models/${modelName}/chat/stream`)
        .send({
          messages: [{ role: 'user', content: 'Hello' }]
        })
        .expect('Content-Type', /text\/event-stream/)
        .expect(200);

      const lines = response.text.split('\n\n').filter(Boolean);
      expect(lines.length).toBeGreaterThan(0);
      
      const firstChunk = JSON.parse(lines[0].replace('data: ', ''));
      expect(firstChunk).toHaveProperty('model', modelName);
      expect(firstChunk).toHaveProperty('message');
    }, 60000);

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
    }, 60000);
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
    }, 30000);

    it('should return 400 for malformed messages array', async () => {
      const response = await request(getBaseUrl())
        .post('/api/models/mistral:latest/chat')
        .send({
          messages: 'not an array'
        })
        .expect('Content-Type', /json/)
        .expect(400);

      expect(response.body).toHaveProperty('error');
      expect(response.body.error).toHaveProperty('code', 'INVALID_REQUEST');
    }, 30000);
  });
}); 