/**
 * MCP Desktop Application API Documentation
 * 
 * This module contains comprehensive OpenAPI 3.0 specification
 * for the MCP Desktop Application REST API.
 */

export const openApiSpec = {
  openapi: '3.0.3',
  info: {
    title: 'MCP Desktop Application API',
    description: `
      REST API for the MCP (Model Context Protocol) Desktop Application.
      
      This API provides endpoints for:
      - Managing AI models (Ollama)
      - Chat interactions with models
      - Model configuration and lifecycle management
      
      ## Authentication
      Currently no authentication is required for local development.
      
      ## Rate Limiting
      - General API calls: 100 requests per 15 minutes per IP
      - Chat operations: 20 requests per minute per IP
      - Model operations: 10 requests per 5 minutes per IP
      
      ## Error Handling
      All errors follow a standardized format with correlation IDs for tracking.
      
      ## Streaming
      Streaming endpoints use Server-Sent Events (SSE) for real-time data.
    `,
    version: '1.0.0',
    contact: {
      name: 'MCP Desktop API Support',
      url: 'https://github.com/your-org/mcp-desktop-app'
    },
    license: {
      name: 'MIT',
      url: 'https://opensource.org/licenses/MIT'
    }
  },
  servers: [
    {
      url: 'http://localhost:3100',
      description: 'Local development server'
    }
  ],
  paths: {
    '/api/models': {
      get: {
        summary: 'List all models',
        description: 'Retrieve a list of all available models, both downloaded and available for download.',
        operationId: 'listModels',
        tags: ['Models'],
        responses: {
          '200': {
            description: 'Successful response',
            content: {
              'application/json': {
                schema: { $ref: '#/components/schemas/ModelListResponse' }
              }
            }
          },
          '500': {
            description: 'Internal server error',
            content: {
              'application/json': {
                schema: { $ref: '#/components/schemas/ErrorResponse' }
              }
            }
          },
          '503': {
            description: 'Ollama service unavailable',
            content: {
              'application/json': {
                schema: { $ref: '#/components/schemas/ErrorResponse' }
              }
            }
          }
        }
      }
    },
    '/api/models/{name}': {
      get: {
        summary: 'Get model details',
        description: 'Retrieve detailed information about a specific model.',
        operationId: 'getModel',
        tags: ['Models'],
        parameters: [
          {
            name: 'name',
            in: 'path',
            required: true,
            description: 'The name of the model',
            schema: {
              type: 'string',
              pattern: '^[a-zA-Z0-9][a-zA-Z0-9._:-]*$',
              maxLength: 100,
              example: 'llama3.2'
            }
          }
        ],
        responses: {
          '200': {
            description: 'Model details',
            content: {
              'application/json': {
                schema: { $ref: '#/components/schemas/ModelResponse' }
              }
            }
          },
          '404': {
            description: 'Model not found',
            content: {
              'application/json': {
                schema: { $ref: '#/components/schemas/ErrorResponse' }
              }
            }
          },
          '500': {
            description: 'Internal server error',
            content: {
              'application/json': {
                schema: { $ref: '#/components/schemas/ErrorResponse' }
              }
            }
          }
        }
      },
      delete: {
        summary: 'Delete a model',
        description: 'Remove a model from the system.',
        operationId: 'deleteModel',
        tags: ['Models'],
        parameters: [
          {
            name: 'name',
            in: 'path',
            required: true,
            description: 'The name of the model to delete',
            schema: {
              type: 'string',
              pattern: '^[a-zA-Z0-9][a-zA-Z0-9._:-]*$',
              maxLength: 100
            }
          }
        ],
        responses: {
          '200': {
            description: 'Model deleted successfully',
            content: {
              'application/json': {
                schema: { $ref: '#/components/schemas/SuccessResponse' }
              }
            }
          },
          '404': {
            description: 'Model not found',
            content: {
              'application/json': {
                schema: { $ref: '#/components/schemas/ErrorResponse' }
              }
            }
          },
          '429': {
            description: 'Rate limit exceeded',
            content: {
              'application/json': {
                schema: { $ref: '#/components/schemas/ErrorResponse' }
              }
            }
          }
        }
      }
    },
    '/api/models/{name}/pull': {
      post: {
        summary: 'Pull a model',
        description: 'Download and install a model. Returns a stream of progress updates.',
        operationId: 'pullModel',
        tags: ['Models'],
        parameters: [
          {
            name: 'name',
            in: 'path',
            required: true,
            description: 'The name of the model to pull',
            schema: {
              type: 'string',
              pattern: '^[a-zA-Z0-9][a-zA-Z0-9._:-]*$',
              maxLength: 100
            }
          }
        ],
        responses: {
          '200': {
            description: 'Model pull progress stream',
            content: {
              'text/event-stream': {
                schema: {
                  type: 'string',
                  description: 'Server-Sent Events stream with pull progress'
                },
                examples: {
                  progress: {
                    summary: 'Progress update',
                    value: 'data: {"status": "downloading", "progress": 45}\n\n'
                  },
                  complete: {
                    summary: 'Pull complete',
                    value: 'data: {"status": "complete"}\n\n'
                  },
                  error: {
                    summary: 'Pull error',
                    value: 'data: {"status": "error", "error": {"code": "OLLAMA_REQUEST_FAILED", "message": "Model not found"}}\n\n'
                  }
                }
              }
            }
          },
          '404': {
            description: 'Model not found',
            content: {
              'application/json': {
                schema: { $ref: '#/components/schemas/ErrorResponse' }
              }
            }
          },
          '429': {
            description: 'Rate limit exceeded',
            content: {
              'application/json': {
                schema: { $ref: '#/components/schemas/ErrorResponse' }
              }
            }
          }
        }
      }
    },
    '/api/models/{name}/config': {
      put: {
        summary: 'Update model configuration',
        description: 'Update the configuration settings for a specific model.',
        operationId: 'updateModelConfig',
        tags: ['Models'],
        parameters: [
          {
            name: 'name',
            in: 'path',
            required: true,
            description: 'The name of the model to configure',
            schema: {
              type: 'string',
              pattern: '^[a-zA-Z0-9][a-zA-Z0-9._:-]*$',
              maxLength: 100
            }
          }
        ],
        requestBody: {
          required: true,
          content: {
            'application/json': {
              schema: { $ref: '#/components/schemas/ModelConfigUpdate' }
            }
          }
        },
        responses: {
          '200': {
            description: 'Configuration updated successfully',
            content: {
              'application/json': {
                schema: { $ref: '#/components/schemas/ModelResponse' }
              }
            }
          },
          '400': {
            description: 'Invalid configuration',
            content: {
              'application/json': {
                schema: { $ref: '#/components/schemas/ErrorResponse' }
              }
            }
          },
          '404': {
            description: 'Model not found',
            content: {
              'application/json': {
                schema: { $ref: '#/components/schemas/ErrorResponse' }
              }
            }
          }
        }
      }
    },
    '/api/chat': {
      post: {
        summary: 'Chat with a model',
        description: 'Send a chat request to a model and receive a response.',
        operationId: 'chat',
        tags: ['Chat'],
        requestBody: {
          required: true,
          content: {
            'application/json': {
              schema: { $ref: '#/components/schemas/ChatRequest' }
            }
          }
        },
        responses: {
          '200': {
            description: 'Chat response',
            content: {
              'application/json': {
                schema: { $ref: '#/components/schemas/ChatResponse' }
              }
            }
          },
          '400': {
            description: 'Invalid request',
            content: {
              'application/json': {
                schema: { $ref: '#/components/schemas/ErrorResponse' }
              }
            }
          },
          '404': {
            description: 'Model not found',
            content: {
              'application/json': {
                schema: { $ref: '#/components/schemas/ErrorResponse' }
              }
            }
          },
          '409': {
            description: 'Model not ready',
            content: {
              'application/json': {
                schema: { $ref: '#/components/schemas/ErrorResponse' }
              }
            }
          },
          '429': {
            description: 'Rate limit exceeded',
            content: {
              'application/json': {
                schema: { $ref: '#/components/schemas/ErrorResponse' }
              }
            }
          },
          '503': {
            description: 'Ollama service unavailable',
            content: {
              'application/json': {
                schema: { $ref: '#/components/schemas/ErrorResponse' }
              }
            }
          }
        }
      }
    },
    '/api/chat/stream': {
      post: {
        summary: 'Stream chat with a model',
        description: 'Send a chat request to a model and receive a streaming response.',
        operationId: 'chatStream',
        tags: ['Chat'],
        requestBody: {
          required: true,
          content: {
            'application/json': {
              schema: { $ref: '#/components/schemas/ChatRequest' }
            }
          }
        },
        responses: {
          '200': {
            description: 'Streaming chat response',
            content: {
              'text/event-stream': {
                schema: {
                  type: 'string',
                  description: 'Server-Sent Events stream with chat response chunks'
                },
                examples: {
                  chunk: {
                    summary: 'Response chunk',
                    value: 'data: {"model": "llama3.2", "message": {"role": "assistant", "content": "Hello"}, "done": false}\n\n'
                  },
                  complete: {
                    summary: 'Response complete',
                    value: 'data: {"done": true}\n\n'
                  }
                }
              }
            }
          },
          '400': {
            description: 'Invalid request',
            content: {
              'application/json': {
                schema: { $ref: '#/components/schemas/ErrorResponse' }
              }
            }
          },
          '404': {
            description: 'Model not found',
            content: {
              'application/json': {
                schema: { $ref: '#/components/schemas/ErrorResponse' }
              }
            }
          },
          '429': {
            description: 'Rate limit exceeded',
            content: {
              'application/json': {
                schema: { $ref: '#/components/schemas/ErrorResponse' }
              }
            }
          }
        }
      }
    }
  },
  components: {
    schemas: {
      ChatMessage: {
        type: 'object',
        required: ['role', 'content'],
        properties: {
          role: {
            type: 'string',
            enum: ['system', 'user', 'assistant'],
            description: 'The role of the message sender'
          },
          content: {
            type: 'string',
            minLength: 1,
            maxLength: 32000,
            description: 'The content of the message'
          }
        },
        example: {
          role: 'user',
          content: 'Hello, how are you?'
        }
      },
      ChatOptions: {
        type: 'object',
        properties: {
          temperature: {
            type: 'number',
            minimum: 0,
            maximum: 2,
            description: 'Controls randomness in response generation'
          },
          top_p: {
            type: 'number',
            minimum: 0,
            maximum: 1,
            description: 'Controls diversity via nucleus sampling'
          },
          top_k: {
            type: 'integer',
            minimum: 1,
            description: 'Limits the number of tokens considered at each step'
          },
          max_tokens: {
            type: 'integer',
            minimum: 1,
            maximum: 100000,
            description: 'Maximum number of tokens to generate'
          },
          stop: {
            type: 'array',
            items: {
              type: 'string',
              maxLength: 50
            },
            maxItems: 10,
            description: 'Stop sequences for generation'
          }
        },
        example: {
          temperature: 0.7,
          top_p: 0.9,
          max_tokens: 2000
        }
      },
      ChatRequest: {
        type: 'object',
        required: ['model', 'messages'],
        properties: {
          model: {
            type: 'string',
            pattern: '^[a-zA-Z0-9][a-zA-Z0-9._:-]*$',
            maxLength: 100,
            description: 'The name of the model to chat with'
          },
          messages: {
            type: 'array',
            items: { $ref: '#/components/schemas/ChatMessage' },
            minItems: 1,
            maxItems: 100,
            description: 'The conversation messages'
          },
          options: {
            $ref: '#/components/schemas/ChatOptions'
          }
        },
        example: {
          model: 'llama3.2',
          messages: [
            {
              role: 'user',
              content: 'Hello, how are you?'
            }
          ],
          options: {
            temperature: 0.7,
            max_tokens: 2000
          }
        }
      },
      ChatResponse: {
        type: 'object',
        properties: {
          success: {
            type: 'boolean',
            example: true
          },
          data: {
            type: 'object',
            properties: {
              model: {
                type: 'string',
                description: 'The model that generated the response'
              },
              message: {
                $ref: '#/components/schemas/ChatMessage'
              },
              done: {
                type: 'boolean',
                description: 'Whether the response is complete'
              }
            }
          },
          correlationId: {
            type: 'string',
            description: 'Request correlation ID for tracking'
          },
          timestamp: {
            type: 'string',
            format: 'date-time',
            description: 'Response timestamp'
          }
        }
      },
      ModelConfigUpdate: {
        type: 'object',
        properties: {
          temperature: {
            type: 'number',
            minimum: 0,
            maximum: 2
          },
          topP: {
            type: 'number',
            minimum: 0,
            maximum: 1
          },
          topK: {
            type: 'integer',
            minimum: 1
          },
          maxTokens: {
            type: 'integer',
            minimum: 1,
            maximum: 100000
          },
          systemPrompt: {
            type: 'string',
            maxLength: 32000
          }
        },
        example: {
          temperature: 0.8,
          topP: 0.9,
          maxTokens: 4000,
          systemPrompt: 'You are a helpful assistant.'
        }
      },
      Model: {
        type: 'object',
        properties: {
          name: {
            type: 'string',
            description: 'Model name'
          },
          size: {
            type: 'string',
            description: 'Model size in bytes (as string to handle large numbers)'
          },
          digest: {
            type: 'string',
            description: 'Model digest/hash'
          },
          format: {
            type: 'string',
            description: 'Model format (e.g., gguf)'
          },
          family: {
            type: 'string',
            description: 'Model family (e.g., llama)'
          },
          status: {
            type: 'string',
            enum: ['READY', 'NOT_DOWNLOADED', 'DOWNLOADING', 'ERROR'],
            description: 'Current model status'
          },
          details: {
            type: 'object',
            description: 'Model-specific details and parameters'
          },
          configuration: {
            type: 'object',
            description: 'Model configuration settings'
          }
        }
      },
      ModelListResponse: {
        type: 'object',
        properties: {
          success: {
            type: 'boolean',
            example: true
          },
          data: {
            type: 'object',
            properties: {
              models: {
                type: 'array',
                items: { $ref: '#/components/schemas/Model' }
              }
            }
          },
          correlationId: {
            type: 'string'
          },
          timestamp: {
            type: 'string',
            format: 'date-time'
          }
        }
      },
      ModelResponse: {
        type: 'object',
        properties: {
          success: {
            type: 'boolean',
            example: true
          },
          data: {
            $ref: '#/components/schemas/Model'
          },
          correlationId: {
            type: 'string'
          },
          timestamp: {
            type: 'string',
            format: 'date-time'
          }
        }
      },
      SuccessResponse: {
        type: 'object',
        properties: {
          success: {
            type: 'boolean',
            example: true
          },
          data: {
            type: 'object',
            description: 'Success response data'
          },
          correlationId: {
            type: 'string'
          },
          timestamp: {
            type: 'string',
            format: 'date-time'
          }
        }
      },
      ErrorResponse: {
        type: 'object',
        properties: {
          error: {
            type: 'object',
            properties: {
              code: {
                type: 'string',
                description: 'Error code for programmatic handling'
              },
              message: {
                type: 'string',
                description: 'Human-readable error message'
              },
              details: {
                type: 'object',
                description: 'Additional error details'
              },
              correlationId: {
                type: 'string',
                description: 'Request correlation ID for tracking'
              },
              timestamp: {
                type: 'string',
                format: 'date-time',
                description: 'Error timestamp'
              }
            },
            required: ['code', 'message', 'timestamp']
          }
        },
        example: {
          error: {
            code: 'MODEL_NOT_FOUND',
            message: 'Model \'invalid-model\' not found',
            details: {
              modelName: 'invalid-model'
            },
            correlationId: 'req-123456',
            timestamp: '2024-01-01T12:00:00.000Z'
          }
        }
      }
    },
    headers: {
      'X-Correlation-ID': {
        description: 'Request correlation ID for tracking',
        schema: {
          type: 'string'
        }
      }
    }
  },
  tags: [
    {
      name: 'Models',
      description: 'Operations for managing AI models'
    },
    {
      name: 'Chat',
      description: 'Operations for chatting with AI models'
    }
  ]
};

