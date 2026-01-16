/**
 * Text-to-Speech Routes
 * Simple and clean implementation
 */

import { Router, Request, Response } from 'express';
import { logger } from '../utils/logger.js';
import { ttsService } from '../services/TTSService.js';
import { clerkAuth } from '../middleware/clerkAuth.js';

const router = Router();

/**
 * GET /tts/health (PUBLIC - no auth required)
 * Check TTS service health status
 */
router.get('/health', async (_req: Request, res: Response) => {
  try {
    const status = ttsService.getProviderInfo();
    
    res.json({
      success: true,
      data: {
        available: status.available,
        provider: status.provider,
        elevenLabsKeys: status.elevenLabsKeys || 0,
        elevenLabsAvailable: status.elevenLabsAvailable || 0,
      },
    });
  } catch (error: any) {
    res.status(500).json({ 
      success: false, 
      error: error.message 
    });
  }
});

// Apply authentication to all other routes
router.use(clerkAuth);

/**
 * POST /tts/generate
 * Generate speech from text
 */
router.post('/generate', async (req: Request, res: Response) => {
  try {
    const { text, voice } = req.body;
    
    if (!text || typeof text !== 'string') {
      return res.status(400).json({ error: 'Text is required' });
    }
    
    if (text.length > 5000) {
      return res.status(400).json({ error: 'Text too long (max 5000 characters)' });
    }
    
    logger.info(`TTS request: ${text.length} chars, voice: ${voice || 'default'}`);
    
    const result = await ttsService.generateSpeech(text, { voice });
    
    res.setHeader('Content-Type', 'audio/mpeg');
    res.setHeader('Content-Length', result.audioBuffer.length);
    res.setHeader('X-TTS-Provider', result.provider);
    res.send(result.audioBuffer);
    
  } catch (error: any) {
    logger.error('TTS failed:', error.message);
    res.status(500).json({ 
      error: 'Failed to generate speech',
      details: error.message 
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
    const status = ttsService.getProviderInfo();
    
    res.json({
      success: true,
      data: {
        provider: status.provider,
        available: status.available,
        voices,
      },
    });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

/**
 * GET /tts/status
 * Check TTS service status
 */
router.get('/status', async (req: Request, res: Response) => {
  try {
    const status = ttsService.getProviderInfo();
    
    res.json({
      success: true,
      data: {
        available: status.available,
        provider: status.provider,
        keyCount: status.elevenLabsKeys || 0,
        maxCharacters: 5000,
        supportedFormats: ['mp3'],
      },
    });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

/**
 * GET /tts/debug
 * Debug endpoint - shows detailed TTS status and tests each provider
 */
router.get('/debug', async (req: Request, res: Response) => {
  try {
    const status = ttsService.getProviderInfo();
    
    // Test with a simple Urdu phrase
    const testText = 'السلام علیکم، آپ کیسے ہیں؟';
    let testResult = 'not attempted';
    let testProvider = 'none';
    let testError: string | null = null;
    
    try {
      const result = await ttsService.generateSpeech(testText, { voice: 'pqHfZKP75CvOlQylNhV4' });
      testResult = `success - ${result.audioBuffer.length} bytes`;
      testProvider = result.provider;
    } catch (error: any) {
      testResult = 'failed';
      testError = error.message;
    }
    
    // Get environment variable info (without exposing actual keys)
    const envCheck = {
      elevenLabsVars: Object.keys(process.env).filter(k => k.toLowerCase().includes('eleven')),
      hasGoogleKey: !!process.env.GOOGLE_CLOUD_TTS_KEY,
      hasOpenAIKey: !!process.env.OPENAI_API_KEY,
    };
    
    res.json({
      status,
      testResult,
      testProvider,
      testError,
      envCheck,
      timestamp: new Date().toISOString(),
    });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

export default router;
