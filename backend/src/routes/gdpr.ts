/**
 * GDPR Compliance Routes
 * Implements data export, deletion, and portability rights
 * 
 * GDPR Articles Implemented:
 * - Article 15: Right of Access (Data Export)
 * - Article 17: Right to Erasure (Data Deletion)
 * - Article 20: Right to Data Portability
 * 
 * @module GDPRRoutes
 */

import { Router, Request, Response } from 'express';
import { logger } from '../utils/logger.js';
import { prisma } from '../config/database.js';
import { clerkAuth } from '../middleware/clerkAuth.js';
import { cacheService, CACHE_PREFIXES } from '../services/CacheService.js';

const router = Router();

// Apply authentication to all GDPR routes
router.use(clerkAuth);

// ============================================
// Data Export (GDPR Article 15 - Right of Access)
// ============================================

/**
 * GET /gdpr/export
 * Export all user data in JSON format
 */
router.get('/export', async (req: Request, res: Response) => {
  try {
    const userId = req.user?.id;
    if (!userId) {
      return res.status(401).json({ error: 'Unauthorized' });
    }
    
    logger.info('GDPR data export requested', { userId });
    
    // Gather ALL user data
    const [
      user,
      conversations,
      projects,
      templates,
      analytics,
      apiKeys,
      webhooks,
      shareLinks,
      audioFiles,
      attachments,
      userFacts,
      userProfile,
      conversationSummaries,
      auditLogs,
    ] = await Promise.all([
      // User profile
      prisma.user.findUnique({
        where: { id: userId },
        select: {
          id: true,
          email: true,
          username: true,
          firstName: true,
          lastName: true,
          avatar: true,
          role: true,
          preferences: true,
          tier: true,
          isActive: true,
          lastLoginAt: true,
          loginCount: true,
          createdAt: true,
          updatedAt: true,
        },
      }),
      
      // Conversations with messages
      prisma.conversation.findMany({
        where: { userId },
        include: {
          messages: {
            select: {
              id: true,
              role: true,
              content: true,
              model: true,
              tokens: true,
              createdAt: true,
            },
          },
        },
      }),
      
      // Projects
      prisma.project.findMany({
        where: { userId },
      }),
      
      // Templates
      prisma.template.findMany({
        where: { userId },
      }),
      
      // Analytics
      prisma.analytics.findMany({
        where: { userId },
      }),
      
      // API Keys (redacted)
      prisma.apiKey.findMany({
        where: { userId },
        select: {
          id: true,
          name: true,
          keyPrefix: true,
          permissions: true,
          rateLimit: true,
          lastUsed: true,
          expiresAt: true,
          isActive: true,
          usageCount: true,
          createdAt: true,
        },
      }),
      
      // Webhooks (secrets redacted)
      prisma.webhook.findMany({
        where: { userId },
        select: {
          id: true,
          url: true,
          events: true,
          isActive: true,
          failureCount: true,
          lastTriggered: true,
          createdAt: true,
        },
      }),
      
      // Share links
      prisma.shareLink.findMany({
        where: { userId },
      }),
      
      // Audio files
      prisma.audio.findMany({
        where: { userId },
        select: {
          id: true,
          originalFilename: true,
          fileSize: true,
          duration: true,
          format: true,
          transcription: true,
          detectedLanguage: true,
          createdAt: true,
        },
      }),
      
      // Attachments
      prisma.attachment.findMany({
        where: { userId },
        select: {
          id: true,
          type: true,
          originalName: true,
          fileSize: true,
          mimeType: true,
          status: true,
          createdAt: true,
        },
      }),
      
      // User facts (memory system)
      prisma.userFact.findMany({
        where: { userId },
      }),
      
      // User profile (memory system)
      prisma.userProfile.findUnique({
        where: { userId },
      }),
      
      // Conversation summaries
      prisma.conversationSummary.findMany({
        where: { userId },
      }),
      
      // Audit logs
      prisma.auditLog.findMany({
        where: { userId },
        take: 1000, // Limit to last 1000 entries
        orderBy: { createdAt: 'desc' },
      }),
    ]);
    
    // Compile export data
    const exportData = {
      exportMetadata: {
        exportedAt: new Date().toISOString(),
        exportedBy: userId,
        gdprArticle: 'Article 15 - Right of Access',
        version: '1.0',
      },
      user,
      conversations: conversations.map(c => ({
        ...c,
        messageCount: c.messages.length,
      })),
      projects,
      templates,
      analytics,
      apiKeys,
      webhooks,
      shareLinks,
      audioFiles,
      attachments,
      memorySystem: {
        profile: userProfile,
        facts: userFacts,
        conversationSummaries,
      },
      auditLogs,
    };
    
    // Log the export
    await prisma.auditLog.create({
      data: {
        userId,
        action: 'gdpr_export',
        resource: 'user_data',
        metadata: { exportedAt: new Date() },
      },
    });
    
    // Set headers for download
    const filename = `baatcheet_data_export_${userId}_${Date.now()}.json`;
    res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
    res.setHeader('Content-Type', 'application/json');
    
    res.json(exportData);
    
  } catch (error) {
    logger.error('GDPR export failed:', error);
    res.status(500).json({ error: 'Failed to export data' });
  }
});

