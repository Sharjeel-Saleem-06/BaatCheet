/**
 * Image Generation Routes
 * Handles AI image generation requests
 * 
 * @module ImageGenRoutes
 */

import { Router, Request, Response } from 'express';
import { logger } from '../utils/logger.js';
import { imageGeneration } from '../services/ImageGenerationService.js';
import { clerkAuth } from '../middleware/clerkAuth.js';
import { createTieredRateLimiter } from '../middleware/advancedRateLimit.js';

const router = Router();

// Apply authentication
router.use(clerkAuth);

// Custom rate limiter for image generation (very strict)
const imageGenRateLimiter = createTieredRateLimiter({
  endpoint: 'image-gen',
  limits: {
    free: 1,        // 1 per hour (but we also have daily limit)
    pro: 5,         // 5 per hour
    enterprise: 20, // 20 per hour
    window: 60 * 60 * 1000, // 1 hour
  },
});

router.use(imageGenRateLimiter);

/**
 * POST /image-gen/generate
 * Generate an image from a text prompt
 */
router.post('/generate', async (req: Request, res: Response) => {
  try {
    const userId = req.user?.id;
    if (!userId) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    const { prompt, negativePrompt, width, height, model } = req.body;

    if (!prompt || typeof prompt !== 'string') {
      return res.status(400).json({ error: 'Prompt is required' });
    }

    if (prompt.length < 5) {
      return res.status(400).json({ error: 'Prompt too short (min 5 characters)' });
    }

    if (prompt.length > 1000) {
      return res.status(400).json({ error: 'Prompt too long (max 1000 characters)' });
    }

    logger.info('Image generation requested', {
      userId,
      promptLength: prompt.length,
    });

    const result = await imageGeneration.generateImage(userId, {
      prompt,
      negativePrompt,
      width: Math.min(width || 512, 1024),
      height: Math.min(height || 512, 1024),
      model,
    });

    if (result.success) {
      res.json({
        success: true,
        data: {
          imageUrl: result.imageUrl,
          model: result.model,
          prompt: result.prompt,
          generationTime: result.generationTime,
        },
      });
    } else {
      res.status(400).json({
        success: false,
        error: result.error,
      });
    }

  } catch (error) {
    logger.error('Image generation failed:', error);
    res.status(500).json({ error: 'Image generation failed' });
  }
});

/**
 * GET /image-gen/status
 * Check user's generation status and limits
 */
router.get('/status', async (req: Request, res: Response) => {
  try {
    const userId = req.user?.id;
    if (!userId) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    const status = await imageGeneration.checkUserLimit(userId);

    res.json({
      success: true,
      data: {
        canGenerate: status.canGenerate,
        remainingToday: status.remainingGenerations,
        nextAvailableAt: status.nextAvailableAt,
        totalGenerated: status.totalGenerated,
      },
    });

  } catch (error) {
    logger.error('Failed to get generation status:', error);
    res.status(500).json({ error: 'Failed to get status' });
  }
});

/**
 * GET /image-gen/models
 * Get available image generation models
 */
router.get('/models', async (req: Request, res: Response) => {
  try {
    const models = imageGeneration.getAvailableModels();
    const isAvailable = imageGeneration.isAvailable();

    res.json({
      success: true,
      data: {
        available: isAvailable,
        models,
      },
    });

  } catch (error) {
    logger.error('Failed to get models:', error);
    res.status(500).json({ error: 'Failed to get models' });
  }
});

/**
 * GET /image-gen/history
 * Get user's image generation history
 */
router.get('/history', async (req: Request, res: Response) => {
  try {
    const userId = req.user?.id;
    if (!userId) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    const limit = Math.min(parseInt(req.query.limit as string) || 10, 50);
    const history = await imageGeneration.getUserHistory(userId, limit);

    res.json({
      success: true,
      data: history,
    });

  } catch (error) {
    logger.error('Failed to get history:', error);
    res.status(500).json({ error: 'Failed to get history' });
  }
});

export default router;
