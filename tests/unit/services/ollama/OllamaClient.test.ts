import axios from 'axios';
import { OllamaClient } from '../../../../src/services/ollama/OllamaClient';
import { 
  GenerateRequest, 
  GenerateResponse,
  ChatRequest,
  ChatResponse,
  ListModelsResponse
} from '../../../../src/services/ollama/types';

// Mock axios
jest.mock('axios');
const mockedAxios = axios as jest.Mocked<typeof axios>;

describe('OllamaClient', () => {
  let client: OllamaClient;
  
  beforeEach(() => {
    // Create a new client before each test
    client = new OllamaClient({ baseUrl: 'http://localhost:11434' });
    
    // Reset all mocks
    jest.clearAllMocks();
    
    // Setup default axios create mock
    mockedAxios.create.mockReturnValue(mockedAxios as any);
  });
  
  describe('constructor', () => {
    it('should initialize with the provided base URL', () => {
      expect(client.getBaseUrl()).toBe('http://localhost:11434');
    });
    
    it('should remove trailing slashes from the base URL', () => {
      const clientWithTrailingSlash = new OllamaClient({ baseUrl: 'http://localhost:11434/' });
      expect(clientWithTrailingSlash.getBaseUrl()).toBe('http://localhost:11434');
    });
  });
  
  describe('generate', () => {
    it('should call the generate endpoint with the correct parameters', async () => {
      // Mock response
      const mockResponse: GenerateResponse = {
        model: 'llama2',
        created_at: '2023-11-03T18:07:45.101224Z',
        response: 'This is a mock response',
        done: true
      };
      
      mockedAxios.post.mockResolvedValueOnce({ data: mockResponse });
      
      // Request data
      const request: GenerateRequest = {
        model: 'llama2',
        prompt: 'Hello, world!'
      };
      
      // Call the method
      const response = await client.generate(request);
      
      // Assertions
      expect(mockedAxios.post).toHaveBeenCalledWith(
        '/api/generate',
        { ...request, stream: false }
      );
      expect(response).toEqual(mockResponse);
    });
    
    it('should handle errors correctly', async () => {
      // Mock error response with proper Axios error shape
      const errorObj = {
        isAxiosError: true,
        response: {
          status: 404,
          data: { error: 'Model not found' }
        },
        message: 'Request failed with status code 404'
      };
      
      mockedAxios.post.mockRejectedValueOnce(errorObj);
      
      // Call the method and expect it to throw
      await expect(client.generate({
        model: 'nonexistent-model',
        prompt: 'Hello'
      })).rejects.toThrow('Ollama API Error (404): Model not found');
    });
  });
  
  describe('chat', () => {
    it('should call the chat endpoint with the correct parameters', async () => {
      // Mock response
      const mockResponse: ChatResponse = {
        model: 'llama2',
        created_at: '2023-11-03T18:07:45.101224Z',
        message: {
          role: 'assistant',
          content: 'This is a mock response'
        },
        done: true
      };
      
      mockedAxios.post.mockResolvedValueOnce({ data: mockResponse });
      
      // Request data
      const request: ChatRequest = {
        model: 'llama2',
        messages: [
          { role: 'user', content: 'Hello, world!' }
        ]
      };
      
      // Call the method
      const response = await client.chat(request);
      
      // Assertions
      expect(mockedAxios.post).toHaveBeenCalledWith(
        '/api/chat',
        { ...request, stream: false }
      );
      expect(response).toEqual(mockResponse);
    });
  });
  
  describe('listModels', () => {
    it('should call the tags endpoint and return the list of models', async () => {
      // Mock response
      const mockResponse: ListModelsResponse = {
        models: [
          {
            name: 'llama2',
            model: 'llama2',
            modified_at: '2023-11-03T18:07:45.101224Z',
            size: 3791730293,
            digest: 'sha256:12345',
            details: {
              format: 'gguf',
              family: 'llama',
              parameter_size: '7B',
              quantization_level: 'Q4_0'
            }
          }
        ]
      };
      
      mockedAxios.get.mockResolvedValueOnce({ data: mockResponse });
      
      // Call the method
      const response = await client.listModels();
      
      // Assertions
      expect(mockedAxios.get).toHaveBeenCalledWith('/api/tags');
      expect(response).toEqual(mockResponse);
    });
  });
}); 