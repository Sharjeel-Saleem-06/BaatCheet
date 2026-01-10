/**
 * Admin Moderation Controller
 * Content moderation for administrators
 * 
 * @module AdminModeration
 */

import { Request, Response } from 'express';
import { prisma } from '../../config/database.js';
import { logAdminAction } from '../../middleware/adminAuth.js';
import { logger } from '../../utils/logger.js';

// ============================================
// List Conversations
// ============================================

/**
 * GET /api/v1/admin/conversations
 * List all conversations with moderation info
 */
export const listConversations = async (req: Request, res: Response): Promise<void> => {
  try {
    const {
      page = '1',
      limit = '50',
      userId,
      search,
      flagged,
      sortBy = 'updatedAt',
      sortOrder = 'desc',
    } = req.query;

    const pageNum = parseInt(page as string);
    const limitNum = Math.min(parseInt(limit as string), 100);
    const skip = (pageNum - 1) * limitNum;

    // Build where clause
    const where: any = {};

    if (userId) where.userId = userId;
    
    if (search) {
      where.OR = [
        { title: { contains: search as string, mode: 'insensitive' } },
      ];
    }

    // Get conversations
    const [conversations, total] = await Promise.all([
      prisma.conversation.findMany({
        where,
        skip,
        take: limitNum,
        orderBy: { [sortBy as string]: sortOrder },
        include: {
          user: {
            select: {
              id: true,
              email: true,
              firstName: true,
              lastName: true,
              isBanned: true,
            },
          },
          _count: {
            select: { messages: true },
          },
        },
      }),
      prisma.conversation.count({ where }),
    ]);

    // Get flagged status for conversations
    const conversationIds = conversations.map(c => c.id);
    const flags = await prisma.flaggedContent.findMany({
      where: { conversationId: { in: conversationIds } },
      select: { conversationId: true, status: true, severity: true },
    });

    const flagMap = new Map(flags.map(f => [f.conversationId, f]));

    res.json({
      success: true,
      data: {
        conversations: conversations.map(conv => ({
          id: conv.id,
          title: conv.title,
          model: conv.model,
          messagesCount: conv._count.messages,
          isArchived: conv.isArchived,
          createdAt: conv.createdAt,
          updatedAt: conv.updatedAt,
          user: {
            id: conv.user.id,
            email: conv.user.email,
            name: `${conv.user.firstName || ''} ${conv.user.lastName || ''}`.trim(),
            isBanned: conv.user.isBanned,
          },
          flag: flagMap.get(conv.id) || null,
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
    logger.error('List conversations error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to list conversations',
    });
  }
};

// ============================================
// Get Conversation Details
// ============================================

/**
 * GET /api/v1/admin/conversations/:conversationId
 * Get full conversation with messages
 */
export const getConversation = async (req: Request, res: Response): Promise<void> => {
  try {
    const { conversationId } = req.params;

    const conversation = await prisma.conversation.findUnique({
      where: { id: conversationId },
      include: {
        user: {
          select: {
            id: true,
            email: true,
            firstName: true,
            lastName: true,
            role: true,
            tier: true,
            isBanned: true,
          },
        },
        messages: {
          orderBy: { createdAt: 'asc' },
          include: {
            attachments: true,
          },
        },
        project: {
          select: { id: true, name: true },
        },
      },
    });

    if (!conversation) {
      res.status(404).json({
        success: false,
        error: 'Conversation not found',
      });
      return;
    }

    // Get flag status
    const flag = await prisma.flaggedContent.findFirst({
      where: { conversationId },
      orderBy: { createdAt: 'desc' },
    });

    res.json({
      success: true,
      data: {
        conversation: {
          id: conversation.id,
          title: conversation.title,
          systemPrompt: conversation.systemPrompt,
          model: conversation.model,
          tags: conversation.tags,
          isArchived: conversation.isArchived,
          isPinned: conversation.isPinned,
          totalTokens: conversation.totalTokens,
          createdAt: conversation.createdAt,
          updatedAt: conversation.updatedAt,
        },
        user: {
          id: conversation.user.id,
          email: conversation.user.email,
          name: `${conversation.user.firstName || ''} ${conversation.user.lastName || ''}`.trim(),
          role: conversation.user.role,
          tier: conversation.user.tier,
          isBanned: conversation.user.isBanned,
        },
        project: conversation.project,
        messages: conversation.messages,
        flag,
      },
    });
  } catch (error) {
    logger.error('Get conversation error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to get conversation',
    });
  }
};

// ============================================
// Flag Conversation
// ============================================

/**
 * POST /api/v1/admin/conversations/:conversationId/flag
 * Flag a conversation for review
 */
export const flagConversation = async (req: Request, res: Response): Promise<void> => {
  try {
    const { conversationId } = req.params;
    const { reason, severity = 'medium', notes } = req.body;

    if (!reason) {
      res.status(400).json({
        success: false,
        error: 'Reason is required',
      });
      return;
    }

    // Verify conversation exists
    const conversation = await prisma.conversation.findUnique({
      where: { id: conversationId },
      select: { id: true, userId: true },
    });

    if (!conversation) {
      res.status(404).json({
        success: false,
        error: 'Conversation not found',
      });
      return;
    }

    // Create flag
    const flag = await prisma.flaggedContent.create({
      data: {
        conversationId,
        reason,
        severity,
        flaggedBy: req.user!.id,
        notes,
        status: 'pending',
      },
    });

    // Log action
    await logAdminAction(
      req.user!.id,
      'CONVERSATION_FLAGGED',
      'conversation',
      conversationId,
      { reason, severity },
      req
    );

    res.json({
      success: true,
      data: flag,
      message: 'Conversation flagged successfully',
    });
  } catch (error) {
    logger.error('Flag conversation error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to flag conversation',
    });
  }
};

// ============================================
// Delete Conversation
// ============================================

/**
 * DELETE /api/v1/admin/conversations/:conversationId
 * Delete a conversation (content moderation)
 */
export const deleteConversation = async (req: Request, res: Response): Promise<void> => {
  try {
    const { conversationId } = req.params;
    const { reason, notifyUser = false } = req.body;

    const conversation = await prisma.conversation.findUnique({
      where: { id: conversationId },
      select: { id: true, userId: true, title: true },
    });

    if (!conversation) {
      res.status(404).json({
        success: false,
        error: 'Conversation not found',
      });
      return;
    }

    // Delete conversation (cascades to messages)
    await prisma.conversation.delete({
      where: { id: conversationId },
    });

    // Update any flags
    await prisma.flaggedContent.updateMany({
      where: { conversationId },
      data: {
        status: 'actioned',
        action: 'deleted',
        reviewedBy: req.user!.id,
        reviewedAt: new Date(),
      },
    });

    // Log action
    await logAdminAction(
      req.user!.id,
      'CONVERSATION_DELETED',
      'conversation',
      conversationId,
      { reason, userId: conversation.userId, title: conversation.title },
      req
    );

    // TODO: Notify user if notifyUser is true

    res.json({
      success: true,
      message: 'Conversation deleted successfully',
    });
  } catch (error) {
    logger.error('Delete conversation error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to delete conversation',
    });
  }
};

// ============================================
// List Flagged Content
// ============================================

/**
 * GET /api/v1/admin/flagged-content
 * List all flagged content
 */
export const listFlaggedContent = async (req: Request, res: Response): Promise<void> => {
  try {
    const {
      page = '1',
      limit = '50',
      status,
      severity,
      sortBy = 'createdAt',
      sortOrder = 'desc',
    } = req.query;

    const pageNum = parseInt(page as string);
    const limitNum = Math.min(parseInt(limit as string), 100);
    const skip = (pageNum - 1) * limitNum;

    const where: any = {};
    if (status) where.status = status;
    if (severity) where.severity = severity;

    const [flags, total] = await Promise.all([
      prisma.flaggedContent.findMany({
        where,
        skip,
        take: limitNum,
        orderBy: { [sortBy as string]: sortOrder },
      }),
      prisma.flaggedContent.count({ where }),
    ]);

    // Get conversation details for flags
    const conversationIds = flags.map(f => f.conversationId);
    const conversations = await prisma.conversation.findMany({
      where: { id: { in: conversationIds } },
      select: {
        id: true,
        title: true,
        user: {
          select: { id: true, email: true, firstName: true, lastName: true },
        },
      },
    });

    const convMap = new Map(conversations.map(c => [c.id, c]));

    res.json({
      success: true,
      data: {
        flags: flags.map(flag => ({
          ...flag,
          conversation: convMap.get(flag.conversationId) || null,
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
    logger.error('List flagged content error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to list flagged content',
    });
  }
};

// ============================================
// Review Flagged Content
// ============================================

/**
 * POST /api/v1/admin/flagged-content/:flagId/review
 * Review and take action on flagged content
 */
export const reviewFlag = async (req: Request, res: Response): Promise<void> => {
  try {
    const { flagId } = req.params;
    const { action, notes } = req.body;

    if (!action || !['dismiss', 'warn', 'delete'].includes(action)) {
      res.status(400).json({
        success: false,
        error: 'Valid action is required: dismiss, warn, delete',
      });
      return;
    }

    const flag = await prisma.flaggedContent.findUnique({
      where: { id: flagId },
    });

    if (!flag) {
      res.status(404).json({
        success: false,
        error: 'Flag not found',
      });
      return;
    }

    // Update flag
    await prisma.flaggedContent.update({
      where: { id: flagId },
      data: {
        status: action === 'dismiss' ? 'dismissed' : 'actioned',
        action: action === 'dismiss' ? 'none' : action,
        reviewedBy: req.user!.id,
        reviewedAt: new Date(),
        notes: notes || flag.notes,
      },
    });

    // Take action if needed
    if (action === 'delete') {
      await prisma.conversation.delete({
        where: { id: flag.conversationId },
      });
    }

    // Log action
    await logAdminAction(
      req.user!.id,
      'FLAG_REVIEWED',
      'flaggedContent',
      flagId,
      { action, conversationId: flag.conversationId },
      req
    );

    res.json({
      success: true,
      message: `Flag ${action === 'dismiss' ? 'dismissed' : 'actioned'} successfully`,
    });
  } catch (error) {
    logger.error('Review flag error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to review flag',
    });
  }
};
