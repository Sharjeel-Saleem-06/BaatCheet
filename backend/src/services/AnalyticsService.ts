/**
 * Analytics Service
 * Tracks user activity and provides usage insights
 * 
 * @module AnalyticsService
 */

import { prisma } from '../config/database.js';
import { logger } from '../utils/logger.js';

// ============================================
// Types
// ============================================

export interface DashboardStats {
  totalConversations: number;
  totalMessages: number;
  totalTokens: number;
  totalProjects: number;
  totalImages: number;
  totalAudioMinutes: number;
  averageResponseTime: number;
  topModels: string[];
  topTags: string[];
}

export interface UsageOverTime {
  date: string;
  messages: number;
  tokens: number;
  conversations: number;
}

export interface TokenBreakdown {
  model: string;
  tokens: number;
  percentage: number;
}

// ============================================
// Analytics Service Class
// ============================================

class AnalyticsServiceClass {
  /**
   * Track an event (increment counter)
   */
  public async trackEvent(
    userId: string,
    event: 'message' | 'response' | 'conversation' | 'project' | 'image' | 'audio' | 'export' | 'search',
    metadata?: {
      tokens?: number;
      model?: string;
      responseTime?: number;
      audioMinutes?: number;
      tag?: string;
    }
  ): Promise<void> {
    try {
      const today = new Date();
      today.setHours(0, 0, 0, 0);

      // Get or create today's analytics record
      let analytics = await prisma.analytics.findUnique({
        where: {
          userId_date: {
            userId,
            date: today,
          },
        },
      });

      if (!analytics) {
        analytics = await prisma.analytics.create({
          data: {
            userId,
            date: today,
          },
        });
      }

      // Build update data
      const updateData: Record<string, unknown> = {};

      switch (event) {
        case 'message':
          updateData.messagesCount = { increment: 1 };
          break;
        case 'response':
          updateData.responsesCount = { increment: 1 };
          if (metadata?.tokens && metadata?.model) {
            const tokensByModel = (analytics.tokensByModel as Record<string, number>) || {};
            tokensByModel[metadata.model] = (tokensByModel[metadata.model] || 0) + metadata.tokens;
            updateData.tokensByModel = tokensByModel;
          }
          if (metadata?.responseTime) {
            // Calculate running average
            const currentAvg = analytics.averageResponseTime || 0;
            const count = analytics.responsesCount || 0;
            const newAvg = (currentAvg * count + metadata.responseTime) / (count + 1);
            updateData.averageResponseTime = newAvg;
          }
          break;
        case 'conversation':
          updateData.conversationsCreated = { increment: 1 };
          break;
        case 'project':
          updateData.projectsCreated = { increment: 1 };
          break;
        case 'image':
          updateData.imagesUploaded = { increment: 1 };
          break;
        case 'audio':
          if (metadata?.audioMinutes) {
            updateData.audioTranscribed = { increment: metadata.audioMinutes };
          }
          break;
        case 'export':
          updateData.exportsGenerated = { increment: 1 };
          break;
        case 'search':
          updateData.searchesPerformed = { increment: 1 };
          break;
      }

      // Update top models
      if (metadata?.model) {
        const topModels = analytics.topModels || [];
        if (!topModels.includes(metadata.model)) {
          topModels.push(metadata.model);
          updateData.topModels = topModels.slice(-10); // Keep last 10
        }
      }

      // Update top tags
      if (metadata?.tag) {
        const topTags = analytics.topTags || [];
        if (!topTags.includes(metadata.tag)) {
          topTags.push(metadata.tag);
          updateData.topTags = topTags.slice(-10);
        }
      }

      await prisma.analytics.update({
        where: { id: analytics.id },
        data: updateData,
      });
    } catch (error) {
      logger.error('Analytics tracking error:', error);
    }
  }

