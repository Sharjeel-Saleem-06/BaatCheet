/**
 * Audio Routes
 * API endpoints for voice input and transcription
 * 
 * @module Routes/Audio
 */

import { Router, Request, Response } from 'express';
import path from 'path';
import { clerkAuth, chatLimiter } from '../middleware/index.js';
import { audioService, audioUpload } from '../services/AudioService.js';
import { chatService } from '../services/ChatService.js';
import { analyticsService } from '../services/AnalyticsService.js';
import { languageHandler } from '../services/LanguageHandler.js';
import { whisperService } from '../services/WhisperService.js';
import { logger } from '../utils/logger.js';

const router = Router();

// ============================================
// Audio Upload Routes
// ============================================

/**
 * POST /api/v1/audio/upload
 * Upload audio file for transcription
 */
router.post(
  '/upload',
  clerkAuth,
  audioUpload.single('audio'),
  async (req: Request, res: Response): Promise<void> => {
    try {
      const userId = req.user!.id;
      const file = req.file;
      const { conversationId } = req.body;

      if (!file) {
        res.status(400).json({
          success: false,
          error: 'No audio file provided',
        });
        return;
      }

      const result = await audioService.processUpload(file, userId, conversationId);

      res.json({
        success: true,
        data: result,
      });
    } catch (error) {
      logger.error('Audio upload error:', error);
      res.status(500).json({
        success: false,
        error: error instanceof Error ? error.message : 'Upload failed',
      });
    }
  }
);

/**
 * POST /api/v1/audio/transcribe
 * Transcribe an uploaded audio file
 */
router.post(
  '/transcribe',
  clerkAuth,
  chatLimiter,
  async (req: Request, res: Response): Promise<void> => {
    try {
      const userId = req.user!.id;
      const { audioId, language } = req.body;

      if (!audioId) {
        res.status(400).json({
          success: false,
          error: 'Audio ID is required',
        });
        return;
      }

      const result = await audioService.transcribeAndSave(audioId, userId, { language });

      if (result.success) {
        // Track analytics
        await analyticsService.trackEvent(userId, 'audio', {
          audioMinutes: (result.duration || 0) / 60,
        });
      }

      res.json({
        success: result.success,
        data: result.success ? {
          text: result.text,
          language: result.language,
          confidence: result.confidence,
          duration: result.duration,
          provider: result.provider,
        } : undefined,
        error: result.error,
      });
    } catch (error) {
      logger.error('Transcription error:', error);
      res.status(500).json({
        success: false,
        error: 'Transcription failed',
      });
    }
  }
);

/**
 * POST /api/v1/audio/transcribe-upload
 * Upload and transcribe in one request
 */
router.post(
  '/transcribe-upload',
  clerkAuth,
  chatLimiter,
  audioUpload.single('audio'),
  async (req: Request, res: Response): Promise<void> => {
    try {
      const userId = req.user!.id;
      const file = req.file;
      const { language, conversationId } = req.body;

      if (!file) {
        res.status(400).json({
          success: false,
          error: 'No audio file provided',
        });
        return;
      }

      // Upload
      const uploaded = await audioService.processUpload(file, userId, conversationId);

      // Transcribe
      const result = await audioService.transcribe(uploaded.storedName, { language });

      if (result.success) {
        await analyticsService.trackEvent(userId, 'audio', {
          audioMinutes: (result.duration || 0) / 60,
        });
      }

      // Detect language and Roman Urdu
      const languageAnalysis = result.success && result.text 
        ? languageHandler.detectLanguage(result.text)
        : null;

      res.json({
        success: result.success,
        data: result.success ? {
          audioId: uploaded.id,
          audioUrl: uploaded.url,
          text: result.text,
          language: result.language,
          isRomanUrdu: languageAnalysis?.isRomanUrdu || false,
          isMixedLanguage: languageAnalysis?.primaryLanguage === 'mixed',
          primaryLanguage: languageAnalysis?.primaryLanguage || result.language,
          confidence: result.confidence || languageAnalysis?.confidence,
          duration: result.duration,
          provider: result.provider,
          metadata: languageAnalysis?.metadata,
        } : undefined,
        error: result.error,
      });
    } catch (error) {
      logger.error('Transcribe upload error:', error);
      res.status(500).json({
        success: false,
        error: 'Transcription failed',
      });
    }
  }
);

/**
 * POST /api/v1/audio/voice-chat
 * Voice chat: Upload audio → Transcribe → Send to AI
 */
