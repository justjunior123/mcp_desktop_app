import WebSocket from 'ws';

export interface WebSocketMessage {
  type: string;
  payload: any;
}

export class WebSocketTestClient {
  private ws: WebSocket;
  private messageQueue: WebSocketMessage[] = [];
  private messagePromiseResolvers: ((message: WebSocketMessage) => void)[] = [];

  constructor(url: string) {
    this.ws = new WebSocket(url);
    this.ws.on('message', (data) => {
      const message = JSON.parse(data.toString()) as WebSocketMessage;
      if (this.messagePromiseResolvers.length > 0) {
        const resolver = this.messagePromiseResolvers.shift()!;
        resolver(message);
      } else {
        this.messageQueue.push(message);
      }
    });
  }

  async waitForConnection(): Promise<void> {
    if (this.ws.readyState === WebSocket.OPEN) {
      return;
    }
    return new Promise<void>((resolve, reject) => {
      this.ws.once('open', () => resolve());
      this.ws.once('error', reject);
    });
  }

  async waitForMessage(): Promise<WebSocketMessage> {
    if (this.messageQueue.length > 0) {
      return this.messageQueue.shift()!;
    }
    return new Promise<WebSocketMessage>((resolve) => {
      this.messagePromiseResolvers.push(resolve);
    });
  }

  async waitForMessageOfType(type: string, timeout = 5000): Promise<WebSocketMessage> {
    const startTime = Date.now();
    while (Date.now() - startTime < timeout) {
      const message = await this.waitForMessage();
      if (message.type === type) {
        return message;
      }
      // Keep looking for the right message type
      this.messageQueue.push(message);
    }
    throw new Error(`Timeout waiting for message type: ${type}`);
  }

  send(message: WebSocketMessage): void {
    this.ws.send(JSON.stringify(message));
  }

  sendRaw(data: string): void {
    this.ws.send(data);
  }

  close(): void {
    if (this.ws.readyState === WebSocket.OPEN) {
      this.ws.close();
    }
  }

  isConnected(): boolean {
    return this.ws.readyState === WebSocket.OPEN;
  }

  onError(handler: (error: Error) => void): void {
    this.ws.on('error', handler);
  }

  onClose(handler: (code: number, reason: string) => void): void {
    this.ws.on('close', handler);
  }
} 