  /**
   * Get dashboard statistics for a user
   */
  public async getDashboard(userId: string): Promise<DashboardStats> {
    try {
      // Get aggregated stats
      const [conversationStats, messageStats, projectCount, imageCount, audioStats, recentAnalytics] = await Promise.all([
        prisma.conversation.aggregate({
          where: { userId },
          _count: true,
          _sum: { totalTokens: true },
        }),
        prisma.message.count({
          where: { conversation: { userId } },
        }),
        prisma.project.count({ where: { userId } }),
        prisma.attachment.count({
          where: { message: { conversation: { userId } }, type: 'image' },
        }),
        prisma.audio.aggregate({
          where: { userId },
          _sum: { duration: true },
        }),
        prisma.analytics.findMany({
          where: { userId },
          orderBy: { date: 'desc' },
          take: 30,
        }),
      ]);

      // Calculate averages and top items from recent analytics
      let totalResponseTime = 0;
      let responseCount = 0;
      const modelCounts: Record<string, number> = {};
      const tagCounts: Record<string, number> = {};

      for (const day of recentAnalytics) {
        if (day.averageResponseTime && day.responsesCount) {
          totalResponseTime += day.averageResponseTime * day.responsesCount;
          responseCount += day.responsesCount;
        }

        for (const model of day.topModels) {
          modelCounts[model] = (modelCounts[model] || 0) + 1;
        }

        for (const tag of day.topTags) {
          tagCounts[tag] = (tagCounts[tag] || 0) + 1;
        }
      }

      const topModels = Object.entries(modelCounts)
        .sort((a, b) => b[1] - a[1])
        .slice(0, 5)
        .map(([model]) => model);

      const topTags = Object.entries(tagCounts)
        .sort((a, b) => b[1] - a[1])
        .slice(0, 10)
        .map(([tag]) => tag);

      return {
        totalConversations: conversationStats._count,
        totalMessages: messageStats,
        totalTokens: conversationStats._sum.totalTokens || 0,
        totalProjects: projectCount,
        totalImages: imageCount,
        totalAudioMinutes: Math.round((audioStats._sum.duration || 0) / 60),
        averageResponseTime: responseCount > 0 ? Math.round(totalResponseTime / responseCount) : 0,
        topModels,
        topTags,
      };
    } catch (error) {
      logger.error('Get dashboard error:', error);
      return {
        totalConversations: 0,
        totalMessages: 0,
        totalTokens: 0,
        totalProjects: 0,
        totalImages: 0,
        totalAudioMinutes: 0,
        averageResponseTime: 0,
        topModels: [],
        topTags: [],
      };
    }
  }

  /**
   * Get usage over time
   */
  public async getUsageOverTime(
    userId: string,
    days: number = 7
  ): Promise<UsageOverTime[]> {
    try {
      const startDate = new Date();
      startDate.setDate(startDate.getDate() - days);
      startDate.setHours(0, 0, 0, 0);

      const analytics = await prisma.analytics.findMany({
        where: {
          userId,
          date: { gte: startDate },
        },
        orderBy: { date: 'asc' },
      });

      // Fill in missing days
      const result: UsageOverTime[] = [];
      const dateMap = new Map(
        analytics.map((a) => [a.date.toISOString().split('T')[0], a])
      );

      for (let i = 0; i < days; i++) {
        const date = new Date(startDate);
        date.setDate(date.getDate() + i);
        const dateStr = date.toISOString().split('T')[0];
        const dayData = dateMap.get(dateStr);

        result.push({
          date: dateStr,
          messages: dayData?.messagesCount || 0,
          tokens: this.sumTokens(dayData?.tokensByModel as Record<string, number> || {}),
          conversations: dayData?.conversationsCreated || 0,
        });
      }

      return result;
    } catch (error) {
      logger.error('Get usage over time error:', error);
      return [];
    }
  }

  /**
   * Get token breakdown by model
   */
  public async getTokenBreakdown(userId: string, days: number = 30): Promise<TokenBreakdown[]> {
    try {
      const startDate = new Date();
      startDate.setDate(startDate.getDate() - days);

      const analytics = await prisma.analytics.findMany({
        where: {
          userId,
          date: { gte: startDate },
        },
      });

      // Aggregate tokens by model
      const modelTokens: Record<string, number> = {};
      let totalTokens = 0;

      for (const day of analytics) {
        const tokens = day.tokensByModel as Record<string, number> || {};
        for (const [model, count] of Object.entries(tokens)) {
          modelTokens[model] = (modelTokens[model] || 0) + count;
          totalTokens += count;
        }
      }

      // Convert to breakdown
      return Object.entries(modelTokens)
        .map(([model, tokens]) => ({
          model,
          tokens,
          percentage: totalTokens > 0 ? Math.round((tokens / totalTokens) * 100) : 0,
        }))
        .sort((a, b) => b.tokens - a.tokens);
    } catch (error) {
      logger.error('Get token breakdown error:', error);
      return [];
    }
  }

