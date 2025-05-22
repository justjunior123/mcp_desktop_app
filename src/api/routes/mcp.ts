import express, { Request, Response, Router, RequestHandler } from 'express';
import { OllamaClient } from '../../services/ollama/client';
import { OllamaModelManager } from '../../services/ollama/model-manager';
import { prisma } from '../../services/database/client';
import { OllamaChatMessage } from '../../services/ollama/types';

// Types
interface ModelParams {
  id: string;
}

interface ToolParams {
  id: string;
}

interface PromptParams {
  id: string;
}

interface ServerParams {
  id: string;
}

// Helper function to serialize BigInt values
function serializeBigInt(obj: any): any {
  if (obj === null || obj === undefined) return obj;
  if (typeof obj === 'bigint') return obj.toString();
  if (Array.isArray(obj)) return obj.map(serializeBigInt);
  if (typeof obj === 'object') {
    return Object.fromEntries(
      Object.entries(obj).map(([key, value]) => [key, serializeBigInt(value)])
    );
  }
  return obj;
}

const router: Router = express.Router();
const ollamaClient = new OllamaClient();
const modelManager = new OllamaModelManager(prisma, ollamaClient);

// Models Resource
const listModelsHandler: RequestHandler = async (req, res) => {
  try {
    const models = await modelManager.listModels();
    res.json({ data: models });
  } catch (error) {
    console.error('Error listing models:', error);
    res.status(500).json({ 
      error: {
        code: 'INTERNAL_ERROR',
        message: error instanceof Error ? error.message : 'Unknown error'
      }
    });
  }
};

router.get('/models', listModelsHandler);

router.get('/models/:id', async (req: Request<ModelParams>, res: Response) => {
  try {
    const model = await modelManager.getModel(req.params.id);
    if (!model) {
      res.status(404).json({ 
        error: {
          code: 'NOT_FOUND',
          message: 'Model not found'
        }
      });
      return;
    }
    res.json({ data: serializeBigInt(model) });
  } catch (error) {
    console.error('Error getting model:', error);
    res.status(500).json({ 
      error: {
        code: 'INTERNAL_ERROR',
        message: error instanceof Error ? error.message : 'Unknown error'
      }
    });
  }
});

router.post('/models', async (req: Request, res: Response) => {
  try {
    const { name, configuration } = req.body;
    if (!name) {
      res.status(400).json({ 
        error: {
          code: 'INVALID_REQUEST',
          message: 'Model name is required'
        }
      });
      return;
    }
    await modelManager.pullModel(name);
    res.status(201).json({ 
      data: { 
        message: 'Model pull started',
        name 
      }
    });
  } catch (error) {
    res.status(500).json({ error: { code: 'INTERNAL_ERROR', message: error instanceof Error ? error.message : String(error) } });
  }
});

router.put('/models/:id', async (req: Request<ModelParams>, res: Response) => {
  try {
    const config = await modelManager.updateModel(
      req.params.id,
      req.body
    );
    res.json({ data: serializeBigInt(config) });
  } catch (error) {
    console.error('Error updating model:', error);
    res.status(500).json({ 
      error: {
        code: 'INTERNAL_ERROR',
        message: error instanceof Error ? error.message : 'Unknown error'
      }
    });
  }
});

router.delete('/models/:id', async (req: Request<ModelParams>, res: Response) => {
  try {
    await modelManager.deleteModel(req.params.id);
    res.status(204).send();
  } catch (error) {
    console.error('Error deleting model:', error);
    res.status(500).json({ 
      error: {
        code: 'INTERNAL_ERROR',
        message: error instanceof Error ? error.message : 'Unknown error'
      }
    });
  }
});

// Tools Resource
router.get('/tools', async (req: Request, res: Response) => {
  try {
    // TODO: Implement tools listing
    res.json({ data: [] });
  } catch (error) {
    console.error('Error listing tools:', error);
    res.status(500).json({ 
      error: {
        code: 'INTERNAL_ERROR',
        message: error instanceof Error ? error.message : 'Unknown error'
      }
    });
  }
});

