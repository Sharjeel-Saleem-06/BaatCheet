/**
 * Text-to-Speech (TTS) Service
 * Provides voice output capabilities with multiple provider support
 * 
 * Supported Providers (in order of preference):
 * 1. Edge TTS (Microsoft) - FREE, NO API KEY, excellent Urdu voices!
 * 2. ElevenLabs (free tier: 10k chars/month per account)
 * 3. Google Cloud TTS (free tier: 1M chars/month)
 * 4. OpenAI TTS (paid, best quality)
 * 5. Google Translate TTS (free, no API key, fallback)
 * 
 * Features:
 * - Edge TTS as primary (FREE, unlimited, Urdu support)
 * - Multi-key rotation for ElevenLabs
 * - Automatic failover between providers
 * 
 * @module TTSService
 */

import axios from 'axios';
import { logger } from '../utils/logger.js';

// Edge TTS - Microsoft's FREE TTS service
// Supports 400+ voices including excellent Urdu voices
// NO API KEY REQUIRED!
import { tts as edgeTtsGenerate, getVoices as getEdgeVoices } from 'edge-tts';

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
   * Supports multiple naming patterns for maximum flexibility
   */
  private loadElevenLabsKeys(): void {
    // Support ALL possible naming conventions
    const keyPatterns = [
      'ELEVENLABS_API_KEY_',    // Standard: ELEVENLABS_API_KEY_1
      'ElevenLabs_API_',        // Alt: ElevenLabs_API_1 (HuggingFace format)
      'ELEVENLABS_API_',        // Alt: ELEVENLABS_API_1
      'ELEVEN_LABS_KEY_',       // Alt: ELEVEN_LABS_KEY_1
      'ELEVENLABS_KEY_',        // Alt: ELEVENLABS_KEY_1
      'ElevenLabs_API_KEY_',    // Alt: ElevenLabs_API_KEY_1
      'elevenlabs_api_key_',    // Alt: lowercase
      'elevenlabs_api_',        // Alt: lowercase
    ];
    
    // Debug: Log all environment variables that might contain ElevenLabs keys
    const allEnvKeys = Object.keys(process.env).filter(k => 
      k.toLowerCase().includes('eleven')
    );
    logger.info(`Found ${allEnvKeys.length} ElevenLabs env vars: ${allEnvKeys.join(', ')}`);
    
    // Try each env var that contains 'eleven' directly
    for (const envKey of allEnvKeys) {
      const key = process.env[envKey];
      if (key) {
        logger.info(`Checking ${envKey}: ${key.substring(0, 8)}...`);
        // Accept any key that looks like an API key (not just sk_ prefix)
        // Some ElevenLabs keys may have different prefixes
        if (key.length > 10 && !this.ELEVENLABS_KEYS.includes(key)) {
          this.ELEVENLABS_KEYS.push(key);
          logger.info(`✅ Loaded ElevenLabs key from ${envKey}`);
        }
      }
    }
    
    // Also try numbered patterns explicitly
    for (let i = 1; i <= 10; i++) {
      for (const pattern of keyPatterns) {
        const envKey = `${pattern}${i}`;
        const key = process.env[envKey];
        if (key && key.length > 10 && !this.ELEVENLABS_KEYS.includes(key)) {
          this.ELEVENLABS_KEYS.push(key);
          logger.info(`✅ Loaded ElevenLabs key from ${envKey}`);
          break;
        }
      }
    }
    
    // Also support single key format
    const singleKey = process.env.ELEVENLABS_API_KEY;
    if (singleKey && singleKey.length > 10 && !this.ELEVENLABS_KEYS.includes(singleKey)) {
      this.ELEVENLABS_KEYS.push(singleKey);
      logger.info('✅ Loaded single ELEVENLABS_API_KEY');
    }
    
    logger.info(`🎤 ElevenLabs TTS initialized with ${this.ELEVENLABS_KEYS.length} API keys`);
    
    if (this.ELEVENLABS_KEYS.length === 0) {
      logger.warn('⚠️ No ElevenLabs API keys found!');
      logger.warn('Expected patterns: ElevenLabs_API_1, ELEVENLABS_API_KEY_1, etc.');
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
    
    // Also reset exhausted keys every hour (they might be temporarily blocked)
    setInterval(() => {
      this.resetExhaustedKeys();
    }, 60 * 60 * 1000); // Every hour
  }
  
  /**
   * Reset exhausted keys (they might be available again after some time)
   */
  private resetExhaustedKeys(): void {
    let resetCount = 0;
    for (const [index, usage] of this.keyUsage.entries()) {
      if (usage.isExhausted && usage.charactersUsed < this.ELEVENLABS_MONTHLY_LIMIT * 0.8) {
        // Only reset if we haven't actually hit the limit
        usage.isExhausted = false;
        this.keyUsage.set(index, usage);
        resetCount++;
      }
    }
    if (resetCount > 0) {
      logger.info(`Reset ${resetCount} ElevenLabs keys (were marked exhausted but may be available)`);
    }
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
   * Priority: Edge TTS (FREE!) > ElevenLabs > Google Cloud > OpenAI > Google Translate
   */
  public async generateSpeech(
    text: string,
    options: TTSOptions = {}
  ): Promise<TTSResult> {
    const { voice = 'alloy', speed = 1.0, language = 'en', format = 'mp3' } = options;
    
    // Validate and truncate text if needed
    const maxChars = 5000; // Edge TTS supports long text
    const truncatedText = text.length > maxChars ? text.substring(0, maxChars) : text;
    
    // Log if text was truncated
    if (text.length > maxChars) {
      logger.warn(`TTS text truncated from ${text.length} to ${maxChars} characters`);
    }
    
    try {
      // ============================================
      // 🥇 PRIMARY: Edge TTS (Microsoft) - FREE, NO API KEY!
      // Best quality for Urdu, unlimited usage
      // ============================================
      try {
        logger.info('Trying Edge TTS (FREE, best for Urdu)...');
        return await this.edgeTTS(truncatedText, voice);
      } catch (edgeError: any) {
        logger.warn('Edge TTS failed:', edgeError.message);
      }
      
      // 🥈 SECONDARY: ElevenLabs (if configured)
      if (this.ELEVENLABS_KEYS.length > 0) {
        try {
          logger.info('Trying ElevenLabs TTS...');
          return await this.elevenLabsTTS(truncatedText, voice);
        } catch (elevenLabsError) {
          logger.warn('ElevenLabs TTS failed, trying fallback:', elevenLabsError);
        }
      }
      
      // 🥉 TERTIARY: Google Cloud TTS (free tier)
      if (this.GOOGLE_CLOUD_KEY) {
        try {
          return await this.googleTTS(truncatedText, language, voice);
        } catch (googleError) {
          logger.warn('Google TTS failed, trying fallback:', googleError);
        }
      }
      
      // OpenAI TTS (paid)
      if (this.OPENAI_API_KEY) {
        try {
          return await this.openAITTS(truncatedText, voice, speed, format);
        } catch (openaiError) {
          logger.warn('OpenAI TTS failed, trying free fallback:', openaiError);
        }
      }
      
      // FINAL FALLBACK: Google Translate TTS (completely FREE, no API key needed!)
      // This uses the same TTS as Google Translate - works for Urdu, Hindi, English
      try {
        logger.info('Using free Google Translate TTS as final fallback');
        return await this.googleTranslateTTS(truncatedText, language);
      } catch (gttsFallbackError) {
        logger.error('All TTS providers failed including free fallback:', gttsFallbackError);
      }
      
      throw new Error('All TTS services failed. ElevenLabs keys may be exhausted or blocked.');
      
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
   * Detect if text contains Urdu/Hindi/Arabic characters or Roman Urdu
   * Roman Urdu is written in Latin script but uses Urdu/Hindi words
   */
  private detectLanguage(text: string): 'urdu' | 'arabic' | 'hindi' | 'english' | 'mixed' {
    // Urdu/Arabic character range (includes Persian, Urdu-specific characters)
    const urduArabicPattern = /[\u0600-\u06FF\u0750-\u077F\uFB50-\uFDFF\uFE70-\uFEFF]/;
    // Devanagari (Hindi) character range
    const hindiPattern = /[\u0900-\u097F]/;
    
    const hasUrduArabic = urduArabicPattern.test(text);
    const hasHindi = hindiPattern.test(text);
    const hasEnglish = /[a-zA-Z]/.test(text);
    
    // Check for pure script
    if (hasUrduArabic && !hasEnglish) return 'urdu';
    if (hasHindi && !hasEnglish) return 'hindi';
    if (hasUrduArabic && hasEnglish) return 'mixed';
    if (hasHindi && hasEnglish) return 'mixed';
    
    // Check for Roman Urdu (Latin script but Urdu/Hindi words)
    // Common Roman Urdu words/phrases
    const romanUrduPatterns = [
      /\b(kya|hai|hain|nahi|aap|app|mein|main|tera|mera|kaise|kaisa|theek|thik|ho|haan|ji|yaar|bhai|sunao|sab|accha|acha|bohut|bahut|baat|chal|chalo|raha|rahi|kar|karo|dekh|dekho|chal|haal|kiya|karo|abhi|phir|lekin|aur|se|ko|pe|par|wala|wali|hoga|hogi|hein|aisa|waisa|jaldi|tum|tumhara)\b/gi,
    ];
    
    const textLower = text.toLowerCase();
    let romanUrduScore = 0;
    
    // Count Roman Urdu words
    for (const pattern of romanUrduPatterns) {
      const matches = textLower.match(pattern);
      if (matches) {
        romanUrduScore += matches.length;
      }
    }
    
    // If we found multiple Roman Urdu words, treat as mixed
    if (romanUrduScore >= 2) {
      return 'mixed';
    }
    
    return 'english';
  }
  
  /**
   * Get recommended voice for language
   */
  private getRecommendedVoice(language: 'urdu' | 'arabic' | 'hindi' | 'english' | 'mixed'): string {
    switch (language) {
      case 'urdu':
      case 'arabic':
        // Bill is great for Urdu content
        return 'pqHfZKP75CvOlQylNhV4'; // Bill
      case 'hindi':
        // Nicole works well for Hindi
        return 'piTKgcLEGmPE4e6mEKli'; // Nicole
      case 'mixed':
        // Charlotte is best for mixed Urdu/English (Roman Urdu)
        return 'XB0fDUnXU5powFXDhCwa'; // Charlotte
      case 'english':
      default:
        return 'EXAVITQu4vr4xnSDxMaL'; // Sarah
    }
  }
  
  // ============================================
  // EDGE TTS VOICES (Microsoft FREE)
  // These are excellent quality, no API key needed!
  // ============================================
  private readonly EDGE_TTS_VOICES = {
    // Urdu voices - EXCELLENT quality!
    'ur-PK-AsadNeural': { name: 'Asad', language: 'ur', gender: 'male', description: 'Pakistani Urdu male - clear and natural' },
    'ur-PK-UzmaNeural': { name: 'Uzma', language: 'ur', gender: 'female', description: 'Pakistani Urdu female - warm and friendly' },
    'ur-IN-GulNeural': { name: 'Gul', language: 'ur', gender: 'female', description: 'Indian Urdu female' },
    'ur-IN-SalmanNeural': { name: 'Salman', language: 'ur', gender: 'male', description: 'Indian Urdu male' },
    // Hindi voices (good for Roman Urdu too)
    'hi-IN-MadhurNeural': { name: 'Madhur', language: 'hi', gender: 'male', description: 'Hindi male - expressive' },
    'hi-IN-SwaraNeural': { name: 'Swara', language: 'hi', gender: 'female', description: 'Hindi female - natural' },
    // English voices
    'en-US-JennyNeural': { name: 'Jenny', language: 'en', gender: 'female', description: 'American English female' },
    'en-US-GuyNeural': { name: 'Guy', language: 'en', gender: 'male', description: 'American English male' },
    'en-GB-SoniaNeural': { name: 'Sonia', language: 'en', gender: 'female', description: 'British English female' },
  };

  /**
   * Get the best Edge TTS voice for the detected language
   */
  private getEdgeTTSVoice(language: 'urdu' | 'arabic' | 'hindi' | 'english' | 'mixed'): string {
    switch (language) {
      case 'urdu':
      case 'arabic':
        return 'ur-PK-AsadNeural'; // Best for pure Urdu
      case 'hindi':
        return 'hi-IN-MadhurNeural'; // Best for Hindi
      case 'mixed':
        // For Roman Urdu, use Hindi voice - sounds more natural
        return 'hi-IN-MadhurNeural';
      case 'english':
      default:
        return 'en-US-GuyNeural';
    }
  }

  /**
   * Edge TTS - Microsoft's FREE Text-to-Speech
   * 
   * FEATURES:
   * - 100% FREE, no API key needed!
   * - Excellent Urdu voices (ur-PK-AsadNeural, ur-PK-UzmaNeural)
   * - Natural, human-like speech
   * - Supports 400+ voices in 100+ languages
   * - No rate limits for normal use
   * 
   * URDU VOICES:
   * - ur-PK-AsadNeural (Male, Pakistani Urdu) - BEST for pure Urdu
   * - ur-PK-UzmaNeural (Female, Pakistani Urdu) - Warm and friendly
   * - ur-IN-GulNeural (Female, Indian Urdu)
   * - ur-IN-SalmanNeural (Male, Indian Urdu)
   */
  private async edgeTTS(text: string, requestedVoice?: string): Promise<TTSResult> {
    try {
      // Detect language and select appropriate voice
      const detectedLang = this.detectLanguage(text);
      let voiceId = this.getEdgeTTSVoice(detectedLang);
      
      // If a specific voice was requested and it's an Edge voice, use it
      if (requestedVoice && requestedVoice.includes('Neural')) {
        voiceId = requestedVoice;
      }
      
      logger.info(`Edge TTS: Language=${detectedLang}, Voice=${voiceId}, TextLength=${text.length}`);
      
      // Generate audio using edge-tts package
      // This is Microsoft's FREE TTS service - no API key needed!
      const audioBuffer = await edgeTtsGenerate(text, { voice: voiceId });
      
      logger.info(`✅ Edge TTS SUCCESS: ${audioBuffer.length} bytes, Voice: ${voiceId}`);
      
      return {
        audioBuffer,
        format: 'mp3',
        provider: 'edge-tts',
      };
    } catch (error: any) {
      logger.error('Edge TTS failed:', error.message);
      throw new Error(`Edge TTS failed: ${error.message}`);
    }
  }

  /**
   * ElevenLabs TTS with multi-key rotation and automatic language detection
   * Supports 29+ languages including Urdu, Hindi, Arabic, etc.
   */
  private async elevenLabsTTS(
    text: string,
    voiceId?: string
  ): Promise<TTSResult> {
    // Log the number of available keys for debugging
    logger.info(`ElevenLabs: Attempting TTS with ${this.ELEVENLABS_KEYS.length} available keys`);
    
    // Get available key
    const keyInfo = this.getAvailableElevenLabsKey();
    if (!keyInfo) {
      logger.error('ElevenLabs: No API keys available - all exhausted or none configured');
      throw new Error('No ElevenLabs API keys available (quota exhausted or not configured)');
    }

    const { key, index } = keyInfo;
    const textLength = text.length;
    
    logger.info(`ElevenLabs: Using key ${index + 1}, key starts with: ${key.substring(0, 8)}...`);
    
    // Auto-detect language and select appropriate voice if not specified
    const detectedLanguage = this.detectLanguage(text);
    
    // Use OFFICIAL FREE voices that are guaranteed to work
    // These are the pre-made voices available on all ElevenLabs accounts
    const selectedVoice = voiceId || this.getRecommendedVoice(detectedLanguage);
    
    logger.info(`TTS language detection: ${detectedLanguage}, using voice: ${selectedVoice}`);

    // Check if this request would exceed conservative limits
    const usage = this.keyUsage.get(index);
    if (usage && usage.charactersUsed + textLength > this.ELEVENLABS_MONTHLY_LIMIT * 0.95) {
      logger.warn(`ElevenLabs key ${index + 1} approaching limit, trying next key`);
      // Mark as exhausted and try next key
      this.trackElevenLabsUsage(index, 0, false);
      return this.elevenLabsTTS(text, selectedVoice); // Recursive call with next key
    }

    try {
      // Use eleven_multilingual_v2 for ALL languages - best quality and most human-like
      // Multilingual v2 supports 29 languages including Urdu, Hindi, Arabic
      // Reference: https://elevenlabs.io/docs/developer-guides/models
      const modelId = 'eleven_multilingual_v2';
      
      // ============================================
      // OPTIMAL VOICE SETTINGS FOR HUMAN-LIKE SPEECH
      // ============================================
      // These settings are tuned for natural, conversational speech
      // Based on ElevenLabs best practices and community testing
      
      // Stability: Lower = more expressive variations (like real humans)
      // 0.30-0.45 is ideal for natural conversation
      const stability = 0.35;
      
      // Similarity Boost: How close to the original voice
      // 0.75-0.85 maintains voice identity while allowing natural variation
      const similarityBoost = 0.80;
      
      // Style: Expressiveness exaggeration (only for v2 models)
      // 0.20-0.40 adds natural emphasis and intonation
      const style = 0.30;
      
      // Speaker Boost: Enhances voice clarity and presence
      const useSpeakerBoost = true;
      
      const response = await axios.post(
        `https://api.elevenlabs.io/v1/text-to-speech/${selectedVoice}`,
        {
          text,
          model_id: modelId,
          voice_settings: {
            stability,
            similarity_boost: similarityBoost,
            style,
            use_speaker_boost: useSpeakerBoost,
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
      
      // Detailed error logging
      const statusCode = error.response?.status;
      const errorData = error.response?.data;
      let errorMsg = '';
      
      // Parse error message from various formats
      if (Buffer.isBuffer(errorData)) {
        try {
          const jsonStr = errorData.toString('utf-8');
          const parsed = JSON.parse(jsonStr);
          errorMsg = parsed?.detail?.message || parsed?.detail || parsed?.error || jsonStr;
        } catch {
          errorMsg = errorData.toString('utf-8').substring(0, 200);
        }
      } else if (typeof errorData === 'string') {
        errorMsg = errorData;
      } else if (errorData?.detail) {
        errorMsg = typeof errorData.detail === 'string' ? errorData.detail : JSON.stringify(errorData.detail);
      } else {
        errorMsg = error.message;
      }
      
      logger.error(`❌ ElevenLabs TTS FAILED [Key ${index + 1}]:`, {
        status: statusCode,
        error: errorMsg,
        keyPrefix: key.substring(0, 10),
        voice: selectedVoice,
        textLength,
      });
      
      // Handle different error types
      if (statusCode === 429) {
        // Rate limited - mark key as exhausted and try next
        logger.warn(`ElevenLabs key ${index + 1} rate limited (429), marking exhausted`);
        const usage = this.keyUsage.get(index);
        if (usage) {
          usage.isExhausted = true;
          this.keyUsage.set(index, usage);
        }
        if (this.ELEVENLABS_KEYS.length > 1) {
          return this.elevenLabsTTS(text, voiceId);
        }
      } else if (statusCode === 401) {
        // Unauthorized - key might be invalid, mark exhausted
        logger.warn(`ElevenLabs key ${index + 1} unauthorized (401), marking exhausted`);
        const usage = this.keyUsage.get(index);
        if (usage) {
          usage.isExhausted = true;
          this.keyUsage.set(index, usage);
        }
        if (this.ELEVENLABS_KEYS.length > 1) {
          return this.elevenLabsTTS(text, voiceId);
        }
      } else if (statusCode === 422) {
        // Voice not found or invalid request - DON'T mark exhausted, just try with default voice
        logger.warn(`ElevenLabs key ${index + 1} got 422 (maybe voice issue), trying default voice...`);
        if (selectedVoice !== '21m00Tcm4TlvDq8ikWAM') {
          // Try with Rachel (default ElevenLabs voice that always works)
          return this.elevenLabsTTS(text, '21m00Tcm4TlvDq8ikWAM');
        }
      }
      
      throw new Error(`ElevenLabs TTS failed (${statusCode}): ${errorMsg}`);
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
   * Google Translate TTS - COMPLETELY FREE, NO API KEY NEEDED!
   * Uses the same TTS engine as Google Translate
   * Supports 100+ languages including Urdu (ur), Hindi (hi), Arabic (ar)
   * 
   * Limitations:
   * - Max ~200 characters per request
   * - Slightly robotic voice quality
   * - Rate limited (but generous for normal use)
   */
  private async googleTranslateTTS(
    text: string,
    languageHint: string = 'en'
  ): Promise<TTSResult> {
    try {
      // Detect language for proper TTS
      const detectedLang = this.detectLanguage(text);
      let langCode = 'en';
      
      // For Roman Urdu (text like "kya haal hai"), use Hindi which sounds better
      // than English or pure Urdu for romanized text
      switch (detectedLang) {
        case 'urdu':
        case 'arabic':
          langCode = 'ur'; // Pure Urdu script
          break;
        case 'hindi':
          langCode = 'hi'; // Hindi
          break;
        case 'mixed':
          // For Roman Urdu (mix of English and Urdu in Latin script)
          // Use Hindi 'hi' instead of English - sounds MUCH more natural
          // for words like "sab theek hai", "aapke internship kaisa"
          langCode = 'hi';
          break;
        default:
          langCode = 'en';
      }
      
      // Split text into chunks of ~200 chars (Google Translate limit)
      const maxChunkSize = 200;
      const chunks: string[] = [];
      
      for (let i = 0; i < text.length; i += maxChunkSize) {
        chunks.push(text.slice(i, i + maxChunkSize));
      }
      
      // Fetch audio for each chunk
      const audioChunks: Buffer[] = [];
      
      for (const chunk of chunks) {
        // URL encode the text
        const encodedText = encodeURIComponent(chunk);
        
        // Google Translate TTS URL (no API key needed!)
        const url = `https://translate.google.com/translate_tts?ie=UTF-8&q=${encodedText}&tl=${langCode}&client=tw-ob`;
        
        const response = await axios.get(url, {
          responseType: 'arraybuffer',
          headers: {
            'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
            'Referer': 'https://translate.google.com/',
          },
          timeout: 15000,
        });
        
        audioChunks.push(Buffer.from(response.data));
      }
      
      // Combine all audio chunks
      const combinedAudio = Buffer.concat(audioChunks);
      
      logger.info('Google Translate TTS completed (free fallback)', { 
        textLength: text.length, 
        langCode,
        chunks: chunks.length 
      });
      
      return {
        audioBuffer: combinedAudio,
        format: 'mp3',
        provider: 'google-translate-free',
      };
    } catch (error: any) {
      logger.error('Google Translate TTS failed:', error.message);
      throw new Error('Google Translate TTS failed');
    }
  }

  /**
   * Get available voices
   * ElevenLabs supports 29 languages including Urdu, Hindi, Arabic, and more
   * Reference: https://elevenlabs.io/languages
   */
  public getAvailableVoices(): VoiceInfo[] {
    const voices: VoiceInfo[] = [];
    
    // ============================================
    // 🥇 EDGE TTS VOICES (Microsoft FREE - BEST QUALITY!)
    // These are always available, no API key needed
    // ============================================
    voices.push(
      // URDU VOICES - Pakistani (RECOMMENDED)
      { id: 'ur-PK-AsadNeural', name: 'Asad (اردو)', language: 'ur', gender: 'male', provider: 'edge-tts' },
      { id: 'ur-PK-UzmaNeural', name: 'Uzma (اردو)', language: 'ur', gender: 'female', provider: 'edge-tts' },
      // URDU VOICES - Indian
      { id: 'ur-IN-GulNeural', name: 'Gul (اردو)', language: 'ur', gender: 'female', provider: 'edge-tts' },
      { id: 'ur-IN-SalmanNeural', name: 'Salman (اردو)', language: 'ur', gender: 'male', provider: 'edge-tts' },
      // HINDI VOICES (Great for Roman Urdu too)
      { id: 'hi-IN-MadhurNeural', name: 'Madhur (हिंदी)', language: 'hi', gender: 'male', provider: 'edge-tts' },
      { id: 'hi-IN-SwaraNeural', name: 'Swara (हिंदी)', language: 'hi', gender: 'female', provider: 'edge-tts' },
      // ENGLISH VOICES
      { id: 'en-US-JennyNeural', name: 'Jenny', language: 'en', gender: 'female', provider: 'edge-tts' },
      { id: 'en-US-GuyNeural', name: 'Guy', language: 'en', gender: 'male', provider: 'edge-tts' },
      { id: 'en-GB-SoniaNeural', name: 'Sonia (British)', language: 'en', gender: 'female', provider: 'edge-tts' },
      { id: 'en-GB-RyanNeural', name: 'Ryan (British)', language: 'en', gender: 'male', provider: 'edge-tts' },
    );
    
    // ElevenLabs voices (if configured - as backup)
    if (this.ELEVENLABS_KEYS.length > 0) {
      voices.push(
        // ============================================
        // English Voices (Natural, Human-like)
        // ============================================
        { id: 'EXAVITQu4vr4xnSDxMaL', name: 'Sarah', language: 'en', gender: 'female', provider: 'elevenlabs' },
        { id: '21m00Tcm4TlvDq8ikWAM', name: 'Rachel', language: 'en', gender: 'female', provider: 'elevenlabs' },
        { id: 'TxGEqnHWrfWFTfGW9XjX', name: 'Josh', language: 'en', gender: 'male', provider: 'elevenlabs' },
        { id: 'pNInz6obpgDQGcFmaJgB', name: 'Adam', language: 'en', gender: 'male', provider: 'elevenlabs' },
        
        // URDU VOICES (ElevenLabs multilingual)
        { id: 'pqHfZKP75CvOlQylNhV4', name: 'Bilal (اردو)', language: 'ur', gender: 'male', provider: 'elevenlabs' },
        { id: 'XB0fDUnXU5powFXDhCwa', name: 'Arooj', language: 'ur', gender: 'female', provider: 'elevenlabs' },
        
        // Nadia - Warm feminine voice, great for Hindi/Urdu
        { id: 'piTKgcLEGmPE4e6mEKli', name: 'Nadia', language: 'ur', gender: 'female', provider: 'elevenlabs' },
        
        // ============================================
        // Multilingual Voices (Support multiple languages)
        // ============================================
        
        // Aria - Expressive multilingual voice
        { id: '9BWtsMINqrJLrRacOk9x', name: 'Aria', language: 'multilingual', gender: 'female', provider: 'elevenlabs' },
        
        // Roger - Deep male multilingual voice
        { id: 'CwhRBWXzGAHq8TQ4Fs17', name: 'Roger', language: 'multilingual', gender: 'male', provider: 'elevenlabs' },
        
        // Sarah - Soft multilingual voice (different from English Sarah)
        { id: 'EXAVITQu4vr4xnSDxMaL', name: 'Sarah (Soft)', language: 'multilingual', gender: 'female', provider: 'elevenlabs' },
        
        // George - Professional multilingual male voice
        { id: 'JBFqnCBsd6RMkjVDRZzb', name: 'George', language: 'multilingual', gender: 'male', provider: 'elevenlabs' },
        
        // Lily - British accent, works well with Urdu-English mix
        { id: 'pFZP5JQG7iQjIQuC4Bku', name: 'Lily', language: 'multilingual', gender: 'female', provider: 'elevenlabs' },
        
        // Callum - Warm and friendly, good for storytelling
        { id: 'N2lVS1w4EtoT3dr4eOWO', name: 'Callum', language: 'multilingual', gender: 'male', provider: 'elevenlabs' },
        
        // Charlie - Australian accent, interesting for mixed content
        { id: 'IKne3meq5aSn9XLyUdCD', name: 'Charlie', language: 'multilingual', gender: 'male', provider: 'elevenlabs' },
        
        // Daniel - British narrator, clear pronunciation
        { id: 'onwK4e9ZLuTAKqWW03F9', name: 'Daniel', language: 'multilingual', gender: 'male', provider: 'elevenlabs' },
      );
    }
    
    // OpenAI voices (paid - backup)
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
    
    // Google Cloud TTS voices (backup)
    if (this.GOOGLE_CLOUD_KEY) {
      voices.push(
        // Urdu voices from Google
        { id: 'ur-PK-Wavenet-A', name: 'Urdu Female', language: 'ur', gender: 'female', provider: 'google' },
        { id: 'ur-PK-Wavenet-B', name: 'Urdu Male', language: 'ur', gender: 'male', provider: 'google' },
        // Hindi voices
        { id: 'hi-IN-Wavenet-A', name: 'Hindi Female', language: 'hi', gender: 'female', provider: 'google' },
        { id: 'hi-IN-Wavenet-B', name: 'Hindi Male', language: 'hi', gender: 'male', provider: 'google' },
        { id: 'hi-IN-Wavenet-C', name: 'Hindi Male 2', language: 'hi', gender: 'male', provider: 'google' },
        // English voices
        { id: 'en-US-Wavenet-A', name: 'US Female', language: 'en', gender: 'female', provider: 'google' },
        { id: 'en-US-Wavenet-B', name: 'US Male', language: 'en', gender: 'male', provider: 'google' },
        { id: 'en-GB-Wavenet-A', name: 'UK Female', language: 'en', gender: 'female', provider: 'google' },
        { id: 'en-GB-Wavenet-B', name: 'UK Male', language: 'en', gender: 'male', provider: 'google' },
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
