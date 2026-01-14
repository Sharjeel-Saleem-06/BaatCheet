/**
 * Text-to-Speech (TTS) Service
 * Provides voice output capabilities with multiple provider support
 * 
 * Supported Providers:
 * - OpenAI TTS (best quality, paid)
 * - ElevenLabs (free tier: 10k chars/month per account - MULTIPLE KEYS)
 * - Google Cloud TTS (free tier: 1M chars/month)
 * - Browser Web Speech API (frontend fallback)
 * 
 * Features:
 * - Multi-key rotation for ElevenLabs (5 free accounts)
 * - Per-key usage tracking to stay within free tier
 * - Automatic failover when quota exceeded
 * 
 * @module TTSService
 */

import axios from 'axios';
import { logger } from '../utils/logger.js';

// ============================================
// Types
// ============================================

export interface TTSOptions {
  voice?: string;
  speed?: number;  // 0.25 to 4.0
  language?: string;
  format?: 'mp3' | 'opus' | 'aac' | 'flac';
}

export interface TTSResult {
  audioBuffer: Buffer;
  format: string;
  duration?: number;
  provider: string;
  keyIndex?: number;
}

export interface VoiceInfo {
  id: string;
  name: string;
  language: string;
  gender?: string;
  provider: string;
}

interface KeyUsage {
  charactersUsed: number;
  lastReset: Date;
  requestCount: number;
  lastUsed: Date;
  isExhausted: boolean;
}

// ============================================
// TTS Service Class
// ============================================

class TTSServiceClass {
  private readonly OPENAI_API_KEY = process.env.OPENAI_API_KEY || '';
  private readonly GOOGLE_CLOUD_KEY = process.env.GOOGLE_CLOUD_TTS_KEY || '';
  
  // ElevenLabs multi-key support (free tier: 10k chars/month each)
  private readonly ELEVENLABS_KEYS: string[] = [];
  private readonly ELEVENLABS_MONTHLY_LIMIT = 10000; // chars per key per month
  private readonly ELEVENLABS_DAILY_LIMIT = 500; // conservative daily limit per key
  private keyUsage: Map<number, KeyUsage> = new Map();
  private currentKeyIndex = 0;
  
  // OpenAI voices
  private readonly OPENAI_VOICES = ['alloy', 'echo', 'fable', 'onyx', 'nova', 'shimmer'];
  
  // Character limits per provider
  private readonly CHAR_LIMITS = {
    openai: 4096,
    elevenlabs: 2500, // Conservative limit per request
    google: 5000,
  };

  constructor() {
    // Load all ElevenLabs keys from environment
    this.loadElevenLabsKeys();
    this.initializeKeyUsage();
    
    // Reset usage daily at midnight
    this.scheduleDailyReset();
  }

  /**
   * Load ElevenLabs API keys from environment
   */
  private loadElevenLabsKeys(): void {
    // Support numbered keys: ELEVENLABS_API_KEY_1, ELEVENLABS_API_KEY_2, etc.
    for (let i = 1; i <= 10; i++) {
      const key = process.env[`ELEVENLABS_API_KEY_${i}`];
      if (key && key.startsWith('sk_')) {
        this.ELEVENLABS_KEYS.push(key);
        logger.info(`ElevenLabs key ${i} loaded (${key.substring(0, 10)}...)`);
      }
    }
    
    // Also support single key format
    const singleKey = process.env.ELEVENLABS_API_KEY;
    if (singleKey && singleKey.startsWith('sk_') && !this.ELEVENLABS_KEYS.includes(singleKey)) {
      this.ELEVENLABS_KEYS.push(singleKey);
    }
    
    logger.info(`ElevenLabs TTS initialized with ${this.ELEVENLABS_KEYS.length} API keys`);
    
    // If no keys loaded, log environment variable check (for debugging)
    if (this.ELEVENLABS_KEYS.length === 0) {
      logger.warn('No ElevenLabs API keys found. Check that ELEVENLABS_API_KEY_1 etc. are set correctly.');
    }
  }

