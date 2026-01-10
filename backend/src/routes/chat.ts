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
    // Llama 4 Models (Latest)
    {
      id: 'meta-llama/llama-4-scout-17b-16e-instruct',
      name: 'Llama 4 Scout 17B',
      provider: 'groq',
      description: 'Latest Llama 4 model, fast and efficient',
      contextLength: 131072,
      isDefault: false,
    },
    {
      id: 'meta-llama/llama-4-maverick-17b-128e-instruct',
      name: 'Llama 4 Maverick 17B',
      provider: 'groq',
      description: 'Llama 4 with extended training',
      contextLength: 131072,
      isDefault: false,
    },
    // Llama 3.3 (Recommended)
    {
      id: 'llama-3.3-70b-versatile',
      name: 'Llama 3.3 70B Versatile',
      provider: 'groq',
      description: 'Most capable model, best for complex tasks',
      contextLength: 131072,
      isDefault: true,
    },
    // Compound Model
    {
      id: 'groq/compound',
      name: 'Groq Compound',
      provider: 'groq',
      description: 'Multi-model compound AI system',
      contextLength: 131072,
      isDefault: false,
    },
    // DeepSeek
    {
      id: 'deepseek-chat',
      name: 'DeepSeek Chat',
      provider: 'deepseek',
      description: 'DeepSeek conversational model',
      contextLength: 4096,
      isDefault: false,
    },
  ];

  res.json({
    success: true,
    data: models,
  });
});

export default router;
