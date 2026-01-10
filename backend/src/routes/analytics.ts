/**
 * Analytics Routes
 * API endpoints for usage analytics and insights
 * 
 * @module Routes/Analytics
 */

import { Router, Request, Response } from 'express';
import { clerkAuth } from '../middleware/index.js';
import { analyticsService } from '../services/AnalyticsService.js';
import { logger } from '../utils/logger.js';

const router = Router();

// ============================================
// Analytics Routes
// ============================================

/**
 * GET /api/v1/analytics/dashboard
 * Get overall user statistics
 */
router.get(
  '/dashboard',
  clerkAuth,
  async (req: Request, res: Response): Promise<void> => {
    try {
      const userId = req.user!.id;
      const stats = await analyticsService.getDashboard(userId);

      res.json({
        success: true,
        data: stats,
      });
    } catch (error) {
      logger.error('Dashboard error:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to get dashboard',
      });
    }
  }
);

/**
 * GET /api/v1/analytics/usage
 * Get usage over time period
 */
router.get(
  '/usage',
  clerkAuth,
  async (req: Request, res: Response): Promise<void> => {
    try {
      const userId = req.user!.id;
      const period = req.query.period as string || '7d';

      // Parse period (7d, 14d, 30d, 90d)
      const days = parseInt(period.replace('d', ''), 10) || 7;
      const maxDays = 90;
      const actualDays = Math.min(days, maxDays);

      const usage = await analyticsService.getUsageOverTime(userId, actualDays);

      res.json({
        success: true,
        data: {
          period: `${actualDays}d`,
          usage,
        },
      });
    } catch (error) {
      logger.error('Usage analytics error:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to get usage analytics',
      });
    }
  }
);

/**
 * GET /api/v1/analytics/tokens
 * Get token usage breakdown by model
 */
router.get(
  '/tokens',
  clerkAuth,
  async (req: Request, res: Response): Promise<void> => {
    try {
      const userId = req.user!.id;
      const days = parseInt(req.query.days as string, 10) || 30;

      const breakdown = await analyticsService.getTokenBreakdown(userId, days);

      res.json({
        success: true,
        data: {
          period: `${days}d`,
          breakdown,
          total: breakdown.reduce((sum, b) => sum + b.tokens, 0),
        },
      });
    } catch (error) {
      logger.error('Token analytics error:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to get token analytics',
      });
    }
  }
);

/**
 * GET /api/v1/analytics/conversations
 * Get conversation statistics
 */
router.get(
  '/conversations',
  clerkAuth,
  async (req: Request, res: Response): Promise<void> => {
    try {
      const userId = req.user!.id;
      const stats = await analyticsService.getConversationStats(userId);

      res.json({
        success: true,
        data: stats,
      });
    } catch (error) {
      logger.error('Conversation analytics error:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to get conversation analytics',
      });
    }
  }
);

/**
 * GET /api/v1/analytics/export
 * Export analytics data
 */
router.get(
  '/export',
  clerkAuth,
  async (req: Request, res: Response): Promise<void> => {
    try {
      const userId = req.user!.id;
      const format = (req.query.format as string || 'json').toLowerCase();
      const days = parseInt(req.query.days as string, 10) || 30;

      if (!['json', 'csv'].includes(format)) {
        res.status(400).json({
          success: false,
          error: 'Invalid format. Supported: json, csv',
        });
        return;
      }

      const data = await analyticsService.exportAnalytics(
        userId,
        format as 'json' | 'csv',
        days
      );

      const filename = `analytics-${new Date().toISOString().split('T')[0]}.${format}`;
      const mimeType = format === 'json' ? 'application/json' : 'text/csv';

      res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
      res.setHeader('Content-Type', mimeType);
      res.send(data);
    } catch (error) {
      logger.error('Export analytics error:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to export analytics',
      });
    }
  }
);

/**
 * GET /api/v1/analytics/insights
 * Get AI-generated insights about usage
 */
router.get(
  '/insights',
  clerkAuth,
  async (req: Request, res: Response): Promise<void> => {
    try {
      const userId = req.user!.id;

      // Get recent usage data
      const [dashboard, weekUsage, prevWeekUsage] = await Promise.all([
        analyticsService.getDashboard(userId),
        analyticsService.getUsageOverTime(userId, 7),
        analyticsService.getUsageOverTime(userId, 14),
      ]);

      // Calculate insights
      const thisWeekMessages = weekUsage.reduce((sum, d) => sum + d.messages, 0);
      const prevWeekMessages = prevWeekUsage
        .slice(0, 7)
        .reduce((sum, d) => sum + d.messages, 0);

      const messageChange = prevWeekMessages > 0
        ? Math.round(((thisWeekMessages - prevWeekMessages) / prevWeekMessages) * 100)
        : 0;

      const insights = [];

      // Usage trend insight
      if (messageChange > 20) {
        insights.push({
          type: 'growth',
          message: `Your usage increased by ${messageChange}% this week!`,
          icon: '📈',
        });
      } else if (messageChange < -20) {
        insights.push({
          type: 'decline',
          message: `Your usage decreased by ${Math.abs(messageChange)}% this week.`,
          icon: '📉',
        });
      }

      // Top model insight
      if (dashboard.topModels.length > 0) {
        insights.push({
          type: 'model',
          message: `Your most used model is ${dashboard.topModels[0]}`,
          icon: '🤖',
        });
      }

      // Token usage insight
      if (dashboard.totalTokens > 100000) {
        insights.push({
          type: 'tokens',
          message: `You've used ${(dashboard.totalTokens / 1000).toFixed(0)}K tokens total!`,
          icon: '💬',
        });
      }

      // Audio usage insight
      if (dashboard.totalAudioMinutes > 0) {
        insights.push({
          type: 'audio',
          message: `You've transcribed ${dashboard.totalAudioMinutes} minutes of audio`,
          icon: '🎤',
        });
      }

      res.json({
        success: true,
        data: {
          insights,
          summary: {
            thisWeekMessages,
            messageChange,
            totalConversations: dashboard.totalConversations,
            averageResponseTime: dashboard.averageResponseTime,
          },
        },
      });
    } catch (error) {
      logger.error('Insights error:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to get insights',
      });
    }
  }
);

/**
 * GET /api/v1/analytics/admin/global
 * Get global platform statistics (admin only)
 */
router.get(
  '/admin/global',
  clerkAuth,
  async (req: Request, res: Response): Promise<void> => {
    try {
      // TODO: Add admin check
      // const user = await prisma.user.findUnique({ where: { id: req.user!.id } });
      // if (user?.role !== 'admin') { res.status(403)... }

      const stats = await analyticsService.getGlobalStats();

      res.json({
        success: true,
        data: stats,
      });
    } catch (error) {
      logger.error('Global stats error:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to get global stats',
      });
    }
  }
);

export default router;
