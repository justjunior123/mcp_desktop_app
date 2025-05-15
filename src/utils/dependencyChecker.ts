import { exec } from 'child_process';
import { promisify } from 'util';

const execAsync = promisify(exec);

export interface DependencyStatus {
  name: string;
  installed: boolean;
  running: boolean;
  version?: string;
  error?: string;
  installInstructions?: string;
}

/**
 * Check if Ollama is installed and running
 */
export async function checkOllama(): Promise<DependencyStatus> {
  try {
    // Check if Ollama is running
    const response = await fetch('http://localhost:11434/api/version', {
      method: 'GET',
    });
    
    if (response.ok) {
      const data = await response.json();
      return {
        name: 'Ollama',
        installed: true,
        running: true,
        version: data.version
      };
    }
    
    // Ollama is installed but not running
    return {
      name: 'Ollama',
      installed: true,
      running: false,
      error: 'Ollama is installed but not running',
      installInstructions: 'Please start Ollama by running: ollama serve'
    };
  } catch (error) {
    try {
      // Check if Ollama is installed
      await execAsync('which ollama');
      return {
        name: 'Ollama',
        installed: true,
        running: false,
        error: 'Ollama is not running',
        installInstructions: 'Please start Ollama by running: ollama serve'
      };
    } catch (e) {
      return {
        name: 'Ollama',
        installed: false,
        running: false,
        error: 'Ollama is not installed',
        installInstructions: 'Please install Ollama from https://ollama.ai'
      };
    }
  }
}

/**
 * Check all dependencies required by the application
 */
export async function checkAllDependencies(): Promise<DependencyStatus[]> {
  return [
    await checkOllama(),
    // Add other dependency checks here as needed
  ];
} 