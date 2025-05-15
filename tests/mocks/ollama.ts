import { Model } from '@prisma/client';
import { ModelManager, ModelStatusUpdate, OllamaModelDetails } from '@/services/ollama/ModelManager';
import { OllamaService } from '@/services/ollama/OllamaService';
import { DatabaseService } from '@/services/database/DatabaseService';
import { logger } from '@/services/logging';
import { ModelInfo, ChatMessage } from '@/services/ollama/types';

export class MockModelManager extends ModelManager {
  private mockModels: (Model & { ollamaDetails: OllamaModelDetails | null })[] = [
    {
      id: 'test-model-1',
      name: 'llama2',
      status: 'ready',
      parameters: '{}',
      createdAt: new Date(),
      updatedAt: new Date(),
      ollamaDetails: {
        id: 'ollama-1',
        modelId: 'test-model-1',
        downloadProgress: 100,
        downloadStatus: 'completed',
        createdAt: new Date(),
        updatedAt: new Date()
      }
    },
    {
      id: 'test-model-2',
      name: 'mistral',
      status: 'downloading',
      parameters: '{}',
      createdAt: new Date(),
      updatedAt: new Date(),
      ollamaDetails: {
        id: 'ollama-2',
        modelId: 'test-model-2',
        downloadProgress: 50,
        downloadStatus: 'downloading',
        createdAt: new Date(),
        updatedAt: new Date()
      }
    }
  ];

  constructor() {
    const db = new DatabaseService();
    const ollamaService = new OllamaService();
    super(db, ollamaService);
  }

  async listModelsWithDetails() {
    return this.mockModels;
  }

  async refreshModelStatuses(): Promise<void> {
    // Simulate status refresh
    return;
  }

  async getModelWithDetails(modelId: string) {
    const model = this.mockModels.find(m => m.id === modelId);
    if (!model) {
      throw new Error(`Model with ID ${modelId} not found`);
    }
    return model;
  }

  async pullModel(modelName: string): Promise<Model> {
    const model = {
      id: `${modelName}-${Date.now()}`,
      name: modelName,
      status: 'downloading',
      parameters: '{}',
      createdAt: new Date(),
      updatedAt: new Date()
    };
    this.mockModels.push({
      ...model,
      ollamaDetails: {
        id: `ollama-${model.id}`,
        modelId: model.id,
        downloadProgress: 0,
        downloadStatus: 'downloading',
        createdAt: new Date(),
        updatedAt: new Date()
      }
    });
    return model;
  }

  async deleteModel(modelId: string): Promise<void> {
    this.mockModels = this.mockModels.filter(m => m.id !== modelId);
  }

  async saveModelParameters(modelId: string, parameters: string): Promise<Model> {
    const model = this.mockModels.find(m => m.id === modelId);
    if (!model) {
      throw new Error(`Model with ID ${modelId} not found`);
    }
    model.parameters = parameters;
    model.updatedAt = new Date();
    return model;
  }

  protected emitStatusUpdate(update: ModelStatusUpdate) {
    this.emit('modelStatusUpdate', update);
  }
}

export class MockOllamaService extends OllamaService {
  private logger = logger.withCategory('mock-ollama-service');
  private mockModels: ModelInfo[] = [
    {
      name: 'llama2',
      model: 'llama2',
      modified_at: new Date().toISOString(),
      size: 1000000,
      digest: 'abc123',
      details: {
        format: 'gguf',
        family: 'llama',
        parameter_size: '7B',
        quantization_level: 'Q4_0'
      }
    },
    {
      name: 'mistral',
      model: 'mistral',
      modified_at: new Date().toISOString(),
      size: 2000000,
      digest: 'def456',
      details: {
        format: 'gguf',
        family: 'mistral',
        parameter_size: '7B',
        quantization_level: 'Q4_0'
      }
    }
  ];

  constructor() {
    super('http://localhost:11434');
  }

  async isAvailable(): Promise<boolean> {
    return true;
  }

  getModels(): ModelInfo[] {
    return this.mockModels;
  }

  async listModels(): Promise<ModelInfo[]> {
    return this.mockModels;
  }

  async refreshModels(): Promise<ModelInfo[]> {
    return this.mockModels;
  }

  async pullModel(modelName: string): Promise<void> {
    this.logger.info(`Mock pulling model: ${modelName}`);
    return;
  }

  async deleteModel(name: string): Promise<void> {
    this.logger.info(`Mock deleting model: ${name}`);
    return;
  }

  async generateCompletion(modelName: string, prompt: string): Promise<any> {
    this.logger.info(`Mock generating completion for ${modelName}: ${prompt}`);
    return {};
  }

  async generateChatCompletion(messages: ChatMessage[], modelName?: string): Promise<string> {
    this.logger.info(`Mock generating chat completion for ${modelName || this.getDefaultModel()}`);
    return 'Mock response';
  }

  async createEmbeddings(text: string, modelName?: string): Promise<number[]> {
    this.logger.info(`Mock creating embeddings for ${modelName || this.getDefaultModel()}`);
    return [0.1, 0.2, 0.3]; // Mock embeddings
  }

  async getModelInfo(modelName: string): Promise<any> {
    this.logger.info(`Mock getting model info for: ${modelName}`);
    return {};
  }

  async getModelDetails(modelName: string): Promise<any> {
    this.logger.info(`Mock getting model details for: ${modelName}`);
    return {};
  }
} 