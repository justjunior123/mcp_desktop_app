import { Router, Request, Response, RequestHandler } from 'express';
import { OllamaClient } from '../../services/ollama/client';
import { OllamaModelManager } from '../../services/ollama/model-manager';
import { prisma } from '../../services/database/client';
import { OllamaChatMessage } from '../../services/ollama/types';
import { 
  APILogger, 
  createRequestLogger, 
  createErrorResponse, 
  createSuccessResponse, 
  APIErrorCode, 
  RequestWithCorrelationId 
} from '../../lib/api-logger';
import {
  validateChatRequest,
  validateModelParams,
  validateModelConfigUpdate,
  sanitizeRequestMiddleware,
  ChatRequest,
  ModelParams,
  ModelConfigUpdate
} from '../../lib/validation';
import {
  chatRateLimit,
  modelOperationsRateLimit,
  timeoutMiddleware,
  securityAuditLogger
} from '../../lib/security';
import { OllamaError } from '../../services/ollama/errors';
import { ModelNotFoundError } from '../../services/ollama/errors';

// Types are now imported from validation module
interface LegacyChatRequest {
  model: string;
  messages: OllamaChatMessage[];
  options?: Record<string, any>;
}

interface LegacyModelParams {
  name: string;
}

// Helper function to clean configuration
function cleanConfig(config: Record<string, any> | null | undefined): Record<string, any> {
  if (!config) return {};
  return Object.entries(config).reduce((acc, [key, value]) => {
    // Skip null values and internal fields
    if (value !== null && !['id', 'modelId', 'createdAt', 'updatedAt'].includes(key)) {
      // Convert snake_case to camelCase for API compatibility
      const apiKey = key === 'topP' ? 'top_p' : 
                    key === 'topK' ? 'top_k' : 
                    key === 'repeatPenalty' ? 'repeat_penalty' :
                    key;
      acc[apiKey] = value;
    }
    return acc;
  }, {} as Record<string, any>);
}

// Helper function to serialize BigInt values
function serializeBigInt(obj: any): any {
  if (obj === null || obj === undefined) {
    return obj;
  }
  
  if (typeof obj === 'bigint') {
    return obj.toString(); // Convert to string instead of Number to preserve precision
  }
  
  if (Array.isArray(obj)) {
    return obj.map(serializeBigInt);
  }
  
  if (typeof obj === 'object') {
    return Object.fromEntries(
      Object.entries(obj).map(([key, value]) => [key, serializeBigInt(value)])
    );
  }
  
  return obj;
}

// Helper function to serialize model data
function serializeModel(model: any) {
  if (!model) return null;
  return serializeBigInt(model);
}

const router = Router();
const ollamaClient = new OllamaClient();
const modelManager = new OllamaModelManager(prisma, ollamaClient);

// List all models (both available and installed)
const listModels: RequestHandler = async (req: RequestWithCorrelationId, res): Promise<void> => {
  const logger = createRequestLogger(req);
  const timer = logger.time('listModels');
  
  try {
    logger.info('Listing models request started');
    
    // Sync with Ollama first
    await modelManager.syncModels();
    
    // Get updated list
    const models = await modelManager.listModels();
    if (!models) {
      throw new OllamaError('Failed to retrieve models from model manager');
    }
    
    // Serialize models before sending response
    const serializedModels = models.map(serializeModel);
    
    logger.info('Models listed successfully', { 
      modelCount: serializedModels.length,
      modelNames: serializedModels.map(m => m?.name).filter(Boolean)
    });
    
    res.json(createSuccessResponse(
      { models: serializedModels },
      req.correlationId
    ));
  } catch (error) {
    logger.error('Failed to list models', error, {
      errorType: error instanceof OllamaError ? 'OllamaError' : 'UnknownError'
    });
    
    const statusCode = error instanceof OllamaError && error.status ? error.status : 500;
    const errorCode = error instanceof OllamaError ? APIErrorCode.OLLAMA_SERVICE_UNAVAILABLE : APIErrorCode.INTERNAL_SERVER_ERROR;
    
    res.status(statusCode).json(createErrorResponse(
      errorCode,
      error instanceof Error ? error.message : 'Failed to retrieve models',
      { operation: 'listModels' },
      req.correlationId
    ));
  } finally {
    timer();
  }
};

