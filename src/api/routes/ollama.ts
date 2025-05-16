import { Router, Request, Response, RequestHandler } from 'express';
import { OllamaClient } from '../../services/ollama/client';
import { OllamaModelManager } from '../../services/ollama/model-manager';
import { prisma } from '../../services/database/client';
import { OllamaChatMessage } from '../../services/ollama/types';

interface ChatRequest {
  model: string;
  messages: OllamaChatMessage[];
  options?: Record<string, any>;
}

interface ModelParams {
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

const router = Router();
const ollamaClient = new OllamaClient();
const modelManager = new OllamaModelManager(prisma, ollamaClient);

// List all models (both available and installed)
const listModels: RequestHandler = async (_req, res): Promise<void> => {
  try {
    // Sync with Ollama first
    await modelManager.syncModels();
    
    // Get updated list
    const models = await modelManager.listModels();
    res.json({ models });
  } catch (error) {
    console.error('Error listing models:', error);
    res.status(500).json({ 
      error: error instanceof Error ? error.message : 'Unknown error'
    });
  }
};

// Get specific model details
const getModel: RequestHandler<ModelParams> = async (req, res): Promise<void> => {
  try {
    const model = await modelManager.getModel(req.params.name);
    if (!model) {
      res.status(404).json({ error: 'Model not found' });
      return;
    }
    res.json(model);
  } catch (error) {
    console.error('Error getting model:', error);
    res.status(500).json({ 
      error: error instanceof Error ? error.message : 'Unknown error'
    });
  }
};

// Pull a new model
const pullModel: RequestHandler<ModelParams> = async (req, res): Promise<void> => {
  try {
    await modelManager.pullModel(req.params.name);
    res.json({ message: 'Model pull started' });
  } catch (error) {
    console.error('Error pulling model:', error);
    res.status(500).json({ 
      error: error instanceof Error ? error.message : 'Unknown error'
    });
  }
};

// Update model configuration
const updateModelConfig: RequestHandler<ModelParams> = async (req, res): Promise<void> => {
  try {
    const config = await modelManager.updateModelConfiguration(
      req.params.name,
      req.body
    );
    res.json(config);
  } catch (error) {
    console.error('Error updating model config:', error);
    res.status(500).json({ 
      error: error instanceof Error ? error.message : 'Unknown error'
    });
  }
};

// Delete a model
const deleteModel: RequestHandler<ModelParams> = async (req, res): Promise<void> => {
  try {
    await modelManager.deleteModel(req.params.name);
    res.json({ message: 'Model deleted' });
  } catch (error) {
    console.error('Error deleting model:', error);
    res.status(500).json({ 
      error: error instanceof Error ? error.message : 'Unknown error'
    });
  }
};

// Chat with a model
const chat: RequestHandler<{}, any, ChatRequest> = async (req, res): Promise<void> => {
  try {
    const { model, messages, options } = req.body;

    if (!model || !messages) {
      res.status(400).json({ 
        error: 'Missing required fields: model and messages' 
      });
      return;
    }

    // Get model configuration
    const modelData = await modelManager.getModel(model);
    if (!modelData) {
      res.status(404).json({ error: 'Model not found' });
      return;
    }

    // Clean and merge configurations
    const defaultConfig = cleanConfig(modelData.configuration);
    const mergedOptions = {
      ...defaultConfig,
      ...options
    };

    // Start chat
    const response = await ollamaClient.chat({
      model,
      messages,
      options: mergedOptions
    });

    res.json(response);
  } catch (error) {
    console.error('Error in chat:', error);
    res.status(500).json({ 
      error: error instanceof Error ? error.message : 'Unknown error'
    });
  }
};

// Stream chat with a model
const chatStream: RequestHandler<{}, any, ChatRequest> = async (req, res): Promise<void> => {
  try {
    const { model, messages, options } = req.body;

    if (!model || !messages) {
      res.status(400).json({ 
        error: 'Missing required fields: model and messages' 
      });
      return;
    }

    // Get model configuration
    const modelData = await modelManager.getModel(model);
    if (!modelData) {
      res.status(404).json({ error: 'Model not found' });
      return;
    }

    // Clean and merge configurations
    const defaultConfig = cleanConfig(modelData.configuration);
    const mergedOptions = {
      ...defaultConfig,
      ...options
    };

    // Set up SSE
    res.setHeader('Content-Type', 'text/event-stream');
    res.setHeader('Cache-Control', 'no-cache');
    res.setHeader('Connection', 'keep-alive');

    // Start streaming
    try {
      for await (const chunk of ollamaClient.chatStream({
        model,
        messages,
        options: mergedOptions
      })) {
        res.write(`data: ${JSON.stringify(chunk)}\n\n`);
      }
    } finally {
      res.end();
    }
  } catch (error) {
    console.error('Error in chat stream:', error);
    if (!res.headersSent) {
      res.status(500).json({ 
        error: error instanceof Error ? error.message : 'Unknown error'
      });
    }
  }
};

// Register routes
router.get('/', listModels);
router.get('/:name', getModel);
router.post('/:name/pull', pullModel);
router.put('/:name/config', updateModelConfig);
router.delete('/:name', deleteModel);
router.post('/chat', chat);
router.post('/chat/stream', chatStream);

export default router; 