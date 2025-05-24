import { OllamaClient } from './client';
import { OllamaError } from './types';

describe('OllamaClient', () => {
  let client: OllamaClient;
  let mockFetch: jest.SpyInstance;

  beforeEach(() => {
    client = new OllamaClient();
    mockFetch = jest.spyOn(global, 'fetch');
  });

  afterEach(() => {
    mockFetch.mockRestore();
  });

  describe('generate', () => {
    it('should generate a response', async () => {
      const mockResponse = {
        model: 'llama2',
        created_at: '2024-01-01T00:00:00Z',
        response: 'Hello, world!',
        done: true,
        context: [1, 2, 3],
        total_duration: 1000,
        load_duration: 100,
        prompt_eval_duration: 200,
        eval_duration: 700,
        eval_count: 10,
      };

      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve(mockResponse),
      } as Response);

      const result = await client.generate('llama2', 'Hello');

      expect(result).toEqual(mockResponse);
      expect(mockFetch).toHaveBeenCalledWith(
        'http://localhost:11434/api/generate',
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            model: 'llama2',
            prompt: 'Hello',
          }),
        }
      );
    });

    it('should throw an error when the request fails', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: false,
        json: () => Promise.resolve({ error: 'Failed to generate' }),
      } as Response);

      await expect(client.generate('llama2', 'Hello')).rejects.toThrow(
        new OllamaError('Failed to generate')
      );
    });
  });

  describe('listModels', () => {
    it('should list available models', async () => {
      const mockResponse = {
        models: [
          {
            name: 'llama2',
            modified_at: '2024-01-01T00:00:00Z',
            size: 1000000,
            digest: 'abc123',
            details: {
              format: 'gguf',
              family: 'llama',
              parameter_size: '7B',
              quantization_level: 'Q4_0',
            },
          },
        ],
      };

      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve(mockResponse),
      } as Response);

      const result = await client.listModels();

      expect(result).toEqual(mockResponse.models);
      expect(mockFetch).toHaveBeenCalledWith('http://localhost:11434/api/tags');
    });

    it('should throw an error when the request fails', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: false,
        json: () => Promise.resolve({ error: 'Failed to list models' }),
      } as Response);

      await expect(client.listModels()).rejects.toThrow(
        new OllamaError('Failed to list models')
      );
    });
  });

  describe('pullModel', () => {
    it('should pull a model', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve({}),
      } as Response);

      await client.pullModel('llama2');

      expect(mockFetch).toHaveBeenCalledWith(
        'http://localhost:11434/api/pull',
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({ name: 'llama2' }),
        }
      );
    });

    it('should throw an error when the request fails', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: false,
        json: () => Promise.resolve({ error: 'Failed to pull model' }),
      } as Response);

      await expect(client.pullModel('llama2')).rejects.toThrow(
        new OllamaError('Failed to pull model')
      );
    });
  });

  describe('deleteModel', () => {
    it('should delete a model', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve({}),
      } as Response);

      await client.deleteModel('llama2');

      expect(mockFetch).toHaveBeenCalledWith(
        'http://localhost:11434/api/delete',
        {
          method: 'DELETE',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({ name: 'llama2' }),
        }
      );
    });

    it('should throw an error when the request fails', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: false,
        json: () => Promise.resolve({ error: 'Failed to delete model' }),
      } as Response);

      await expect(client.deleteModel('llama2')).rejects.toThrow(
        new OllamaError('Failed to delete model')
      );
    });
  });

  describe('showModel', () => {
    it('should show model details', async () => {
      const mockResponse = {
        name: 'llama2',
        modified_at: '2024-01-01T00:00:00Z',
        size: 1000000,
        digest: 'abc123',
        details: {
          format: 'gguf',
          family: 'llama',
          parameter_size: '7B',
          quantization_level: 'Q4_0',
        },
      };

      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve(mockResponse),
      } as Response);

      const result = await client.showModel('llama2');

      expect(result).toEqual(mockResponse);
      expect(mockFetch).toHaveBeenCalledWith(
        'http://localhost:11434/api/show',
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({ name: 'llama2' }),
        }
      );
    });

    it('should throw an error when the request fails', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: false,
        json: () => Promise.resolve({ error: 'Failed to show model' }),
      } as Response);

      await expect(client.showModel('llama2')).rejects.toThrow(
        new OllamaError('Failed to show model')
      );
    });
  });
}); 