// ============================================
// Data Deletion (GDPR Article 17 - Right to Erasure)
// ============================================

/**
 * DELETE /gdpr/delete-all
 * Permanently delete all user data
 */
router.delete('/delete-all', async (req: Request, res: Response) => {
  try {
    const userId = req.user?.id;
    if (!userId) {
      return res.status(401).json({ error: 'Unauthorized' });
    }
    
    const { confirmDelete } = req.body;
    
    // Require explicit confirmation
    if (confirmDelete !== 'DELETE ALL MY DATA') {
      return res.status(400).json({
        error: 'Confirmation required',
        message: 'Please confirm deletion by sending: {"confirmDelete": "DELETE ALL MY DATA"}',
        warning: 'This action is PERMANENT and cannot be undone.',
      });
    }
    
    logger.warn('GDPR data deletion requested', { userId });
    
    // Delete all user data in transaction
    await prisma.$transaction(async (tx) => {
      // Delete messages (cascade from conversations)
      await tx.message.deleteMany({
        where: { conversation: { userId } },
      });
      
      // Delete attachments
      await tx.attachment.deleteMany({
        where: { userId },
      });
      
      // Delete conversations
      await tx.conversation.deleteMany({
        where: { userId },
      });
      
      // Delete projects
      await tx.project.deleteMany({
        where: { userId },
      });
      
      // Delete templates
      await tx.template.deleteMany({
        where: { userId },
      });
      
      // Delete analytics
      await tx.analytics.deleteMany({
        where: { userId },
      });
      
      // Delete API keys
      await tx.apiKey.deleteMany({
        where: { userId },
      });
      
      // Delete webhook deliveries
      await tx.webhookDelivery.deleteMany({
        where: { webhook: { userId } },
      });
      
      // Delete webhooks
      await tx.webhook.deleteMany({
        where: { userId },
      });
      
      // Delete share links
      await tx.shareLink.deleteMany({
        where: { userId },
      });
      
      // Delete audio files
      await tx.audio.deleteMany({
        where: { userId },
      });
      
      // Delete user facts (memory)
      await tx.userFact.deleteMany({
        where: { userId },
      });
      
      // Delete user profile (memory)
      await tx.userProfile.deleteMany({
        where: { userId },
      });
      
      // Delete conversation summaries
      await tx.conversationSummary.deleteMany({
        where: { userId },
      });
      
      // Create final audit log entry
      await tx.auditLog.create({
        data: {
          userId,
          action: 'gdpr_delete',
          resource: 'user_data',
          metadata: { deletedAt: new Date() },
        },
      });
      
      // Delete user (this will also cascade delete audit logs)
      await tx.user.delete({
        where: { id: userId },
      });
    });
    
    // Clear any cached data
    await cacheService.delete(`${CACHE_PREFIXES.SESSION}profile:${userId}`);
    await cacheService.delete(`${CACHE_PREFIXES.USER_SESSION}${userId}`);
    
    logger.info('GDPR data deletion completed', { userId });
    
    res.json({
      success: true,
      message: 'All your data has been permanently deleted',
      gdprArticle: 'Article 17 - Right to Erasure',
      deletedAt: new Date().toISOString(),
    });
    
  } catch (error) {
    logger.error('GDPR deletion failed:', error);
    res.status(500).json({ error: 'Failed to delete data' });
  }
});

