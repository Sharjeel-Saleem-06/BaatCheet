import express, { Application } from 'express';
import cors from 'cors';
import helmet from 'helmet';
import { config } from './config/index.js';
import { connectPostgreSQL, connectRedis, disconnectDatabases } from './config/database.js';
import { logger } from './utils/logger.js';
import { errorHandler, notFoundHandler, apiLimiter } from './middleware/index.js';
import routes from './routes/index.js';

// ============================================
// BaatCheet Backend Server
// Advanced AI Chat Application
// ============================================

const app: Application = express();

// ============================================
// Middleware
// ============================================

// Security headers
app.use(helmet());

// CORS configuration
app.use(
  cors({
    origin:
      config.nodeEnv === 'production'
        ? ['https://baatcheet.app']
        : ['http://localhost:3000', 'http://localhost:5173'],
    credentials: true,
  })
);

// Body parsing
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// Rate limiting (apply to all API routes)
app.use('/api/', apiLimiter);

// ============================================
// Routes
// ============================================

// Health check endpoint
app.get('/health', (_req, res) => {
  res.json({
    success: true,
    message: 'BaatCheet API is running',
    timestamp: new Date().toISOString(),
    environment: config.nodeEnv,
    version: '1.0.0',
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

    // Start server
    app.listen(config.port, () => {
      logger.info(`
╔════════════════════════════════════════════════════════════╗
║                                                            ║
║   🗣️  BaatCheet API Server v1.0.0                          ║
║                                                            ║
║   Environment: ${config.nodeEnv.padEnd(42)}║
║   Port: ${config.port.toString().padEnd(49)}║
║   PostgreSQL: Connected                                    ║
║   Groq Keys: ${config.groqApiKeys.length.toString().padEnd(45)}║
║                                                            ║
║   API Base: http://localhost:${config.port}/api/v1              ║
║   Health: http://localhost:${config.port}/health                ║
║                                                            ║
║   Ready to accept connections!                             ║
║                                                            ║
╚════════════════════════════════════════════════════════════╝
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
