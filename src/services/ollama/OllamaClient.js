import axios from 'axios';
/**
 * Client for interacting with the Ollama API.
 */
export class OllamaClient {
    /**
     * Creates a new Ollama API client.
     * @param options Configuration options for the client
     */
    constructor(options) {
        this.baseUrl = options.baseUrl.replace(/\/+$/, ''); // Remove trailing slashes
        this.defaultTimeout = options.timeoutMs || 30000;
        this.http = axios.create({
            baseURL: this.baseUrl,
            headers: {
                'Content-Type': 'application/json'
            },
            timeout: this.defaultTimeout
        });
    }
    /**
     * Generate a completion from a prompt.
     * @param request The request parameters
     * @returns The completion response
     */
    async generate(request) {
        try {
            // Force stream: false to get a single response
            const data = { ...request, stream: false };
            const response = await this.http.post('/api/generate', data);
            return response.data;
        }
        catch (error) {
            this.handleError(error, 'Failed to generate completion');
        }
    }
    /**
     * Generate a chat completion from a series of messages.
     * @param request The chat request parameters
     * @returns The chat completion response
     */
    async chat(request) {
        try {
            // Force stream: false to get a single response
            const data = { ...request, stream: false };
            const response = await this.http.post('/api/chat', data);
            return response.data;
        }
        catch (error) {
            this.handleError(error, 'Failed to generate chat completion');
        }
    }
    /**
     * List all available models.
     * @returns A list of available models
     */
    async listModels() {
        try {
            const response = await this.http.get('/api/tags');
            return response.data;
        }
        catch (error) {
            this.handleError(error, 'Failed to list models');
        }
    }
    /**
     * Get detailed information about a specific model.
     * @param request The show model request
     * @returns Detailed information about the model
     */
    async showModel(request) {
        try {
            const response = await this.http.post('/api/show', request);
            return response.data;
        }
        catch (error) {
            this.handleError(error, 'Failed to get model information');
        }
    }
    /**
     * Generate embeddings for a prompt.
     * @param request The embeddings request
     * @returns The generated embeddings
     */
    async createEmbeddings(request) {
        try {
            const response = await this.http.post('/api/embeddings', request);
            return response.data;
        }
        catch (error) {
            this.handleError(error, 'Failed to create embeddings');
        }
    }
    /**
     * Pull a model from the Ollama registry.
     * @param request The pull model request
     * @returns The pull model response
     */
    async pullModel(request) {
        try {
            // Force stream: false to get a single response
            const data = { ...request, stream: false };
            // Set a longer timeout for model pulling
            const config = {
                timeout: 3600000 // 1 hour timeout for model pulling
            };
            const response = await this.http.post('/api/pull', data, config);
            return response.data;
        }
        catch (error) {
            this.handleError(error, 'Failed to pull model');
        }
    }
    /**
     * Gets the base URL of the Ollama API.
     * @returns The base URL
     */
    getBaseUrl() {
        return this.baseUrl;
    }
    /**
     * Handle errors from the Ollama API.
     * @param error The error object
     * @param defaultMessage The default error message
     */
    handleError(error, defaultMessage) {
        // Handle mocked Axios errors in tests
        if (error && error.isAxiosError === true && error.response) {
            const status = error.response.status;
            const message = error.response.data?.error || error.message || 'Unknown error';
            throw new Error(`Ollama API Error (${status}): ${message}`);
        }
        // Handle real Axios errors
        if (axios.isAxiosError(error) && error.response) {
            const status = error.response.status;
            const message = error.response.data?.error || error.message || 'Unknown error';
            throw new Error(`Ollama API Error (${status}): ${message}`);
        }
        // Handle non-Axios errors or Axios errors without response
        const errorMessage = error instanceof Error ? error.message : String(error);
        throw new Error(`${defaultMessage}: ${errorMessage}`);
    }
}
//# sourceMappingURL=OllamaClient.js.map