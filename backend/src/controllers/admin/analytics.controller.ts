/**
 * Admin Analytics Controller
 * API usage tracking and analytics for administrators
 * 
 * @module AdminAnalytics
 */

import { Request, Response } from 'express';
import { prisma } from '../../config/database.js';
import { providerManager } from '../../services/ProviderManager.js';
import { logger } from '../../utils/logger.js';

// ============================================
// API Usage Overview
// ============================================

/**
 * GET /api/v1/admin/api-usage
 * Get API usage statistics
 */
export const getApiUsage = async (req: Request, res: Response): Promise<void> => {
  try {
    const {
      startDate,
      endDate,
      groupBy = 'day',
      provider,
    } = req.query;

    // Default to last 30 days
    const start = startDate 
      ? new Date(startDate as string) 
      : new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
    const end = endDate ? new Date(endDate as string) : new Date();

    const where: any = {
      createdAt: { gte: start, lte: end },
    };
    if (provider) where.provider = provider;

    // Get usage logs
    const usageLogs = await prisma.apiUsageLog.findMany({
      where,
      orderBy: { createdAt: 'asc' },
    });

    // Aggregate by provider
    const byProvider: Record<string, {
      requests: number;
      tokens: number;
      cost: number;
      errors: number;
      avgLatency: number;
    }> = {};

    for (const log of usageLogs) {
      if (!byProvider[log.provider]) {
        byProvider[log.provider] = {
          requests: 0,
          tokens: 0,
          cost: 0,
          errors: 0,
          avgLatency: 0,
        };
      }
      byProvider[log.provider].requests++;
      byProvider[log.provider].tokens += log.tokens;
      byProvider[log.provider].cost += log.cost;
      if (log.status === 'error') byProvider[log.provider].errors++;
      byProvider[log.provider].avgLatency += log.latency;
    }

    // Calculate averages
    for (const key of Object.keys(byProvider)) {
      if (byProvider[key].requests > 0) {
        byProvider[key].avgLatency = Math.round(byProvider[key].avgLatency / byProvider[key].requests);
      }
    }

    // Aggregate by date
    const timeline: Record<string, { requests: number; tokens: number }> = {};
    for (const log of usageLogs) {
      const dateKey = log.createdAt.toISOString().split('T')[0];
      if (!timeline[dateKey]) {
        timeline[dateKey] = { requests: 0, tokens: 0 };
      }
      timeline[dateKey].requests++;
      timeline[dateKey].tokens += log.tokens;
    }

    // Get current provider status
    const providerSummary = providerManager.getSummary();

    // Calculate totals
    const totalRequests = usageLogs.length;
    const totalTokens = usageLogs.reduce((sum, log) => sum + log.tokens, 0);
    const totalCost = usageLogs.reduce((sum, log) => sum + log.cost, 0);
    const totalErrors = usageLogs.filter(log => log.status === 'error').length;
    const avgLatency = totalRequests > 0 
      ? Math.round(usageLogs.reduce((sum, log) => sum + log.latency, 0) / totalRequests)
      : 0;

    res.json({
      success: true,
      data: {
        summary: {
          totalRequests,
          totalTokens,
          estimatedCost: Math.round(totalCost * 100) / 100,
          averageLatency: avgLatency,
          errorRate: totalRequests > 0 
            ? Math.round((totalErrors / totalRequests) * 10000) / 100 
            : 0,
        },
        byProvider: Object.entries(byProvider).map(([name, data]) => ({
          provider: name,
          ...data,
          errorRate: data.requests > 0 
            ? Math.round((data.errors / data.requests) * 10000) / 100 
            : 0,
        })),
        timeline: Object.entries(timeline)
          .map(([date, data]) => ({ date, ...data }))
          .sort((a, b) => a.date.localeCompare(b.date)),
        currentCapacity: {
          active: providerSummary.activeProviders,
          total: providerSummary.totalProviders,
          keys: providerSummary.totalKeys,
          dailyCapacity: providerSummary.totalCapacity,
          usedToday: providerSummary.totalUsed,
          percentUsed: providerSummary.totalCapacity > 0 
            ? Math.round((providerSummary.totalUsed / providerSummary.totalCapacity) * 100) 
            : 0,
        },
        dateRange: { start, end },
      },
    });
  } catch (error) {
    logger.error('Get API usage error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to get API usage',
    });
  }
};

// ============================================
// Provider Usage Details
// ============================================

/**
 * GET /api/v1/admin/api-usage/providers/:provider
 * Get detailed usage for a specific provider
 */
