import { prisma } from './client';

export class DatabaseService {
  private static instance: DatabaseService;
  private isInitialized = false;

  private constructor() {}

  static getInstance(): DatabaseService {
    if (!DatabaseService.instance) {
      DatabaseService.instance = new DatabaseService();
    }
    return DatabaseService.instance;
  }

  async init() {
    if (this.isInitialized) {
      console.log('📊 Database already initialized');
      return;
    }

    try {
      console.log('📊 Initializing database connection...');
      
      // Test the connection
      await prisma.$connect();
      
      // Run any necessary migrations in development
      if (process.env.NODE_ENV === 'development') {
        const { exec } = require('child_process');
        await new Promise((resolve, reject) => {
          exec('npx prisma migrate deploy', (error: any) => {
            if (error) {
              console.error('❌ Failed to run migrations:', error);
              reject(error);
            } else {
              console.log('✅ Migrations applied successfully');
              resolve(null);
            }
          });
        });
      }

      this.isInitialized = true;
      console.log('✅ Database initialized successfully');
    } catch (error) {
      console.error('❌ Failed to initialize database:', error);
      throw error;
    }
  }

  async cleanup() {
    if (!this.isInitialized) {
      return;
    }

    try {
      console.log('🧹 Cleaning up database connection...');
      await prisma.$disconnect();
      this.isInitialized = false;
      console.log('✅ Database cleanup completed');
    } catch (error) {
      console.error('❌ Error during database cleanup:', error);
      throw error;
    }
  }
} 