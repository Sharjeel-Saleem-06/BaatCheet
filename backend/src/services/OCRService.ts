/**
 * OCR Service
 * Handles text extraction from images using OCR.space as primary
 * and Gemini as backup. Integrates with Groq for AI processing.
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
  provider: ProviderType | 'unknown';
  language?: string;
  error?: string;
  processingTime?: number;
}

export interface OCROptions {
  language?: string;  // OCR language (eng, urd, ara, etc.)
  isTable?: boolean;  // Enable table detection
  scale?: boolean;    // Auto-scale image
  detectOrientation?: boolean;
}

// ============================================
// OCR Service Class
// ============================================

class OCRServiceClass {
  /**
   * Extract text from image using best available provider
   * Priority: OCR.space → Gemini
   */
  public async extractText(
    imageBase64: string,
    mimeType: string = 'image/png',
    options: OCROptions = {}
  ): Promise<OCRResult> {
    const startTime = Date.now();
    const providers: ProviderType[] = ['ocrspace', 'gemini'];

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
          result = await this.geminiExtract(imageBase64, mimeType, options);
        }

        if (result.success && result.text) {
          result.processingTime = Date.now() - startTime;
          return result;
        }
      } catch (error) {
        logger.warn(`OCR with ${provider} failed:`, error);
        continue;
      }
    }

    return {
      success: false,
      text: '',
      provider: 'unknown',
      error: 'All OCR providers failed. Please try again later.',
      processingTime: Date.now() - startTime,
    };
  }

  /**
   * Extract text using OCR.space API
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
   * Extract text using Gemini Vision API
   */
  private async geminiExtract(
    imageBase64: string,
    mimeType: string,
    options: OCROptions
  ): Promise<OCRResult> {
    const keyData = providerManager.getNextKey('gemini');
    if (!keyData) {
      throw new Error('No Gemini keys available');
    }

    try {
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
        `${config.urls.gemini}/models/gemini-2.5-flash:generateContent?key=${keyData.key}`,
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

      return {
        success: true,
        text: text.trim(),
        provider: 'gemini',
        language: options.language,
      };
    } catch (error: unknown) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      const isRateLimit = errorMessage.includes('rate') || errorMessage.includes('429');
      providerManager.markKeyError('gemini', keyData.index, errorMessage, isRateLimit);
      throw error;
    }
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
    provider: ProviderType | 'unknown';
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
    };
  } {
    return {
      available: providerManager.hasCapacity('ocrspace') || providerManager.hasCapacity('gemini'),
      providers: {
        ocrspace: providerManager.hasCapacity('ocrspace'),
        gemini: providerManager.hasCapacity('gemini'),
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
