import axios from 'axios';
import { logger } from '../utils/logger.js';
import { providerManager, ProviderType } from './ProviderManager.js';

// ============================================
// Vision Service
// Handles image analysis, OCR, and image-to-text
// ============================================

interface ImageAnalysisResult {
  text?: string;
  description?: string;
  provider: ProviderType;
  model: string;
  success: boolean;
  error?: string;
}

class VisionServiceClass {
  /**
   * Extract text from image (OCR)
   * Priority: Hugging Face → Gemini
   */
  public async extractTextFromImage(imageBase64: string, mimeType: string = 'image/png'): Promise<ImageAnalysisResult> {
    const providers: ProviderType[] = ['huggingface', 'gemini'];

    for (const provider of providers) {
      if (!providerManager.hasCapacity(provider)) {
        continue;
      }

      try {
        const result = await this.callOCRProvider(provider, imageBase64, mimeType);
        if (result.success) {
          return result;
        }
      } catch (error) {
        logger.warn(`OCR with ${provider} failed:`, error);
        continue;
      }
    }

    return {
      success: false,
      error: 'All OCR providers failed. Please try again later.',
      provider: 'huggingface',
      model: 'unknown',
    };
  }

  /**
   * Analyze/describe an image
   * Priority: Gemini → OpenRouter (with vision model) → Hugging Face
   */
  public async analyzeImage(
    imageBase64: string,
    prompt: string = 'Describe this image in detail.',
    mimeType: string = 'image/png'
  ): Promise<ImageAnalysisResult> {
    const providers: ProviderType[] = ['gemini', 'openrouter', 'huggingface'];

    for (const provider of providers) {
      if (!providerManager.hasCapacity(provider)) {
        continue;
      }

      try {
        const result = await this.callVisionProvider(provider, imageBase64, prompt, mimeType);
        if (result.success) {
          return result;
        }
      } catch (error) {
        logger.warn(`Vision analysis with ${provider} failed:`, error);
        continue;
      }
    }

    return {
      success: false,
      error: 'All vision providers failed. Please try again later.',
      provider: 'gemini',
      model: 'unknown',
    };
  }

