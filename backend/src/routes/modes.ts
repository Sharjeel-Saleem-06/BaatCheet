/**
 * AI Modes Routes
 * Provides mode information and detection
 * 
 * @module ModesRoutes
 */

import { Router, Request, Response } from 'express';
import { modeDetector, AIMode, MODE_CONFIGS } from '../services/ModeDetectorService.js';
import { getModeSystemPrompt } from '../config/modePrompts.js';
import { clerkAuth, optionalClerkAuth } from '../middleware/clerkAuth.js';

const router = Router();

/**
 * GET /modes
 * Get all available AI modes
 */
router.get('/', optionalClerkAuth, async (req: Request, res: Response) => {
  try {
    const modes = modeDetector.getAllModes();

    res.json({
      success: true,
      data: {
        modes: modes.map(mode => ({
          id: mode.mode,
          name: mode.displayName,
          icon: mode.icon,
          description: mode.description,
          capabilities: mode.capabilities,
          requiresSpecialAPI: mode.requiresSpecialAPI,
          dailyLimits: mode.dailyLimits,
        })),
        count: modes.length,
      },
    });

  } catch (error) {
    res.status(500).json({ error: 'Failed to get modes' });
  }
});

/**
 * GET /modes/:modeId
 * Get specific mode details
 */
router.get('/:modeId', optionalClerkAuth, async (req: Request, res: Response) => {
  try {
    const { modeId } = req.params;
    
    if (!Object.values(AIMode).includes(modeId as AIMode)) {
      return res.status(404).json({ error: 'Mode not found' });
    }

    const config = modeDetector.getModeConfig(modeId as AIMode);

    res.json({
      success: true,
      data: {
        id: config.mode,
        name: config.displayName,
        icon: config.icon,
        description: config.description,
        capabilities: config.capabilities,
        requiresSpecialAPI: config.requiresSpecialAPI,
        dailyLimits: config.dailyLimits,
        temperature: config.temperature,
        maxTokens: config.maxTokens,
      },
    });

  } catch (error) {
    res.status(500).json({ error: 'Failed to get mode details' });
  }
});

/**
 * POST /modes/detect
 * Detect the appropriate mode for a message
 */
router.post('/detect', clerkAuth, async (req: Request, res: Response) => {
  try {
    const { message, attachments } = req.body;

    if (!message) {
      return res.status(400).json({ error: 'Message is required' });
    }

    const result = modeDetector.detectMode(message, attachments);

    res.json({
      success: true,
      data: {
        detectedMode: result.mode,
        confidence: result.confidence,
        detectedKeywords: result.detectedKeywords,
        suggestedModes: result.suggestedModes,
        modeConfig: modeDetector.getModeConfig(result.mode),
      },
    });

  } catch (error) {
    res.status(500).json({ error: 'Failed to detect mode' });
  }
});

/**
 * GET /modes/categories
 * Get modes organized by category
 */
router.get('/info/categories', optionalClerkAuth, async (req: Request, res: Response) => {
  try {
    const categories = {
      core: [
        AIMode.CHAT,
        AIMode.IMAGE_GEN,
        AIMode.VISION,
        AIMode.WEB_SEARCH,
      ],
      specialized: [
        AIMode.CODE,
        AIMode.DEBUG,
        AIMode.DATA_ANALYSIS,
        AIMode.MATH,
      ],
      creative: [
        AIMode.CREATIVE,
        AIMode.TRANSLATE,
        AIMode.SUMMARIZE,
        AIMode.EXPLAIN,
      ],
      advanced: [
        AIMode.RESEARCH,
        AIMode.TUTOR,
        AIMode.BUSINESS,
      ],
    };

    const categorizedModes: Record<string, any[]> = {};

    for (const [category, modeIds] of Object.entries(categories)) {
      categorizedModes[category] = modeIds.map(modeId => {
        const config = MODE_CONFIGS[modeId];
        return {
          id: config.mode,
          name: config.displayName,
          icon: config.icon,
          description: config.description,
        };
      });
    }

    res.json({
      success: true,
      data: {
        categories: categorizedModes,
      },
    });

  } catch (error) {
    res.status(500).json({ error: 'Failed to get categories' });
  }
});

/**
 * GET /modes/limits
 * Get mode limits for current user
 */
router.get('/info/limits', clerkAuth, async (req: Request, res: Response) => {
  try {
    const userId = req.user?.id;
    if (!userId) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    // Get user tier (would come from database in production)
    const userTier = 'free'; // Default to free

    const limits: Record<string, number> = {};
    
    for (const [modeId, config] of Object.entries(MODE_CONFIGS)) {
      limits[modeId] = config.dailyLimits[userTier as keyof typeof config.dailyLimits];
    }

    res.json({
      success: true,
      data: {
        tier: userTier,
        limits,
      },
    });

  } catch (error) {
    res.status(500).json({ error: 'Failed to get limits' });
  }
});

export default router;
