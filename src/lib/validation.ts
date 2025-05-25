import { z } from 'zod';
import { Request, Response, NextFunction } from 'express';
import { APILogger, createErrorResponse, APIErrorCode, RequestWithCorrelationId } from './api-logger';

// Constants for validation
const MAX_MESSAGE_LENGTH = 32000; // Characters
const MAX_MESSAGES_COUNT = 100;
const MAX_MODEL_NAME_LENGTH = 100;
const MAX_STOP_SEQUENCES = 10;
const MAX_STOP_SEQUENCE_LENGTH = 50;

// Base message schema
const messageSchema = z.object({
  role: z.enum(['system', 'user', 'assistant'], {
    errorMap: () => ({ message: 'Role must be one of: system, user, assistant' })
  }),
  content: z.string()
    .min(1, 'Message content cannot be empty')
    .max(MAX_MESSAGE_LENGTH, `Message content cannot exceed ${MAX_MESSAGE_LENGTH} characters`)
});

// Model name validation
const modelNameSchema = z.string()
  .min(1, 'Model name cannot be empty')
  .max(MAX_MODEL_NAME_LENGTH, `Model name cannot exceed ${MAX_MODEL_NAME_LENGTH} characters`)
  .regex(/^[a-zA-Z0-9][a-zA-Z0-9._:-]*$/, 'Model name contains invalid characters. Use only letters, numbers, dots, hyphens, underscores, and colons');

// Chat options schema
const chatOptionsSchema = z.object({
  temperature: z.number().min(0).max(2).optional(),
  top_p: z.number().min(0).max(1).optional(),
  top_k: z.number().int().min(1).optional(),
  repeat_penalty: z.number().min(0).max(2).optional(),
  presence_penalty: z.number().min(-2).max(2).optional(),
  frequency_penalty: z.number().min(-2).max(2).optional(),
  max_tokens: z.number().int().min(1).max(100000).optional(),
  stop: z.array(
    z.string().max(MAX_STOP_SEQUENCE_LENGTH, `Stop sequence cannot exceed ${MAX_STOP_SEQUENCE_LENGTH} characters`)
  ).max(MAX_STOP_SEQUENCES, `Cannot have more than ${MAX_STOP_SEQUENCES} stop sequences`).optional(),
  seed: z.number().int().optional(),
  num_predict: z.number().int().min(1).optional(),
  num_ctx: z.number().int().min(1).optional(),
  num_batch: z.number().int().min(1).optional(),
  num_gqa: z.number().int().min(1).optional(),
  num_gpu: z.number().int().min(0).optional(),
  main_gpu: z.number().int().min(0).optional(),
  low_vram: z.boolean().optional(),
  f16_kv: z.boolean().optional(),
  logits_all: z.boolean().optional(),
  vocab_only: z.boolean().optional(),
  use_mmap: z.boolean().optional(),
  use_mlock: z.boolean().optional(),
  embedding_only: z.boolean().optional(),
  num_thread: z.number().int().min(1).optional()
}).optional();

// Chat request schema
export const chatRequestSchema = z.object({
  model: modelNameSchema,
  messages: z.array(messageSchema)
    .min(1, 'At least one message is required')
    .max(MAX_MESSAGES_COUNT, `Cannot exceed ${MAX_MESSAGES_COUNT} messages`),
  options: chatOptionsSchema,
  stream: z.boolean().optional()
});

// Model pull request schema
export const modelPullRequestSchema = z.object({
  name: modelNameSchema
});

// Model update config schema
export const modelConfigUpdateSchema = z.object({
  temperature: z.number().min(0).max(2).optional(),
  topP: z.number().min(0).max(1).optional(),
  topK: z.number().int().min(1).optional(),
  repeatPenalty: z.number().min(0).max(2).optional(),
  presencePenalty: z.number().min(-2).max(2).optional(),
  frequencyPenalty: z.number().min(-2).max(2).optional(),
  stop: z.array(z.string().max(MAX_STOP_SEQUENCE_LENGTH)).max(MAX_STOP_SEQUENCES).optional(),
  maxTokens: z.number().int().min(1).max(100000).optional(),
  systemPrompt: z.string().max(MAX_MESSAGE_LENGTH).optional(),
  contextWindow: z.number().int().min(1).max(1000000).optional()
});

// Model params schema for route parameters
export const modelParamsSchema = z.object({
  name: modelNameSchema
});

