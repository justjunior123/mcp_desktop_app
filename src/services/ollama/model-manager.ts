import { PrismaClient, Prisma } from '@prisma/client';
import { OllamaClient } from './client';
import { OllamaModelInfo, OllamaModelData } from './types';
import fs from 'fs';
import path from 'path';

const logFile = path.join(process.cwd(), 'parameters-debug.log');
function logParameters(context: string, value: unknown) {
  fs.appendFileSync(logFile, `[${new Date().toISOString()}] ${context}: ${typeof value} ${JSON.stringify(value, null, 2)}\n`);
}

// Utility to ensure parameters is always an object
function sanitizeModelData(modelData: any): any {
  prodLog('info', 'sanitizeModelData: entry', { inputType: typeof modelData, hasParameters: !!modelData?.parameters, hasDetails: !!modelData?.details });
  
  // Prefer parameters if it's an object, else details if it's an object, else {}
  let parameters = {};
  let name = modelData.name;
  if (!name && modelData.model_info && typeof modelData.model_info === 'object' && modelData.model_info.name) {
    name = modelData.model_info.name;
    prodLog('info', 'sanitizeModelData: using name from model_info', { name });
  }
  if (modelData && typeof modelData === 'object') {
    if (modelData.parameters && typeof modelData.parameters === 'object' && !Array.isArray(modelData.parameters)) {
      parameters = modelData.parameters;
      prodLog('info', 'sanitizeModelData: using parameters object');
    } else if (modelData.details && typeof modelData.details === 'object' && !Array.isArray(modelData.details)) {
      parameters = modelData.details;
      prodLog('info', 'sanitizeModelData: using details object');
    } else if (modelData.model_info && typeof modelData.model_info === 'object') {
      // Extract key model info fields
      parameters = {
        architecture: modelData.model_info['general.architecture'] || 'llama',
        parameter_size: modelData.model_info['general.parameter_count'] ? `${modelData.model_info['general.parameter_count'] / 1e9}B` : '7.2B',
        context_length: modelData.model_info['llama.context_length'] || 32768,
        embedding_length: modelData.model_info['llama.embedding_length'] || 4096,
        quantization: modelData.model_info['general.quantization_version'] ? `Q${modelData.model_info['general.quantization_version']}` : 'Q4_0',
        capabilities: modelData.capabilities || ['completion', 'tools'],
        stop_sequences: modelData.stop || ['[INST]', '[/INST]'],
        families: modelData.families || [],
        quantization_level: modelData.quantization_level || undefined,
        parent_model: modelData.parent_model || '',
        format: modelData.format || 'gguf',
        family: modelData.family || 'unknown',
        license: modelData.license || 'Apache License Version 2.0, January 2004'
      };
      prodLog('info', 'sanitizeModelData: using model_info object');
    } else {
      prodLog('info', 'sanitizeModelData: WARNING - invalid input type', { type: typeof modelData });
    }
  } else {
    prodLog('info', 'sanitizeModelData: WARNING - invalid input type', { type: typeof modelData });
  }
  
  const result = {
    name,
    ...modelData,
    parameters: parameters,
    size: typeof modelData.size !== 'undefined' ? modelData.size : BigInt(0),
    digest: typeof modelData.digest !== 'undefined' ? modelData.digest : '',
  };
  prodLog('info', 'sanitizeModelData: result', { 
    hasName: !!result.name,
    name: result.name,
    hasSize: !!result.size,
    hasParameters: !!result.parameters,
    parametersType: typeof result.parameters
  });
  return result;
}

type PrismaClientWithModels = PrismaClient & {
  ollamaModel: any;
  ollamaModelConfiguration: any;
};

function prodLog(level: 'info' | 'error', message: string, meta?: any) {
  function replacer(_key: string, value: any) {
    if (typeof value === 'bigint') {
      return value.toString();
    }
    return value;
  }
  const logEntry = {
    timestamp: new Date().toISOString(),
    level,
    message,
    ...(meta ? { meta } : {})
  };
  const line = JSON.stringify(logEntry, replacer);
  fs.appendFileSync('parameters-debug.log', line + '\n');
  if (level === 'error') {
    console.error(line);
  } else {
    console.log(line);
  }
}

export class OllamaModelManager {
  constructor(
    private prisma: PrismaClientWithModels,
    private ollamaClient: OllamaClient
  ) {}

