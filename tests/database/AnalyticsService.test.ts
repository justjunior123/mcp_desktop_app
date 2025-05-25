import { PrismaClient } from '@prisma/client';
import { AnalyticsService, CreateAPIRequestData } from '../../src/services/database/AnalyticsService';
import { APILogger } from '../../src/lib/api-logger';

// Mock Prisma Client
const mockPrisma = {
  aPIRequest: {
    create: jest.fn(),
    count: jest.fn(),
    aggregate: jest.fn(),
    groupBy: jest.fn(),
    findMany: jest.fn(),
    deleteMany: jest.fn(),
  },
  user: {
    findUnique: jest.fn(),
  },
  message: {
    aggregate: jest.fn(),
  },
  $queryRaw: jest.fn(),
} as unknown as PrismaClient;

// Mock logger
const mockLogger = {
  withContext: jest.fn().mockReturnThis(),
  info: jest.fn(),
  debug: jest.fn(),
  error: jest.fn(),
} as unknown as APILogger;

describe('AnalyticsService', () => {
  let analyticsService: AnalyticsService;

  beforeEach(() => {
    jest.clearAllMocks();
    analyticsService = new AnalyticsService(mockPrisma, mockLogger);
  });

  describe('recordAPIRequest', () => {
    const validRequestData: CreateAPIRequestData = {
      correlationId: 'req-123',
      endpoint: '/api/ollama/chat',
      method: 'POST',
      statusCode: 200,
      responseTime: 250,
      userId: 'user-123',
      chatSessionId: 'session-456',
      modelName: 'llama2',
      messageCount: 3,
      requestSize: 1024,
      responseSize: 2048,
      hasStream: true
    };

    beforeEach(() => {
      (mockPrisma.aPIRequest.create as jest.Mock).mockResolvedValue({
        id: 'api-req-789',
        ...validRequestData,
        createdAt: new Date()
      });
    });

    it('should record API request successfully', async () => {
      const result = await analyticsService.recordAPIRequest(validRequestData);

      expect(result.id).toBe('api-req-789');
      expect(mockPrisma.aPIRequest.create).toHaveBeenCalledWith({
        data: {
          correlationId: 'req-123',
          endpoint: '/api/ollama/chat',
          method: 'POST',
          statusCode: 200,
          responseTime: 250,
          userId: 'user-123',
          chatSessionId: 'session-456',
          modelName: 'llama2',
          userAgent: undefined,
          ipAddress: undefined,
          messageCount: 3,
          requestSize: 1024,
          responseSize: 2048,
          hasStream: true,
          errorCode: undefined,
          errorMessage: undefined,
          rateLimited: false,
          blocked: false,
          memoryUsage: undefined,
          cpuUsage: undefined
        }
      });
    });

    it('should record request with error details', async () => {
      const errorRequestData: CreateAPIRequestData = {
        ...validRequestData,
        statusCode: 500,
        errorCode: 'INTERNAL_SERVER_ERROR',
        errorMessage: 'Model not available',
        rateLimited: true
      };

      await analyticsService.recordAPIRequest(errorRequestData);

      expect(mockPrisma.aPIRequest.create).toHaveBeenCalledWith({
        data: expect.objectContaining({
          statusCode: 500,
          errorCode: 'INTERNAL_SERVER_ERROR',
          errorMessage: 'Model not available',
          rateLimited: true
        })
      });
    });

    it('should handle minimal request data', async () => {
      const minimalRequestData: CreateAPIRequestData = {
        correlationId: 'req-minimal',
        endpoint: '/api/health',
        method: 'GET',
        statusCode: 200,
        responseTime: 50
      };

      await analyticsService.recordAPIRequest(minimalRequestData);

      expect(mockPrisma.aPIRequest.create).toHaveBeenCalledWith({
        data: expect.objectContaining({
          correlationId: 'req-minimal',
          endpoint: '/api/health',
          method: 'GET',
          statusCode: 200,
          responseTime: 50,
          hasStream: false,
          rateLimited: false,
          blocked: false
        })
      });
    });
  });

  describe('getAnalyticsMetrics', () => {

    it('should return comprehensive analytics metrics', async () => {
      (mockPrisma.aPIRequest.count as jest.Mock)
        .mockResolvedValueOnce(1000) // Total requests
        .mockResolvedValueOnce(50)   // Error count
        .mockResolvedValueOnce(25);  // Rate limited count

      (mockPrisma.aPIRequest.aggregate as jest.Mock).mockResolvedValue({
        _avg: { responseTime: 245.5 }
      });

      (mockPrisma.aPIRequest.groupBy as jest.Mock)
        .mockResolvedValueOnce([ // Top endpoints
          { endpoint: '/api/ollama/chat', _count: { endpoint: 800 }, _avg: { responseTime: 250 } },
          { endpoint: '/api/ollama/models', _count: { endpoint: 150 }, _avg: { responseTime: 100 } }
        ])
        .mockResolvedValueOnce([ // Top models
          { modelName: 'llama2', _count: { modelName: 600 }, _avg: { responseTime: 260 } },
          { modelName: 'gpt-3.5', _count: { modelName: 300 }, _avg: { responseTime: 220 } }
        ])
        .mockResolvedValueOnce([ // Status codes
          { statusCode: 200, _count: { statusCode: 950 } },
          { statusCode: 400, _count: { statusCode: 30 } },
          { statusCode: 500, _count: { statusCode: 20 } }
        ]);

      (mockPrisma.$queryRaw as jest.Mock).mockResolvedValue([
        { hour: '09', count: 120 },
        { hour: '10', count: 150 },
        { hour: '11', count: 180 }
      ]);

      const result = await analyticsService.getAnalyticsMetrics();

      expect(result).toEqual({
        totalRequests: 1000,
        avgResponseTime: 245.5,
        errorRate: 5, // 50/1000 * 100
        rateLimitedRate: 2.5, // 25/1000 * 100
        topEndpoints: [
          { endpoint: '/api/ollama/chat', count: 800, avgResponseTime: 250 },
          { endpoint: '/api/ollama/models', count: 150, avgResponseTime: 100 }
        ],
        topModels: [
          { model: 'llama2', count: 600, avgResponseTime: 260 },
          { model: 'gpt-3.5', count: 300, avgResponseTime: 220 }
        ],
        requestsByStatus: [
          { statusCode: 200, count: 950 },
          { statusCode: 400, count: 30 },
          { statusCode: 500, count: 20 }
        ],
        hourlyDistribution: [
          { hour: 9, count: 120 },
          { hour: 10, count: 150 },
          { hour: 11, count: 180 }
        ]
      });
    });

    it('should handle date range filtering', async () => {
      const startDate = new Date('2024-01-01');
      const endDate = new Date('2024-01-31');

      await analyticsService.getAnalyticsMetrics(startDate, endDate);

      // Verify that all queries include the date filter
      expect(mockPrisma.aPIRequest.count).toHaveBeenCalledWith({
        where: {
          createdAt: { gte: startDate, lte: endDate }
        }
      });
    });

    it('should handle zero requests gracefully', async () => {
      (mockPrisma.aPIRequest.count as jest.Mock)
        .mockResolvedValueOnce(0) // Total requests
        .mockResolvedValueOnce(0) // Error count
        .mockResolvedValueOnce(0); // Rate limited count

      (mockPrisma.aPIRequest.aggregate as jest.Mock).mockResolvedValue({
        _avg: { responseTime: null }
      });

      (mockPrisma.aPIRequest.groupBy as jest.Mock)
        .mockResolvedValueOnce([]) // Top endpoints
        .mockResolvedValueOnce([]) // Top models
        .mockResolvedValueOnce([]); // Status codes

      (mockPrisma.$queryRaw as jest.Mock).mockResolvedValue([]);

      const result = await analyticsService.getAnalyticsMetrics();

      expect(result.totalRequests).toBe(0);
      expect(result.avgResponseTime).toBe(0);
      expect(result.errorRate).toBe(0);
      expect(result.rateLimitedRate).toBe(0);
    });
  });

  describe('getUserAnalytics', () => {
    const mockUser = {
      totalSessions: 25,
      totalMessages: 150,
      totalTokens: BigInt(7500)
    };

    beforeEach(() => {
      (mockPrisma.user.findUnique as jest.Mock).mockResolvedValue(mockUser);
      (mockPrisma.aPIRequest.count as jest.Mock).mockResolvedValue(200);
      (mockPrisma.aPIRequest.aggregate as jest.Mock).mockResolvedValue({
        _avg: { responseTime: 180 }
      });
      (mockPrisma.aPIRequest.groupBy as jest.Mock).mockResolvedValue([
        { modelName: 'llama2', _count: { modelName: 120 } }
      ]);
      (mockPrisma.$queryRaw as jest.Mock).mockResolvedValue([
        { date: '2024-01-20', requests: 15 },
        { date: '2024-01-21', requests: 22 }
      ]);
    });

    it('should return user analytics', async () => {
      (mockPrisma.user.findUnique as jest.Mock).mockResolvedValue(mockUser);
      (mockPrisma.aPIRequest.count as jest.Mock).mockResolvedValue(200);
      (mockPrisma.aPIRequest.aggregate as jest.Mock).mockResolvedValue({
        _avg: { responseTime: 180 }
      });
      (mockPrisma.aPIRequest.groupBy as jest.Mock).mockResolvedValue([
        { modelName: 'llama2', _count: { modelName: 120 } }
      ]);
      (mockPrisma.$queryRaw as jest.Mock).mockResolvedValue([
        { date: '2024-01-20', requests: 15 },
        { date: '2024-01-21', requests: 22 }
      ]);

      const result = await analyticsService.getUserAnalytics('user-123');

      expect(result).toEqual({
        userId: 'user-123',
        totalRequests: 200,
        totalSessions: 25,
        totalMessages: 150,
        totalTokens: 7500, // BigInt converted to number
        avgResponseTime: 180,
        favoriteModel: 'llama2',
        activityByDay: [
          { date: '2024-01-20', requests: 15 },
          { date: '2024-01-21', requests: 22 }
        ]
      });

      expect(mockPrisma.user.findUnique).toHaveBeenCalledWith({
        where: { id: 'user-123' },
        select: { totalSessions: true, totalMessages: true, totalTokens: true }
      });
    });

    it('should handle user with no favorite model', async () => {
      (mockPrisma.aPIRequest.groupBy as jest.Mock).mockResolvedValue([]);

      const result = await analyticsService.getUserAnalytics('user-123');

      expect(result.favoriteModel).toBeNull();
    });

    it('should throw error if user not found', async () => {
      (mockPrisma.user.findUnique as jest.Mock).mockResolvedValue(null);

      await expect(analyticsService.getUserAnalytics('nonexistent'))
        .rejects.toThrow('User not found: nonexistent');
    });

    it('should apply date range filtering', async () => {
      const startDate = new Date('2024-01-01');
      const endDate = new Date('2024-01-31');

      await analyticsService.getUserAnalytics('user-123', startDate, endDate);

      expect(mockPrisma.aPIRequest.count).toHaveBeenCalledWith({
        where: {
          userId: 'user-123',
          createdAt: { gte: startDate, lte: endDate }
        }
      });
    });
  });

  describe('getModelMetrics', () => {
    const mockRequests = [
      { statusCode: 200, responseTime: 200, messageCount: 3 },
      { statusCode: 200, responseTime: 250, messageCount: 5 },
      { statusCode: 400, responseTime: 100, messageCount: 0 },
      { statusCode: 500, responseTime: 150, messageCount: 0 }
    ];

    const mockMessages = {
      _sum: { tokenCount: 1500 },
      _count: { id: 15 }
    };

    beforeEach(() => {
      (mockPrisma.aPIRequest.findMany as jest.Mock).mockResolvedValue(mockRequests);
      (mockPrisma.message.aggregate as jest.Mock).mockResolvedValue(mockMessages);
    });

    it('should return model performance metrics', async () => {
      const result = await analyticsService.getModelMetrics('llama2');

      expect(result).toEqual({
        totalRequests: 4,
        avgResponseTime: 175, // (200+250+100+150)/4
        errorRate: 50, // 2 errors out of 4 requests
        successRate: 50, // 2 success out of 4 requests
        totalTokens: 1500,
        avgTokensPerRequest: 375 // 1500/4
      });

      expect(mockPrisma.aPIRequest.findMany).toHaveBeenCalledWith({
        where: {
          modelName: 'llama2',
          createdAt: { gte: expect.any(Date) }
        },
        select: {
          statusCode: true,
          responseTime: true,
          messageCount: true
        }
      });
    });

    it('should handle custom date range', async () => {
      await analyticsService.getModelMetrics('llama2', 30);

      const expectedStartDate = new Date();
      expectedStartDate.setDate(expectedStartDate.getDate() - 30);

      expect(mockPrisma.aPIRequest.findMany).toHaveBeenCalledWith({
        where: {
          modelName: 'llama2',
          createdAt: { gte: expect.any(Date) }
        },
        select: expect.any(Object)
      });
    });

    it('should handle model with no requests', async () => {
      (mockPrisma.aPIRequest.findMany as jest.Mock).mockResolvedValue([]);
      (mockPrisma.message.aggregate as jest.Mock).mockResolvedValue({
        _sum: { tokenCount: null },
        _count: { id: 0 }
      });

      const result = await analyticsService.getModelMetrics('unused-model');

      expect(result).toEqual({
        totalRequests: 0,
        avgResponseTime: 0,
        errorRate: 0,
        successRate: 0,
        totalTokens: 0,
        avgTokensPerRequest: 0
      });
    });
  });

  describe('cleanupOldData', () => {
    beforeEach(() => {
      (mockPrisma.aPIRequest.deleteMany as jest.Mock).mockResolvedValue({ count: 150 });
    });

    it('should cleanup old analytics data', async () => {
      const result = await analyticsService.cleanupOldData(90);

      expect(result).toBe(150);
      expect(mockPrisma.aPIRequest.deleteMany).toHaveBeenCalledWith({
        where: {
          createdAt: { lt: expect.any(Date) }
        }
      });
    });

    it('should use default retention period', async () => {
      await analyticsService.cleanupOldData();

      expect(mockPrisma.aPIRequest.deleteMany).toHaveBeenCalledWith({
        where: {
          createdAt: { lt: expect.any(Date) }
        }
      });
    });

    it('should handle no data to cleanup', async () => {
      (mockPrisma.aPIRequest.deleteMany as jest.Mock).mockResolvedValue({ count: 0 });

      const result = await analyticsService.cleanupOldData(30);

      expect(result).toBe(0);
    });
  });
});