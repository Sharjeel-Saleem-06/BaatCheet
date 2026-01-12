/**
 * Advanced Image Generation Routes
 * Full-featured image generation API with variations, batch, and suggestions
 * 
 * @module ImageGenRoutes
 */

import { Router, Request, Response } from 'express';
import { logger } from '../utils/logger.js';
import { imageGeneration } from '../services/ImageGenerationService.js';
import { clerkAuth } from '../middleware/clerkAuth.js';
import { createTieredRateLimiter } from '../middleware/advancedRateLimit.js';

const router = Router();

// Apply authentication to all routes
router.use(clerkAuth);

// Rate limiter for image generation (strict)
const imageGenRateLimiter = createTieredRateLimiter({
  endpoint: 'image-gen',
  limits: {
    free: 2,        // 2 per hour (allows retries)
    pro: 20,        // 20 per hour
    enterprise: 100, // 100 per hour
    window: 60 * 60 * 1000,
  },
});

// ============================================
// Main Generation Endpoints
// ============================================

/**
 * POST /image-gen/generate
 * Generate an image from a text prompt
 */
router.post('/generate', imageGenRateLimiter, async (req: Request, res: Response) => {
  try {
    const userId = req.user?.id;
    if (!userId) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    const { 
      prompt, 
      negativePrompt, 
      style,
      aspectRatio,
      width, 
      height, 
      model,
      seed,
      enhancePrompt = true
    } = req.body;

    // Validation
    if (!prompt || typeof prompt !== 'string') {
      return res.status(400).json({ error: 'Prompt is required' });
    }

    if (prompt.length < 3) {
      return res.status(400).json({ error: 'Prompt too short (min 3 characters)' });
    }

    if (prompt.length > 2000) {
      return res.status(400).json({ error: 'Prompt too long (max 2000 characters)' });
    }

    logger.info('Image generation requested', {
      userId,
      promptLength: prompt.length,
      style,
      model,
    });

    const result = await imageGeneration.generateImage(userId, {
      prompt,
      negativePrompt,
      style,
      aspectRatio,
      width: width ? Math.min(width, 1024) : undefined,
      height: height ? Math.min(height, 1024) : undefined,
      model,
      seed,
      enhancePrompt,
    });

    if (result.success) {
      res.json({
        success: true,
        data: {
          imageUrl: result.imageUrl,
          model: result.model,
          originalPrompt: result.originalPrompt,
          enhancedPrompt: result.enhancedPrompt,
          seed: result.seed,
          generationTime: result.generationTime,
          style: result.style,
          aspectRatio: result.aspectRatio,
        },
      });
    } else {
      res.status(400).json({
        success: false,
        error: result.error,
      });
    }

  } catch (error: any) {
    logger.error('Image generation failed:', error);
    res.status(500).json({ error: error.message || 'Image generation failed' });
  }
});

/**
 * POST /image-gen/variations/:imageId
 * Generate variations of an existing image
 */
router.post('/variations/:imageId', imageGenRateLimiter, async (req: Request, res: Response) => {
  try {
    const userId = req.user?.id;
    if (!userId) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    const { imageId } = req.params;
    const { numVariations = 3 } = req.body;

    if (numVariations < 1 || numVariations > 5) {
      return res.status(400).json({ error: 'Number of variations must be between 1 and 5' });
    }

    logger.info('Image variations requested', {
      userId,
      imageId,
      numVariations,
    });

    const variations = await imageGeneration.generateVariations(userId, imageId, numVariations);

    res.json({
      success: true,
      data: {
        variations: variations.map(v => ({
          success: v.success,
          imageUrl: v.imageUrl,
          seed: v.seed,
          error: v.error,
        })),
        totalGenerated: variations.filter(v => v.success).length,
      },
    });

  } catch (error: any) {
    logger.error('Image variations failed:', error);
    res.status(500).json({ error: error.message || 'Failed to generate variations' });
  }
});

/**
 * POST /image-gen/batch
 * Batch generate multiple images (Pro users only)
 */
