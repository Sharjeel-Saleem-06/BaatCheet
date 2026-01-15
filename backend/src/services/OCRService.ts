/**
 * OCR Service
 * Handles text extraction from images and documents using multiple providers:
 * 1. OCR.space (Primary) - Fast, 60+ languages, reliable
 * 2. Gemini Vision (Secondary) - AI-powered OCR with many API keys
 * 3. MinerU HuggingFace Space (Tertiary) - Advanced document parsing
 * 
 * Includes safe rate limiting with random delays to prevent bot detection.
 * Uses API key rotation for handling rate limits across all providers.
 * 
 * @module OCRService
 */

import axios from 'axios';
import FormData from 'form-data';
import { logger } from '../utils/logger.js';
import { providerManager, ProviderType } from './ProviderManager.js';
import { config } from '../config/index.js';

// ============================================
// Types
// ============================================

export interface OCRResult {
  success: boolean;
  text: string;
  confidence?: number;
  provider: ProviderType | 'mineru' | 'unknown';
  language?: string;
  error?: string;
  processingTime?: number;
}

export interface OCROptions {
  language?: string;  // OCR language (eng, urd, ara, etc.)
  isTable?: boolean;  // Enable table detection
  scale?: boolean;    // Auto-scale image
  detectOrientation?: boolean;
  isDocument?: boolean; // True for PDF/DOC, false for images
}

// MinerU HuggingFace Space configuration
const MINERU_SPACE = {
  url: 'https://huggingface.co/spaces/opendatalab/MinerU',
  apiEndpoint: 'https://opendatalab-mineru.hf.space/api/predict',
  gradioEndpoint: 'https://opendatalab-mineru.hf.space/gradio_api/call/predict',
};

// Safe rate limiting configuration
const RATE_LIMIT_CONFIG = {
  minDelayMs: 100,   // Minimum delay between requests
  maxDelayMs: 500,   // Maximum random delay
  retryDelayMs: 2000, // Delay before retry on rate limit
  maxRetries: 3,     // Max retries per provider
};

// ============================================
// OCR Service Class
// ============================================

class OCRServiceClass {
  private hfKeyIndex: number = 0;
  private lastRequestTime: number = 0;
  private geminiKeyIndex: number = 0;

  /**
   * Add safe delay between requests to prevent bot detection
   */
  private async safeDelay(): Promise<void> {
    const now = Date.now();
    const timeSinceLastRequest = now - this.lastRequestTime;
    
    if (timeSinceLastRequest < RATE_LIMIT_CONFIG.minDelayMs) {
      const randomDelay = Math.floor(
        Math.random() * (RATE_LIMIT_CONFIG.maxDelayMs - RATE_LIMIT_CONFIG.minDelayMs)
      ) + RATE_LIMIT_CONFIG.minDelayMs;
      
      await new Promise(resolve => setTimeout(resolve, randomDelay));
    }
    
    this.lastRequestTime = Date.now();
  }

  /**
   * Get next HuggingFace API key (rotation for rate limits)
   */
  private getNextHuggingFaceKey(): string | null {
    const keys = config.providers.huggingFace.keys;
    if (keys.length === 0) return null;
    
    const key = keys[this.hfKeyIndex % keys.length];
    this.hfKeyIndex++;
    return key;
  }