router.get('/tools/:id', async (req: Request<ToolParams>, res: Response) => {
  try {
    // TODO: Implement tool details
    res.status(404).json({ 
      error: {
        code: 'NOT_FOUND',
        message: 'Tool not found'
      }
    });
  } catch (error) {
    console.error('Error getting tool:', error);
    res.status(500).json({ 
      error: {
        code: 'INTERNAL_ERROR',
        message: error instanceof Error ? error.message : 'Unknown error'
      }
    });
  }
});

// Prompts Resource
router.get('/prompts', async (req: Request, res: Response) => {
  try {
    // TODO: Implement prompts listing
    res.json({ data: [] });
  } catch (error) {
    console.error('Error listing prompts:', error);
    res.status(500).json({ 
      error: {
        code: 'INTERNAL_ERROR',
        message: error instanceof Error ? error.message : 'Unknown error'
      }
    });
  }
});

router.get('/prompts/:id', async (req: Request<PromptParams>, res: Response) => {
  try {
    // TODO: Implement prompt details
    res.status(404).json({ 
      error: {
        code: 'NOT_FOUND',
        message: 'Prompt not found'
      }
    });
  } catch (error) {
    console.error('Error getting prompt:', error);
    res.status(500).json({ 
      error: {
        code: 'INTERNAL_ERROR',
        message: error instanceof Error ? error.message : 'Unknown error'
      }
    });
  }
});

// Chat/Inference Endpoints
router.post('/models/:id/chat', async (req: Request<ModelParams>, res: Response) => {
  try {
    const { messages, options } = req.body;
    if (!messages) {
      res.status(400).json({ 
        error: {
          code: 'INVALID_REQUEST',
          message: 'Messages are required'
        }
      });
      return;
    }

    const modelData = await modelManager.getModel(req.params.id);
    if (!modelData) {
      res.status(404).json({ 
        error: {
          code: 'NOT_FOUND',
          message: 'Model not found'
        }
      });
      return;
    }

    const response = await ollamaClient.chat({
      model: req.params.id,
      messages,
      options: {
        ...modelData.configuration,
        ...options
      }
    });

    res.json({ data: response });
  } catch (error) {
    console.error('Error in chat:', error);
    res.status(500).json({ 
      error: {
        code: 'INTERNAL_ERROR',
        message: error instanceof Error ? error.message : 'Unknown error'
      }
    });
  }
});

router.post('/models/:id/chat/stream', async (req: Request<ModelParams>, res: Response) => {
  try {
    const { messages, options } = req.body;
    if (!messages) {
      res.status(400).json({ 
        error: {
          code: 'INVALID_REQUEST',
          message: 'Messages are required'
        }
      });
      return;
    }

    const modelData = await modelManager.getModel(req.params.id);
    if (!modelData) {
      res.status(404).json({ 
        error: {
          code: 'NOT_FOUND',
          message: 'Model not found'
        }
      });
      return;
    }

    res.setHeader('Content-Type', 'text/event-stream');
    res.setHeader('Cache-Control', 'no-cache');
    res.setHeader('Connection', 'keep-alive');

    try {
      for await (const chunk of ollamaClient.chatStream({
        model: req.params.id,
        messages,
        options: {
          ...modelData.configuration,
          ...options
        }
      })) {
        res.write(`data: ${JSON.stringify({ data: chunk })}\n\n`);
      }
    } finally {
      res.end();
    }
  } catch (error) {
    console.error('Error in chat stream:', error);
    if (!res.headersSent) {
      res.status(500).json({ 
        error: {
          code: 'INTERNAL_ERROR',
          message: error instanceof Error ? error.message : 'Unknown error'
        }
      });
    }
  }
});

export default router; 