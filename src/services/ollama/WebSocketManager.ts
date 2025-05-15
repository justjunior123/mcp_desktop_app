import WebSocket from 'ws';
import http from 'http';
import { ModelManager, ModelStatusUpdate } from './ModelManager';
import { logger } from '../logging';
import { OllamaService } from './OllamaService';

export interface WebSocketMessage {
  type: string;
  payload: any;
}

/**
 * Manager for WebSocket connections to provide real-time updates
 */
export class WebSocketManager {
  private wss: WebSocket.Server;
  private modelManager: ModelManager;
  private ollamaService: OllamaService;
  private clients: Set<WebSocket> = new Set();
  private logger = logger.withCategory('websocket-manager');

  /**
   * Create a new WebSocket manager
   * @param server HTTP server to attach to
   * @param modelManager Model manager to listen to for updates
   * @param ollamaService Ollama service for direct operations
   */
  constructor(server: http.Server, modelManager: ModelManager, ollamaService: OllamaService) {
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
  private setupConnectionHandler(): void {
    this.wss.on('connection', (ws: WebSocket) => {
      this.logger.info('New WebSocket connection established');
      
      // Add to clients set
      this.clients.add(ws);
      
      // Send immediate status update with current models
      this.sendInitialStatus(ws);
      
      // Setup message handler
      ws.on('message', (messageData: WebSocket.Data) => {
        try {
          // Convert buffer or array buffer to string if needed
          const messageStr = typeof messageData === 'string' 
            ? messageData 
            : messageData instanceof Buffer 
              ? messageData.toString('utf-8') 
              : messageData.toString();
          
          const parsed = JSON.parse(messageStr) as WebSocketMessage;
          this.handleMessage(ws, parsed);
        } catch (error) {
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
      ws.on('error', (error: Error) => {
        this.logger.error('WebSocket error', { error });
        this.clients.delete(ws);
      });
    });
  }

  /**
   * Set up listener for model status updates
   */
  private setupModelStatusListener(): void {
    this.modelManager.on('modelStatusUpdate', (update: ModelStatusUpdate) => {
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
  private async sendInitialStatus(ws: WebSocket): Promise<void> {
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
    } catch (error) {
      this.logger.error('Error sending initial status', { error });
    }
  }

  /**
   * Handle incoming WebSocket messages
   * @param ws WebSocket connection
   * @param message Parsed message
   */
  private async handleMessage(ws: WebSocket, message: WebSocketMessage): Promise<void> {
    this.logger.debug('Received WebSocket message', { type: message.type });
    
    try {
      switch (message.type) {
        case 'ping':
          // Simple ping/pong for testing connection
          this.send(ws, { type: 'pong', payload: { timestamp: new Date().toISOString() } });
          break;
          
        case 'refreshModels':
          // Refresh models and send updated list
          await this.modelManager.refreshModelStatuses();
          const models = await this.modelManager.listModelsWithDetails();
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
          
          await this.modelManager.saveModelParameters(
            message.payload.modelId, 
            message.payload.parameters
          );
          
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
          
        default:
          this.logger.warn('Unknown message type', { type: message.type });
          this.send(ws, { 
            type: 'error', 
            payload: { message: `Unknown message type: ${message.type}` } 
          });
      }
    } catch (error) {
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
  private send(ws: WebSocket, message: WebSocketMessage): void {
    if (ws.readyState === WebSocket.OPEN) {
      try {
        ws.send(JSON.stringify(message));
      } catch (error) {
        this.logger.error('Error sending WebSocket message', { error });
      }
    }
  }

  /**
   * Broadcast a message to all connected clients
   * @param message Message to broadcast
   */
  public broadcast(message: WebSocketMessage): void {
    this.clients.forEach(client => {
      this.send(client, message);
    });
  }

  /**
   * Close all WebSocket connections
   */
  public closeAll(): void {
    this.wss.clients.forEach((client: WebSocket) => {
      if (client.readyState === WebSocket.OPEN) {
        client.close(1000, 'Server shutting down');
      }
    });
    
    this.wss.close();
    this.logger.info('WebSocketManager closed all connections');
  }
} 