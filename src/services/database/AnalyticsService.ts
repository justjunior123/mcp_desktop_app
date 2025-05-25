import { PrismaClient, APIRequest } from '@prisma/client';
import { APILogger } from '../../lib/api-logger';

export interface CreateAPIRequestData {
  correlationId: string;
  endpoint: string;
  method: string;
  statusCode: number;
  responseTime: number;
  userId?: string;
  chatSessionId?: string;
  modelName?: string;
  userAgent?: string;
  ipAddress?: string;
  messageCount?: number;
  requestSize?: number;
  responseSize?: number;
  hasStream?: boolean;
  errorCode?: string;
  errorMessage?: string;
  rateLimited?: boolean;
  blocked?: boolean;
  memoryUsage?: number;
  cpuUsage?: number;
}

export interface AnalyticsMetrics {
  totalRequests: number;
  avgResponseTime: number;
  errorRate: number;
  rateLimitedRate: number;
  topEndpoints: { endpoint: string; count: number; avgResponseTime: number }[];
  topModels: { model: string; count: number; avgResponseTime: number }[];
  requestsByStatus: { statusCode: number; count: number }[];
  hourlyDistribution: { hour: number; count: number }[];
}

export interface UserAnalytics {
  userId: string;
  totalRequests: number;
  totalSessions: number;
  totalMessages: number;
  totalTokens: number;
  avgResponseTime: number;
  favoriteModel: string | null;
  activityByDay: { date: string; requests: number }[];
}

export class AnalyticsService {
  private prisma: PrismaClient;
  private logger: APILogger;

  constructor(prisma: PrismaClient, logger?: APILogger) {
    this.prisma = prisma;
    this.logger = logger || new APILogger();
  }

  // Record an API request for analytics
  async recordAPIRequest(data: CreateAPIRequestData): Promise<APIRequest> {
    const logger = this.logger.withContext({ 
      method: 'recordAPIRequest', 
      correlationId: data.correlationId 
    });

    try {
      const request = await this.prisma.aPIRequest.create({
        data: {
          correlationId: data.correlationId,
          endpoint: data.endpoint,
          method: data.method,
          statusCode: data.statusCode,
          responseTime: data.responseTime,
          userId: data.userId,
          chatSessionId: data.chatSessionId,
          modelName: data.modelName,
          userAgent: data.userAgent,
          ipAddress: data.ipAddress,
          messageCount: data.messageCount,
          requestSize: data.requestSize,
          responseSize: data.responseSize,
          hasStream: data.hasStream || false,
          errorCode: data.errorCode,
          errorMessage: data.errorMessage,
          rateLimited: data.rateLimited || false,
          blocked: data.blocked || false,
          memoryUsage: data.memoryUsage,
          cpuUsage: data.cpuUsage
        }
      });

      logger.debug('API request recorded', { 
        endpoint: data.endpoint,
        statusCode: data.statusCode,
        responseTime: data.responseTime 
      });

      return request;
    } catch (error) {
      logger.error('Failed to record API request', error);
      throw error;
    }
  }

