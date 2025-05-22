import request from 'supertest';
import { setupServer, cleanup } from '../../electron/server';
import { prisma } from '../../src/services/database/client';
import { OllamaClient } from '../../src/services/ollama/client';
import { OllamaModelInfo } from '../../src/services/ollama/types';
import fs from 'fs';
import path from 'path';

describe('MCP API Integration Tests', () => {
  jest.setTimeout(30000);
  let server: any;
  const ollamaClient = new OllamaClient();
  const TEST_PORT = 3100;

  beforeAll(async () => {
    // Set test environment variables
    process.env.API_PORT = TEST_PORT.toString();
    process.env.API_HOST = '127.0.0.1';
    
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
    const logFile = path.join(__dirname, 'model-info.log');
    console.log = (...args) => {
      fs.appendFileSync(logFile, args.map(arg => JSON.stringify(arg, null, 2)).join(' ') + '\n');
    };
  });

  afterAll(async () => {
    await cleanup();
    await prisma.$disconnect();
  });

  // Helper function to get the base URL for requests
  const getBaseUrl = () => `http://localhost:${TEST_PORT}`;

  describe('Models Resource', () => {
    it('should list all models', async () => {
      const response = await request(getBaseUrl())
        .get('/api/models')
        .expect('Content-Type', /json/)
        .expect(200);

      expect(response.body).toHaveProperty('data');
      expect(Array.isArray(response.body.data)).toBe(true);
    });

    it('should get a specific model', async () => {
      // First, ensure we have a model to test with
      const { models } = await ollamaClient.listModels();
      if (!models || models.length === 0) {
        console.warn('No models available for testing');
        return;
      }

      const modelName = models[0].name;
      const response = await request(getBaseUrl())
        .get(`/api/models/${modelName}`)
        .expect('Content-Type', /json/)
        .expect(200);

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

    it('should create a new model', async () => {
      const response = await request(getBaseUrl())
        .post('/api/models')
        .send({ name: 'mistral:latest' })
        .expect('Content-Type', /json/);
      
      if (response.status !== 201) {
        fs.writeFileSync('create-model-error.json', JSON.stringify(response.body, null, 2));
      }
      
      expect(response.status).toBe(201);  
      expect(response.body).toHaveProperty('data');
      expect(response.body.data).toHaveProperty('name', 'mistral:latest');

      // Production-level debug: log all available models after creation
      const models = await request(getBaseUrl())
        .get('/api/models')
        .expect('Content-Type', /json/)
        .expect(200);
      const modelNames = (models.body.data || []).map((m: any) => ({ name: m.name, status: m.status }));
      fs.writeFileSync('models-after-create.log', JSON.stringify(modelNames, null, 2));
    });

    it('should update model configuration', async () => {
      // First, ensure we have a model to test with
      const { models } = await ollamaClient.listModels();
      if (!models || models.length === 0) {
        console.warn('No models available for testing');
        return;
      }

      const modelName = models[0].name;
      const config = { temperature: 0.7 };
      
      const response = await request(getBaseUrl())
        .put(`/api/models/${modelName}`)
        .send(config)
        .expect('Content-Type', /json/)
        .expect(200);

      expect(response.body).toHaveProperty('data');
      expect(response.body.data).toHaveProperty('temperature', 0.7);
    });

    it('should delete a model', async () => {
      // First, ensure we have a model to test with
      const { models } = await ollamaClient.listModels();
      if (!models || models.length === 0) {
        console.warn('No models available for testing');
        return;
      }

      const modelName = models[0].name;
      await request(getBaseUrl())
        .delete(`/api/models/${modelName}`)
        .expect(204);
    });
  });

  describe('Chat Endpoints', () => {
    beforeAll(async () => {
      // Ensure the model exists before running chat tests
      await request(getBaseUrl())
        .post('/api/models')
        .send({ name: 'mistral:latest' })
        .expect('Content-Type', /json/);
    });

    it('should handle chat requests', async () => {
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
    });

    it('should handle streaming chat requests', async () => {
      const modelName = 'mistral:latest';
      const response = await request(getBaseUrl())
        .post(`/api/models/${modelName}/chat/stream`)
        .send({
          messages: [{ role: 'user', content: 'Hello' }]
        })
        .expect('Content-Type', 'text/event-stream')
        .expect(200);

      // Verify SSE format
      expect(response.text).toMatch(/^data: /);
    });
  });

  describe('Tools Resource', () => {
    it('should list tools', async () => {
      const response = await request(getBaseUrl())
        .get('/api/tools')
        .expect('Content-Type', /json/)
        .expect(200);

      expect(response.body).toHaveProperty('data');
      expect(Array.isArray(response.body.data)).toBe(true);
    });

    it('should return 404 for non-existent tool', async () => {
      const response = await request(getBaseUrl())
        .get('/api/tools/non-existent-tool')
        .expect('Content-Type', /json/)
        .expect(404);

      expect(response.body).toHaveProperty('error');
      expect(response.body.error).toHaveProperty('code', 'NOT_FOUND');
    });
  });

  describe('Prompts Resource', () => {
    it('should list prompts', async () => {
      const response = await request(getBaseUrl())
        .get('/api/prompts')
        .expect('Content-Type', /json/)
        .expect(200);

      expect(response.body).toHaveProperty('data');
      expect(Array.isArray(response.body.data)).toBe(true);
    });

    it('should return 404 for non-existent prompt', async () => {
      const response = await request(getBaseUrl())
        .get('/api/prompts/non-existent-prompt')
        .expect('Content-Type', /json/)
        .expect(404);

      expect(response.body).toHaveProperty('error');
      expect(response.body.error).toHaveProperty('code', 'NOT_FOUND');
    });
  });

  describe('Error Handling', () => {
    it('should handle invalid requests', async () => {
      const response = await request(getBaseUrl())
        .post('/api/models')
        .send({})
        .expect('Content-Type', /json/)
        .expect(400);

      expect(response.body).toHaveProperty('error');
      expect(response.body.error).toHaveProperty('code', 'INVALID_REQUEST');
    });

    it('should handle not found routes', async () => {
      const response = await request(getBaseUrl())
        .get('/api/non-existent-route')
        .expect('Content-Type', /json/)
        .expect(404);

      expect(response.body).toHaveProperty('error');
      expect(response.body.error).toHaveProperty('code', 'NOT_FOUND');
    });
  });
}); 