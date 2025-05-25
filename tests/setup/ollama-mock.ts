import { OllamaClient } from '../../src/services/ollama/client';
import { OllamaModelManager } from '../../src/services/ollama/model-manager';
import { ModelNotFoundError } from '../../src/services/ollama/errors';

// Mock implementations
const mockOllamaClient = {
  healthCheck: jest.fn().mockResolvedValue(true),
  listModels: jest.fn().mockResolvedValue([
    {
      name: 'llama3.2',
      size: BigInt(4000000000),
      digest: 'test-digest',
      format: 'gguf',
      family: 'llama'
    }
  ]),
  getModel: jest.fn().mockResolvedValue({
    name: 'llama3.2',
    size: BigInt(4000000000),
    digest: 'test-digest',
    format: 'gguf',
    family: 'llama',
    details: {
      architecture: 'llama',
      parameter_size: '7B'
    }
  }),
  chat: jest.fn().mockResolvedValue({
    model: 'llama3.2',
    message: {
      role: 'assistant',
      content: 'This is a test response from the mock Ollama client.'
    },
    done: true
  }),
  chatStream: jest.fn().mockImplementation(async function* () {
    yield {
      model: 'llama3.2',
      message: {
        role: 'assistant',
        content: 'This '
      },
      done: false
    };
    yield {
      model: 'llama3.2',
      message: {
        role: 'assistant',
        content: 'is '
      },
      done: false
    };
    yield {
      model: 'llama3.2',
      message: {
        role: 'assistant',
        content: 'a test'
      },
      done: true
    };
  }),
  pullModel: jest.fn().mockImplementation(async (name: string, onProgress?: Function) => {
    if (onProgress) {
      onProgress('downloading', 50);
      onProgress('complete', 100);
    }
    return {
      name,
      size: BigInt(4000000000),
      digest: 'test-digest',
      format: 'gguf',
      family: 'llama'
    };
  }),
  deleteModel: jest.fn().mockResolvedValue(undefined)
};

const mockModelManager = {
  syncModels: jest.fn().mockResolvedValue(undefined),
  listModels: jest.fn().mockResolvedValue([
    {
      name: 'llama3.2',
      size: BigInt(4000000000),
      digest: 'test-digest',
      format: 'gguf',
      family: 'llama',
      details: {
        architecture: 'llama',
        parameter_size: '7B'
      },
      status: 'READY',
      configuration: {
        temperature: 0.7,
        topP: 0.9
      }
    }
  ]),
  getModel: jest.fn().mockImplementation(async (name: string) => {
    if (name === 'llama3.2' || name === 'test-model') {
      return {
        name,
        size: BigInt(4000000000),
        digest: 'test-digest',
        format: 'gguf',
        family: 'llama',
        details: {
          architecture: 'llama',
          parameter_size: '7B'
        },
        status: 'READY',
        configuration: {
          temperature: 0.7,
          topP: 0.9
        }
      };
    }
    throw new ModelNotFoundError(`Model ${name} not found`);
  }),
  pullModel: jest.fn().mockImplementation(async (name: string, onProgress?: Function) => {
    if (onProgress) {
      setTimeout(() => onProgress('downloading', 25), 100);
      setTimeout(() => onProgress('downloading', 50), 200);
      setTimeout(() => onProgress('downloading', 75), 300);
      setTimeout(() => onProgress('complete', 100), 400);
    }
    return {
      name,
      size: BigInt(4000000000),
      digest: 'test-digest',
      format: 'gguf',
      family: 'llama',
      status: 'READY'
    };
  }),
  updateModel: jest.fn().mockImplementation(async (name: string, config: any) => {
    if (name === 'llama3.2' || name === 'test-model') {
      return {
        name,
        configuration: config
      };
    }
    throw new Error('Model not found');
  }),
  deleteModel: jest.fn().mockImplementation(async (name: string) => {
    if (name === 'llama3.2' || name.startsWith('test-')) {
      return;
    }
    throw new Error(`Model ${name} not found`);
  }),
  chat: jest.fn().mockResolvedValue({
    model: 'llama3.2',
    message: {
      role: 'assistant',
      content: 'This is a test response from the mock model manager.'
    },
    done: true
  }),
  chatStream: jest.fn().mockImplementation(async function* () {
    yield {
      model: 'llama3.2',
      message: {
        role: 'assistant',
        content: 'Mock '
      },
      done: false
    };
    yield {
      model: 'llama3.2',
      message: {
        role: 'assistant',
        content: 'streaming '
      },
      done: false
    };
    yield {
      model: 'llama3.2',
      message: {
        role: 'assistant',
        content: 'response'
      },
      done: true
    };
  })
};

// Set up mocks
jest.mock('../../src/services/ollama/client', () => ({
  OllamaClient: jest.fn().mockImplementation(() => mockOllamaClient)
}));

jest.mock('../../src/services/ollama/model-manager', () => ({
  OllamaModelManager: jest.fn().mockImplementation(() => mockModelManager)
}));

export { mockOllamaClient, mockModelManager }; 