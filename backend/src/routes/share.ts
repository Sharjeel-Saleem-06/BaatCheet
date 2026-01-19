/**
 * Share Routes
 * API endpoints for conversation sharing
 * 
 * @module Routes/Share
 */

import { Router, Request, Response } from 'express';
import { clerkAuth } from '../middleware/index.js';
import { shareService } from '../services/ShareService.js';
import { logger } from '../utils/logger.js';

const router = Router();

// ============================================
// Share Routes
// ============================================

/**
 * POST /api/v1/share/:conversationId
 * Create a share link for a conversation
 */
router.post(
  '/:conversationId',
  clerkAuth,
  async (req: Request, res: Response): Promise<void> => {
    try {
      const userId = req.user!.id;
      const { conversationId } = req.params;
      const { expiresInDays, isPublic = true } = req.body;

      const result = await shareService.createShareLink(conversationId, userId, {
        expiresInDays,
        isPublic,
      });

      if (!result.success) {
        res.status(404).json({
          success: false,
          error: result.error,
        });
        return;
      }

      res.json({
        success: true,
        data: {
          ...result.shareLink,
          shareUrl: `/share/${result.shareLink!.shareId}`,
        },
      });
    } catch (error) {
      logger.error('Create share link error:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to create share link',
      });
    }
  }
);

/**
 * GET /api/v1/share
 * List all share links for the current user
 */
router.get(
  '/',
  clerkAuth,
  async (req: Request, res: Response): Promise<void> => {
    try {
      const userId = req.user!.id;

      const result = await shareService.listUserShareLinks(userId);

      if (!result.success) {
        res.status(500).json({
          success: false,
          error: result.error,
        });
        return;
      }

      res.json({
        success: true,
        data: result.shareLinks,
      });
    } catch (error) {
      logger.error('List share links error:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to list share links',
      });
    }
  }
);

/**
 * GET /api/v1/share/:shareId
 * Get shared conversation (requires authentication)
 * User must be logged in to view shared conversations
 */
router.get(
  '/:shareId',
  clerkAuth, // Require authentication to view shared chats
  async (req: Request, res: Response): Promise<void> => {
    try {
      const { shareId } = req.params;
      const viewerId = req.user!.id;

      const result = await shareService.getSharedConversation(shareId, viewerId);

      if (!result.success) {
        res.status(404).json({
          success: false,
          error: result.error,
        });
        return;
      }

      res.json({
        success: true,
        data: result.conversation,
      });
    } catch (error) {
      logger.error('Get shared conversation error:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to get shared conversation',
      });
    }
  }
);

/**
 * DELETE /api/v1/share/:shareId
 * Revoke a share link
 */
router.delete(
  '/:shareId',
  clerkAuth,
  async (req: Request, res: Response): Promise<void> => {
    try {
      const userId = req.user!.id;
      const { shareId } = req.params;

      const result = await shareService.revokeShareLink(shareId, userId);

      if (!result.success) {
        res.status(404).json({
          success: false,
          error: result.error,
        });
        return;
      }

      res.json({
        success: true,
        message: 'Share link revoked',
      });
    } catch (error) {
      logger.error('Revoke share link error:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to revoke share link',
      });
    }
  }
);

export default router;