  /**
   * Initialize usage tracking for all keys
   */
  private initializeKeyUsage(): void {
    for (let i = 0; i < this.ELEVENLABS_KEYS.length; i++) {
      this.keyUsage.set(i, {
        charactersUsed: 0,
        lastReset: new Date(),
        requestCount: 0,
        lastUsed: new Date(),
        isExhausted: false,
      });
    }
  }

  /**
   * Schedule daily usage reset
   */
  private scheduleDailyReset(): void {
    // Reset at midnight every day
    const now = new Date();
    const tomorrow = new Date(now);
    tomorrow.setDate(tomorrow.getDate() + 1);
    tomorrow.setHours(0, 0, 0, 0);
    
    const msUntilMidnight = tomorrow.getTime() - now.getTime();
    
    setTimeout(() => {
      this.resetDailyUsage();
      // Then reset every 24 hours
      setInterval(() => this.resetDailyUsage(), 24 * 60 * 60 * 1000);
    }, msUntilMidnight);
  }

  /**
   * Reset daily usage counters
   */
  private resetDailyUsage(): void {
    for (const [index, usage] of this.keyUsage.entries()) {
      // Only reset daily counters, keep monthly tracking
      const daysSinceReset = (Date.now() - usage.lastReset.getTime()) / (1000 * 60 * 60 * 24);
      
      if (daysSinceReset >= 30) {
        // Monthly reset
        this.keyUsage.set(index, {
          charactersUsed: 0,
          lastReset: new Date(),
          requestCount: 0,
          lastUsed: usage.lastUsed,
          isExhausted: false,
        });
        logger.info(`ElevenLabs key ${index + 1} monthly usage reset`);
      }
    }
  }

  /**
   * Get the best available ElevenLabs key
   */
  private getAvailableElevenLabsKey(): { key: string; index: number } | null {
    if (this.ELEVENLABS_KEYS.length === 0) {
      return null;
    }

    // Try to find a key with available quota
    for (let attempts = 0; attempts < this.ELEVENLABS_KEYS.length; attempts++) {
      const index = (this.currentKeyIndex + attempts) % this.ELEVENLABS_KEYS.length;
      const usage = this.keyUsage.get(index);
      
      if (usage && !usage.isExhausted && usage.charactersUsed < this.ELEVENLABS_MONTHLY_LIMIT) {
        // Update current key index for round-robin
        this.currentKeyIndex = (index + 1) % this.ELEVENLABS_KEYS.length;
        return { key: this.ELEVENLABS_KEYS[index], index };
      }
    }
    
    logger.warn('All ElevenLabs keys exhausted for this month');
    return null;
  }

  /**
   * Track usage for an ElevenLabs key
   */
  private trackElevenLabsUsage(keyIndex: number, characters: number, success: boolean): void {
    const usage = this.keyUsage.get(keyIndex);
    if (usage) {
      usage.charactersUsed += characters;
      usage.requestCount++;
      usage.lastUsed = new Date();
      
      if (!success || usage.charactersUsed >= this.ELEVENLABS_MONTHLY_LIMIT) {
        usage.isExhausted = true;
      }
      
      this.keyUsage.set(keyIndex, usage);
      
      logger.info(`ElevenLabs key ${keyIndex + 1} usage: ${usage.charactersUsed}/${this.ELEVENLABS_MONTHLY_LIMIT} chars`);
    }
  }

  /**
   * Get usage statistics for all ElevenLabs keys
   */
  public getElevenLabsUsageStats(): Array<{ keyIndex: number; usage: KeyUsage }> {
    const stats: Array<{ keyIndex: number; usage: KeyUsage }> = [];
    for (const [index, usage] of this.keyUsage.entries()) {
      stats.push({ keyIndex: index, usage });
    }
    return stats;
  }

