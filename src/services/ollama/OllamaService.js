import { OllamaClient } from './OllamaClient';
import { logger } from '../logging';
/**
 * Service for managing Ollama integration with the MCP application.
 */
export class OllamaService {
    /**
     * Creates a new Ollama service.
     * @param baseUrl The base URL of the Ollama API
     * @param timeoutMs Optional timeout in milliseconds
     */
    constructor(baseUrl = 'http://localhost:11434', timeoutMs) {
        this.models = [];
        this.defaultModel = null;
        this.client = new OllamaClient({ baseUrl, timeoutMs });
        logger.info('OllamaService initialized', { baseUrl });
    }
    /**
     * Checks if Ollama is available by fetching the list of models.
     * @returns True if Ollama is available, false otherwise
     */
    async isAvailable() {
        try {
            await this.refreshModels();
            return true;
        }
        catch (error) {
            logger.warn('Ollama service is not available', { error: error.message });
            return false;
        }
    }
    /**
     * Refreshes the list of available models.
     */
    async refreshModels() {
        try {
            const response = await this.client.listModels();
            this.models = response.models;
            if (this.models.length > 0 && !this.defaultModel) {
                this.defaultModel = this.models[0].name;
            }
            logger.info('Ollama models refreshed', {
                modelCount: this.models.length,
                defaultModel: this.defaultModel
            });
            return this.models;
        }
        catch (error) {
            logger.error('Failed to refresh Ollama models', { error: error.message });
            throw error;
        }
    }
    /**
     * Gets the list of available models.
     * @returns The list of available models
     */
    getModels() {
        return this.models;
    }
    /**
     * Generates a text completion from the given prompt.
     * @param prompt The prompt to complete
     * @param modelName Optional model name, defaults to the first available model
     * @param options Optional model parameters
     * @returns The generated completion
     */
    async generateCompletion(prompt, modelName, options) {
        const model = modelName || this.defaultModel;
        if (!model) {
            throw new Error('No model available for text generation');
        }
        try {
            logger.debug('Generating text with Ollama', { model, promptLength: prompt.length });
            const response = await this.client.generate({
                model,
                prompt,
                options
            });
            return response.response;
        }
        catch (error) {
            logger.error('Failed to generate text with Ollama', {
                error: error.message,
                model,
                promptLength: prompt.length
            });
            throw error;
        }
    }
    /**
     * Generates a chat completion from the given messages.
     * @param messages The chat messages
     * @param modelName Optional model name, defaults to the first available model
     * @param options Optional model parameters
     * @returns The generated chat response
     */
    async generateChatCompletion(messages, modelName, options) {
        const model = modelName || this.defaultModel;
        if (!model) {
            throw new Error('No model available for chat completion');
        }
        try {
            logger.debug('Generating chat completion with Ollama', {
                model,
                messageCount: messages.length
            });
            const response = await this.client.chat({
                model,
                messages,
                options
            });
            return response.message.content;
        }
        catch (error) {
            logger.error('Failed to generate chat completion with Ollama', {
                error: error.message,
                model,
                messageCount: messages.length
            });
            throw error;
        }
    }
    /**
     * Pulls a model from the Ollama registry.
     * @param modelName The name of the model to pull
     * @returns A promise that resolves when the model is pulled
     */
    async pullModel(modelName) {
        try {
            logger.info('Pulling Ollama model', { model: modelName });
            await this.client.pullModel({ model: modelName });
            // Refresh models after successful pull
            await this.refreshModels();
            logger.info('Ollama model pulled successfully', { model: modelName });
        }
        catch (error) {
            logger.error('Failed to pull Ollama model', {
                error: error.message,
                model: modelName
            });
            throw error;
        }
    }
    /**
     * Gets the details of a specific model.
     * @param modelName The name of the model
     * @returns The model details
     */
    async getModelDetails(modelName) {
        try {
            const response = await this.client.showModel({ model: modelName });
            return response;
        }
        catch (error) {
            logger.error('Failed to get Ollama model details', {
                error: error.message,
                model: modelName
            });
            throw error;
        }
    }
    /**
     * Creates text embeddings for the given text.
     * @param text The text to create embeddings for
     * @param modelName Optional model name, defaults to the first available model
     * @returns The embeddings
     */
    async createEmbeddings(text, modelName) {
        const model = modelName || this.defaultModel;
        if (!model) {
            throw new Error('No model available for embeddings');
        }
        try {
            const response = await this.client.createEmbeddings({
                model,
                prompt: text
            });
            return response.embedding;
        }
        catch (error) {
            logger.error('Failed to create embeddings with Ollama', {
                error: error.message,
                model,
                textLength: text.length
            });
            throw error;
        }
    }
    /**
     * Sets the default model to use for Ollama operations.
     * @param modelName The name of the model to use as default
     */
    setDefaultModel(modelName) {
        this.defaultModel = modelName;
        logger.info('Ollama default model set', { model: modelName });
    }
    /**
     * Gets the current default model.
     * @returns The current default model, or null if none is set
     */
    getDefaultModel() {
        return this.defaultModel;
    }
}
//# sourceMappingURL=OllamaService.js.map