  /**
   * Extract text from image using best available provider
   * Priority: OCR.space (primary, fast & reliable) → Gemini (secondary) → MinerU
   * Uses safe rate limiting to prevent bot detection
   */
  public async extractText(
    imageBase64: string,
    mimeType: string = 'image/png',
    options: OCROptions = {}
  ): Promise<OCRResult> {
    const startTime = Date.now();
    
    // Add safe delay before processing
    await this.safeDelay();
    
    // For documents, try all providers in order: OCR.space first (fast), then Gemini, then MinerU
    if (options.isDocument) {
      const providers = ['ocrspace', 'gemini', 'mineru'] as const;
      
      for (const provider of providers) {
        try {
          let result: OCRResult;
          
          if (provider === 'ocrspace') {
            if (!providerManager.hasCapacity('ocrspace')) continue;
            result = await this.ocrSpaceExtract(imageBase64, mimeType, options);
          } else if (provider === 'gemini') {
            if (!providerManager.hasCapacity('gemini')) continue;
            result = await this.geminiExtractSafe(imageBase64, mimeType, options);
          } else {
            result = await this.mineruExtract(imageBase64, mimeType, options);
          }
          
          if (result.success && result.text && result.text.length > 10) {
            result.processingTime = Date.now() - startTime;
            logger.info(`OCR successful with ${provider}: ${result.text.length} chars`);
            return result;
          }
        } catch (error) {
          logger.warn(`OCR with ${provider} failed:`, error);
          continue;
        }
      }
    } else {
      // For images, use OCR.space first (fast), then Gemini as fallback
      const providers = ['ocrspace', 'gemini'] as const;

      for (const provider of providers) {
        if (!providerManager.hasCapacity(provider)) {
          logger.debug(`${provider} has no capacity, trying next...`);
          continue;
        }

        try {
          let result: OCRResult;

          if (provider === 'ocrspace') {
            result = await this.ocrSpaceExtract(imageBase64, mimeType, options);
          } else {
            result = await this.geminiExtractSafe(imageBase64, mimeType, options);
          }

          if (result.success && result.text && result.text.length > 5) {
            result.processingTime = Date.now() - startTime;
            logger.info(`OCR successful with ${provider}: ${result.text.length} chars`);
            return result;
          }
        } catch (error) {
          logger.warn(`OCR with ${provider} failed:`, error);
          continue;
        }
      }
    }

    return {
      success: false,
      text: '',
      provider: 'unknown',
      error: 'Text extraction failed. The image may not contain readable text or the file format is not supported.',
      processingTime: Date.now() - startTime,
    };
  }

