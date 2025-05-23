import { PrismaClient, Prisma } from '@prisma/client';
import { OllamaClient } from './client';
import { OllamaModelInfo, OllamaModelData, OllamaChatMessage } from './types';
import fs from 'fs';
import path from 'path';
import { createLogger } from '../../utils/logger';
import { OllamaError } from './errors';

const logger = createLogger('ollama-model-manager');

const logFile = path.join(process.cwd(), 'parameters-debug.log');
function logParameters(context: string, value: unknown) {
  fs.appendFileSync(logFile, `[${new Date().toISOString()}] ${context}: ${typeof value} ${JSON.stringify(value, null, 2)}\n`);
}

// Custom JSON stringify replacer to handle BigInt
function jsonReplacer(_key: string, value: any) {
  if (typeof value === 'bigint') {
    return value.toString();
  }
  return value;
}

// Utility to ensure parameters is always an object
function sanitizeModelData(modelData: any): any {
  logger.debug('sanitizeModelData: entry', { 
    inputType: typeof modelData, 
    hasParameters: !!modelData?.parameters, 
    hasDetails: !!modelData?.details,
    hasModelInfo: !!modelData?.model_info,
    rawData: JSON.stringify(modelData, jsonReplacer)
  });
  
  // Prefer parameters if it's an object, else details if it's an object, else {}
  let parameters = {};
  let name = modelData?.name;
  
  // Try to get name from various possible locations
  if (!name) {
    if (modelData?.model_info?.name) {
      name = modelData.model_info.name;
      logger.debug('sanitizeModelData: using name from model_info', { name });
    } else if (modelData?.details?.name) {
      name = modelData.details.name;
      logger.debug('sanitizeModelData: using name from details', { name });
    }
  }

  if (modelData) {
    if (modelData.parameters && typeof modelData.parameters === 'object' && !Array.isArray(modelData.parameters)) {
      parameters = modelData.parameters;
      logger.debug('sanitizeModelData: using parameters object');
    } else if (modelData.details && typeof modelData.details === 'object' && !Array.isArray(modelData.details)) {
      parameters = modelData.details;
      logger.debug('sanitizeModelData: using details object');
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
      logger.debug('sanitizeModelData: using model_info object');
    } else {
      // If we have no valid parameters object, create a default one
      parameters = {
        architecture: 'llama',
        parameter_size: '7.2B',
        context_length: 32768,
        embedding_length: 4096,
        quantization: 'Q4_0',
        capabilities: ['completion', 'tools'],
        stop_sequences: ['[INST]', '[/INST]'],
        families: [],
        format: 'gguf',
        family: 'unknown',
        license: 'Apache License Version 2.0, January 2004'
      };
      logger.debug('sanitizeModelData: using default parameters');
    }
  }
  
  const result = {
    name,
    ...modelData,
    parameters: parameters,
    size: typeof modelData?.size !== 'undefined' ? modelData.size : BigInt(0),
    digest: modelData?.digest || '',
    format: modelData?.format || 'gguf',
    family: modelData?.family || 'unknown',
    status: modelData?.status || 'NOT_DOWNLOADED',
    isDownloaded: modelData?.isDownloaded || false
  };

  logger.debug('sanitizeModelData: result', { 
    hasName: !!result.name,
    name: result.name,
    hasSize: !!result.size,
    hasParameters: !!result.parameters,
    parametersType: typeof result.parameters,
    status: result.status,
    isDownloaded: result.isDownloaded
  });
  
  return result;
}

type PrismaClientWithModels = PrismaClient & {
  ollamaModel: any;
  ollamaModelConfiguration: any;
};

