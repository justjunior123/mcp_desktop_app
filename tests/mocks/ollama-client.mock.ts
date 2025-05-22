import { OllamaModelInfo, OllamaChatRequest, OllamaChatResponse } from '../../src/services/ollama/types';

export class MockOllamaClient {
  private readonly baseUrl: string;

  constructor(baseUrl: string = 'http://localhost:11434') {
    this.baseUrl = baseUrl;
  }

  private models: OllamaModelInfo[] = [
    {
      name: 'mistral:latest',
      size: BigInt(4096),
      digest: 'sha256:123',
      details: {
        format: 'gguf',
        family: 'llama',
        parameter_size: '7B',
        quantization_level: 'Q4_0'
      }
    },
    {
      name: 'llama2:latest',
      size: BigInt(8192),
      digest: 'sha256:456',
      details: {
        format: 'gguf',
        family: 'llama',
        parameter_size: '13B',
        quantization_level: 'Q4_0'
      }
    }
  ];

  async listModels() {
    return this.models;
  }

  async getModel(name: string) {
    const model = this.models.find(m => m.name === name);
    if (!model) throw new Error('Model not found');
    return model;
  }

  async pullModel(name: string) {
    // Simulate a delay for model pulling
    await new Promise(resolve => setTimeout(resolve, 100));
    
    const newModel: OllamaModelInfo = {
      name,
      size: BigInt(4096),
      digest: 'sha256:123',
      details: {
        format: 'gguf',
        family: 'llama',
        parameter_size: '7B',
        quantization_level: 'Q4_0'
      }
    };
    
    this.models.push(newModel);
    return newModel;
  }

  async deleteModel(name: string) {
    const index = this.models.findIndex(m => m.name === name);
    if (index === -1) throw new Error('Model not found');
    this.models.splice(index, 1);
    return { status: 'success' };
  }

  async chat(request: OllamaChatRequest): Promise<OllamaChatResponse> {
    return {
      model: request.model,
      message: {
        role: 'assistant',
        content: 'This is a mock response from the assistant.'
      },
      done: true
    };
  }

  async *chatStream(request: OllamaChatRequest) {
    yield {
      model: request.model,
      message: {
        role: 'assistant',
        content: 'This is a mock streaming response from the assistant.'
      },
      done: true
    };
  }

  async healthCheck() {
    return true;
  }

  // Add missing methods to match OllamaClient interface
  transformModelInfo = (info: any) => info;
  request = async (path: string, options: any) => ({ data: {} });
  generate = async (model: string, prompt: string) => ({ response: '' });
  embeddings = async (model: string, text: string) => ({ embedding: [] });
  show = async (model: string) => ({});

  // Add streaming methods
  async *generateStream(model: string, prompt: string) {
    yield {
      model,
      response: 'This is a mock streaming response.',
      done: true
    };
  }
} 