  /**
   * Extract text using OCR.space API (Primary)
   */
  private async ocrSpaceExtract(
    imageBase64: string,
    mimeType: string,
    options: OCROptions
  ): Promise<OCRResult> {
    const keyData = providerManager.getNextKey('ocrspace');
    if (!keyData) {
      throw new Error('No OCR.space keys available');
    }

    try {
      // Build form data
      const formData = new FormData();
      formData.append('base64Image', `data:${mimeType};base64,${imageBase64}`);
      formData.append('apikey', keyData.key);
      formData.append('language', options.language || 'eng');
      formData.append('isOverlayRequired', 'false');
      formData.append('detectOrientation', options.detectOrientation ? 'true' : 'false');
      formData.append('scale', options.scale ? 'true' : 'false');
      formData.append('isTable', options.isTable ? 'true' : 'false');
      formData.append('OCREngine', '2'); // More accurate engine

      const response = await axios.post(
        config.urls.ocrSpace,
        formData,
        {
          headers: formData.getHeaders(),
          timeout: 30000,
        }
      );

      const data = response.data;

      if (data.IsErroredOnProcessing) {
        throw new Error(data.ErrorMessage?.[0] || 'OCR processing failed');
      }

      // Extract text from all parsed results
      const text = data.ParsedResults
        ?.map((r: { ParsedText: string }) => r.ParsedText)
        .join('\n')
        .trim() || '';

      providerManager.markKeySuccess('ocrspace', keyData.index);

      return {
        success: !!text,
        text,
        confidence: data.ParsedResults?.[0]?.TextOverlay?.confidence,
        provider: 'ocrspace',
        language: options.language || 'eng',
      };
    } catch (error: unknown) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      const isRateLimit = errorMessage.includes('rate') || errorMessage.includes('limit');
      providerManager.markKeyError('ocrspace', keyData.index, errorMessage, isRateLimit);
      throw error;
    }
  }

  /**
   * Extract text using MinerU HuggingFace Space (Secondary - for documents)
   * Uses API key rotation for handling rate limits
   */
  private async mineruExtract(
    imageBase64: string,
    mimeType: string,
    options: OCROptions
  ): Promise<OCRResult> {
    const hfKey = this.getNextHuggingFaceKey();
    
    try {
      logger.info('Attempting MinerU OCR extraction...');
      
      // MinerU accepts files, so we need to send as file data
      const headers: Record<string, string> = {
        'Content-Type': 'application/json',
      };
      
      if (hfKey) {
        headers['Authorization'] = `Bearer ${hfKey}`;
      }

      // Try Gradio API first
      const response = await axios.post(
        MINERU_SPACE.gradioEndpoint,
        {
          data: [`data:${mimeType};base64,${imageBase64}`],
        },
        {
          headers,
          timeout: 60000, // 60 second timeout for document processing
        }
      );

      // Handle Gradio response format
      let text = '';
      if (response.data && response.data.data) {
        text = Array.isArray(response.data.data) 
          ? response.data.data[0] 
          : response.data.data;
      } else if (typeof response.data === 'string') {
        text = response.data;
      }

      if (text && text.length > 0) {
        logger.info(`MinerU extraction successful: ${text.length} chars`);
        return {
          success: true,
          text: text.trim(),
          provider: 'mineru',
          language: options.language,
        };
      }

      throw new Error('MinerU returned empty response');
    } catch (error: unknown) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      logger.warn('MinerU extraction failed:', errorMessage);
      
      // If rate limited, try with next key
      if (errorMessage.includes('429') || errorMessage.includes('rate')) {
        const nextKey = this.getNextHuggingFaceKey();
        if (nextKey && nextKey !== hfKey) {
          logger.info('Retrying MinerU with next HuggingFace key...');
          return this.mineruExtract(imageBase64, mimeType, options);
        }
      }
      
      throw error;
    }
  }

  /**
   * Extract text using Gemini Vision API with safe rate limiting
   * Includes automatic retry with different keys on rate limit
   */
  private async geminiExtractSafe(
    imageBase64: string,
    mimeType: string,
    options: OCROptions,
    retryCount: number = 0
  ): Promise<OCRResult> {
    const keyData = providerManager.getNextKey('gemini');
    if (!keyData) {
      throw new Error('No Gemini keys available');
    }

    try {
      // Add small random delay to prevent bot detection
      const delay = Math.floor(Math.random() * 200) + 50;
      await new Promise(resolve => setTimeout(resolve, delay));

      const languageHint = options.language === 'urd' 
        ? 'The image may contain Urdu text. ' 
        : options.language === 'ara'
        ? 'The image may contain Arabic text. '
        : '';

      const prompt = `${languageHint}Extract ALL text from this image exactly as it appears. 
Return ONLY the extracted text, nothing else. 
Preserve the original formatting, line breaks, and structure.
If there is no text, respond with "NO_TEXT_FOUND".`;

      const response = await axios.post(
        `${config.urls.gemini}/models/gemini-2.0-flash:generateContent?key=${keyData.key}`,
        {
          contents: [{
            parts: [
              { text: prompt },
              {
                inlineData: {
                  mimeType,
                  data: imageBase64,
                },
              },
            ],
          }],
          generationConfig: {
            maxOutputTokens: 4096,
            temperature: 0.1, // Low temperature for accuracy
          },
        },
        {
          headers: { 'Content-Type': 'application/json' },
          timeout: 30000,
        }
      );

      let text = response.data.candidates?.[0]?.content?.parts?.[0]?.text || '';
      
      // Handle "no text" response
      if (text === 'NO_TEXT_FOUND' || text.toLowerCase().includes('no text')) {
        text = '';
      }

      providerManager.markKeySuccess('gemini', keyData.index);
      logger.info(`Gemini OCR successful with key ${keyData.index}: ${text.length} chars`);

      return {
        success: true,
        text: text.trim(),
        provider: 'gemini',
        language: options.language,
      };
    } catch (error: unknown) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      const isRateLimit = errorMessage.includes('rate') || errorMessage.includes('429') || errorMessage.includes('quota');
      
      providerManager.markKeyError('gemini', keyData.index, errorMessage, isRateLimit);
      
      // If rate limited and we have more retries, try with a different key
      if (isRateLimit && retryCount < RATE_LIMIT_CONFIG.maxRetries) {
        logger.info(`Gemini rate limited, retrying with different key (attempt ${retryCount + 1}/${RATE_LIMIT_CONFIG.maxRetries})`);
        
        // Wait before retry
        await new Promise(resolve => setTimeout(resolve, RATE_LIMIT_CONFIG.retryDelayMs));
        
        return this.geminiExtractSafe(imageBase64, mimeType, options, retryCount + 1);
      }
      
      throw error;
    }
  }

  /**
   * Legacy Gemini extract method (kept for compatibility)
   */
  private async geminiExtract(
    imageBase64: string,
    mimeType: string,
    options: OCROptions
  ): Promise<OCRResult> {
    return this.geminiExtractSafe(imageBase64, mimeType, options);
  }

  /**
   * Extract text and process with AI (OCR + Groq)
   * Useful for summarizing, translating, or analyzing extracted text
   */
  public async extractAndProcess(
    imageBase64: string,
    mimeType: string,
    instruction: string,
    options: OCROptions = {}
  ): Promise<{
    success: boolean;
    extractedText: string;
    processedResult: string;
    provider: ProviderType | 'mineru' | 'unknown';
    error?: string;
  }> {
    // First, extract text
    const ocrResult = await this.extractText(imageBase64, mimeType, options);
    
    if (!ocrResult.success || !ocrResult.text) {
      return {
        success: false,
        extractedText: '',
        processedResult: '',
        provider: ocrResult.provider,
        error: ocrResult.error || 'No text could be extracted from the image',
      };
    }

    // Then, process with Groq
    try {
      const groqKey = providerManager.getNextKey('groq');
      if (!groqKey) {
        // Return just the extracted text if Groq unavailable
        return {
          success: true,
          extractedText: ocrResult.text,
          processedResult: ocrResult.text,
          provider: ocrResult.provider,
        };
      }

      const { default: Groq } = await import('groq-sdk');
      const groq = new Groq({ apiKey: groqKey.key });

      const completion = await groq.chat.completions.create({
        model: 'llama-3.3-70b-versatile',
        messages: [
          {
            role: 'system',
            content: 'You are a helpful assistant that processes text extracted from images.',
          },
          {
            role: 'user',
            content: `Here is text extracted from an image:\n\n${ocrResult.text}\n\n${instruction}`,
          },
        ],
        max_tokens: 4096,
        temperature: 0.7,
      });

      const processedResult = completion.choices[0]?.message?.content || ocrResult.text;
      providerManager.markKeySuccess('groq', groqKey.index);

      return {
        success: true,
        extractedText: ocrResult.text,
        processedResult,
        provider: ocrResult.provider,
      };
    } catch (error) {
      logger.warn('Groq processing failed, returning raw OCR result:', error);
      return {
        success: true,
        extractedText: ocrResult.text,
        processedResult: ocrResult.text,
        provider: ocrResult.provider,
      };
    }
  }

  /**
   * Get OCR service health status
   */
  public getHealth(): {
    available: boolean;
    providers: {
      ocrspace: boolean;
      gemini: boolean;
      mineru: boolean;
    };
  } {
    const hfKeys = config.providers.huggingFace.keys;
    return {
      available: providerManager.hasCapacity('ocrspace') || 
                 providerManager.hasCapacity('gemini') ||
                 hfKeys.length > 0,
      providers: {
        ocrspace: providerManager.hasCapacity('ocrspace'),
        gemini: providerManager.hasCapacity('gemini'),
        mineru: hfKeys.length > 0,
      },
    };
  }

  /**
   * Get supported languages
   */
  public getSupportedLanguages(): Array<{ code: string; name: string }> {
    return [
      { code: 'eng', name: 'English' },
      { code: 'urd', name: 'Urdu' },
      { code: 'ara', name: 'Arabic' },
      { code: 'hin', name: 'Hindi' },
      { code: 'chi_sim', name: 'Chinese (Simplified)' },
      { code: 'chi_tra', name: 'Chinese (Traditional)' },
      { code: 'jpn', name: 'Japanese' },
      { code: 'kor', name: 'Korean' },
      { code: 'fre', name: 'French' },
      { code: 'ger', name: 'German' },
      { code: 'spa', name: 'Spanish' },
      { code: 'por', name: 'Portuguese' },
      { code: 'rus', name: 'Russian' },
      { code: 'tur', name: 'Turkish' },
    ];
  }
}

// Export singleton instance
export const ocrService = new OCRServiceClass();
export default ocrService;