function prodLog(level: 'info' | 'error', message: string, meta?: any) {
  function jsonReplacer(_key: string, value: any) {
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
  const line = JSON.stringify(logEntry, jsonReplacer);
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
      const models = await this.ollamaClient.listModels();
      
      if (!models || !Array.isArray(models)) {
        throw new Error('Invalid response from Ollama API');
      }
      
      for (const model of models) {
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
      // First try to get the model from the database
      let model = await this.prisma.ollamaModel.findUnique({
        where: { name },
        include: { configuration: true }
      });
      
      // If model not found, try syncing models first
      if (!model) {
        prodLog('info', 'getModel: model not found, attempting sync', { name });
        await this.syncModels();
        
        // Try getting the model again after sync
        model = await this.prisma.ollamaModel.findUnique({
          where: { name },
          include: { configuration: true }
        });
        
        if (!model) {
          prodLog('error', 'getModel: model not found after sync', { name });
          throw new Error('Model not found');
        }
      }

      // Transform the model into the expected format
      const transformedModel = {
        name: model.name,
        size: model.size,
        digest: model.digest,
        format: model.format,
        family: model.family,
        details: model.parameters || {},
        status: model.status,
        error: model.error,
        configuration: model.configuration
      };

      // If the model has an error status, treat it as not found
      if (model.status === 'ERROR') {
        prodLog('error', 'getModel: model has error status', { name, error: model.error });
        throw new Error('Model not found');
      }

      prodLog('info', 'getModel: success', { found: true });
      return transformedModel;
    } catch (error) {
      prodLog('error', 'getModel: error', { 
        error: error instanceof Error ? error.stack || error.message : error,
        name 
      });
      
      // Ensure we're throwing the correct error type
      if (error instanceof Error) {
        if (error.message === 'Model not found') {
          throw new Error('Model not found');
        }
        if (error.message.includes('ECONNREFUSED') || error.message.includes('connect')) {
          throw new Error('Ollama service is not available');
        }
        if (error.message.includes('timeout')) {
          throw new Error('Request to Ollama server timed out');
        }
      }
      throw new Error('Failed to get model');
    }
  }

  async listModels() {
    prodLog('info', 'listModels: entry');
    try {
      const models = await this.prisma.ollamaModel.findMany({
        include: { configuration: true }
      });

      // Transform the models into the expected format
      const transformedModels = models.map((model: any) => ({
        name: model.name,
        size: model.size,
        digest: model.digest,
        format: model.format,
        family: model.family,
        details: model.parameters || {},
        status: model.status,
        error: model.error,
        configuration: model.configuration
      }));

      prodLog('info', 'listModels: success', { count: models.length });
      return transformedModels;
    } catch (error) {
      prodLog('error', 'listModels: error', { error: error instanceof Error ? error.stack || error.message : error });
      throw error;
    }
  }

  private prodLog(level: 'info' | 'error', message: string, meta?: Record<string, any>) {
    const logEntry = {
      timestamp: new Date().toISOString(),
      level,
      module: 'ollama-model-manager',
      message,
      meta
    };
    const line = JSON.stringify(logEntry);
    fs.appendFileSync('parameters-debug.log', line + '\n');
    if (level === 'error') {
      console.error(line);
    } else {
      console.log(line);
    }
  }

  async pullModel(name: string, onProgress?: (status: string, progress: number) => void): Promise<OllamaModelData> {
    this.prodLog('info', 'pullModel: entry', { name });
    // Check if model already exists (ignore 'Model not found' errors)
    let existingModel: OllamaModelData | null = null;
    try {
      existingModel = await this.getModel(name);
    } catch (err) {
      if (!(err instanceof Error && err.message.includes('Model not found'))) {
        this.prodLog('error', 'pullModel: error checking existing model', { name, error: err });
        throw err;
      }
    }
    if (existingModel) {
      this.prodLog('info', 'pullModel: model already exists', { name });
      return existingModel;
    }

    // Create initial model record with required fields
    const model = await this.prisma.ollamaModel.upsert({
      where: { name },
      create: {
        name,
        size: BigInt(0),
        digest: '',
        format: 'gguf',
        family: 'unknown',
        parameters: {},
        isDownloaded: false,
        status: 'downloading',
        downloadProgress: 0,
        createdAt: new Date(),
        updatedAt: new Date()
      },
      update: {
        status: 'downloading',
        downloadProgress: 0,
        updatedAt: new Date()
      }
    });

    this.prodLog('info', 'pullModel: starting Ollama pull', { name });

    try {
      // Start the pull process
      await this.ollamaClient.pullModel(name, (status, progress) => {
        this.prodLog('info', 'pullModel: progress update', { name, status, progress });
        onProgress?.(status, progress || 0);
        
        // Update progress in database
        this.prisma.ollamaModel.update({
          where: { name },
          data: {
            downloadProgress: progress || 0,
            status: status === 'success' ? 'ready' : 'downloading',
            updatedAt: new Date()
          }
        }).catch((error: Error) => {
          this.prodLog('error', 'pullModel: error updating progress', { name, error });
        });
      });

      // Verify model exists after pull
      const modelInfo = await this.ollamaClient.getModel(name);
      if (!modelInfo) {
        throw new OllamaError('Failed to get model info after pull: Model not found');
      }

      // Update model record with success status
      const updatedModel = await this.prisma.ollamaModel.update({
        where: { name },
        data: {
          status: 'ready',
          downloadProgress: 100,
          updatedAt: new Date()
        }
      });

      this.prodLog('info', 'pullModel: success', { name });
      return updatedModel;
    } catch (error) {
      // Update model record with error status
      await this.prisma.ollamaModel.update({
        where: { name },
        data: {
          status: 'error',
          error: error instanceof Error ? error.message : 'Unknown error',
          updatedAt: new Date()
        }
      });

      throw error;
    }
  }

  async updateModel(name: string, config: {
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
    prodLog('info', 'updateModel: entry', { name, config });
    const model = await this.prisma.ollamaModel.findUnique({
      where: { name }
    });

    if (!model) {
      throw new Error('Model not found');
    }

    const updatedConfig = await this.prisma.ollamaModelConfiguration.upsert({
      where: { modelId: model.id },
      create: {
        modelId: model.id,
        ...config
      },
      update: config
    });

    // Return the updated model
    return this.getModel(name);
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

  async chat(
    modelName: string,
    messages: OllamaChatMessage[],
    options?: {
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
    },
    onChunk?: (chunk: any) => void
  ) {
    this.prodLog('info', 'chat: entry', { modelName, messages, options });

    try {
      // Verify model exists and is ready
      const model = await this.getModel(modelName);
      if (!model) {
        throw new Error('Model not found');
      }

      if (model.status !== 'ready') {
        throw new Error('Model is not ready');
      }

      // Get model configuration
      const config = await this.prisma.ollamaModelConfiguration.findUnique({
        where: { modelName }
      });

      // Merge options with configuration
      const mergedOptions = {
        ...config,
        ...options
      };

      // Call Ollama API
      if (onChunk) {
        // Stream response and invoke callback for each chunk
        const stream = this.ollamaClient.chatStream({
          model: modelName,
          messages,
          options: mergedOptions
        });
        for await (const chunk of stream) {
          onChunk(chunk);
        }
        return;
      }
      return this.ollamaClient.chat({
        model: modelName,
        messages,
        options: mergedOptions
      });
    } catch (error) {
      // Log error message for debugging
      const errMsg = error instanceof Error ? error.message : String(error);
      this.prodLog('error', 'chat: error', {modelName, error: errMsg});
      throw error;
    }
  }

  async *chatStream(
    modelName: string,
    messages: OllamaChatMessage[],
    options?: {
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
    }
  ) {
    this.prodLog('info', 'chatStream: entry', { modelName, messages, options });

    try {
      // Verify model exists and is ready
      const model = await this.getModel(modelName);
      if (!model) {
        throw new Error('Model not found');
      }

      if (model.status !== 'ready') {
        throw new Error('Model is not ready');
      }

      // Get model configuration
      const config = await this.prisma.ollamaModelConfiguration.findUnique({
        where: { modelName }
      });

      // Merge options with configuration
      const mergedOptions = {
        ...config,
        ...options
      };

      // Call Ollama API
      return this.ollamaClient.chatStream({
        model: modelName,
        messages,
        options: mergedOptions
      });
    } catch (error) {
      this.prodLog('error', 'chatStream: error', { modelName, error });
      throw error;
    }
  }
} 