  /**
   * Generate speech from text
   * Priority: ElevenLabs (free, multi-key) > Google Cloud (free tier) > OpenAI (paid)
   */
  public async generateSpeech(
    text: string,
    options: TTSOptions = {}
  ): Promise<TTSResult> {
    const { voice = 'alloy', speed = 1.0, language = 'en', format = 'mp3' } = options;
    
    // Validate and truncate text if needed (conservative limit for free tiers)
    const maxChars = this.CHAR_LIMITS.elevenlabs;
    const truncatedText = text.length > maxChars ? text.substring(0, maxChars) : text;
    
    // Log if text was truncated
    if (text.length > maxChars) {
      logger.warn(`TTS text truncated from ${text.length} to ${maxChars} characters`);
    }
    
    try {
      // Try ElevenLabs first (free tier with multi-key rotation)
      if (this.ELEVENLABS_KEYS.length > 0) {
        try {
          return await this.elevenLabsTTS(truncatedText, voice);
        } catch (elevenLabsError) {
          logger.warn('ElevenLabs TTS failed, trying fallback:', elevenLabsError);
        }
      }
      
      // Try Google Cloud TTS (free tier: 1M chars/month)
      if (this.GOOGLE_CLOUD_KEY) {
        try {
          return await this.googleTTS(truncatedText, language, voice);
        } catch (googleError) {
          logger.warn('Google TTS failed, trying fallback:', googleError);
        }
      }
      
      // Try OpenAI TTS last (paid, but best quality)
      if (this.OPENAI_API_KEY) {
        return await this.openAITTS(truncatedText, voice, speed, format);
      }
      
      throw new Error('No TTS service available. Please configure ELEVENLABS_API_KEY_1, GOOGLE_CLOUD_TTS_KEY, or OPENAI_API_KEY.');
      
    } catch (error) {
      logger.error('TTS generation failed:', error);
      throw error;
    }
  }

  /**
   * OpenAI TTS (highest quality)
   */
  private async openAITTS(
    text: string,
    voice: string,
    speed: number,
    format: string
  ): Promise<TTSResult> {
    // Validate voice
    const validVoice = this.OPENAI_VOICES.includes(voice) ? voice : 'alloy';
    
    // Validate speed (0.25 to 4.0)
    const validSpeed = Math.max(0.25, Math.min(4.0, speed));
    
    try {
      const response = await axios.post(
        'https://api.openai.com/v1/audio/speech',
        {
          model: 'tts-1', // or 'tts-1-hd' for higher quality
          voice: validVoice,
          input: text,
          speed: validSpeed,
          response_format: format,
        },
        {
          headers: {
            'Authorization': `Bearer ${this.OPENAI_API_KEY}`,
            'Content-Type': 'application/json',
          },
          responseType: 'arraybuffer',
          timeout: 30000,
        }
      );
      
      logger.info('OpenAI TTS completed', { 
        textLength: text.length, 
        voice: validVoice,
        speed: validSpeed 
      });
      
      return {
        audioBuffer: Buffer.from(response.data),
        format,
        provider: 'openai',
      };
    } catch (error: any) {
      logger.error('OpenAI TTS failed:', error.response?.data || error.message);
      throw new Error('OpenAI TTS failed');
    }
  }

