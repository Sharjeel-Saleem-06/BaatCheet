import { Router, Request, Response } from 'express';
import { Conversation } from '../models/Conversation.js';
import { authenticate, validate, schemas } from '../middleware/index.js';
import { logger } from '../utils/logger.js';

const router = Router();

// ============================================
// Conversation Routes
// ============================================

// GET /api/v1/conversations - List all conversations
router.get(
  '/',
  authenticate,
  async (req: Request, res: Response): Promise<void> => {
    try {
      const userId = req.user!.userId;
      const { projectId, archived, pinned, limit = 50, skip = 0 } = req.query;

      // Build query
      const query: Record<string, unknown> = { userId };
      
      if (projectId) query.projectId = projectId;
      if (archived === 'true') query.isArchived = true;
      if (archived === 'false') query.isArchived = false;
      if (pinned === 'true') query.isPinned = true;

      const conversations = await Conversation.find(query)
        .select('conversationId title model tags isPinned isArchived createdAt updatedAt')
        .sort({ isPinned: -1, updatedAt: -1 })
        .limit(Number(limit))
        .skip(Number(skip));

      const total = await Conversation.countDocuments(query);

      res.json({
        success: true,
        data: {
          conversations,
          pagination: {
            total,
            limit: Number(limit),
            skip: Number(skip),
            hasMore: total > Number(skip) + Number(limit),
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

// GET /api/v1/conversations/search - Search conversations
router.get(
  '/search',
  authenticate,
  async (req: Request, res: Response): Promise<void> => {
    try {
      const userId = req.user!.userId;
      const { q, limit = 20 } = req.query;

      if (!q || typeof q !== 'string') {
        res.status(400).json({
          success: false,
          error: 'Search query is required',
        });
        return;
      }

      const conversations = await Conversation.find({
        userId,
        $text: { $search: q },
      })
        .select('conversationId title model tags createdAt')
        .limit(Number(limit))
        .sort({ score: { $meta: 'textScore' } });

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

// GET /api/v1/conversations/:id - Get single conversation
router.get(
  '/:id',
  authenticate,
  async (req: Request, res: Response): Promise<void> => {
    try {
      const userId = req.user!.userId;
      const { id } = req.params;

      const conversation = await Conversation.findOne({
        conversationId: id,
        userId,
      });

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

// PUT /api/v1/conversations/:id - Update conversation
router.put(
  '/:id',
  authenticate,
  validate(schemas.updateConversation),
  async (req: Request, res: Response): Promise<void> => {
    try {
      const userId = req.user!.userId;
      const { id } = req.params;
      const updates = req.body;

      const conversation = await Conversation.findOneAndUpdate(
        { conversationId: id, userId },
        { $set: updates },
        { new: true }
      );

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

// DELETE /api/v1/conversations/:id - Delete conversation
router.delete(
  '/:id',
  authenticate,
  async (req: Request, res: Response): Promise<void> => {
    try {
      const userId = req.user!.userId;
      const { id } = req.params;

      const result = await Conversation.findOneAndDelete({
        conversationId: id,
        userId,
      });

      if (!result) {
        res.status(404).json({
          success: false,
          error: 'Conversation not found',
        });
        return;
      }

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
