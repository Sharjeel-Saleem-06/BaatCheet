/**
 * Whisper Service
 * Advanced audio transcription with Roman Urdu support
 * Based on ChatGPT Voice Mode architecture
 * 
 * @module WhisperService
 */

import { createReadStream } from 'fs';
import fs from 'fs/promises';
import path from 'path';
import OpenAI from 'openai';
import Groq from 'groq-sdk';
import { logger } from '../utils/logger.js';
import { providerManager } from './ProviderManager.js';
import { config } from '../config/index.js';

// ============================================
// Types
// ============================================

export interface TranscriptionOptions {
  language?: string; // 'auto', 'ur', 'en', or null for auto-detect
  romanize?: boolean; // Output Roman Urdu for Urdu speech (default: true)
  responseFormat?: 'json' | 'text' | 'verbose_json';
  temperature?: number; // 0-1, lower = more deterministic
  prompt?: string; // Context hint for better transcription
}

export interface TranscriptionResult {
  success: boolean;
  text?: string;
  language?: string;
  isRomanUrdu?: boolean;
  isMixedLanguage?: boolean;
  confidence?: number;
  duration?: number;
  provider?: string;
  segments?: TranscriptionSegment[];
  words?: TranscriptionWord[];
  error?: string;
}

export interface TranscriptionSegment {
  id: number;
  start: number;
  end: number;
  text: string;
  confidence?: number;
}

export interface TranscriptionWord {
  word: string;
  start: number;
  end: number;
  confidence?: number;
}

// ============================================
// Roman Urdu Patterns
// ============================================

// Common Urdu words in Roman script for detection
const ROMAN_URDU_PATTERNS = [
  // Pronouns & Common Words
  /\b(hai|hain|tha|thi|the|hoga|hogi|honge)\b/i,
  /\b(ka|ki|ko|ke|se|ne|mein|par|pe)\b/i,
  /\b(aur|ya|lekin|magar|kyunke|isliye)\b/i,
  /\b(kya|kaise|kyun|kahan|kab|kaun|kitna|kitne|kitni)\b/i,
  /\b(aap|tum|main|hum|wo|woh|ye|yeh|is|us)\b/i,
  /\b(mujhe|tumhe|humein|unko|apko|aapko)\b/i,
  // Verbs
  /\b(chahiye|chahta|chahte|chahti)\b/i,
  /\b(karna|karo|kiya|karein|karenge)\b/i,
  /\b(likh|likho|likhna|likha|likhein)\b/i,
  /\b(padh|padho|padhna|padha|padhein)\b/i,
  /\b(dekh|dekho|dekhna|dekha|dekhein)\b/i,
  /\b(sun|suno|sunna|suna|sunein)\b/i,
  /\b(bol|bolo|bolna|bola|bolein)\b/i,
  /\b(de|do|dena|diya|dein)\b/i,
  /\b(le|lo|lena|liya|lein)\b/i,
  /\b(ja|jao|jana|gaya|gayi|jayein)\b/i,
  /\b(aa|aao|aana|aaya|aayi|aayein)\b/i,
  /\b(bata|batao|batana|bataya|bataein)\b/i,
  // Common phrases
  /\b(theek|thik|sahi|galat|achha|acha|bura)\b/i,
  /\b(zaroor|zaruri|lazmi|mushkil|asaan)\b/i,
  /\b(bahut|bohat|zyada|kam|thoda|thodi)\b/i,
  /\b(abhi|pehle|baad|kal|aaj|parso)\b/i,
  // Greetings
  /\b(assalam|walaikum|salam|khuda|allah|mashallah|inshallah)\b/i,
  /\b(shukriya|meherbani|karam|fazal)\b/i,
  // Question words
  /\b(konsa|konsi|kiski|kiska|kisko)\b/i,
];

// Common English words for detection
const ENGLISH_PATTERNS = [
  /\b(the|is|are|was|were|have|has|had|will|would|can|could|should)\b/i,
  /\b(hello|hi|hey|thanks|thank|please|sorry|okay|ok)\b/i,
  /\b(what|how|why|where|when|who|which)\b/i,
  /\b(yes|no|maybe|sure|definitely|probably)\b/i,
  /\b(want|need|like|love|hate|think|know|feel)\b/i,
  /\b(help|code|write|create|make|build|fix|explain)\b/i,
];

