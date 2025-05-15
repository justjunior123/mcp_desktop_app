import { NextRequest, NextResponse } from 'next/server';
import { ModelManager } from '@/services/ollama/ModelManager';
import { DatabaseService } from '@/services/database/DatabaseService';
import { OllamaService } from '@/services/ollama/OllamaService';
import { logger } from '@/services/logging';
import { z } from 'zod';

const modelManager = new ModelManager(
  new DatabaseService(),
  new OllamaService()
);

// Input validation schemas
const postModelSchema = z.object({
  modelName: z.string().min(1, 'Model name is required')
});

// Error response helper
function handleError(error: unknown, context: string) {
  const errorObj = {
    message: error instanceof Error ? error.message : String(error),
    stack: error instanceof Error ? error.stack : undefined,
    timestamp: new Date().toISOString()
  };

  logger.error(`Error in ${context}:`, errorObj);

  if (error instanceof z.ZodError) {
    return NextResponse.json({
      error: 'Validation error',
      details: error.errors
    }, { status: 400 });
  }

  return NextResponse.json({
    error: errorObj.message,
    context
  }, { status: 500 });
}

export async function GET() {
  try {
    logger.info('Fetching models list');
    const models = await modelManager.listModelsWithDetails();
    logger.info('Successfully fetched models list', { count: models.length });
    return NextResponse.json({ models });
  } catch (error) {
    return handleError(error, 'GET /api/models');
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    logger.info('Received model pull request', { body });

    const { modelName } = postModelSchema.parse(body);
    
    logger.info('Starting model pull', { modelName });
    const model = await modelManager.pullModel(modelName);
    logger.info('Successfully pulled model', { modelName, model });
    
    return NextResponse.json({ model });
  } catch (error) {
    return handleError(error, 'POST /api/models');
  }
}

export async function DELETE(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const modelId = searchParams.get('modelId');
    logger.info('Received model delete request', { modelId });

    if (!modelId) {
      logger.warn('Model delete request missing modelId');
      return NextResponse.json({ error: 'Model ID is required' }, { status: 400 });
    }

    logger.info('Starting model deletion', { modelId });
    await modelManager.deleteModel(modelId);
    logger.info('Successfully deleted model', { modelId });
    
    return NextResponse.json({ success: true });
  } catch (error) {
    return handleError(error, 'DELETE /api/models');
  }
} 