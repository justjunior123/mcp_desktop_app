import express from 'express';
import { logger } from '../logging';
/**
 * Express controller for model management API endpoints
 */
export class ModelController {
    /**
     * Create a new model controller
     * @param modelManager Model manager to use for operations
     */
    constructor(modelManager) {
        this.logger = logger.withCategory('model-controller');
        this.router = express.Router();
        this.modelManager = modelManager;
        this.setupRoutes();
        this.logger.info('ModelController initialized');
    }
    /**
     * Set up API routes
     */
    setupRoutes() {
        // Get all models
        this.router.get('/models', this.handleGetModels.bind(this));
        // Get a specific model by ID
        this.router.get('/models/:id', this.handleGetModel.bind(this));
        // Pull a model from Ollama
        this.router.post('/models/pull', this.handlePullModel.bind(this));
        // Delete a model
        this.router.delete('/models/:id', this.handleDeleteModel.bind(this));
        // Update model parameters
        this.router.put('/models/:id/parameters', this.handleUpdateParameters.bind(this));
        // Get model parameters
        this.router.get('/models/:id/parameters', this.handleGetParameters.bind(this));
        // Refresh model status
        this.router.post('/models/refresh', this.handleRefreshModels.bind(this));
    }
    /**
     * Handle GET /models - List all models with details
     */
    async handleGetModels(req, res, next) {
        try {
            const models = await this.modelManager.listModelsWithDetails();
            res.json({ models });
        }
        catch (error) {
            next(error);
        }
    }
    /**
     * Handle GET /models/:id - Get a specific model with details
     */
    async handleGetModel(req, res, next) {
        try {
            const modelId = req.params.id;
            const model = await this.modelManager.getModelWithDetails(modelId);
            res.json({ model });
        }
        catch (error) {
            if (error instanceof Error && error.message.includes('not found')) {
                res.status(404).json({ error: `Model with ID ${req.params.id} not found` });
            }
            else {
                next(error);
            }
        }
    }
    /**
     * Handle POST /models/pull - Pull a model from Ollama
     */
    async handlePullModel(req, res, next) {
        try {
            const { modelName } = req.body;
            // Validate model name
            if (!modelName || typeof modelName !== 'string') {
                res.status(400).json({ error: 'Model name is required' });
                return;
            }
            // Start the pull process
            const model = await this.modelManager.pullModel(modelName);
            // Return immediate response with model info
            res.status(202).json({
                model,
                message: `Started pulling model: ${modelName}`
            });
        }
        catch (error) {
            next(error);
        }
    }
    /**
     * Handle DELETE /models/:id - Delete a model
     */
    async handleDeleteModel(req, res, next) {
        try {
            const modelId = req.params.id;
            await this.modelManager.deleteModel(modelId);
            res.json({
                success: true,
                message: `Model ${modelId} deleted`
            });
        }
        catch (error) {
            if (error instanceof Error && error.message.includes('not found')) {
                res.status(404).json({ error: `Model with ID ${req.params.id} not found` });
            }
            else {
                next(error);
            }
        }
    }
    /**
     * Handle PUT /models/:id/parameters - Update model parameters
     */
    async handleUpdateParameters(req, res, next) {
        try {
            const modelId = req.params.id;
            const { parameters } = req.body;
            // Validate parameters
            if (!parameters || typeof parameters !== 'string') {
                res.status(400).json({ error: 'Parameters are required and must be a JSON string' });
                return;
            }
            // Try to parse the parameters to validate JSON
            try {
                JSON.parse(parameters);
            }
            catch (e) {
                res.status(400).json({ error: 'Parameters must be valid JSON' });
                return;
            }
            // Update the parameters
            const model = await this.modelManager.saveModelParameters(modelId, parameters);
            res.json({
                success: true,
                model
            });
        }
        catch (error) {
            if (error instanceof Error && error.message.includes('not found')) {
                res.status(404).json({ error: `Model with ID ${req.params.id} not found` });
            }
            else if (error instanceof Error && error.message.includes('Invalid JSON')) {
                res.status(400).json({ error: error.message });
            }
            else {
                next(error);
            }
        }
    }
    /**
     * Handle GET /models/:id/parameters - Get model parameters
     */
    async handleGetParameters(req, res, next) {
        try {
            const modelId = req.params.id;
            const parameters = await this.modelManager.getModelParameters(modelId);
            res.json({ parameters });
        }
        catch (error) {
            if (error instanceof Error && error.message.includes('not found')) {
                res.status(404).json({ error: `Model with ID ${req.params.id} not found` });
            }
            else {
                next(error);
            }
        }
    }
    /**
     * Handle POST /models/refresh - Refresh model statuses
     */
    async handleRefreshModels(req, res, next) {
        try {
            await this.modelManager.refreshModelStatuses();
            const models = await this.modelManager.listModelsWithDetails();
            res.json({
                success: true,
                models
            });
        }
        catch (error) {
            next(error);
        }
    }
    /**
     * Get the router for mounting
     */
    getRouter() {
        return this.router;
    }
}
//# sourceMappingURL=ModelController.js.map