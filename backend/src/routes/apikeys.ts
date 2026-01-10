/**
 * API Key Routes
 * API endpoints for user API key management
 * 
 * @module Routes/ApiKeys
 */

import { Router, Request, Response } from 'express';
import { clerkAuth } from '../middleware/index.js';
import { apiKeyService } from '../services/ApiKeyService.js';
import { logger } from '../utils/logger.js';

const router = Router();

// ============================================
// API Key Routes
// ============================================

/**
 * GET /api/v1/api-keys
 * List user's API keys
 */
router.get(
  '/',
  clerkAuth,
  async (req: Request, res: Response): Promise<void> => {
    try {
      const userId = req.user!.id;
      const keys = await apiKeyService.getUserApiKeys(userId);

      res.json({
        success: true,
        data: keys,
      });
    } catch (error) {
      logger.error('List API keys error:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to list API keys',
      });
    }
  }
);

/**
 * POST /api/v1/api-keys
 * Create a new API key
 */
router.post(
  '/',
  clerkAuth,
  async (req: Request, res: Response): Promise<void> => {
    try {
      const userId = req.user!.id;
      const { name, permissions, rateLimit, expiresInDays } = req.body;

      if (!name) {
        res.status(400).json({
          success: false,
          error: 'Name is required',
        });
        return;
      }

      const result = await apiKeyService.createApiKey(userId, name, {
        permissions,
        rateLimit,
        expiresInDays,
      });

      if (!result.success) {
        res.status(400).json({
          success: false,
          error: result.error,
        });
        return;
      }

      res.status(201).json({
        success: true,
        data: {
          key: result.apiKey, // Only shown once!
          ...result.keyInfo,
        },
        message: 'API key created. Save it now - it won\'t be shown again!',
      });
    } catch (error) {
      logger.error('Create API key error:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to create API key',
      });
    }
  }
);

/**
 * GET /api/v1/api-keys/:id
 * Get API key details (not the key itself)
 */
router.get(
  '/:id',
  clerkAuth,
  async (req: Request, res: Response): Promise<void> => {
    try {
      const userId = req.user!.id;
      const { id } = req.params;

      const keys = await apiKeyService.getUserApiKeys(userId);
      const key = keys.find((k) => k.id === id);

      if (!key) {
        res.status(404).json({
          success: false,
          error: 'API key not found',
        });
        return;
      }

      res.json({
        success: true,
        data: key,
      });
    } catch (error) {
      logger.error('Get API key error:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to get API key',
      });
    }
  }
);

/**
 * PUT /api/v1/api-keys/:id
 * Update API key settings
 */
router.put(
  '/:id',
  clerkAuth,
  async (req: Request, res: Response): Promise<void> => {
    try {
      const userId = req.user!.id;
      const { id } = req.params;
      const { name, permissions, rateLimit, isActive } = req.body;

      const result = await apiKeyService.updateApiKey(id, userId, {
        name,
        permissions,
        rateLimit,
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
        message: 'API key updated',
      });
    } catch (error) {
      logger.error('Update API key error:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to update API key',
      });
    }
  }
);

/**
 * DELETE /api/v1/api-keys/:id
 * Revoke API key
 */
router.delete(
  '/:id',
  clerkAuth,
  async (req: Request, res: Response): Promise<void> => {
    try {
      const userId = req.user!.id;
      const { id } = req.params;

      const revoked = await apiKeyService.revokeApiKey(id, userId);

      if (!revoked) {
        res.status(404).json({
          success: false,
          error: 'API key not found',
        });
        return;
      }

      res.json({
        success: true,
        message: 'API key revoked',
      });
    } catch (error) {
      logger.error('Revoke API key error:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to revoke API key',
      });
    }
  }
);

/**
 * POST /api/v1/api-keys/:id/rotate
 * Rotate API key (create new, revoke old)
 */
router.post(
  '/:id/rotate',
  clerkAuth,
  async (req: Request, res: Response): Promise<void> => {
    try {
      const userId = req.user!.id;
      const { id } = req.params;

      const result = await apiKeyService.rotateApiKey(id, userId);

      if (!result.success) {
        res.status(400).json({
          success: false,
          error: result.error,
        });
        return;
      }

      res.json({
        success: true,
        data: {
          newKey: result.newKey,
        },
        message: 'API key rotated. Save the new key - it won\'t be shown again!',
      });
    } catch (error) {
      logger.error('Rotate API key error:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to rotate API key',
      });
    }
  }
);

/**
 * GET /api/v1/api-keys/:id/usage
 * Get API key usage statistics
 */
router.get(
  '/:id/usage',
  clerkAuth,
  async (req: Request, res: Response): Promise<void> => {
    try {
      const userId = req.user!.id;
      const { id } = req.params;

      const stats = await apiKeyService.getKeyUsageStats(id, userId);

      if (!stats) {
        res.status(404).json({
          success: false,
          error: 'API key not found',
        });
        return;
      }

      res.json({
        success: true,
        data: stats,
      });
    } catch (error) {
      logger.error('Get API key usage error:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to get usage statistics',
      });
    }
  }
);

export default router;
