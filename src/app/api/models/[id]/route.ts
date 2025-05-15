import { NextRequest, NextResponse } from 'next/server';
import { checkOllama } from '../../../../utils/dependencyChecker';

export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const modelId = params.id;
    
    // Check if Ollama is available
    const ollamaStatus = await checkOllama();
    
    if (!ollamaStatus.installed || !ollamaStatus.running) {
      return NextResponse.json({
        error: !ollamaStatus.installed ? 'Ollama is not installed' : 'Ollama is not running',
        code: !ollamaStatus.installed ? 'DEPENDENCY_MISSING' : 'DEPENDENCY_NOT_RUNNING',
        details: ollamaStatus,
      }, { status: 503 });
    }
    
    // This would normally connect to ModelController.getModelWithDetails
    // For now, just return a mock response
    return NextResponse.json({
      model: {
        id: modelId,
        name: `mock-model-${modelId}`,
        status: 'installed',
        ollamaDetails: {
          modelId: modelId,
          size: 1024n * 1024n * 1024n, // 1GB
          family: 'llama2',
          parameterSize: '7B',
          quantizationLevel: 'Q4_0',
          downloadProgress: 100,
          downloadStatus: 'completed',
          createdAt: new Date(),
          updatedAt: new Date()
        }
      }
    });
  } catch (error) {
    console.error(`Error getting model ${params.id}:`, error);
    return NextResponse.json({
      error: 'Failed to get model',
      details: error instanceof Error ? error.message : 'Unknown error',
    }, { status: 500 });
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const modelId = params.id;
    
    // Check if Ollama is available
    const ollamaStatus = await checkOllama();
    
    if (!ollamaStatus.installed || !ollamaStatus.running) {
      return NextResponse.json({
        error: !ollamaStatus.installed ? 'Ollama is not installed' : 'Ollama is not running',
        code: !ollamaStatus.installed ? 'DEPENDENCY_MISSING' : 'DEPENDENCY_NOT_RUNNING',
        details: ollamaStatus,
      }, { status: 503 });
    }
    
    // This would normally connect to ModelController.deleteModel
    // For now, just return a mock success response
    return NextResponse.json({
      success: true,
      message: `Model ${modelId} deleted`
    });
  } catch (error) {
    console.error(`Error deleting model ${params.id}:`, error);
    return NextResponse.json({
      error: 'Failed to delete model',
      details: error instanceof Error ? error.message : 'Unknown error',
    }, { status: 500 });
  }
} 