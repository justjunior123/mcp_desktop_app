import { NextRequest, NextResponse } from 'next/server';
import { checkOllama } from '../../../../utils/dependencyChecker';

export async function POST(request: NextRequest) {
  try {
    // Check if Ollama is available
    const ollamaStatus = await checkOllama();
    
    if (!ollamaStatus.installed || !ollamaStatus.running) {
      return NextResponse.json({
        error: !ollamaStatus.installed ? 'Ollama is not installed' : 'Ollama is not running',
        code: !ollamaStatus.installed ? 'DEPENDENCY_MISSING' : 'DEPENDENCY_NOT_RUNNING',
        details: ollamaStatus,
      }, { status: 503 });
    }
    
    // Parse request body
    let modelName;
    try {
      const body = await request.json();
      modelName = body.modelName;
      
      if (!modelName) {
        return NextResponse.json({
          error: 'Model name is required',
        }, { status: 400 });
      }
    } catch (e) {
      return NextResponse.json({
        error: 'Invalid JSON body',
      }, { status: 400 });
    }
    
    // This would normally connect to ModelController.pullModel
    // For now, just return a mock response
    return NextResponse.json({
      model: {
        id: `mock-id-${Date.now()}`,
        name: modelName,
        status: 'downloading',
        ollamaDetails: {
          modelId: `mock-id-${Date.now()}`,
          downloadProgress: 0,
          downloadStatus: 'downloading',
          createdAt: new Date(),
          updatedAt: new Date()
        }
      },
      message: `Started pulling model: ${modelName}`
    }, { status: 202 });
  } catch (error) {
    console.error('Error pulling model:', error);
    return NextResponse.json({
      error: 'Failed to pull model',
      details: error instanceof Error ? error.message : 'Unknown error',
    }, { status: 500 });
  }
} 