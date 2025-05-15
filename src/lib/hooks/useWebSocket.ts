import { useState, useEffect, useRef, useCallback } from 'react';

interface WebSocketMessage {
  type: string;
  payload: any;
}

interface UseWebSocketOptions {
  onMessage?: (message: WebSocketMessage) => void;
  onConnect?: () => void;
  onDisconnect?: () => void;
  onError?: (error: Event) => void;
  reconnectInterval?: number;
  maxReconnectAttempts?: number;
}

/**
 * React hook for managing WebSocket connections
 * @param url WebSocket URL to connect to
 * @param options Configuration options
 * @returns An object with WebSocket state and methods
 */
export const useWebSocket = (
  url: string,
  options: UseWebSocketOptions = {}
) => {
  const [isConnected, setIsConnected] = useState(false);
  const [error, setError] = useState<Event | null>(null);
  const [reconnectAttempts, setReconnectAttempts] = useState(0);
  const websocketRef = useRef<WebSocket | null>(null);
  const optionsRef = useRef(options);
  
  // Update the options ref when options change
  useEffect(() => {
    optionsRef.current = options;
  }, [options]);
  
  const {
    reconnectInterval = 3000,
    maxReconnectAttempts = 5
  } = options;

  // Connect to WebSocket
  const connect = useCallback(() => {
    if (websocketRef.current?.readyState === WebSocket.OPEN) {
      return;
    }
    
    try {
      const ws = new WebSocket(url);
      
      ws.onopen = () => {
        console.log('WebSocket connected');
        setIsConnected(true);
        setError(null);
        setReconnectAttempts(0);
        optionsRef.current.onConnect?.();
      };
      
      ws.onmessage = (event) => {
        try {
          const message = JSON.parse(event.data) as WebSocketMessage;
          optionsRef.current.onMessage?.(message);
        } catch (e) {
          console.error('Error parsing WebSocket message:', e);
        }
      };
      
      ws.onclose = () => {
        console.log('WebSocket disconnected');
        setIsConnected(false);
        optionsRef.current.onDisconnect?.();
        
        // Attempt to reconnect if not intentionally closed
        if (reconnectAttempts < maxReconnectAttempts) {
          setTimeout(() => {
            setReconnectAttempts(prev => prev + 1);
            connect();
          }, reconnectInterval);
        }
      };
      
      ws.onerror = (err) => {
        console.error('WebSocket error:', err);
        setError(err);
        optionsRef.current.onError?.(err);
      };
      
      websocketRef.current = ws;
    } catch (error) {
      console.error('Error creating WebSocket connection:', error);
      setError(error as Event);
      optionsRef.current.onError?.(error as Event);
    }
  }, [url, reconnectInterval, maxReconnectAttempts, reconnectAttempts]);

  // Disconnect from WebSocket
  const disconnect = useCallback(() => {
    if (websocketRef.current) {
      websocketRef.current.close();
      websocketRef.current = null;
    }
  }, []);

  // Send a message through WebSocket
  const sendMessage = useCallback((message: any) => {
    if (websocketRef.current?.readyState === WebSocket.OPEN) {
      websocketRef.current.send(JSON.stringify(message));
    } else {
      console.error('WebSocket is not connected');
    }
  }, []);

  // Connect on mount, disconnect on unmount
  useEffect(() => {
    connect();
    
    return () => {
      disconnect();
    };
  }, [connect, disconnect]);

  return {
    isConnected,
    error,
    reconnectAttempts,
    sendMessage,
    connect,
    disconnect
  };
}; 