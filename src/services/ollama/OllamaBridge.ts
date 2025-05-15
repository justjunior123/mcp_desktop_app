import { MCPServer } from '../../mcp/server/MCPServer';
import { OllamaService } from './OllamaService';
import { ChatMessage, GenerateRequest, ModelInfo } from './types';
import { logger } from '../logging';

/**
 * Bridge between Ollama service and MCP tools
 * Responsible for registering Ollama-related tools with the MCP server
 */
export class OllamaBridge {
  private mcpServer: MCPServer;
  private ollamaService: OllamaService;
  private registeredTools: {
    [name: string]: ReturnType<MCPServer['tool']>;
  } = {};
  
  /**
   * Create a new Ollama Bridge
   * @param mcpServer The MCP server instance to register tools with
   * @param ollamaService The Ollama service to use for tool implementations
   */
  constructor(mcpServer: MCPServer, ollamaService: OllamaService) {
    this.mcpServer = mcpServer;
    this.ollamaService = ollamaService;
    logger.info('OllamaBridge initialized');
  }

  /**
   * Register all Ollama-related tools with the MCP server
   */
  public async registerTools(): Promise<void> {
    logger.info('Registering Ollama tools with MCP server');
    
    try {
      const isOllamaAvailable = await this.ollamaService.checkAvailability();
      
      if (!isOllamaAvailable) {
        logger.warn('Ollama is not available, tools will not be registered');
        return;
      }
      
      // Register the core tools that don't depend on specific models
      this.registerListModelsTools();
      this.registerModelManagementTools();
      
      // Register model-specific tools
      await this.registerModelSpecificTools();
      
      logger.info('Successfully registered Ollama tools with MCP server');
    } catch (error) {
      logger.error('Failed to register Ollama tools', { error });
      throw error;
    }
  }
  
  /**
   * Register the list models tool
   */
  private registerListModelsTools(): void {
    this.registeredTools.listOllamaModels = this.mcpServer.tool(
      'ollama.models.list',
      {
        type: 'object',
        properties: {},
        required: []
      },
      async () => {
        try {
          const models = await this.ollamaService.listModels();
          return { models };
        } catch (error) {
          logger.error('Error in listOllamaModels tool', { error });
          throw new Error(`Failed to list models: ${error instanceof Error ? error.message : 'Unknown error'}`);
        }
      }
    );
  }
  
  /**
   * Register model management tools (pull, delete, etc.)
   */
  private registerModelManagementTools(): void {
    // Pull model tool
    this.registeredTools.pullOllamaModel = this.mcpServer.tool(
      'ollama.models.pull',
      {
        type: 'object',
        properties: {
          name: {
            type: 'string',
            description: 'Name of the model to pull (e.g., llama2:7b-q4_0)'
          }
        },
        required: ['name']
      },
      async (params) => {
        const { name } = params as { name: string };
        try {
          // Start the pull process in the background
          this.ollamaService.pullModel(name).catch(error => {
            logger.error('Error pulling model in background', { model: name, error });
          });
          
          // Return immediate acknowledgment
          return { 
            status: 'started',
            message: `Started pulling model: ${name}`,
            model: name
          };
        } catch (error) {
          logger.error('Error in pullOllamaModel tool', { model: name, error });
          throw new Error(`Failed to pull model: ${error instanceof Error ? error.message : 'Unknown error'}`);
        }
      }
    );
    
    // Delete model tool
    this.registeredTools.deleteOllamaModel = this.mcpServer.tool(
      'ollama.models.delete',
      {
        type: 'object',
        properties: {
          name: {
            type: 'string',
            description: 'Name of the model to delete'
          }
        },
        required: ['name']
      },
      async (params) => {
        const { name } = params as { name: string };
        try {
          await this.ollamaService.deleteModel(name);
          return {
            status: 'success',
            message: `Model ${name} deleted successfully`
          };
        } catch (error) {
          logger.error('Error in deleteOllamaModel tool', { model: name, error });
          throw new Error(`Failed to delete model: ${error instanceof Error ? error.message : 'Unknown error'}`);
        }
      }
    );
    
    // Show model tool
    this.registeredTools.showOllamaModel = this.mcpServer.tool(
      'ollama.models.show',
      {
        type: 'object',
        properties: {
          name: {
            type: 'string',
            description: 'Name of the model to get information for'
          }
        },
        required: ['name']
      },
      async (params) => {
        const { name } = params as { name: string };
        try {
          const modelInfo = await this.ollamaService.getModelInfo(name);
          return modelInfo;
        } catch (error) {
          logger.error('Error in showOllamaModel tool', { model: name, error });
          throw new Error(`Failed to get model info: ${error instanceof Error ? error.message : 'Unknown error'}`);
        }
      }
    );
  }
  
