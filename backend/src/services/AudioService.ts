/**
 * Audio Service
 * Handles voice input, audio upload, and transcription
 * Uses OpenAI Whisper as primary, Groq Whisper as backup
 * 
 * @module AudioService
 */

import { Request } from 'express';
import multer, { FileFilterCallback } from 'multer';
import path from 'path';
import fs from 'fs/promises';
import { createReadStream } from 'fs';
import { v4 as uuidv4 } from 'uuid';
import OpenAI from 'openai';
import Groq from 'groq-sdk';
import { logger } from '../utils/logger.js';
import { prisma } from '../config/database.js';
import { providerManager } from './ProviderManager.js';
import { config } from '../config/index.js';

// ============================================
// Types
// ============================================

export interface TranscriptionResult {
  success: boolean;
  text?: string;
  language?: string;
  isRomanUrdu?: boolean;
  isMixedLanguage?: boolean;
  confidence?: number;
  duration?: number;
  provider?: string;
  error?: string;
}

export interface AudioUploadResult {
  id: string;
  originalName: string;
  storedName: string;
  format: string;
  size: number;
  url: string;
}

// ============================================
// Configuration
// ============================================

const AUDIO_DIR = path.join(process.cwd(), 'uploads', 'audio');
const MAX_FILE_SIZE = 25 * 1024 * 1024; // 25MB
const ALLOWED_FORMATS = [
  'audio/mpeg',      // mp3
  'audio/mp3',
  'audio/wav',
  'audio/wave',
  'audio/x-wav',
  'audio/ogg',
  'audio/webm',
  'audio/flac',
  'audio/m4a',
  'audio/mp4',
];

const SUPPORTED_LANGUAGES = [
  { code: 'en', name: 'English' },
  { code: 'ur', name: 'Urdu' },
  { code: 'ar', name: 'Arabic' },
  { code: 'hi', name: 'Hindi' },
  { code: 'es', name: 'Spanish' },
  { code: 'fr', name: 'French' },
  { code: 'de', name: 'German' },
  { code: 'zh', name: 'Chinese' },
  { code: 'ja', name: 'Japanese' },
  { code: 'ko', name: 'Korean' },
  { code: 'pt', name: 'Portuguese' },
  { code: 'ru', name: 'Russian' },
  { code: 'tr', name: 'Turkish' },
];

// Ensure directory exists
const ensureDirectory = async () => {
  try {
    await fs.mkdir(AUDIO_DIR, { recursive: true });
  } catch (error) {
    logger.error('Failed to create audio directory:', error);
  }
};
ensureDirectory();

// ============================================
// Multer Configuration
// ============================================

const storage = multer.diskStorage({
  destination: (_req, _file, cb) => {
    cb(null, AUDIO_DIR);
  },
  filename: (_req, file, cb) => {
    const ext = path.extname(file.originalname).toLowerCase() || '.mp3';
    const uniqueName = `${uuidv4()}${ext}`;
    cb(null, uniqueName);
  },
});

const fileFilter = (
  _req: Request,
  file: Express.Multer.File,
  cb: FileFilterCallback
) => {
  if (ALLOWED_FORMATS.includes(file.mimetype)) {
    cb(null, true);
  } else {
    cb(new Error(`Invalid audio format. Allowed: MP3, WAV, OGG, WEBM, FLAC, M4A`));
  }
};

export const audioUpload = multer({
  storage,
  fileFilter,
  limits: {
    fileSize: MAX_FILE_SIZE,
    files: 1,
  },
});

// ============================================
// Audio Service Class
// ============================================

class AudioServiceClass {
  private openai: OpenAI | null = null;

  constructor() {
    // Initialize OpenAI if key available
    const openRouterKey = config.providers.openRouter.keys[0];
    if (openRouterKey) {
      this.openai = new OpenAI({
        apiKey: openRouterKey,
        baseURL: 'https://openrouter.ai/api/v1',
      });
    }
  }

