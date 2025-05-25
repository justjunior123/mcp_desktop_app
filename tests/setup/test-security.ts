import { Request, Response, NextFunction } from 'express';

// Mock rate limiting middleware for tests - just pass through
export const mockChatRateLimit = (req: Request, res: Response, next: NextFunction) => {
  next();
};

export const mockModelOperationsRateLimit = (req: Request, res: Response, next: NextFunction) => {
  next();
};

export const mockTimeoutMiddleware = (timeoutMs: number = 30000) => {
  return (req: Request, res: Response, next: NextFunction) => {
    next();
  };
};

export const mockSecurityAuditLogger = (req: Request, res: Response, next: NextFunction) => {
  next();
};

// Mock the security module
jest.mock('../../src/lib/security', () => ({
  ...jest.requireActual('../../src/lib/security'),
  chatRateLimit: mockChatRateLimit,
  modelOperationsRateLimit: mockModelOperationsRateLimit,
  timeoutMiddleware: mockTimeoutMiddleware,
  securityAuditLogger: mockSecurityAuditLogger
}));