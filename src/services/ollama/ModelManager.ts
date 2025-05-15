import { DatabaseService } from '../database/DatabaseService';
import { OllamaService } from './OllamaService';
import { ModelInfo } from './types';
import { logger } from '../logging';
import { Model } from '@prisma/client';
import { EventEmitter } from 'events';
import { prisma } from '../database/client';

// Since OllamaModelDetails isn't in Prisma client yet, we'll define it here
export interface OllamaModelDetails {
  id: string;
  modelId: string;
  size?: bigint | null;
  format?: string | null;
  family?: string | null;
  parameterSize?: string | null;
  quantizationLevel?: string | null;
  downloadProgress: number;
  downloadStatus: string;
  errorMessage?: string | null;
  digest?: string | null;
  createdAt: Date;
  updatedAt: Date;
}

/**
 * Interface for model status update events
 */
export interface ModelStatusUpdate {
  modelId: string;
  status: string;
  downloadProgress?: number;
  error?: string;
}

/**
 * Service for managing Ollama models in the database
 */
export class ModelManager extends EventEmitter {
  private db: DatabaseService;
  private ollamaService: OllamaService;
  private modelStatusPollingInterval?: NodeJS.Timeout;
  private logger = logger.withCategory('model-manager');

  constructor(db: DatabaseService, ollamaService: OllamaService) {
    super();
    this.db = db;
    this.ollamaService = ollamaService;
    this.logger.info('ModelManager initialized');
  }

  /**
   * Start polling for model status changes from Ollama
   * @param intervalMs How often to check status in milliseconds
   */
  public startStatusPolling(intervalMs: number = 5000): void {
    if (this.modelStatusPollingInterval) {
      this.stopStatusPolling();
    }

    this.logger.info(`Starting model status polling every ${intervalMs}ms`);
    this.modelStatusPollingInterval = setInterval(() => {
      this.refreshModelStatuses().catch(error => {
        this.logger.error('Error refreshing model statuses', { error });
      });
    }, intervalMs);
  }

  /**
   * Stop polling for model status changes
   */
  public stopStatusPolling(): void {
    if (this.modelStatusPollingInterval) {
      clearInterval(this.modelStatusPollingInterval);
      this.modelStatusPollingInterval = undefined;
      this.logger.info('Stopped model status polling');
    }
  }

  /**
   * Refresh the statuses of all models from Ollama
   */
  public async refreshModelStatuses(): Promise<void> {
    try {
      const models = await this.db.listModels();
      const installedModels = await this.ollamaService.listModels();

      for (const model of models) {
        const isInstalled = installedModels.some(m => m.name === model.name);
        await this.updateModelStatus(model.id, isInstalled ? 'installed' : 'not_installed');
      }
    } catch (error) {
      logger.error('Error refreshing model statuses:', error);
      throw error;
    }
  }

  /**
   * Get Ollama details for a model if they exist
   */
  private async getOllamaDetails(modelId: string): Promise<OllamaModelDetails | null> {
    try {
      // We'll use raw query since the OllamaModelDetails table might not exist yet
      const details = await prisma.$queryRaw<OllamaModelDetails[]>`
        SELECT * FROM OllamaModelDetails WHERE modelId = ${modelId}
      `;
      
      return details.length > 0 ? details[0] : null;
    } catch (error) {
      // If table doesn't exist yet, just return null
      return null;
    }
  }

  /**
   * Import a model from Ollama into our database
   * @param model Model info from Ollama
   */
  private async importModelFromOllama(model: ModelInfo): Promise<Model> {
    try {
      const existingModel = await this.db.findModelByName(model.name);
      if (existingModel) {
        return existingModel;
      }

      const newModel = await this.db.createModel({
        name: model.name,
        status: 'installed'
      });

      await this.db.createOllamaModelDetails(newModel.id, {
        downloadStatus: 'completed',
        downloadProgress: 100
      });

      return newModel;
    } catch (error) {
      logger.error(`Error importing model from Ollama: ${model.name}`, error);
      throw error;
    }
  }

  /**
   * Fetch detailed information for a model and update the database
   * @param modelId Database ID of the model
   */
  private async fetchAndUpdateModelDetails(modelId: string): Promise<void> {
    try {
      await this.db.createOllamaModelDetails(modelId, {
        downloadStatus: 'completed',
        downloadProgress: 100
      });
    } catch (error) {
      logger.error(`Error updating model details for ${modelId}:`, error);
      throw error;
    }
  }

