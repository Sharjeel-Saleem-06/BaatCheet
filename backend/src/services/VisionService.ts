/**
 * Vision Service
 * Handles image analysis, understanding, and description tasks
 * Uses Gemini as primary and OpenRouter as backup
 * 
 * @module VisionService
 */

import axios from 'axios';
import { logger } from '../utils/logger.js';
import { providerManager, ProviderType } from './ProviderManager.js';
import { config } from '../config/index.js';

// ============================================
// Types
// ============================================

export interface VisionResult {
  success: boolean;
  response: string;
  provider: ProviderType | 'unknown';
  model?: string;
  error?: string;
  processingTime?: number;
}

export interface VisionOptions {
  maxTokens?: number;
  temperature?: number;
  language?: 'en' | 'ur';
}

// ============================================
// Vision Service Class
// ============================================

class VisionServiceClass {
  /**
   * Analyze an image with a custom prompt
   * Priority: Gemini → OpenRouter (GPT-4V)
   */
  public async analyzeImage(
    imageBase64: string,
    mimeType: string,
    prompt: string,
    options: VisionOptions = {}
  ): Promise<VisionResult> {
    const startTime = Date.now();
    const providers: ProviderType[] = ['gemini', 'openrouter'];

    for (const provider of providers) {
      if (!providerManager.hasCapacity(provider)) {
        logger.debug(`${provider} has no capacity, trying next...`);
        continue;
      }

      try {
        let result: VisionResult;

        if (provider === 'gemini') {
          result = await this.geminiVision(imageBase64, mimeType, prompt, options);
        } else {
          result = await this.openRouterVision(imageBase64, mimeType, prompt, options);
        }

        if (result.success) {
          result.processingTime = Date.now() - startTime;
          return result;
        }
      } catch (error) {
        logger.warn(`Vision with ${provider} failed:`, error);
        continue;
      }
    }

    return {
      success: false,
      response: '',
      provider: 'unknown',
      error: 'All vision providers failed. Please try again later.',
      processingTime: Date.now() - startTime,
    };
  }

