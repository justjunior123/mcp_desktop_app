import { OllamaClient } from '../../src/services/ollama/client';
import { OllamaChatRequest, OllamaChatMessage, OllamaChatResponse, OllamaModelInfo, OllamaEmbeddingRequest } from '../../src/services/ollama/types';

/**
 * Ollama E2E Tests
 * 
 * Pre-requisites:
 * - Ollama server running on http://localhost:11434
 * - mistral:7b-instruct-q2_K model installed
 * 
 * Note: These tests assume the model is already installed to avoid lengthy downloads
 * during test execution. To install the required model, run:
 * ollama pull mistral:7b-instruct-q2_K
 */
describe('Ollama E2E Tests (Current API)', () => {
  let client: OllamaClient;
  let stream: AsyncGenerator<OllamaChatResponse> | undefined;
  const TEST_TIMEOUT = 60000; // 60 seconds
  const CHAT_TIMEOUT = TEST_TIMEOUT * 5; // 5 minutes for chat tests
  const TEST_MODEL = 'mistral:7b-instruct-q2_K';

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

  it('should verify test model exists', async () => {
    const model = await client.getModel(TEST_MODEL);
    expect(model).toHaveProperty('name', TEST_MODEL);
  }, TEST_TIMEOUT);

  /**
   * Pull test commented out to avoid lengthy downloads during test runs.
   * Keep this test for documentation and future reference.
   * To manually pull the model:
   * ollama pull mistral:7b-instruct-q2_K
   */
  /* it('should pull mistral model', async () => {
    const modelName = TEST_MODEL;
    console.log(`Starting to pull model ${modelName}...`);

    try {
      for await (const chunk of client.pullModelStream(modelName)) {
        if (chunk.status) {
          console.log(`Pull status: ${chunk.status}`);
        }
        if (chunk.digest) {
          console.log(`Pull progress: ${chunk.digest}`);
        }
      }

      // Verify model exists after pull
      const model = await client.getModel(modelName);
      expect(model.name).toBe(modelName);
      console.log(`Successfully pulled and verified model ${modelName}`);
    } catch (error) {
      console.error(`Failed to pull model ${modelName}:`, error);
      throw error;
    }
  }, TEST_TIMEOUT * 3); */

  // Note: Delete test commented out to avoid having to re-download model.

  it('should handle basic chat', async () => {
    console.log('Sending chat request...');
    const messages: OllamaChatMessage[] = [
      { role: 'system', content: 'You are a helpful assistant.' },
      { role: 'user', content: 'Say hello in exactly 5 words.' }
    ];
    const request: OllamaChatRequest = {
      model: TEST_MODEL,
      messages,
      stream: false, // Explicitly set stream to false
      options: {
        temperature: 0.7,
        num_predict: 30,
      }
    };
    const response = await client.chat(request);
    console.log('Chat response received:', JSON.stringify(response, null, 2));
    
    expect(response).toHaveProperty('message');
    expect(response.message).toHaveProperty('role', 'assistant');
    expect(typeof response.message.content).toBe('string');
    expect(response.message.content.length).toBeGreaterThan(0);
  }, CHAT_TIMEOUT);
});