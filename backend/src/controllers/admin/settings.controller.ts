/**
 * Admin Settings Controller
 * System settings management for administrators
 * 
 * @module AdminSettings
 */

import { Request, Response } from 'express';
import { prisma } from '../../config/database.js';
import { logAdminAction } from '../../middleware/adminAuth.js';
import { providerManager } from '../../services/ProviderManager.js';
import { logger } from '../../utils/logger.js';

// ============================================
// Default Settings
// ============================================

const DEFAULT_SETTINGS = {
  features: {
    allowNewRegistrations: true,
    maintenanceMode: false,
    imageUploadEnabled: true,
    voiceInputEnabled: true,
    webhooksEnabled: true,
    apiKeysEnabled: true,
  },
  limits: {
    free: {
      messagesPerDay: 100,
      tokensPerDay: 10000,
      imagesPerDay: 10,
      audioMinutesPerDay: 10,
      conversationsMax: 50,
      projectsMax: 5,
    },
    pro: {
      messagesPerDay: 1000,
      tokensPerDay: 100000,
      imagesPerDay: 100,
      audioMinutesPerDay: 60,
      conversationsMax: 500,
      projectsMax: 50,
    },
    enterprise: {
      messagesPerDay: -1, // Unlimited
      tokensPerDay: -1,
      imagesPerDay: -1,
      audioMinutesPerDay: -1,
      conversationsMax: -1,
      projectsMax: -1,
    },
  },
  ai: {
    defaultModel: 'llama-3.3-70b-versatile',
    defaultProvider: 'groq',
    maxContextTokens: 8000,
    temperature: 0.7,
    enabledProviders: ['groq', 'openrouter', 'deepseek', 'gemini'],
  },
  moderation: {
    autoModeration: false,
    flagKeywords: [],
    requireManualReview: false,
    maxMessageLength: 10000,
  },
  security: {
    sessionTimeout: 7 * 24 * 60 * 60 * 1000, // 7 days
    maxLoginAttempts: 5,
    lockoutDuration: 15 * 60 * 1000, // 15 minutes
    requireEmailVerification: true,
  },
};

// ============================================
// Get All Settings
// ============================================

/**
 * GET /api/v1/admin/settings
 * Get all system settings
 */
export const getSettings = async (req: Request, res: Response): Promise<void> => {
  try {
    // Get all settings from database
    const dbSettings = await prisma.systemSettings.findMany();
    
    // Merge with defaults
    const settings = { ...DEFAULT_SETTINGS };
    
    for (const setting of dbSettings) {
      const keys = setting.key.split('.');
      let current: any = settings;
      
      for (let i = 0; i < keys.length - 1; i++) {
        if (!current[keys[i]]) current[keys[i]] = {};
        current = current[keys[i]];
      }
      
      current[keys[keys.length - 1]] = setting.value;
    }

    res.json({
      success: true,
      data: settings,
    });
  } catch (error) {
    logger.error('Get settings error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to get settings',
    });
  }
};

// ============================================
// Update Settings
// ============================================

/**
 * PUT /api/v1/admin/settings
 * Update system settings
 */
export const updateSettings = async (req: Request, res: Response): Promise<void> => {
  try {
    const { settings } = req.body;

    if (!settings || typeof settings !== 'object') {
      res.status(400).json({
        success: false,
        error: 'Settings object is required',
      });
      return;
    }

    // Flatten settings object
    const flattenSettings = (obj: any, prefix = ''): Array<{ key: string; value: any }> => {
      const result: Array<{ key: string; value: any }> = [];
      
      for (const [key, value] of Object.entries(obj)) {
        const fullKey = prefix ? `${prefix}.${key}` : key;
        
        if (value !== null && typeof value === 'object' && !Array.isArray(value)) {
          result.push(...flattenSettings(value, fullKey));
        } else {
          result.push({ key: fullKey, value });
        }
      }
      
      return result;
    };

    const flatSettings = flattenSettings(settings);

    // Update each setting
    for (const { key, value } of flatSettings) {
      await prisma.systemSettings.upsert({
        where: { key },
        update: { value, updatedBy: req.user!.id },
        create: { key, value, updatedBy: req.user!.id },
      });
    }

    // Log action
    await logAdminAction(
      req.user!.id,
      'SETTINGS_UPDATED',
      'systemSettings',
      undefined,
      { updatedKeys: flatSettings.map(s => s.key) },
      req
    );

    res.json({
      success: true,
      message: 'Settings updated successfully',
    });
  } catch (error) {
    logger.error('Update settings error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to update settings',
    });
  }
};

// ============================================
// Get AI Providers
// ============================================

/**
 * GET /api/v1/admin/settings/ai-providers
 * Get AI provider configurations
 */
