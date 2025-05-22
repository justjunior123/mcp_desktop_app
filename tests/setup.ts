import { PrismaClient } from '@prisma/client';
import { MockOllamaClient } from './mocks/ollama-client.mock';
import { MockOllamaModelManager } from './mocks/ollama-model-manager.mock';
import { OllamaClient } from '../src/services/ollama/client';

// Set test environment variables
Object.assign(process.env, {
  NODE_ENV: 'test',
  API_PORT: '3100',
  API_HOST: '127.0.0.1'
});

export const prisma = new PrismaClient();

// Create a mock client that matches the OllamaClient interface
export const mockOllamaClient = new MockOllamaClient() as unknown as OllamaClient;

// Create a mock model manager
export const mockModelManager = new MockOllamaModelManager(prisma, mockOllamaClient);

// Global test setup
beforeAll(async () => {
  // Add any global setup here
});

afterAll(async () => {
  // Add any global cleanup here
});

// Reset all mocks before each test
beforeEach(() => {
  jest.clearAllMocks();
}); 