  /**
   * ElevenLabs TTS with multi-key rotation
   */
  private async elevenLabsTTS(
    text: string,
    voiceId: string = 'EXAVITQu4vr4xnSDxMaL' // Default: Sarah
  ): Promise<TTSResult> {
    // Get available key
    const keyInfo = this.getAvailableElevenLabsKey();
    if (!keyInfo) {
      throw new Error('No ElevenLabs API keys available (quota exhausted)');
    }

    const { key, index } = keyInfo;
    const textLength = text.length;

    // Check if this request would exceed conservative limits
    const usage = this.keyUsage.get(index);
    if (usage && usage.charactersUsed + textLength > this.ELEVENLABS_MONTHLY_LIMIT * 0.95) {
      logger.warn(`ElevenLabs key ${index + 1} approaching limit, trying next key`);
      // Mark as exhausted and try next key
      this.trackElevenLabsUsage(index, 0, false);
      return this.elevenLabsTTS(text, voiceId); // Recursive call with next key
    }

    try {
      const response = await axios.post(
        `https://api.elevenlabs.io/v1/text-to-speech/${voiceId}`,
        {
          text,
          model_id: 'eleven_turbo_v2_5', // New free tier model (v1 is deprecated)
          voice_settings: {
            stability: 0.5,
            similarity_boost: 0.75,
          },
        },
        {
          headers: {
            'Accept': 'audio/mpeg',
            'Content-Type': 'application/json',
            'xi-api-key': key,
          },
          responseType: 'arraybuffer',
          timeout: 30000,
        }
      );
      
      // Track successful usage
      this.trackElevenLabsUsage(index, textLength, true);
      
      logger.info('ElevenLabs TTS completed', { 
        textLength, 
        voiceId,
        keyIndex: index + 1,
        totalKeys: this.ELEVENLABS_KEYS.length,
      });
      
      return {
        audioBuffer: Buffer.from(response.data),
        format: 'mp3',
        provider: 'elevenlabs',
        keyIndex: index,
      };
    } catch (error: any) {
      // Track failed usage
      this.trackElevenLabsUsage(index, textLength, false);
      
      // If quota exceeded or unauthorized, mark key and try next
      if (error.response?.status === 401 || error.response?.status === 429) {
        logger.warn(`ElevenLabs key ${index + 1} quota exceeded or invalid, trying next key`);
        
        // Try next key if available
        if (this.ELEVENLABS_KEYS.length > 1) {
          return this.elevenLabsTTS(text, voiceId);
        }
      }
      
      // Log the actual error for debugging
      const errorData = error.response?.data;
      const errorMsg = typeof errorData === 'string' ? errorData : 
        errorData?.detail?.message || errorData?.detail?.status || JSON.stringify(errorData) || error.message;
      
      logger.error('ElevenLabs TTS failed:', { status: error.response?.status, error: errorMsg });
      throw new Error(`ElevenLabs TTS failed: ${errorMsg}`);
    }
  }

  /**
   * Google Cloud TTS
   */
  private async googleTTS(
    text: string,
    languageCode: string = 'en-US',
    voiceName?: string
  ): Promise<TTSResult> {
    try {
      const response = await axios.post(
        `https://texttospeech.googleapis.com/v1/text:synthesize?key=${this.GOOGLE_CLOUD_KEY}`,
        {
          input: { text },
          voice: {
            languageCode,
            name: voiceName || `${languageCode}-Standard-A`,
          },
          audioConfig: {
            audioEncoding: 'MP3',
            speakingRate: 1.0,
            pitch: 0,
          },
        },
        {
          headers: {
            'Content-Type': 'application/json',
          },
          timeout: 30000,
        }
      );
      
      // Google returns base64 encoded audio
      const audioBuffer = Buffer.from(response.data.audioContent, 'base64');
      
      logger.info('Google TTS completed', { textLength: text.length, languageCode });
      
      return {
        audioBuffer,
        format: 'mp3',
        provider: 'google',
      };
    } catch (error: any) {
      logger.error('Google TTS failed:', error.response?.data || error.message);
      throw new Error('Google TTS failed');
    }
  }