// Get specific model details
const getModel: RequestHandler<ModelParams> = async (req: RequestWithCorrelationId, res): Promise<void> => {
  const logger = createRequestLogger(req).withContext({ modelName: req.params.name });
  const timer = logger.time('getModel');
  
  try {
    logger.info('Getting model details', { modelName: req.params.name });
    
    const model = await modelManager.getModel(req.params.name);
    if (!model) {
      logger.warn('Model not found', { modelName: req.params.name });
      res.status(404).json(createErrorResponse(
        APIErrorCode.MODEL_NOT_FOUND,
        `Model '${req.params.name}' not found`,
        { modelName: req.params.name },
        req.correlationId
      ));
      return;
    }
    
    logger.info('Model details retrieved successfully', { 
      modelName: req.params.name,
      modelStatus: model.status
    });
    
    res.json(createSuccessResponse(
      serializeModel(model),
      req.correlationId
    ));
  } catch (error) {
    logger.error('Failed to get model details', error, { modelName: req.params.name });
    
    if (error instanceof Error && error.message.includes('Model not found')) {
      res.status(404).json(createErrorResponse(
        APIErrorCode.MODEL_NOT_FOUND,
        `Model '${req.params.name}' not found`,
        { modelName: req.params.name },
        req.correlationId
      ));
    } else if (error instanceof Error && error.message.includes('Ollama service')) {
      res.status(503).json(createErrorResponse(
        APIErrorCode.OLLAMA_SERVICE_UNAVAILABLE,
        'Ollama service is not available',
        { modelName: req.params.name },
        req.correlationId
      ));
    } else {
      res.status(500).json(createErrorResponse(
        APIErrorCode.INTERNAL_SERVER_ERROR,
        error instanceof Error ? error.message : 'Failed to retrieve model details',
        { modelName: req.params.name },
        req.correlationId
      ));
    }
  } finally {
    timer();
  }
};

// Pull a new model
const pullModel: RequestHandler<ModelParams> = async (req: RequestWithCorrelationId, res): Promise<void> => {
  const logger = createRequestLogger(req).withContext({ modelName: req.params.name });
  const timer = logger.time('pullModel');
  const startTime = Date.now();
  
  try {
    logger.modelOperation('pull_start', req.params.name);
    
    // Set up SSE headers
    res.setHeader('Content-Type', 'text/event-stream');
    res.setHeader('Cache-Control', 'no-cache');
    res.setHeader('Connection', 'keep-alive');
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('X-Correlation-ID', req.correlationId || '');

    // Handle client disconnect
    const cleanup = () => {
      const duration = Date.now() - startTime;
      logger.warn('Client disconnected during model pull', { 
        modelName: req.params.name,
        duration
      });
    };
    
    req.on('close', cleanup);
    req.on('aborted', cleanup);

    // Start the model pull with progress updates
    await modelManager.pullModel(req.params.name, (status, progress) => {
      if (res.destroyed || req.destroyed) {
        logger.warn('Client disconnected during pull progress', { 
          modelName: req.params.name,
          status,
          progress
        });
        return;
      }
      
      logger.debug('Pull progress update', { 
        modelName: req.params.name,
        status,
        progress
      });
      
      res.write(`data: ${JSON.stringify({ status, progress })}\n\n`);
    });

    // Send final success message
    res.write(`data: ${JSON.stringify({ 
      status: 'complete',
      correlationId: req.correlationId,
      timestamp: new Date().toISOString()
    })}\n\n`);
    res.end();
    
    const duration = Date.now() - startTime;
    logger.modelOperation('pull_complete', req.params.name, { 
      duration: `${duration}ms`,
      success: true
    });
  } catch (error) {
    const duration = Date.now() - startTime;
    logger.error('Model pull failed', error, { 
      modelName: req.params.name,
      duration
    });
    
    const errorData = {
      status: 'error',
      error: {
        code: error instanceof OllamaError ? APIErrorCode.OLLAMA_REQUEST_FAILED : APIErrorCode.INTERNAL_SERVER_ERROR,
        message: error instanceof Error ? error.message : 'Unknown error',
        correlationId: req.correlationId,
        timestamp: new Date().toISOString()
      }
    };
    
    res.write(`data: ${JSON.stringify(errorData)}\n\n`);
    res.end();
  } finally {
    timer();
  }
};

