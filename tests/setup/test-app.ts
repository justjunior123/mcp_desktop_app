import express from 'express';
import { Server } from 'http';
import cors from 'cors';
import helmet from 'helmet';
import { 
  correlationMiddleware, 
  requestLoggingMiddleware 
} from '../../src/lib/api-logger';
import { 
  generalRateLimit,
  corsOptions,
  securityHeaders,
  sanitizeHeaders,
  healthCheckBypass,
  securityErrorHandler
} from '../../src/lib/security';
import {
  globalErrorHandler,
  notFoundHandler,
  performanceMonitoring,
  healthCheckErrorHandler
} from '../../src/lib/error-handling';
import ollamaRoutes from '../../src/api/routes/ollama';
import { apiDocumentation } from '../../src/lib/api-docs';

// Mock Ollama service for testing
jest.mock('../../src/services/ollama/client');
jest.mock('../../src/services/ollama/model-manager');
jest.mock('../../src/services/database/client');

export interface TestAppSetup {
  app: express.Express;
  server: Server;
}

export async function setupTestApp(): Promise<TestAppSetup> {
  const app = express();

  // Trust proxy for rate limiting in tests
  app.set('trust proxy', 1);

  // Health check (before rate limiting)
  app.use('/health', healthCheckErrorHandler);

  // Security middleware
  app.use(securityHeaders);
  app.use(cors(corsOptions));
  app.use(sanitizeHeaders);

  // Request correlation and logging
  app.use(correlationMiddleware);
  app.use(requestLoggingMiddleware);
  app.use(performanceMonitoring);

  // Rate limiting (with health check bypass)
  app.use(healthCheckBypass);
  app.use(generalRateLimit);

  // Body parsing
  app.use(express.json({ limit: '10mb' }));
  app.use(express.urlencoded({ extended: true, limit: '10mb' }));

  // API Documentation endpoint
  app.get('/api/docs', (req, res) => {
    res.setHeader('Content-Type', 'text/html');
    res.send(apiDocumentation.generateHtml());
  });

  app.get('/api/docs/spec', (req, res) => {
    res.json(apiDocumentation.openApiSpec);
  });

  // API Routes
  app.use('/api', ollamaRoutes);

  // Error handling
  app.use(securityErrorHandler);
  app.use(notFoundHandler);
  app.use(globalErrorHandler);

  // Start server
  const server = app.listen(0); // Use port 0 for random available port

  return { app, server };
}

// Mock implementations for testing
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
    throw new Error('Model not found');
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

const mockPrisma = {
  ollamaModel: {
    findMany: jest.fn().mockResolvedValue([]),
    findUnique: jest.fn().mockResolvedValue(null),
    create: jest.fn(),
    update: jest.fn(),
    upsert: jest.fn(),
    delete: jest.fn()
  },
  ollamaModelConfiguration: {
    findUnique: jest.fn().mockResolvedValue(null),
    create: jest.fn(),
    update: jest.fn(),
    upsert: jest.fn()
  }
};

// Set up mocks
beforeAll(() => {
  const { OllamaClient } = require('../../src/services/ollama/client');
  const { OllamaModelManager } = require('../../src/services/ollama/model-manager');
  const { prisma } = require('../../src/services/database/client');

  // Mock implementations
  OllamaClient.mockImplementation(() => mockOllamaClient);
  OllamaModelManager.mockImplementation(() => mockModelManager);
  
  // Mock prisma
  Object.assign(prisma, mockPrisma);
});

export { mockOllamaClient, mockModelManager, mockPrisma };