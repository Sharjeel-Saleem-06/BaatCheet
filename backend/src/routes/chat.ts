/**
 * Chat Routes
 * API endpoints for chat, streaming, providers, and models
 * 
 * @module Routes/Chat
 */

import { Router, Request, Response } from 'express';
import { authenticate, chatLimiter, validate, schemas } from '../middleware/index.js';
import { chatService } from '../services/ChatService.js';
import { aiRouter, MODELS } from '../services/AIRouter.js';
import { providerManager, ProviderType } from '../services/ProviderManager.js';
import { visionService } from '../services/VisionService.js';
import { ocrService } from '../services/OCRService.js';
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
      const { message, conversationId, model, systemPrompt, stream = true } = req.body;

      if (stream) {
        await chatService.streamMessage(res, message, {
          userId,
          conversationId,
          model,
          systemPrompt,
        });
      } else {
        const result = await chatService.processMessage(message, {
          userId,
          conversationId,
          model,
          systemPrompt,
        });

        res.json({
          success: result.success,
          data: result.success ? {
            message: result.message,
            conversationId: result.conversationId,
            model: result.model,
            provider: result.provider,
            tokens: result.tokens,
          } : undefined,
          error: result.error,
        });
      }
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
      const { conversationId, model, temperature } = req.body;
      const userId = req.user!.userId;

      const result = await chatService.regenerateResponse(conversationId, userId, {
        model,
        temperature,
      });

      res.json({
        success: result.success,
        data: result.success ? {
          message: result.message,
          conversationId: result.conversationId,
          model: result.model,
          provider: result.provider,
          tokens: result.tokens,
        } : undefined,
        error: result.error,
      });
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

// ============================================
// Vision & OCR Routes
// ============================================

/**
 * POST /api/v1/chat/vision/analyze
 * Analyze an image with custom prompt
 */
router.post(
  '/vision/analyze',
  authenticate,
  chatLimiter,
  async (req: Request, res: Response): Promise<void> => {
    try {
      const { image, mimeType = 'image/png', prompt, language = 'en' } = req.body;

      if (!image || !prompt) {
        res.status(400).json({
          success: false,
          error: 'Image and prompt are required',
        });
        return;
      }

      const result = await visionService.analyzeImage(image, mimeType, prompt, { language });

      res.json({
        success: result.success,
        data: result.success ? {
          response: result.response,
          provider: result.provider,
          model: result.model,
          processingTime: result.processingTime,
        } : undefined,
        error: result.error,
      });
    } catch (error) {
      logger.error('Vision analyze error:', error);
      res.status(500).json({
        success: false,
        error: 'Image analysis failed',
        code: 'VISION_ERROR',
      });
    }
  }
);

/**
 * POST /api/v1/chat/ocr/extract
 * Extract text from an image using OCR
 */
router.post(
  '/ocr/extract',
  authenticate,
  chatLimiter,
  async (req: Request, res: Response): Promise<void> => {
    try {
      const { image, mimeType = 'image/png', language = 'eng', isTable = false } = req.body;

      if (!image) {
        res.status(400).json({
          success: false,
          error: 'Image is required',
        });
        return;
      }

      const result = await ocrService.extractText(image, mimeType, {
        language,
        isTable,
        scale: true,
        detectOrientation: true,
      });

      res.json({
        success: result.success,
        data: result.success ? {
          text: result.text,
          provider: result.provider,
          confidence: result.confidence,
          language: result.language,
          processingTime: result.processingTime,
        } : undefined,
        error: result.error,
      });
    } catch (error) {
      logger.error('OCR extract error:', error);
      res.status(500).json({
        success: false,
        error: 'OCR extraction failed',
        code: 'OCR_ERROR',
      });
    }
  }
);

/**
 * POST /api/v1/chat/ocr/process
 * Extract text from image and process with AI
 */
router.post(
  '/ocr/process',
  authenticate,
  chatLimiter,
  async (req: Request, res: Response): Promise<void> => {
    try {
      const { image, mimeType = 'image/png', instruction, language = 'eng' } = req.body;

      if (!image || !instruction) {
        res.status(400).json({
          success: false,
          error: 'Image and instruction are required',
        });
        return;
      }

      const result = await ocrService.extractAndProcess(image, mimeType, instruction, { language });

      res.json({
        success: result.success,
        data: result.success ? {
          extractedText: result.extractedText,
          processedResult: result.processedResult,
          provider: result.provider,
        } : undefined,
        error: result.error,
      });
    } catch (error) {
      logger.error('OCR process error:', error);
      res.status(500).json({
        success: false,
        error: 'OCR processing failed',
        code: 'OCR_PROCESS_ERROR',
      });
    }
  }
);

