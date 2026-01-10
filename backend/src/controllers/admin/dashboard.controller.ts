/**
 * Admin Dashboard Controller
 * Provides overview statistics and system health
 * 
 * @module AdminDashboard
 */

import { Request, Response } from 'express';
import { prisma } from '../../config/database.js';
import { checkDatabaseHealth, getRedis } from '../../config/database.js';
import { providerManager } from '../../services/ProviderManager.js';
import { logger } from '../../utils/logger.js';

// ============================================
// Dashboard Overview
// ============================================

/**
 * GET /api/v1/admin/dashboard
 * Get admin dashboard overview with key metrics
 */
export const getDashboard = async (req: Request, res: Response): Promise<void> => {
  try {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    
    const last24Hours = new Date(Date.now() - 24 * 60 * 60 * 1000);
    const last7Days = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);

    // Parallel queries for stats
    const [
      totalUsers,
      activeUsers24h,
      newUsersToday,
      totalConversations,
      totalMessages,
      totalProjects,
      recentActivity,
      topUsers,
      providerSummary,
    ] = await Promise.all([
      // Total users
      prisma.user.count(),
      
      // Active users in last 24 hours
      prisma.user.count({
        where: { lastLoginAt: { gte: last24Hours } },
      }),
      
      // New users today
      prisma.user.count({
        where: { createdAt: { gte: today } },
      }),
      
      // Total conversations
      prisma.conversation.count(),
      
      // Total messages
      prisma.message.count(),
      
      // Total projects
      prisma.project.count(),
      
      // Recent activity (last 50 audit logs)
      prisma.auditLog.findMany({
        take: 50,
        orderBy: { createdAt: 'desc' },
        include: {
          user: { select: { id: true, email: true, firstName: true, lastName: true } },
        },
      }),
      
      // Top users by message count
      prisma.user.findMany({
        take: 10,
        orderBy: { loginCount: 'desc' },
        select: {
          id: true,
          email: true,
          firstName: true,
          lastName: true,
          tier: true,
          loginCount: true,
          _count: {
            select: {
              conversations: true,
              projects: true,
            },
          },
        },
      }),
      
      // Provider summary
      providerManager.getSummary(),
    ]);

    // Get system health
    const dbHealth = await checkDatabaseHealth();
    const redis = getRedis();
    
    // Get alerts
    const alerts = await getSystemAlerts();

    // Calculate user growth
    const usersLastWeek = await prisma.user.count({
      where: { createdAt: { gte: last7Days } },
    });

    res.json({
      success: true,
      data: {
        stats: {
          totalUsers,
          activeUsers24h,
          newUsersToday,
          usersLastWeek,
          totalConversations,
          totalMessages,
          totalProjects,
          averageConversationsPerUser: totalUsers > 0 
            ? Math.round(totalConversations / totalUsers * 10) / 10 
            : 0,
        },
        systemHealth: {
          status: dbHealth.postgres.connected ? 'healthy' : 'unhealthy',
          database: {
            status: dbHealth.postgres.connected ? 'connected' : 'disconnected',
            latency: dbHealth.postgres.latency,
          },
          redis: {
            status: redis ? 'connected' : 'not configured',
            latency: dbHealth.redis.latency,
          },
          aiProviders: {
            active: providerSummary.activeProviders,
            total: providerSummary.totalProviders,
            keys: providerSummary.totalKeys,
            capacity: providerSummary.totalCapacity,
            used: providerSummary.totalUsed,
            percentUsed: providerSummary.totalCapacity > 0 
              ? Math.round((providerSummary.totalUsed / providerSummary.totalCapacity) * 100) 
              : 0,
          },
        },
        recentActivity: recentActivity.map(log => ({
          id: log.id,
          action: log.action,
          resource: log.resource,
          user: log.user ? {
            id: log.user.id,
            email: log.user.email,
            name: `${log.user.firstName || ''} ${log.user.lastName || ''}`.trim(),
          } : null,
          timestamp: log.createdAt,
        })),
        topUsers: topUsers.map(user => ({
          id: user.id,
          email: user.email,
          name: `${user.firstName || ''} ${user.lastName || ''}`.trim(),
          tier: user.tier,
          loginCount: user.loginCount,
          conversations: user._count.conversations,
          projects: user._count.projects,
        })),
        alerts,
      },
    });
  } catch (error) {
    logger.error('Dashboard error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to load dashboard',
    });
  }
};

/**
 * GET /api/v1/admin/dashboard/stats
 * Get quick stats only (for real-time updates)
 */
export const getQuickStats = async (req: Request, res: Response): Promise<void> => {
  try {
    const last24Hours = new Date(Date.now() - 24 * 60 * 60 * 1000);

    const [totalUsers, activeUsers, totalConversations, totalMessages] = await Promise.all([
      prisma.user.count(),
      prisma.user.count({ where: { lastLoginAt: { gte: last24Hours } } }),
      prisma.conversation.count(),
      prisma.message.count(),
    ]);

    const providerSummary = providerManager.getSummary();

    res.json({
      success: true,
      data: {
        totalUsers,
        activeUsers,
        totalConversations,
        totalMessages,
        aiCapacityUsed: providerSummary.totalCapacity > 0 
          ? Math.round((providerSummary.totalUsed / providerSummary.totalCapacity) * 100) 
          : 0,
      },
    });
  } catch (error) {
    logger.error('Quick stats error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to load stats',
    });
  }
};

// ============================================
// Helper Functions
// ============================================

async function getSystemAlerts(): Promise<Array<{
  level: 'info' | 'warning' | 'critical';
  message: string;
  timestamp: Date;
}>> {
  const alerts: Array<{ level: 'info' | 'warning' | 'critical'; message: string; timestamp: Date }> = [];
  const now = new Date();

  // Check provider capacity
  const summary = providerManager.getSummary();
  const capacityPercent = summary.totalCapacity > 0 
    ? (summary.totalUsed / summary.totalCapacity) * 100 
    : 0;

  if (capacityPercent > 90) {
    alerts.push({
      level: 'critical',
      message: `AI provider capacity at ${Math.round(capacityPercent)}% - approaching limit`,
      timestamp: now,
    });
  } else if (capacityPercent > 75) {
    alerts.push({
      level: 'warning',
      message: `AI provider capacity at ${Math.round(capacityPercent)}%`,
      timestamp: now,
    });
  }

  // Check for suspended users
  const suspendedUsers = await prisma.user.count({ where: { isBanned: true } });
  if (suspendedUsers > 0) {
    alerts.push({
      level: 'info',
      message: `${suspendedUsers} user(s) currently suspended`,
      timestamp: now,
    });
  }

  // Check for pending flagged content
  const pendingFlags = await prisma.flaggedContent.count({ where: { status: 'pending' } });
  if (pendingFlags > 0) {
    alerts.push({
      level: pendingFlags > 10 ? 'warning' : 'info',
      message: `${pendingFlags} flagged content item(s) pending review`,
      timestamp: now,
    });
  }

  // Check database health
  const dbHealth = await checkDatabaseHealth();
  if (!dbHealth.postgres.connected) {
    alerts.push({
      level: 'critical',
      message: 'Database connection lost',
      timestamp: now,
    });
  } else if (dbHealth.postgres.latency > 100) {
    alerts.push({
      level: 'warning',
      message: `Database latency high: ${dbHealth.postgres.latency}ms`,
      timestamp: now,
    });
  }

  return alerts;
}
