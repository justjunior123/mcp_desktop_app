import { PrismaClient } from '@prisma/client';
import { ChatService } from './ChatService';
import { AnalyticsService } from './AnalyticsService';
import { APILogger } from '../../lib/api-logger';

// Singleton Prisma client instance
let prisma: PrismaClient;

export function getPrismaClient(): PrismaClient {
  if (!prisma) {
    prisma = new PrismaClient({
      log: process.env.NODE_ENV === 'development' ? ['query', 'error', 'warn'] : ['error'],
      errorFormat: 'pretty',
    });
  }
  return prisma;
}

// Service factory functions
export function createChatService(logger?: APILogger): ChatService {
  return new ChatService(getPrismaClient(), logger);
}

export function createAnalyticsService(logger?: APILogger): AnalyticsService {
  return new AnalyticsService(getPrismaClient(), logger);
}

// Graceful shutdown
export async function disconnectDatabase(): Promise<void> {
  if (prisma) {
    await prisma.$disconnect();
  }
}

// Health check
export async function checkDatabaseHealth(): Promise<boolean> {
  try {
    await getPrismaClient().$queryRaw`SELECT 1`;
    return true;
  } catch (error) {
    console.error('Database health check failed:', error);
    return false;
  }
}

// Database initialization
export async function initializeDatabase(): Promise<void> {
  const logger = new APILogger({ service: 'database' });
  
  try {
    // Check database connection
    await getPrismaClient().$connect();
    logger.info('Database connected successfully');
    
    // Run any startup migrations if needed
    // await prisma.$migrate.reset(); // Only in development
    
    // Verify essential tables exist
    const userCount = await getPrismaClient().user.count();
    logger.info('Database initialization complete', { userCount });
  } catch (error) {
    logger.error('Database initialization failed', error);
    throw error;
  }
}

// Export services and client
export { ChatService, AnalyticsService, PrismaClient };
export type { 
  CreateChatSessionData, 
  CreateMessageData, 
  ChatSessionWithDetails 
} from './ChatService';
export type { 
  CreateAPIRequestData, 
  AnalyticsMetrics, 
  UserAnalytics 
} from './AnalyticsService';