  /**
   * Get available voices
   */
  public getAvailableVoices(): VoiceInfo[] {
    const voices: VoiceInfo[] = [];
    
    // ElevenLabs voices (free tier - prioritized)
    if (this.ELEVENLABS_KEYS.length > 0) {
      voices.push(
        // Pre-made voices (free to use)
        { id: 'EXAVITQu4vr4xnSDxMaL', name: 'Sarah', language: 'en', gender: 'female', provider: 'elevenlabs' },
        { id: '21m00Tcm4TlvDq8ikWAM', name: 'Rachel', language: 'en', gender: 'female', provider: 'elevenlabs' },
        { id: 'AZnzlk1XvdvUeBnXmlld', name: 'Domi', language: 'en', gender: 'female', provider: 'elevenlabs' },
        { id: 'MF3mGyEYCl7XYWbV9V6O', name: 'Elli', language: 'en', gender: 'female', provider: 'elevenlabs' },
        { id: 'TxGEqnHWrfWFTfGW9XjX', name: 'Josh', language: 'en', gender: 'male', provider: 'elevenlabs' },
        { id: 'VR6AewLTigWG4xSOukaG', name: 'Arnold', language: 'en', gender: 'male', provider: 'elevenlabs' },
        { id: 'pNInz6obpgDQGcFmaJgB', name: 'Adam', language: 'en', gender: 'male', provider: 'elevenlabs' },
        { id: 'yoZ06aMxZJJ28mfd3POQ', name: 'Sam', language: 'en', gender: 'male', provider: 'elevenlabs' },
      );
    }
    
    // OpenAI voices (paid)
    if (this.OPENAI_API_KEY) {
      voices.push(
        { id: 'alloy', name: 'Alloy', language: 'en', gender: 'neutral', provider: 'openai' },
        { id: 'echo', name: 'Echo', language: 'en', gender: 'male', provider: 'openai' },
        { id: 'fable', name: 'Fable', language: 'en', gender: 'neutral', provider: 'openai' },
        { id: 'onyx', name: 'Onyx', language: 'en', gender: 'male', provider: 'openai' },
        { id: 'nova', name: 'Nova', language: 'en', gender: 'female', provider: 'openai' },
        { id: 'shimmer', name: 'Shimmer', language: 'en', gender: 'female', provider: 'openai' },
      );
    }
    
    return voices;
  }

  /**
   * Check if TTS is available
   */
  public isAvailable(): boolean {
    return !!(this.OPENAI_API_KEY || this.ELEVENLABS_KEYS.length > 0 || this.GOOGLE_CLOUD_KEY);
  }

  /**
   * Reset all key usage (useful for debugging or manual reset)
   */
  public resetAllKeyUsage(): void {
    this.initializeKeyUsage();
    logger.info('All ElevenLabs key usage has been reset');
  }

  /**
   * Get provider info with detailed status
   */
  public getProviderInfo(): { 
    provider: string; 
    available: boolean;
    elevenLabsKeys?: number;
    elevenLabsAvailable?: number;
  } {
    // Check ElevenLabs first (preferred for free tier)
    if (this.ELEVENLABS_KEYS.length > 0) {
      // If keyUsage is empty, reinitialize it
      if (this.keyUsage.size === 0) {
        this.initializeKeyUsage();
      }
      
      const availableKeys = Array.from(this.keyUsage.values())
        .filter(u => !u.isExhausted && u.charactersUsed < this.ELEVENLABS_MONTHLY_LIMIT)
        .length;
      
      return { 
        provider: 'elevenlabs', 
        available: availableKeys > 0 || this.keyUsage.size === 0, // If empty, assume available
        elevenLabsKeys: this.ELEVENLABS_KEYS.length,
        elevenLabsAvailable: availableKeys || this.ELEVENLABS_KEYS.length,
      };
    }
    if (this.GOOGLE_CLOUD_KEY) {
      return { provider: 'google', available: true };
    }
    if (this.OPENAI_API_KEY) {
      return { provider: 'openai', available: true };
    }
    return { provider: 'none', available: false };
  }

  /**
   * Estimate audio duration (rough estimate)
   */
  public estimateDuration(text: string, speed: number = 1.0): number {
    // Average speaking rate: ~150 words per minute
    const words = text.split(/\s+/).length;
    const minutes = words / (150 * speed);
    return Math.ceil(minutes * 60); // Return seconds
  }
}

// Export singleton instance
export const ttsService = new TTSServiceClass();
export default ttsService;
