/**
 * BaatCheet Backend Server
 * Advanced AI Chat Application with Multi-Provider Support
 * Phase 4: Clerk Auth, Production Ready
 * 
 * @module Server
 */

import express, { Application, Request, Response, NextFunction } from 'express';
import cors from 'cors';
import helmet from 'helmet';
import path from 'path';
import { v4 as uuidv4 } from 'uuid';
import { clerkMiddleware } from '@clerk/express';
import { config } from './config/index.js';
import { connectPostgreSQL, connectRedis, disconnectDatabases, prisma } from './config/database.js';
import { setupSwagger } from './config/swagger.js';
import { logger } from './utils/logger.js';
import { errorHandler, notFoundHandler, apiLimiter } from './middleware/index.js';
import routes from './routes/index.js';
import clerkWebhookRoutes from './routes/clerkWebhook.js';
import { providerManager } from './services/ProviderManager.js';
import { templateService } from './services/TemplateService.js';

// ============================================
// Initialize Express Application
// ============================================

const app: Application = express();

// ============================================
// Request ID & Timing Middleware
// ============================================

app.use((req: Request, res: Response, next: NextFunction) => {
  // Add unique request ID
  const requestId = req.headers['x-request-id'] as string || uuidv4();
  req.headers['x-request-id'] = requestId;
  res.setHeader('X-Request-ID', requestId);
  
  // Track response time (set before sending, not after)
  const startTime = Date.now();
  
  // Override res.json to add response time header
  const originalJson = res.json.bind(res);
  res.json = function(body: any) {
    const duration = Date.now() - startTime;
    if (!res.headersSent) {
      res.setHeader('X-Response-Time', `${duration}ms`);
    }
    return originalJson(body);
  };
  
  next();
});

// ============================================
// Security Headers (Helmet)
// ============================================

app.use(helmet({
  crossOriginResourcePolicy: { policy: 'cross-origin' },
  contentSecurityPolicy: config.server.isProduction ? {
    directives: {
      defaultSrc: ["'self'"],
      scriptSrc: ["'self'", "'unsafe-inline'"],
      styleSrc: ["'self'", "'unsafe-inline'"],
      imgSrc: ["'self'", 'data:', 'https:'],
      connectSrc: ["'self'", 'https://api.clerk.dev'],
    },
  } : false,
  hsts: config.server.isProduction ? {
    maxAge: 31536000,
    includeSubDomains: true,
    preload: true,
  } : false,
}));

// ============================================
// CORS Configuration
// ============================================

const allowedOrigins = config.server.isProduction
  ? ['https://baatcheet.app', 'https://www.baatcheet.app']
  : [
      'http://localhost:3000',
      'http://localhost:5173',
      'http://127.0.0.1:3000',
      'http://127.0.0.1:5173',
    ];

app.use(
  cors({
    origin: (origin, callback) => {
      // Allow requests with no origin (mobile apps, curl, etc.)
      if (!origin) return callback(null, true);
      
      if (allowedOrigins.includes(origin)) {
        callback(null, true);
      } else {
        callback(new Error('Not allowed by CORS'));
      }
    },
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization', 'X-Request-ID'],
    exposedHeaders: ['X-Request-ID', 'X-Response-Time', 'X-RateLimit-Limit', 'X-RateLimit-Remaining', 'X-RateLimit-Reset'],
    maxAge: 86400, // 24 hours
  })
);

// ============================================
// Body Parsing
// ============================================

// Raw body for Clerk webhooks (must be before json parser)
app.use('/api/v1/clerk/webhook', express.raw({ type: 'application/json' }));

// JSON body parsing with increased limit
app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ extended: true, limit: '50mb' }));

// ============================================
// Clerk Middleware
// ============================================

app.use(clerkMiddleware());

// ============================================
// Static Files
// ============================================

app.use('/uploads', express.static(path.join(process.cwd(), 'uploads')));

// ============================================
// Rate Limiting
// ============================================

app.use('/api/', apiLimiter);

// ============================================
// Swagger Documentation
// ============================================

setupSwagger(app);

// ============================================
// Routes
// ============================================

// Health check endpoint
app.get('/health', async (_req, res) => {
  const summary = providerManager.getSummary();
  
  // Check database connection
  let dbStatus = 'connected';
  let dbLatency = 0;
  try {
    const start = Date.now();
    await prisma.$queryRaw`SELECT 1`;
    dbLatency = Date.now() - start;
  } catch {
    dbStatus = 'disconnected';
  }
  
  // Check TTS service
  let ttsStatus = { available: false, provider: 'none', keys: 0 };
  try {
    const { ttsService } = await import('./services/TTSService.js');
    const ttsInfo = ttsService.getProviderInfo();
    ttsStatus = {
      available: ttsInfo.available,
      provider: ttsInfo.provider,
      keys: ttsInfo.elevenLabsKeys || 0,
    };
  } catch {
    // TTS service not available
  }
  
  res.json({
    status: 'healthy',
    timestamp: new Date().toISOString(),
    version: '1.0.0',
    environment: config.server.nodeEnv,
    uptime: process.uptime(),
    services: {
      database: { status: dbStatus, latency: dbLatency },
      providers: {
        active: summary.activeProviders,
        total: summary.totalProviders,
        capacity: summary.totalCapacity,
        used: summary.totalUsed,
      },
      tts: ttsStatus,
    },
    docs: '/api/docs',
  });
});

