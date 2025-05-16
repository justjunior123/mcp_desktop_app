import { OllamaModelDetails } from '../services/ollama/ModelManager';

export type WebSocketMessageType = 
  | 'initialStatus'
  | 'modelStatusUpdate'
  | 'modelDetails'
  | 'parametersSaved'
  | 'error'
  | 'refreshModels';

export interface WebSocketMessage {
  type: WebSocketMessageType;
  payload: any; // We'll type this more specifically based on the message type
}

export interface WebSocketInitialStatus {
  type: 'initialStatus';
  payload: {
    models: OllamaModelDetails[];
  };
}

export interface WebSocketModelStatusUpdate {
  type: 'modelStatusUpdate';
  payload: {
    modelId: string;
    status: string;
    progress?: number;
  };
}

export interface WebSocketModelDetails {
  type: 'modelDetails';
  payload: OllamaModelDetails;
}

export interface WebSocketParametersSaved {
  type: 'parametersSaved';
  payload: {
    modelId: string;
    success: boolean;
  };
}

export interface WebSocketError {
  type: 'error';
  payload: {
    message: string;
    code?: string;
  };
}

export interface WebSocketRefreshModels {
  type: 'refreshModels';
  payload?: undefined;
}

export type WebSocketMessageUnion = 
  | WebSocketInitialStatus
  | WebSocketModelStatusUpdate
  | WebSocketModelDetails
  | WebSocketParametersSaved
  | WebSocketError
  | WebSocketRefreshModels; 