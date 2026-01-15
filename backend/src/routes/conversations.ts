import { Router, Request, Response } from 'express';
import { prisma } from '../config/database.js';
import { clerkAuth, validate, schemas } from '../middleware/index.js';
import { contextManager } from '../services/ContextManager.js';
import { logger } from '../utils/logger.js';

const router = Router();

// ============================================
// Conversation Routes
// ============================================

/**
 * GET /api/v1/conversations
 * List all conversations for the user
 */
router.get(
  '/',
  clerkAuth,
  async (req: Request, res: Response): Promise<void> => {
    try {
      const userId = req.user!.id;
      const limit = parseInt(req.query.limit as string) || 50;
      const offset = parseInt(req.query.offset as string) || 0;
      const projectId = req.query.projectId as string | undefined;
      const archived = req.query.archived as string | undefined;
      const pinned = req.query.pinned as string | undefined;

      // Build where clause
      const where: Record<string, unknown> = { userId };
      
      // Filter by projectId - if not specified, only show non-project conversations
      if (projectId) {
        where.projectId = projectId;
      } else {
        // By default, exclude project conversations from general list
        where.projectId = null;
      }
      
      if (archived === 'true') where.isArchived = true;
      if (archived === 'false') where.isArchived = false;
      if (pinned === 'true') where.isPinned = true;

      // Get conversations with message count
      const [conversations, total] = await Promise.all([
        prisma.conversation.findMany({
          where,
          select: {
            id: true,
            title: true,
            model: true,
            tags: true,
            isPinned: true,
            isArchived: true,
            totalTokens: true,
            createdAt: true,
            updatedAt: true,
            _count: {
              select: { messages: true },
            },
          },
          orderBy: [{ isPinned: 'desc' }, { updatedAt: 'desc' }],
          take: limit,
          skip: offset,
        }),
        prisma.conversation.count({ where }),
      ]);

      // Transform to include message count
      const items = conversations.map((c) => ({
        id: c.id,
        title: c.title,
        model: c.model,
        tags: c.tags,
        isPinned: c.isPinned,
        isArchived: c.isArchived,
        totalTokens: c.totalTokens,
        createdAt: c.createdAt,
        updatedAt: c.updatedAt,
        messageCount: c._count.messages,
      }));

      res.json({
        success: true,
        data: {
          items,
          pagination: {
            total,
            limit,
            offset,
            hasMore: total > offset + limit,
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
  }
);

/**
 * GET /api/v1/conversations/search
 * Search conversations by content
 */
router.get(
  '/search',
  clerkAuth,
  async (req: Request, res: Response): Promise<void> => {
    try {
      const userId = req.user!.id;
      const q = req.query.q as string;
      const limit = parseInt(req.query.limit as string) || 20;

      if (!q) {
        res.status(400).json({
          success: false,
          error: 'Search query is required',
        });
        return;
      }

      // Search in title and message content
      const conversations = await prisma.conversation.findMany({
        where: {
          userId,
          OR: [
            { title: { contains: q, mode: 'insensitive' } },
            {
              messages: {
                some: {
                  content: { contains: q, mode: 'insensitive' },
                },
              },
            },
          ],
        },
        select: {
          id: true,
          title: true,
          model: true,
          tags: true,
          updatedAt: true,
          createdAt: true,
        },
        orderBy: { updatedAt: 'desc' },
        take: limit,
      });

      res.json({
        success: true,
        data: conversations,
      });
    } catch (error) {
      logger.error('Search conversations error:', error);
      res.status(500).json({
        success: false,
        error: 'Search failed',
      });
    }
  }
);

/**
 * GET /api/v1/conversations/:id
 * Get a single conversation with messages
 * Supports both owned conversations and project collaborator access
 */
router.get(
  '/:id',
  clerkAuth,
  async (req: Request, res: Response): Promise<void> => {
    try {
      const userId = req.user!.id;
      const { id } = req.params;

      // First try to find conversation owned by user
      let conversation = await prisma.conversation.findFirst({
        where: { id, userId },
        include: {
          messages: {
            orderBy: { createdAt: 'asc' },
            include: {
              attachments: true,
            },
          },
          project: {
            select: {
              id: true,
              name: true,
              color: true,
            },
          },
        },
      });

      // If not found, check if user is a collaborator on the project
      if (!conversation) {
        conversation = await prisma.conversation.findFirst({
          where: {
            id,
            project: {
              collaborators: {
                some: { userId },
              },
            },
          },
          include: {
            messages: {
              orderBy: { createdAt: 'asc' },
              include: {
                attachments: true,
              },
            },
            project: {
              select: {
                id: true,
                name: true,
                color: true,
              },
            },
          },
        });
      }

      if (!conversation) {
        res.status(404).json({
          success: false,
          error: 'Conversation not found',
        });
        return;
      }

      res.json({
        success: true,
        data: conversation,
      });
    } catch (error) {
      logger.error('Get conversation error:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to get conversation',
      });
    }
  }
);

/**
 * POST /api/v1/conversations
 * Create a new conversation
 */
router.post(
  '/',
  clerkAuth,
  async (req: Request, res: Response): Promise<void> => {
    try {
      const userId = req.user!.id;
      const { title, model, systemPrompt, projectId, tags } = req.body;

      const conversation = await prisma.conversation.create({
        data: {
          userId,
          title: title || 'New Conversation',
          model: model || 'llama-3.1-70b-versatile',
          systemPrompt,
          projectId,
          tags: tags || [],
        },
      });

      res.status(201).json({
        success: true,
        data: conversation,
        message: 'Conversation created',
      });
    } catch (error) {
      logger.error('Create conversation error:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to create conversation',
      });
    }
  }
);

/**
 * PUT /api/v1/conversations/:id
 * Update a conversation
 */
router.put(
  '/:id',
  clerkAuth,
  validate(schemas.updateConversation),
  async (req: Request, res: Response): Promise<void> => {
    try {
      const userId = req.user!.id;
      const { id } = req.params;

      // Verify ownership
      const existing = await prisma.conversation.findFirst({
        where: { id, userId },
      });

      if (!existing) {
        res.status(404).json({
          success: false,
          error: 'Conversation not found',
        });
        return;
      }

      const conversation = await prisma.conversation.update({
        where: { id },
        data: req.body,
      });

      // Clear cache if system prompt changed
      if (req.body.systemPrompt !== undefined) {
        await contextManager.clearCache(id);
      }

      res.json({
        success: true,
        data: conversation,
        message: 'Conversation updated',
      });
    } catch (error) {
      logger.error('Update conversation error:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to update conversation',
      });
    }
  }
);

/**
 * DELETE /api/v1/conversations/:id
 * Delete a conversation
 */
router.delete(
  '/:id',
  clerkAuth,
  async (req: Request, res: Response): Promise<void> => {
    try {
      const userId = req.user!.id;
      const { id } = req.params;

      // Verify ownership
      const existing = await prisma.conversation.findFirst({
        where: { id, userId },
      });

      if (!existing) {
        res.status(404).json({
          success: false,
          error: 'Conversation not found',
        });
        return;
      }

      // Delete conversation (cascades to messages)
      await prisma.conversation.delete({ where: { id } });

      // Clear cache
      await contextManager.clearCache(id);

      res.json({
        success: true,
        message: 'Conversation deleted',
      });
    } catch (error) {
      logger.error('Delete conversation error:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to delete conversation',
      });
    }
  }
);

export default router;