// ============================================
// Data Portability (GDPR Article 20)
// ============================================

/**
 * GET /gdpr/export-portable
 * Export data in machine-readable, portable format
 */
router.get('/export-portable', async (req: Request, res: Response) => {
  try {
    const userId = req.user?.id;
    if (!userId) {
      return res.status(401).json({ error: 'Unauthorized' });
    }
    
    const format = req.query.format as string || 'json';
    
    logger.info('GDPR portable export requested', { userId, format });
    
    // Get core portable data
    const [user, conversations, projects] = await Promise.all([
      prisma.user.findUnique({
        where: { id: userId },
        select: {
          email: true,
          username: true,
          firstName: true,
          lastName: true,
          preferences: true,
          createdAt: true,
        },
      }),
      prisma.conversation.findMany({
        where: { userId },
        include: {
          messages: {
            select: {
              role: true,
              content: true,
              createdAt: true,
            },
          },
        },
      }),
      prisma.project.findMany({
        where: { userId },
        select: {
          name: true,
          description: true,
          createdAt: true,
        },
      }),
    ]);
    
    // Format for portability (standard schema)
    const portableData = {
      '@context': 'https://schema.org',
      '@type': 'DataDownload',
      exportDate: new Date().toISOString(),
      user: {
        '@type': 'Person',
        email: user?.email,
        name: `${user?.firstName || ''} ${user?.lastName || ''}`.trim(),
        username: user?.username,
        memberSince: user?.createdAt,
      },
      conversations: conversations.map(c => ({
        '@type': 'Conversation',
        title: c.title,
        createdAt: c.createdAt,
        messages: c.messages.map(m => ({
          '@type': 'Message',
          sender: m.role,
          text: m.content,
          dateCreated: m.createdAt,
        })),
      })),
      projects: projects.map(p => ({
        '@type': 'Project',
        name: p.name,
        description: p.description,
        dateCreated: p.createdAt,
      })),
    };
    
    // Log the export
    await prisma.auditLog.create({
      data: {
        userId,
        action: 'gdpr_export_portable',
        resource: 'user_data',
        metadata: { format, exportedAt: new Date() },
      },
    });
    
    if (format === 'csv') {
      // Convert to CSV format
      const csvData = this.convertToCSV(portableData);
      res.setHeader('Content-Type', 'text/csv');
      res.setHeader('Content-Disposition', `attachment; filename="baatcheet_portable_${userId}.csv"`);
      return res.send(csvData);
    }
    
    // Default: JSON
    res.setHeader('Content-Type', 'application/json');
    res.setHeader('Content-Disposition', `attachment; filename="baatcheet_portable_${userId}.json"`);
    res.json(portableData);
    
  } catch (error) {
    logger.error('GDPR portable export failed:', error);
    res.status(500).json({ error: 'Failed to export portable data' });
  }
});

// ============================================
// Privacy Information
// ============================================

/**
 * GET /gdpr/privacy-info
 * Get information about data processing
 */