// Update model configuration
const updateModelConfig: RequestHandler<ModelParams> = async (req: RequestWithCorrelationId, res): Promise<void> => {
  const logger = createRequestLogger(req).withContext({ modelName: req.params.name });
  const timer = logger.time('updateModelConfig');
  
  try {
    logger.modelOperation('config_update_start', req.params.name, {
      configKeys: Object.keys(req.body)
    });
    
    const config = await modelManager.updateModel(
      req.params.name,
      req.body
    );
    
    logger.modelOperation('config_update_complete', req.params.name, {
      success: true,
      configKeys: Object.keys(req.body)
    });
    
    res.json(createSuccessResponse(config, req.correlationId));
  } catch (error) {
    logger.error('Failed to update model configuration', error, {
      modelName: req.params.name,
      configKeys: Object.keys(req.body)
    });
    
    if (error instanceof Error && error.message.includes('Model not found')) {
      res.status(404).json(createErrorResponse(
        APIErrorCode.MODEL_NOT_FOUND,
        `Model '${req.params.name}' not found`,
        { modelName: req.params.name },
        req.correlationId
      ));
    } else {
      res.status(500).json(createErrorResponse(
        APIErrorCode.INTERNAL_SERVER_ERROR,
        error instanceof Error ? error.message : 'Failed to update model configuration',
        { modelName: req.params.name },
        req.correlationId
      ));
    }
  } finally {
    timer();
  }
};

// Delete a model
const deleteModel: RequestHandler<ModelParams> = async (req: RequestWithCorrelationId, res): Promise<void> => {
  const logger = createRequestLogger(req).withContext({ modelName: req.params.name });
  const timer = logger.time('deleteModel');
  
  try {
    logger.modelOperation('delete_start', req.params.name);
    
    await modelManager.deleteModel(req.params.name);
    
    logger.modelOperation('delete_complete', req.params.name, { success: true });
    
    res.json(createSuccessResponse(
      { 
        message: `Model '${req.params.name}' deleted successfully`,
        modelName: req.params.name
      },
      req.correlationId
    ));
  } catch (error) {
    logger.error('Failed to delete model', error, { modelName: req.params.name });
    
    if (error instanceof Error && error.message.includes('not found')) {
      res.status(404).json(createErrorResponse(
        APIErrorCode.MODEL_NOT_FOUND,
        `Model '${req.params.name}' not found`,
        { modelName: req.params.name },
        req.correlationId
      ));
    } else {
      res.status(500).json(createErrorResponse(
        APIErrorCode.INTERNAL_SERVER_ERROR,
        error instanceof Error ? error.message : 'Failed to delete model',
        { modelName: req.params.name },
        req.correlationId
      ));
    }
  } finally {
    timer();
  }
};

