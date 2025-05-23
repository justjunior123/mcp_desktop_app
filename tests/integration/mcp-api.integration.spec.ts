import request from 'supertest';
import { setupServer, cleanup } from '../../electron/server';
import { prisma } from '../setup';
import { getTestInstances } from '../../electron/test-utils';
import fs from 'fs';
import path from 'path';
import fetch from 'node-fetch';

// Set test environment
Object.defineProperty(process.env, 'NODE_ENV', {
  value: 'test',
  writable: true
});

// Mock Ollama service
jest.mock('../../src/services/ollama/client', () => ({
  OllamaClient: jest.fn().mockImplementation(() => ({
    getModel: jest.fn().mockImplementation((name: string) => {
      if (name === 'mistral:latest') {
        return Promise.resolve({
          name: 'mistral:latest',
          size: 1234567890,
          digest: 'sha256:1234567890',
          format: 'gguf',
          family: 'llama'
        });
      }
      return Promise.reject(new Error('Model not found'));
    }),
    healthCheck: jest.fn().mockResolvedValue(true),
    pullModel: jest.fn().mockResolvedValue({
      name: 'llama2:latest',
      size: 1234567890,
      digest: 'sha256:1234567890',
      format: 'gguf',
      family: 'llama'
    }),
    chat: jest.fn().mockResolvedValue({
      model: 'mistral:latest',
      message: {
        role: 'assistant',
        content: 'Hello! How can I help you today?'
      },
      done: true,
      total_duration: 100,
      load_duration: 50,
      prompt_eval_duration: 25,
      eval_duration: 25
    }),
    chatStream: jest.fn().mockImplementation(async function* () {
      // First chunk
      yield {
        model: 'mistral:latest',
        message: {
          role: 'assistant',
          content: 'Hello'
        },
        done: false,
        total_duration: 50,
        load_duration: 25,
        prompt_eval_duration: 12,
        eval_duration: 13
      };
      
      // Second chunk
      yield {
        model: 'mistral:latest',
        message: {
          role: 'assistant',
          content: '! How can I help you today?'
        },
        done: true,
        total_duration: 100,
        load_duration: 25,
        prompt_eval_duration: 13,
        eval_duration: 12
      };
    })
  }))
}));

// Mock OllamaModelManager
jest.mock('../../src/services/ollama/model-manager', () => ({
  OllamaModelManager: jest.fn().mockImplementation(() => ({
    getModel: jest.fn().mockImplementation((name: string) => {
      if (name === 'mistral:latest') {
        return Promise.resolve({
          name: 'mistral:latest',
          size: 1234567890,
          digest: 'sha256:1234567890',
          format: 'gguf',
          family: 'llama',
          status: 'READY',
          isDownloaded: true
        });
      }
      throw new Error('Model not found');
    }),
    listModels: jest.fn().mockResolvedValue([
      {
        name: 'mistral:latest',
        size: 1234567890,
        digest: 'sha256:1234567890',
        format: 'gguf',
        family: 'llama',
        status: 'READY',
        isDownloaded: true
      }
    ]),
    pullModel: jest.fn().mockImplementation((name: string) => {
      if (name === 'llama2:latest') {
        return Promise.resolve({
          name: 'llama2:latest',
          size: 1234567890,
          digest: 'sha256:1234567890',
          format: 'gguf',
          family: 'llama',
          status: 'READY',
          isDownloaded: true
        });
      }
      throw new Error('Model not found');
    }),
    updateModel: jest.fn().mockImplementation((name: string, config: any) => {
      if (name === 'mistral:latest') {
        return Promise.resolve({
          name: 'mistral:latest',
          size: 1234567890,
          digest: 'sha256:1234567890',
          format: 'gguf',
          family: 'llama',
          status: 'READY',
          isDownloaded: true,
          configuration: config
        });
      }
      throw new Error('Model not found');
    }),
    deleteModel: jest.fn().mockImplementation((name: string) => {
      if (name === 'llama2:latest') {
        return Promise.resolve();
      }
      throw new Error('Model not found');
    }),
    chat: jest.fn().mockImplementation((modelName: string, messages: any[], opts: any, onChunk: (chunk: any) => void) => {
      // emit two chunks for streaming test
      onChunk({
        model: modelName,
        message: { role: 'assistant', content: 'Hello' },
        done: false,
        total_duration: 50,
        load_duration: 25,
        prompt_eval_duration: 12,
        eval_duration: 13
      });
      onChunk({
        model: modelName,
        message: { role: 'assistant', content: '! How can I help you today?' },
        done: true,
        total_duration: 100,
        load_duration: 25,
        prompt_eval_duration: 13,
        eval_duration: 12
      });
      return Promise.resolve();
    })
  }))
}));

