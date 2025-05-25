import { PrismaClient } from '@prisma/client';
import { 
  getPrismaClient, 
  createChatService, 
  createAnalyticsService,
  checkDatabaseHealth,
  initializeDatabase,
  disconnectDatabase 
} from '../../src/services/database';
import { ChatService } from '../../src/services/database/ChatService';
import { AnalyticsService } from '../../src/services/database/AnalyticsService';

// This is an integration test that tests the actual database operations
// It uses an in-memory SQLite database for testing
describe('Database Integration Tests', () => {
  let prisma: PrismaClient;
  let testUserId: string;
  let testModelId: string;
  let testSessionId: string;
  let testModel: any;

  beforeAll(async () => {
    // Initialize test database
    await initializeDatabase();
    prisma = getPrismaClient();

    // Create test user
    const testUser = await prisma.user.create({
      data: {
        name: 'Test User',
        email: 'test@example.com'
      }
    });
    testUserId = testUser.id;

    // Create test model with unique name
    testModel = await prisma.ollamaModel.create({
      data: {
        name: `test-model-${Date.now()}`,
        size: BigInt(1000000),
        digest: 'test-digest',
        format: 'ggml',
        family: 'llama',
        status: 'READY',
        isDownloaded: true
      }
    });
    testModelId = testModel.id;
  });

  afterAll(async () => {
    // Cleanup test data
    await prisma.message.deleteMany();
    await prisma.chatSession.deleteMany();
    await prisma.aPIRequest.deleteMany();
    await prisma.ollamaModel.deleteMany();
    await prisma.user.deleteMany();
    
    await disconnectDatabase();
  });

  describe('Database Health and Connection', () => {
    it('should check database health successfully', async () => {
      const isHealthy = await checkDatabaseHealth();
      expect(isHealthy).toBe(true);
    });

    it('should create service instances', () => {
      const chatService = createChatService();
      const analyticsService = createAnalyticsService();
      
      expect(chatService).toBeInstanceOf(ChatService);
      expect(analyticsService).toBeInstanceOf(AnalyticsService);
    });
  });

  describe('Chat Service Integration', () => {
    let chatService: ChatService;

    beforeAll(() => {
      chatService = createChatService();
    });

    it('should create and retrieve chat session', async () => {
      // Create session
      const sessionData = {
        name: 'Integration Test Session',
        userId: testUserId,
        modelId: testModelId,
        temperature: 0.8,
        systemPrompt: 'You are a helpful assistant',
        stopSequences: ['STOP', '</end>']
      };

      const session = await chatService.createChatSession(sessionData);
      testSessionId = session.id;

      expect(session.name).toBe('Integration Test Session');
      expect(session.userId).toBe(testUserId);
      expect(session.modelId).toBe(testModelId);
      expect(session.temperature).toBe(0.8);
      expect(session.stopSequences).toBe('["STOP","</end>"]');

      // Retrieve session
      const retrievedSession = await chatService.getChatSession(session.id);
      expect(retrievedSession).toBeTruthy();
      expect(retrievedSession!.id).toBe(session.id);
      expect(retrievedSession!.user.id).toBe(testUserId);
      expect(retrievedSession!.model.id).toBe(testModelId);
    });

    it('should add messages to session and update stats', async () => {
      // Add user message
      const userMessage = await chatService.addMessage({
        chatSessionId: testSessionId,
        role: 'user',
        content: 'Hello, how are you?',
        tokenCount: 15,
        requestId: 'test-req-1'
      });

      expect(userMessage.role).toBe('user');
      expect(userMessage.content).toBe('Hello, how are you?');
      expect(userMessage.tokenCount).toBe(15);

      // Add assistant message
      const assistantMessage = await chatService.addMessage({
        chatSessionId: testSessionId,
        role: 'assistant',
        content: 'I am doing well, thank you for asking!',
        tokenCount: 25,
        responseTime: 250,
        totalDuration: 1000000,
        evalDuration: 800000
      });

      expect(assistantMessage.role).toBe('assistant');
      expect(assistantMessage.tokenCount).toBe(25);
      expect(assistantMessage.responseTime).toBe(250);

      // Check session stats
      const stats = await chatService.getChatSessionStats(testSessionId);
      expect(stats.messageCount).toBe(2);
      expect(stats.totalTokens).toBe(40); // 15 + 25
      expect(stats.userMessages).toBe(1);
      expect(stats.assistantMessages).toBe(1);
    });

    it('should list user sessions', async () => {
      const sessions = await chatService.getUserChatSessions(testUserId);
      
      expect(sessions).toHaveLength(1);
      expect(sessions[0].id).toBe(testSessionId);
      expect(sessions[0].messages).toHaveLength(1); // Latest message only
    });

    it('should update session configuration', async () => {
      const updatedSession = await chatService.updateChatSession(testSessionId, {
        name: 'Updated Session Name',
        temperature: 0.9,
        stopSequences: ['NEW_STOP']
      });

      expect(updatedSession.name).toBe('Updated Session Name');
      expect(updatedSession.temperature).toBe(0.9);
      expect(updatedSession.stopSequences).toBe('["NEW_STOP"]');
    });

    it('should soft delete messages', async () => {
      // Get messages before deletion
      const sessionBefore = await chatService.getChatSession(testSessionId);
      const messageCount = sessionBefore!.messages.length;
      const messageToDelete = sessionBefore!.messages[0];

      // Delete message
      await chatService.deleteMessage(messageToDelete.id);

      // Check that message is not returned in session (soft deleted)
      const sessionAfter = await chatService.getChatSession(testSessionId);
      expect(sessionAfter!.messages.length).toBe(messageCount - 1);

      // Verify message is still in database but marked as deleted
      const deletedMessage = await prisma.message.findUnique({
        where: { id: messageToDelete.id }
      });
      expect(deletedMessage!.isDeleted).toBe(true);
      expect(deletedMessage!.deletedAt).toBeTruthy();
    });

    it('should archive session', async () => {
      await chatService.archiveChatSession(testSessionId);

      const session = await prisma.chatSession.findUnique({
        where: { id: testSessionId }
      });
      expect(session!.status).toBe('archived');
    });
  });

  describe('Analytics Service Integration', () => {
    let analyticsService: AnalyticsService;
    let testRequestId: string;

    beforeAll(() => {
      analyticsService = createAnalyticsService();
    });

    it('should record API requests', async () => {
      const requestData = {
        correlationId: 'test-corr-1',
        endpoint: '/api/ollama/chat',
        method: 'POST',
        statusCode: 200,
        responseTime: 250,
        userId: testUserId,
        chatSessionId: testSessionId,
        modelName: 'test-model',
        messageCount: 2,
        requestSize: 1024,
        responseSize: 2048,
        hasStream: true
      };

      const request = await analyticsService.recordAPIRequest(requestData);
      testRequestId = request.id;

      expect(request.correlationId).toBe('test-corr-1');
      expect(request.endpoint).toBe('/api/ollama/chat');
      expect(request.statusCode).toBe(200);
      expect(request.userId).toBe(testUserId);
    });

    it('should get analytics metrics', async () => {
      // Record a few more requests for better analytics
      await analyticsService.recordAPIRequest({
        correlationId: 'test-corr-2',
        endpoint: '/api/ollama/models',
        method: 'GET',
        statusCode: 200,
        responseTime: 100,
        userId: testUserId
      });

      await analyticsService.recordAPIRequest({
        correlationId: 'test-corr-3',
        endpoint: '/api/ollama/chat',
        method: 'POST',
        statusCode: 500,
        responseTime: 150,
        errorCode: 'MODEL_ERROR',
        errorMessage: 'Model not available'
      });

      const metrics = await analyticsService.getAnalyticsMetrics();

      expect(metrics.totalRequests).toBeGreaterThanOrEqual(3);
      expect(metrics.avgResponseTime).toBeGreaterThan(0);
      expect(metrics.topEndpoints.length).toBeGreaterThan(0);
      expect(metrics.requestsByStatus.length).toBeGreaterThan(0);
    });

    it('should get user analytics', async () => {
      const userAnalytics = await analyticsService.getUserAnalytics(testUserId);

      expect(userAnalytics.userId).toBe(testUserId);
      expect(userAnalytics.totalRequests).toBeGreaterThanOrEqual(2);
      expect(userAnalytics.totalSessions).toBe(1);
      expect(userAnalytics.favoriteModel).toBe('test-model');
    });

    it('should get model metrics', async () => {
      const modelMetrics = await analyticsService.getModelMetrics('test-model', 1);

      expect(modelMetrics.totalRequests).toBeGreaterThanOrEqual(1);
      expect(modelMetrics.avgResponseTime).toBeGreaterThan(0);
      expect(modelMetrics.successRate).toBeGreaterThanOrEqual(0);
      expect(modelMetrics.errorRate).toBeGreaterThanOrEqual(0);
    });
  });

  describe('Data Relationships and Constraints', () => {
    it('should maintain referential integrity', async () => {
      // Try to create session with non-existent user - should fail
      const chatService = createChatService();
      
      await expect(chatService.createChatSession({
        name: 'Invalid Session',
        userId: 'non-existent-user',
        modelId: testModelId
      })).rejects.toThrow('User not found');

      // Try to create session with non-existent model - should fail
      await expect(chatService.createChatSession({
        name: 'Invalid Session',
        userId: testUserId,
        modelId: 'non-existent-model'
      })).rejects.toThrow('Model not found');
    });

    it('should cascade delete messages when session is deleted', async () => {
      const chatService = createChatService();
      
      // Create a temporary session
      const tempSession = await chatService.createChatSession({
        name: 'Temp Session',
        userId: testUserId,
        modelId: testModelId
      });

      // Add a message
      await chatService.addMessage({
        chatSessionId: tempSession.id,
        role: 'user',
        content: 'Test message for cascade'
      });

      // Delete the session (hard delete for testing cascade)
      await prisma.chatSession.delete({
        where: { id: tempSession.id }
      });

      // Check that message was also deleted
      const remainingMessages = await prisma.message.findMany({
        where: { chatSessionId: tempSession.id }
      });
      expect(remainingMessages).toHaveLength(0);
    });

    it('should enforce unique constraints', async () => {
      // Try to create user with duplicate email
      await expect(prisma.user.create({
        data: {
          name: 'Duplicate User',
          email: 'test@example.com' // Same as existing user
        }
      })).rejects.toThrow();

      // Try to create model with duplicate name
      await expect(prisma.ollamaModel.create({
        data: {
          name: testModel.name, // Same as existing model
          size: BigInt(500000),
          digest: 'different-digest',
          format: 'ggml',
          family: 'llama'
        }
      })).rejects.toThrow();
    });
  });

  describe('Performance and Indexing', () => {
    it('should efficiently query sessions by user and activity', async () => {
      const chatService = createChatService();
      
      const startTime = Date.now();
      await chatService.getUserChatSessions(testUserId, { limit: 10 });
      const queryTime = Date.now() - startTime;
      
      // Query should be fast (under 100ms for test data)
      expect(queryTime).toBeLessThan(100);
    });

    it('should efficiently query analytics by date range', async () => {
      const analyticsService = createAnalyticsService();
      
      const startDate = new Date();
      startDate.setDate(startDate.getDate() - 7);
      
      const startTime = Date.now();
      await analyticsService.getAnalyticsMetrics(startDate, new Date());
      const queryTime = Date.now() - startTime;
      
      // Query should be fast (under 200ms for test data)
      expect(queryTime).toBeLessThan(200);
    });
  });
});