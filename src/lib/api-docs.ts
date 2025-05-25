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
      - MCP protocol integration
      - Health monitoring and system status
      
      ## Authentication
      Currently no authentication is required for local development.
      
      ## Rate Limiting
      - General API calls: 100 requests per minute per IP
      - Chat operations: 30 requests per minute per IP
      - Model operations: 10 requests per minute per IP
      
      ## Error Handling
      All errors follow a standardized format with correlation IDs for tracking.
      Each request gets a unique correlation ID that can be used to track the request
      across all services and logs.
      
      ## Streaming
      Streaming endpoints use Server-Sent Events (SSE) for real-time data including
      model download progress and chat response streaming.
      
      ## Security Features
      - Input validation using Zod schemas
      - Request sanitization (XSS protection)
      - CORS configuration for allowed origins
      - Comprehensive audit logging
      - Timeout handling for all requests
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
    '/health': {
      get: {
        summary: 'Health check',
        description: 'Check the overall health of the application and Ollama service.',
        operationId: 'healthCheck',
        tags: ['System'],
        responses: {
          '200': {
            description: 'Service is healthy',
            content: {
              'application/json': {
                schema: {
                  type: 'object',
                  properties: {
                    status: { type: 'string', example: 'ok' },
                    timestamp: { type: 'string', format: 'date-time' }
                  }
                }
              }
            }
          },
          '503': {
            description: 'Service is unhealthy',
            content: {
              'application/json': {
                schema: {
                  type: 'object',
                  properties: {
                    status: { type: 'string', example: 'error' },
                    message: { type: 'string', example: 'Ollama service is not available' }
                  }
                }
              }
            }
          }
        }
      }
    },
    '/api/models': {
      get: {
        summary: 'List all models',
        description: 'Retrieve a list of all available models, both downloaded and available for download. This endpoint syncs with Ollama before returning the list.',
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
      },
      post: {
        summary: 'Create/pull a model',
        description: 'Download and install a new model from the Ollama registry.',
        operationId: 'createModel',
        tags: ['Models'],
        requestBody: {
          required: true,
          content: {
            'application/json': {
              schema: {
                type: 'object',
                required: ['name'],
                properties: {
                  name: {
                    type: 'string',
                    pattern: '^[a-zA-Z0-9][a-zA-Z0-9._:-]*$',
                    maxLength: 100,
                    description: 'The name of the model to pull'
                  },
                  configuration: {
                    type: 'object',
                    description: 'Optional initial configuration for the model'
                  }
                },
                example: {
                  name: 'mistral:latest'
                }
              }
            }
          }
        },
        responses: {
          '201': {
            description: 'Model pull started',
            content: {
              'application/json': {
                schema: { $ref: '#/components/schemas/SuccessResponse' }
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
          '500': {
            description: 'Internal server error',
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
              example: 'mistral:latest'
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
          '503': {
            description: 'Ollama service unavailable',
            content: {
              'application/json': {
                schema: { $ref: '#/components/schemas/ErrorResponse' }
              }
            }
          }
        }
      },
      put: {
        summary: 'Update model',
        description: 'Update model configuration settings.',
        operationId: 'updateModel',
        tags: ['Models'],
        parameters: [
          {
            name: 'name',
            in: 'path',
            required: true,
            description: 'The name of the model to update',
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
            description: 'Model updated successfully',
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
          '204': {
            description: 'Model deleted successfully'
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
        summary: 'Pull a model with progress',
        description: 'Download and install a model with real-time progress updates via Server-Sent Events.',
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
                    value: 'data: {"status": "complete", "correlationId": "req_123abc", "timestamp": "2024-01-15T12:35:00.000Z"}\n\n'
                  },
                  error: {
                    summary: 'Pull error',
                    value: 'data: {"status": "error", "error": {"code": "OLLAMA_REQUEST_FAILED", "message": "Model not found", "correlationId": "req_123abc"}}\n\n'
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
                schema: { $ref: '#/components/schemas/SuccessResponse' }
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
    '/api/models/{name}/chat': {
      post: {
        summary: 'Chat with a specific model',
        description: 'Send a chat request to a specific model using its configured settings.',
        operationId: 'chatWithModel',
        tags: ['Chat'],
        parameters: [
          {
            name: 'name',
            in: 'path',
            required: true,
            description: 'The name of the model to chat with',
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
              schema: {
                type: 'object',
                required: ['messages'],
                properties: {
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
                }
              }
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
    '/api/models/{name}/chat/stream': {
      post: {
        summary: 'Streaming chat with a specific model',
        description: 'Send a chat request to a specific model and receive streaming response chunks.',
        operationId: 'chatStreamWithModel',
        tags: ['Chat'],
        parameters: [
          {
            name: 'name',
            in: 'path',
            required: true,
            description: 'The name of the model to chat with',
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
              schema: {
                type: 'object',
                required: ['messages'],
                properties: {
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
                }
              }
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
                    value: 'data: {"model": "mistral:latest", "message": {"role": "assistant", "content": "Hello"}, "done": false}\n\n'
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
                    value: 'data: {"model": "mistral:latest", "message": {"role": "assistant", "content": "Hello"}, "done": false}\n\n'
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
    },
    '/mcp': {
      post: {
        summary: 'MCP protocol endpoint',
        description: 'Direct interface to the Model Context Protocol for tool execution and session management.',
        operationId: 'mcpProtocol',
        tags: ['MCP'],
        requestBody: {
          required: true,
          content: {
            'application/json': {
              schema: {
                type: 'object',
                properties: {
                  id: {
                    type: 'string',
                    description: 'Request ID'
                  },
                  prompt: {
                    type: 'string',
                    description: 'Prompt or command to execute'
                  },
                  model: {
                    type: 'string',
                    description: 'Model to use for the request'
                  }
                },
                example: {
                  id: 'request-123',
                  prompt: 'Execute file listing tool',
                  model: 'mistral:latest'
                }
              }
            }
          }
        },
        responses: {
          '200': {
            description: 'MCP response',
            content: {
              'application/json': {
                schema: {
                  type: 'object',
                  description: 'MCP protocol response'
                }
              }
            }
          },
          '500': {
            description: 'MCP service error',
            content: {
              'application/json': {
                schema: { $ref: '#/components/schemas/ErrorResponse' }
              }
            }
          }
        }
      }
    },
    '/api/tools': {
      get: {
        summary: 'List available tools',
        description: 'Retrieve a list of all available MCP tools (currently placeholder).',
        operationId: 'listTools',
        tags: ['Tools'],
        responses: {
          '200': {
            description: 'List of tools',
            content: {
              'application/json': {
                schema: {
                  type: 'object',
                  properties: {
                    data: {
                      type: 'array',
                      items: {
                        type: 'object',
                        description: 'Tool definition'
                      }
                    }
                  }
                }
              }
            }
          }
        }
      }
    },
    '/api/tools/{name}': {
      get: {
        summary: 'Get tool details',
        description: 'Retrieve detailed information about a specific tool (currently placeholder).',
        operationId: 'getTool',
        tags: ['Tools'],
        parameters: [
          {
            name: 'name',
            in: 'path',
            required: true,
            description: 'The name of the tool',
            schema: {
              type: 'string'
            }
          }
        ],
        responses: {
          '404': {
            description: 'Tool not found',
            content: {
              'application/json': {
                schema: { $ref: '#/components/schemas/ErrorResponse' }
              }
            }
          }
        }
      }
    },
    '/api/prompts': {
      get: {
        summary: 'List available prompts',
        description: 'Retrieve a list of all available MCP prompts (currently placeholder).',
        operationId: 'listPrompts',
        tags: ['Prompts'],
        responses: {
          '200': {
            description: 'List of prompts',
            content: {
              'application/json': {
                schema: {
                  type: 'object',
                  properties: {
                    data: {
                      type: 'array',
                      items: {
                        type: 'object',
                        description: 'Prompt definition'
                      }
                    }
                  }
                }
              }
            }
          }
        }
      }
    },
    '/api/prompts/{name}': {
      get: {
        summary: 'Get prompt details',
        description: 'Retrieve detailed information about a specific prompt (currently placeholder).',
        operationId: 'getPrompt',
        tags: ['Prompts'],
        parameters: [
          {
            name: 'name',
            in: 'path',
            required: true,
            description: 'The name of the prompt',
            schema: {
              type: 'string'
            }
          }
        ],
        responses: {
          '404': {
            description: 'Prompt not found',
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
          repeat_penalty: {
            type: 'number',
            minimum: 0.1,
            maximum: 2.0,
            description: 'Penalty for repeating tokens'
          },
          num_ctx: {
            type: 'integer',
            minimum: 1,
            maximum: 100000,
            description: 'Context window size'
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
          top_k: 40,
          repeat_penalty: 1.1,
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
          model: 'mistral:latest',
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
              },
              eval_count: {
                type: 'integer',
                description: 'Number of tokens evaluated'
              },
              eval_duration: {
                type: 'integer',
                description: 'Evaluation duration in nanoseconds'
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
          top_p: {
            type: 'number',
            minimum: 0,
            maximum: 1
          },
          top_k: {
            type: 'integer',
            minimum: 1
          },
          repeat_penalty: {
            type: 'number',
            minimum: 0.1,
            maximum: 2.0
          },
          num_ctx: {
            type: 'integer',
            minimum: 1,
            maximum: 100000
          },
          max_tokens: {
            type: 'integer',
            minimum: 1,
            maximum: 100000
          },
          system_prompt: {
            type: 'string',
            maxLength: 32000,
            description: 'System prompt for the model'
          }
        },
        example: {
          temperature: 0.8,
          top_p: 0.9,
          top_k: 40,
          repeat_penalty: 1.1,
          num_ctx: 4096,
          max_tokens: 4000,
          system_prompt: 'You are a helpful assistant.'
        }
      },
      Model: {
        type: 'object',
        properties: {
          id: {
            type: 'string',
            description: 'Unique model identifier'
          },
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
          },
          capabilities: {
            type: 'array',
            items: {
              type: 'string'
            },
            description: 'Model capabilities (e.g., chat, completion)'
          },
          createdAt: {
            type: 'string',
            format: 'date-time',
            description: 'Model creation timestamp'
          },
          updatedAt: {
            type: 'string',
            format: 'date-time',
            description: 'Model last update timestamp'
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
                enum: [
                  'MODEL_NOT_FOUND',
                  'MODEL_NOT_READY',
                  'OLLAMA_SERVICE_UNAVAILABLE',
                  'OLLAMA_REQUEST_FAILED',
                  'OLLAMA_TIMEOUT',
                  'RATE_LIMIT_EXCEEDED',
                  'INVALID_REQUEST',
                  'INTERNAL_SERVER_ERROR',
                  'NOT_FOUND',
                  'SERVICE_UNAVAILABLE',
                  'GATEWAY_TIMEOUT'
                ],
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
      },
      'X-RateLimit-Limit': {
        description: 'Request rate limit for the endpoint',
        schema: {
          type: 'integer'
        }
      },
      'X-RateLimit-Remaining': {
        description: 'Remaining requests in the current window',
        schema: {
          type: 'integer'
        }
      },
      'X-RateLimit-Reset': {
        description: 'Timestamp when the rate limit resets',
        schema: {
          type: 'integer'
        }
      }
    },
    securitySchemes: {
      ApiKey: {
        type: 'apiKey',
        in: 'header',
        name: 'X-API-Key',
        description: 'API key for authentication (future use)'
      }
    }
  },
  tags: [
    {
      name: 'System',
      description: 'System health and status operations'
    },
    {
      name: 'Models',
      description: 'Operations for managing AI models'
    },
    {
      name: 'Chat',
      description: 'Operations for chatting with AI models'
    },
    {
      name: 'MCP',
      description: 'Model Context Protocol operations'
    },
    {
      name: 'Tools',
      description: 'MCP tool management (planned)'
    },
    {
      name: 'Prompts',
      description: 'MCP prompt management (planned)'
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
  <link rel="stylesheet" type="text/css" href="https://unpkg.com/swagger-ui-dist@5.9.0/swagger-ui.css" />
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
    .swagger-ui .topbar {
      background-color: #1f2937;
    }
    .swagger-ui .topbar .download-url-wrapper {
      display: none;
    }
    .swagger-ui .info .title {
      color: #1f2937;
    }
    .swagger-ui .scheme-container {
      background-color: #f8f9fa;
      border: 1px solid #e9ecef;
      border-radius: 4px;
      padding: 10px;
      margin: 10px 0;
    }
    .api-info {
      background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
      color: white;
      padding: 20px;
      margin-bottom: 20px;
      border-radius: 8px;
    }
    .api-info h1 {
      margin: 0 0 10px 0;
      font-size: 2.5em;
    }
    .api-info p {
      margin: 5px 0;
      opacity: 0.9;
    }
  </style>
</head>
<body>
  <div id="swagger-ui"></div>
  <script src="https://unpkg.com/swagger-ui-dist@5.9.0/swagger-ui-bundle.js"></script>
  <script src="https://unpkg.com/swagger-ui-dist@5.9.0/swagger-ui-standalone-preset.js"></script>
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
        layout: "StandaloneLayout",
        defaultModelsExpandDepth: 1,
        defaultModelExpandDepth: 1,
        displayRequestDuration: true,
        tryItOutEnabled: true,
        filter: true,
        showExtensions: true,
        showCommonExtensions: true,
        validatorUrl: null,
        docExpansion: 'list',
        operationsSorter: 'alpha',
        tagsSorter: 'alpha'
      });
      
      // Add custom header
      setTimeout(() => {
        const infoSection = document.querySelector('.swagger-ui .info');
        if (infoSection && !document.querySelector('.api-info')) {
          const header = document.createElement('div');
          header.className = 'api-info';
          header.innerHTML = \`
            <h1>🚀 MCP Desktop API</h1>
            <p><strong>Base URL:</strong> http://localhost:3100</p>
            <p><strong>Version:</strong> 1.0.0</p>
            <p><strong>Status:</strong> Development</p>
          \`;
          infoSection.parentNode.insertBefore(header, infoSection);
        }
      }, 500);
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