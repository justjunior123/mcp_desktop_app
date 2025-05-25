import { PrismaClient } from '@prisma/client';
import { ChatService, CreateChatSessionData, CreateMessageData } from '../../src/services/database/ChatService';
import { APILogger } from '../../src/lib/api-logger';

// Mock Prisma Client
const mockPrisma = {
  user: {
    findUnique: jest.fn(),
    update: jest.fn(),
  },
  ollamaModel: {
    findUnique: jest.fn(),
  },
  chatSession: {
    create: jest.fn(),
    findUnique: jest.fn(),
    findMany: jest.fn(),
    update: jest.fn(),
  },
  message: {
    create: jest.fn(),
    update: jest.fn(),
    groupBy: jest.fn(),
  },
  $transaction: jest.fn(),
} as unknown as PrismaClient;

// Mock logger
const mockLogger = {
  withContext: jest.fn().mockReturnThis(),
  info: jest.fn(),
  debug: jest.fn(),
  error: jest.fn(),
} as unknown as APILogger;

describe('ChatService', () => {
  let chatService: ChatService;

  beforeEach(() => {
    chatService = new ChatService(mockPrisma, mockLogger);
    jest.clearAllMocks();
  });

  describe('createChatSession', () => {
    const validSessionData: CreateChatSessionData = {
      name: 'Test Session',
      userId: 'user-123',
      modelId: 'model-456',
      temperature: 0.7,
      systemPrompt: 'You are a helpful assistant',
      stopSequences: ['</end>', 'STOP']
    };

    beforeEach(() => {
      (mockPrisma.user.findUnique as jest.Mock).mockResolvedValue({
        id: 'user-123',
        name: 'Test User'
      });
      
      (mockPrisma.ollamaModel.findUnique as jest.Mock).mockResolvedValue({
        id: 'model-456',
        name: 'llama2'
      });

      (mockPrisma.chatSession.create as jest.Mock).mockResolvedValue({
        id: 'session-789',
        ...validSessionData,
        stopSequences: '["</end>","STOP"]',
        createdAt: new Date(),
        updatedAt: new Date()
      });

      (mockPrisma.user.update as jest.Mock).mockResolvedValue({});
    });

    it('should create a chat session successfully', async () => {
      const result = await chatService.createChatSession(validSessionData);

      expect(result.id).toBe('session-789');
      expect(mockPrisma.user.findUnique).toHaveBeenCalledWith({
        where: { id: 'user-123' }
      });
      expect(mockPrisma.ollamaModel.findUnique).toHaveBeenCalledWith({
        where: { id: 'model-456' }
      });
      expect(mockPrisma.chatSession.create).toHaveBeenCalledWith({
        data: expect.objectContaining({
          name: 'Test Session',
          userId: 'user-123',
          modelId: 'model-456',
          temperature: 0.7,
          systemPrompt: 'You are a helpful assistant',
          stopSequences: '["</end>","STOP"]'
        })
      });
      expect(mockPrisma.user.update).toHaveBeenCalledWith({
        where: { id: 'user-123' },
        data: {
          totalSessions: { increment: 1 },
          lastActiveAt: expect.any(Date)
        }
      });
    });

    it('should throw error if user not found', async () => {
      (mockPrisma.user.findUnique as jest.Mock).mockResolvedValue(null);

      await expect(chatService.createChatSession(validSessionData))
        .rejects.toThrow('User not found: user-123');
    });

    it('should throw error if model not found', async () => {
      (mockPrisma.ollamaModel.findUnique as jest.Mock).mockResolvedValue(null);

      await expect(chatService.createChatSession(validSessionData))
        .rejects.toThrow('Model not found: model-456');
    });

    it('should handle empty stop sequences', async () => {
      const dataWithoutStopSequences = { ...validSessionData };
      delete dataWithoutStopSequences.stopSequences;

      await chatService.createChatSession(dataWithoutStopSequences);

      expect(mockPrisma.chatSession.create).toHaveBeenCalledWith({
        data: expect.objectContaining({
          stopSequences: '[]'
        })
      });
    });
  });

  describe('getChatSession', () => {
    const mockSession = {
      id: 'session-123',
      name: 'Test Session',
      user: { id: 'user-123', name: 'Test User' },
      model: { id: 'model-456', name: 'llama2' },
      messages: [
        { id: 'msg-1', role: 'user', content: 'Hello', createdAt: new Date() },
        { id: 'msg-2', role: 'assistant', content: 'Hi there!', createdAt: new Date() }
      ],
      _count: { messages: 2 }
    };

    beforeEach(() => {
      (mockPrisma.chatSession.findUnique as jest.Mock).mockResolvedValue(mockSession);
    });

    it('should retrieve chat session with details', async () => {
      const result = await chatService.getChatSession('session-123');

      expect(result).toEqual(mockSession);
      expect(mockPrisma.chatSession.findUnique).toHaveBeenCalledWith({
        where: { id: 'session-123' },
        include: {
          user: true,
          model: true,
          messages: {
            where: { isDeleted: false },
            orderBy: { createdAt: 'asc' }
          },
          _count: { select: { messages: true } }
        }
      });
    });

    it('should filter by userId when provided', async () => {
      await chatService.getChatSession('session-123', 'user-123');

      expect(mockPrisma.chatSession.findUnique).toHaveBeenCalledWith({
        where: { id: 'session-123', userId: 'user-123' },
        include: expect.any(Object)
      });
    });

    it('should return null if session not found', async () => {
      (mockPrisma.chatSession.findUnique as jest.Mock).mockResolvedValue(null);

      const result = await chatService.getChatSession('nonexistent');

      expect(result).toBeNull();
    });
  });

  describe('addMessage', () => {
    const validMessageData: CreateMessageData = {
      chatSessionId: 'session-123',
      role: 'user',
      content: 'Hello, how are you?',
      tokenCount: 15,
      requestId: 'req-456',
      responseTime: 250
    };

    const mockMessage = {
      id: 'message-789',
      ...validMessageData,
      createdAt: new Date()
    };

    beforeEach(() => {
      (mockPrisma.$transaction as jest.Mock).mockImplementation(async (fn) => {
        const tx = {
          message: { create: jest.fn().mockResolvedValue(mockMessage) },
          chatSession: { 
            update: jest.fn(),
            findUnique: jest.fn().mockResolvedValue({ userId: 'user-123' })
          },
          user: { update: jest.fn() }
        };
        return await fn(tx);
      });
    });

    it('should add message and update session stats', async () => {
      const result = await chatService.addMessage(validMessageData);

      expect(result).toEqual(mockMessage);
      
      // Verify transaction was called
      expect(mockPrisma.$transaction).toHaveBeenCalled();
    });

    it('should handle message without token count', async () => {
      const dataWithoutTokens = { ...validMessageData };
      delete dataWithoutTokens.tokenCount;

      await chatService.addMessage(dataWithoutTokens);

      expect(mockPrisma.$transaction).toHaveBeenCalled();
    });

    it('should include all ollama metadata fields', async () => {
      const messageWithMetadata: CreateMessageData = {
        ...validMessageData,
        totalDuration: 1000000,
        loadDuration: 100000,
        promptEvalDuration: 200000,
        evalDuration: 700000,
        promptEvalCount: 10,
        evalCount: 5,
        finishReason: 'stop'
      };

      await chatService.addMessage(messageWithMetadata);

      expect(mockPrisma.$transaction).toHaveBeenCalled();
    });
  });

  describe('getUserChatSessions', () => {
    const mockSessions = [
      {
        id: 'session-1',
        name: 'Session 1',
        user: { id: 'user-123' },
        model: { name: 'llama2' },
        messages: [{ id: 'msg-1', content: 'Last message' }],
        _count: { messages: 5 }
      },
      {
        id: 'session-2',
        name: 'Session 2',
        user: { id: 'user-123' },
        model: { name: 'gpt-3.5' },
        messages: [{ id: 'msg-2', content: 'Another message' }],
        _count: { messages: 3 }
      }
    ];

    beforeEach(() => {
      (mockPrisma.chatSession.findMany as jest.Mock).mockResolvedValue(mockSessions);
    });

    it('should retrieve user sessions with default options', async () => {
      const result = await chatService.getUserChatSessions('user-123');

      expect(result).toEqual(mockSessions);
      expect(mockPrisma.chatSession.findMany).toHaveBeenCalledWith({
        where: { userId: 'user-123', status: 'active' },
        include: expect.any(Object),
        orderBy: { lastActivity: 'desc' },
        take: 50,
        skip: 0
      });
    });

    it('should apply search filter', async () => {
      await chatService.getUserChatSessions('user-123', { search: 'test query' });

      expect(mockPrisma.chatSession.findMany).toHaveBeenCalledWith({
        where: {
          userId: 'user-123',
          status: 'active',
          OR: [
            { name: { contains: 'test query', mode: 'insensitive' } },
            { messages: { some: { content: { contains: 'test query', mode: 'insensitive' } } } }
          ]
        },
        include: expect.any(Object),
        orderBy: { lastActivity: 'desc' },
        take: 50,
        skip: 0
      });
    });

    it('should apply pagination options', async () => {
      await chatService.getUserChatSessions('user-123', { limit: 10, offset: 20 });

      expect(mockPrisma.chatSession.findMany).toHaveBeenCalledWith({
        where: expect.any(Object),
        include: expect.any(Object),
        orderBy: { lastActivity: 'desc' },
        take: 10,
        skip: 20
      });
    });

    it('should filter by status', async () => {
      await chatService.getUserChatSessions('user-123', { status: 'archived' });

      expect(mockPrisma.chatSession.findMany).toHaveBeenCalledWith({
        where: { userId: 'user-123', status: 'archived' },
        include: expect.any(Object),
        orderBy: { lastActivity: 'desc' },
        take: 50,
        skip: 0
      });
    });
  });

  describe('updateChatSession', () => {
    const mockUpdatedSession = {
      id: 'session-123',
      name: 'Updated Session',
      temperature: 0.8
    };

    beforeEach(() => {
      (mockPrisma.chatSession.update as jest.Mock).mockResolvedValue(mockUpdatedSession);
    });

    it('should update session successfully', async () => {
      const updates = { name: 'Updated Session', temperature: 0.8 };
      const result = await chatService.updateChatSession('session-123', updates);

      expect(result).toEqual(mockUpdatedSession);
      expect(mockPrisma.chatSession.update).toHaveBeenCalledWith({
        where: { id: 'session-123' },
        data: updates
      });
    });

    it('should convert stop sequences to JSON string', async () => {
      const updates = { stopSequences: ['STOP', '</end>'] };
      await chatService.updateChatSession('session-123', updates);

      expect(mockPrisma.chatSession.update).toHaveBeenCalledWith({
        where: { id: 'session-123' },
        data: { stopSequences: '["STOP","</end>"]' }
      });
    });

    it('should update session status', async () => {
      const updates = { status: 'archived' };
      await chatService.updateChatSession('session-123', updates);

      expect(mockPrisma.chatSession.update).toHaveBeenCalledWith({
        where: { id: 'session-123' },
        data: { status: 'archived' }
      });
    });
  });

  describe('deleteMessage', () => {
    beforeEach(() => {
      (mockPrisma.message.update as jest.Mock).mockResolvedValue({});
    });

    it('should soft delete message', async () => {
      await chatService.deleteMessage('message-123');

      expect(mockPrisma.message.update).toHaveBeenCalledWith({
        where: { id: 'message-123' },
        data: {
          isDeleted: true,
          deletedAt: expect.any(Date)
        }
      });
    });
  });

  describe('getChatSessionStats', () => {
    const mockSession = {
      messageCount: 10,
      totalTokens: 500,
      avgResponseTime: 250
    };

    const mockMessageCounts = [
      { role: 'user', _count: { role: 5 } },
      { role: 'assistant', _count: { role: 4 } },
      { role: 'system', _count: { role: 1 } }
    ];

    beforeEach(() => {
      (mockPrisma.chatSession.findUnique as jest.Mock).mockResolvedValue(mockSession);
      (mockPrisma.message.groupBy as jest.Mock).mockResolvedValue(mockMessageCounts);
    });

    it('should return session statistics', async () => {
      const result = await chatService.getChatSessionStats('session-123');

      expect(result).toEqual({
        messageCount: 10,
        totalTokens: 500,
        avgResponseTime: 250,
        userMessages: 5,
        assistantMessages: 4,
        systemMessages: 1
      });

      expect(mockPrisma.chatSession.findUnique).toHaveBeenCalledWith({
        where: { id: 'session-123' },
        select: { messageCount: true, totalTokens: true, avgResponseTime: true }
      });

      expect(mockPrisma.message.groupBy).toHaveBeenCalledWith({
        by: ['role'],
        where: { chatSessionId: 'session-123', isDeleted: false },
        _count: { role: true }
      });
    });

    it('should handle missing role counts', async () => {
      (mockPrisma.message.groupBy as jest.Mock).mockResolvedValue([
        { role: 'user', _count: { role: 3 } }
      ]);

      const result = await chatService.getChatSessionStats('session-123');

      expect(result).toEqual({
        messageCount: 10,
        totalTokens: 500,
        avgResponseTime: 250,
        userMessages: 3,
        assistantMessages: 0,
        systemMessages: 0
      });
    });

    it('should throw error if session not found', async () => {
      (mockPrisma.chatSession.findUnique as jest.Mock).mockResolvedValue(null);

      await expect(chatService.getChatSessionStats('nonexistent'))
        .rejects.toThrow('Chat session not found: nonexistent');
    });
  });

  describe('Static helper methods', () => {
    describe('apiRequestToChatSessionData', () => {
      it('should convert API request to session data', () => {
        const apiRequest = {
          messages: [
            { role: 'system', content: 'You are helpful' },
            { role: 'user', content: 'Hello' }
          ],
          options: {
            temperature: 0.8,
            top_p: 0.9,
            max_tokens: 100,
            stop: ['</end>']
          }
        };

        const result = ChatService.apiRequestToChatSessionData(
          apiRequest as any,
          'user-123',
          'model-456',
          'Test Session'
        );

        expect(result).toEqual({
          name: 'Test Session',
          userId: 'user-123',
          modelId: 'model-456',
          systemPrompt: 'You are helpful',
          temperature: 0.8,
          topP: 0.9,
          maxTokens: 100,
          stopSequences: ['</end>'],
          topK: undefined,
          repeatPenalty: undefined,
          presencePenalty: undefined,
          frequencyPenalty: undefined
        });
      });
    });

    describe('apiMessageToMessageData', () => {
      it('should convert API message to message data', () => {
        const apiMessage = { role: 'user', content: 'Hello there!' };
        
        const result = ChatService.apiMessageToMessageData(
          apiMessage,
          'session-123',
          'req-456'
        );

        expect(result).toEqual({
          chatSessionId: 'session-123',
          role: 'user',
          content: 'Hello there!',
          requestId: 'req-456'
        });
      });
    });
  });
});