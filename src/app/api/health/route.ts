import { NextResponse } from 'next/server';
import { DatabaseService } from '@/services/database/DatabaseService';
import { OllamaService } from '@/services/ollama/OllamaService';

export async function GET() {
  const db = new DatabaseService();
  const ollama = new OllamaService();

  try {
    const dbStatus = await db.isHealthy();
    const ollamaStatus = await ollama.isAvailable();

    return NextResponse.json({
      status: 'ok',
      services: {
        database: dbStatus ? 'healthy' : 'unhealthy',
        ollama: ollamaStatus ? 'available' : 'unavailable'
      }
    });
  } catch (error) {
    return NextResponse.json({
      status: 'error',
      message: error instanceof Error ? error.message : 'Unknown error occurred'
    }, { status: 500 });
  }
} 