router.get('/privacy-info', async (req: Request, res: Response) => {
  try {
    const userId = req.user?.id;
    if (!userId) {
      return res.status(401).json({ error: 'Unauthorized' });
    }
    
    // Get data statistics
    const [
      conversationCount,
      messageCount,
      factCount,
      attachmentCount,
    ] = await Promise.all([
      prisma.conversation.count({ where: { userId } }),
      prisma.message.count({ where: { conversation: { userId } } }),
      prisma.userFact.count({ where: { userId, isActive: true } }),
      prisma.attachment.count({ where: { userId } }),
    ]);
    
    res.json({
      success: true,
      data: {
        dataController: 'BaatCheet',
        dataProcessingPurposes: [
          'Providing AI chat services',
          'Personalizing responses based on user profile',
          'Improving service quality',
          'Analytics and usage statistics',
        ],
        dataRetentionPolicy: {
          conversations: 'Retained until user deletion',
          messages: 'Retained until user deletion',
          userProfile: 'Retained until user deletion',
          analytics: 'Retained for 2 years',
          auditLogs: 'Retained for 7 years (legal requirement)',
        },
        yourDataStatistics: {
          conversations: conversationCount,
          messages: messageCount,
          learnedFacts: factCount,
          attachments: attachmentCount,
        },
        yourRights: [
          'Right to access your data (GET /gdpr/export)',
          'Right to erasure (DELETE /gdpr/delete-all)',
          'Right to data portability (GET /gdpr/export-portable)',
          'Right to rectification (via profile settings)',
          'Right to object to processing (contact support)',
        ],
        contactForPrivacy: 'privacy@baatcheet.app',
      },
    });
    
  } catch (error) {
    logger.error('Privacy info request failed:', error);
    res.status(500).json({ error: 'Failed to get privacy information' });
  }
});

// ============================================
// Consent Management
// ============================================

/**
 * GET /gdpr/consent
 * Get user's consent status
 */
router.get('/consent', async (req: Request, res: Response) => {
  try {
    const userId = req.user?.id;
    if (!userId) {
      return res.status(401).json({ error: 'Unauthorized' });
    }
    
    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: { preferences: true },
    });
    
    const preferences = user?.preferences as any || {};
    
    res.json({
      success: true,
      data: {
        marketingEmails: preferences.marketingEmails ?? false,
        analyticsTracking: preferences.analyticsTracking ?? true,
        personalizedResponses: preferences.personalizedResponses ?? true,
        dataSharing: preferences.dataSharing ?? false,
        lastUpdated: preferences.consentUpdatedAt || null,
      },
    });
    
  } catch (error) {
    logger.error('Consent fetch failed:', error);
    res.status(500).json({ error: 'Failed to get consent status' });
  }
});

/**
 * PATCH /gdpr/consent
 * Update user's consent preferences
 */
router.patch('/consent', async (req: Request, res: Response) => {
  try {
    const userId = req.user?.id;
    if (!userId) {
      return res.status(401).json({ error: 'Unauthorized' });
    }
    
    const {
      marketingEmails,
      analyticsTracking,
      personalizedResponses,
      dataSharing,
    } = req.body;
    
    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: { preferences: true },
    });
    
    const currentPrefs = user?.preferences as any || {};
    
    const updatedPrefs = {
      ...currentPrefs,
      ...(marketingEmails !== undefined && { marketingEmails }),
      ...(analyticsTracking !== undefined && { analyticsTracking }),
      ...(personalizedResponses !== undefined && { personalizedResponses }),
      ...(dataSharing !== undefined && { dataSharing }),
      consentUpdatedAt: new Date().toISOString(),
    };
    
    await prisma.user.update({
      where: { id: userId },
      data: { preferences: updatedPrefs },
    });
    
    // Log consent change
    await prisma.auditLog.create({
      data: {
        userId,
        action: 'consent_update',
        resource: 'user_preferences',
        metadata: { changes: req.body },
      },
    });
    
    res.json({
      success: true,
      message: 'Consent preferences updated',
      data: updatedPrefs,
    });
    
  } catch (error) {
    logger.error('Consent update failed:', error);
    res.status(500).json({ error: 'Failed to update consent' });
  }
});

export default router;