  /**
   * Update the status of a model in the database
   * @param modelId ID of the model to update
   * @param status New status
   * @param progress Download progress (0-100)
   * @param errorMessage Error message if status is 'error'
   */
  public async updateModelStatus(
    modelId: string,
    status: string,
    progress?: number,
    errorMessage?: string
  ): Promise<Model> {
    try {
      await this.db.updateModel(modelId, { status });
      
      if (progress !== undefined || errorMessage !== undefined) {
        await this.db.updateOllamaModelDetails(modelId, {
          downloadStatus: status,
          downloadProgress: progress ?? null,
          errorMessage: errorMessage ?? null
        });
      }

      this.emitStatusUpdate({
        modelId,
        status,
        downloadProgress: progress,
        error: errorMessage
      });

      return await this.getModelWithDetails(modelId);
    } catch (error) {
      this.logger.error(`Error updating model status for ${modelId}:`, error);
      throw error;
    }
  }

  /**
   * Pull a model from Ollama and track its progress
   * @param modelName Name of the model to pull
   */
  public async pullModel(modelName: string): Promise<Model> {
    try {
      const model = await this.ollamaService.pullModel(modelName);
      await this.refreshModelStatuses();
      return model;
    } catch (error) {
      logger.error(`Failed to pull model ${modelName}:`, error);
      throw error;
    }
  }

  /**
   * Delete a model from Ollama and update the database
   * @param modelId ID of the model to delete
   */
  public async deleteModel(modelId: string): Promise<void> {
    try {
      await this.ollamaService.deleteModel(modelId);
      await this.refreshModelStatuses();
    } catch (error) {
      logger.error(`Failed to delete model ${modelId}:`, error);
      throw error;
    }
  }

  /**
   * Get a model with its detailed information
   * @param modelId ID of the model to get
   */
  public async getModelWithDetails(modelId: string): Promise<Model & { ollamaDetails: OllamaModelDetails | null }> {
    try {
      const model = await this.db.getModel(modelId);
      if (!model) {
        throw new Error(`Model with ID ${modelId} not found`);
      }
      
      const ollamaDetails = await this.getOllamaDetails(modelId);
      
      return {
        ...model,
        ollamaDetails
      };
    } catch (error) {
      this.logger.error(`Error getting model details for ${modelId}:`, error);
      throw error;
    }
  }

  /**
   * List all models with their detailed information
   */
  public async listModelsWithDetails(): Promise<(Model & { ollamaDetails: OllamaModelDetails | null })[]> {
    try {
      const models = await this.db.listModels();
      const result: (Model & { ollamaDetails: OllamaModelDetails | null })[] = [];
      
      // Get details for each model
      for (const model of models) {
        const details = await this.getOllamaDetails(model.id);
        result.push({
          ...model,
          ollamaDetails: details
        });
      }
      
      return result;
    } catch (error) {
      this.logger.error('Error listing models with details', { error });
      throw error;
    }
  }

  /**
   * Save model configuration parameters
   * @param modelId ID of the model to configure
   * @param parameters Configuration parameters as a JSON string
   */
  public async saveModelParameters(modelId: string, parameters: string): Promise<Model> {
    try {
      // Verify that parameters is valid JSON
      try {
        JSON.parse(parameters);
      } catch (e) {
        throw new Error('Invalid JSON for model parameters');
      }
      
      const model = await this.db.updateModel(modelId, { parameters });
      this.logger.info(`Updated parameters for model ${modelId}`);
      
      return model;
    } catch (error) {
      this.logger.error(`Error saving model parameters for ${modelId}`, { error });
      throw error;
    }
  }

  /**
   * Get model configuration parameters
   * @param modelId ID of the model to get parameters for
   */
  public async getModelParameters(modelId: string): Promise<any> {
    try {
      const model = await this.db.getModel(modelId);
      if (!model) {
        throw new Error(`Model with ID ${modelId} not found`);
      }
      
      // Parse and return the parameters
      if (model.parameters) {
        try {
          return JSON.parse(model.parameters);
        } catch (e) {
          this.logger.warn(`Invalid JSON in model parameters for ${modelId}`, { error: e });
          return {};
        }
      }
      
      return {};
    } catch (error) {
      this.logger.error(`Error getting model parameters for ${modelId}`, { error });
      throw error;
    }
  }

  /**
   * Emit a model status update event
   * @param update Status update information
   */
  private emitStatusUpdate(update: ModelStatusUpdate): void {
    this.emit('modelStatusUpdate', update);
    this.logger.debug('Emitted model status update', { update });
  }
} 