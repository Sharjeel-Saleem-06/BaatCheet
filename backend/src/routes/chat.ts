import { Router, Request, Response } from 'express';
import { authenticate, chatLimiter, validate, schemas } from '../middleware/index.js';
import { chatService } from '../services/ChatService.js';
import { aiRouter } from '../services/AIRouter.js';
import { streamingService } from '../services/StreamingService.js';
import { logger } from '../utils/logger.js';

const router = Router();

// ============================================
// Chat Routes
// ============================================

/**
 * POST /api/v1/chat/completions
 * Send a chat message and receive streaming response
 */
router.post(
  '/completions',
  authenticate,
  chatLimiter,
  validate(schemas.chatMessage),
  async (req: Request, res: Response): Promise<void> => {
    try {
      const userId = req.user!.userId;
      await chatService.streamChat(userId, req.body, res);
    } catch (error) {
      logger.error('Chat completion error:', error);

      if (!res.headersSent) {
        res.status(500).json({
          success: false,
          error: 'Chat completion failed',
        });
      }
    }
  }
);

/**
 * POST /api/v1/chat/regenerate
 * Regenerate the last assistant response
 */
router.post(
  '/regenerate',
  authenticate,
  chatLimiter,
  validate(schemas.regenerate),
  async (req: Request, res: Response): Promise<void> => {
    try {
      const { conversationId } = req.body;
      const userId = req.user!.userId;

      await chatService.regenerateResponse(userId, conversationId, res);
    } catch (error) {
      logger.error('Regenerate error:', error);

      if (!res.headersSent) {
        res.status(500).json({
          success: false,
          error: 'Regeneration failed',
        });
      }
    }
  }
);

/**
 * GET /api/v1/chat/providers/health
 * Get health status of all AI providers
 */
router.get('/providers/health', (_req: Request, res: Response): void => {
  try {
    const health = aiRouter.getProvidersHealth();
    const usage = aiRouter.getUsageStats();
    const activeConnections = streamingService.getActiveConnectionCount();

    res.json({
      success: true,
      data: {
        providers: health,
        usage,
        activeConnections,
        currentProvider: aiRouter.getCurrentProvider(),
      },
    });
  } catch (error) {
    logger.error('Health check error:', error);
    res.status(500).json({
      success: false,
      error: 'Health check failed',
    });
  }
});

/**
 * GET /api/v1/chat/models
 * List available AI models
 */
router.get('/models', (_req: Request, res: Response): void => {
  const models = [
    {
      id: 'llama-3.1-70b-versatile',
      name: 'Llama 3.1 70B Versatile',
      provider: 'groq',
      description: 'Most capable model, best for complex tasks',
      contextLength: 8192,
      isDefault: true,
    },
    {
      id: 'llama-3.1-8b-instant',
      name: 'Llama 3.1 8B Instant',
      provider: 'groq',
      description: 'Fastest model for quick responses',
      contextLength: 8192,
      isDefault: false,
    },
    {
      id: 'llama-3.2-90b-vision-preview',
      name: 'Llama 3.2 90B Vision',
      provider: 'groq',
      description: 'Vision-capable model for image analysis',
      contextLength: 8192,
      isDefault: false,
      supportsVision: true,
    },
    {
      id: 'mixtral-8x7b-32768',
      name: 'Mixtral 8x7B',
      provider: 'groq',
      description: 'Mixture of experts with long context',
      contextLength: 32768,
      isDefault: false,
    },
    {
      id: 'gemma2-9b-it',
      name: 'Gemma 2 9B',
      provider: 'groq',
      description: 'Google Gemma model, efficient and fast',
      contextLength: 8192,
      isDefault: false,
    },
  ];

  res.json({
    success: true,
    data: models,
  });
});

export default router;
