import { PrismaClient, ChatSession, Message, User, OllamaModel } from '@prisma/client';
import { ChatRequest } from '../../lib/validation';
import { APILogger } from '../../lib/api-logger';

export interface CreateChatSessionData {
  name?: string;
  userId: string;
  modelId: string;
  systemPrompt?: string;
  temperature?: number;
  topP?: number;
  topK?: number;
  repeatPenalty?: number;
  presencePenalty?: number;
  frequencyPenalty?: number;
  maxTokens?: number;
  stopSequences?: string[];
}

export interface CreateMessageData {
  chatSessionId: string;
  role: 'system' | 'user' | 'assistant';
  content: string;
  tokenCount?: number;
  finishReason?: string;
  model?: string;
  requestId?: string;
  responseTime?: number;
  
  // Ollama metadata
  totalDuration?: number;
  loadDuration?: number;
  promptEvalDuration?: number;
  evalDuration?: number;
  promptEvalCount?: number;
  evalCount?: number;
}

export interface UpdateSessionStats {
  messageCount?: number;
  totalTokens?: number;
  avgResponseTime?: number;
  totalCost?: number;
}

export interface ChatSessionWithDetails extends ChatSession {
  user: User;
  model: OllamaModel;
  messages: Message[];
  _count: {
    messages: number;
  };
}

export class ChatService {
  private prisma: PrismaClient;
  private logger: APILogger;

  constructor(prisma: PrismaClient, logger?: APILogger) {
    this.prisma = prisma;
    this.logger = logger || new APILogger();
  }

  // Create a new chat session
  async createChatSession(data: CreateChatSessionData): Promise<ChatSession> {
    const logger = this.logger.withContext({ method: 'createChatSession', userId: data.userId });
    
    try {
      // Validate that user and model exist
      const [user, model] = await Promise.all([
        this.prisma.user.findUnique({ where: { id: data.userId } }),
        this.prisma.ollamaModel.findUnique({ where: { id: data.modelId } })
      ]);

      if (!user) {
        throw new Error(`User not found: ${data.userId}`);
      }
      if (!model) {
        throw new Error(`Model not found: ${data.modelId}`);
      }

      // Convert stop sequences to JSON string
      const stopSequences = data.stopSequences ? JSON.stringify(data.stopSequences) : '[]';

      const session = await this.prisma.chatSession.create({
        data: {
          name: data.name,
          userId: data.userId,
          modelId: data.modelId,
          systemPrompt: data.systemPrompt,
          temperature: data.temperature,
          topP: data.topP,
          topK: data.topK,
          repeatPenalty: data.repeatPenalty,
          presencePenalty: data.presencePenalty,
          frequencyPenalty: data.frequencyPenalty,
          maxTokens: data.maxTokens,
          stopSequences,
          lastActivity: new Date()
        }
      });

      // Update user session count
      await this.prisma.user.update({
        where: { id: data.userId },
        data: { 
          totalSessions: { increment: 1 },
          lastActiveAt: new Date()
        }
      });

      logger.info('Chat session created successfully', { 
        sessionId: session.id,
        modelName: model.name 
      });

      return session;
    } catch (error) {
      logger.error('Failed to create chat session', error);
      throw error;
    }
  }

  // Get chat session with full details
  async getChatSession(sessionId: string, userId?: string): Promise<ChatSessionWithDetails | null> {
    const logger = this.logger.withContext({ method: 'getChatSession', sessionId });

    try {
      const whereClause: any = { id: sessionId };
      if (userId) {
        whereClause.userId = userId;
      }

      const session = await this.prisma.chatSession.findUnique({
        where: whereClause,
        include: {
          user: true,
          model: true,
          messages: {
            where: { isDeleted: false },
            orderBy: { createdAt: 'asc' }
          },
          _count: {
            select: { messages: true }
          }
        }
      });

      if (session) {
        logger.debug('Chat session retrieved', { messageCount: session.messages.length });
      }

      return session as ChatSessionWithDetails;
    } catch (error) {
      logger.error('Failed to get chat session', error);
      throw error;
    }
  }