// ============================================
// Provider Health & Models Routes
// ============================================

/**
 * GET /api/v1/chat/providers/health
 * Get comprehensive health status of all AI providers
 */
router.get('/providers/health', (_req: Request, res: Response): void => {
  try {
    const health = providerManager.getHealthStatus();
    const summary = providerManager.getSummary();
    const visionHealth = visionService.getHealth();
    const ocrHealth = ocrService.getHealth();

    res.json({
      success: true,
      data: {
        status: summary.activeProviders > 0 ? 'healthy' : 'degraded',
        providers: health,
        summary: {
          ...summary,
          percentUsed: summary.totalCapacity > 0 
            ? ((summary.totalUsed / summary.totalCapacity) * 100).toFixed(2) 
            : 0,
        },
        services: {
          chat: providerManager.hasCapacity('groq') || providerManager.hasCapacity('openrouter'),
          vision: visionHealth.available,
          ocr: ocrHealth.available,
        },
        visionProviders: visionHealth.providers,
        ocrProviders: ocrHealth.providers,
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
router.get('/providers/:provider/keys', (req: Request, res: Response): void => {
  try {
    const { provider } = req.params;
    const validProviders: ProviderType[] = ['groq', 'openrouter', 'deepseek', 'huggingface', 'gemini', 'ocrspace'];

    if (!validProviders.includes(provider as ProviderType)) {
      res.status(400).json({
        success: false,
        error: `Invalid provider. Valid options: ${validProviders.join(', ')}`,
      });
      return;
    }

    const keyDetails = providerManager.getKeyDetails(provider as ProviderType);

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
  try {
    const models = aiRouter.getAvailableModels();
    const ocrLanguages = ocrService.getSupportedLanguages();

    // Group by provider
    const grouped: Record<string, typeof models> = {};
    for (const model of models) {
      if (!grouped[model.provider]) {
        grouped[model.provider] = [];
      }
      grouped[model.provider].push(model);
    }

    res.json({
      success: true,
      data: {
        models: grouped,
        total: models.length,
        available: models.filter(m => m.available).length,
        ocrLanguages,
      },
    });
  } catch (error) {
    logger.error('Get models error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to get models',
    });
  }
});

/**
 * POST /api/v1/chat/test
 * Test all providers
 */
router.post('/test', authenticate, async (req: Request, res: Response): Promise<void> => {
  try {
    const results: Record<string, { success: boolean; latency?: number; error?: string }> = {};

    // Test Groq
    try {
      const start = Date.now();
      const response = await aiRouter.chat({
        messages: [{ role: 'user', content: 'Say "OK" only.' }],
        maxTokens: 10,
      });
      results.groq = { 
        success: response.success && response.provider === 'groq', 
        latency: Date.now() - start,
        error: response.error,
      };
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
            model: 'meta-llama/llama-3.1-70b-instruct:free',
            messages: [{ role: 'user', content: 'Say "OK" only.' }],
            max_tokens: 10,
          }),
        });
        results.openrouter = { success: response.ok, latency: Date.now() - start };
        if (!response.ok) {
          results.openrouter.error = await response.text();
        } else {
          providerManager.markKeySuccess('openrouter', keyData.index);
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
        } else {
          providerManager.markKeySuccess('gemini', keyData.index);
        }
      } else {
        results.gemini = { success: false, error: 'No keys available' };
      }
    } catch (error) {
      results.gemini = { success: false, error: error instanceof Error ? error.message : 'Unknown error' };
    }

    // Test OCR.space
    try {
      const keyData = providerManager.getNextKey('ocrspace');
      if (keyData) {
        const start = Date.now();
        // Simple API check
        const response = await fetch('https://api.ocr.space/parse/image', {
          method: 'POST',
          headers: { 'apikey': keyData.key },
          body: new URLSearchParams({
            url: 'https://via.placeholder.com/100x100.png?text=Test',
            language: 'eng',
          }),
        });
        results.ocrspace = { success: response.ok, latency: Date.now() - start };
        if (!response.ok) {
          results.ocrspace.error = await response.text();
        } else {
          providerManager.markKeySuccess('ocrspace', keyData.index);
        }
      } else {
        results.ocrspace = { success: false, error: 'No keys available' };
      }
    } catch (error) {
      results.ocrspace = { success: false, error: error instanceof Error ? error.message : 'Unknown error' };
    }

    const allPassed = Object.values(results).every(r => r.success);
    const passedCount = Object.values(results).filter(r => r.success).length;

    res.json({
      success: true,
      data: {
        allPassed,
        passedCount,
        totalProviders: Object.keys(results).length,
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
