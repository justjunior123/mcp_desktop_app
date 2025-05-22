import { OllamaClient } from '../src/services/ollama/client';
import { OllamaModelManager } from '../src/services/ollama/model-manager';
import { prisma } from '../src/services/database/client';

// Mock OllamaClient for testing
export const mockOllamaClient = {
  chat: jest.fn(),
  chatStream: jest.fn(),
  listModels: jest.fn(),
  pullModel: jest.fn(),
  deleteModel: jest.fn(),
} as unknown as OllamaClient;

// Mock ModelManager for testing
export const mockModelManager = {
  listModels: jest.fn(),
  getModel: jest.fn(),
  pullModel: jest.fn(),
  updateModel: jest.fn(),
  deleteModel: jest.fn(),
} as unknown as OllamaModelManager;

// Helper function to get test instances
export function getTestInstances() {
  return {
    ollamaClient: mockOllamaClient,
    modelManager: mockModelManager,
  };
} 