// Chat with a model
const chat: RequestHandler<{}, any, ChatRequest> = async (req: RequestWithCorrelationId, res): Promise<void> => {
  const logger = createRequestLogger(req).withContext({ 
    modelName: req.body.model,
    messageCount: req.body.messages?.length || 0
  });
  const timer = logger.time('chat');
  const startTime = Date.now();
  
  try {
    const { model, messages, options } = req.body;

    logger.chatRequest(model, messages.length, { 
      hasOptions: !!options,
      optionKeys: options ? Object.keys(options) : []
    });

    // Get model configuration
    const modelData = await modelManager.getModel(model);
    if (!modelData) {
      logger.warn('Model not found for chat request', { modelName: model });
      res.status(404).json(createErrorResponse(
        APIErrorCode.MODEL_NOT_FOUND,
        `Model '${model}' not found`,
        { modelName: model },
        req.correlationId
      ));
      return;
    }

    // Check model status
    if (modelData.status !== 'READY' && modelData.status !== 'ready') {
      logger.warn('Model not ready for chat', { 
        modelName: model, 
        status: modelData.status 
      });
      res.status(409).json(createErrorResponse(
        APIErrorCode.MODEL_NOT_READY,
        `Model '${model}' is not ready for chat (status: ${modelData.status})`,
        { modelName: model, status: modelData.status },
        req.correlationId
      ));
      return;
    }

    // Clean and merge configurations
    const defaultConfig = cleanConfig(modelData.configuration);
    const mergedOptions = {
      ...defaultConfig,
      ...options
    };

    logger.debug('Starting chat with merged options', { 
      modelName: model,
      configKeys: Object.keys(mergedOptions)
    });

    // Start chat
    const response = await ollamaClient.chat({
      model,
      messages,
      options: mergedOptions
    });

    const duration = Date.now() - startTime;
    const responseLength = response?.message?.content?.length || 0;
    
    logger.chatResponse(model, responseLength, duration, {
      responseModel: response?.model,
      isDone: response?.done
    });

    res.json(createSuccessResponse(response, req.correlationId));
  } catch (error) {
    const duration = Date.now() - startTime;
    logger.chatError(req.body.model, error, { duration });
    
    if (error instanceof OllamaError) {
      const statusCode = error.status || 500;
      let errorCode = APIErrorCode.OLLAMA_REQUEST_FAILED;
      
      if (error.message.includes('timeout')) {
        errorCode = APIErrorCode.OLLAMA_TIMEOUT;
      } else if (error.message.includes('connection') || error.message.includes('ECONNREFUSED')) {
        errorCode = APIErrorCode.OLLAMA_SERVICE_UNAVAILABLE;
      }
      
      res.status(statusCode).json(createErrorResponse(
        errorCode,
        error.message,
        { modelName: req.body.model, duration },
        req.correlationId
      ));
    } else if (error instanceof ModelNotFoundError) {
      res.status(404).json(createErrorResponse(
        APIErrorCode.MODEL_NOT_FOUND,
        error.message,
        { modelName: req.body.model, duration },
        req.correlationId
      ));
    } else {
      res.status(500).json(createErrorResponse(
        APIErrorCode.INTERNAL_SERVER_ERROR,
        error instanceof Error ? error.message : 'Chat request failed',
        { modelName: req.body.model, duration },
        req.correlationId
      ));
    }
  } finally {
    timer();
  }
};

