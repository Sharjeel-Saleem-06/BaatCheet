import { Router, Request, Response } from 'express';
import { prisma, getRedis } from '../config/database.js';
import { logger } from '../utils/logger.js';
import { config } from '../config/index.js';

const router = Router();

// ============================================
// Health Check Types
// ============================================
interface ServiceHealth {
  status: 'healthy' | 'unhealthy' | 'degraded';
  latency?: number;
  message?: string;
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
      message: 'Redis not configured',
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

// ============================================
// Health Check Endpoint
// GET /health - Detailed health status
// ============================================
router.get('/', async (req: Request, res: Response) => {
  const startTime = Date.now();
  
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
  
  const statusCode = overallStatus === 'unhealthy' ? 503 : 200;
  res.status(statusCode).json(response);
});

// ============================================
// Readiness Probe
// GET /ready - Check if service is ready to accept traffic
// ============================================
router.get('/ready', async (req: Request, res: Response) => {
  try {
    // Check database connection
    await prisma.$queryRaw`SELECT 1`;
    
    res.status(200).json({
      status: 'ready',
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    logger.error('Readiness check failed:', error);
    res.status(503).json({
      status: 'not_ready',
      timestamp: new Date().toISOString(),
      message: 'Service dependencies not available',
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
  });
});

export default router;
