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
  size?: bigint;
  format?: string;
  family?: string;
  parameterSize?: string;
  quantizationLevel?: string;
  downloadProgress: number;
  downloadStatus: string;
  errorMessage?: string;
  digest?: string;
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
      // Check if Ollama is available
      const isAvailable = await this.ollamaService.isAvailable();
      if (!isAvailable) {
        this.logger.warn('Ollama is not available, skipping model status refresh');
        return;
      }

      // Get all models from database
      const dbModels = await this.db.listModels();
      
      // Get all models from Ollama
      const ollamaModels = await this.ollamaService.refreshModels();
      
      // Update statuses based on what's in Ollama
      for (const dbModel of dbModels) {
        // Find matching Ollama model
        const ollamaModel = ollamaModels.find((m: ModelInfo) => m.name === dbModel.name);
        
        // If model exists in Ollama, it's installed
        if (ollamaModel) {
          const prevStatus = dbModel.status;
          
          if (prevStatus !== 'installed') {
            await this.updateModelStatus(dbModel.id, 'installed');
            
            // Fetch details if we don't have them
            const details = await this.getOllamaDetails(dbModel.id);
            if (!details) {
              await this.fetchAndUpdateModelDetails(dbModel.id, ollamaModel);
            }
          }
        } 
        // If model doesn't exist in Ollama but was previously installed, mark as not installed
        else if (dbModel.status === 'installed') {
          await this.updateModelStatus(dbModel.id, 'not_installed');
        }
      }
      
      // Check for models that are in Ollama but not in our database
      for (const ollamaModel of ollamaModels) {
        const exists = dbModels.some(m => m.name === ollamaModel.name);
        if (!exists) {
          await this.importModelFromOllama(ollamaModel);
        }
      }
    } catch (error) {
      this.logger.error('Error refreshing model statuses', { error });
      throw error;
    }
  }

  /**
   * Get Ollama details for a model if they exist
   */
  private async getOllamaDetails(modelId: string): Promise<OllamaModelDetails | null> {
    try {
      // We'll use raw query since the OllamaModelDetails table might not exist yet
      const details: any[] = await prisma.$queryRaw`
        SELECT * FROM OllamaModelDetails WHERE modelId = ${modelId}
      `;
      
      return details.length > 0 ? details[0] as OllamaModelDetails : null;
    } catch (error) {
      // If table doesn't exist yet, just return null
      return null;
    }
  }

  /**
   * Import a model from Ollama into our database
   * @param ollamaModel Model info from Ollama
   */
  private async importModelFromOllama(ollamaModel: ModelInfo): Promise<Model> {
    this.logger.info(`Importing new model from Ollama: ${ollamaModel.name}`);
    
    try {
      // Create the model in database
      const model = await this.db.createModel({
        name: ollamaModel.name,
        status: 'installed',
      });
      
      // Fetch and add details
      await this.fetchAndUpdateModelDetails(model.id, ollamaModel);
      
      // Emit status update
      this.emitStatusUpdate({
        modelId: model.id,
        status: 'installed',
      });
      
      return model;
    } catch (error) {
      this.logger.error(`Error importing model ${ollamaModel.name}`, { error });
      throw error;
    }
  }

  /**
   * Fetch detailed information for a model and update the database
   * @param modelId Database ID of the model
   * @param ollamaModel Basic model info from Ollama
   */
  private async fetchAndUpdateModelDetails(modelId: string, ollamaModel: ModelInfo): Promise<OllamaModelDetails> {
    try {
      // Get detailed model info from Ollama
      const details = await this.ollamaService.generateCompletion(ollamaModel.name, "");
      
      // Parse size and format information
      let family: string | undefined;
      let parameterSize: string | undefined;
      let quantizationLevel: string | undefined;
      
      // Try to extract information from model name, which often follows the format: 
      // modelFamily:parameterSize-quantizationLevel
      // Examples: llama2:7b-q4_0, mixtral:8x7b-instruct-q5_K_M, etc.
      const nameParts = ollamaModel.name.split(':');
      if (nameParts.length > 1) {
        family = nameParts[0];
        
        const versionParts = nameParts[1].split('-');
        if (versionParts.length > 0) {
          parameterSize = versionParts[0];
          
          // Check for quantization info (q4_0, q8_0, etc.)
          for (let i = 1; i < versionParts.length; i++) {
            if (/^q\d+/.test(versionParts[i])) {
              quantizationLevel = versionParts[i];
              break;
            }
          }
        }
      }
      
      // Create or update model details - using raw SQL for now
      await prisma.$executeRaw`
        INSERT INTO OllamaModelDetails (
          id, modelId, size, family, parameterSize, 
          quantizationLevel, downloadStatus, downloadProgress, 
          createdAt, updatedAt
        ) 
        VALUES (
          uuid(), ${modelId}, ${ollamaModel.size ? BigInt(ollamaModel.size) : null}, 
          ${family}, ${parameterSize}, ${quantizationLevel},
          'completed', 100, datetime('now'), datetime('now')
        )
        ON CONFLICT(modelId) DO UPDATE SET
          size = ${ollamaModel.size ? BigInt(ollamaModel.size) : null},
          family = ${family},
          parameterSize = ${parameterSize},
          quantizationLevel = ${quantizationLevel},
          downloadStatus = 'completed',
          downloadProgress = 100,
          updatedAt = datetime('now')
      `;
      
      // Get the updated record
      const modelDetails = await this.getOllamaDetails(modelId);
      
      this.logger.info(`Updated model details for ${ollamaModel.name}`, { modelId });
      return modelDetails as OllamaModelDetails;
    } catch (error) {
      this.logger.error(`Error fetching model details for ${ollamaModel.name}`, { modelId, error });
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
      // Update the model's status
      const model = await this.db.updateModel(modelId, { status });
      
      // Update OllamaModelDetails if it exists
      const modelDetails = await this.getOllamaDetails(modelId);
      
      if (modelDetails) {
        // Use raw query to update
        await prisma.$executeRaw`
          UPDATE OllamaModelDetails
          SET 
            downloadStatus = ${status === 'downloading' ? 'downloading' : 
                              status === 'error' ? 'error' : 
                              status === 'installed' ? 'completed' : 'idle'},
            downloadProgress = ${progress !== undefined ? progress : 
                                status === 'installed' ? 100 : 
                                modelDetails.downloadProgress},
            errorMessage = ${errorMessage},
            updatedAt = datetime('now')
          WHERE modelId = ${modelId}
        `;
      }
      
      // Emit the status update event
      this.emitStatusUpdate({
        modelId,
        status,
        downloadProgress: progress,
        error: errorMessage
      });
      
      return model;
    } catch (error) {
      this.logger.error(`Error updating model status for ${modelId}`, { status, error });
      throw error;
    }
  }

  /**
   * Pull a model from Ollama and track its progress
   * @param modelName Name of the model to pull
   */
  public async pullModel(modelName: string): Promise<Model> {
    this.logger.info(`Pulling model: ${modelName}`);
    
    try {
      // Check if model already exists in the database
      let model = await prisma.model.findFirst({
        where: { name: modelName }
      });
      
      // If not, create it
      if (!model) {
        model = await this.db.createModel({
          name: modelName,
          status: 'downloading'
        });
        
        // Create details record using raw query
        await prisma.$executeRaw`
          INSERT INTO OllamaModelDetails (
            id, modelId, downloadStatus, downloadProgress, createdAt, updatedAt
          ) 
          VALUES (
            uuid(), ${model.id}, 'downloading', 0, datetime('now'), datetime('now')
          )
        `;
      } else {
        // Update existing model to downloading state
        model = await this.updateModelStatus(model.id, 'downloading', 0);
      }
      
      // Start pull in the background and track progress
      this.ollamaService.pullModel(modelName)
        .then(result => {
          this.logger.info(`Model pull completed: ${modelName}`);
          this.updateModelStatus(model!.id, 'installed', 100);
          this.refreshModelStatuses().catch(e => 
            this.logger.error('Error refreshing model status after pull', { error: e })
          );
        })
        .catch(error => {
          this.logger.error(`Error pulling model: ${modelName}`, { error });
          this.updateModelStatus(model!.id, 'error', undefined, 
            error instanceof Error ? error.message : 'Unknown error pulling model');
        });
      
      // Emit initial status
      this.emitStatusUpdate({
        modelId: model.id,
        status: 'downloading',
        downloadProgress: 0
      });
      
      return model;
    } catch (error) {
      this.logger.error(`Error starting model pull for ${modelName}`, { error });
      throw error;
    }
  }

  /**
   * Delete a model from Ollama and update the database
   * @param modelId ID of the model to delete
   */
  public async deleteModel(modelId: string): Promise<void> {
    try {
      // Get the model from database
      const model = await this.db.getModel(modelId);
      if (!model) {
        throw new Error(`Model with ID ${modelId} not found`);
      }
      
      this.logger.info(`Deleting model: ${model.name}`);
      
      // Update status to indicate deletion in progress
      await this.updateModelStatus(modelId, 'deleting');
      
      try {
        // Delete from Ollama
        await this.ollamaService.generateCompletion(model.name, "");
        
        // Update status to not installed
        await this.updateModelStatus(modelId, 'not_installed');
      } catch (error) {
        this.logger.error(`Error deleting model ${model.name} from Ollama`, { error });
        
        // If the error suggests the model doesn't exist in Ollama, still mark as not installed
        if (error instanceof Error && 
            (error.message.includes('not found') || error.message.includes('does not exist'))) {
          await this.updateModelStatus(modelId, 'not_installed');
        } else {
          // Otherwise mark as error
          await this.updateModelStatus(modelId, 'error', undefined, 
            error instanceof Error ? error.message : 'Unknown error deleting model');
          throw error;
        }
      }
    } catch (error) {
      this.logger.error(`Error in deleteModel for ID ${modelId}`, { error });
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
      
      const details = await this.getOllamaDetails(modelId);
      
      return {
        ...model,
        ollamaDetails: details
      };
    } catch (error) {
      this.logger.error(`Error getting model with details: ${modelId}`, { error });
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