import { DatabaseService } from '../../src/services/database/DatabaseService';
import {
  clearDatabase,
  createTestUser,
  createTestModel,
  createTestMCPServer,
  createTestChatSession,
  createTestMessage,
} from '../helpers/database';

describe('DatabaseService', () => {
  const db = new DatabaseService();

  beforeEach(async () => {
    await clearDatabase();
  });

  describe('User operations', () => {
    it('creates and retrieves a user', async () => {
      const user = await db.createUser({ name: 'Test User', email: 'test@example.com' });
      expect(user.name).toBe('Test User');
      expect(user.email).toBe('test@example.com');

      const retrieved = await db.getUser(user.id);
      expect(retrieved).toEqual(user);
    });

    it('updates a user', async () => {
      const user = await createTestUser();
      const updated = await db.updateUser(user.id, { name: 'Updated Name' });
      expect(updated.name).toBe('Updated Name');
    });

    it('deletes a user', async () => {
      const user = await createTestUser();
      await db.deleteUser(user.id);
      const retrieved = await db.getUser(user.id);
      expect(retrieved).toBeNull();
    });
  });

  describe('Settings operations', () => {
    it('sets and gets a setting', async () => {
      const setting = await db.setSetting('test-key', 'test-value', 'test description');
      expect(setting.value).toBe('test-value');

      const retrieved = await db.getSetting('test-key');
      expect(retrieved).toEqual(setting);
    });

    it('updates an existing setting', async () => {
      await db.setSetting('test-key', 'old-value');
      const updated = await db.setSetting('test-key', 'new-value');
      expect(updated.value).toBe('new-value');
    });

    it('deletes a setting', async () => {
      const setting = await db.setSetting('test-key', 'test-value');
      await db.deleteSetting(setting.key);
      const retrieved = await db.getSetting(setting.key);
      expect(retrieved).toBeNull();
    });
  });

  describe('MCP Server operations', () => {
    it('creates and retrieves a server', async () => {
      const model = await createTestModel();
      const server = await db.createMCPServer({
        name: 'Test Server',
        port: 3000,
        model: { connect: { id: model.id } },
      });
      expect(server.name).toBe('Test Server');

      const retrieved = await db.getMCPServer(server.id);
      expect(retrieved).toEqual(server);
    });

    it('lists all servers', async () => {
      await createTestMCPServer('Server 1');
      await createTestMCPServer('Server 2');
      const servers = await db.listMCPServers();
      expect(servers).toHaveLength(2);
    });
  });

  describe('Model operations', () => {
    it('creates and retrieves a model', async () => {
      const model = await createTestModel();
      const retrieved = await db.getModel(model.id);
      expect(retrieved).toEqual(model);
    });

    it('lists all models', async () => {
      await createTestModel('Model 1');
      await createTestModel('Model 2');
      const models = await db.listModels();
      expect(models).toHaveLength(2);
    });
  });

  describe('Chat Session operations', () => {
    it('creates and retrieves a chat session with messages', async () => {
      const session = await createTestChatSession();
      await db.createMessage({
        content: 'Test message',
        role: 'user',
        chatSession: { connect: { id: session.id } },
      });

      const retrieved = await db.getChatSession(session.id);
      expect(retrieved?.messages).toHaveLength(1);
    });

    it('lists chat sessions for a user', async () => {
      const user = await createTestUser();
      const model = await createTestModel();
      
      await db.createChatSession({
        name: 'Session 1',
        user: { connect: { id: user.id } },
        model: { connect: { id: model.id } },
      });
      await db.createChatSession({
        name: 'Session 2',
        user: { connect: { id: user.id } },
        model: { connect: { id: model.id } },
      });

      const sessions = await db.listChatSessions(user.id);
      expect(sessions).toHaveLength(2);
    });
  });

  describe('Message operations', () => {
    it('creates and retrieves a message', async () => {
      const message = await createTestMessage();
      const retrieved = await db.getMessage(message.id);
      expect(retrieved).toEqual(message);
    });

    it('updates a message', async () => {
      const message = await createTestMessage();
      const updated = await db.updateMessage(message.id, { content: 'Updated content' });
      expect(updated.content).toBe('Updated content');
    });
  });
}); 