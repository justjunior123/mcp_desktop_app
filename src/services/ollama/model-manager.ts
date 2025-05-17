import { PrismaClient, Prisma } from '@prisma/client';
import { OllamaClient } from './client';
import { OllamaModelInfo, OllamaModelData } from './types';

type PrismaClientWithModels = PrismaClient & {
  ollamaModel: any;
  ollamaModelConfiguration: any;
};

export class OllamaModelManager {
  constructor(
    private prisma: PrismaClientWithModels,
    private ollamaClient: OllamaClient
  ) {}

  async syncModels(): Promise<void> {
    // Check if Ollama is available first
    const isHealthy = await this.ollamaClient.healthCheck();
    if (!isHealthy) {
      throw new Error('Ollama server is not available');
    }

    try {
      const response = await this.ollamaClient.listModels();
      
      if (!response || !Array.isArray(response.models)) {
        throw new Error('Invalid response from Ollama API');
      }
      
      for (const model of response.models) {
        if (!model || !model.name) {
          console.warn('Skipping invalid model:', model);
          continue;
        }
        
        const modelData: OllamaModelData = {
          name: model.name,
          size: model.size,
          digest: model.digest,
          format: model.details.format,
          family: model.details.family,
          parameters: {
            families: model.details.families || [],
            parameter_size: model.details.parameter_size,
            quantization_level: model.details.quantization_level,
            ...model.details
          },
          isDownloaded: true,
          status: 'READY'
        };
        
        await this.upsertModel(modelData);
      }
    } catch (error) {
      console.error('Error syncing models:', error);
      throw error;
    }
  }

  private async upsertModel(modelData: OllamaModelData): Promise<void> {
    try {
      await this.prisma.ollamaModel.upsert({
        where: { name: modelData.name },
        create: modelData,
        update: modelData
      });
    } catch (error) {
      console.error(`Error upserting model ${modelData.name}:`, error);
      throw error;
    }
  }

  async getModel(name: string) {
    return this.prisma.ollamaModel.findUnique({
      where: { name },
      include: { configuration: true }
    });
  }

  async listModels() {
    return this.prisma.ollamaModel.findMany({
      include: { configuration: true }
    });
  }

  async pullModel(name: string) {
    // Start download
    await this.prisma.ollamaModel.upsert({
      where: { name },
      create: {
        name,
        size: 0,
        digest: '',
        format: 'unknown',
        family: 'unknown',
        parameters: null,
        status: 'DOWNLOADING',
        downloadProgress: 0
      },
      update: {
        status: 'DOWNLOADING',
        downloadProgress: 0
      }
    });

    try {
      // Pull model from Ollama
      await this.ollamaClient.pullModel(name);
      
      // Get updated model info
      const modelInfo = await this.ollamaClient.getModel(name);
      
      // Update database with complete info
      await this.upsertModel(modelInfo);
    } catch (error) {
      // Update database with error state
      await this.prisma.ollamaModel.update({
        where: { name },
        data: {
          status: 'ERROR',
          error: error instanceof Error ? error.message : 'Unknown error'
        }
      });
      throw error;
    }
  }

  async updateModelConfiguration(name: string, config: {
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
  }) {
    const model = await this.prisma.ollamaModel.findUnique({
      where: { name }
    });

    if (!model) {
      throw new Error(`Model ${name} not found`);
    }

    return this.prisma.ollamaModelConfiguration.upsert({
      where: { modelId: model.id },
      create: {
        modelId: model.id,
        ...config
      },
      update: config
    });
  }

  async deleteModel(name: string) {
    // First check if model exists
    const model = await this.prisma.ollamaModel.findUnique({
      where: { name }
    });

    if (!model) {
      throw new Error(`Model ${name} not found`);
    }

    // Delete from database
    await this.prisma.ollamaModel.delete({
      where: { name }
    });

    // Note: We don't delete from Ollama as there's no API for that
    // The model will be re-added on next sync if it still exists in Ollama
  }
} 