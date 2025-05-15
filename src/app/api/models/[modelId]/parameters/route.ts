import { NextRequest, NextResponse } from 'next/server';
import { ModelManager } from '@/services/ollama/ModelManager';
import { DatabaseService } from '@/services/database/DatabaseService';
import { OllamaService } from '@/services/ollama/OllamaService';

const modelManager = new ModelManager(
  new DatabaseService(),
  new OllamaService()
);

export async function GET(
  request: NextRequest,
  { params }: { params: { modelId: string } }
) {
  try {
    const model = await modelManager.getModelWithDetails(params.modelId);
    return NextResponse.json({ parameters: model.parameters });
  } catch (error) {
    return NextResponse.json({
      error: error instanceof Error ? error.message : 'Unknown error occurred'
    }, { status: 500 });
  }
}

export async function PUT(
  request: NextRequest,
  { params }: { params: { modelId: string } }
) {
  try {
    const body = await request.json();
    const { parameters } = body;

    if (!parameters) {
      return NextResponse.json({ error: 'Parameters are required' }, { status: 400 });
    }

    const model = await modelManager.saveModelParameters(
      params.modelId,
      typeof parameters === 'string' ? parameters : JSON.stringify(parameters)
    );
    
    return NextResponse.json({ model });
  } catch (error) {
    return NextResponse.json({
      error: error instanceof Error ? error.message : 'Unknown error occurred'
    }, { status: 500 });
  }
} 