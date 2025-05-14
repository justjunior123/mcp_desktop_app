import { prisma } from './client';
import { Prisma, User, Settings, MCPServer, Model, ChatSession, Message } from '@prisma/client';

export class DatabaseService {
  // User operations
  async createUser(data: Prisma.UserCreateInput): Promise<User> {
    return prisma.user.create({ data });
  }

  async getUser(id: string): Promise<User | null> {
    return prisma.user.findUnique({ where: { id } });
  }

  async updateUser(id: string, data: Prisma.UserUpdateInput): Promise<User> {
    return prisma.user.update({ where: { id }, data });
  }

  async deleteUser(id: string): Promise<User> {
    return prisma.user.delete({ where: { id } });
  }

  // Settings operations
  async getSetting(key: string): Promise<Settings | null> {
    return prisma.settings.findUnique({ where: { key } });
  }

  async setSetting(key: string, value: string, description?: string): Promise<Settings> {
    return prisma.settings.upsert({
      where: { key },
      update: { value, description },
      create: { key, value, description },
    });
  }

  async deleteSetting(key: string): Promise<Settings> {
    return prisma.settings.delete({ where: { key } });
  }

  // MCP Server operations
  async createMCPServer(data: Prisma.MCPServerCreateInput): Promise<MCPServer> {
    return prisma.mCPServer.create({ data });
  }

  async getMCPServer(id: string): Promise<MCPServer | null> {
    return prisma.mCPServer.findUnique({ where: { id } });
  }

  async updateMCPServer(id: string, data: Prisma.MCPServerUpdateInput): Promise<MCPServer> {
    return prisma.mCPServer.update({ where: { id }, data });
  }

  async deleteMCPServer(id: string): Promise<MCPServer> {
    return prisma.mCPServer.delete({ where: { id } });
  }

  async listMCPServers(): Promise<MCPServer[]> {
    return prisma.mCPServer.findMany();
  }

  // Model operations
  async createModel(data: Prisma.ModelCreateInput): Promise<Model> {
    return prisma.model.create({ data });
  }

  async getModel(id: string): Promise<Model | null> {
    return prisma.model.findUnique({ where: { id } });
  }

  async updateModel(id: string, data: Prisma.ModelUpdateInput): Promise<Model> {
    return prisma.model.update({ where: { id }, data });
  }

  async deleteModel(id: string): Promise<Model> {
    return prisma.model.delete({ where: { id } });
  }

  async listModels(): Promise<Model[]> {
    return prisma.model.findMany();
  }

  // Chat Session operations
  async createChatSession(data: Prisma.ChatSessionCreateInput): Promise<ChatSession> {
    return prisma.chatSession.create({ data });
  }

  async getChatSession(id: string): Promise<ChatSession | null> {
    return prisma.chatSession.findUnique({
      where: { id },
      include: { messages: true },
    });
  }

  async updateChatSession(id: string, data: Prisma.ChatSessionUpdateInput): Promise<ChatSession> {
    return prisma.chatSession.update({ where: { id }, data });
  }

  async deleteChatSession(id: string): Promise<ChatSession> {
    return prisma.chatSession.delete({ where: { id } });
  }

  async listChatSessions(userId: string): Promise<ChatSession[]> {
    return prisma.chatSession.findMany({
      where: { userId },
      include: { messages: true },
    });
  }

  // Message operations
  async createMessage(data: Prisma.MessageCreateInput): Promise<Message> {
    return prisma.message.create({ data });
  }

  async getMessage(id: string): Promise<Message | null> {
    return prisma.message.findUnique({ where: { id } });
  }

  async updateMessage(id: string, data: Prisma.MessageUpdateInput): Promise<Message> {
    return prisma.message.update({ where: { id }, data });
  }

  async deleteMessage(id: string): Promise<Message> {
    return prisma.message.delete({ where: { id } });
  }

  // Utility methods
  async clearDatabase(): Promise<void> {
    // Only allow in development/test environment
    if (process.env.NODE_ENV === 'production') {
      throw new Error('Cannot clear database in production');
    }

    await prisma.$transaction([
      prisma.message.deleteMany(),
      prisma.chatSession.deleteMany(),
      prisma.mCPServer.deleteMany(),
      prisma.model.deleteMany(),
      prisma.user.deleteMany(),
      prisma.settings.deleteMany(),
    ]);
  }
} 