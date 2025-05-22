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

  describe('Real Chat with Ollama', () => {
    it('should pull and chat with mistral model', async () => {
      const modelName = 'mistral:latest';

      // First, ensure the model is pulled
      const pullResponse = await request(getBaseUrl())
        .post('/api/models')
        .send({ name: modelName })
        .expect('Content-Type', /json/)
        .expect(201);

      expect(pullResponse.body).toHaveProperty('data');
      expect(pullResponse.body.data).toHaveProperty('name', modelName);

      // Wait for model to be ready
      await new Promise(resolve => setTimeout(resolve, 5000));

      // Test regular chat
      const chatResponse = await request(getBaseUrl())
        .post(`/api/models/${modelName}/chat`)
        .send({
          messages: [{ role: 'user', content: 'What is 2+2?' }]
        })
        .expect('Content-Type', /json/)
        .expect(200);

      expect(chatResponse.body).toHaveProperty('data');
      expect(chatResponse.body.data).toHaveProperty('message');
      expect(chatResponse.body.data.message).toHaveProperty('role', 'assistant');
      expect(chatResponse.body.data.message).toHaveProperty('content');
      expect(chatResponse.body.data.message.content).toContain('4');

      // Test streaming chat
      const streamResponse = await request(getBaseUrl())
        .post(`/api/models/${modelName}/chat/stream`)
        .send({
          messages: [{ role: 'user', content: 'What is 3+3?' }]
        })
        .expect('Content-Type', 'text/event-stream')
        .expect(200);

      // Verify SSE format and content
      const lines = streamResponse.text.split('\n\n').filter(Boolean);
      expect(lines.length).toBeGreaterThan(0);

      // Parse and verify each chunk
      for (const line of lines) {
        const chunk = JSON.parse(line.replace('data: ', ''));
        expect(chunk).toHaveProperty('model', modelName);
        expect(chunk).toHaveProperty('message');
        expect(chunk.message).toHaveProperty('role', 'assistant');
        expect(chunk.message).toHaveProperty('content');
        expect(chunk).toHaveProperty('done');
      }

      // Verify the final message contains the answer
      const lastChunk = JSON.parse(lines[lines.length - 1].replace('data: ', ''));
      expect(lastChunk.done).toBe(true);
      expect(lastChunk.message.content).toContain('6');
    });

    it('should handle chat with context', async () => {
      const modelName = 'mistral:latest';
      const messages = [
        { role: 'system', content: 'You are a helpful assistant that specializes in math.' },
        { role: 'user', content: 'What is 5+5?' },
        { role: 'assistant', content: 'The answer is 10.' },
        { role: 'user', content: 'What about 6+6?' }
      ];

      const response = await request(getBaseUrl())
        .post(`/api/models/${modelName}/chat`)
        .send({ messages })
        .expect('Content-Type', /json/)
        .expect(200);

      expect(response.body).toHaveProperty('data');
      expect(response.body.data).toHaveProperty('message');
      expect(response.body.data.message).toHaveProperty('role', 'assistant');
      expect(response.body.data.message).toHaveProperty('content');
      expect(response.body.data.message.content).toContain('12');
    });

    it('should handle chat with custom parameters', async () => {
      const modelName = 'mistral:latest';
      const messages = [{ role: 'user', content: 'Write a very short poem about coding.' }];
      const options = {
        temperature: 0.7,
        top_p: 0.9,
        top_k: 40
      };

      const response = await request(getBaseUrl())
        .post(`/api/models/${modelName}/chat`)
        .send({ messages, options })
        .expect('Content-Type', /json/)
        .expect(200);

      expect(response.body).toHaveProperty('data');
      expect(response.body.data).toHaveProperty('message');
      expect(response.body.data.message).toHaveProperty('role', 'assistant');
      expect(response.body.data.message).toHaveProperty('content');
      expect(response.body.data.message.content.length).toBeGreaterThan(0);
    });

    it('should handle errors gracefully', async () => {
      const modelName = 'non-existent-model';

      const response = await request(getBaseUrl())
        .post(`/api/models/${modelName}/chat`)
        .send({
          messages: [{ role: 'user', content: 'Hello' }]
        })
        .expect('Content-Type', /json/)
        .expect(404);

      expect(response.body).toHaveProperty('error');
      expect(response.body.error).toHaveProperty('code', 'NOT_FOUND');
    });
  });
}); 