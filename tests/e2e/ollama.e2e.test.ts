import { OllamaClient } from '../../src/services/ollama/client';
import { OllamaChatRequest, OllamaChatMessage, OllamaChatResponse, OllamaModelInfo, OllamaEmbeddingRequest } from '../../src/services/ollama/types';

describe('Ollama E2E Tests (Current API)', () => {
  let client: OllamaClient;
  let stream: AsyncGenerator<OllamaChatResponse> | undefined;
  const TEST_TIMEOUT = 60000; // 60 seconds

  beforeAll(() => {
    client = new OllamaClient('http://localhost:11434');
  });

  afterEach(async () => {
    if (stream) {
      try {
        await stream.return?.({ done: true, value: undefined });
      } catch (error) {
        // ignore
      }
      stream = undefined;
    }
  });

  // Helper to collect streaming chat response
  const collectStreamResponse = async (stream: AsyncGenerator<OllamaChatResponse>, maxChunks: number = 3) => {
    const chunks: string[] = [];
    let chunkCount = 0;
    for await (const chunk of stream) {
      chunks.push(chunk.message.content);
      chunkCount++;
      if (chunkCount >= maxChunks) break;
    }
    return chunks.join('');
  };

  it('should list available models', async () => {
    const models: OllamaModelInfo[] = await client.listModels();
    expect(Array.isArray(models)).toBe(true);
    expect(models.length).toBeGreaterThan(0);
    expect(models[0]).toHaveProperty('name');
  }, TEST_TIMEOUT);

  it('should pull a model and show its details', async () => {
    const modelName = 'mistral:latest';
    const model = await client.pullModel(modelName);
    expect(model).toHaveProperty('name', modelName);
    const details = await client.getModel(modelName);
    expect(details).toHaveProperty('name', modelName);
  }, TEST_TIMEOUT);

  it('should delete a model', async () => {
    const modelName = 'llama2:latest';
    await expect(client.deleteModel(modelName)).resolves.toBeUndefined();
  }, TEST_TIMEOUT);

  // it('should handle basic chat', async () => {
  //   const messages: OllamaChatMessage[] = [
  //     { role: 'user', content: 'Hello, how are you?' }
  //   ];
  //   const request: OllamaChatRequest = {
  //     model: 'mistral:latest',
  //     messages
  //   };
  //   const response = await client.chat(request);
  //   expect(response).toHaveProperty('message');
  //   expect(response.message).toHaveProperty('role', 'assistant');
  //   expect(typeof response.message.content).toBe('string');
  // }, TEST_TIMEOUT);

  // it('should handle streaming chat', async () => {
  //   const messages: OllamaChatMessage[] = [
  //     { role: 'user', content: 'Stream this please.' }
  //   ];
  //   const request: OllamaChatRequest = {
  //     model: 'mistral:latest',
  //     messages
  //   };
  //   stream = await client.chatStream(request);
  //   const response = await collectStreamResponse(stream);
  //   expect(response.trim()).toBeTruthy();
  // }, TEST_TIMEOUT);

  // it('should return error for invalid model', async () => {
  //   const messages: OllamaChatMessage[] = [
  //     { role: 'user', content: 'Hello!' }
  //   ];
  //   const request: OllamaChatRequest = {
  //     model: 'non-existent-model',
  //     messages
  //   };
  //   await expect(client.chat(request)).rejects.toThrow();
  // }, TEST_TIMEOUT);

  // it('should generate embeddings', async () => {
  //   const embeddingRequest: OllamaEmbeddingRequest = {
  //     model: 'mistral:latest',
  //     prompt: 'Test embedding'
  //   };
  //   const result = await client.embeddings(embeddingRequest);
  //   expect(result).toHaveProperty('embedding');
  //   expect(Array.isArray(result.embedding)).toBe(true);
  // }, TEST_TIMEOUT);
});