import { PrismaClient, Prisma, User, Settings, MCPServer, Model, ChatSession, Message } from '@prisma/client';
import { logger } from '../logging';

export class DatabaseService {
  private prisma: PrismaClient;

  constructor() {
    this.prisma = new PrismaClient();
    logger.info('DatabaseService initialized');
  }

  async isHealthy(): Promise<boolean> {
    try {
      await this.prisma.$queryRaw`SELECT 1`;
      return true;
    } catch (err) {
      const error = err as Error;
      logger.error('Database health check failed:', {
        message: error.message,
        stack: error.stack
      });
      return false;
    }
  }

  async close(): Promise<void> {
    await this.prisma.$disconnect();
    logger.info('DatabaseService disconnected');
  }

  // User operations
  async createUser(data: Prisma.UserCreateInput): Promise<User> {
    return this.prisma.user.create({ data });
  }

  async getUser(id: string): Promise<User | null> {
    return this.prisma.user.findUnique({ where: { id } });
  }

  async updateUser(id: string, data: Prisma.UserUpdateInput): Promise<User> {
    return this.prisma.user.update({ where: { id }, data });
  }

  async deleteUser(id: string): Promise<User> {
    return this.prisma.user.delete({ where: { id } });
  }

  // Settings operations
  async getSetting(key: string): Promise<Settings | null> {
    return this.prisma.settings.findUnique({ where: { key } });
  }

  async setSetting(key: string, value: string, description?: string): Promise<Settings> {
    return this.prisma.settings.upsert({
      where: { key },
      update: { value, description },
      create: { key, value, description },
    });
  }

  async deleteSetting(key: string): Promise<Settings> {
    return this.prisma.settings.delete({ where: { key } });
  }

  // MCP Server operations
  async createMCPServer(data: Prisma.MCPServerCreateInput): Promise<MCPServer> {
    return this.prisma.mCPServer.create({ data });
  }

  async getMCPServer(id: string): Promise<MCPServer | null> {
    return this.prisma.mCPServer.findUnique({ where: { id } });
  }

  async updateMCPServer(id: string, data: Prisma.MCPServerUpdateInput): Promise<MCPServer> {
    return this.prisma.mCPServer.update({ where: { id }, data });
  }

  async deleteMCPServer(id: string): Promise<MCPServer> {
    return this.prisma.mCPServer.delete({ where: { id } });
  }

  async listMCPServers(): Promise<MCPServer[]> {
    return this.prisma.mCPServer.findMany();
  }

  // Model operations
  async createModel(data: Prisma.ModelCreateInput): Promise<Model> {
    return this.prisma.model.create({ data });
  }

  async getModel(id: string): Promise<Model | null> {
    return this.prisma.model.findUnique({ where: { id } });
  }

  async updateModel(id: string, data: Prisma.ModelUpdateInput): Promise<Model> {
    return this.prisma.model.update({ where: { id }, data });
  }

  async deleteModel(id: string): Promise<Model> {
    return this.prisma.model.delete({ where: { id } });
  }

  async listModels(): Promise<Model[]> {
    return this.prisma.model.findMany();
  }

  // Chat Session operations
  async createChatSession(data: Prisma.ChatSessionCreateInput): Promise<ChatSession> {
    return this.prisma.chatSession.create({ data });
  }

  async getChatSession(id: string): Promise<ChatSession | null> {
    return this.prisma.chatSession.findUnique({
      where: { id },
      include: { messages: true },
    });
  }

  async updateChatSession(id: string, data: Prisma.ChatSessionUpdateInput): Promise<ChatSession> {
    return this.prisma.chatSession.update({ where: { id }, data });
  }

  async deleteChatSession(id: string): Promise<ChatSession> {
    return this.prisma.chatSession.delete({ where: { id } });
  }

  async listChatSessions(userId: string): Promise<ChatSession[]> {
    return this.prisma.chatSession.findMany({
      where: { userId },
      include: { messages: true },
    });
  }

  // Message operations
  async createMessage(data: Prisma.MessageCreateInput): Promise<Message> {
    return this.prisma.message.create({ data });
  }

  async getMessage(id: string): Promise<Message | null> {
    return this.prisma.message.findUnique({ where: { id } });
  }

  async updateMessage(id: string, data: Prisma.MessageUpdateInput): Promise<Message> {
    return this.prisma.message.update({ where: { id }, data });
  }

  async deleteMessage(id: string): Promise<Message> {
    return this.prisma.message.delete({ where: { id } });
  }

  // Utility methods
  async clearDatabase(): Promise<void> {
    // Only allow in development/test environment
    if (process.env.NODE_ENV === 'production') {
      throw new Error('Cannot clear database in production');
    }

    await this.prisma.$transaction([
      this.prisma.message.deleteMany(),
      this.prisma.chatSession.deleteMany(),
      this.prisma.mCPServer.deleteMany(),
      this.prisma.model.deleteMany(),
      this.prisma.user.deleteMany(),
      this.prisma.settings.deleteMany(),
    ]);
  }
} 