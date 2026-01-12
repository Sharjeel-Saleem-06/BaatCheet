/**
 * Profile Routes
 * Endpoints for managing user profile and memory system
 * 
 * @module ProfileRoutes
 */

import { Router, Request, Response } from 'express';
import { logger } from '../utils/logger.js';
import { profileLearning } from '../services/ProfileLearningService.js';
import { prisma } from '../config/database.js';
import { clerkAuth } from '../middleware/clerkAuth.js';

const router = Router();

// Apply authentication to all profile routes
router.use(clerkAuth);

// ============================================
// Get User Profile & Facts
// ============================================

/**
 * GET /profile/me
 * Get the current user's profile and all learned facts
 */
router.get('/me', async (req: Request, res: Response) => {
  try {
    const userId = req.user?.id;
    if (!userId) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    // Get profile
    const profile = await prisma.userProfile.findUnique({
      where: { userId },
    });

    // Get all facts grouped by category
    const { facts, totalFacts } = await profileLearning.getUserFacts(userId);

    // Get profile stats
    const stats = await profileLearning.getProfileStats(userId);

    res.json({
      success: true,
      data: {
        profile,
        facts,
        totalFacts,
        stats,
      },
    });
  } catch (error) {
    logger.error('Failed to get profile:', error);
    res.status(500).json({ error: 'Failed to retrieve profile' });
  }
});

/**
 * GET /profile/stats
 * Get profile statistics
 */
router.get('/stats', async (req: Request, res: Response) => {
  try {
    const userId = req.user?.id;
    if (!userId) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    const stats = await profileLearning.getProfileStats(userId);

    res.json({
      success: true,
      data: stats,
    });
  } catch (error) {
    logger.error('Failed to get profile stats:', error);
    res.status(500).json({ error: 'Failed to retrieve profile stats' });
  }
});

// ============================================
// Fact Management
// ============================================

/**
 * DELETE /profile/facts/:factId
 * Delete a specific fact
 */
router.delete('/facts/:factId', async (req: Request, res: Response) => {
  try {
    const userId = req.user?.id;
    if (!userId) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    const { factId } = req.params;

    const success = await profileLearning.deleteFact(userId, factId);

    if (!success) {
      return res.status(404).json({ error: 'Fact not found' });
    }

    res.json({
      success: true,
      message: 'Fact deleted successfully',
    });
  } catch (error) {
    logger.error('Failed to delete fact:', error);
    res.status(500).json({ error: 'Failed to delete fact' });
  }
});

/**
 * POST /profile/teach
 * Explicitly teach the AI a fact about the user
 */
router.post('/teach', async (req: Request, res: Response) => {
  try {
    const userId = req.user?.id;
    if (!userId) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    const { category, type, key, value } = req.body;

    // Validate input
    if (!category || !type || !key || !value) {
      return res.status(400).json({
        error: 'Missing required fields: category, type, key, value',
      });
    }

    // Validate category
    const validCategories = ['personal', 'professional', 'preference', 'interest', 'goal', 'skill', 'relationship'];
    if (!validCategories.includes(category)) {
      return res.status(400).json({
        error: `Invalid category. Must be one of: ${validCategories.join(', ')}`,
      });
    }

    const success = await profileLearning.teachFact(userId, category, type, key, value);

    if (!success) {
      return res.status(500).json({ error: 'Failed to save fact' });
    }

    res.json({
      success: true,
      message: 'Fact saved successfully',
    });
  } catch (error) {
    logger.error('Failed to teach fact:', error);
    res.status(500).json({ error: 'Failed to teach fact' });
  }
});

/**
 * POST /profile/ask
 * Ask the AI what it knows about the user
 */
router.post('/ask', async (req: Request, res: Response) => {
  try {
    const userId = req.user?.id;
    if (!userId) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    const response = await profileLearning.askAboutProfile(userId);

    res.json({
      success: true,
      data: {
        message: response,
      },
    });
  } catch (error) {
    logger.error('Failed to ask about profile:', error);
    res.status(500).json({ error: 'Failed to retrieve profile information' });
  }
});

// ============================================
// Profile Settings
// ============================================

/**
 * PATCH /profile/settings
 * Update profile settings (communication preferences)
 */
router.patch('/settings', async (req: Request, res: Response) => {
  try {
    const userId = req.user?.id;
    if (!userId) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    const {
      preferredLanguage,
      communicationTone,
      responseStyle,
      primaryUseCase,
    } = req.body;

    // Validate inputs
    const validLanguages = ['auto', 'english', 'roman-urdu', 'mixed'];
    const validTones = ['professional', 'casual', 'friendly'];
    const validStyles = ['concise', 'balanced', 'comprehensive'];
    const validUseCases = ['coding', 'learning', 'business', 'creative', 'general'];

    if (preferredLanguage && !validLanguages.includes(preferredLanguage)) {
      return res.status(400).json({ error: `Invalid language. Must be one of: ${validLanguages.join(', ')}` });
    }
    if (communicationTone && !validTones.includes(communicationTone)) {
      return res.status(400).json({ error: `Invalid tone. Must be one of: ${validTones.join(', ')}` });
    }
    if (responseStyle && !validStyles.includes(responseStyle)) {
      return res.status(400).json({ error: `Invalid style. Must be one of: ${validStyles.join(', ')}` });
    }
    if (primaryUseCase && !validUseCases.includes(primaryUseCase)) {
      return res.status(400).json({ error: `Invalid use case. Must be one of: ${validUseCases.join(', ')}` });
    }

    const profile = await prisma.userProfile.upsert({
      where: { userId },
      update: {
        ...(preferredLanguage && { preferredLanguage }),
        ...(communicationTone && { communicationTone }),
        ...(responseStyle && { responseStyle }),
        ...(primaryUseCase && { primaryUseCase }),
      },
      create: {
        userId,
        preferredLanguage: preferredLanguage || 'auto',
        communicationTone: communicationTone || 'friendly',
        responseStyle: responseStyle || 'balanced',
        primaryUseCase: primaryUseCase || null,
      },
    });

    res.json({
      success: true,
      data: profile,
    });
  } catch (error) {
    logger.error('Failed to update profile settings:', error);
    res.status(500).json({ error: 'Failed to update settings' });
  }
});

