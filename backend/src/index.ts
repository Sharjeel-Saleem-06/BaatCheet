/**
 * BaatCheet Backend Server
 * Advanced AI Chat Application with Multi-Provider Support
 * 
 * @module Server
 */

import express, { Application } from 'express';
import cors from 'cors';
import helmet from 'helmet';
import path from 'path';
import { config } from './config/index.js';
import { connectPostgreSQL, connectRedis, disconnectDatabases } from './config/database.js';
import { setupSwagger } from './config/swagger.js';
import { logger } from './utils/logger.js';
import { errorHandler, notFoundHandler, apiLimiter } from './middleware/index.js';
import routes from './routes/index.js';
import { providerManager } from './services/ProviderManager.js';
import { templateService } from './services/TemplateService.js';

// ============================================
// Initialize Express Application
// ============================================

const app: Application = express();

// ============================================
// Middleware Configuration
// ============================================

// Security headers
app.use(helmet({
  crossOriginResourcePolicy: { policy: 'cross-origin' },
  contentSecurityPolicy: false, // Disable for Swagger UI
}));

// CORS configuration
app.use(
  cors({
    origin:
      config.server.nodeEnv === 'production'
        ? ['https://baatcheet.app']
        : ['http://localhost:3000', 'http://localhost:5173', 'http://127.0.0.1:5173'],
    credentials: true,
  })
);

// Body parsing with increased limit for images
app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ extended: true, limit: '50mb' }));

// Serve uploaded files
app.use('/uploads', express.static(path.join(process.cwd(), 'uploads')));

// Rate limiting
app.use('/api/', apiLimiter);

// ============================================
// Swagger Documentation
// ============================================

setupSwagger(app);

// ============================================
// Routes
// ============================================

// Health check endpoint
app.get('/health', (_req, res) => {
  const summary = providerManager.getSummary();
  
  res.json({
    success: true,
    message: 'BaatCheet API is running',
    timestamp: new Date().toISOString(),
    environment: config.server.nodeEnv,
    version: '1.0.0',
    providers: {
      active: summary.activeProviders,
      total: summary.totalProviders,
      capacity: summary.totalCapacity,
      used: summary.totalUsed,
    },
    docs: '/api/docs',
  });
});

// API routes
app.use('/api/v1', routes);

// ============================================
// Error Handling
// ============================================

app.use(notFoundHandler);
app.use(errorHandler);

// ============================================
// Server Startup
// ============================================

const startServer = async (): Promise<void> => {
  try {
    // Connect to PostgreSQL
    await connectPostgreSQL();

    // Connect to Redis (optional)
    await connectRedis();

    // Initialize default templates
    await templateService.initializeDefaults();

    // Get provider summary
    const summary = providerManager.getSummary();

    // Start server
    app.listen(config.server.port, () => {
      logger.info(`
╔═══════════════════════════════════════════════════════════════════╗
║                                                                   ║
║   🗣️  BaatCheet API Server v1.0.0                                 ║
║                                                                   ║
║   Environment: ${config.server.nodeEnv.padEnd(51)}║
║   Port: ${config.server.port.toString().padEnd(58)}║
║                                                                   ║
║   ┌─────────────────────────────────────────────────────────────┐ ║
║   │ PROVIDERS                                                   │ ║
║   │ Active: ${summary.activeProviders}/${summary.totalProviders} providers                                        │ ║
║   │ Keys: ${summary.totalKeys} total                                              │ ║
║   │ Capacity: ${summary.totalCapacity.toLocaleString().padEnd(47)}│ ║
║   └─────────────────────────────────────────────────────────────┘ ║
║                                                                   ║
║   API Base: http://localhost:${config.server.port}/api/v1                   ║
║   Health: http://localhost:${config.server.port}/health                     ║
║   📚 Docs: http://localhost:${config.server.port}/api/docs                  ║
║                                                                   ║
║   ✅ Ready to accept connections!                                 ║
║                                                                   ║
╚═══════════════════════════════════════════════════════════════════╝
      `);
    });
  } catch (error) {
    logger.error('Failed to start server:', error);
    process.exit(1);
  }
};

// ============================================
// Graceful Shutdown
// ============================================

const gracefulShutdown = async (signal: string): Promise<void> => {
  logger.info(`${signal} received. Shutting down gracefully...`);

  await disconnectDatabases();

  logger.info('Server shut down complete');
  process.exit(0);
};

process.on('SIGTERM', () => gracefulShutdown('SIGTERM'));
process.on('SIGINT', () => gracefulShutdown('SIGINT'));

// Handle uncaught exceptions
process.on('uncaughtException', (error) => {
  logger.error('Uncaught Exception:', error);
  process.exit(1);
});

process.on('unhandledRejection', (reason) => {
  logger.error('Unhandled Rejection:', reason);
});

// Start the server
startServer();

export default app;
