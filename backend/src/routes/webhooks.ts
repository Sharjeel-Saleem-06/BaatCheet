/**
 * Webhook Routes
 * API endpoints for webhook management
 * 
 * @module Routes/Webhooks
 */

import { Router, Request, Response } from 'express';
import { authenticate } from '../middleware/index.js';
import { webhookService, WebhookEvent } from '../services/WebhookService.js';
import { logger } from '../utils/logger.js';

const router = Router();

// ============================================
// Webhook Routes
// ============================================

/**
 * GET /api/v1/webhooks
 * List user's webhooks
 */
router.get(
  '/',
  authenticate,
  async (req: Request, res: Response): Promise<void> => {
    try {
      const userId = req.user!.userId;
      const webhooks = await webhookService.getUserWebhooks(userId);

      res.json({
        success: true,
        data: webhooks,
      });
    } catch (error) {
      logger.error('List webhooks error:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to list webhooks',
      });
    }
  }
);

/**
 * GET /api/v1/webhooks/events
 * Get available webhook events
 */
router.get(
  '/events',
  (_req: Request, res: Response): void => {
    const events = webhookService.getAvailableEvents();

    res.json({
      success: true,
      data: events.map((e) => ({
        event: e,
        description: getEventDescription(e),
      })),
    });
  }
);

/**
 * POST /api/v1/webhooks
 * Create a new webhook
 */
router.post(
  '/',
  authenticate,
  async (req: Request, res: Response): Promise<void> => {
    try {
      const userId = req.user!.userId;
      const { url, events } = req.body;

      if (!url || !events || !Array.isArray(events) || events.length === 0) {
        res.status(400).json({
          success: false,
          error: 'URL and events array are required',
        });
        return;
      }

      const result = await webhookService.createWebhook(userId, url, events);

      if (!result.success) {
        res.status(400).json({
          success: false,
          error: result.error,
        });
        return;
      }

      res.status(201).json({
        success: true,
        data: result.webhook,
        message: 'Webhook created. Save the secret - it won\'t be shown again!',
      });
    } catch (error) {
      logger.error('Create webhook error:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to create webhook',
      });
    }
  }
);

/**
 * GET /api/v1/webhooks/:id
 * Get webhook details
 */
router.get(
  '/:id',
  authenticate,
  async (req: Request, res: Response): Promise<void> => {
    try {
      const userId = req.user!.userId;
      const { id } = req.params;

      const webhooks = await webhookService.getUserWebhooks(userId);
      const webhook = webhooks.find((w) => w.id === id);

      if (!webhook) {
        res.status(404).json({
          success: false,
          error: 'Webhook not found',
        });
        return;
      }

      res.json({
        success: true,
        data: webhook,
      });
    } catch (error) {
      logger.error('Get webhook error:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to get webhook',
      });
    }
  }
);

/**
 * PUT /api/v1/webhooks/:id
 * Update webhook
 */
router.put(
  '/:id',
  authenticate,
  async (req: Request, res: Response): Promise<void> => {
    try {
      const userId = req.user!.userId;
      const { id } = req.params;
      const { url, events, isActive } = req.body;

      const result = await webhookService.updateWebhook(id, userId, {
        url,
        events,
        isActive,
      });

      if (!result.success) {
        res.status(400).json({
          success: false,
          error: result.error,
        });
        return;
      }

      res.json({
        success: true,
        message: 'Webhook updated',
      });
    } catch (error) {
      logger.error('Update webhook error:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to update webhook',
      });
    }
  }
);

/**
 * DELETE /api/v1/webhooks/:id
 * Delete webhook
 */
router.delete(
  '/:id',
  authenticate,
  async (req: Request, res: Response): Promise<void> => {
    try {
      const userId = req.user!.userId;
      const { id } = req.params;

      const deleted = await webhookService.deleteWebhook(id, userId);

      if (!deleted) {
        res.status(404).json({
          success: false,
          error: 'Webhook not found',
        });
        return;
      }

      res.json({
        success: true,
        message: 'Webhook deleted',
      });
    } catch (error) {
      logger.error('Delete webhook error:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to delete webhook',
      });
    }
  }
);

/**
 * POST /api/v1/webhooks/:id/test
 * Send test webhook
 */
router.post(
  '/:id/test',
  authenticate,
  async (req: Request, res: Response): Promise<void> => {
    try {
      const userId = req.user!.userId;
      const { id } = req.params;

      const result = await webhookService.sendTestWebhook(id, userId);

      if (!result.success) {
        res.status(400).json({
          success: false,
          error: result.error,
        });
        return;
      }

      res.json({
        success: true,
        message: 'Test webhook sent successfully',
      });
    } catch (error) {
      logger.error('Test webhook error:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to send test webhook',
      });
    }
  }
);

/**
 * GET /api/v1/webhooks/:id/deliveries
 * Get webhook delivery history
 */
router.get(
  '/:id/deliveries',
  authenticate,
  async (req: Request, res: Response): Promise<void> => {
    try {
      const userId = req.user!.userId;
      const { id } = req.params;
      const limit = parseInt(req.query.limit as string, 10) || 50;

      const deliveries = await webhookService.getDeliveryHistory(id, userId, limit);

      res.json({
        success: true,
        data: deliveries,
      });
    } catch (error) {
      logger.error('Get deliveries error:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to get delivery history',
      });
    }
  }
);

// ============================================
// Helper Functions
// ============================================

function getEventDescription(event: WebhookEvent): string {
  const descriptions: Record<WebhookEvent, string> = {
    'message.created': 'Triggered when a user sends a message',
    'message.completed': 'Triggered when AI finishes responding',
    'conversation.created': 'Triggered when a new conversation is created',
    'conversation.archived': 'Triggered when a conversation is archived',
    'image.uploaded': 'Triggered when an image is uploaded',
    'audio.transcribed': 'Triggered when audio is transcribed',
    'export.generated': 'Triggered when an export is generated',
  };

  return descriptions[event] || 'Unknown event';
}

export default router;