  /**
   * Get conversation statistics
   */
  public async getConversationStats(userId: string): Promise<{
    total: number;
    active: number;
    archived: number;
    averageLength: number;
    byProject: Array<{ projectId: string | null; projectName: string; count: number }>;
  }> {
    try {
      const [total, active, archived, avgMessages, byProject] = await Promise.all([
        prisma.conversation.count({ where: { userId } }),
        prisma.conversation.count({ where: { userId, isArchived: false } }),
        prisma.conversation.count({ where: { userId, isArchived: true } }),
        prisma.message.groupBy({
          by: ['conversationId'],
          where: { conversation: { userId } },
          _count: true,
        }),
        prisma.conversation.groupBy({
          by: ['projectId'],
          where: { userId },
          _count: true,
        }),
      ]);

      // Calculate average messages per conversation
      const avgLength = avgMessages.length > 0
        ? Math.round(avgMessages.reduce((sum, c) => sum + c._count, 0) / avgMessages.length)
        : 0;

      // Get project names
      const projectIds = byProject.map((p) => p.projectId).filter(Boolean) as string[];
      const projects = await prisma.project.findMany({
        where: { id: { in: projectIds } },
        select: { id: true, name: true },
      });
      const projectMap = new Map(projects.map((p) => [p.id, p.name]));

      return {
        total,
        active,
        archived,
        averageLength: avgLength,
        byProject: byProject.map((p) => ({
          projectId: p.projectId,
          projectName: p.projectId ? projectMap.get(p.projectId) || 'Unknown' : 'No Project',
          count: p._count,
        })),
      };
    } catch (error) {
      logger.error('Get conversation stats error:', error);
      return {
        total: 0,
        active: 0,
        archived: 0,
        averageLength: 0,
        byProject: [],
      };
    }
  }

  /**
   * Export analytics data
   */
  public async exportAnalytics(
    userId: string,
    format: 'json' | 'csv',
    days: number = 30
  ): Promise<string> {
    const startDate = new Date();
    startDate.setDate(startDate.getDate() - days);

    const analytics = await prisma.analytics.findMany({
      where: {
        userId,
        date: { gte: startDate },
      },
      orderBy: { date: 'asc' },
    });

    if (format === 'json') {
      return JSON.stringify(analytics, null, 2);
    }

    // CSV format
    const headers = [
      'date',
      'messages',
      'responses',
      'conversations',
      'projects',
      'images',
      'audio_minutes',
      'exports',
      'searches',
      'avg_response_time',
    ];

    const rows = analytics.map((a) => [
      a.date.toISOString().split('T')[0],
      a.messagesCount,
      a.responsesCount,
      a.conversationsCreated,
      a.projectsCreated,
      a.imagesUploaded,
      a.audioTranscribed.toFixed(2),
      a.exportsGenerated,
      a.searchesPerformed,
      a.averageResponseTime.toFixed(0),
    ]);

    return [headers.join(','), ...rows.map((r) => r.join(','))].join('\n');
  }

  /**
   * Get global platform statistics (admin)
   */
  public async getGlobalStats(): Promise<{
    totalUsers: number;
    totalConversations: number;
    totalMessages: number;
    activeUsersToday: number;
    totalTokensToday: number;
  }> {
    try {
      const today = new Date();
      today.setHours(0, 0, 0, 0);

      const [users, conversations, messages, todayAnalytics] = await Promise.all([
        prisma.user.count(),
        prisma.conversation.count(),
        prisma.message.count(),
        prisma.analytics.findMany({
          where: { date: today },
        }),
      ]);

      const activeUsersToday = todayAnalytics.length;
      const totalTokensToday = todayAnalytics.reduce(
        (sum, a) => sum + this.sumTokens(a.tokensByModel as Record<string, number> || {}),
        0
      );

      return {
        totalUsers: users,
        totalConversations: conversations,
        totalMessages: messages,
        activeUsersToday,
        totalTokensToday,
      };
    } catch (error) {
      logger.error('Get global stats error:', error);
      return {
        totalUsers: 0,
        totalConversations: 0,
        totalMessages: 0,
        activeUsersToday: 0,
        totalTokensToday: 0,
      };
    }
  }

  /**
   * Helper: Sum tokens from model map
   */
  private sumTokens(tokensByModel: Record<string, number>): number {
    return Object.values(tokensByModel).reduce((sum, count) => sum + count, 0);
  }
}

// Export singleton
export const analyticsService = new AnalyticsServiceClass();
export default analyticsService;
