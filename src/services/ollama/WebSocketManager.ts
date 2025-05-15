import WebSocket from 'ws';
import { ModelManager } from './ModelManager';
import { logger } from '../logging';

interface WebSocketMessage {
  type: string;
  data: Record<string, unknown> | string | null;
}

interface WebSocketResponse {
  type: string;
  data: Record<string, unknown>;
}

type WebSocketErrorResponse = {
  type: 'error';
  data: {
    message: string;
  };
};

/**
 * Manager for WebSocket connections to provide real-time updates
 */
export class WebSocketManager {
  private clients: Set<WebSocket> = new Set();
  private modelManager: ModelManager;

  /**
   * Create a new WebSocket manager
   * @param modelManager Model manager to listen to for updates
   */
  constructor(modelManager: ModelManager) {
    this.modelManager = modelManager;
  }

  public addClient(client: WebSocket): void {
    this.clients.add(client);
    logger.info('Client connected');

    client.on('message', async (rawMessage: string) => {
      try {
        // Validate message format before parsing
        const message = this.parseMessage(rawMessage);
        if (!message) {
          this.sendError(client, 'Invalid message format');
          return;
        }
        await this.handleMessage(client, message);
      } catch (error) {
        logger.error('Error handling message:', error);
        this.sendError(client, 'Invalid message format');
      }
    });

    client.on('close', () => {
      this.clients.delete(client);
      logger.info('Client disconnected');
    });

    client.on('error', (error) => {
      logger.error('WebSocket error:', error);
      this.clients.delete(client);
    });
  }

  private parseMessage(rawMessage: string): WebSocketMessage | null {
    try {
      const parsed = JSON.parse(rawMessage);
      if (
        typeof parsed === 'object' &&
        parsed !== null &&
        typeof parsed.type === 'string' &&
        (
          parsed.data === null ||
          typeof parsed.data === 'string' ||
          (typeof parsed.data === 'object' && parsed.data !== null)
        )
      ) {
        return parsed as WebSocketMessage;
      }
      return null;
    } catch {
      return null;
    }
  }

  private async handleMessage(client: WebSocket, message: WebSocketMessage): Promise<void> {
    try {
      switch (message.type) {
        case 'listModels': {
          const models = await this.modelManager.listModelsWithDetails();
          this.sendToClient(client, {
            type: 'modelList',
            data: { models }
          });
          break;
        }
        case 'getModel': {
          if (typeof message.data !== 'string') {
            this.sendError(client, 'Invalid model ID');
            break;
          }
          const model = await this.modelManager.getModelWithDetails(message.data);
          this.sendToClient(client, {
            type: 'modelDetails',
            data: { model }
          });
          break;
        }
        default:
          this.sendError(client, 'Unknown message type');
      }
    } catch (error) {
      logger.error('Error handling message:', error);
      this.sendError(client, error instanceof Error ? error.message : 'Internal server error');
    }
  }

  private sendToClient(client: WebSocket, message: WebSocketResponse | WebSocketErrorResponse): void {
    try {
      client.send(JSON.stringify(message));
    } catch (error) {
      logger.error('Error sending message to client:', error);
      this.clients.delete(client);
    }
  }

  private sendError(client: WebSocket, message: string): void {
    const errorResponse: WebSocketErrorResponse = {
      type: 'error',
      data: { message }
    };
    this.sendToClient(client, errorResponse);
  }

  /**
   * Broadcast a message to all connected clients
   * @param message Message to broadcast
   */
  public broadcast(message: WebSocketResponse | WebSocketErrorResponse): void {
    this.clients.forEach(client => {
      if (client.readyState === WebSocket.OPEN) {
        this.sendToClient(client, message);
      }
    });
  }

  /**
   * Close all WebSocket connections
   */
  public close(): void {
    this.clients.forEach(client => {
      client.close();
    });
    this.clients.clear();
  }
} 