router.post('/batch', imageGenRateLimiter, async (req: Request, res: Response) => {
  try {
    const userId = req.user?.id;
    if (!userId) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    const { prompts, style, aspectRatio, model } = req.body;

    if (!Array.isArray(prompts) || prompts.length === 0) {
      return res.status(400).json({ error: 'Prompts array is required' });
    }

    if (prompts.length > 10) {
      return res.status(400).json({ error: 'Maximum 10 prompts per batch' });
    }

    logger.info('Batch generation requested', {
      userId,
      promptCount: prompts.length,
    });

    const result = await imageGeneration.batchGenerate(userId, prompts, {
      style,
      aspectRatio,
      model,
    });

    res.json({
      success: result.success,
      data: result,
    });

  } catch (error: any) {
    logger.error('Batch generation failed:', error);
    res.status(500).json({ error: error.message || 'Batch generation failed' });
  }
});

// ============================================
// Enhancement & Suggestions
// ============================================

/**
 * POST /image-gen/enhance-prompt
 * Enhance a prompt using AI
 */
router.post('/enhance-prompt', async (req: Request, res: Response) => {
  try {
    const { prompt, style } = req.body;

    if (!prompt || typeof prompt !== 'string') {
      return res.status(400).json({ error: 'Prompt is required' });
    }

    const enhancedPrompt = await imageGeneration.enhancePrompt(prompt, style);

    res.json({
      success: true,
      data: {
        original: prompt,
        enhanced: enhancedPrompt,
      },
    });

  } catch (error: any) {
    logger.error('Prompt enhancement failed:', error);
    res.status(500).json({ error: 'Failed to enhance prompt' });
  }
});

/**
 * POST /image-gen/suggestions
 * Get AI-powered suggestions to improve a prompt
 */
router.post('/suggestions', async (req: Request, res: Response) => {
  try {
    const { prompt } = req.body;

    if (!prompt || typeof prompt !== 'string') {
      return res.status(400).json({ error: 'Prompt is required' });
    }

    const suggestions = await imageGeneration.getSuggestions(prompt);

    res.json({
      success: true,
      data: {
        original: prompt,
        suggestions,
      },
    });

  } catch (error: any) {
    logger.error('Get suggestions failed:', error);
    res.status(500).json({ error: 'Failed to get suggestions' });
  }
});

// ============================================
// Status & Info Endpoints
// ============================================

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
        dailyLimit: status.dailyLimit,
        usedToday: status.usedToday,
        nextAvailableAt: status.nextAvailableAt,
        totalGenerated: status.totalGenerated,
        tier: status.tier,
      },
    });

  } catch (error: any) {
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
    const serviceStatus = imageGeneration.getStatus();

    res.json({
      success: true,
      data: {
        available: serviceStatus.available,
        models,
      },
    });

  } catch (error: any) {
    logger.error('Failed to get models:', error);
    res.status(500).json({ error: 'Failed to get models' });
  }
});

/**
 * GET /image-gen/styles
 * Get available style presets
 */
router.get('/styles', async (req: Request, res: Response) => {
  try {
    const styles = imageGeneration.getAvailableStyles();

    res.json({
      success: true,
      data: {
        styles,
        count: styles.length,
      },
    });

  } catch (error: any) {
    logger.error('Failed to get styles:', error);
    res.status(500).json({ error: 'Failed to get styles' });
  }
});

/**
 * GET /image-gen/aspect-ratios
 * Get available aspect ratios
 */
router.get('/aspect-ratios', async (req: Request, res: Response) => {
  try {
    const aspectRatios = imageGeneration.getAvailableAspectRatios();

    res.json({
      success: true,
      data: {
        aspectRatios,
      },
    });

  } catch (error: any) {
    logger.error('Failed to get aspect ratios:', error);
    res.status(500).json({ error: 'Failed to get aspect ratios' });
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

    const limit = Math.min(parseInt(req.query.limit as string) || 20, 100);
    const offset = parseInt(req.query.offset as string) || 0;

    const history = await imageGeneration.getUserHistory(userId, limit, offset);

    res.json({
      success: true,
      data: {
        images: history,
        count: history.length,
        limit,
        offset,
      },
    });

  } catch (error: any) {
    logger.error('Failed to get history:', error);
    res.status(500).json({ error: 'Failed to get history' });
  }
});

/**
 * GET /image-gen/service-status
 * Get overall service status
 */
router.get('/service-status', async (req: Request, res: Response) => {
  try {
    const status = imageGeneration.getStatus();

    res.json({
      success: true,
      data: status,
    });

  } catch (error: any) {
    logger.error('Failed to get service status:', error);
    res.status(500).json({ error: 'Failed to get service status' });
  }
});

export default router;