// ============================================
// Whisper Service Class
// ============================================

class WhisperServiceClass {
  /**
   * Transcribe audio file with advanced language detection
   */
  public async transcribe(
    audioPath: string,
    options: TranscriptionOptions = {}
  ): Promise<TranscriptionResult> {
    const fullPath = path.isAbsolute(audioPath) ? audioPath : audioPath;

    // Verify file exists
    try {
      await fs.access(fullPath);
    } catch {
      return { success: false, error: 'Audio file not found' };
    }

    // Try Groq Whisper first (free and fast)
    try {
      const result = await this.transcribeWithGroq(fullPath, options);
      if (result.success) {
        return this.processTranscription(result, options);
      }
    } catch (error) {
      logger.warn('Groq Whisper failed, trying backup:', error);
    }

    // Try OpenRouter Whisper as backup
    try {
      const result = await this.transcribeWithOpenRouter(fullPath, options);
      if (result.success) {
        return this.processTranscription(result, options);
      }
    } catch (error) {
      logger.warn('OpenRouter Whisper failed:', error);
    }

    return {
      success: false,
      error: 'All transcription providers failed. Please try again.',
    };
  }

  /**
   * Transcribe using Groq Whisper (whisper-large-v3)
   */
  private async transcribeWithGroq(
    filePath: string,
    options: TranscriptionOptions
  ): Promise<TranscriptionResult> {
    const keyData = providerManager.getNextKey('groq');
    if (!keyData) {
      throw new Error('No Groq keys available');
    }

    try {
      const groq = new Groq({ apiKey: keyData.key });

      // Don't specify language to enable auto-detection
      // Whisper is excellent at detecting Urdu vs English
      const transcription = await groq.audio.transcriptions.create({
        file: createReadStream(filePath),
        model: 'whisper-large-v3',
        language: options.language === 'auto' ? undefined : options.language,
        prompt: options.prompt || this.getTranscriptionPrompt(),
        response_format: 'verbose_json',
      });

      providerManager.markKeySuccess('groq', keyData.index);

      // Cast to access verbose_json fields
      const result = transcription as unknown as {
        text: string;
        language?: string;
        duration?: number;
        segments?: Array<{
          id: number;
          start: number;
          end: number;
          text: string;
        }>;
        words?: Array<{
          word: string;
          start: number;
          end: number;
        }>;
      };

      return {
        success: true,
        text: result.text,
        language: result.language,
        duration: result.duration,
        segments: result.segments,
        words: result.words,
        provider: 'groq-whisper-large-v3',
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
    options: TranscriptionOptions
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
        language: options.language === 'auto' ? undefined : options.language,
        prompt: options.prompt || this.getTranscriptionPrompt(),
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
   * Process transcription result with Roman Urdu handling
   */
  private processTranscription(
    result: TranscriptionResult,
    options: TranscriptionOptions
  ): TranscriptionResult {
    if (!result.success || !result.text) return result;

    const text = result.text.trim();
    const detectedLang = result.language;

    // Determine language composition
    const languageAnalysis = this.analyzeLanguage(text, detectedLang);

    // Clean up Roman Urdu if detected
    let processedText = text;
    if (languageAnalysis.isRomanUrdu || languageAnalysis.isMixedLanguage) {
      processedText = this.cleanRomanUrdu(text);
    }

    // Calculate confidence based on language detection certainty
    const confidence = this.calculateConfidence(result, languageAnalysis);

    return {
      ...result,
      text: processedText,
      language: languageAnalysis.primaryLanguage,
      isRomanUrdu: languageAnalysis.isRomanUrdu,
      isMixedLanguage: languageAnalysis.isMixedLanguage,
      confidence,
    };
  }

  /**
   * Analyze language composition of text
   */
  private analyzeLanguage(
    text: string,
    whisperLang?: string
  ): {
    primaryLanguage: string;
    isRomanUrdu: boolean;
    isMixedLanguage: boolean;
    urduScore: number;
    englishScore: number;
  } {
    const urduMatches = ROMAN_URDU_PATTERNS.filter((p) => p.test(text)).length;
    const englishMatches = ENGLISH_PATTERNS.filter((p) => p.test(text)).length;

    const totalPatterns = ROMAN_URDU_PATTERNS.length + ENGLISH_PATTERNS.length;
    const urduScore = urduMatches / ROMAN_URDU_PATTERNS.length;
    const englishScore = englishMatches / ENGLISH_PATTERNS.length;

    // Determine if it's mixed language (common in Pakistan)
    const isMixedLanguage = urduScore > 0.1 && englishScore > 0.1;

    // Determine primary language
    let primaryLanguage: string;
    let isRomanUrdu = false;

    if (whisperLang === 'ur' || urduScore > englishScore) {
      primaryLanguage = 'urdu';
      isRomanUrdu = true;
    } else if (whisperLang === 'en' || englishScore > urduScore) {
      primaryLanguage = 'english';
    } else if (isMixedLanguage) {
      primaryLanguage = 'mixed';
      isRomanUrdu = urduScore > 0.15;
    } else {
      primaryLanguage = whisperLang || 'english';
    }

    return {
      primaryLanguage,
      isRomanUrdu,
      isMixedLanguage,
      urduScore,
      englishScore,
    };
  }

  /**
   * Clean and normalize Roman Urdu text
   */
  private cleanRomanUrdu(text: string): string {
    return (
      text
        // Normalize spaces
        .replace(/\s+/g, ' ')
        .trim()
        // Common Whisper transcription fixes for Urdu
        .replace(/\bkay\b/gi, 'ke')
        .replace(/\bhay\b/gi, 'hai')
        .replace(/\bmay\b/gi, 'mein')
        .replace(/\bsay\b/gi, 'se')
        .replace(/\bnay\b/gi, 'ne')
        // Fix common spelling variations
        .replace(/\bkia\b/gi, 'kya')
        .replace(/\bkaise\b/gi, 'kaise')
        .replace(/\bkiyun\b/gi, 'kyun')
        .replace(/\bkiyunke\b/gi, 'kyunke')
        // Normalize common words
        .replace(/\bachha\b/gi, 'acha')
        .replace(/\btheak\b/gi, 'theek')
        .replace(/\bbohut\b/gi, 'bahut')
    );
  }

  /**
   * Calculate overall confidence score
   */
  private calculateConfidence(
    result: TranscriptionResult,
    languageAnalysis: {
      urduScore: number;
      englishScore: number;
      isMixedLanguage: boolean;
    }
  ): number {
    // Base confidence from word-level if available
    let baseConfidence = 0.8;

    if (result.words && result.words.length > 0) {
      const wordConfidences = result.words
        .map((w) => (w as { confidence?: number }).confidence || 0.8)
        .filter((c) => c > 0);

      if (wordConfidences.length > 0) {
        baseConfidence =
          wordConfidences.reduce((a, b) => a + b, 0) / wordConfidences.length;
      }
    }

    // Adjust confidence based on language detection clarity
    const languageClarity = Math.abs(
      languageAnalysis.urduScore - languageAnalysis.englishScore
    );
    const clarityBonus = languageClarity * 0.1;

    // Mixed language slightly reduces confidence
    const mixedPenalty = languageAnalysis.isMixedLanguage ? 0.05 : 0;

    return Math.min(1, Math.max(0, baseConfidence + clarityBonus - mixedPenalty));
  }

  /**
   * Get transcription prompt for better accuracy
   */
  private getTranscriptionPrompt(): string {
    // Providing context helps Whisper with Roman Urdu
    return `This audio may contain Urdu spoken in Roman script (Roman Urdu), English, or a mix of both languages (code-mixing). Common Roman Urdu phrases include: "Aap kaise hain", "Mujhe madad chahiye", "Kya baat hai", "Theek hai", "Bahut acha".`;
  }

  /**
   * Check if text is primarily Roman Urdu
   */
  public isRomanUrdu(text: string): boolean {
    const analysis = this.analyzeLanguage(text);
    return analysis.isRomanUrdu;
  }

  /**
   * Check if text is mixed language (Urdu + English)
   */
  public isMixedLanguage(text: string): boolean {
    const analysis = this.analyzeLanguage(text);
    return analysis.isMixedLanguage;
  }

  /**
   * Get language analysis for text
   */
  public getLanguageAnalysis(text: string): {
    primaryLanguage: string;
    isRomanUrdu: boolean;
    isMixedLanguage: boolean;
    urduScore: number;
    englishScore: number;
  } {
    return this.analyzeLanguage(text);
  }
}

// Export singleton
export const whisperService = new WhisperServiceClass();
export default whisperService;