  /**
   * Register tools for each available model (generate, chat, embeddings)
   */
  private async registerModelSpecificTools(): Promise<void> {
    try {
      const models = await this.ollamaService.listModels();
      
      for (const model of models) {
        this.registerGenerateToolForModel(model);
        this.registerChatToolForModel(model);
        this.registerEmbeddingsToolForModel(model);
      }
      
      logger.info(`Registered specific tools for ${models.length} models`);
    } catch (error) {
      logger.error('Failed to register model-specific tools', { error });
      throw error;
    }
  }
  
  /**
   * Register text generation tool for a specific model
   */
  private registerGenerateToolForModel(model: ModelInfo): void {
    const toolName = `ollama.generate.${model.name.replace(/[^a-zA-Z0-9]/g, '_')}`;
    
    this.registeredTools[toolName] = this.mcpServer.tool(
      toolName,
      {
        type: 'object',
        properties: {
          prompt: {
            type: 'string',
            description: 'The prompt to generate text from'
          },
          system: {
            type: 'string',
            description: 'Optional system prompt to guide the model behavior'
          },
          temperature: {
            type: 'number',
            description: 'Sampling temperature (0.0 to 2.0)'
          },
          maxTokens: {
            type: 'integer',
            description: 'Maximum number of tokens to generate'
          }
        },
        required: ['prompt']
      },
      async (params) => {
        const { prompt, system, temperature, maxTokens } = params as {
          prompt: string;
          system?: string;
          temperature?: number;
          maxTokens?: number;
        };

        try {
          const response = await this.ollamaService.generateCompletion(
            model.name,
            prompt,
            {
              system,
              temperature,
              num_predict: maxTokens
            }
          );
          return { response };
        } catch (error) {
          logger.error('Error in generate tool', { model: model.name, error });
          throw new Error(`Failed to generate text: ${error instanceof Error ? error.message : 'Unknown error'}`);
        }
      }
    );
  }
  
  /**
   * Register chat tool for a specific model
   */
  private registerChatToolForModel(model: ModelInfo): void {
    const toolName = `ollama.chat.${model.name.replace(/[^a-zA-Z0-9]/g, '_')}`;
    
    this.registeredTools[toolName] = this.mcpServer.tool(
      toolName,
      {
        type: 'object',
        properties: {
          messages: {
            type: 'array',
            description: 'Array of chat messages',
            items: {
              type: 'object',
              properties: {
                role: {
                  type: 'string',
                  description: 'The role of the message sender (system, user, assistant)'
                },
                content: {
                  type: 'string',
                  description: 'The content of the message'
                }
              },
              required: ['role', 'content']
            }
          },
          options: {
            type: 'object',
            description: 'Optional chat parameters',
            properties: {
              temperature: {
                type: 'number',
                description: 'Temperature for text generation (0.0-2.0)'
              },
              num_predict: {
                type: 'number',
                description: 'Maximum number of tokens to generate'
              }
            }
          }
        },
        required: ['messages']
      },
      async (params) => {
        const { messages, options } = params as { 
          messages: ChatMessage[], 
          options?: Record<string, unknown> 
        };
        
        try {
          const result = await this.ollamaService.chat({
            model: model.name,
            messages,
            options
          });
          
          return {
            message: result.message,
            metrics: {
              total_duration: result.total_duration,
              prompt_eval_count: result.prompt_eval_count,
              eval_count: result.eval_count,
              eval_duration: result.eval_duration
            }
          };
        } catch (error) {
          logger.error('Error in chat tool', { model: model.name, error });
          throw new Error(`Failed to chat: ${error instanceof Error ? error.message : 'Unknown error'}`);
        }
      }
    );
    
    logger.debug(`Registered chat tool for model ${model.name}`);
  }
  