  /**
   * Call OCR provider
   */
  private async callOCRProvider(
    provider: ProviderType,
    imageBase64: string,
    mimeType: string
  ): Promise<ImageAnalysisResult> {
    const keyData = providerManager.getNextKey(provider);
    if (!keyData) {
      throw new Error(`No keys available for ${provider}`);
    }

    try {
      let result: ImageAnalysisResult;

      switch (provider) {
        case 'huggingface':
          result = await this.huggingFaceOCR(keyData.key, imageBase64);
          break;
        case 'gemini':
          result = await this.geminiOCR(keyData.key, imageBase64, mimeType);
          break;
        default:
          throw new Error(`OCR not supported for ${provider}`);
      }

      providerManager.markKeySuccess(provider, keyData.index);
      return result;
    } catch (error: unknown) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      const isRateLimit = errorMessage.includes('rate') || errorMessage.includes('429');
      providerManager.markKeyError(provider, keyData.index, errorMessage, isRateLimit);
      throw error;
    }
  }

  /**
   * Call Vision provider for image analysis
   */
  private async callVisionProvider(
    provider: ProviderType,
    imageBase64: string,
    prompt: string,
    mimeType: string
  ): Promise<ImageAnalysisResult> {
    const keyData = providerManager.getNextKey(provider);
    if (!keyData) {
      throw new Error(`No keys available for ${provider}`);
    }

    try {
      let result: ImageAnalysisResult;

      switch (provider) {
        case 'gemini':
          result = await this.geminiVision(keyData.key, imageBase64, prompt, mimeType);
          break;
        case 'openrouter':
          result = await this.openRouterVision(keyData.key, imageBase64, prompt, mimeType);
          break;
        case 'huggingface':
          result = await this.huggingFaceVision(keyData.key, imageBase64, prompt);
          break;
        default:
          throw new Error(`Vision not supported for ${provider}`);
      }

      providerManager.markKeySuccess(provider, keyData.index);
      return result;
    } catch (error: unknown) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      const isRateLimit = errorMessage.includes('rate') || errorMessage.includes('429');
      providerManager.markKeyError(provider, keyData.index, errorMessage, isRateLimit);
      throw error;
    }
  }

  /**
   * Hugging Face OCR using TrOCR model (new router endpoint)
   */
  private async huggingFaceOCR(apiKey: string, imageBase64: string): Promise<ImageAnalysisResult> {
    const model = 'microsoft/trocr-large-printed';
    
    // Convert base64 to binary
    const imageBuffer = Buffer.from(imageBase64, 'base64');

    const response = await axios.post(
      `https://router.huggingface.co/hf-inference/models/${model}`,
      imageBuffer,
      {
        headers: {
          'Authorization': `Bearer ${apiKey}`,
          'Content-Type': 'application/octet-stream',
        },
        timeout: 30000,
      }
    );

    // TrOCR returns generated text
    const text = response.data?.[0]?.generated_text || response.data?.generated_text || '';

    return {
      success: !!text,
      text,
      provider: 'huggingface',
      model,
    };
  }

  /**
   * Gemini OCR (using gemini-2.5-flash)
   */
  private async geminiOCR(apiKey: string, imageBase64: string, mimeType: string): Promise<ImageAnalysisResult> {
    const model = 'gemini-2.5-flash';

    const response = await axios.post(
      `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${apiKey}`,
      {
        contents: [{
          parts: [
            { text: 'Extract all text from this image. Return only the extracted text, nothing else.' },
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
          temperature: 0.1,
        },
      },
      {
        headers: { 'Content-Type': 'application/json' },
        timeout: 30000,
      }
    );

    const text = response.data.candidates?.[0]?.content?.parts?.[0]?.text || '';

    return {
      success: !!text,
      text,
      provider: 'gemini',
      model,
    };
  }

  /**
   * Gemini Vision for image analysis (using gemini-2.5-flash)
   */
  private async geminiVision(
    apiKey: string,
    imageBase64: string,
    prompt: string,
    mimeType: string
  ): Promise<ImageAnalysisResult> {
    const model = 'gemini-2.5-flash';

    const response = await axios.post(
      `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${apiKey}`,
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
          temperature: 0.7,
        },
      },
      {
        headers: { 'Content-Type': 'application/json' },
        timeout: 30000,
      }
    );

    const description = response.data.candidates?.[0]?.content?.parts?.[0]?.text || '';

    return {
      success: !!description,
      description,
      provider: 'gemini',
      model,
    };
  }

  /**
   * OpenRouter Vision (using a vision-capable model)
   */
  private async openRouterVision(
    apiKey: string,
    imageBase64: string,
    prompt: string,
    mimeType: string
  ): Promise<ImageAnalysisResult> {
    const model = 'google/gemini-2.0-flash-exp:free';

    const response = await axios.post(
      'https://openrouter.ai/api/v1/chat/completions',
      {
        model,
        messages: [
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
        max_tokens: 4096,
      },
      {
        headers: {
          'Authorization': `Bearer ${apiKey}`,
          'Content-Type': 'application/json',
          'HTTP-Referer': 'https://baatcheet.app',
          'X-Title': 'BaatCheet',
        },
        timeout: 30000,
      }
    );

    const description = response.data.choices?.[0]?.message?.content || '';

    return {
      success: !!description,
      description,
      provider: 'openrouter',
      model,
    };
  }

  /**
   * Hugging Face Vision (image captioning - new router endpoint)
   */
  private async huggingFaceVision(
    apiKey: string,
    imageBase64: string,
    _prompt: string
  ): Promise<ImageAnalysisResult> {
    const model = 'Salesforce/blip-image-captioning-large';
    
    const imageBuffer = Buffer.from(imageBase64, 'base64');

    const response = await axios.post(
      `https://router.huggingface.co/hf-inference/models/${model}`,
      imageBuffer,
      {
        headers: {
          'Authorization': `Bearer ${apiKey}`,
          'Content-Type': 'application/octet-stream',
        },
        timeout: 30000,
      }
    );

    const description = response.data?.[0]?.generated_text || '';

    return {
      success: !!description,
      description,
      provider: 'huggingface',
      model,
    };
  }

  /**
   * Get vision service health
   */
  public getHealth(): { ocr: boolean; vision: boolean } {
    return {
      ocr: providerManager.hasCapacity('huggingface') || providerManager.hasCapacity('gemini'),
      vision: providerManager.hasCapacity('gemini') || providerManager.hasCapacity('openrouter'),
    };
  }
}

// Export singleton instance
export const visionService = new VisionServiceClass();
export default visionService;