  /**
   * Process uploaded audio file
   */
  public async processUpload(
    file: Express.Multer.File,
    userId: string,
    conversationId?: string
  ): Promise<AudioUploadResult> {
    const audioUrl = `/uploads/audio/${file.filename}`;
    const format = path.extname(file.filename).slice(1) || 'mp3';

    // Save to database
    await prisma.audio.create({
      data: {
        userId,
        conversationId,
        originalFilename: file.originalname,
        storedFilename: file.filename,
        fileSize: file.size,
        format,
        storageUrl: audioUrl,
      },
    });

    logger.info(`Audio uploaded: ${file.filename} by user ${userId}`);

    return {
      id: path.basename(file.filename, path.extname(file.filename)),
      originalName: file.originalname,
      storedName: file.filename,
      format,
      size: file.size,
      url: audioUrl,
    };
  }

  /**
   * Transcribe audio file using Groq Whisper (primary) or OpenAI (backup)
   */
  public async transcribe(
    audioPath: string,
    options: {
      language?: string;
      prompt?: string;
    } = {}
  ): Promise<TranscriptionResult> {
    const fullPath = path.isAbsolute(audioPath)
      ? audioPath
      : path.join(AUDIO_DIR, audioPath);

    // Try Groq Whisper first (free and fast)
    try {
      const result = await this.transcribeWithGroq(fullPath, options);
      if (result.success) return result;
    } catch (error) {
      logger.warn('Groq Whisper failed, trying backup:', error);
    }

    // Try OpenRouter Whisper as backup
    try {
      const result = await this.transcribeWithOpenRouter(fullPath, options);
      if (result.success) return result;
    } catch (error) {
      logger.warn('OpenRouter Whisper failed:', error);
    }

    return {
      success: false,
      error: 'All transcription providers failed. Please try again later.',
    };
  }

