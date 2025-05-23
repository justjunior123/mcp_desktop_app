import { OllamaClient } from '../services/ollama/client';

const client = new OllamaClient();

it('should pull a model and verify it exists', async () => {
  const modelName = 'llama2';
  const result = await client.pullModel(modelName);
  expect(result).toBeDefined();
  expect(result.status).toBe('success');

  // Add a delay to allow Ollama to process the model
  await new Promise(resolve => setTimeout(resolve, 2000));

  const modelInfo = await client.getModel(modelName);
  expect(modelInfo).toBeDefined();
  expect(modelInfo.name).toBe(modelName);
}); 