  async syncModels(): Promise<void> {
    prodLog('info', 'syncModels: entry');
    // Check if Ollama is available first
    const isHealthy = await this.ollamaClient.healthCheck();
    if (!isHealthy) {
      throw new Error('Ollama server is not available');
    }

    try {
      const response = await this.ollamaClient.listModels();
      
      if (!response || !Array.isArray(response.models)) {
        throw new Error('Invalid response from Ollama API');
      }
      
      for (const model of response.models) {
        if (!model || !model.name) {
          console.warn('Skipping invalid model:', model);
          continue;
        }
        
        const modelData: OllamaModelData = {
          name: model.name,
          size: BigInt(model.size), // Convert to BigInt
          digest: model.digest,
          format: model.format || 'gguf',
          family: model.family || 'unknown',
          parameters: {
            architecture: model.architecture || 'llama',
            parameter_size: model.parameter_size || '7.2B',
            context_length: model.context_length || 32768,
            embedding_length: model.embedding_length || 4096,
            quantization: model.quantization || 'Q4_0',
            capabilities: model.capabilities || ['completion', 'tools'],
            stop_sequences: model.stop || ['[INST]', '[/INST]'],
            families: model.families || [],
            quantization_level: model.quantization_level || undefined,
            parent_model: model.parent_model || '',
            format: model.format || 'gguf',
            family: model.family || 'unknown',
            license: model.license || 'Apache License Version 2.0, January 2004'
          },
          isDownloaded: true,
          status: 'READY'
        };
        
        await this.upsertModel(modelData);
      }
      prodLog('info', 'syncModels: success');
    } catch (error) {
      prodLog('error', 'syncModels: error', { error: error instanceof Error ? error.stack || error.message : error });
      throw error;
    }
  }

  private async upsertModel(modelData: OllamaModelData): Promise<void> {
    prodLog('info', 'upsertModel: entry', modelData);
    try {
      const sanitized = sanitizeModelData(modelData);
      prodLog('info', 'upsertModel: afterSanitize', sanitized);
      prodLog('info', 'upsertModel: full', sanitized);
      prodLog('info', 'upsertModel: parameters', sanitized.parameters);
      await this.prisma.ollamaModel.upsert({
        where: { name: sanitized.name },
        create: {
          name: sanitized.name,
          size: sanitized.size,
          digest: sanitized.digest,
          format: sanitized.format || 'gguf',
          family: sanitized.family || 'unknown',
          parameters: sanitized.parameters || {},
          isDownloaded: sanitized.isDownloaded || false,
          status: sanitized.status || 'NOT_DOWNLOADED'
        },
        update: {
          size: sanitized.size,
          digest: sanitized.digest,
          format: sanitized.format || 'gguf',
          family: sanitized.family || 'unknown',
          parameters: sanitized.parameters || {},
          isDownloaded: sanitized.isDownloaded || false,
          status: sanitized.status || 'NOT_DOWNLOADED'
        }
      });
    } catch (error) {
      prodLog('error', `upsertModel: error for ${modelData.name}`, { error: error instanceof Error ? error.stack || error.message : error, sanitized: sanitizeModelData(modelData) });
      throw error;
    }
  }

  async getModel(name: string) {
    prodLog('info', 'getModel: entry', { name });
    try {
      const model = await this.prisma.ollamaModel.findUnique({
        where: { name },
        include: { configuration: true }
      });
      prodLog('info', 'getModel: success', { found: !!model });
      if (!model) {
        // Log all available models for debugging
        const allModels = await this.prisma.ollamaModel.findMany();
        prodLog('error', 'getModel: model not found, available models', { requested: name, available: allModels.map((m: any) => ({ name: m.name, status: m.status })) });
      }
      return model;
    } catch (error) {
      prodLog('error', 'getModel: error', { error: error instanceof Error ? error.stack || error.message : error });
      throw error;
    }
  }

  async listModels() {
    prodLog('info', 'listModels: entry');
    try {
      const models = await this.prisma.ollamaModel.findMany({
        include: { configuration: true }
      });
      prodLog('info', 'listModels: success', { count: models.length });
      return models;
    } catch (error) {
      prodLog('error', 'listModels: error', { error: error instanceof Error ? error.stack || error.message : error });
      throw error;
    }
  }