// Generate API documentation as HTML
export const generateApiDocsHtml = () => {
  return `
<!DOCTYPE html>
<html>
<head>
  <title>MCP Desktop API Documentation</title>
  <link rel="stylesheet" type="text/css" href="https://unpkg.com/swagger-ui-dist@3.52.5/swagger-ui.css" />
  <style>
    html {
      box-sizing: border-box;
      overflow: -moz-scrollbars-vertical;
      overflow-y: scroll;
    }
    *, *:before, *:after {
      box-sizing: inherit;
    }
    body {
      margin:0;
      background: #fafafa;
    }
  </style>
</head>
<body>
  <div id="swagger-ui"></div>
  <script src="https://unpkg.com/swagger-ui-dist@3.52.5/swagger-ui-bundle.js"></script>
  <script src="https://unpkg.com/swagger-ui-dist@3.52.5/swagger-ui-standalone-preset.js"></script>
  <script>
    window.onload = function() {
      const ui = SwaggerUIBundle({
        spec: ${JSON.stringify(openApiSpec)},
        dom_id: '#swagger-ui',
        deepLinking: true,
        presets: [
          SwaggerUIBundle.presets.apis,
          SwaggerUIStandalonePreset
        ],
        plugins: [
          SwaggerUIBundle.plugins.DownloadUrl
        ],
        layout: "StandaloneLayout"
      });
    };
  </script>
</body>
</html>
  `;
};

// Export types for TypeScript
export interface APIDocumentation {
  openApiSpec: typeof openApiSpec;
  generateHtml: () => string;
}

export const apiDocumentation: APIDocumentation = {
  openApiSpec,
  generateHtml: generateApiDocsHtml
};