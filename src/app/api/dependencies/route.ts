import { NextResponse } from 'next/server';
import { checkAllDependencies } from '../../../utils/dependencyChecker';

export async function GET() {
  try {
    const dependencies = await checkAllDependencies();
    return NextResponse.json({ dependencies });
  } catch (error) {
    console.error('Error checking dependencies:', error);
    return NextResponse.json({
      error: 'Failed to check dependencies',
      details: error instanceof Error ? error.message : 'Unknown error',
    }, { status: 500 });
  }
} 