  /**
   * Transcribe using Groq Whisper
   */
  private async transcribeWithGroq(
    filePath: string,
    options: { language?: string; prompt?: string }
  ): Promise<TranscriptionResult> {
    const keyData = providerManager.getNextKey('groq');
    if (!keyData) {
      throw new Error('No Groq keys available');
    }

    try {
      const groq = new Groq({ apiKey: keyData.key });
      
      const transcription = await groq.audio.transcriptions.create({
        file: createReadStream(filePath),
        model: 'whisper-large-v3',
        language: options.language,
        prompt: options.prompt,
        response_format: 'verbose_json',
      });

      providerManager.markKeySuccess('groq', keyData.index);

      // Cast to access verbose_json fields
      const result = transcription as unknown as {
        text: string;
        language?: string;
        duration?: number;
      };

      return {
        success: true,
        text: result.text,
        language: result.language,
        duration: result.duration,
        provider: 'groq-whisper',
      };
    } catch (error: unknown) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      providerManager.markKeyError('groq', keyData.index, errorMessage);
      throw error;
    }
  }

  /**
   * Transcribe using OpenRouter (OpenAI Whisper)
   */
  private async transcribeWithOpenRouter(
    filePath: string,
    options: { language?: string; prompt?: string }
  ): Promise<TranscriptionResult> {
    const keyData = providerManager.getNextKey('openrouter');
    if (!keyData) {
      throw new Error('No OpenRouter keys available');
    }

    try {
      const openai = new OpenAI({
        apiKey: keyData.key,
        baseURL: 'https://openrouter.ai/api/v1',
      });

      const transcription = await openai.audio.transcriptions.create({
        file: createReadStream(filePath),
        model: 'whisper-1',
        language: options.language,
        prompt: options.prompt,
      });

      providerManager.markKeySuccess('openrouter', keyData.index);

      return {
        success: true,
        text: transcription.text,
        provider: 'openrouter-whisper',
      };
    } catch (error: unknown) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      providerManager.markKeyError('openrouter', keyData.index, errorMessage);
      throw error;
    }
  }

  /**
   * Transcribe and save to database
   */
  public async transcribeAndSave(
    audioId: string,
    userId: string,
    options: { language?: string } = {}
  ): Promise<TranscriptionResult> {
    // Get audio record
    const audio = await prisma.audio.findFirst({
      where: { id: audioId, userId },
    });

    if (!audio) {
      return { success: false, error: 'Audio file not found' };
    }

    // Check if already transcribed
    if (audio.transcription) {
      return {
        success: true,
        text: audio.transcription,
        language: audio.detectedLanguage || undefined,
        provider: audio.transcriptionModel || undefined,
      };
    }

    // Transcribe
    const result = await this.transcribe(audio.storedFilename, options);

    if (result.success && result.text) {
      // Update database
      await prisma.audio.update({
        where: { id: audioId },
        data: {
          transcription: result.text,
          detectedLanguage: result.language,
          confidence: result.confidence,
          transcriptionModel: result.provider,
          duration: result.duration,
        },
      });
    }

    return result;
  }

  /**
   * Voice chat: Upload audio → Transcribe → Get AI response
   */
  public async voiceChat(
    file: Express.Multer.File,
    userId: string,
    conversationId: string,
    options: { language?: string } = {}
  ): Promise<{
    success: boolean;
    transcription?: string;
    audioId?: string;
    error?: string;
  }> {
    try {
      // Upload audio
      const uploaded = await this.processUpload(file, userId, conversationId);

      // Get audio record
      const audio = await prisma.audio.findFirst({
        where: { storedFilename: uploaded.storedName },
      });

      if (!audio) {
        return { success: false, error: 'Failed to save audio' };
      }

      // Transcribe
      const transcription = await this.transcribe(uploaded.storedName, options);

      if (!transcription.success || !transcription.text) {
        return {
          success: false,
          error: transcription.error || 'Transcription failed',
        };
      }

      // Update audio with transcription
      await prisma.audio.update({
        where: { id: audio.id },
        data: {
          transcription: transcription.text,
          detectedLanguage: transcription.language,
          transcriptionModel: transcription.provider,
          duration: transcription.duration,
        },
      });

      return {
        success: true,
        transcription: transcription.text,
        audioId: audio.id,
      };
    } catch (error) {
      logger.error('Voice chat error:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Voice chat failed',
      };
    }
  }

  /**
   * Get audio file info
   */
  public async getAudioInfo(
    audioId: string,
    userId: string
  ): Promise<{
    success: boolean;
    audio?: {
      id: string;
      originalFilename: string;
      format: string;
      fileSize: number;
      duration?: number | null;
      transcription?: string | null;
      detectedLanguage?: string | null;
      createdAt: Date;
    };
    error?: string;
  }> {
    const audio = await prisma.audio.findFirst({
      where: { id: audioId, userId },
    });

    if (!audio) {
      return { success: false, error: 'Audio not found' };
    }

    return {
      success: true,
      audio: {
        id: audio.id,
        originalFilename: audio.originalFilename,
        format: audio.format,
        fileSize: audio.fileSize,
        duration: audio.duration,
        transcription: audio.transcription,
        detectedLanguage: audio.detectedLanguage,
        createdAt: audio.createdAt,
      },
    };
  }

  /**
   * Delete audio file
   */
  public async deleteAudio(audioId: string, userId: string): Promise<boolean> {
    const audio = await prisma.audio.findFirst({
      where: { id: audioId, userId },
    });

    if (!audio) return false;

    try {
      // Delete file
      const filePath = path.join(AUDIO_DIR, audio.storedFilename);
      await fs.unlink(filePath);

      // Delete database record
      await prisma.audio.delete({ where: { id: audioId } });

      logger.info(`Audio deleted: ${audio.storedFilename}`);
      return true;
    } catch (error) {
      logger.error('Delete audio error:', error);
      return false;
    }
  }

  /**
   * Get supported languages
   */
  public getSupportedLanguages() {
    return SUPPORTED_LANGUAGES;
  }

  /**
   * Get audio service health
   */
  public getHealth(): {
    available: boolean;
    providers: { groq: boolean; openrouter: boolean };
  } {
    return {
      available: providerManager.hasCapacity('groq') || providerManager.hasCapacity('openrouter'),
      providers: {
        groq: providerManager.hasCapacity('groq'),
        openrouter: providerManager.hasCapacity('openrouter'),
      },
    };
  }
}

// Export singleton
export const audioService = new AudioServiceClass();
export default audioService;
