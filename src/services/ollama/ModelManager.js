import { logger } from '../logging';
import { EventEmitter } from 'events';
import { prisma } from '../database/client';
/**
 * Service for managing Ollama models in the database
 */
export class ModelManager extends EventEmitter {
    constructor(db, ollamaService) {
        super();
        this.logger = logger.withCategory('model-manager');
        this.db = db;
        this.ollamaService = ollamaService;
        this.logger.info('ModelManager initialized');
    }
    /**
     * Start polling for model status changes from Ollama
     * @param intervalMs How often to check status in milliseconds
     */
    startStatusPolling(intervalMs = 5000) {
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
    stopStatusPolling() {
        if (this.modelStatusPollingInterval) {
            clearInterval(this.modelStatusPollingInterval);
            this.modelStatusPollingInterval = undefined;
            this.logger.info('Stopped model status polling');
        }
    }
    /**
     * Refresh the statuses of all models from Ollama
     */
    async refreshModelStatuses() {
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
                const ollamaModel = ollamaModels.find((m) => m.name === dbModel.name);
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
        }
        catch (error) {
            this.logger.error('Error refreshing model statuses', { error });
            throw error;
        }
    }
    /**
     * Get Ollama details for a model if they exist
     */
    async getOllamaDetails(modelId) {
        try {
            // We'll use raw query since the OllamaModelDetails table might not exist yet
            const details = await prisma.$queryRaw `
        SELECT * FROM OllamaModelDetails WHERE modelId = ${modelId}
      `;
            return details.length > 0 ? details[0] : null;
        }
        catch (error) {
            // If table doesn't exist yet, just return null
            return null;
        }
    }
    /**
     * Import a model from Ollama into our database
     * @param ollamaModel Model info from Ollama
     */
    async importModelFromOllama(ollamaModel) {
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
        }
        catch (error) {
            this.logger.error(`Error importing model ${ollamaModel.name}`, { error });
            throw error;
        }
    }
    /**
     * Fetch detailed information for a model and update the database
     * @param modelId Database ID of the model
     * @param ollamaModel Basic model info from Ollama
     */
    async fetchAndUpdateModelDetails(modelId, ollamaModel) {
        try {
            // Get detailed model info from Ollama
            const details = await this.ollamaService.generateCompletion(ollamaModel.name, "");
            // Parse size and format information
            let family;
            let parameterSize;
            let quantizationLevel;
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
            await prisma.$executeRaw `
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
            return modelDetails;
        }
        catch (error) {
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
    async updateModelStatus(modelId, status, progress, errorMessage) {
        try {
            // Update the model's status
            const model = await this.db.updateModel(modelId, { status });
            // Update OllamaModelDetails if it exists
            const modelDetails = await this.getOllamaDetails(modelId);
            if (modelDetails) {
                // Use raw query to update
                await prisma.$executeRaw `
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
        }
        catch (error) {
            this.logger.error(`Error updating model status for ${modelId}`, { status, error });
            throw error;
        }
    }
    /**
     * Pull a model from Ollama and track its progress
     * @param modelName Name of the model to pull
     */
    async pullModel(modelName) {
        try {
            const model = await this.ollamaService.pullModel(modelName);
            await this.refreshModelStatuses();
            return model;
        } catch (err) {
            logger.error(`Failed to pull model ${modelName}:`, err);
            throw err;
        }
    }
    /**
     * Delete a model from Ollama and update the database
     * @param modelId ID of the model to delete
     */
    async deleteModel(modelId) {
        try {
            await this.ollamaService.deleteModel(modelId);
            await this.refreshModelStatuses();
        } catch (err) {
            logger.error(`Failed to delete model ${modelId}:`, err);
            throw err;
        }
    }
    /**
     * Get a model with its detailed information
     * @param modelId ID of the model to get
     */
    async getModelWithDetails(modelId) {
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
            this.logger.error(`Error getting model details for ${modelId}`, { error });
            throw error;
        }
    }
    /**
     * List all models with their detailed information
     */
    async listModelsWithDetails() {
        try {
            const models = await this.db.listModels();
            const result = [];
            // Get details for each model
            for (const model of models) {
                const details = await this.getOllamaDetails(model.id);
                result.push({
                    ...model,
                    ollamaDetails: details
                });
            }
            return result;
        }
        catch (error) {
            this.logger.error('Error listing models with details', { error });
            throw error;
        }
    }
    /**
     * Save model configuration parameters
     * @param modelId ID of the model to configure
     * @param parameters Configuration parameters as a JSON string
     */
    async saveModelParameters(modelId, parameters) {
        try {
            // Verify that parameters is valid JSON
            try {
                JSON.parse(parameters);
            }
            catch (e) {
                throw new Error('Invalid JSON for model parameters');
            }
            const model = await this.db.updateModel(modelId, { parameters });
            this.logger.info(`Updated parameters for model ${modelId}`);
            return model;
        }
        catch (error) {
            this.logger.error(`Error saving model parameters for ${modelId}`, { error });
            throw error;
        }
    }
    /**
     * Get model configuration parameters
     * @param modelId ID of the model to get parameters for
     */
    async getModelParameters(modelId) {
        try {
            const model = await this.db.getModel(modelId);
            if (!model) {
                throw new Error(`Model with ID ${modelId} not found`);
            }
            // Parse and return the parameters
            if (model.parameters) {
                try {
                    return JSON.parse(model.parameters);
                }
                catch (e) {
                    this.logger.warn(`Invalid JSON in model parameters for ${modelId}`, { error: e });
                    return {};
                }
            }
            return {};
        }
        catch (error) {
            this.logger.error(`Error getting model parameters for ${modelId}`, { error });
            throw error;
        }
    }
    /**
     * Emit a model status update event
     * @param update Status update information
     */
    emitStatusUpdate(update) {
        this.emit('modelStatusUpdate', update);
        this.logger.debug('Emitted model status update', { update });
    }
}
//# sourceMappingURL=ModelManager.js.map