import { PrismaClient } from '@prisma/client';
import { OllamaClient } from './client';
import { OllamaModelInfo } from './types';

export class OllamaModelManager {
  constructor(
    private prisma: PrismaClient,
    private ollamaClient: OllamaClient
  ) {}

  async syncModels(): Promise<void> {
    const { models } = await this.ollamaClient.listModels();
    
    // Update database with available models
    for (const model of models) {
      await this.upsertModel(model);
    }

    // Mark models not in Ollama as not downloaded
    await this.prisma.ollamaModel.updateMany({
      where: {
        name: {
          notIn: models.map(m => m.name)
        },
        isDownloaded: true
      },
      data: {
        isDownloaded: false,
        status: 'NOT_DOWNLOADED',
        downloadProgress: 0
      }
    });
  }

  private async upsertModel(model: OllamaModelInfo) {
    return this.prisma.ollamaModel.upsert({
      where: { name: model.name },
      create: {
        name: model.name,
        size: model.size,
        digest: model.digest,
        format: model.format,
        family: model.family,
        parameters: model.parameters || {},
        isDownloaded: true,
        status: 'READY'
      },
      update: {
        size: model.size,
        digest: model.digest,
        format: model.format,
        family: model.family,
        parameters: model.parameters || {},
        isDownloaded: true,
        status: 'READY'
      }
    });
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
        format: '',
        family: '',
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