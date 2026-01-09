import express, { Application } from 'express';
import cors from 'cors';
import helmet from 'helmet';
import { config } from './config/index.js';
import { connectMongoDB, connectRedis, disconnectDatabases } from './config/database.js';
import { logger } from './utils/logger.js';
import { errorHandler, notFoundHandler, apiLimiter } from './middleware/index.js';
import routes from './routes/index.js';

// ============================================
// BaatCheet Backend Server
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
    origin: config.nodeEnv === 'production' 
      ? ['https://baatcheet.app'] // Add your production domains
      : ['http://localhost:3000', 'http://localhost:5173'],
    credentials: true,
  })
);

// Body parsing
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// Rate limiting
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
    // Connect to databases
    await connectMongoDB();
    await connectRedis();

    // Start server
    app.listen(config.port, () => {
      logger.info(`
╔════════════════════════════════════════════════════════╗
║                                                        ║
║   🗣️  BaatCheet API Server                             ║
║                                                        ║
║   Environment: ${config.nodeEnv.padEnd(38)}║
║   Port: ${config.port.toString().padEnd(45)}║
║   MongoDB: Connected                                   ║
║                                                        ║
║   Ready to accept connections!                         ║
║                                                        ║
╚════════════════════════════════════════════════════════╝
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

// Start the server
startServer();

export default app;
