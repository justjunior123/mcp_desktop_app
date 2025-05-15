import { MCPServer } from '../../../../src/mcp/server/MCPServer';
import { OllamaService } from '../../../../src/services/ollama/OllamaService';
import { OllamaBridge } from '../../../../src/services/ollama/OllamaBridge';
import { logger } from '../../../../src/services/logging';
import { ModelInfo } from '../../../../src/services/ollama/types';

// Mock dependencies
jest.mock('../../../../src/mcp/server/MCPServer');
jest.mock('../../../../src/services/ollama/OllamaService');
jest.mock('../../../../src/services/logging');

// The mocked constructor
const MockedMCPServer = MCPServer as jest.MockedClass<typeof MCPServer>;
const MockedOllamaService = OllamaService as jest.MockedClass<typeof OllamaService>;

describe('OllamaBridge', () => {
  let bridge: OllamaBridge;
  let mockServer: jest.Mocked<MCPServer>;
  let mockOllamaService: jest.Mocked<OllamaService>;
  let mockTool: any;
  
  beforeEach(() => {
    // Reset mocks
    jest.clearAllMocks();
    
    // Create mock server and service
    mockServer = new MockedMCPServer({
      port: 3000,
      name: 'test-server',
      version: '1.0.0'
    }) as jest.Mocked<MCPServer>;
    
    mockOllamaService = new MockedOllamaService() as jest.Mocked<OllamaService>;
    
    // Setup tool mock
    mockTool = {
      enable: jest.fn(),
      disable: jest.fn(),
      remove: jest.fn(),
      update: jest.fn()
    };
    
    // Set up MCPServer mock
    (mockServer.tool as jest.Mock) = jest.fn().mockReturnValue(mockTool);
    
    // Set up OllamaService mocks with proper typing
    (mockOllamaService.checkAvailability as jest.Mock) = jest.fn().mockResolvedValue(true);
    (mockOllamaService.listModels as jest.Mock) = jest.fn().mockResolvedValue([
      { name: 'llama2', modified_at: '2023-01-01', size: 1000 },
      { name: 'mistral', modified_at: '2023-01-02', size: 2000 }
    ]);
    (mockOllamaService.generateText as jest.Mock) = jest.fn().mockResolvedValue({
      model: 'llama2',
      response: 'Generated text',
      total_duration: 1000,
      prompt_eval_count: 10,
      eval_count: 20,
      eval_duration: 500
    });
    (mockOllamaService.chat as jest.Mock) = jest.fn().mockResolvedValue({
      model: 'llama2',
      message: { role: 'assistant', content: 'Chat response' },
      total_duration: 1000,
      prompt_eval_count: 10,
      eval_count: 20,
      eval_duration: 500
    });
    (mockOllamaService.getEmbedding as jest.Mock) = jest.fn().mockResolvedValue({
      embedding: [0.1, 0.2, 0.3],
      total_duration: 500
    });
    (mockOllamaService.getModelInfo as jest.Mock) = jest.fn().mockResolvedValue({
      name: 'llama2',
      modified_at: '2023-01-01',
      size: 1000,
      parameter_size: '7B',
      quantization_level: 'Q4_0'
    });
    (mockOllamaService.pullModel as jest.Mock) = jest.fn().mockResolvedValue({
      status: 'success'
    });
    (mockOllamaService.deleteModel as jest.Mock) = jest.fn().mockResolvedValue({
      status: 'success'
    });
    
    // Create bridge
    bridge = new OllamaBridge(mockServer, mockOllamaService);
  });
  
  describe('registerTools', () => {
    it('should check Ollama availability before registering tools', async () => {
      await bridge.registerTools();
      
      expect(mockOllamaService.checkAvailability).toHaveBeenCalled();
    });
    
    it('should not register tools if Ollama is unavailable', async () => {
      (mockOllamaService.checkAvailability as jest.Mock).mockResolvedValueOnce(false);
      
      await bridge.registerTools();
      
      expect(mockServer.tool).not.toHaveBeenCalled();
    });
    
    it('should register model-independent tools', async () => {
      await bridge.registerTools();
      
      // Verify the core tools are registered
      expect(mockServer.tool).toHaveBeenCalledWith(
        'ollama.models.list',
        expect.any(Object),
        expect.any(Function)
      );
      
      expect(mockServer.tool).toHaveBeenCalledWith(
        'ollama.models.pull',
        expect.any(Object),
        expect.any(Function)
      );
      
      expect(mockServer.tool).toHaveBeenCalledWith(
        'ollama.models.delete',
        expect.any(Object),
        expect.any(Function)
      );
      
      expect(mockServer.tool).toHaveBeenCalledWith(
        'ollama.models.show',
        expect.any(Object),
        expect.any(Function)
      );
    });
    
    it('should register model-specific tools for each available model', async () => {
      await bridge.registerTools();
      
      // Verify model-specific tools are registered
      expect(mockServer.tool).toHaveBeenCalledWith(
        'ollama.generate.llama2',
        expect.any(Object),
        expect.any(Function)
      );
      
      expect(mockServer.tool).toHaveBeenCalledWith(
        'ollama.chat.llama2',
        expect.any(Object),
        expect.any(Function)
      );
      
      expect(mockServer.tool).toHaveBeenCalledWith(
        'ollama.embeddings.llama2',
        expect.any(Object),
        expect.any(Function)
      );
      
      expect(mockServer.tool).toHaveBeenCalledWith(
        'ollama.generate.mistral',
        expect.any(Object),
        expect.any(Function)
      );
    });
    
    it('should handle errors during registration', async () => {
      (mockOllamaService.listModels as jest.Mock).mockRejectedValueOnce(new Error('Network error'));
      
      await expect(bridge.registerTools()).rejects.toThrow('Network error');
    });
  });
  
  describe('Tool invocation', () => {
    beforeEach(async () => {
      await bridge.registerTools();
    });
    
    it('should correctly invoke the list models tool', async () => {
      // Find the list models tool handler
      const listModelsHandler = (mockServer.tool as jest.Mock).mock.calls.find(
        call => call[0] === 'ollama.models.list'
      )[2];
      
      const result = await listModelsHandler({});
      
      expect(mockOllamaService.listModels).toHaveBeenCalled();
      expect(result).toEqual({
        models: [
          { name: 'llama2', modified_at: '2023-01-01', size: 1000 },
          { name: 'mistral', modified_at: '2023-01-02', size: 2000 }
        ]
      });
    });
    
    it('should correctly invoke the generate tool', async () => {
      // Find the generate tool handler for llama2
      const generateHandler = (mockServer.tool as jest.Mock).mock.calls.find(
        call => call[0] === 'ollama.generate.llama2'
      )[2];
      
      const result = await generateHandler({
        prompt: 'Hello, world!',
        system: 'You are a helpful assistant',
        options: {
          temperature: 0.7
        }
      });
      
      expect(mockOllamaService.generateText).toHaveBeenCalledWith({
        model: 'llama2',
        prompt: 'Hello, world!',
        system: 'You are a helpful assistant',
        options: {
          temperature: 0.7
        }
      });
      
      expect(result).toEqual({
        text: 'Generated text',
        metrics: {
          total_duration: 1000,
          prompt_eval_count: 10,
          eval_count: 20,
          eval_duration: 500
        }
      });
    });
    
    it('should correctly invoke the chat tool', async () => {
      // Find the chat tool handler for llama2
      const chatHandler = (mockServer.tool as jest.Mock).mock.calls.find(
        call => call[0] === 'ollama.chat.llama2'
      )[2];
      
      const messages = [
        { role: 'system', content: 'You are a helpful assistant' },
        { role: 'user', content: 'Hello!' }
      ];
      
      const result = await chatHandler({
        messages,
        options: {
          temperature: 0.7
        }
      });
      
      expect(mockOllamaService.chat).toHaveBeenCalledWith({
        model: 'llama2',
        messages,
        options: {
          temperature: 0.7
        }
      });
      
      expect(result).toEqual({
        message: { role: 'assistant', content: 'Chat response' },
        metrics: {
          total_duration: 1000,
          prompt_eval_count: 10,
          eval_count: 20,
          eval_duration: 500
        }
      });
    });
    
    it('should correctly invoke the embeddings tool', async () => {
      // Find the embeddings tool handler for llama2
      const embeddingsHandler = (mockServer.tool as jest.Mock).mock.calls.find(
        call => call[0] === 'ollama.embeddings.llama2'
      )[2];
      
      const result = await embeddingsHandler({
        input: 'Text to embed'
      });
      
      expect(mockOllamaService.getEmbedding).toHaveBeenCalledWith({
        model: 'llama2',
        prompt: 'Text to embed'
      });
      
      expect(result).toEqual({
        embedding: [0.1, 0.2, 0.3],
        dimensions: 3,
        metrics: {
          total_duration: 500
        }
      });
    });
  });
  
  describe('updateTools', () => {
    beforeEach(async () => {
      await bridge.registerTools();
    });
    
    it('should remove model-specific tools and re-register them', async () => {
      // Update the list of models
      (mockOllamaService.listModels as jest.Mock).mockResolvedValueOnce([
        { name: 'llama2', modified_at: '2023-01-01', size: 1000 },
        { name: 'mistral', modified_at: '2023-01-02', size: 2000 },
        { name: 'stablelm', modified_at: '2023-01-03', size: 3000 }
      ]);
      
      // Reset the mock count
      (mockServer.tool as jest.Mock).mockClear();
      mockTool.remove.mockClear();
      
      await bridge.updateTools();
      
      // Should call remove on model-specific tools
      expect(mockTool.remove).toHaveBeenCalledTimes(6); // 3 tools * 2 models from initial setup
      
      // Should register tools for all models including the new one
      expect(mockServer.tool).toHaveBeenCalledWith(
        'ollama.generate.stablelm',
        expect.any(Object),
        expect.any(Function)
      );
    });
    
    it('should handle errors during update', async () => {
      (mockOllamaService.listModels as jest.Mock).mockRejectedValueOnce(new Error('Network error'));
      
      await expect(bridge.updateTools()).rejects.toThrow('Network error');
    });
  });
  
  describe('cleanup', () => {
    beforeEach(async () => {
      await bridge.registerTools();
    });
    
    it('should remove all registered tools', () => {
      bridge.cleanup();
      
      // Should call remove on all registered tools
      expect(mockTool.remove).toHaveBeenCalled();
    });
  });
}); 