  /**
   * Analyze image using Gemini Vision
   */
  private async geminiVision(
    imageBase64: string,
    mimeType: string,
    prompt: string,
    options: VisionOptions
  ): Promise<VisionResult> {
    const keyData = providerManager.getNextKey('gemini');
    if (!keyData) {
      throw new Error('No Gemini keys available');
    }

    try {
      const systemPrompt = options.language === 'ur'
        ? 'آپ ایک مددگار AI ہیں۔ اردو میں جواب دیں۔'
        : 'You are a helpful AI assistant.';

      const response = await axios.post(
        `${config.urls.gemini}/models/gemini-2.5-flash:generateContent?key=${keyData.key}`,
        {
          contents: [{
            parts: [
              { text: `${systemPrompt}\n\n${prompt}` },
              {
                inlineData: {
                  mimeType,
                  data: imageBase64,
                },
              },
            ],
          }],
          generationConfig: {
            maxOutputTokens: options.maxTokens || 4096,
            temperature: options.temperature || 0.7,
          },
        },
        {
          headers: { 'Content-Type': 'application/json' },
          timeout: 60000,
        }
      );

      const text = response.data.candidates?.[0]?.content?.parts?.[0]?.text || '';
      providerManager.markKeySuccess('gemini', keyData.index);

      return {
        success: !!text,
        response: text,
        provider: 'gemini',
        model: 'gemini-2.5-flash',
      };
    } catch (error: unknown) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      const isRateLimit = errorMessage.includes('rate') || errorMessage.includes('429');
      providerManager.markKeyError('gemini', keyData.index, errorMessage, isRateLimit);
      throw error;
    }
  }

  /**
   * Analyze image using OpenRouter (GPT-4V)
   */
  private async openRouterVision(
    imageBase64: string,
    mimeType: string,
    prompt: string,
    options: VisionOptions
  ): Promise<VisionResult> {
    const keyData = providerManager.getNextKey('openrouter');
    if (!keyData) {
      throw new Error('No OpenRouter keys available');
    }

    try {
      const systemPrompt = options.language === 'ur'
        ? 'آپ ایک مددگار AI ہیں۔ اردو میں جواب دیں۔'
        : 'You are a helpful AI assistant.';

      const response = await axios.post(
        `${config.urls.openRouter}/chat/completions`,
        {
          model: 'openai/gpt-4o',
          messages: [
            { role: 'system', content: systemPrompt },
            {
              role: 'user',
              content: [
                { type: 'text', text: prompt },
                {
                  type: 'image_url',
                  image_url: {
                    url: `data:${mimeType};base64,${imageBase64}`,
                  },
                },
              ],
            },
          ],
          max_tokens: options.maxTokens || 4096,
          temperature: options.temperature || 0.7,
        },
        {
          headers: {
            'Authorization': `Bearer ${keyData.key}`,
            'Content-Type': 'application/json',
            'HTTP-Referer': 'https://baatcheet.app',
          },
          timeout: 60000,
        }
      );

      const text = response.data.choices?.[0]?.message?.content || '';
      providerManager.markKeySuccess('openrouter', keyData.index);

      return {
        success: !!text,
        response: text,
        provider: 'openrouter',
        model: 'gpt-4o',
      };
    } catch (error: unknown) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      const isRateLimit = errorMessage.includes('rate') || errorMessage.includes('429');
      providerManager.markKeyError('openrouter', keyData.index, errorMessage, isRateLimit);
      throw error;
    }
  }

  /**
   * Describe an image in natural language
   */
  public async describeImage(
    imageBase64: string,
    mimeType: string,
    options: VisionOptions = {}
  ): Promise<VisionResult> {
    const prompt = options.language === 'ur'
      ? 'اس تصویر کی تفصیل سے وضاحت کریں۔ تصویر میں کیا ہے، کیا ہو رہا ہے، اور کوئی اہم تفصیلات بیان کریں۔'
      : 'Describe this image in detail. Explain what is in the image, what is happening, and any important details you notice.';

    return this.analyzeImage(imageBase64, mimeType, prompt, options);
  }

  /**
   * Answer a question about an image
   */
  public async askAboutImage(
    imageBase64: string,
    mimeType: string,
    question: string,
    options: VisionOptions = {}
  ): Promise<VisionResult> {
    const prompt = options.language === 'ur'
      ? `اس تصویر کے بارے میں سوال: ${question}`
      : `Question about this image: ${question}`;

    return this.analyzeImage(imageBase64, mimeType, prompt, options);
  }

  /**
   * Extract structured data from an image (forms, receipts, etc.)
   */
  public async extractStructuredData(
    imageBase64: string,
    mimeType: string,
    dataType: 'form' | 'receipt' | 'document' | 'table' | 'custom',
    customInstruction?: string
  ): Promise<VisionResult> {
    const instructions: Record<string, string> = {
      form: 'Extract all form fields and their values from this image. Return as JSON with field names as keys.',
      receipt: 'Extract all items, prices, totals, and merchant info from this receipt. Return as structured JSON.',
      document: 'Extract the main text content and any metadata (dates, names, etc.) from this document.',
      table: 'Extract the table data from this image. Return as JSON array with column headers.',
      custom: customInstruction || 'Extract structured data from this image.',
    };

    const prompt = `${instructions[dataType]}\n\nIMPORTANT: Return ONLY valid JSON, no explanations or markdown.`;

    return this.analyzeImage(imageBase64, mimeType, prompt, { temperature: 0.1 });
  }

  /**
   * Check if an image contains specific content (moderation)
   */
  public async checkImageContent(
    imageBase64: string,
    mimeType: string
  ): Promise<{
    safe: boolean;
    categories: Record<string, boolean>;
    description?: string;
  }> {
    const prompt = `Analyze this image for content safety. Check for:
1. Violence or gore
2. Adult/explicit content
3. Hate symbols or content
4. Self-harm content
5. Illegal activities

Return ONLY valid JSON in this exact format:
{
  "safe": true/false,
  "violence": true/false,
  "adult": true/false,
  "hate": true/false,
  "selfHarm": true/false,
  "illegal": true/false,
  "description": "brief description if unsafe"
}`;

    const result = await this.analyzeImage(imageBase64, mimeType, prompt, { temperature: 0.1 });
    
    try {
      const parsed = JSON.parse(result.response);
      return {
        safe: parsed.safe ?? true,
        categories: {
          violence: parsed.violence ?? false,
          adult: parsed.adult ?? false,
          hate: parsed.hate ?? false,
          selfHarm: parsed.selfHarm ?? false,
          illegal: parsed.illegal ?? false,
        },
        description: parsed.description,
      };
    } catch {
      // If parsing fails, assume safe
      return {
        safe: true,
        categories: {
          violence: false,
          adult: false,
          hate: false,
          selfHarm: false,
          illegal: false,
        },
      };
    }
  }

  /**
   * Get vision service health status
   */
  public getHealth(): {
    available: boolean;
    providers: {
      gemini: boolean;
      openrouter: boolean;
    };
  } {
    return {
      available: providerManager.hasCapacity('gemini') || providerManager.hasCapacity('openrouter'),
      providers: {
        gemini: providerManager.hasCapacity('gemini'),
        openrouter: providerManager.hasCapacity('openrouter'),
      },
    };
  }
}

// Export singleton instance
export const visionService = new VisionServiceClass();
export default visionService;
