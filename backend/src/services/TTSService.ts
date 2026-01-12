/**
 * Text-to-Speech (TTS) Service
 * Provides voice output capabilities with multiple provider support
 * 
 * Supported Providers:
 * - OpenAI TTS (best quality, paid)
 * - ElevenLabs (free tier: 10k chars/month)
 * - Google Cloud TTS (free tier: 1M chars/month)
 * - Browser Web Speech API (frontend fallback)
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
}

export interface VoiceInfo {
  id: string;
  name: string;
  language: string;
  gender?: string;
  provider: string;
}

// ============================================
// TTS Service Class
// ============================================

class TTSServiceClass {
  private readonly OPENAI_API_KEY = process.env.OPENAI_API_KEY || '';
  private readonly ELEVENLABS_API_KEY = process.env.ELEVENLABS_API_KEY || '';
  private readonly GOOGLE_CLOUD_KEY = process.env.GOOGLE_CLOUD_TTS_KEY || '';
  
  // OpenAI voices
  private readonly OPENAI_VOICES = ['alloy', 'echo', 'fable', 'onyx', 'nova', 'shimmer'];
  
  // Character limits per provider
  private readonly CHAR_LIMITS = {
    openai: 4096,
    elevenlabs: 5000,
    google: 5000,
  };

  /**
   * Generate speech from text
   */
  public async generateSpeech(
    text: string,
    options: TTSOptions = {}
  ): Promise<TTSResult> {
    const { voice = 'alloy', speed = 1.0, language = 'en', format = 'mp3' } = options;
    
    // Validate and truncate text if needed
    const maxChars = Math.max(...Object.values(this.CHAR_LIMITS));
    const truncatedText = text.length > maxChars ? text.substring(0, maxChars) : text;
    
    try {
      // Try OpenAI TTS first (best quality)
      if (this.OPENAI_API_KEY) {
        return await this.openAITTS(truncatedText, voice, speed, format);
      }
      
      // Try ElevenLabs
      if (this.ELEVENLABS_API_KEY) {
        return await this.elevenLabsTTS(truncatedText, voice);
      }
      
      // Try Google Cloud TTS
      if (this.GOOGLE_CLOUD_KEY) {
        return await this.googleTTS(truncatedText, language, voice);
      }
      
      throw new Error('No TTS service available. Please configure OPENAI_API_KEY, ELEVENLABS_API_KEY, or GOOGLE_CLOUD_TTS_KEY.');
      
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
   * ElevenLabs TTS
   */
  private async elevenLabsTTS(
    text: string,
    voiceId: string = 'EXAVITQu4vr4xnSDxMaL' // Default: Sarah
  ): Promise<TTSResult> {
    try {
      const response = await axios.post(
        `https://api.elevenlabs.io/v1/text-to-speech/${voiceId}`,
        {
          text,
          model_id: 'eleven_monolingual_v1',
          voice_settings: {
            stability: 0.5,
            similarity_boost: 0.75,
          },
        },
        {
          headers: {
            'Accept': 'audio/mpeg',
            'Content-Type': 'application/json',
            'xi-api-key': this.ELEVENLABS_API_KEY,
          },
          responseType: 'arraybuffer',
          timeout: 30000,
        }
      );
      
      logger.info('ElevenLabs TTS completed', { textLength: text.length, voiceId });
      
      return {
        audioBuffer: Buffer.from(response.data),
        format: 'mp3',
        provider: 'elevenlabs',
      };
    } catch (error: any) {
      logger.error('ElevenLabs TTS failed:', error.response?.data || error.message);
      throw new Error('ElevenLabs TTS failed');
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
    
    // OpenAI voices
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
    
    // ElevenLabs default voices
    if (this.ELEVENLABS_API_KEY) {
      voices.push(
        { id: 'EXAVITQu4vr4xnSDxMaL', name: 'Sarah', language: 'en', gender: 'female', provider: 'elevenlabs' },
        { id: '21m00Tcm4TlvDq8ikWAM', name: 'Rachel', language: 'en', gender: 'female', provider: 'elevenlabs' },
        { id: 'AZnzlk1XvdvUeBnXmlld', name: 'Domi', language: 'en', gender: 'female', provider: 'elevenlabs' },
      );
    }
    
    return voices;
  }

  /**
   * Check if TTS is available
   */
  public isAvailable(): boolean {
    return !!(this.OPENAI_API_KEY || this.ELEVENLABS_API_KEY || this.GOOGLE_CLOUD_KEY);
  }

  /**
   * Get provider info
   */
  public getProviderInfo(): { provider: string; available: boolean } {
    if (this.OPENAI_API_KEY) {
      return { provider: 'openai', available: true };
    }
    if (this.ELEVENLABS_API_KEY) {
      return { provider: 'elevenlabs', available: true };
    }
    if (this.GOOGLE_CLOUD_KEY) {
      return { provider: 'google', available: true };
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