router.post(
  '/voice-chat',
  clerkAuth,
  chatLimiter,
  audioUpload.single('audio'),
  async (req: Request, res: Response): Promise<void> => {
    try {
      const userId = req.user!.id;
      const file = req.file;
      const { conversationId, language, model, systemPrompt, stream = false } = req.body;

      if (!file) {
        res.status(400).json({
          success: false,
          error: 'No audio file provided',
        });
        return;
      }

      // Voice chat processing
      const voiceResult = await audioService.voiceChat(
        file,
        userId,
        conversationId,
        { language }
      );

      if (!voiceResult.success || !voiceResult.transcription) {
        res.status(400).json({
          success: false,
          error: voiceResult.error || 'Voice processing failed',
        });
        return;
      }

      // Track analytics
      await analyticsService.trackEvent(userId, 'audio');

      // If streaming requested, handle SSE
      if (stream === 'true' || stream === true) {
        // First send transcription
        res.setHeader('Content-Type', 'text/event-stream');
        res.setHeader('Cache-Control', 'no-cache');
        res.setHeader('Connection', 'keep-alive');

        res.write(`data: ${JSON.stringify({
          type: 'transcription',
          text: voiceResult.transcription,
          audioId: voiceResult.audioId,
        })}\n\n`);

        // Then stream AI response
        await chatService.streamMessage(res, voiceResult.transcription, {
          userId,
          conversationId,
          model,
          systemPrompt,
        });
      } else {
        // Non-streaming: process and return
        const chatResult = await chatService.processMessage(voiceResult.transcription, {
          userId,
          conversationId,
          model,
          systemPrompt,
        });

        res.json({
          success: true,
          data: {
            transcription: voiceResult.transcription,
            audioId: voiceResult.audioId,
            response: chatResult.success ? chatResult.message : undefined,
            conversationId: chatResult.conversationId,
            model: chatResult.model,
            provider: chatResult.provider,
          },
          error: chatResult.error,
        });
      }
    } catch (error) {
      logger.error('Voice chat error:', error);
      if (!res.headersSent) {
        res.status(500).json({
          success: false,
          error: 'Voice chat failed',
        });
      }
    }
  }
);

/**
 * GET /api/v1/audio/:id
 * Get audio file info or serve file
 */
router.get(
  '/:id',
  clerkAuth,
  async (req: Request, res: Response): Promise<void> => {
    try {
      const userId = req.user!.id;
      const { id } = req.params;
      const { download } = req.query;

      const result = await audioService.getAudioInfo(id, userId);

      if (!result.success || !result.audio) {
        res.status(404).json({
          success: false,
          error: 'Audio not found',
        });
        return;
      }

      if (download === 'true') {
        // Serve file
        const filePath = path.join(process.cwd(), 'uploads', 'audio', result.audio.originalFilename);
        res.download(filePath, result.audio.originalFilename);
      } else {
        res.json({
          success: true,
          data: result.audio,
        });
      }
    } catch (error) {
      logger.error('Get audio error:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to get audio',
      });
    }
  }
);

/**
 * DELETE /api/v1/audio/:id
 * Delete audio file
 */
router.delete(
  '/:id',
  clerkAuth,
  async (req: Request, res: Response): Promise<void> => {
    try {
      const userId = req.user!.id;
      const { id } = req.params;

      const deleted = await audioService.deleteAudio(id, userId);

      if (!deleted) {
        res.status(404).json({
          success: false,
          error: 'Audio not found',
        });
        return;
      }

      res.json({
        success: true,
        message: 'Audio deleted',
      });
    } catch (error) {
      logger.error('Delete audio error:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to delete audio',
      });
    }
  }
);

/**
 * POST /api/v1/audio/translate
 * Translate text between Roman Urdu and English
 */
router.post(
  '/translate',
  clerkAuth,
  chatLimiter,
  async (req: Request, res: Response): Promise<void> => {
    try {
      const { text, from, to } = req.body;

      if (!text) {
        res.status(400).json({
          success: false,
          error: 'Text is required',
        });
        return;
      }

      let result;
      
      if (from === 'roman-urdu' && to === 'english') {
        result = await languageHandler.translateToEnglish(text);
      } else if (from === 'english' && to === 'roman-urdu') {
        result = await languageHandler.translateToRomanUrdu(text);
      } else {
        // Auto-detect source language
        const detection = languageHandler.detectLanguage(text);
        
        if (detection.isRomanUrdu || detection.primaryLanguage === 'urdu' || detection.primaryLanguage === 'mixed') {
          result = await languageHandler.translateToEnglish(text);
        } else {
          result = await languageHandler.translateToRomanUrdu(text);
        }
      }

      res.json({
        success: result.success,
        data: result.success ? {
          originalText: result.originalText,
          translatedText: result.translatedText,
          sourceLanguage: result.sourceLanguage,
          targetLanguage: result.targetLanguage,
        } : undefined,
        error: result.error,
      });
    } catch (error) {
      logger.error('Translation error:', error);
      res.status(500).json({
        success: false,
        error: 'Translation failed',
      });
    }
  }
);

/**
 * POST /api/v1/audio/detect-language
 * Detect language of text
 */
router.post(
  '/detect-language',
  clerkAuth,
  async (req: Request, res: Response): Promise<void> => {
    try {
      const { text } = req.body;

      if (!text) {
        res.status(400).json({
          success: false,
          error: 'Text is required',
        });
        return;
      }

      const detection = languageHandler.detectLanguage(text);

      res.json({
        success: true,
        data: {
          primaryLanguage: detection.primaryLanguage,
          isRomanUrdu: detection.isRomanUrdu,
          confidence: detection.confidence,
          metadata: detection.metadata,
        },
      });
    } catch (error) {
      logger.error('Language detection error:', error);
      res.status(500).json({
        success: false,
        error: 'Language detection failed',
      });
    }
  }
);

/**
 * GET /api/v1/audio/languages
 * Get supported transcription languages
 */
router.get(
  '/config/languages',
  (_req: Request, res: Response): void => {
    const languages = audioService.getSupportedLanguages();
    res.json({
      success: true,
      data: languages,
    });
  }
);

/**
 * GET /api/v1/audio/health
 * Get audio service health
 */
router.get(
  '/config/health',
  (_req: Request, res: Response): void => {
    const health = audioService.getHealth();
    res.json({
      success: true,
      data: health,
    });
  }
);

export default router;
