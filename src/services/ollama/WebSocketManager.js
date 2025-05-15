import WebSocket from 'ws';
import { logger } from '../logging';
/**
 * Manager for WebSocket connections to provide real-time updates
 */
export class WebSocketManager {
    /**
     * Create a new WebSocket manager
     * @param server HTTP server to attach to
     * @param modelManager Model manager to listen to for updates
     * @param ollamaService Ollama service for direct operations
     */
    constructor(server, modelManager, ollamaService) {
        this.clients = new Set();
        this.logger = logger.withCategory('websocket-manager');
        this.wss = new WebSocket.Server({ server });
        this.modelManager = modelManager;
        this.ollamaService = ollamaService;
        this.setupConnectionHandler();
        this.setupModelStatusListener();
        this.logger.info('WebSocketManager initialized');
    }
    /**
     * Set up the WebSocket connection handler
     */
    setupConnectionHandler() {
        this.wss.on('connection', (ws) => {
            this.logger.info('New WebSocket connection established');
            // Add to clients set
            this.clients.add(ws);
            // Send immediate status update with current models
            this.sendInitialStatus(ws);
            // Setup message handler
            ws.on('message', (messageData) => {
                try {
                    // Convert buffer or array buffer to string if needed
                    const messageStr = typeof messageData === 'string'
                        ? messageData
                        : messageData instanceof Buffer
                            ? messageData.toString('utf-8')
                            : messageData.toString();
                    const parsed = JSON.parse(messageStr);
                    this.handleMessage(ws, parsed);
                }
                catch (error) {
                    this.logger.error('Error handling WebSocket message', {
                        message: typeof messageData === 'string' ? messageData : '<binary data>',
                        error
                    });
                    // Send error response
                    this.send(ws, {
                        type: 'error',
                        payload: {
                            message: 'Invalid message format',
                            originalMessage: typeof messageData === 'string' ? messageData : '<binary data>'
                        }
                    });
                }
            });
            // Handle disconnection
            ws.on('close', () => {
                this.logger.info('WebSocket connection closed');
                this.clients.delete(ws);
            });
            // Handle errors
            ws.on('error', (error) => {
                this.logger.error('WebSocket error', { error });
                this.clients.delete(ws);
            });
        });
    }
    /**
     * Set up listener for model status updates
     */
    setupModelStatusListener() {
        this.modelManager.on('modelStatusUpdate', (update) => {
            this.broadcast({
                type: 'modelStatusUpdate',
                payload: update
            });
        });
    }
    /**
     * Send initial status to new connections
     * @param ws WebSocket connection
     */
    async sendInitialStatus(ws) {
        try {
            // Get all models with details
            const models = await this.modelManager.listModelsWithDetails();
            // Send to client
            this.send(ws, {
                type: 'initialStatus',
                payload: {
                    models
                }
            });
        }
        catch (error) {
            this.logger.error('Error sending initial status', { error });
        }
    }
    /**
     * Handle incoming WebSocket messages
     * @param ws WebSocket connection
     * @param message Parsed message
     */
    async handleMessage(ws, message) {
        this.logger.debug('Received WebSocket message', { type: message.type });
        try {
            let models;
            let response;
            let error;

            switch (message.type) {
                case 'ping':
                    // Simple ping/pong for testing connection
                    this.send(ws, { type: 'pong', payload: { timestamp: new Date().toISOString() } });
                    break;
                case 'refreshModels':
                    // Refresh models and send updated list
                    await this.modelManager.refreshModelStatuses();
                    models = await this.modelManager.listModelsWithDetails();
                    this.send(ws, { type: 'modelList', payload: { models } });
                    break;
                case 'pullModel':
                    // Pull a model by name
                    if (typeof message.payload.modelName !== 'string') {
                        throw new Error('Invalid model name');
                    }
                    const model = await this.modelManager.pullModel(message.payload.modelName);
                    this.send(ws, {
                        type: 'pullStarted',
                        payload: {
                            modelId: model.id,
                            name: model.name
                        }
                    });
                    break;
                case 'deleteModel':
                    // Delete a model by ID
                    if (typeof message.payload.modelId !== 'string') {
                        throw new Error('Invalid model ID');
                    }
                    await this.modelManager.deleteModel(message.payload.modelId);
                    this.send(ws, {
                        type: 'deleteConfirmed',
                        payload: { modelId: message.payload.modelId }
                    });
                    break;
                case 'getModelDetails':
                    // Get detailed information for a model
                    if (typeof message.payload.modelId !== 'string') {
                        throw new Error('Invalid model ID');
                    }
                    const modelDetails = await this.modelManager.getModelWithDetails(message.payload.modelId);
                    this.send(ws, {
                        type: 'modelDetails',
                        payload: modelDetails
                    });
                    break;
                case 'saveModelParameters':
                    // Save model parameters
                    if (typeof message.payload.modelId !== 'string' ||
                        typeof message.payload.parameters !== 'string') {
                        throw new Error('Invalid parameters format');
                    }
                    await this.modelManager.saveModelParameters(message.payload.modelId, message.payload.parameters);
                    this.send(ws, {
                        type: 'parametersSaved',
                        payload: { modelId: message.payload.modelId }
                    });
                    break;
                case 'subscribeToStatus':
                    // Client is just subscribing to status updates - no action needed
                    this.send(ws, {
                        type: 'subscriptionConfirmed',
                        payload: { timestamp: new Date().toISOString() }
                    });
                    break;
                case 'listModels':
                    try {
                        models = await this.modelManager.listModelsWithDetails();
                        this.send(ws, {
                            type: 'modelList',
                            payload: { models }
                        });
                    }
                    catch (error) {
                        this.logger.error('Error listing models:', error);
                        this.send(ws, {
                            type: 'error',
                            payload: { message: 'Failed to list models' }
                        });
                    }
                    break;
                default:
                    this.logger.warn('Unknown message type', { type: message.type });
                    this.send(ws, {
                        type: 'error',
                        payload: { message: `Unknown message type: ${message.type}` }
                    });
            }
        }
        catch (error) {
            this.logger.error('Error handling message', { type: message.type, error });
            this.send(ws, {
                type: 'error',
                payload: {
                    message: error instanceof Error ? error.message : 'Unknown error',
                    originalType: message.type
                }
            });
        }
    }
    /**
     * Send a message to a specific WebSocket client
     * @param ws WebSocket connection
     * @param message Message to send
     */
    send(ws, message) {
        if (ws.readyState === WebSocket.OPEN) {
            try {
                ws.send(JSON.stringify(message));
            }
            catch (error) {
                this.logger.error('Error sending WebSocket message', { error });
            }
        }
    }
    /**
     * Broadcast a message to all connected clients
     * @param message Message to broadcast
     */
    broadcast(message) {
        this.clients.forEach(client => {
            this.send(client, message);
        });
    }
    /**
     * Close all WebSocket connections
     */
    closeAll() {
        this.wss.clients.forEach((client) => {
            if (client.readyState === WebSocket.OPEN) {
                client.close(1000, 'Server shutting down');
            }
        });
        this.wss.close();
        this.logger.info('WebSocketManager closed all connections');
    }
}
//# sourceMappingURL=WebSocketManager.js.map