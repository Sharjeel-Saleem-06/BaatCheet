import { Router, Request, Response } from 'express';
import { prisma, getRedis, checkDatabaseHealth } from '../config/database.js';
import { logger } from '../utils/logger.js';
import { config } from '../config/index.js';
import { providerManager } from '../services/ProviderManager.js';
import { queueService } from '../services/QueueService.js';
import { cacheService } from '../services/CacheService.js';

const router = Router();

// ============================================
// Health Check Types
// ============================================
interface ServiceHealth {
  status: 'healthy' | 'unhealthy' | 'degraded';
  latency?: number;
  message?: string;
  details?: Record<string, unknown>;
}

interface ProviderHealth {
  name: string;
  status: 'available' | 'unavailable' | 'limited';
  keys: number;
  available: number;
  dailyCapacity: number;
  used: number;
  percentUsed: number;
}

interface QueueHealth {
  name: string;
  waiting: number;
  active: number;
  completed: number;
  failed: number;
}

interface HealthResponse {
  status: 'healthy' | 'unhealthy' | 'degraded';
  timestamp: string;
  version: string;
  environment: string;
  uptime: number;
  services: {
    database: ServiceHealth;
    redis: ServiceHealth;
    api: ServiceHealth;
  };
  providers?: ProviderHealth[];
  queues?: QueueHealth[];
  cache?: {
    connected: boolean;
    keys: number;
    memory: string;
  };
}

// ============================================
// Helper Functions
// ============================================
async function checkDatabase(): Promise<ServiceHealth> {
  const start = Date.now();
  try {
    await prisma.$queryRaw`SELECT 1`;
    return {
      status: 'healthy',
      latency: Date.now() - start,
    };
  } catch (error) {
    logger.error('Database health check failed:', error);
    return {
      status: 'unhealthy',
      latency: Date.now() - start,
      message: 'Database connection failed',
    };
  }
}

async function checkRedis(): Promise<ServiceHealth> {
  const redis = getRedis();
  const start = Date.now();
  
  if (!redis) {
    return {
      status: 'degraded',
      message: 'Redis not configured (optional)',
    };
  }
  
  try {
    await redis.ping();
    return {
      status: 'healthy',
      latency: Date.now() - start,
    };
  } catch (error) {
    logger.error('Redis health check failed:', error);
    return {
      status: 'degraded',
      latency: Date.now() - start,
      message: 'Redis connection failed',
    };
  }
}

async function checkProviders(): Promise<ProviderHealth[]> {
  const summary = providerManager.getSummary();
  const providers: ProviderHealth[] = [];
  
  // Get individual provider health
  const providerNames = ['groq', 'openRouter', 'deepSeek', 'gemini', 'huggingFace', 'ocrSpace'];
  
  for (const name of providerNames) {
    const health = providerManager.getProviderHealth(name);
    if (health) {
      providers.push({
        name,
        status: health.available ? (health.percentUsed > 80 ? 'limited' : 'available') : 'unavailable',
        keys: health.totalKeys,
        available: health.availableKeys,
        dailyCapacity: health.totalCapacity,
        used: health.usedToday,
        percentUsed: health.percentUsed,
      });
    }
  }
  
  return providers;
}

async function checkQueues(): Promise<QueueHealth[]> {
  try {
    const stats = await queueService.getStats();
    return [
      { name: 'ocr', ...stats.ocr },
      { name: 'audio', ...stats.audio },
      { name: 'export', ...stats.export },
      { name: 'webhook', ...stats.webhook },
      { name: 'analytics', ...stats.analytics },
    ];
  } catch (error) {
    logger.warn('Queue stats unavailable:', error);
    return [];
  }
}

// ============================================
// Health Check Endpoint
// GET /health - Detailed health status
// ============================================
router.get('/', async (req: Request, res: Response) => {
  const startTime = Date.now();
  const detailed = req.query.detailed === 'true';
  
  const [dbHealth, redisHealth] = await Promise.all([
    checkDatabase(),
    checkRedis(),
  ]);
  
  const apiHealth: ServiceHealth = {
    status: 'healthy',
    latency: Date.now() - startTime,
  };
  
  // Determine overall status
  let overallStatus: 'healthy' | 'unhealthy' | 'degraded' = 'healthy';
  
  if (dbHealth.status === 'unhealthy') {
    overallStatus = 'unhealthy';
  } else if (dbHealth.status === 'degraded' || redisHealth.status === 'degraded') {
    overallStatus = 'degraded';
  }
  
  const response: HealthResponse = {
    status: overallStatus,
    timestamp: new Date().toISOString(),
    version: process.env.npm_package_version || '1.0.0',
    environment: config.server.nodeEnv,
    uptime: process.uptime(),
    services: {
      database: dbHealth,
      redis: redisHealth,
      api: apiHealth,
    },
  };
  
  // Add detailed info if requested
  if (detailed) {
    const [providers, queues, cacheStats] = await Promise.all([
      checkProviders(),
      checkQueues(),
      cacheService.getStats(),
    ]);
    
    response.providers = providers;
    response.queues = queues;
    response.cache = cacheStats;
  }
  
  const statusCode = overallStatus === 'unhealthy' ? 503 : 200;
  res.status(statusCode).json(response);
});

