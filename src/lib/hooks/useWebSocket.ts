import { useEffect, useRef, useCallback } from 'react';
import { WebSocketMessageUnion } from '../../types/websocket';

interface WebSocketHookOptions {
  onMessage: (message: WebSocketMessageUnion) => void;
  onConnect?: () => void;
  onDisconnect?: () => void;
}

export const useWebSocket = (url: string, options: WebSocketHookOptions) => {
  const wsRef = useRef<WebSocket | null>(null);
  const reconnectTimeoutRef = useRef<NodeJS.Timeout>();

  const connect = useCallback(() => {
    if (wsRef.current?.readyState === WebSocket.OPEN) {
      return;
    }

    wsRef.current = new WebSocket(url);

    wsRef.current.onopen = () => {
      console.log('WebSocket connected');
      options.onConnect?.();
    };

    wsRef.current.onclose = () => {
      console.log('WebSocket disconnected');
      options.onDisconnect?.();

      // Attempt to reconnect after 5 seconds
      reconnectTimeoutRef.current = setTimeout(() => {
        connect();
      }, 5000);
    };

    wsRef.current.onmessage = (event) => {
      try {
        const message = JSON.parse(event.data);
        options.onMessage(message);
      } catch (error) {
        console.error('Error parsing WebSocket message:', error);
      }
    };
  }, [url, options]);

  useEffect(() => {
    connect();

    return () => {
      if (wsRef.current) {
        wsRef.current.close();
        wsRef.current = null;
      }
      if (reconnectTimeoutRef.current) {
        clearTimeout(reconnectTimeoutRef.current);
      }
    };
  }, [connect]);

  const sendMessage = useCallback((message: WebSocketMessageUnion) => {
    if (wsRef.current?.readyState === WebSocket.OPEN) {
      wsRef.current.send(JSON.stringify(message));
    } else {
      console.warn('WebSocket is not connected');
    }
  }, []);

  return {
    sendMessage,
    isConnected: wsRef.current?.readyState === WebSocket.OPEN,
  };
}; 