// Stream chat with a model
const chatStream: RequestHandler<{}, any, ChatRequest> = async (req: RequestWithCorrelationId, res): Promise<void> => {
  const logger = createRequestLogger(req).withContext({ 
    modelName: req.body.model,
    messageCount: req.body.messages?.length || 0
  });
  const timer = logger.time('chatStream');
  const startTime = Date.now();
  let chunkCount = 0;
  let totalResponseLength = 0;
  
  try {
    const { model, messages, options } = req.body;

    logger.streamStart(model, { 
      messageCount: messages.length,
      hasOptions: !!options
    });

    // Get model configuration
    const modelData = await modelManager.getModel(model);
    if (!modelData) {
      logger.warn('Model not found for stream request', { modelName: model });
      res.status(404).json(createErrorResponse(
        APIErrorCode.MODEL_NOT_FOUND,
        `Model '${model}' not found`,
        { modelName: model },
        req.correlationId
      ));
      return;
    }

    // Check model status
    if (modelData.status !== 'READY' && modelData.status !== 'ready') {
      logger.warn('Model not ready for streaming', { 
        modelName: model, 
        status: modelData.status 
      });
      res.status(409).json(createErrorResponse(
        APIErrorCode.MODEL_NOT_READY,
        `Model '${model}' is not ready for streaming (status: ${modelData.status})`,
        { modelName: model, status: modelData.status },
        req.correlationId
      ));
      return;
    }

    // Clean and merge configurations
    const defaultConfig = cleanConfig(modelData.configuration);
    const mergedOptions = {
      ...defaultConfig,
      ...options
    };

    // Set up SSE headers
    res.setHeader('Content-Type', 'text/event-stream');
    res.setHeader('Cache-Control', 'no-cache');
    res.setHeader('Connection', 'keep-alive');
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Headers', 'Cache-Control');
    res.setHeader('X-Correlation-ID', req.correlationId || '');

    // Handle client disconnect
    const cleanup = () => {
      const duration = Date.now() - startTime;
      logger.streamEnd(model, chunkCount, duration, {
        totalResponseLength,
        disconnected: true
      });
    };
    
    req.on('close', cleanup);
    req.on('aborted', cleanup);

    // Start streaming
    try {
      for await (const chunk of ollamaClient.chatStream({
        model,
        messages,
        options: mergedOptions
      })) {
        if (res.destroyed || req.destroyed) {
          logger.warn('Client disconnected during stream', { 
            modelName: model, 
            chunkCount 
          });
          break;
        }
        
        const chunkData = JSON.stringify(chunk);
        const chunkSize = chunkData.length;
        
        res.write(`data: ${chunkData}\n\n`);
        
        chunkCount++;
        totalResponseLength += chunk.message?.content?.length || 0;
        
        // Log every 10 chunks to avoid spam
        if (chunkCount % 10 === 0) {
          logger.streamChunk(model, chunkSize, { 
            chunkCount, 
            totalResponseLength 
          });
        }
      }
      
      // Send completion marker
      res.write(`data: ${JSON.stringify({ done: true })}\n\n`);
    } finally {
      if (!res.destroyed) {
        res.end();
      }
    }
    
    const duration = Date.now() - startTime;
    logger.streamEnd(model, chunkCount, duration, { 
      totalResponseLength,
      completed: true
    });
    
  } catch (error) {
    const duration = Date.now() - startTime;
    logger.streamError(req.body.model, error, { 
      duration, 
      chunkCount, 
      totalResponseLength 
    });
    
    if (!res.headersSent) {
      if (error instanceof OllamaError) {
        const statusCode = error.status || 500;
        let errorCode = APIErrorCode.OLLAMA_REQUEST_FAILED;
        
        if (error.message.includes('timeout')) {
          errorCode = APIErrorCode.OLLAMA_TIMEOUT;
        } else if (error.message.includes('connection')) {
          errorCode = APIErrorCode.OLLAMA_SERVICE_UNAVAILABLE;
        }
        
        res.status(statusCode).json(createErrorResponse(
          errorCode,
          error.message,
          { modelName: req.body.model, streaming: true },
          req.correlationId
        ));
      } else {
        res.status(500).json(createErrorResponse(
          APIErrorCode.INTERNAL_SERVER_ERROR,
          error instanceof Error ? error.message : 'Stream request failed',
          { modelName: req.body.model, streaming: true },
          req.correlationId
        ));
      }
    } else {
      // If headers already sent, send error as SSE
      const errorData = {
        error: {
          code: APIErrorCode.INTERNAL_SERVER_ERROR,
          message: error instanceof Error ? error.message : 'Stream error',
          correlationId: req.correlationId
        }
      };
      res.write(`data: ${JSON.stringify(errorData)}\n\n`);
      res.end();
    }
  } finally {
    timer();
  }
};

// Apply security middleware
router.use(timeoutMiddleware(60000)); // 60 second timeout
router.use(securityAuditLogger);
router.use(sanitizeRequestMiddleware);

// Register routes with appropriate middleware
router.get('/models', listModels);
router.get('/models/:name', validateModelParams, getModel);
router.post('/models/:name/pull', modelOperationsRateLimit, validateModelParams, pullModel);
router.put('/models/:name/config', validateModelParams, validateModelConfigUpdate, updateModelConfig);
router.delete('/models/:name', modelOperationsRateLimit, validateModelParams, deleteModel);
router.post('/chat', chatRateLimit, validateChatRequest, chat);
router.post('/chat/stream', chatRateLimit, validateChatRequest, chatStream);

export default router; 