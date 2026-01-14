/**
 * Text-to-Speech Routes
 * Provides voice output capabilities
 * 
 * @module TTSRoutes
 */

import { Router, Request, Response } from 'express';
import { logger } from '../utils/logger.js';
import { ttsService } from '../services/TTSService.js';
import { clerkAuth } from '../middleware/clerkAuth.js';
import { ttsRateLimiter } from '../middleware/advancedRateLimit.js';

const router = Router();

// Apply authentication
router.use(clerkAuth);

// Apply rate limiting
router.use(ttsRateLimiter);

/**
 * POST /tts/generate
 * Generate speech from text
 */
router.post('/generate', async (req: Request, res: Response) => {
  try {
    const { text, voice, speed, language, format } = req.body;
    
    if (!text || typeof text !== 'string') {
      return res.status(400).json({ error: 'Text is required' });
    }
    
    if (text.length > 5000) {
      return res.status(400).json({ error: 'Text too long (max 5000 characters)' });
    }
    
    logger.info('TTS generation requested', {
      userId: req.user?.id,
      textLength: text.length,
      voice,
    });
    
    const result = await ttsService.generateSpeech(text, {
      voice,
      speed: speed ? parseFloat(speed) : 1.0,
      language,
      format: format || 'mp3',
    });
    
    // Set headers for audio response
    res.setHeader('Content-Type', `audio/${result.format}`);
    res.setHeader('Content-Length', result.audioBuffer.length);
    res.setHeader('X-TTS-Provider', result.provider);
    
    if (result.duration) {
      res.setHeader('X-Audio-Duration', result.duration.toString());
    }
    
    res.send(result.audioBuffer);
    
  } catch (error: any) {
    logger.error('TTS generation failed:', error);
    const errorMessage = error?.message || 'Failed to generate speech';
    res.status(500).json({ 
      error: 'Failed to generate speech',
      details: process.env.NODE_ENV !== 'production' ? errorMessage : undefined
    });
  }
});

/**
 * GET /tts/voices
 * Get available voices
 */
router.get('/voices', async (req: Request, res: Response) => {
  try {
    const voices = ttsService.getAvailableVoices();
    const providerInfo = ttsService.getProviderInfo();
    
    res.json({
      success: true,
      data: {
        provider: providerInfo.provider,
        available: providerInfo.available,
        voices,
      },
    });
    
  } catch (error) {
    logger.error('Failed to get TTS voices:', error);
    res.status(500).json({ error: 'Failed to get voices' });
  }
});

/**
 * GET /tts/status
 * Check TTS service status
 */
router.get('/status', async (req: Request, res: Response) => {
  try {
    const providerInfo = ttsService.getProviderInfo();
    
    res.json({
      success: true,
      data: {
        available: providerInfo.available,
        provider: providerInfo.provider,
        maxCharacters: 5000,
        supportedFormats: ['mp3', 'opus', 'aac', 'flac'],
      },
    });
    
  } catch (error) {
    logger.error('Failed to get TTS status:', error);
    res.status(500).json({ error: 'Failed to get status' });
  }
});

/**
 * POST /tts/estimate
 * Estimate audio duration
 */
router.post('/estimate', async (req: Request, res: Response) => {
  try {
    const { text, speed = 1.0 } = req.body;
    
    if (!text) {
      return res.status(400).json({ error: 'Text is required' });
    }
    
    const estimatedDuration = ttsService.estimateDuration(text, speed);
    
    res.json({
      success: true,
      data: {
        textLength: text.length,
        wordCount: text.split(/\s+/).length,
        estimatedDurationSeconds: estimatedDuration,
        speed,
      },
    });
    
  } catch (error) {
    logger.error('Failed to estimate duration:', error);
    res.status(500).json({ error: 'Failed to estimate duration' });
  }
});

/**
 * GET /tts/usage
 * Get ElevenLabs usage statistics (admin only)
 */
router.get('/usage', async (req: Request, res: Response) => {
  try {
    // Only allow admin users to see usage stats
    const user = req.user;
    if (user?.role !== 'admin') {
      return res.status(403).json({ error: 'Admin access required' });
    }
    
    const usageStats = ttsService.getElevenLabsUsageStats();
    const providerInfo = ttsService.getProviderInfo();
    
    res.json({
      success: true,
      data: {
        provider: providerInfo,
        elevenLabsUsage: usageStats.map(stat => ({
          keyIndex: stat.keyIndex + 1,
          charactersUsed: stat.usage.charactersUsed,
          monthlyLimit: 10000,
          percentUsed: Math.round((stat.usage.charactersUsed / 10000) * 100),
          requestCount: stat.usage.requestCount,
          lastUsed: stat.usage.lastUsed,
          isExhausted: stat.usage.isExhausted,
        })),
      },
    });
    
  } catch (error) {
    logger.error('Failed to get TTS usage:', error);
    res.status(500).json({ error: 'Failed to get usage stats' });
  }
});

export default router;