  // Get overall analytics metrics
  async getAnalyticsMetrics(
    startDate?: Date,
    endDate?: Date
  ): Promise<AnalyticsMetrics> {
    const logger = this.logger.withContext({ method: 'getAnalyticsMetrics' });

    try {
      const whereClause: any = {};
      if (startDate || endDate) {
        whereClause.createdAt = {};
        if (startDate) whereClause.createdAt.gte = startDate;
        if (endDate) whereClause.createdAt.lte = endDate;
      }

      const [
        totalRequests,
        avgResponseTime,
        errorCount,
        rateLimitedCount,
        topEndpoints,
        topModels,
        statusCodes
      ] = await Promise.all([
        // Total requests
        this.prisma.aPIRequest.count({ where: whereClause }),
        
        // Average response time
        this.prisma.aPIRequest.aggregate({
          where: whereClause,
          _avg: { responseTime: true }
        }),
        
        // Error count (4xx and 5xx status codes)
        this.prisma.aPIRequest.count({
          where: { ...whereClause, statusCode: { gte: 400 } }
        }),
        
        // Rate limited count
        this.prisma.aPIRequest.count({
          where: { ...whereClause, rateLimited: true }
        }),
        
        // Top endpoints
        this.prisma.aPIRequest.groupBy({
          by: ['endpoint'],
          where: whereClause,
          _count: { endpoint: true },
          _avg: { responseTime: true },
          orderBy: { _count: { endpoint: 'desc' } },
          take: 10
        }),
        
        // Top models
        this.prisma.aPIRequest.groupBy({
          by: ['modelName'],
          where: { ...whereClause, modelName: { not: null } },
          _count: { modelName: true },
          _avg: { responseTime: true },
          orderBy: { _count: { modelName: 'desc' } },
          take: 10
        }),
        
        // Requests by status code
        this.prisma.aPIRequest.groupBy({
          by: ['statusCode'],
          where: whereClause,
          _count: { statusCode: true },
          orderBy: { statusCode: 'asc' }
        })
      ]);

      // Hourly distribution (separate query due to raw SQL)
      const hourlyData = await (whereClause.createdAt ? 
        this.prisma.$queryRaw`
          SELECT 
            strftime('%H', createdAt) as hour,
            COUNT(*) as count
          FROM APIRequest 
          WHERE createdAt >= ${whereClause.createdAt.gte} AND createdAt <= ${whereClause.createdAt.lte}
          GROUP BY strftime('%H', createdAt)
          ORDER BY hour
        ` :
        this.prisma.$queryRaw`
          SELECT 
            strftime('%H', createdAt) as hour,
            COUNT(*) as count
          FROM APIRequest 
          GROUP BY strftime('%H', createdAt)
          ORDER BY hour
        `) as { hour: string; count: number }[];

      const metrics: AnalyticsMetrics = {
        totalRequests,
        avgResponseTime: avgResponseTime._avg.responseTime || 0,
        errorRate: totalRequests > 0 ? (errorCount / totalRequests) * 100 : 0,
        rateLimitedRate: totalRequests > 0 ? (rateLimitedCount / totalRequests) * 100 : 0,
        topEndpoints: topEndpoints.map(ep => ({
          endpoint: ep.endpoint,
          count: ep._count.endpoint,
          avgResponseTime: ep._avg.responseTime || 0
        })),
        topModels: topModels.map(model => ({
          model: model.modelName || 'unknown',
          count: model._count.modelName,
          avgResponseTime: model._avg.responseTime || 0
        })),
        requestsByStatus: statusCodes.map(status => ({
          statusCode: status.statusCode,
          count: status._count.statusCode
        })),
        hourlyDistribution: hourlyData.map(hour => ({
          hour: parseInt(hour.hour),
          count: hour.count
        }))
      };

      logger.debug('Analytics metrics computed', { 
        totalRequests,
        errorRate: metrics.errorRate 
      });

      return metrics;
    } catch (error) {
      logger.error('Failed to get analytics metrics', error);
      throw error;
    }
  }