  /**
   * Register embeddings tool for a specific model
   */
  private registerEmbeddingsToolForModel(model: ModelInfo): void {
    const toolName = `ollama.embeddings.${model.name.replace(/[^a-zA-Z0-9]/g, '_')}`;
    
    this.registeredTools[toolName] = this.mcpServer.tool(
      toolName,
      {
        type: 'object',
        properties: {
          input: {
            type: 'string',
            description: 'The text to generate embeddings for'
          }
        },
        required: ['input']
      },
      async (params) => {
        const { input } = params as { input: string };
        
        try {
          const result = await this.ollamaService.getEmbedding({
            model: model.name,
            prompt: input
          });
          
          return {
            embedding: result.embedding,
            dimensions: result.embedding.length,
            metrics: {
              total_duration: result.total_duration
            }
          };
        } catch (error) {
          logger.error('Error in embeddings tool', { model: model.name, error });
          throw new Error(`Failed to generate embeddings: ${error instanceof Error ? error.message : 'Unknown error'}`);
        }
      }
    );
    
    logger.debug(`Registered embeddings tool for model ${model.name}`);
  }
  
  /**
   * Update tools when models change
   * Call this when models are added or removed
   */
  public async updateTools(): Promise<void> {
    logger.info('Updating Ollama tools based on model changes');
    
    try {
      // Remove all existing model-specific tools
      for (const [name, tool] of Object.entries(this.registeredTools)) {
        if (name.startsWith('ollama.generate.') || 
            name.startsWith('ollama.chat.') || 
            name.startsWith('ollama.embeddings.')) {
          tool.remove();
          delete this.registeredTools[name];
        }
      }
      
      // Register model-specific tools again
      await this.registerModelSpecificTools();
    } catch (error) {
      logger.error('Failed to update Ollama tools', { error });
      throw error;
    }
  }
  
  /**
   * Cleanup all registered tools
   */
  public cleanup(): void {
    logger.info('Cleaning up Ollama tools');
    
    for (const tool of Object.values(this.registeredTools)) {
      tool.remove();
    }
    
    this.registeredTools = {};
  }

  public async checkAvailability(): Promise<boolean> {
    try {
      const isOllamaAvailable = await this.ollamaService.isAvailable();
      return isOllamaAvailable;
    } catch (error) {
      logger.error('Failed to check Ollama availability', { error });
      return false;
    }
  }

  public async listModels(): Promise<ModelInfo[]> {
    try {
      const models = await this.ollamaService.getModels();
      return models;
    } catch (error) {
      logger.error('Failed to list models', { error });
      throw error;
    }
  }

  public async getModelInfo(name: string): Promise<any> {
    try {
      const modelInfo = await this.ollamaService.getModelDetails(name);
      return modelInfo;
    } catch (error) {
      logger.error('Failed to get model info', { error });
      throw error;
    }
  }

  public async generateText(params: GenerateRequest): Promise<string> {
    try {
      const { prompt, system, options } = params;
      const result = await this.ollamaService.generateCompletion(prompt, params.model, options);
      return result;
    } catch (error) {
      logger.error('Failed to generate text', { error });
      throw error;
    }
  }

  public async chat(params: ChatRequest): Promise<string> {
    try {
      const result = await this.ollamaService.generateChatCompletion(params.messages, params.model, params.options);
      return result;
    } catch (error) {
      logger.error('Failed to chat', { error });
      throw error;
    }
  }

  public async getEmbedding(params: EmbeddingRequest): Promise<number[]> {
    try {
      const result = await this.ollamaService.createEmbeddings(params.text, params.model);
      return result;
    } catch (error) {
      logger.error('Failed to get embedding', { error });
      throw error;
    }
  }
} 