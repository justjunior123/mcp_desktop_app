import { OllamaModelInfo, OllamaModelData, OllamaModelDetails } from '../../src/services/ollama/types';
import { OllamaClient } from '../../src/services/ollama/client';
import { PrismaClient } from '@prisma/client';
import fs from 'fs';

// Helper function to log to a file
const logToFile = (message: string, data?: any) => {
  const safeData = data ? JSON.parse(JSON.stringify(data, (key, value) =>
    typeof value === 'bigint' ? value.toString() : value
  )) : undefined;
  const logMessage = `${new Date().toISOString()} - ${message}${safeData ? '\n' + JSON.stringify(safeData, null, 2) : ''}\n`;
  fs.appendFileSync('model-manager-debug.log', logMessage);
};

interface ExtendedOllamaModelData extends OllamaModelData {
  id: string;
  status: 'AVAILABLE' | 'DOWNLOADING' | 'ERROR' | 'NOT_DOWNLOADED';
  error?: string | null;
  configuration?: {
    temperature?: number;
    topP?: number;
    topK?: number;
    repeatPenalty?: number;
    presencePenalty?: number;
    frequencyPenalty?: number;
    stop?: string[];
    maxTokens?: number;
    systemPrompt?: string;
    contextWindow?: number;
  };
}

export class MockOllamaModelManager {
  private models: Map<string, ExtendedOllamaModelData> = new Map();

  constructor(
    private prisma: PrismaClient,
    private ollamaClient: OllamaClient
  ) {
    logToFile('Initializing MockOllamaModelManager');
    // Store with 'parameters', not 'details'
    this.models.set('mistral:latest', {
      id: 'mistral-latest',
      name: 'mistral:latest',
      size: BigInt(4096),
      digest: 'sha256:123',
      format: 'gguf',
      family: 'llama',
      parameters: {
        format: 'gguf',
        family: 'llama',
        parameter_size: '7B',
        context_length: 32768,
        embedding_length: 4096,
        quantization: 'Q4_0',
        capabilities: ['completion', 'tools'],
        stop_sequences: ['[INST]', '[/INST]'],
        families: ['llama'],
        quantization_level: 'Q4_0',
        parent_model: '',
        license: 'Apache License Version 2.0, January 2004'
      },
      status: 'AVAILABLE',
      configuration: {}
    });
    logToFile('Initial model state', Array.from(this.models.values()));
  }

  async listModels(): Promise<OllamaModelInfo[]> {
    logToFile('listModels called');
    try {
      const models = Array.from(this.models.values()).map(model => ({
        name: model.name,
        size: model.size,
        digest: model.digest,
        details: model.parameters || {}
      }));
      logToFile('listModels returning', models);
      return models;
    } catch (error) {
      logToFile('listModels error', error);
      throw error;
    }
  }

  async getModel(name: string): Promise<OllamaModelInfo> {
    logToFile('getModel called with name', name);
    try {
      const model = this.models.get(name);
      if (!model) {
        logToFile('Model not found', name);
        throw new Error('Model not found');
      }
      const result = {
        name: model.name,
        size: model.size,
        digest: model.digest,
        details: model.parameters || {}
      };
      logToFile('getModel returning', result);
      return result;
    } catch (error) {
      logToFile('getModel error', error);
      throw error;
    }
  }

  async pullModel(name: string): Promise<OllamaModelInfo> {
    logToFile('pullModel called with name', name);
    try {
      // Simulate a delay for model pulling
      await new Promise(resolve => setTimeout(resolve, 100));
      const newModel: ExtendedOllamaModelData = {
        id: name.replace(':', '-'),
        name,
        size: BigInt(4096),
        digest: 'sha256:123',
        format: 'gguf',
        family: 'llama',
        parameters: {
          format: 'gguf',
          family: 'llama',
          parameter_size: '7B',
          context_length: 32768,
          embedding_length: 4096,
          quantization: 'Q4_0',
          capabilities: ['completion', 'tools'],
          stop_sequences: ['[INST]', '[/INST]'],
          families: ['llama'],
          quantization_level: 'Q4_0',
          parent_model: '',
          license: 'Apache License Version 2.0, January 2004'
        },
        status: 'AVAILABLE',
        configuration: {}
      };
      this.models.set(name, newModel);
      const result = {
        name: newModel.name,
        size: newModel.size,
        digest: newModel.digest,
        details: newModel.parameters || {}
      };
      logToFile('pullModel returning', result);
      return result;
    } catch (error) {
      logToFile('pullModel error', error);
      throw error;
    }
  }

  async updateModel(name: string, config: {
    temperature?: number;
    topP?: number;
    topK?: number;
    repeatPenalty?: number;
    presencePenalty?: number;
    frequencyPenalty?: number;
    stop?: string[];
    maxTokens?: number;
    systemPrompt?: string;
    contextWindow?: number;
  }): Promise<OllamaModelInfo> {
    logToFile('updateModel called with name and config', { name, config });
    try {
      const model = this.models.get(name);
      if (!model) {
        logToFile('Model not found for update', name);
        throw new Error('Model not found');
      }
      
      // Update the model's configuration
      const updatedModel = {
        ...model,
        configuration: {
          ...model.configuration,
          ...config
        }
      };
      this.models.set(name, updatedModel);

      // Return the model info with config at root level
      const result = {
        name: updatedModel.name,
        size: updatedModel.size,
        digest: updatedModel.digest,
        details: {
          ...updatedModel.parameters,
          ...config  // Include config in details as well
        },
        ...config  // Include config at root level
      };
      
      logToFile('updateModel returning', result);
      return result;
    } catch (error) {
      logToFile('updateModel error', error);
      throw error;
    }
  }

  async deleteModel(name: string): Promise<void> {
    logToFile('deleteModel called with name', name);
    try {
      if (!this.models.has(name)) {
        logToFile('Model not found for deletion', name);
        throw new Error('Model not found');
      }
      this.models.delete(name);
      logToFile('Model deleted successfully', name);
    } catch (error) {
      logToFile('deleteModel error', error);
      throw error;
    }
  }

  async syncModels(): Promise<void> {
    logToFile('syncModels called');
    // No-op in mock
  }

  async upsertModel(model: OllamaModelData): Promise<void> {
    logToFile('upsertModel called with model', model);
    try {
      const extendedModel: ExtendedOllamaModelData = {
        id: model.name.replace(':', '-'),
        name: model.name,
        size: model.size || BigInt(4096),
        digest: model.digest || 'sha256:123',
        format: model.format || 'gguf',
        family: model.family || 'llama',
        parameters: model.parameters || {
          format: model.format || 'gguf',
          family: model.family || 'llama',
          parameter_size: '7B',
          context_length: 32768,
          embedding_length: 4096,
          quantization: 'Q4_0',
          capabilities: ['completion', 'tools'],
          stop_sequences: ['[INST]', '[/INST]'],
          families: ['llama'],
          quantization_level: 'Q4_0',
          parent_model: '',
          license: 'Apache License Version 2.0, January 2004'
        },
        status: model.status as 'AVAILABLE' | 'DOWNLOADING' | 'ERROR' | 'NOT_DOWNLOADED' || 'AVAILABLE',
        error: model.error || null,
        configuration: {}
      };
      this.models.set(model.name, extendedModel);
      logToFile('Model upserted successfully', extendedModel);
    } catch (error) {
      logToFile('upsertModel error', error);
      throw error;
    }
  }
} 