  // Get user-specific analytics
  async getUserAnalytics(
    userId: string,
    startDate?: Date,
    endDate?: Date
  ): Promise<UserAnalytics> {
    const logger = this.logger.withContext({ method: 'getUserAnalytics', userId });

    try {
      const whereClause: any = { userId };
      if (startDate || endDate) {
        whereClause.createdAt = {};
        if (startDate) whereClause.createdAt.gte = startDate;
        if (endDate) whereClause.createdAt.lte = endDate;
      }

      const [
        user,
        apiRequests,
        avgResponseTime,
        favoriteModel
      ] = await Promise.all([
        // User data
        this.prisma.user.findUnique({
          where: { id: userId },
          select: { 
            totalSessions: true, 
            totalMessages: true, 
            totalTokens: true 
          }
        }),
        
        // Total API requests for user
        this.prisma.aPIRequest.count({ where: whereClause }),
        
        // Average response time for user
        this.prisma.aPIRequest.aggregate({
          where: whereClause,
          _avg: { responseTime: true }
        }),
        
        // Most used model
        this.prisma.aPIRequest.groupBy({
          by: ['modelName'],
          where: { ...whereClause, modelName: { not: null } },
          _count: { modelName: true },
          orderBy: { _count: { modelName: 'desc' } },
          take: 1
        })
      ]);

      // Daily activity (separate query due to raw SQL)
      const dailyActivity = await (whereClause.createdAt ?
        this.prisma.$queryRaw`
          SELECT 
            DATE(createdAt) as date,
            COUNT(*) as requests
          FROM APIRequest 
          WHERE userId = ${userId} AND createdAt >= ${whereClause.createdAt.gte} AND createdAt <= ${whereClause.createdAt.lte}
          GROUP BY DATE(createdAt)
          ORDER BY date DESC
          LIMIT 30
        ` :
        this.prisma.$queryRaw`
          SELECT 
            DATE(createdAt) as date,
            COUNT(*) as requests
          FROM APIRequest 
          WHERE userId = ${userId}
          GROUP BY DATE(createdAt)
          ORDER BY date DESC
          LIMIT 30
        `) as { date: string; requests: number }[];

      if (!user) {
        throw new Error(`User not found: ${userId}`);
      }

      const analytics: UserAnalytics = {
        userId,
        totalRequests: apiRequests,
        totalSessions: user.totalSessions,
        totalMessages: user.totalMessages,
        totalTokens: Number(user.totalTokens), // Convert BigInt to number
        avgResponseTime: avgResponseTime._avg.responseTime || 0,
        favoriteModel: favoriteModel.length > 0 ? favoriteModel[0].modelName : null,
        activityByDay: dailyActivity.map(day => ({
          date: day.date,
          requests: day.requests
        }))
      };

      logger.debug('User analytics computed', { 
        userId,
        totalRequests: analytics.totalRequests 
      });

      return analytics;
    } catch (error) {
      logger.error('Failed to get user analytics', error);
      throw error;
    }
  }

  // Get model performance metrics
  async getModelMetrics(modelName: string, days: number = 7): Promise<{
    totalRequests: number;
    avgResponseTime: number;
    errorRate: number;
    successRate: number;
    totalTokens: number;
    avgTokensPerRequest: number;
  }> {
    const logger = this.logger.withContext({ method: 'getModelMetrics', modelName });

    try {
      const startDate = new Date();
      startDate.setDate(startDate.getDate() - days);

      const [requests, totalMessages] = await Promise.all([
        this.prisma.aPIRequest.findMany({
          where: {
            modelName,
            createdAt: { gte: startDate }
          },
          select: {
            statusCode: true,
            responseTime: true,
            messageCount: true
          }
        }),
        
        this.prisma.message.aggregate({
          where: {
            model: modelName,
            createdAt: { gte: startDate }
          },
          _sum: { tokenCount: true },
          _count: { id: true }
        })
      ]);

      const totalRequests = requests.length;
      const successfulRequests = requests.filter(r => r.statusCode < 400).length;
      const avgResponseTime = requests.reduce((sum, r) => sum + r.responseTime, 0) / totalRequests || 0;
      const totalTokens = totalMessages._sum.tokenCount || 0;

      const metrics = {
        totalRequests,
        avgResponseTime,
        errorRate: totalRequests > 0 ? ((totalRequests - successfulRequests) / totalRequests) * 100 : 0,
        successRate: totalRequests > 0 ? (successfulRequests / totalRequests) * 100 : 0,
        totalTokens,
        avgTokensPerRequest: totalRequests > 0 ? totalTokens / totalRequests : 0
      };

      logger.debug('Model metrics computed', { modelName, ...metrics });
      return metrics;
    } catch (error) {
      logger.error('Failed to get model metrics', error);
      throw error;
    }
  }

  // Clean up old analytics data
  async cleanupOldData(retentionDays: number = 90): Promise<number> {
    const logger = this.logger.withContext({ method: 'cleanupOldData' });

    try {
      const cutoffDate = new Date();
      cutoffDate.setDate(cutoffDate.getDate() - retentionDays);

      const result = await this.prisma.aPIRequest.deleteMany({
        where: {
          createdAt: { lt: cutoffDate }
        }
      });

      logger.info('Old analytics data cleaned up', { 
        deletedRecords: result.count,
        cutoffDate 
      });

      return result.count;
    } catch (error) {
      logger.error('Failed to cleanup old data', error);
      throw error;
    }
  }
}