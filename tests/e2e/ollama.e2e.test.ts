import { OllamaClient } from '../../src/services/ollama/client';
import { OllamaChatRequest, OllamaChatMessage, OllamaChatResponse } from '../../src/services/ollama/types';
import { AxiosError } from 'axios';

describe('Ollama E2E Tests', () => {
  let client: OllamaClient;
  let stream: AsyncGenerator<OllamaChatResponse> | undefined;

  beforeAll(() => {
    client = new OllamaClient('http://localhost:11434');
  });

  afterEach(async () => {
    // Clean up after each test
    if (stream) {
      try {
        await stream.return?.({ done: true, value: undefined });
      } catch (error) {
        console.warn('Error closing stream:', error);
      }
      stream = undefined;
    }
  });

  afterAll(async () => {
    // Final cleanup
    if (stream) {
      try {
        await stream.return?.({ done: true, value: undefined });
      } catch (error) {
        console.warn('Error closing stream in afterAll:', error);
      }
    }
  });

  const collectStreamResponse = async (stream: AsyncGenerator<OllamaChatResponse>, maxChunks: number = 3) => {
    const chunks: string[] = [];
    let chunkCount = 0;
    
    for await (const chunk of stream) {
      chunks.push(chunk.message.content);
      chunkCount++;
      
      // Break early once we have enough chunks
      if (chunkCount >= maxChunks) {
        break;
      }
    }
    
    return chunks.join('');
  };

  it('should handle basic chat stream', async () => {
    const messages: OllamaChatMessage[] = [
      { role: 'user', content: 'Hello, how are you?' }
    ];

    const request: OllamaChatRequest = {
      model: 'mistral:latest',
      messages,
      stream: true
    };

    try {
      stream = await client.chatStream(request);
      const response = await collectStreamResponse(stream);
      
      expect(response.trim()).toBeTruthy();
      expect(response.length).toBeGreaterThan(0);
    } catch (error) {
      console.error('Error in basic chat test:', error);
      throw error;
    }
  });

  it('should handle empty messages', async () => {
    const messages: OllamaChatMessage[] = [
      { role: 'user', content: '' }
    ];

    const request: OllamaChatRequest = {
      model: 'mistral:latest',
      messages,
      stream: true
    };

    try {
      stream = await client.chatStream(request);
      const response = await collectStreamResponse(stream);
      
      // Even with empty input, we should get some response
      expect(response.trim()).toBeTruthy();
    } catch (error) {
      console.error('Error in empty messages test:', error);
      throw error;
    }
  });

  it('should handle special characters and emojis', async () => {
    const messages: OllamaChatMessage[] = [
      { role: 'user', content: 'Hello! 👋 How are you? 😊' }
    ];

    const request: OllamaChatRequest = {
      model: 'mistral:latest',
      messages,
      stream: true
    };

    try {
      stream = await client.chatStream(request);
      const response = await collectStreamResponse(stream);
      
      expect(response.trim()).toBeTruthy();
    } catch (error) {
      console.error('Error in special characters test:', error);
      throw error;
    }
  });

  it('should handle multiple messages in conversation', async () => {
    const messages: OllamaChatMessage[] = [
      { role: 'user', content: 'Hello!' },
      { role: 'assistant', content: 'Hi there!' },
      { role: 'user', content: 'How are you?' }
    ];

    const request: OllamaChatRequest = {
      model: 'mistral:latest',
      messages,
      stream: true
    };

    try {
      stream = await client.chatStream(request);
      const response = await collectStreamResponse(stream);
      
      expect(response.trim()).toBeTruthy();
    } catch (error) {
      console.error('Error in conversation test:', error);
      throw error;
    }
  });

  it('should handle invalid model name', async () => {
    const messages: OllamaChatMessage[] = [
      { role: 'user', content: 'Hello!' }
    ];

    const request: OllamaChatRequest = {
      model: 'non-existent-model',
      messages,
      stream: true
    };

    await expect(client.chatStream(request)).rejects.toThrow();
  });

  it('should handle very long messages', async () => {
    const longMessage = 'Hello! '.repeat(1000); // Create a long message
    const messages: OllamaChatMessage[] = [
      { role: 'user', content: longMessage }
    ];

    const request: OllamaChatRequest = {
      model: 'mistral:latest',
      messages,
      stream: true
    };

    try {
      stream = await client.chatStream(request);
      const response = await collectStreamResponse(stream);
      
      expect(response.trim()).toBeTruthy();
    } catch (error) {
      console.error('Error in long message test:', error);
      throw error;
    }
  });
}); 