  // List chat sessions for a user
  async getUserChatSessions(
    userId: string, 
    options: {
      status?: string;
      limit?: number;
      offset?: number;
      search?: string;
    } = {}
  ): Promise<ChatSessionWithDetails[]> {
    const logger = this.logger.withContext({ method: 'getUserChatSessions', userId });

    try {
      const whereClause: any = { 
        userId,
        status: options.status || 'active'
      };

      if (options.search) {
        whereClause.OR = [
          { name: { contains: options.search, mode: 'insensitive' } },
          { messages: { some: { content: { contains: options.search, mode: 'insensitive' } } } }
        ];
      }

      const sessions = await this.prisma.chatSession.findMany({
        where: whereClause,
        include: {
          user: true,
          model: true,
          messages: {
            where: { isDeleted: false },
            orderBy: { createdAt: 'desc' },
            take: 1 // Get only the latest message for preview
          },
          _count: {
            select: { messages: true }
          }
        },
        orderBy: { lastActivity: 'desc' },
        take: options.limit || 50,
        skip: options.offset || 0
      });

      logger.debug('User chat sessions retrieved', { count: sessions.length });
      return sessions as ChatSessionWithDetails[];
    } catch (error) {
      logger.error('Failed to get user chat sessions', error);
      throw error;
    }
  }

  // Add message to chat session
  async addMessage(data: CreateMessageData): Promise<Message> {
    const logger = this.logger.withContext({ 
      method: 'addMessage', 
      chatSessionId: data.chatSessionId,
      role: data.role 
    });

    try {
      // Start transaction to ensure consistency
      const result = await this.prisma.$transaction(async (tx) => {
        // Create the message
        const message = await tx.message.create({
          data: {
            chatSessionId: data.chatSessionId,
            role: data.role,
            content: data.content,
            tokenCount: data.tokenCount,
            finishReason: data.finishReason,
            model: data.model,
            requestId: data.requestId,
            responseTime: data.responseTime,
            totalDuration: data.totalDuration,
            loadDuration: data.loadDuration,
            promptEvalDuration: data.promptEvalDuration,
            evalDuration: data.evalDuration,
            promptEvalCount: data.promptEvalCount,
            evalCount: data.evalCount
          }
        });

        // Update session stats
        const tokenIncrement = data.tokenCount || 0;
        await tx.chatSession.update({
          where: { id: data.chatSessionId },
          data: {
            messageCount: { increment: 1 },
            totalTokens: { increment: tokenIncrement },
            lastActivity: new Date(),
            // Update average response time if provided
            ...(data.responseTime && {
              avgResponseTime: {
                // Calculate new average: (old_avg * old_count + new_time) / new_count
                // This is a simplified version; in production, you might want more sophisticated tracking
                set: data.responseTime
              }
            })
          }
        });

        // Update user stats
        await tx.user.update({
          where: { id: (await tx.chatSession.findUnique({ where: { id: data.chatSessionId } }))!.userId },
          data: {
            totalMessages: { increment: 1 },
            totalTokens: { increment: BigInt(tokenIncrement) },
            lastActiveAt: new Date()
          }
        });

        return message;
      });

      logger.info('Message added successfully', { 
        messageId: result.id,
        contentLength: data.content.length,
        tokenCount: data.tokenCount 
      });

      return result;
    } catch (error) {
      logger.error('Failed to add message', error);
      throw error;
    }
  }

