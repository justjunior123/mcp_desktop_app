import { PrismaClient } from '@prisma/client';

const mockPrisma = {
  chat: {
    create: jest.fn(),
    findMany: jest.fn(),
    findUnique: jest.fn(),
    update: jest.fn(),
    delete: jest.fn(),
  },
  model: {
    create: jest.fn(),
    findMany: jest.fn(),
    findUnique: jest.fn(),
    update: jest.fn(),
    delete: jest.fn(),
  },
  $connect: jest.fn(),
  $disconnect: jest.fn(),
};

global.prisma = mockPrisma as unknown as PrismaClient;

jest.mock('../../src/services/database/client', () => ({
  prisma: mockPrisma,
  default: mockPrisma
}));

export default mockPrisma; 