export const getProviderUsage = async (req: Request, res: Response): Promise<void> => {
  try {
    const { provider } = req.params;
    const { startDate, endDate } = req.query;

    const start = startDate 
      ? new Date(startDate as string) 
      : new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);
    const end = endDate ? new Date(endDate as string) : new Date();

    // Get usage logs for this provider
    const usageLogs = await prisma.apiUsageLog.findMany({
      where: {
        provider,
        createdAt: { gte: start, lte: end },
      },
      orderBy: { createdAt: 'desc' },
      take: 1000,
    });

    // Group by model
    const byModel: Record<string, { requests: number; tokens: number; avgLatency: number }> = {};
    for (const log of usageLogs) {
      if (!byModel[log.model]) {
        byModel[log.model] = { requests: 0, tokens: 0, avgLatency: 0 };
      }
      byModel[log.model].requests++;
      byModel[log.model].tokens += log.tokens;
      byModel[log.model].avgLatency += log.latency;
    }

    for (const key of Object.keys(byModel)) {
      if (byModel[key].requests > 0) {
        byModel[key].avgLatency = Math.round(byModel[key].avgLatency / byModel[key].requests);
      }
    }

    // Get error breakdown
    const errors = usageLogs.filter(log => log.status === 'error');
    const errorTypes: Record<string, number> = {};
    for (const err of errors) {
      const type = err.errorMsg || 'unknown';
      errorTypes[type] = (errorTypes[type] || 0) + 1;
    }

    // Get provider health
    const health = providerManager.getProviderHealth(provider);

    res.json({
      success: true,
      data: {
        provider,
        health,
        usage: {
          totalRequests: usageLogs.length,
          totalTokens: usageLogs.reduce((sum, log) => sum + log.tokens, 0),
          errorCount: errors.length,
          errorRate: usageLogs.length > 0 
            ? Math.round((errors.length / usageLogs.length) * 10000) / 100 
            : 0,
        },
        byModel: Object.entries(byModel).map(([model, data]) => ({
          model,
          ...data,
        })),
        errorBreakdown: Object.entries(errorTypes).map(([type, count]) => ({
          type,
          count,
        })),
        dateRange: { start, end },
      },
    });
  } catch (error) {
    logger.error('Get provider usage error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to get provider usage',
    });
  }
};

// ============================================
// User Usage Details
// ============================================

/**
 * GET /api/v1/admin/api-usage/users/:userId
 * Get API usage for a specific user
 */
export const getUserUsage = async (req: Request, res: Response): Promise<void> => {
  try {
    const { userId } = req.params;
    const { startDate, endDate } = req.query;

    const start = startDate 
      ? new Date(startDate as string) 
      : new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
    const end = endDate ? new Date(endDate as string) : new Date();

    // Get user
    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: { id: true, email: true, firstName: true, lastName: true, tier: true },
    });

    if (!user) {
      res.status(404).json({
        success: false,
        error: 'User not found',
      });
      return;
    }

    // Get usage logs
    const usageLogs = await prisma.apiUsageLog.findMany({
      where: {
        userId,
        createdAt: { gte: start, lte: end },
      },
      orderBy: { createdAt: 'desc' },
    });

    // Get analytics
    const analytics = await prisma.analytics.findMany({
      where: {
        userId,
        date: { gte: start, lte: end },
      },
      orderBy: { date: 'desc' },
    });

    // Group by provider
    const byProvider: Record<string, { requests: number; tokens: number }> = {};
    for (const log of usageLogs) {
      if (!byProvider[log.provider]) {
        byProvider[log.provider] = { requests: 0, tokens: 0 };
      }
      byProvider[log.provider].requests++;
      byProvider[log.provider].tokens += log.tokens;
    }

    // Group by day
    const byDay: Record<string, { requests: number; tokens: number }> = {};
    for (const log of usageLogs) {
      const day = log.createdAt.toISOString().split('T')[0];
      if (!byDay[day]) {
        byDay[day] = { requests: 0, tokens: 0 };
      }
      byDay[day].requests++;
      byDay[day].tokens += log.tokens;
    }

    res.json({
      success: true,
      data: {
        user: {
          id: user.id,
          email: user.email,
          name: `${user.firstName || ''} ${user.lastName || ''}`.trim(),
          tier: user.tier,
        },
        usage: {
          totalRequests: usageLogs.length,
          totalTokens: usageLogs.reduce((sum, log) => sum + log.tokens, 0),
          totalCost: usageLogs.reduce((sum, log) => sum + log.cost, 0),
        },
        byProvider: Object.entries(byProvider).map(([provider, data]) => ({
          provider,
          ...data,
        })),
        timeline: Object.entries(byDay)
          .map(([date, data]) => ({ date, ...data }))
          .sort((a, b) => a.date.localeCompare(b.date)),
        analytics: analytics.map(a => ({
          date: a.date,
          messages: a.messagesCount,
          responses: a.responsesCount,
          images: a.imagesUploaded,
          audio: a.audioTranscribed,
        })),
        dateRange: { start, end },
      },
    });
  } catch (error) {
    logger.error('Get user usage error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to get user usage',
    });
  }
};

// ============================================
// Top Users
// ============================================

/**
 * GET /api/v1/admin/api-usage/top-users
 * Get top users by API usage
 */
export const getTopUsers = async (req: Request, res: Response): Promise<void> => {
  try {
    const { limit = '10', metric = 'requests' } = req.query;
    const limitNum = Math.min(parseInt(limit as string), 100);

    const last30Days = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);

    // Get top users by usage
    const usageByUser = await prisma.apiUsageLog.groupBy({
      by: ['userId'],
      where: {
        createdAt: { gte: last30Days },
        userId: { not: null },
      },
      _count: { id: true },
      _sum: { tokens: true, cost: true },
      orderBy: metric === 'tokens' 
        ? { _sum: { tokens: 'desc' } }
        : { _count: { id: 'desc' } },
      take: limitNum,
    });

    // Get user details
    const userIds = usageByUser.map(u => u.userId).filter(Boolean) as string[];
    const users = await prisma.user.findMany({
      where: { id: { in: userIds } },
      select: { id: true, email: true, firstName: true, lastName: true, tier: true },
    });

    const userMap = new Map(users.map(u => [u.id, u]));

    res.json({
      success: true,
      data: {
        topUsers: usageByUser.map(usage => ({
          user: userMap.get(usage.userId!) || { id: usage.userId, email: 'Unknown' },
          requests: usage._count.id,
          tokens: usage._sum.tokens || 0,
          cost: Math.round((usage._sum.cost || 0) * 100) / 100,
        })),
        metric,
        period: '30 days',
      },
    });
  } catch (error) {
    logger.error('Get top users error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to get top users',
    });
  }
};
