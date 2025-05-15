import express, { Express, Request, Response, NextFunction } from 'express';
import rateLimit from 'express-rate-limit';
import { MCPServerManager } from './MCPServerManager';
import { logger } from '../../services/logging';
import { createRequestLogger, createErrorLogger } from '../../services/logging/middleware/expressMiddleware';

type AsyncRequestHandler = (req: Request, res: Response, next: NextFunction) => Promise<void>;
type ErrorRequestHandler = (err: Error, req: Request, res: Response, next: NextFunction) => void;

export function setupExpressApp(manager: MCPServerManager): Express {
  const app = express();

  // Set up request logging
  const expressLogger = logger.withCategory('express');
  app.use(createRequestLogger(expressLogger, {
    skip: (req) => req.path === '/api/health', // Don't log health checks
    logBody: true
  }));

  // Middleware
  app.use(express.json({
    verify: (req: any, res: any, buf: Buffer) => {
      try {
        JSON.parse(buf.toString());
      } catch (e) {
        throw new Error('Invalid JSON');
      }
    }
  }));

  // Error handling middleware for JSON parsing
  app.use((err: Error, req: Request, res: Response, next: NextFunction): void => {
    if (err instanceof SyntaxError || err.message === 'Invalid JSON') {
      res.status(400).json({ error: 'Invalid JSON format' });
      return;
    }
    next(err);
  });
  
  // Apply rate limiting to all routes except health check
  const apiLimiter = rateLimit({
    windowMs: 1000, // 1 second for testing
    max: 10, // increased from 5 to 10 requests per second
    standardHeaders: true,
    legacyHeaders: false,
    skipSuccessfulRequests: true, // Skip successful requests to avoid hitting limit too quickly
    skip: (req) => req.path === '/api/health' || req.path.startsWith('/api/health/'),
    message: { error: 'Too many requests, please try again later' }
  });
  
  app.use('/api', apiLimiter);

  // Health check endpoint
  app.get('/api/health', (req: Request, res: Response) => {
    res.json({
      status: 'ok',
      timestamp: new Date().toISOString(),
      uptime: process.uptime()
    });
  });

  // Server management endpoints
  const listServers: AsyncRequestHandler = async (_req, res) => {
    try {
      const servers = await manager.listServers();
      res.json(servers);
    } catch (error) {
      expressLogger.error('Failed to list servers', { error });
      res.status(500).json({ error: 'Internal server error' });
    }
  };
  app.get('/api/servers', listServers);

  const createServer: AsyncRequestHandler = async (req, res) => {
    try {
      const { name, port, modelId } = req.body;
      if (!name || !port || !modelId) {
        expressLogger.warn('Missing required fields for server creation', { body: req.body });
        res.status(400).json({ error: 'Missing required fields' });
        return;
      }

      // Check if port is available
      const isAvailable = await manager.isPortAvailable(port);
      if (!isAvailable) {
        expressLogger.warn('Port already in use', { port });
        res.status(409).json({ error: 'Port already in use' });
        return;
      }

      // Check if any existing server is using this port
      const existingServers = await manager.listServers();
      if (existingServers.some(s => s.port === port)) {
        expressLogger.warn('Port already used by existing server', { port });
        res.status(409).json({ error: 'Port already in use' });
        return;
      }

      expressLogger.info('Creating new server', { name, port, modelId });
      const server = await manager.createServer(name, port, modelId);
      res.status(201).json(server);
    } catch (error) {
      if (error instanceof Error && error.message.includes('Port')) {
        expressLogger.warn('Port conflict when creating server', { 
          error: error.message, 
          port: req.body.port 
        });
        res.status(409).json({ error: 'Port already in use' });
      } else {
        expressLogger.error('Failed to create server', { 
          error: error instanceof Error ? error.message : String(error),
          stack: error instanceof Error ? error.stack : undefined
        });
        res.status(500).json({ error: 'Internal server error' });
      }
    }
  };
  app.post('/api/servers', createServer);

  const getServer: AsyncRequestHandler = async (req, res) => {
    try {
      const serverInstance = await manager.getServer(req.params.id);
      if (!serverInstance) {
        res.status(404).json({ error: 'Server not found' });
        return;
      }

      // Get server status from database
      const dbServer = await manager.getServerStatus(req.params.id);
      if (!dbServer) {
        res.status(404).json({ error: 'Server not found in database' });
        return;
      }

      res.json({
        ...dbServer,
        port: serverInstance.getPort()
      });
    } catch (error) {
      res.status(500).json({ error: 'Internal server error' });
    }
  };
  app.get('/api/servers/:id', getServer);

  const updateServer: AsyncRequestHandler = async (req, res) => {
    try {
      const server = await manager.updateServer(req.params.id, req.body);
      res.json(server);
    } catch (error) {
      if (error instanceof Error) {
        if (error.message.includes('not found')) {
          res.status(404).json({ error: 'Server not found' });
        } else if (error.message.includes('invalid')) {
          res.status(400).json({ error: error.message });
        } else {
          res.status(500).json({ error: 'Internal server error' });
        }
      }
    }
  };
  app.put('/api/servers/:id', updateServer);

  const startServer: AsyncRequestHandler = async (req, res) => {
    try {
      await manager.startServer(req.params.id);
      const server = await manager.getServer(req.params.id);
      res.json(server);
    } catch (error) {
      if (error instanceof Error) {
        if (error.message.includes('not found')) {
          res.status(404).json({ error: 'Server not found' });
        } else if (error.message.includes('already running')) {
          res.status(409).json({ error: 'Server already running' });
        } else {
          res.status(500).json({ error: 'Internal server error' });
        }
      }
    }
  };
  app.post('/api/servers/:id/start', startServer);

  const stopServer: AsyncRequestHandler = async (req, res) => {
    try {
      await manager.stopServer(req.params.id);
      const server = await manager.getServer(req.params.id);
      res.json(server);
    } catch (error) {
      if (error instanceof Error) {
        if (error.message.includes('not found')) {
          res.status(404).json({ error: 'Server not found' });
        } else if (error.message.includes('already stopped')) {
          res.status(409).json({ error: 'Server already stopped' });
        } else {
          res.status(500).json({ error: 'Internal server error' });
        }
      }
    }
  };
  app.post('/api/servers/:id/stop', stopServer);

  const deleteServer: AsyncRequestHandler = async (req, res) => {
    try {
      const server = await manager.getServer(req.params.id);
      if (!server) {
        res.status(404).json({ error: 'Server not found' });
        return;
      }
      
      // Get server status from database
      const dbServer = await manager.getServerStatus(req.params.id);
      if (dbServer?.status === 'running') {
        res.status(409).json({ error: 'Cannot delete running server' });
        return;
      }
      
      await manager.deleteServer(req.params.id);
      res.status(204).send();
    } catch (error) {
      res.status(500).json({ error: 'Internal server error' });
    }
  };
  app.delete('/api/servers/:id', deleteServer);

  // Error handling middleware
  const errorHandler: ErrorRequestHandler = (err, req, res, next) => {
    console.error(err.stack);
    res.status(500).json({ error: 'Internal server error' });
  };
  app.use(errorHandler);

  // Add error logging middleware before the general error handler
  app.use(createErrorLogger(logger.withCategory('express-error')));

  return app;
} 