// ============================================
// Provider Health Endpoint
// GET /health/providers - AI provider status
// ============================================
router.get('/providers', async (req: Request, res: Response) => {
  const providers = await checkProviders();
  const summary = providerManager.getSummary();
  
  res.json({
    timestamp: new Date().toISOString(),
    summary: {
      totalProviders: summary.totalProviders,
      activeProviders: summary.activeProviders,
      totalKeys: summary.totalKeys,
      totalCapacity: summary.totalCapacity,
      totalUsed: summary.totalUsed,
      percentUsed: summary.totalCapacity > 0 
        ? Math.round((summary.totalUsed / summary.totalCapacity) * 100) 
        : 0,
    },
    providers,
  });
});

// ============================================
// Queue Health Endpoint
// GET /health/queues - Background job queue status
// ============================================
router.get('/queues', async (req: Request, res: Response) => {
  try {
    const queues = await checkQueues();
    
    res.json({
      timestamp: new Date().toISOString(),
      status: 'operational',
      queues,
    });
  } catch (error) {
    res.status(503).json({
      timestamp: new Date().toISOString(),
      status: 'unavailable',
      message: 'Queue service not available',
    });
  }
});

// ============================================
// Cache Health Endpoint
// GET /health/cache - Redis cache status
// ============================================
router.get('/cache', async (req: Request, res: Response) => {
  const stats = await cacheService.getStats();
  
  res.json({
    timestamp: new Date().toISOString(),
    ...stats,
  });
});

// ============================================
// Readiness Probe
// GET /ready - Check if service is ready to accept traffic
// ============================================
router.get('/ready', async (req: Request, res: Response) => {
  try {
    // Check database connection
    await prisma.$queryRaw`SELECT 1`;
    
    // Check if at least one AI provider is available
    const summary = providerManager.getSummary();
    if (summary.activeProviders === 0) {
      throw new Error('No AI providers available');
    }
    
    res.status(200).json({
      status: 'ready',
      timestamp: new Date().toISOString(),
      providers: summary.activeProviders,
    });
  } catch (error) {
    logger.error('Readiness check failed:', error);
    res.status(503).json({
      status: 'not_ready',
      timestamp: new Date().toISOString(),
      message: error instanceof Error ? error.message : 'Service dependencies not available',
    });
  }
});

// ============================================
// Liveness Probe
// GET /live - Check if service is alive
// ============================================
router.get('/live', (req: Request, res: Response) => {
  res.status(200).json({
    status: 'alive',
    timestamp: new Date().toISOString(),
    uptime: process.uptime(),
  });
});

// ============================================
// Metrics Endpoint (Basic)
// GET /metrics - Basic metrics for monitoring
// ============================================
router.get('/metrics', async (req: Request, res: Response) => {
  const memoryUsage = process.memoryUsage();
  const cpuUsage = process.cpuUsage();
  
  // Get provider summary
  const providerSummary = providerManager.getSummary();
  
  // Get queue stats
  let queueStats;
  try {
    queueStats = await queueService.getStats();
  } catch {
    queueStats = null;
  }
  
  res.json({
    timestamp: new Date().toISOString(),
    uptime: process.uptime(),
    memory: {
      heapUsed: Math.round(memoryUsage.heapUsed / 1024 / 1024),
      heapTotal: Math.round(memoryUsage.heapTotal / 1024 / 1024),
      external: Math.round(memoryUsage.external / 1024 / 1024),
      rss: Math.round(memoryUsage.rss / 1024 / 1024),
      unit: 'MB',
    },
    cpu: {
      user: cpuUsage.user,
      system: cpuUsage.system,
      unit: 'microseconds',
    },
    process: {
      pid: process.pid,
      version: process.version,
      platform: process.platform,
      arch: process.arch,
    },
    providers: {
      active: providerSummary.activeProviders,
      total: providerSummary.totalProviders,
      keys: providerSummary.totalKeys,
      capacity: providerSummary.totalCapacity,
      used: providerSummary.totalUsed,
    },
    queues: queueStats,
  });
});

export default router;
