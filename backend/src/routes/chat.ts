import { Router, Request, Response } from 'express';
import { authenticate, chatLimiter, validate, schemas } from '../middleware/index.js';
import { chatService } from '../services/ChatService.js';
import { aiRouter } from '../services/AIRouter.js';
import { logger } from '../utils/logger.js';

const router = Router();

// ============================================
// Chat Routes
// ============================================

// POST /api/v1/chat/completions - Send message (streaming)
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
      
      // If headers already sent, we can't send JSON
      if (!res.headersSent) {
        res.status(500).json({
          success: false,
          error: 'Chat completion failed',
        });
      }
    }
  }
);

// POST /api/v1/chat/regenerate - Regenerate last response
router.post(
  '/regenerate',
  authenticate,
  chatLimiter,
  async (req: Request, res: Response): Promise<void> => {
    try {
      const { conversationId } = req.body;
      
      if (!conversationId) {
        res.status(400).json({
          success: false,
          error: 'conversationId is required',
        });
        return;
      }

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

// GET /api/v1/chat/providers/health - Check AI providers status
router.get('/providers/health', (_req: Request, res: Response): void => {
  try {
    const health = aiRouter.getProvidersHealth();
    const stats = aiRouter.getUsageStats();

    res.json({
      success: true,
      data: {
        providers: health,
        usage: stats,
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

// GET /api/v1/chat/models - List available models
router.get('/models', (_req: Request, res: Response): void => {
  // Available models from different providers
  const models = [
    {
      id: 'llama-3.1-70b-versatile',
      name: 'Llama 3.1 70B',
      provider: 'groq',
      description: 'Fast and powerful general-purpose model',
      contextLength: 8192,
      isDefault: true,
    },
    {
      id: 'llama-3.1-8b-instant',
      name: 'Llama 3.1 8B',
      provider: 'groq',
      description: 'Faster responses for simpler tasks',
      contextLength: 8192,
      isDefault: false,
    },
    {
      id: 'mixtral-8x7b-32768',
      name: 'Mixtral 8x7B',
      provider: 'groq',
      description: 'Mixture of experts model',
      contextLength: 32768,
      isDefault: false,
    },
    {
      id: 'gemma2-9b-it',
      name: 'Gemma 2 9B',
      provider: 'groq',
      description: 'Google Gemma model',
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