  async pullModel(name: string) {
    prodLog('info', 'pullModel: entry', { name });
    
    // Start download
    try {
      await this.prisma.ollamaModel.upsert({
        where: { name },
        create: {
          name,
          size: 0,
          digest: '',
          format: 'unknown',
          family: 'unknown',
          parameters: null,
          status: 'DOWNLOADING',
          downloadProgress: 0
        },
        update: {
          status: 'DOWNLOADING',
          downloadProgress: 0
        }
      });
      prodLog('info', 'pullModel: database updated for download start');
    } catch (dbError) {
      prodLog('error', 'pullModel: database update failed', { 
        error: dbError instanceof Error ? dbError.stack || dbError.message : dbError,
        name 
      });
      throw dbError;
    }

    try {
      // Pull model from Ollama
      prodLog('info', 'pullModel: starting Ollama pull', { name });
      await this.ollamaClient.pullModel(name);
      prodLog('info', 'pullModel: Ollama pull completed');
      
      prodLog('info', 'pullModel: fetching model info', { name });
      let modelInfo;
      try {
        modelInfo = await this.ollamaClient.getModel(name);
        prodLog('info', 'pullModel: model info retrieved', { 
          hasName: !!modelInfo?.name,
          hasParameters: !!modelInfo?.parameters,
          hasError: !!modelInfo?.error,
          hasModelInfo: !!modelInfo?.model_info
        });
        
        if (!modelInfo) {
          prodLog('error', 'pullModel: invalid model info', { modelInfo });
          throw new Error(`Ollama getModel did not return a valid model for '${name}'`);
        }
        if (modelInfo.error && typeof modelInfo.error === 'string') {
          prodLog('error', 'pullModel: model has error', { error: modelInfo.error });
          throw new Error(`Model '${name}' not found in Ollama.`);
        }
      } catch (getModelError) {
        prodLog('error', 'pullModel: getModel failed', { 
          error: getModelError instanceof Error ? getModelError.stack || getModelError.message : getModelError,
          name 
        });
        if (getModelError instanceof Error && getModelError.message?.includes('not found')) {
          const notFoundError = new Error(`Model '${name}' not found in Ollama.`);
          (notFoundError as any).status = 404;
          throw notFoundError;
        }
        throw getModelError;
      }
      
      // Update database with complete info
      prodLog('info', 'pullModel: sanitizing model info');
      if (!modelInfo.name) {
        prodLog('info', 'pullModel: modelInfo.name missing, setting from argument', { name });
        modelInfo.name = name;
      }
      const sanitizedModelInfo = sanitizeModelData(modelInfo);
      prodLog('info', 'pullModel: updating database with model info');
      await this.upsertModel(sanitizedModelInfo);
      prodLog('info', 'pullModel: success', { name });
    } catch (error) {
      prodLog('error', 'pullModel: operation failed', { 
        error: error instanceof Error ? error.stack || error.message : error,
        name 
      });
      
      // Update database with error state
      try {
        await this.prisma.ollamaModel.update({
          where: { name },
          data: {
            status: 'ERROR',
            error: error instanceof Error ? error.message : 'Unknown error'
          }
        });
        prodLog('info', 'pullModel: database updated with error state');
      } catch (dbError) {
        prodLog('error', 'pullModel: failed to update error state', { 
          error: dbError instanceof Error ? dbError.stack || dbError.message : dbError,
          originalError: error instanceof Error ? error.stack || error.message : error
        });
      }
      throw error;
    }
  }

  async updateModelConfiguration(name: string, config: {
    temperature?: number;
    topP?: number;
    topK?: number;
    repeatPenalty?: number;
    presencePenalty?: number;
    frequencyPenalty?: number;
    stop?: string[];
    maxTokens?: number;
    systemPrompt?: string;
    contextWindow?: number;
  }) {
    prodLog('info', 'updateModelConfiguration: entry', { name, config });
    const model = await this.prisma.ollamaModel.findUnique({
      where: { name }
    });

    if (!model) {
      throw new Error(`Model ${name} not found`);
    }

    return this.prisma.ollamaModelConfiguration.upsert({
      where: { modelId: model.id },
      create: {
        modelId: model.id,
        ...config
      },
      update: config
    });
  }

  async deleteModel(name: string) {
    prodLog('info', 'deleteModel: entry', { name });
    // First check if model exists
    const model = await this.prisma.ollamaModel.findUnique({
      where: { name }
    });

    if (!model) {
      throw new Error(`Model ${name} not found`);
    }

    // Delete from database
    await this.prisma.ollamaModel.delete({
      where: { name }
    });

    // Note: We don't delete from Ollama as there's no API for that
    // The model will be re-added on next sync if it still exists in Ollama
    prodLog('info', 'deleteModel: success', { name });
  }
} 