/**
 * Chat Routes
 * API endpoints for chat, streaming, providers, and models
 * 
 * @module Routes/Chat
 */

import { Router, Request, Response } from 'express';
import { clerkAuth, chatLimiter, validate, schemas } from '../middleware/index.js';
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
 * Supports image attachments for vision analysis
 */
router.post(
  '/completions',
  clerkAuth,
  chatLimiter,
  validate(schemas.chatMessage),
  async (req: Request, res: Response): Promise<void> => {
    try {
      const userId = req.user!.id;
      const { message, conversationId, model, systemPrompt, stream = true, imageIds, mode: explicitMode } = req.body;

      // Build enhanced message with image context (hidden from user)
      let enhancedMessage = message;
      let imageContext = '';

      if (imageIds && Array.isArray(imageIds) && imageIds.length > 0) {
        // Get OCR/analysis results for attached images
        const { prisma } = await import('../config/database.js');
        
        const attachments = await prisma.attachment.findMany({
          where: {
            id: { in: imageIds },
            userId,
          },
          select: {
            id: true,
            extractedText: true,
            analysisResult: true,
            mimeType: true,
            originalName: true,
          },
        });

        // Build structured image context for AI with enhanced formatting instructions
        const imageContextParts = attachments
          .filter(a => a.extractedText || a.analysisResult)
          .map((a, i) => {
            const parts = [];
            const isImage = a.mimeType?.startsWith('image/');
            const isPDF = a.mimeType === 'application/pdf';
            const isDocument = a.mimeType?.includes('document') || a.mimeType?.includes('word') || a.mimeType === 'text/plain';
            
            const fileType = isImage ? 'Image' : isPDF ? 'PDF Document' : isDocument ? 'Document' : 'File';
            const fileName = a.originalName || `Attachment ${i + 1}`;
            
            if (a.extractedText && a.extractedText.trim().length > 10) {
              parts.push(`📄 **${fileType}: ${fileName}**\n\`\`\`\n${a.extractedText.trim()}\n\`\`\``);
            }
            if (a.analysisResult) {
              parts.push(`🔍 **Visual Analysis:**\n${a.analysisResult}`);
            }
            return parts.join('\n\n');
          });

        if (imageContextParts.length > 0) {
          // Create a structured context that helps AI give better responses
          const formatInstructions = `
---
## 📎 ATTACHED CONTENT

${imageContextParts.join('\n\n---\n\n')}

---

**RESPONSE GUIDELINES:**
1. **Structure your response clearly** with headers (##), bullet points, and numbered lists where appropriate
2. **For documents/CVs:** Extract and organize key information into sections (Summary, Experience, Skills, Education, etc.)
3. **For images with text:** Present extracted text in a clean, readable format
4. **For visual content:** Describe what you see, then answer the user's specific question
5. **Use markdown tables** for structured data when helpful
6. **Be concise but thorough** - focus on what the user is asking about
7. **If information is unclear or incomplete**, mention it and provide your best interpretation

Now respond to the user's question about this content:`;
          
          imageContext = formatInstructions;
          enhancedMessage = message + imageContext;
        }
      }

      if (stream) {
        await chatService.streamMessage(res, enhancedMessage, {
          userId,
          conversationId,
          model,
          systemPrompt,
          originalMessage: message, // Store original without image context
          imageIds,
          explicitMode, // Pass explicit mode selection from frontend
        });
      } else {
        const result = await chatService.processMessage(enhancedMessage, {
          userId,
          conversationId,
          model,
          systemPrompt,
          originalMessage: message,
          imageIds,
          explicitMode, // Pass explicit mode selection from frontend
        });

        res.json({
          success: result.success,
          data: result.success ? {
            message: result.message,
            conversationId: result.conversationId,
            model: result.model,
            provider: result.provider,
            tokens: result.tokens,
            // Include image result if present (for image generation mode)
            imageResult: result.imageResult,
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
  clerkAuth,
  chatLimiter,
  validate(schemas.regenerate),
  async (req: Request, res: Response): Promise<void> => {
    try {
      const { conversationId, model, temperature } = req.body;
      const userId = req.user!.id;

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
  clerkAuth,
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
  clerkAuth,
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
  clerkAuth,
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
router.post('/test', clerkAuth, async (req: Request, res: Response): Promise<void> => {
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

/**
 * POST /api/v1/chat/analyze
 * Analyze a prompt before sending to get mode, intent, format suggestions
 */
router.post('/analyze', clerkAuth, async (req: Request, res: Response): Promise<void> => {
  try {
    const { message, attachments } = req.body;

    if (!message) {
      res.status(400).json({
        success: false,
        error: 'Message is required',
      });
      return;
    }

    // Import services dynamically
    const { promptAnalyzer } = await import('../services/PromptAnalyzer.js');
    const { modeDetector, MODE_CONFIGS } = await import('../services/ModeDetectorService.js');

    // Detect AI mode
    const modeResult = modeDetector.detectMode(message, attachments);

    // Analyze prompt
    const promptAnalysis = await promptAnalyzer.analyze(message);

    // Get mode configuration
    const modeConfig = modeDetector.getModeConfig(modeResult.mode);

    res.json({
      success: true,
      data: {
        mode: {
          detected: modeResult.mode,
          confidence: modeResult.confidence,
          keywords: modeResult.detectedKeywords,
          alternatives: modeResult.suggestedModes,
          config: {
            displayName: modeConfig.displayName,
            icon: modeConfig.icon,
            description: modeConfig.description,
            requiresSpecialAPI: modeConfig.requiresSpecialAPI,
          },
        },
        intent: promptAnalysis.intent,
        format: promptAnalysis.formatRequested,
        complexity: promptAnalysis.complexity,
        language: promptAnalysis.language,
        specialInstructions: promptAnalysis.specialInstructions,
        suggestedSettings: {
          temperature: promptAnalysis.suggestedTemperature,
          maxTokens: promptAnalysis.suggestedMaxTokens,
        },
        formattingHints: promptAnalyzer.generateFormattingHints(promptAnalysis),
      },
    });
  } catch (error) {
    logger.error('Prompt analyze error:', error);
    res.status(500).json({
      success: false,
      error: 'Prompt analysis failed',
    });
  }
});

/**
 * GET /api/v1/chat/modes
 * Get all available AI modes with their configurations
 */
router.get('/modes', (_req: Request, res: Response): void => {
  try {
    const { modeDetector, AIMode, MODE_CONFIGS } = require('../services/ModeDetectorService.js');
    
    const modes = modeDetector.getAllModes();

    res.json({
      success: true,
      data: {
        modes: modes.map((mode: any) => ({
          id: mode.mode,
          displayName: mode.displayName,
          icon: mode.icon,
          description: mode.description,
          capabilities: mode.capabilities,
          requiresSpecialAPI: mode.requiresSpecialAPI,
          dailyLimits: mode.dailyLimits,
        })),
        total: modes.length,
      },
    });
  } catch (error) {
    logger.error('Get modes error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to get modes',
    });
  }
});

/**
 * GET /api/v1/chat/usage
 * Get user's current usage and remaining quotas
 */
router.get('/usage', clerkAuth, async (req: Request, res: Response): Promise<void> => {
  try {
    const userId = req.user!.id;
    const { prisma } = await import('../config/database.js');

    // Get today's date range
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const tomorrow = new Date(today);
    tomorrow.setDate(tomorrow.getDate() + 1);

    // Count today's messages
    const messagesCount = await prisma.message.count({
      where: {
        conversation: { userId },
        role: 'user',
        createdAt: { gte: today, lt: tomorrow },
      },
    });

    // Count today's image generations from ImageGeneration table
    const imagesCount = await prisma.imageGeneration.count({
      where: {
        userId,
        createdAt: { gte: today, lt: tomorrow },
      },
    });

    // Get user tier (default to free)
    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: { tier: true },
    });
    const tier = user?.tier || 'free';

    // Define limits based on tier
    const limits = {
      free: { messages: 50, images: 1, voice: 10, search: 5 },
      pro: { messages: 500, images: 50, voice: 100, search: 100 },
      enterprise: { messages: 10000, images: 500, voice: 1000, search: 1000 },
    }[tier as 'free' | 'pro' | 'enterprise'] || { messages: 50, images: 1, voice: 10, search: 5 };

    // Calculate reset time (midnight)
    const resetTime = tomorrow.toISOString();

    res.json({
      success: true,
      data: {
        tier,
        usage: {
          messages: {
            used: messagesCount,
            limit: limits.messages,
            remaining: Math.max(0, limits.messages - messagesCount),
            percentage: Math.round((messagesCount / limits.messages) * 100),
          },
          images: {
            used: imagesCount,
            limit: limits.images,
            remaining: Math.max(0, limits.images - imagesCount),
            percentage: Math.round((imagesCount / limits.images) * 100),
          },
        },
        resetAt: resetTime,
        limits,
      },
    });
  } catch (error) {
    logger.error('Get usage error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to get usage',
    });
  }
});

/**
 * POST /api/v1/chat/suggest
 * Get follow-up question suggestions based on conversation
 */
router.post('/suggest', clerkAuth, async (req: Request, res: Response): Promise<void> => {
  try {
    const { conversationId, lastResponse } = req.body;
    const userId = req.user!.id;
    const { prisma } = await import('../config/database.js');

    // Get conversation context
    let context = lastResponse || '';
    
    if (conversationId && !lastResponse) {
      const messages = await prisma.message.findMany({
        where: { conversationId, conversation: { userId } },
        orderBy: { createdAt: 'desc' },
        take: 3,
        select: { content: true, role: true },
      });
      
      context = messages.reverse().map(m => `${m.role}: ${m.content}`).join('\n');
    }

    if (!context) {
      res.json({
        success: true,
        data: {
          suggestions: [
            "Tell me more about this",
            "Can you explain in simpler terms?",
            "What are some examples?",
            "What are the alternatives?",
          ],
        },
      });
      return;
    }

    // Generate suggestions using AI
    const response = await aiRouter.chat({
      messages: [
        {
          role: 'system',
          content: `Based on the conversation context, suggest 4 brief follow-up questions the user might want to ask. Return ONLY a JSON array of strings, no explanation.`,
        },
        {
          role: 'user',
          content: `Context:\n${context.substring(0, 1000)}\n\nSuggest 4 follow-up questions:`,
        },
      ],
      maxTokens: 200,
      temperature: 0.7,
    });

    if (response.success && response.content) {
      try {
        // Try to parse as JSON
        const jsonMatch = response.content.match(/\[[\s\S]*\]/);
        if (jsonMatch) {
          const suggestions = JSON.parse(jsonMatch[0]);
          res.json({
            success: true,
            data: { suggestions: suggestions.slice(0, 4) },
          });
          return;
        }
      } catch {
        // If JSON parse fails, split by newlines
        const suggestions = response.content
          .split('\n')
          .filter((line: string) => line.trim() && !line.startsWith('[') && !line.startsWith(']'))
          .map((line: string) => line.replace(/^[\d.\-*"]+\s*/, '').replace(/["',]+$/, ''))
          .filter((line: string) => line.length > 5 && line.length < 100)
          .slice(0, 4);
        
        if (suggestions.length > 0) {
          res.json({
            success: true,
            data: { suggestions },
          });
          return;
        }
      }
    }

    // Fallback suggestions
    res.json({
      success: true,
      data: {
        suggestions: [
          "Can you elaborate on that?",
          "What are the key points?",
          "How does this work in practice?",
          "Can you give me an example?",
        ],
      },
    });
  } catch (error) {
    logger.error('Get suggestions error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to get suggestions',
    });
  }
});

// ============================================
// Feedback for Auto-Learning
// ============================================

/**
 * POST /api/v1/chat/feedback
 * Submit feedback for a message (like/dislike) to improve AI responses
 */
router.post('/feedback', clerkAuth, async (req: Request, res: Response): Promise<void> => {
  try {
    const { conversationId, messageId, isPositive, feedbackType } = req.body;
    const userId = req.user!.id;
    const { prisma } = await import('../config/database.js');

    if (!conversationId || !messageId) {
      res.status(400).json({
        success: false,
        error: 'Missing required fields: conversationId and messageId',
      });
      return;
    }

    // Verify conversation belongs to user
    const conversation = await prisma.conversation.findFirst({
      where: { id: conversationId, userId },
      include: {
        messages: {
          where: { id: messageId },
          take: 1,
        },
      },
    });

    if (!conversation) {
      res.status(404).json({
        success: false,
        error: 'Conversation not found',
      });
      return;
    }

    const targetMessage = conversation.messages[0];
    
    // Get the user query (previous message)
    let userQuery = '';
    if (targetMessage) {
      const previousMessage = await prisma.message.findFirst({
        where: {
          conversationId,
          createdAt: { lt: targetMessage.createdAt },
          role: 'user',
        },
        orderBy: { createdAt: 'desc' },
      });
      userQuery = previousMessage?.content || '';
    }

    // Store feedback for learning - this helps improve responses
    try {
      await prisma.messageFeedback.create({
        data: {
          userId,
          conversationId,
          messageId,
          feedbackType: isPositive ? 'like' : (feedbackType || 'dislike'),
          reason: req.body.reason || null,
          originalContent: targetMessage?.content || null,
          userQuery,
          model: targetMessage?.model || null,
          intent: req.body.intent || null,
        },
      });
    } catch (feedbackError) {
      // Non-critical, just log
      logger.warn('Failed to store feedback in DB:', feedbackError);
    }

    logger.info('Feedback received and stored', {
      userId,
      conversationId,
      messageId,
      isPositive,
      feedbackType,
    });

    res.json({
      success: true,
      data: {
        message: 'Feedback received. Thank you for helping us improve!',
        learned: true,
      },
    });
  } catch (error) {
    logger.error('Feedback submission error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to submit feedback',
    });
  }
});

/**
 * POST /api/v1/chat/share
 * Create a shareable link for a conversation
 * Stores the share link in the database for retrieval
 */
router.post('/share', clerkAuth, async (req: Request, res: Response): Promise<void> => {
  try {
    const { conversationId } = req.body;
    const userId = req.user!.id;
    const { prisma } = await import('../config/database.js');
    const crypto = await import('crypto');

    if (!conversationId) {
      res.status(400).json({
        success: false,
        error: 'Missing conversationId',
      });
      return;
    }

    // Verify conversation belongs to user
    const conversation = await prisma.conversation.findFirst({
      where: { id: conversationId, userId },
    });

    if (!conversation) {
      res.status(404).json({
        success: false,
        error: 'Conversation not found',
      });
      return;
    }

    // Check if share link already exists for this conversation
    const existingShare = await prisma.shareLink.findFirst({
      where: { conversationId, userId, isPublic: true },
    });

    if (existingShare) {
      // Return existing share link
      const baseUrl = process.env.FRONTEND_URL || 'https://baatcheet.app';
      res.json({
        success: true,
        data: {
          shareLink: `${baseUrl}/share/${existingShare.shareId}`,
          shareId: existingShare.shareId,
          expiresAt: existingShare.expiresAt?.toISOString() || null,
          accessCount: existingShare.accessCount,
        },
      });
      return;
    }

    // Generate unique share ID using crypto
    const shareId = crypto.randomBytes(16).toString('base64url');
    const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000); // 7 days

    // Store share link in database
    const shareLink = await prisma.shareLink.create({
      data: {
        conversationId,
        userId,
        shareId,
        expiresAt,
        isPublic: true,
        accessCount: 0,
      },
    });

    const baseUrl = process.env.FRONTEND_URL || 'https://baatcheet.app';
    const fullShareLink = `${baseUrl}/share/${shareId}`;

    logger.info('Chat shared', { userId, conversationId, shareId });

    res.json({
      success: true,
      data: {
        shareLink: fullShareLink,
        shareId,
        expiresAt: expiresAt.toISOString(),
        accessCount: 0,
      },
    });
  } catch (error) {
    logger.error('Share conversation error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to share conversation',
    });
  }
});

/**
 * GET /api/v1/chat/share/:shareId
 * Get a shared conversation (PUBLIC - no auth required)
 */
router.get('/share/:shareId', async (req: Request, res: Response): Promise<void> => {
  try {
    const { shareId } = req.params;
    const { prisma } = await import('../config/database.js');

    // Find the share link
    const share = await prisma.shareLink.findUnique({
      where: { shareId },
      include: {
        conversation: {
          include: {
            messages: {
              orderBy: { createdAt: 'asc' },
              take: 100, // Limit messages in shared view
              select: {
                id: true,
                role: true,
                content: true,
                createdAt: true,
              },
            },
            user: {
              select: {
                username: true,
                firstName: true,
                avatar: true,
              },
            },
          },
        },
      },
    });

    if (!share) {
      res.status(404).json({
        success: false,
        error: 'Shared conversation not found',
      });
      return;
    }

    // Check if share link is expired
    if (share.expiresAt && new Date() > share.expiresAt) {
      res.status(410).json({
        success: false,
        error: 'This share link has expired',
      });
      return;
    }

    // Check if public
    if (!share.isPublic) {
      res.status(403).json({
        success: false,
        error: 'This conversation is no longer shared',
      });
      return;
    }

    // Increment access count
    await prisma.shareLink.update({
      where: { shareId },
      data: { accessCount: { increment: 1 } },
    });

    res.json({
      success: true,
      data: {
        title: share.conversation.title,
        messages: share.conversation.messages,
        sharedBy: share.conversation.user.username || share.conversation.user.firstName || 'Anonymous',
        sharedByAvatar: share.conversation.user.avatar,
        createdAt: share.createdAt.toISOString(),
        messageCount: share.conversation.messages.length,
      },
    });
  } catch (error) {
    logger.error('Get shared conversation error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to retrieve shared conversation',
    });
  }
});

/**
 * DELETE /api/v1/chat/share/:shareId
 * Revoke a share link (requires auth)
 */
router.delete('/share/:shareId', clerkAuth, async (req: Request, res: Response): Promise<void> => {
  try {
    const { shareId } = req.params;
    const userId = req.user!.id;
    const { prisma } = await import('../config/database.js');

    // Find and verify ownership
    const share = await prisma.shareLink.findFirst({
      where: { shareId, userId },
    });

    if (!share) {
      res.status(404).json({
        success: false,
        error: 'Share link not found or you do not have permission',
      });
      return;
    }

    // Delete the share link
    await prisma.shareLink.delete({
      where: { id: share.id },
    });

    logger.info('Share link revoked', { userId, shareId });

    res.json({
      success: true,
      data: { message: 'Share link revoked successfully' },
    });
  } catch (error) {
    logger.error('Revoke share link error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to revoke share link',
    });
  }
});

export default router;
