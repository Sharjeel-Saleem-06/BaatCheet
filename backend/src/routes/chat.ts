import { Router, Request, Response } from 'express';
import { authenticate, chatLimiter, validate, schemas } from '../middleware/index.js';
import { chatService } from '../services/ChatService.js';
import { aiRouter } from '../services/AIRouter.js';
import { providerManager } from '../services/ProviderManager.js';
import { streamingService } from '../services/StreamingService.js';
import { visionService } from '../services/VisionService.js';
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
          error: 'Chat completion failed. Please try again.',
          code: 'CHAT_ERROR',
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
          error: 'Regeneration failed. Please try again.',
          code: 'REGENERATE_ERROR',
        });
      }
    }
  }
);

/**
 * GET /api/v1/chat/providers/health
 * Get comprehensive health status of all AI providers
 */
router.get('/providers/health', (_req: Request, res: Response): void => {
  try {
    const health = providerManager.getHealthStatus();
    const usage = aiRouter.getUsageStats();
    const activeConnections = streamingService.getActiveConnectionCount();
    const visionHealth = visionService.getHealth();

    // Calculate total capacity
    let totalCapacity = 0;
    let totalUsed = 0;
    Object.values(health).forEach((p) => {
      totalCapacity += p.totalCapacity;
      totalUsed += p.usedToday;
    });

    res.json({
      success: true,
      data: {
        status: 'healthy',
        providers: health,
        usage: {
          ...usage,
          totalCapacity,
          totalUsed,
          percentUsed: totalCapacity > 0 ? ((totalUsed / totalCapacity) * 100).toFixed(2) : 0,
        },
        services: {
          chat: providerManager.hasCapacity('groq') || providerManager.hasCapacity('openrouter'),
          vision: visionHealth.vision,
          ocr: visionHealth.ocr,
        },
        activeConnections,
        currentProvider: aiRouter.getCurrentProvider(),
        timestamp: new Date().toISOString(),
      },
    });
  } catch (error) {
    logger.error('Health check error:', error);
    res.status(500).json({
      success: false,
      error: 'Health check failed',
      code: 'HEALTH_CHECK_ERROR',
    });
  }
});

/**
 * GET /api/v1/chat/providers/:provider/keys
 * Get detailed key status for a specific provider
 */
router.get('/providers/:provider/keys', (_req: Request, res: Response): void => {
  try {
    const { provider } = _req.params;
    const validProviders = ['groq', 'openrouter', 'deepseek', 'huggingface', 'gemini'];
    
    if (!validProviders.includes(provider)) {
      res.status(400).json({
        success: false,
        error: `Invalid provider. Valid options: ${validProviders.join(', ')}`,
      });
      return;
    }

    const keyDetails = providerManager.getKeyDetails(provider as 'groq' | 'openrouter' | 'deepseek' | 'huggingface' | 'gemini');

    res.json({
      success: true,
      data: {
        provider,
        keys: keyDetails,
        summary: {
          total: keyDetails.length,
          available: keyDetails.filter(k => k.available).length,
          exhausted: keyDetails.filter(k => !k.available).length,
        },
      },
    });
  } catch (error) {
    logger.error('Get provider keys error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to get provider keys',
    });
  }
});

/**
 * GET /api/v1/chat/models
 * List available AI models by provider
 */
