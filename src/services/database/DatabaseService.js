import { prisma } from './client';
export class DatabaseService {
    // User operations
    async createUser(data) {
        return prisma.user.create({ data });
    }
    async getUser(id) {
        return prisma.user.findUnique({ where: { id } });
    }
    async updateUser(id, data) {
        return prisma.user.update({ where: { id }, data });
    }
    async deleteUser(id) {
        return prisma.user.delete({ where: { id } });
    }
    // Settings operations
    async getSetting(key) {
        return prisma.settings.findUnique({ where: { key } });
    }
    async setSetting(key, value, description) {
        return prisma.settings.upsert({
            where: { key },
            update: { value, description },
            create: { key, value, description },
        });
    }
    async deleteSetting(key) {
        return prisma.settings.delete({ where: { key } });
    }
    // MCP Server operations
    async createMCPServer(data) {
        return prisma.mCPServer.create({ data });
    }
    async getMCPServer(id) {
        return prisma.mCPServer.findUnique({ where: { id } });
    }
    async updateMCPServer(id, data) {
        return prisma.mCPServer.update({ where: { id }, data });
    }
    async deleteMCPServer(id) {
        return prisma.mCPServer.delete({ where: { id } });
    }
    async listMCPServers() {
        return prisma.mCPServer.findMany();
    }
    // Model operations
    async createModel(data) {
        return prisma.model.create({ data });
    }
    async getModel(id) {
        return prisma.model.findUnique({ where: { id } });
    }
    async updateModel(id, data) {
        return prisma.model.update({ where: { id }, data });
    }
    async deleteModel(id) {
        return prisma.model.delete({ where: { id } });
    }
    async listModels() {
        return prisma.model.findMany();
    }
    // Chat Session operations
    async createChatSession(data) {
        return prisma.chatSession.create({ data });
    }
    async getChatSession(id) {
        return prisma.chatSession.findUnique({
            where: { id },
            include: { messages: true },
        });
    }
    async updateChatSession(id, data) {
        return prisma.chatSession.update({ where: { id }, data });
    }
    async deleteChatSession(id) {
        return prisma.chatSession.delete({ where: { id } });
    }
    async listChatSessions(userId) {
        return prisma.chatSession.findMany({
            where: { userId },
            include: { messages: true },
        });
    }
    // Message operations
    async createMessage(data) {
        return prisma.message.create({ data });
    }
    async getMessage(id) {
        return prisma.message.findUnique({ where: { id } });
    }
    async updateMessage(id, data) {
        return prisma.message.update({ where: { id }, data });
    }
    async deleteMessage(id) {
        return prisma.message.delete({ where: { id } });
    }
    // Utility methods
    async clearDatabase() {
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
//# sourceMappingURL=DatabaseService.js.map