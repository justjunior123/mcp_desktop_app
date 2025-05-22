import { EventEmitter } from 'events';

export class SessionManager extends EventEmitter {
  private sessions: Map<string, {
    createdAt: Date;
    lastActivity: Date;
    status: 'initializing' | 'active' | 'closed';
  }> = new Map();
  private cleanupIntervalId: NodeJS.Timeout | null = null;

  constructor() {
    super();
    this.startCleanupInterval();
  }

  public createSession(): string {
    const sessionId = crypto.randomUUID();
    this.sessions.set(sessionId, {
      createdAt: new Date(),
      lastActivity: new Date(),
      status: 'initializing'
    });
    return sessionId;
  }

  public initializeSession(sessionId: string): void {
    const session = this.sessions.get(sessionId);
    if (session) {
      session.status = 'active';
      session.lastActivity = new Date();
      this.emit('sessionInitialized', sessionId);
    }
  }

  public closeSession(sessionId: string): void {
    const session = this.sessions.get(sessionId);
    if (session) {
      session.status = 'closed';
      this.emit('sessionClosed', sessionId);
    }
  }

  public updateActivity(sessionId: string): void {
    const session = this.sessions.get(sessionId);
    if (session) {
      session.lastActivity = new Date();
    }
  }

  private startCleanupInterval(): void {
    // Clean up inactive sessions every 5 minutes
    this.cleanupIntervalId = setInterval(() => {
      const now = new Date();
      for (const [sessionId, session] of this.sessions.entries()) {
        // Close sessions inactive for more than 30 minutes
        if (now.getTime() - session.lastActivity.getTime() > 30 * 60 * 1000) {
          this.closeSession(sessionId);
          this.sessions.delete(sessionId);
        }
      }
    }, 5 * 60 * 1000);
  }

  public cleanup(): void {
    if (this.cleanupIntervalId) {
      clearInterval(this.cleanupIntervalId);
      this.cleanupIntervalId = null;
    }
    this.sessions.clear();
    this.removeAllListeners();
  }
} 