// ============================================
// Conversation Summaries
// ============================================

/**
 * GET /profile/summaries
 * Get recent conversation summaries
 */
router.get('/summaries', async (req: Request, res: Response) => {
  try {
    const userId = req.user?.id;
    if (!userId) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    const limit = Math.min(parseInt(req.query.limit as string) || 10, 50);

    const summaries = await prisma.conversationSummary.findMany({
      where: { userId },
      orderBy: { timestamp: 'desc' },
      take: limit,
      include: {
        conversation: {
          select: {
            id: true,
            title: true,
            createdAt: true,
          },
        },
      },
    });

    res.json({
      success: true,
      data: {
        summaries,
        total: summaries.length,
      },
    });
  } catch (error) {
    logger.error('Failed to get summaries:', error);
    res.status(500).json({ error: 'Failed to retrieve summaries' });
  }
});

/**
 * POST /profile/summaries/:conversationId
 * Manually trigger summary generation for a conversation
 */
router.post('/summaries/:conversationId', async (req: Request, res: Response) => {
  try {
    const userId = req.user?.id;
    if (!userId) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    const { conversationId } = req.params;

    // Verify conversation belongs to user
    const conversation = await prisma.conversation.findFirst({
      where: { id: conversationId, userId },
    });

    if (!conversation) {
      return res.status(404).json({ error: 'Conversation not found' });
    }

    const summary = await profileLearning.generateConversationSummary(userId, conversationId);

    if (!summary) {
      return res.status(400).json({ error: 'Could not generate summary (conversation may be empty)' });
    }

    res.json({
      success: true,
      data: summary,
    });
  } catch (error) {
    logger.error('Failed to generate summary:', error);
    res.status(500).json({ error: 'Failed to generate summary' });
  }
});

// ============================================
// Clear Profile Data
// ============================================

/**
 * DELETE /profile/clear
 * Clear all learned facts (reset memory)
 */
router.delete('/clear', async (req: Request, res: Response) => {
  try {
    const userId = req.user?.id;
    if (!userId) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    const { confirm } = req.body;

    if (confirm !== 'DELETE_ALL_FACTS') {
      return res.status(400).json({
        error: 'Please confirm by sending { "confirm": "DELETE_ALL_FACTS" }',
      });
    }

    // Soft delete all facts
    await prisma.userFact.updateMany({
      where: { userId },
      data: { isActive: false },
    });

    // Reset fact count
    await prisma.userProfile.update({
      where: { userId },
      data: { factCount: 0 },
    });

    // Delete all summaries
    await prisma.conversationSummary.deleteMany({
      where: { userId },
    });

    logger.info('User profile cleared', { userId });

    res.json({
      success: true,
      message: 'All profile data has been cleared',
    });
  } catch (error) {
    logger.error('Failed to clear profile:', error);
    res.status(500).json({ error: 'Failed to clear profile data' });
  }
});

// ============================================
// Goal Management
// ============================================

/**
 * PATCH /profile/goals/:goalKey
 * Update goal status
 */
router.patch('/goals/:goalKey', async (req: Request, res: Response) => {
  try {
    const userId = req.user?.id;
    if (!userId) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    const { goalKey } = req.params;
    const { status, progress } = req.body;

    // Validate status
    const validStatuses = ['active', 'completed', 'abandoned'];
    if (status && !validStatuses.includes(status)) {
      return res.status(400).json({
        error: `Invalid status. Must be one of: ${validStatuses.join(', ')}`,
      });
    }

    await profileLearning.updateGoalStatus(userId, goalKey, status, progress);

    res.json({
      success: true,
      message: 'Goal updated successfully',
    });
  } catch (error) {
    logger.error('Failed to update goal:', error);
    res.status(500).json({ error: 'Failed to update goal' });
  }
});

// ============================================
// Interest Decay (Admin/Scheduled)
// ============================================

/**
 * POST /profile/decay-interests
 * Trigger interest decay (reduces confidence of old interests)
 */
router.post('/decay-interests', async (req: Request, res: Response) => {
  try {
    const userId = req.user?.id;
    if (!userId) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    const decayedCount = await profileLearning.decayOldInterests(userId);

    res.json({
      success: true,
      data: {
        decayedCount,
        message: `Decayed ${decayedCount} old interests`,
      },
    });
  } catch (error) {
    logger.error('Failed to decay interests:', error);
    res.status(500).json({ error: 'Failed to decay interests' });
  }
});

export default router;
