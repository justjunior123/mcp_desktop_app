import { Express } from 'express';
import { Server } from 'http';
import { DatabaseService } from '../database/DatabaseService';
import { OllamaService } from './OllamaService';
import { ModelManager } from './ModelManager';
import { ModelController } from './ModelController';
import { WebSocketManager } from './WebSocketManager';
import { logger } from '../logging';

/**
 * Set up the Ollama integration with the Express server
 * @param app Express application
 * @param server HTTP server
 * @param db Database service
 * @returns An object with the initialized services
 */
export function setupOllamaServices(
  app: Express,
  server: Server,
  db: DatabaseService,
  ollamaBaseUrl: string = 'http://localhost:11434'
) {
  const log = logger.withCategory('ollama-setup');
  
  log.info('Setting up Ollama services');
  
  // Initialize services
  const ollamaService = new OllamaService(ollamaBaseUrl);
  const modelManager = new ModelManager(db, ollamaService);
  const modelController = new ModelController(modelManager);
  const wsManager = new WebSocketManager(server, modelManager, ollamaService);
  
  // Mount API routes
  app.use('/api', modelController.getRouter());
  
  // Start polling for model status updates
  modelManager.startStatusPolling(10000); // Check every 10 seconds
  
  log.info('Ollama services initialized successfully');
  
  // Initial model refresh
  modelManager.refreshModelStatuses().catch(error => {
    log.error('Error during initial model status refresh', { error });
  });
  
  // Return services for use elsewhere
  return {
    ollamaService,
    modelManager,
    modelController,
    wsManager,
    
    // Cleanup function to shut down services
    cleanup: () => {
      log.info('Cleaning up Ollama services');
      modelManager.stopStatusPolling();
      wsManager.closeAll();
    }
  };
} 