import { NextResponse } from 'next/server';
import { checkOllama } from '../../../utils/dependencyChecker';

export async function GET() {
  try {
    // Check if Ollama is available
    const ollamaStatus = await checkOllama();
    
    if (!ollamaStatus.installed) {
      return NextResponse.json({
        error: 'Ollama is not installed',
        code: 'DEPENDENCY_MISSING',
        details: ollamaStatus,
      }, { status: 503 }); // Service Unavailable
    }
    
    if (!ollamaStatus.running) {
      return NextResponse.json({
        error: 'Ollama is not running',
        code: 'DEPENDENCY_NOT_RUNNING',
        details: ollamaStatus,
      }, { status: 503 });
    }
    
    // In a real implementation, we would connect to the ModelController here
    // For now, return empty list with appropriate structure
    return NextResponse.json({ 
      models: [] 
    });
  } catch (error) {
    console.error('Error fetching models:', error);
    return NextResponse.json({
      error: 'Failed to fetch models',
      details: error instanceof Error ? error.message : 'Unknown error',
    }, { status: 500 });
  }
}

export async function POST() {
  try {
    const ollamaStatus = await checkOllama();
    
    if (!ollamaStatus.installed || !ollamaStatus.running) {
      return NextResponse.json({
        error: !ollamaStatus.installed ? 'Ollama is not installed' : 'Ollama is not running',
        code: !ollamaStatus.installed ? 'DEPENDENCY_MISSING' : 'DEPENDENCY_NOT_RUNNING',
        details: ollamaStatus,
      }, { status: 503 });
    }
    
    // Not implemented yet, just return a meaningful response
    return NextResponse.json({ 
      error: 'Creating models is not implemented yet' 
    }, { status: 501 }); // Not Implemented
  } catch (error) {
    console.error('Error creating model:', error);
    return NextResponse.json({
      error: 'Failed to create model',
      details: error instanceof Error ? error.message : 'Unknown error',
    }, { status: 500 });
  }
} 