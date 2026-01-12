/**
 * Chat Tags Routes
 * Provides information about available chat tags
 * 
 * @module TagsRoutes
 */

import { Router, Request, Response } from 'express';
import { chatTags } from '../services/ChatTagsService.js';
import { clerkAuth, optionalClerkAuth } from '../middleware/clerkAuth.js';

const router = Router();

/**
 * GET /tags
 * Get all available chat tags (public)
 */
router.get('/', optionalClerkAuth, async (req: Request, res: Response) => {
  try {
    const tags = chatTags.getAvailableTags();

    res.json({
      success: true,
      data: {
        tags,
        count: tags.length,
      },
    });

  } catch (error) {
    res.status(500).json({ error: 'Failed to get tags' });
  }
});

/**
 * GET /tags/help
 * Get formatted help message for tags
 */
router.get('/help', optionalClerkAuth, async (req: Request, res: Response) => {
  try {
    const helpMessage = chatTags.getHelpMessage();

    res.json({
      success: true,
      data: {
        help: helpMessage,
      },
    });

  } catch (error) {
    res.status(500).json({ error: 'Failed to get help' });
  }
});

/**
 * POST /tags/detect
 * Detect tags in a message (for testing)
 */
router.post('/detect', clerkAuth, async (req: Request, res: Response) => {
  try {
    const { message } = req.body;

    if (!message) {
      return res.status(400).json({ error: 'Message is required' });
    }

    const detectedTag = chatTags.detectTags(message);

    res.json({
      success: true,
      data: {
        hasTag: detectedTag.type !== 'none',
        tag: detectedTag,
      },
    });

  } catch (error) {
    res.status(500).json({ error: 'Failed to detect tags' });
  }
});

export default router;