// Readiness probe (for Kubernetes)
app.get('/ready', async (_req, res) => {
  try {
    await prisma.$queryRaw`SELECT 1`;
    res.status(200).json({ status: 'ready' });
  } catch {
    res.status(503).json({ status: 'not ready' });
  }
});

// Comprehensive diagnostics endpoint
app.get('/diagnostics', async (_req, res) => {
  try {
    const summary = providerManager.getSummary();
    const healthStatus = providerManager.getHealthStatus();
    const circuitStatus = providerManager.getCircuitBreakerStatus();
    
    // Check database
    let dbStatus = { status: 'connected', latency: 0 };
    try {
      const start = Date.now();
      await prisma.$queryRaw`SELECT 1`;
      dbStatus.latency = Date.now() - start;
    } catch {
      dbStatus.status = 'disconnected';
    }
    
    // Check TTS
    let ttsStatus = { available: false, provider: 'none', keys: 0 };
    try {
      const { ttsService } = await import('./services/TTSService.js');
      const ttsInfo = ttsService.getProviderInfo();
      ttsStatus = {
        available: ttsInfo.available,
        provider: ttsInfo.provider,
        keys: ttsInfo.elevenLabsKeys || 0,
      };
    } catch {
      // TTS not available
    }
    
    // Check OCR
    let ocrStatus = { available: false, providers: [] as string[] };
    try {
      const { ocrService } = await import('./services/OCRService.js');
      const ocrHealth = ocrService.getHealth();
      ocrStatus = {
        available: ocrHealth.available,
        providers: Object.entries(ocrHealth.providers)
          .filter(([_, v]) => v)
          .map(([k]) => k),
      };
    } catch {
      // OCR not available
    }
    
    // Check Image Generation
    let imageGenStatus = { available: false, models: 0 };
    try {
      const { imageGeneration } = await import('./services/ImageGenerationService.js');
      const models = imageGeneration.getAvailableModels();
      imageGenStatus = {
        available: models.length > 0,
        models: models.length,
      };
    } catch {
      // Image gen not available
    }
    
    res.json({
      status: 'healthy',
      timestamp: new Date().toISOString(),
      version: '1.0.0',
      environment: config.server.nodeEnv,
      uptime: process.uptime(),
      memory: {
        heapUsed: Math.round(process.memoryUsage().heapUsed / 1024 / 1024),
        heapTotal: Math.round(process.memoryUsage().heapTotal / 1024 / 1024),
        rss: Math.round(process.memoryUsage().rss / 1024 / 1024),
      },
      providers: {
        summary,
        details: healthStatus,
        circuitBreakers: circuitStatus,
      },
      services: {
        database: dbStatus,
        tts: ttsStatus,
        ocr: ocrStatus,
        imageGeneration: imageGenStatus,
      },
    });
  } catch (error) {
    res.status(500).json({
      status: 'error',
      error: error instanceof Error ? error.message : 'Unknown error',
    });
  }
});

// Liveness probe (for Kubernetes)
app.get('/live', (_req, res) => {
  res.status(200).json({ status: 'alive' });
});

// Clerk webhook routes (before auth middleware)
app.use('/api/v1/clerk', clerkWebhookRoutes);

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
    
    // Check Clerk configuration
    const clerkConfigured = !!(config.clerk.publishableKey && config.clerk.secretKey);

    // Start server
    httpServer = app.listen(config.server.port, () => {
      logger.info(`
╔═══════════════════════════════════════════════════════════════════╗
║                                                                   ║
║   🗣️  BaatCheet API Server v1.0.0 (Phase 4)                       ║
║                                                                   ║
║   Environment: ${config.server.nodeEnv.padEnd(51)}║
║   Port: ${config.server.port.toString().padEnd(58)}║
║                                                                   ║
║   ┌─────────────────────────────────────────────────────────────┐ ║
║   │ AUTHENTICATION                                              │ ║
║   │ Clerk: ${clerkConfigured ? '✅ Configured' : '❌ Not configured'}                                      │ ║
║   └─────────────────────────────────────────────────────────────┘ ║
║                                                                   ║
║   ┌─────────────────────────────────────────────────────────────┐ ║
║   │ AI PROVIDERS                                                │ ║
║   │ Active: ${summary.activeProviders}/${summary.totalProviders} providers                                        │ ║
║   │ Keys: ${summary.totalKeys.toString().padEnd(52)}│ ║
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

let httpServer: ReturnType<typeof app.listen> | null = null;

const gracefulShutdown = async (signal: string): Promise<void> => {
  logger.info(`${signal} received. Starting graceful shutdown...`);

  // Set timeout for forced shutdown
  const forceShutdownTimeout = setTimeout(() => {
    logger.error('Forced shutdown after 30s timeout');
    process.exit(1);
  }, 30000);

  try {
    // Stop accepting new requests
    if (httpServer) {
      await new Promise<void>((resolve) => {
        httpServer!.close(() => {
          logger.info('HTTP server closed');
          resolve();
        });
      });
    }

    // Close job queues
    try {
      const { queueService } = await import('./services/QueueService.js');
      await queueService.shutdown();
      logger.info('Job queues closed');
    } catch (error) {
      logger.warn('Error closing job queues:', error);
    }

    // Disconnect databases
    await disconnectDatabases();

    clearTimeout(forceShutdownTimeout);
    logger.info('Graceful shutdown complete');
    process.exit(0);
  } catch (error) {
    logger.error('Error during shutdown:', error);
    clearTimeout(forceShutdownTimeout);
    process.exit(1);
  }
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