describe('MCP API Integration Tests', () => {
  jest.setTimeout(30000);
  let server: any;
  const TEST_PORT = 3101;

  beforeAll(async () => {
    // Check if Ollama server is running
    const checkOllamaServer = async (retries = 5, delay = 1000) => {
      const logFile = path.join(__dirname, 'ollama-check.log');
      const logMessage = (message: string) => {
        fs.appendFileSync(logFile, `${new Date().toISOString()} - ${message}\n`);
      };
      
      logMessage('Checking Ollama server availability');
      
      for (let i = 0; i < retries; i++) {
        try {
          const response = await fetch('http://localhost:11434/api/tags');
          if (response.ok) {
            logMessage('Ollama server is available');
            return true;
          }
          logMessage(`Ollama server health check returned status ${response.status}`);
        } catch (e) {
          logMessage(`Attempt ${i + 1} failed: ${e instanceof Error ? e.message : String(e)}`);
        }
        await new Promise(r => setTimeout(r, delay));
      }
      
      logMessage('Ollama server is not available');
      throw new Error('Ollama server is not running. Please start the Ollama server before running tests.');
    };

    // Wait for Ollama server
    await checkOllamaServer();
    
    // Start the server
    server = await setupServer();
    
    // Wait for server to be ready
    const waitForServerReady = async (retries = 30, delay = 500) => {
      const logFile = path.join(__dirname, 'server-ready.log');
      const logMessage = (message: string) => {
        fs.appendFileSync(logFile, `${new Date().toISOString()} - ${message}\n`);
      };
      
      logMessage('Starting server readiness check');
      
      for (let i = 0; i < retries; i++) {
        try {
          logMessage(`Attempt ${i + 1}/${retries}`);
          const res = await request(getBaseUrl()).get('/health');
          if (res.status === 200) {
            logMessage('Server is ready');
            return;
          }
          logMessage(`Health check returned status ${res.status}`);
        } catch (e) {
          logMessage(`Attempt ${i + 1} failed: ${e instanceof Error ? e.message : String(e)}`);
        }
        await new Promise(r => setTimeout(r, delay));
      }
      logMessage('Server did not become ready in time');
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
    // Ensure cleanup is completed before moving on
    await cleanup();
    await new Promise(resolve => setTimeout(resolve, 100)); // Give time for cleanup to complete
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
      expect(response.body.data.length).toBeGreaterThan(0);
    });

    it('should get a specific model', async () => {
      const modelName = 'mistral:latest';
      const response = await request(getBaseUrl())
        .get(`/api/models/${modelName}`)
        .expect('Content-Type', /json/)
        .expect(200);

      expect(response.body).toHaveProperty('data');
      expect(response.body.data).toHaveProperty('name', modelName);
    });

    it('should return 404 for non-existent model', async () => {
      const modelName = 'non-existent-model';
      const response = await request(getBaseUrl())
        .get(`/api/models/${modelName}`)
        .expect('Content-Type', /json/)
        .expect(404);

      expect(response.body).toHaveProperty('error');
      expect(response.body.error).toHaveProperty('code', 'NOT_FOUND');
      expect(response.body.error).toHaveProperty('message', 'Model not found');
    });

    it('should create a new model', async () => {
      const response = await request(getBaseUrl())
        .post('/api/models')
        .send({ name: 'llama2:latest' })
        .expect('Content-Type', /json/);
      
      if (response.status !== 201) {
        fs.writeFileSync('create-model-error.json', JSON.stringify(response.body, null, 2));
      }
      
      expect(response.status).toBe(201);  
      expect(response.body).toHaveProperty('data');
      expect(response.body.data).toHaveProperty('name', 'llama2:latest');
    });

    it('should update model configuration', async () => {
      const modelName = 'mistral:latest';
      const config = { temperature: 0.7 };
      
      const response = await request(getBaseUrl())
        .put(`/api/models/${modelName}`)
        .send(config)
        .expect('Content-Type', /json/)
        .expect(200);

      expect(response.body).toHaveProperty('data');
      expect(response.body.data.configuration).toHaveProperty('temperature', 0.7);
    });

    it('should delete a model', async () => {
      const modelName = 'llama2:latest';
      await request(getBaseUrl())
        .delete(`/api/models/${modelName}`)
        .expect(204);
    });
  });

  describe('Chat Endpoints', () => {
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
      expect(response.body.data.message).toHaveProperty('role', 'assistant');
      expect(response.body.data.message).toHaveProperty('content');
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

      // Verify SSE format and content
      const lines = response.text.split('\n\n').filter(Boolean);
      expect(lines.length).toBe(2); // Two chunks

      // First chunk
      const firstChunk = JSON.parse(lines[0].replace('data: ', ''));
      expect(firstChunk).toEqual({
        model: 'mistral:latest',
        message: {
          role: 'assistant',
          content: 'Hello'
        },
        done: false,
        total_duration: 50,
        load_duration: 25,
        prompt_eval_duration: 12,
        eval_duration: 13
      });

      // Second chunk
      const secondChunk = JSON.parse(lines[1].replace('data: ', ''));
      expect(secondChunk).toEqual({
        model: 'mistral:latest',
        message: {
          role: 'assistant',
          content: '! How can I help you today?'
        },
        done: true,
        total_duration: 100,
        load_duration: 25,
        prompt_eval_duration: 13,
        eval_duration: 12
      });
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