// Generic validation middleware factory
export function validateRequest<T>(schema: z.ZodSchema<T>, target: 'body' | 'params' | 'query' = 'body') {
  return (req: RequestWithCorrelationId, res: Response, next: NextFunction) => {
    const logger = new APILogger({ correlationId: req.correlationId });
    
    try {
      const dataToValidate = target === 'body' ? req.body : 
                            target === 'params' ? req.params : 
                            req.query;
      
      const validationResult = schema.safeParse(dataToValidate);
      
      if (!validationResult.success) {
        const errors = validationResult.error.errors.map(err => ({
          field: err.path.join('.'),
          message: err.message,
          code: err.code
        }));
        
        logger.warn('Request validation failed', {
          target,
          errors,
          receivedData: dataToValidate
        });
        
        res.status(400).json(createErrorResponse(
          APIErrorCode.INVALID_REQUEST,
          'Request validation failed',
          { 
            validationErrors: errors,
            target 
          },
          req.correlationId
        ));
        return;
      }
      
      // Replace the original data with validated data
      if (target === 'body') {
        req.body = validationResult.data;
      } else if (target === 'params') {
        req.params = validationResult.data as any;
      } else {
        req.query = validationResult.data as any;
      }
      
      logger.debug('Request validation passed', { target });
      next();
    } catch (error) {
      logger.error('Validation middleware error', error);
      res.status(500).json(createErrorResponse(
        APIErrorCode.INTERNAL_SERVER_ERROR,
        'Internal validation error',
        undefined,
        req.correlationId
      ));
    }
  };
}

// Content sanitization
export function sanitizeString(input: string): string {
  if (typeof input !== 'string') return '';
  
  return input
    // Remove potentially dangerous characters
    .replace(/[\x00-\x08\x0B\x0C\x0E-\x1F\x7F]/g, '')
    // Normalize whitespace
    .replace(/\s+/g, ' ')
    // Trim whitespace
    .trim();
}

export function sanitizeMessage(message: any): any {
  if (!message || typeof message !== 'object') return message;
  
  return {
    ...message,
    content: typeof message.content === 'string' ? sanitizeString(message.content) : message.content,
    role: typeof message.role === 'string' ? sanitizeString(message.role) : message.role
  };
}

export function sanitizeMessages(messages: any[]): any[] {
  if (!Array.isArray(messages)) return messages;
  return messages.map(sanitizeMessage);
}

// Request sanitization middleware
export const sanitizeRequestMiddleware = (req: RequestWithCorrelationId, res: Response, next: NextFunction) => {
  const logger = new APILogger({ correlationId: req.correlationId });
  
  try {
    // Sanitize body
    if (req.body) {
      if (req.body.messages && Array.isArray(req.body.messages)) {
        req.body.messages = sanitizeMessages(req.body.messages);
      }
      
      if (req.body.model && typeof req.body.model === 'string') {
        req.body.model = sanitizeString(req.body.model);
      }
      
      // Sanitize stop sequences if present
      if (req.body.options?.stop && Array.isArray(req.body.options.stop)) {
        req.body.options.stop = req.body.options.stop.map((stop: any) => 
          typeof stop === 'string' ? sanitizeString(stop) : stop
        );
      }
    }
    
    // Sanitize params
    if (req.params) {
      Object.keys(req.params).forEach(key => {
        if (typeof req.params[key] === 'string') {
          req.params[key] = sanitizeString(req.params[key]);
        }
      });
    }
    
    logger.debug('Request sanitization completed');
    next();
  } catch (error) {
    logger.error('Request sanitization error', error);
    res.status(500).json(createErrorResponse(
      APIErrorCode.INTERNAL_SERVER_ERROR,
      'Request processing error',
      undefined,
      req.correlationId
    ));
  }
};

// Validation helpers
export const validateChatRequest = validateRequest(chatRequestSchema, 'body');
export const validateModelParams = validateRequest(modelParamsSchema, 'params');
export const validateModelConfigUpdate = validateRequest(modelConfigUpdateSchema, 'body');
export const validateModelPullRequest = validateRequest(modelPullRequestSchema, 'body');

// Additional validation utilities
export function isValidModelName(name: string): boolean {
  const result = modelNameSchema.safeParse(name);
  return result.success;
}

export function validateMessageCount(messages: any[]): boolean {
  return Array.isArray(messages) && messages.length > 0 && messages.length <= MAX_MESSAGES_COUNT;
}

export function validateMessageLength(content: string): boolean {
  return typeof content === 'string' && content.length > 0 && content.length <= MAX_MESSAGE_LENGTH;
}

// Type exports for TypeScript
export type ChatRequest = z.infer<typeof chatRequestSchema>;
export type ModelParams = z.infer<typeof modelParamsSchema>;
export type ModelConfigUpdate = z.infer<typeof modelConfigUpdateSchema>;
export type ModelPullRequest = z.infer<typeof modelPullRequestSchema>;

export {
  MAX_MESSAGE_LENGTH,
  MAX_MESSAGES_COUNT,
  MAX_MODEL_NAME_LENGTH,
  MAX_STOP_SEQUENCES,
  MAX_STOP_SEQUENCE_LENGTH
};