router.get('/models', (_req: Request, res: Response): void => {
  const models = {
    groq: [
      {
        id: 'llama-3.3-70b-versatile',
        name: 'Llama 3.3 70B Versatile',
        description: 'Most capable model, best for complex tasks',
        contextLength: 131072,
        isDefault: true,
      },
      {
        id: 'meta-llama/llama-4-scout-17b-16e-instruct',
        name: 'Llama 4 Scout 17B',
        description: 'Latest Llama 4, fast and efficient',
        contextLength: 131072,
      },
      {
        id: 'meta-llama/llama-4-maverick-17b-128e-instruct',
        name: 'Llama 4 Maverick 17B',
        description: 'Llama 4 with extended training',
        contextLength: 131072,
      },
      {
        id: 'groq/compound',
        name: 'Groq Compound',
        description: 'Multi-model compound AI system',
        contextLength: 131072,
      },
    ],
    openrouter: [
      {
        id: 'meta-llama/llama-3.2-3b-instruct:free',
        name: 'Llama 3.2 3B (Free)',
        description: 'Fast, free model for simple tasks',
        contextLength: 8192,
        isFree: true,
      },
      {
        id: 'google/gemini-2.0-flash-exp:free',
        name: 'Gemini 2.0 Flash (Free)',
        description: 'Google Gemini with vision support',
        contextLength: 32768,
        isFree: true,
        supportsVision: true,
      },
      {
        id: 'mistralai/mistral-7b-instruct:free',
        name: 'Mistral 7B (Free)',
        description: 'European AI model',
        contextLength: 8192,
        isFree: true,
      },
    ],
    gemini: [
      {
        id: 'gemini-1.5-flash',
        name: 'Gemini 1.5 Flash',
        description: 'Fast multimodal model with vision',
        contextLength: 1000000,
        supportsVision: true,
      },
      {
        id: 'gemini-1.5-pro',
        name: 'Gemini 1.5 Pro',
        description: 'Most capable Gemini model',
        contextLength: 2000000,
        supportsVision: true,
      },
    ],
    huggingface: [
      {
        id: 'microsoft/trocr-large-printed',
        name: 'TrOCR Large',
        description: 'OCR for printed text',
        task: 'ocr',
      },
      {
        id: 'Salesforce/blip-image-captioning-large',
        name: 'BLIP Image Captioning',
        description: 'Image description and captioning',
        task: 'vision',
      },
    ],
    deepseek: [
      {
        id: 'deepseek-chat',
        name: 'DeepSeek Chat',
        description: 'Conversational AI model',
        contextLength: 4096,
      },
    ],
  };

  res.json({
    success: true,
    data: models,
  });
});

/**
 * POST /api/v1/chat/test
 * Test all providers (admin only in production)
 */
router.post('/test', authenticate, async (_req: Request, res: Response): Promise<void> => {
  try {
    const results: Record<string, { success: boolean; latency?: number; error?: string }> = {};

    // Test Groq
    try {
      const start = Date.now();
      const groqResult = await aiRouter.chatCompletion(
        [{ role: 'user', content: 'Say "OK" only.' }],
        { maxTokens: 10 }
      );
      results.groq = { success: true, latency: Date.now() - start };
    } catch (error) {
      results.groq = { success: false, error: error instanceof Error ? error.message : 'Unknown error' };
    }

    // Test OpenRouter
    try {
      const keyData = providerManager.getNextKey('openrouter');
      if (keyData) {
        const start = Date.now();
        const response = await fetch('https://openrouter.ai/api/v1/chat/completions', {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${keyData.key}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            model: 'meta-llama/llama-3.2-3b-instruct:free',
            messages: [{ role: 'user', content: 'Say "OK" only.' }],
            max_tokens: 10,
          }),
        });
        results.openrouter = { success: response.ok, latency: Date.now() - start };
        if (!response.ok) {
          results.openrouter.error = await response.text();
        }
      } else {
        results.openrouter = { success: false, error: 'No keys available' };
      }
    } catch (error) {
      results.openrouter = { success: false, error: error instanceof Error ? error.message : 'Unknown error' };
    }

    // Test Gemini
    try {
      const keyData = providerManager.getNextKey('gemini');
      if (keyData) {
        const start = Date.now();
        const response = await fetch(
          `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${keyData.key}`,
          {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              contents: [{ parts: [{ text: 'Say "OK" only.' }] }],
            }),
          }
        );
        results.gemini = { success: response.ok, latency: Date.now() - start };
        if (!response.ok) {
          results.gemini.error = await response.text();
        }
      } else {
        results.gemini = { success: false, error: 'No keys available' };
      }
    } catch (error) {
      results.gemini = { success: false, error: error instanceof Error ? error.message : 'Unknown error' };
    }

    // Test Hugging Face (using new router endpoint)
    try {
      const keyData = providerManager.getNextKey('huggingface');
      if (keyData) {
        const start = Date.now();
        const response = await fetch(
          'https://router.huggingface.co/hf-inference/models/gpt2',
          {
            method: 'POST',
            headers: {
              'Authorization': `Bearer ${keyData.key}`,
              'Content-Type': 'application/json',
            },
            body: JSON.stringify({ inputs: 'Hello' }),
          }
        );
        results.huggingface = { success: response.ok, latency: Date.now() - start };
        if (!response.ok) {
          results.huggingface.error = await response.text();
        }
      } else {
        results.huggingface = { success: false, error: 'No keys available' };
      }
    } catch (error) {
      results.huggingface = { success: false, error: error instanceof Error ? error.message : 'Unknown error' };
    }

    const allPassed = Object.values(results).every(r => r.success);

    res.json({
      success: true,
      data: {
        allPassed,
        results,
        timestamp: new Date().toISOString(),
      },
    });
  } catch (error) {
    logger.error('Provider test error:', error);
    res.status(500).json({
      success: false,
      error: 'Provider test failed',
    });
  }
});

export default router;
