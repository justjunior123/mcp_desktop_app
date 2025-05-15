import express, { Request, Response, NextFunction, Router } from 'express';
import { ModelManager } from './ModelManager';
import { logger } from '../logging';

/**
 * Express controller for model management API endpoints
 */
export class ModelController {
  private router: Router;
  private modelManager: ModelManager;
  private logger = logger.withCategory('model-controller');

  /**
   * Create a new model controller
   * @param modelManager Model manager to use for operations
   */
  constructor(modelManager: ModelManager) {
    this.router = express.Router();
    this.modelManager = modelManager;
    this.setupRoutes();
    this.logger.info('ModelController initialized');
  }

  /**
   * Set up API routes
   */
  private setupRoutes(): void {
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
  private async handleGetModels(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const models = await this.modelManager.listModelsWithDetails();
      res.json({ models });
    } catch (error) {
      next(error);
    }
  }

  /**
   * Handle GET /models/:id - Get a specific model with details
   */
  private async handleGetModel(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const modelId = req.params.id;
      const model = await this.modelManager.getModelWithDetails(modelId);
      res.json({ model });
    } catch (error) {
      if (error instanceof Error && error.message.includes('not found')) {
        res.status(404).json({ error: `Model with ID ${req.params.id} not found` });
      } else {
        next(error);
      }
    }
  }

  /**
   * Handle POST /models/pull - Pull a model from Ollama
   */
  private async handlePullModel(req: Request, res: Response, next: NextFunction): Promise<void> {
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
    } catch (error) {
      next(error);
    }
  }

  /**
   * Handle DELETE /models/:id - Delete a model
   */
  private async handleDeleteModel(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const modelId = req.params.id;
      await this.modelManager.deleteModel(modelId);
      
      res.json({ 
        success: true,
        message: `Model ${modelId} deleted`
      });
    } catch (error) {
      if (error instanceof Error && error.message.includes('not found')) {
        res.status(404).json({ error: `Model with ID ${req.params.id} not found` });
      } else {
        next(error);
      }
    }
  }

  /**
   * Handle PUT /models/:id/parameters - Update model parameters
   */
  private async handleUpdateParameters(req: Request, res: Response, next: NextFunction): Promise<void> {
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
      } catch (e) {
        res.status(400).json({ error: 'Parameters must be valid JSON' });
        return;
      }
      
      // Update the parameters
      const model = await this.modelManager.saveModelParameters(modelId, parameters);
      
      res.json({ 
        success: true,
        model
      });
    } catch (error) {
      if (error instanceof Error && error.message.includes('not found')) {
        res.status(404).json({ error: `Model with ID ${req.params.id} not found` });
      } else if (error instanceof Error && error.message.includes('Invalid JSON')) {
        res.status(400).json({ error: error.message });
      } else {
        next(error);
      }
    }
  }

  /**
   * Handle GET /models/:id/parameters - Get model parameters
   */
  private async handleGetParameters(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const modelId = req.params.id;
      const parameters = await this.modelManager.getModelParameters(modelId);
      
      res.json({ parameters });
    } catch (error) {
      if (error instanceof Error && error.message.includes('not found')) {
        res.status(404).json({ error: `Model with ID ${req.params.id} not found` });
      } else {
        next(error);
      }
    }
  }

  /**
   * Handle POST /models/refresh - Refresh model statuses
   */
  private async handleRefreshModels(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      await this.modelManager.refreshModelStatuses();
      const models = await this.modelManager.listModelsWithDetails();
      
      res.json({ 
        success: true,
        models
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * Get the router for mounting
   */
  public getRouter(): Router {
    return this.router;
  }
} 