  // Update chat session configuration
  async updateChatSession(
    sessionId: string, 
    updates: Partial<CreateChatSessionData> & { status?: string }
  ): Promise<ChatSession> {
    const logger = this.logger.withContext({ method: 'updateChatSession', sessionId });

    try {
      const updateData: any = { ...updates };
      
      if (updates.stopSequences) {
        updateData.stopSequences = JSON.stringify(updates.stopSequences);
      }

      const session = await this.prisma.chatSession.update({
        where: { id: sessionId },
        data: updateData
      });

      logger.info('Chat session updated', { sessionId, fields: Object.keys(updates) });
      return session;
    } catch (error) {
      logger.error('Failed to update chat session', error);
      throw error;
    }
  }

  // Soft delete a message
  async deleteMessage(messageId: string): Promise<void> {
    const logger = this.logger.withContext({ method: 'deleteMessage', messageId });

    try {
      await this.prisma.message.update({
        where: { id: messageId },
        data: { 
          isDeleted: true,
          deletedAt: new Date()
        }
      });

      logger.info('Message soft deleted', { messageId });
    } catch (error) {
      logger.error('Failed to delete message', error);
      throw error;
    }
  }

  // Archive a chat session
  async archiveChatSession(sessionId: string): Promise<void> {
    const logger = this.logger.withContext({ method: 'archiveChatSession', sessionId });

    try {
      await this.prisma.chatSession.update({
        where: { id: sessionId },
        data: { status: 'archived' }
      });

      logger.info('Chat session archived', { sessionId });
    } catch (error) {
      logger.error('Failed to archive chat session', error);
      throw error;
    }
  }

  // Get chat session statistics
  async getChatSessionStats(sessionId: string): Promise<{
    messageCount: number;
    totalTokens: number;
    avgResponseTime: number;
    userMessages: number;
    assistantMessages: number;
    systemMessages: number;
  }> {
    const logger = this.logger.withContext({ method: 'getChatSessionStats', sessionId });

    try {
      const [session, messageCounts] = await Promise.all([
        this.prisma.chatSession.findUnique({
          where: { id: sessionId },
          select: { messageCount: true, totalTokens: true, avgResponseTime: true }
        }),
        this.prisma.message.groupBy({
          by: ['role'],
          where: { chatSessionId: sessionId, isDeleted: false },
          _count: { role: true }
        })
      ]);

      if (!session) {
        throw new Error(`Chat session not found: ${sessionId}`);
      }

      const rolesCounts = messageCounts.reduce((acc, item) => {
        acc[`${item.role}Messages`] = item._count.role;
        return acc;
      }, {} as any);

      const stats = {
        messageCount: session.messageCount,
        totalTokens: session.totalTokens,
        avgResponseTime: session.avgResponseTime || 0,
        userMessages: rolesCounts.userMessages || 0,
        assistantMessages: rolesCounts.assistantMessages || 0,
        systemMessages: rolesCounts.systemMessages || 0
      };

      logger.debug('Chat session stats retrieved', stats);
      return stats;
    } catch (error) {
      logger.error('Failed to get chat session stats', error);
      throw error;
    }
  }

  // Convert API request to database format
  static apiRequestToChatSessionData(
    request: ChatRequest, 
    userId: string, 
    modelId: string,
    sessionName?: string
  ): CreateChatSessionData {
    return {
      name: sessionName,
      userId,
      modelId,
      systemPrompt: request.messages.find(m => m.role === 'system')?.content,
      temperature: request.options?.temperature,
      topP: request.options?.top_p,
      topK: request.options?.top_k,
      repeatPenalty: request.options?.repeat_penalty,
      presencePenalty: request.options?.presence_penalty,
      frequencyPenalty: request.options?.frequency_penalty,
      maxTokens: request.options?.max_tokens,
      stopSequences: request.options?.stop
    };
  }

  // Convert API messages to database format
  static apiMessageToMessageData(
    message: { role: string; content: string },
    chatSessionId: string,
    requestId?: string
  ): CreateMessageData {
    return {
      chatSessionId,
      role: message.role as 'system' | 'user' | 'assistant',
      content: message.content,
      requestId
    };
  }
}