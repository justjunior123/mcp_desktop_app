export interface Tool {
  name: string;
  description: string;
  parameters: {
    type: 'object';
    properties: Record<string, {
      type: string;
      description: string;
      required?: boolean;
    }>;
    required: string[];
  };
  returns?: {
    type: 'object';
    properties: Record<string, unknown>;
  };
}

export interface Message {
  role: 'user' | 'assistant';
  content: {
    type: 'text';
    text: string;
  };
}

export interface ToolRequest {
  name: string;
  arguments: Record<string, unknown>;
}

export interface ToolResponse {
  result: unknown;
}

export interface ServerInfo {
  name: string;
  version: string;
  capabilities?: {
    tools?: boolean;
    prompts?: boolean;
    resources?: boolean;
  };
} 