export const getProviders = async (req: Request, res: Response): Promise<void> => {
  try {
    const summary = providerManager.getSummary();
    const providers = ['groq', 'openrouter', 'deepseek', 'gemini', 'huggingface', 'ocrspace'];
    
    const providerDetails = providers.map(name => {
      const health = providerManager.getProviderHealth(name);
      return {
        name,
        enabled: health !== null && health.available,
        totalKeys: health?.totalKeys || 0,
        availableKeys: health?.availableKeys || 0,
        dailyCapacity: health?.totalCapacity || 0,
        usedToday: health?.usedToday || 0,
        percentUsed: health?.percentUsed || 0,
      };
    });

    res.json({
      success: true,
      data: {
        summary: {
          totalProviders: summary.totalProviders,
          activeProviders: summary.activeProviders,
          totalKeys: summary.totalKeys,
          totalCapacity: summary.totalCapacity,
          totalUsed: summary.totalUsed,
        },
        providers: providerDetails,
      },
    });
  } catch (error) {
    logger.error('Get providers error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to get providers',
    });
  }
};

// ============================================
// Update Provider Settings
// ============================================

/**
 * PUT /api/v1/admin/settings/ai-providers/:provider
 * Update provider settings (enable/disable)
 */
export const updateProvider = async (req: Request, res: Response): Promise<void> => {
  try {
    const { provider } = req.params;
    const { enabled } = req.body;

    // Store in system settings
    const key = `ai.providers.${provider}.enabled`;
    
    await prisma.systemSettings.upsert({
      where: { key },
      update: { value: enabled, updatedBy: req.user!.id },
      create: { key, value: enabled, updatedBy: req.user!.id },
    });

    // Log action
    await logAdminAction(
      req.user!.id,
      'PROVIDER_UPDATED',
      'provider',
      provider,
      { enabled },
      req
    );

    res.json({
      success: true,
      message: `Provider ${provider} ${enabled ? 'enabled' : 'disabled'}`,
    });
  } catch (error) {
    logger.error('Update provider error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to update provider',
    });
  }
};

// ============================================
// Get Audit Logs
// ============================================

/**
 * GET /api/v1/admin/audit-logs
 * Get audit logs
 */
export const getAuditLogs = async (req: Request, res: Response): Promise<void> => {
  try {
    const {
      page = '1',
      limit = '50',
      userId,
      action,
      resource,
      startDate,
      endDate,
    } = req.query;

    const pageNum = parseInt(page as string);
    const limitNum = Math.min(parseInt(limit as string), 100);
    const skip = (pageNum - 1) * limitNum;

    const where: any = {};
    if (userId) where.userId = userId;
    if (action) where.action = action;
    if (resource) where.resource = { contains: resource as string };
    if (startDate) where.createdAt = { gte: new Date(startDate as string) };
    if (endDate) where.createdAt = { ...where.createdAt, lte: new Date(endDate as string) };

    const [logs, total] = await Promise.all([
      prisma.auditLog.findMany({
        where,
        skip,
        take: limitNum,
        orderBy: { createdAt: 'desc' },
        include: {
          user: {
            select: { id: true, email: true, firstName: true, lastName: true },
          },
        },
      }),
      prisma.auditLog.count({ where }),
    ]);

    res.json({
      success: true,
      data: {
        logs: logs.map(log => ({
          id: log.id,
          action: log.action,
          resource: log.resource,
          resourceId: log.resourceId,
          ipAddress: log.ipAddress,
          userAgent: log.userAgent,
          metadata: log.metadata,
          timestamp: log.createdAt,
          user: log.user ? {
            id: log.user.id,
            email: log.user.email,
            name: `${log.user.firstName || ''} ${log.user.lastName || ''}`.trim(),
          } : null,
        })),
        pagination: {
          page: pageNum,
          limit: limitNum,
          total,
          totalPages: Math.ceil(total / limitNum),
        },
      },
    });
  } catch (error) {
    logger.error('Get audit logs error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to get audit logs',
    });
  }
};

// ============================================
// Export Audit Logs
// ============================================

/**
 * GET /api/v1/admin/audit-logs/export
 * Export audit logs to JSON
 */
export const exportAuditLogs = async (req: Request, res: Response): Promise<void> => {
  try {
    const { startDate, endDate, format = 'json' } = req.query;

    const where: any = {};
    if (startDate) where.createdAt = { gte: new Date(startDate as string) };
    if (endDate) where.createdAt = { ...where.createdAt, lte: new Date(endDate as string) };

    const logs = await prisma.auditLog.findMany({
      where,
      orderBy: { createdAt: 'desc' },
      include: {
        user: {
          select: { id: true, email: true },
        },
      },
    });

    // Log export action
    await logAdminAction(
      req.user!.id,
      'AUDIT_LOGS_EXPORTED',
      'auditLog',
      undefined,
      { count: logs.length, startDate, endDate },
      req
    );

    const filename = `audit_logs_${Date.now()}.json`;
    res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
    res.setHeader('Content-Type', 'application/json');
    res.json({
      exportedAt: new Date(),
      exportedBy: req.user!.id,
      count: logs.length,
      logs,
    });
  } catch (error) {
    logger.error('Export audit logs error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to export audit logs',
    });
  }
};
