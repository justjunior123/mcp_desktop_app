import { OllamaClient } from '../../../../src/services/ollama/OllamaClient';
import { OllamaService } from '../../../../src/services/ollama/OllamaService';
import { ChatMessage } from '../../../../src/services/ollama/types';
import { logger } from '../../../../src/services/logging';

// Mock the OllamaClient class
jest.mock('../../../../src/services/ollama/OllamaClient');
const MockedOllamaClient = OllamaClient as jest.MockedClass<typeof OllamaClient>;

// Mock the logger
jest.mock('../../../../src/services/logging', () => ({
  logger: {
    info: jest.fn(),
    debug: jest.fn(),
    warn: jest.fn(),
    error: jest.fn()
  }
}));

describe('OllamaService', () => {
  let service: OllamaService;
  let mockClient: jest.Mocked<OllamaClient>;
  
  beforeEach(() => {
    // Clear mocks
    jest.clearAllMocks();
    
    // Set up mock client
    mockClient = {
      generate: jest.fn(),
      chat: jest.fn(),
      listModels: jest.fn(),
      showModel: jest.fn(),
      createEmbeddings: jest.fn(),
      pullModel: jest.fn(),
      getBaseUrl: jest.fn().mockReturnValue('http://localhost:11434')
    } as unknown as jest.Mocked<OllamaClient>;
    
    // Make the constructor return our mock client
    MockedOllamaClient.mockImplementation(() => mockClient);
    
    // Create the service
    service = new OllamaService('http://localhost:11434');
  });
  
  describe('constructor', () => {
    it('should initialize with the default URL if none is provided', () => {
      const defaultService = new OllamaService();
      expect(MockedOllamaClient).toHaveBeenCalledWith({
        baseUrl: 'http://localhost:11434',
        timeoutMs: undefined
      });
      expect(logger.info).toHaveBeenCalledWith('OllamaService initialized', { baseUrl: 'http://localhost:11434' });
    });
    
    it('should initialize with the provided URL', () => {
      const customService = new OllamaService('http://custom-url:11434', 5000);
      expect(MockedOllamaClient).toHaveBeenCalledWith({
        baseUrl: 'http://custom-url:11434',
        timeoutMs: 5000
      });
    });
  });
  
  describe('isAvailable', () => {
    it('should return true if models can be refreshed', async () => {
      mockClient.listModels.mockResolvedValueOnce({ models: [] });
      
      const result = await service.isAvailable();
      
      expect(result).toBe(true);
      expect(mockClient.listModels).toHaveBeenCalled();
    });
    
    it('should return false if refreshing models fails', async () => {
      mockClient.listModels.mockRejectedValueOnce(new Error('Connection refused'));
      
      const result = await service.isAvailable();
      
      expect(result).toBe(false);
      expect(mockClient.listModels).toHaveBeenCalled();
      expect(logger.warn).toHaveBeenCalledWith(
        'Ollama service is not available',
        { error: 'Connection refused' }
      );
    });
  });
  
  describe('refreshModels', () => {
    it('should update the models list and set default model if none exists', async () => {
      const mockModels = {
        models: [
          {
            name: 'llama2',
            model: 'llama2',
            modified_at: '2023-11-03T18:07:45.101224Z',
            size: 123456,
            digest: 'sha256:123',
            details: {}
          }
        ]
      };
      
      mockClient.listModels.mockResolvedValueOnce(mockModels);
      
      const result = await service.refreshModels();
      
      expect(result).toEqual(mockModels.models);
      expect(service.getDefaultModel()).toBe('llama2');
      expect(logger.info).toHaveBeenCalledWith('Ollama models refreshed', {
        modelCount: 1,
        defaultModel: 'llama2'
      });
    });
    
    it('should throw an error if listing models fails', async () => {
      mockClient.listModels.mockRejectedValueOnce(new Error('API error'));
      
      await expect(service.refreshModels()).rejects.toThrow('API error');
      expect(logger.error).toHaveBeenCalledWith(
        'Failed to refresh Ollama models', 
        { error: 'API error' }
      );
    });
  });
  
  describe('generateCompletion', () => {
    it('should throw an error if no model is available', async () => {
      await expect(service.generateCompletion('Hello')).rejects.toThrow(
        'No model available for text generation'
      );
    });
    
    it('should call generate with the correct parameters', async () => {
      // Set a default model
      service.setDefaultModel('llama2');
      
      const mockResponse = {
        model: 'llama2',
        created_at: '2023-11-03T18:07:45.101224Z',
        response: 'Hello there!',
        done: true
      };
      
      mockClient.generate.mockResolvedValueOnce(mockResponse);
      
      const result = await service.generateCompletion('Hello', 'llama2', { temperature: 0.7 });
      
      expect(result).toBe('Hello there!');
      expect(mockClient.generate).toHaveBeenCalledWith({
        model: 'llama2',
        prompt: 'Hello',
        options: { temperature: 0.7 }
      });
      expect(logger.debug).toHaveBeenCalledWith('Generating text with Ollama', {
        model: 'llama2',
        promptLength: 5
      });
    });
  });
  
  describe('generateChatCompletion', () => {
    it('should call chat with the correct parameters', async () => {
      // Set a default model
      service.setDefaultModel('llama2');
      
      const messages: ChatMessage[] = [
        { role: 'user', content: 'Hello!' }
      ];
      
      const mockResponse = {
        model: 'llama2',
        created_at: '2023-11-03T18:07:45.101224Z',
        message: {
          role: 'assistant' as const,
          content: 'Hi there! How can I help you today?'
        },
        done: true
      };
      
      mockClient.chat.mockResolvedValueOnce(mockResponse);
      
      const result = await service.generateChatCompletion(messages);
      
      expect(result).toBe('Hi there! How can I help you today?');
      expect(mockClient.chat).toHaveBeenCalledWith({
        model: 'llama2',
        messages,
        options: undefined
      });
    });
  });
  
  describe('setDefaultModel and getDefaultModel', () => {
    it('should set and get the default model correctly', () => {
      service.setDefaultModel('llama2');
      
      expect(service.getDefaultModel()).toBe('llama2');
      expect(logger.info).toHaveBeenCalledWith('Ollama default model set', { model: 'llama2' });
    });
  });
}); 