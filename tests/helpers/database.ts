import { prisma } from '../../src/services/database/client';
import { DatabaseService } from '../../src/services/database/DatabaseService';

export const databaseService = new DatabaseService();

export async function clearDatabase(): Promise<void> {
  await databaseService.clearDatabase();
}

export async function createTestUser(name: string = 'Test User', email: string = 'test@example.com') {
  return databaseService.createUser({ name, email });
}

export async function createTestModel(name: string = 'Test Model') {
  return databaseService.createModel({
    name,
    status: 'not_installed',
    parameters: JSON.stringify({ test: true }),
  });
}

export async function createTestMCPServer(name: string = 'Test Server', port: number = 3000) {
  const model = await createTestModel();
  return databaseService.createMCPServer({
    name,
    port,
    model: { connect: { id: model.id } },
  });
}

export async function createTestChatSession(name: string = 'Test Chat') {
  const user = await createTestUser();
  const model = await createTestModel();
  return databaseService.createChatSession({
    name,
    user: { connect: { id: user.id } },
    model: { connect: { id: model.id } },
  });
}

export async function createTestMessage(content: string = 'Test message', role: string = 'user') {
  const chatSession = await createTestChatSession();
  return databaseService.createMessage({
    content,
    role,
    chatSession: { connect: { id: chatSession.id } },
  });
} 