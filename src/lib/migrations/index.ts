export * from './types';
export * from './registry';

// Export migrations
import { Migration } from './types';

// Define migrations here
export const migrations: Migration[] = [
  // Example migration for future use:
  // {
  //   version: 2,
  //   description: 'Add new field to LLM config',
  //   migrate: async (config: any) => {
  //     if (config.type === 'llm') {
  //       return {
  //         ...config,
  //         newField: 'default value'
  //       };
  //     }
  //     return config;
  //   }
  // }
]; 