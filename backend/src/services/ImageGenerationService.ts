/**
 * Advanced Image Generation Service
 * Generates images using HuggingFace free models with advanced features
 * 
 * Features:
 * - Multi-model support (SDXL, FLUX, Playground v2.5)
 * - AI-powered prompt enhancement
 * - Style presets (15+ artistic styles)
 * - Aspect ratio support
 * - Image variations
 * - Per-user daily limits with tier-based quotas
 * - Load balancing across API keys
 * - Batch generation (Pro users)
 * - Smart suggestions
 * 
 * @module ImageGenerationService
 */

import axios from 'axios';
import { logger } from '../utils/logger.js';
import { prisma } from '../config/database.js';
import { aiRouter } from './AIRouter.js';
import { 
  IMAGE_STYLE_PRESETS, 
  ASPECT_RATIOS, 
  getStylePreset,
  getAspectRatioDimensions 
} from '../config/modePrompts.js';

// ============================================
// Types
// ============================================

export interface ImageGenerationOptions {
  prompt: string;
  negativePrompt?: string;
  style?: string;
  aspectRatio?: string;
  width?: number;
  height?: number;
  steps?: number;
  guidanceScale?: number;
  model?: string;
  seed?: number;
  enhancePrompt?: boolean;
}

export interface ImageGenerationResult {
  success: boolean;
  imageUrl?: string;
  imageBase64?: string;
  model: string;
  originalPrompt: string;
  enhancedPrompt: string;
  seed: number;
  generationTime: number;
  style?: string;
  aspectRatio?: string;
  error?: string;
}

export interface UserGenerationStatus {
  canGenerate: boolean;
  remainingGenerations: number;
  dailyLimit: number;
  usedToday: number;
  nextAvailableAt?: Date;
  totalGenerated: number;
  tier: string;
}

export interface PromptSuggestion {
  improvement: string;
  reason: string;
  enhancedPrompt: string;
}

export interface BatchGenerationResult {
  success: boolean;
  results: Array<{
    success: boolean;
    prompt: string;
    imageUrl?: string;
    error?: string;
  }>;
  totalGenerated: number;
  totalFailed: number;
}

interface ModelConfig {
  id: string;
  name: string;
  endpoint: string;
  maxWidth: number;
  maxHeight: number;
  defaultSteps: number;
  guidanceScale: number;
  quality: 'fast' | 'balanced' | 'high' | 'excellent';
  speed: 'fast' | 'medium' | 'slow';
  dailyLimit: number;
}

// ============================================
// Model Configurations
// ============================================

// ============================================
// ImagePro Space Configuration (Primary)
// Using user's own HuggingFace Space for reliable image generation
// ============================================

const IMAGEPRO_SPACE = {
  url: 'https://sharry121-imagepro.hf.space',
  apiPrefix: '/gradio_api',
  apiEndpoint: 'https://sharry121-imagepro.hf.space/gradio_api/call/inference',
  runEndpoint: 'https://sharry121-imagepro.hf.space/gradio_api/run/predict',
  legacyEndpoint: 'https://sharry121-imagepro.hf.space/api/predict',
};

const MODELS: Record<string, ModelConfig> = {
  // Primary: Use ImagePro Space (most reliable)
  'imagepro': {
    id: 'sharry121/ImagePro',
    name: 'ImagePro (Space)',
    endpoint: IMAGEPRO_SPACE.apiEndpoint,
    maxWidth: 1024,
    maxHeight: 1024,
    defaultSteps: 25,
    guidanceScale: 7.5,
    quality: 'excellent',
    speed: 'medium',
    dailyLimit: 1000,
  },
  'flux-schnell': {
    id: 'black-forest-labs/FLUX.1-schnell',
    name: 'FLUX Schnell',
    endpoint: 'https://api-inference.huggingface.co/models/black-forest-labs/FLUX.1-schnell',
    maxWidth: 1024,
    maxHeight: 1024,
    defaultSteps: 4,
    guidanceScale: 0,
    quality: 'excellent',
    speed: 'fast',
    dailyLimit: 1000,
  },
  'stable-diffusion-xl': {
    id: 'stabilityai/stable-diffusion-xl-base-1.0',
    name: 'Stable Diffusion XL',
    endpoint: 'https://api-inference.huggingface.co/models/stabilityai/stable-diffusion-xl-base-1.0',
    maxWidth: 1024,
    maxHeight: 1024,
    defaultSteps: 30,
    guidanceScale: 7.5,
    quality: 'high',
    speed: 'medium',
    dailyLimit: 1000,
  },
  'playground-v2.5': {
    id: 'playgroundai/playground-v2.5-1024px-aesthetic',
    name: 'Playground v2.5',
    endpoint: 'https://api-inference.huggingface.co/models/playgroundai/playground-v2.5-1024px-aesthetic',
    maxWidth: 1024,
    maxHeight: 1024,
    defaultSteps: 25,
    guidanceScale: 3,
    quality: 'excellent',
    speed: 'medium',
    dailyLimit: 1000,
  },
  'stable-diffusion-1.5': {
    id: 'runwayml/stable-diffusion-v1-5',
    name: 'Stable Diffusion 1.5',
    endpoint: 'https://api-inference.huggingface.co/models/runwayml/stable-diffusion-v1-5',
    maxWidth: 512,
    maxHeight: 512,
    defaultSteps: 25,
    guidanceScale: 7.5,
    quality: 'balanced',
    speed: 'fast',
    dailyLimit: 1000,
  },
};

// ============================================
// Daily Limits by Tier
// ============================================

const DAILY_LIMITS = {
  free: 1,
  pro: 50,
  enterprise: 500,
};

// ============================================
// Image Generation Service Class
// ============================================

class ImageGenerationServiceClass {
  private readonly HF_API_KEYS: string[] = [];
  private currentKeyIndex = 0;
  private keyUsage: Map<string, number> = new Map();
  private lastResetDate: Date = new Date();

  constructor() {
    this.loadApiKeys();
    this.resetDailyCountersIfNeeded();
  }

  /**
   * Load HuggingFace API keys from environment
   */
  private loadApiKeys(): void {
    for (let i = 1; i <= 10; i++) {
      const key = process.env[`HUGGINGFACE_API_KEY_${i}`];
      if (key && key.startsWith('hf_')) {
        this.HF_API_KEYS.push(key);
        this.keyUsage.set(key, 0);
      }
    }
    
    const singleKey = process.env.HUGGINGFACE_API_KEY;
    if (singleKey && singleKey.startsWith('hf_') && !this.HF_API_KEYS.includes(singleKey)) {
      this.HF_API_KEYS.push(singleKey);
      this.keyUsage.set(singleKey, 0);
    }
    
    logger.info(`Image Generation initialized with ${this.HF_API_KEYS.length} HuggingFace keys`);
  }

  /**
   * Get next available API key with load balancing
   */
  private getNextApiKey(): string | null {
    this.resetDailyCountersIfNeeded();
    
    if (this.HF_API_KEYS.length === 0) return null;
    
    // Find key with lowest usage
    let bestKey: string | null = null;
    let lowestUsage = Infinity;
    
    for (const key of this.HF_API_KEYS) {
      const usage = this.keyUsage.get(key) || 0;
      if (usage < lowestUsage && usage < 1000) {
        lowestUsage = usage;
        bestKey = key;
      }
    }
    
    return bestKey;
  }

  /**
   * Reset daily counters if new day
   */
  private resetDailyCountersIfNeeded(): void {
    const now = new Date();
    if (now.getDate() !== this.lastResetDate.getDate()) {
      this.keyUsage.clear();
      this.HF_API_KEYS.forEach(key => this.keyUsage.set(key, 0));
      this.lastResetDate = now;
      logger.info('Image generation key usage counters reset');
    }
  }

  /**
   * Check user's generation limit and status
   */
  public async checkUserLimit(userId: string): Promise<UserGenerationStatus> {
    try {
      const user = await prisma.user.findUnique({
        where: { id: userId },
        select: { tier: true },
      });

      const tier = (user?.tier || 'free') as keyof typeof DAILY_LIMITS;
      const dailyLimit = DAILY_LIMITS[tier] || DAILY_LIMITS.free;

      const twentyFourHoursAgo = new Date(Date.now() - 24 * 60 * 60 * 1000);
      
      const usedToday = await prisma.imageGeneration.count({
        where: {
          userId,
          createdAt: { gte: twentyFourHoursAgo },
          status: 'completed',
        },
      });

      const totalGenerated = await prisma.imageGeneration.count({
        where: { userId, status: 'completed' },
      });

      const canGenerate = usedToday < dailyLimit;
      const remainingGenerations = Math.max(0, dailyLimit - usedToday);

      let nextAvailableAt: Date | undefined;
      if (!canGenerate) {
        const oldestRecent = await prisma.imageGeneration.findFirst({
          where: {
            userId,
            createdAt: { gte: twentyFourHoursAgo },
            status: 'completed',
          },
          orderBy: { createdAt: 'asc' },
        });
        
        if (oldestRecent) {
          nextAvailableAt = new Date(oldestRecent.createdAt.getTime() + 24 * 60 * 60 * 1000);
        }
      }

      return {
        canGenerate,
        remainingGenerations,
        dailyLimit,
        usedToday,
        nextAvailableAt,
        totalGenerated,
        tier,
      };
    } catch (error) {
      logger.error('Error checking user generation limit:', error);
      return {
        canGenerate: false,
        remainingGenerations: 0,
        dailyLimit: 1,
        usedToday: 0,
        totalGenerated: 0,
        tier: 'free',
      };
    }
  }

  /**
   * Enhance user prompt using AI for better results
   */
  public async enhancePrompt(
    userPrompt: string, 
    style?: string
  ): Promise<string> {
    try {
      const styleInfo = style ? `\nDesired style: ${style}` : '';
      
      const enhancementPrompt = `You are an expert prompt engineer for AI image generation. Enhance this user prompt to produce the best possible image. Add specific details about lighting, composition, style, and quality, but keep the core idea intact.

User prompt: "${userPrompt}"${styleInfo}

Rules:
1. Keep the enhanced prompt under 200 words
2. Add specific visual details (lighting, colors, textures)
3. Include quality terms (detailed, high quality, sharp)
4. Maintain the original subject and intent
5. Don't add text or watermarks

Return ONLY the enhanced prompt, nothing else:`;

      const response = await aiRouter.chat({
        messages: [{ role: 'user', content: enhancementPrompt }],
        temperature: 0.7,
        maxTokens: 300,
      });

      let enhanced = response.content?.trim() || userPrompt;
      
      // Add style modifiers if specified
      if (style && IMAGE_STYLE_PRESETS[style]) {
        enhanced += ', ' + IMAGE_STYLE_PRESETS[style].prompt;
      }
      
      // Limit length
      if (enhanced.length > 500) {
        enhanced = enhanced.substring(0, 500);
      }

      return enhanced;
    } catch (error) {
      logger.error('Prompt enhancement failed:', error);
      // Return original with basic enhancements
      return `${userPrompt}, high quality, detailed, sharp focus`;
    }
  }

  /**
   * Generate an image from prompt
   */
  public async generateImage(
    userId: string,
    options: ImageGenerationOptions
  ): Promise<ImageGenerationResult> {
    const startTime = Date.now();
    const seed = options.seed || Math.floor(Math.random() * 2147483647);

    // Check user limit
    const limitStatus = await this.checkUserLimit(userId);
    if (!limitStatus.canGenerate) {
      return {
        success: false,
        model: '',
        originalPrompt: options.prompt,
        enhancedPrompt: '',
        seed,
        generationTime: 0,
        error: `Daily limit reached (${limitStatus.dailyLimit}/day for ${limitStatus.tier} tier). Next generation available at ${limitStatus.nextAvailableAt?.toISOString()}`,
      };
    }

    // Get API key
    const apiKey = this.getNextApiKey();
    if (!apiKey) {
      return {
        success: false,
        model: '',
        originalPrompt: options.prompt,
        enhancedPrompt: '',
        seed,
        generationTime: 0,
        error: 'No HuggingFace API keys available. Please try again later.',
      };
    }

    // Select model - Use ImagePro Space as primary for reliability
    const modelKey = options.model || 'imagepro';
    const modelConfig = MODELS[modelKey] || MODELS['imagepro'];

    // Enhance prompt if requested (default: true)
    let enhancedPrompt = options.prompt;
    if (options.enhancePrompt !== false) {
      enhancedPrompt = await this.enhancePrompt(options.prompt, options.style);
    }

    // Get negative prompt
    let negativePrompt = options.negativePrompt || this.getDefaultNegativePrompt();
    if (options.style && IMAGE_STYLE_PRESETS[options.style]) {
      negativePrompt = IMAGE_STYLE_PRESETS[options.style].negativePrompt;
    }

    // Get dimensions
    let width = options.width || 1024;
    let height = options.height || 1024;
    
    if (options.aspectRatio) {
      const dimensions = getAspectRatioDimensions(options.aspectRatio);
      width = Math.min(dimensions.width, modelConfig.maxWidth);
      height = Math.min(dimensions.height, modelConfig.maxHeight);
    } else {
      width = Math.min(width, modelConfig.maxWidth);
      height = Math.min(height, modelConfig.maxHeight);
    }

    // Create generation record
    const generationRecord = await prisma.imageGeneration.create({
      data: {
        userId,
        prompt: options.prompt,
        optimizedPrompt: enhancedPrompt,
        negativePrompt,
        model: modelConfig.id,
        width,
        height,
        status: 'processing',
      },
    });

    try {
      logger.info('Starting image generation', {
        userId,
        model: modelConfig.name,
        promptLength: enhancedPrompt.length,
        dimensions: `${width}x${height}`,
        isSpaceMode: modelKey === 'imagepro',
      });

      let imageBase64: string;
      let imageUrl: string;

      // Use different API call based on model type
      if (modelKey === 'imagepro') {
        // Use ImagePro Space (Gradio API format)
        const spaceResult = await this.callImageProSpace(enhancedPrompt, negativePrompt, apiKey);
        if (!spaceResult.success) {
          throw new Error(spaceResult.error || 'ImagePro Space failed');
        }
        imageBase64 = spaceResult.imageBase64!;
        imageUrl = spaceResult.imageUrl!;
      } else {
        // Use direct HuggingFace Inference API
        const requestBody: any = {
          inputs: enhancedPrompt,
        };

        // Add parameters for non-FLUX models
        if (!modelKey.includes('flux')) {
          requestBody.parameters = {
            negative_prompt: negativePrompt,
            width,
            height,
            num_inference_steps: options.steps || modelConfig.defaultSteps,
            guidance_scale: options.guidanceScale || modelConfig.guidanceScale,
            seed,
          };
        }

        // Call HuggingFace API
        const response = await axios.post(
          modelConfig.endpoint,
          requestBody,
          {
            headers: {
              'Authorization': `Bearer ${apiKey}`,
              'Content-Type': 'application/json',
            },
            responseType: 'arraybuffer',
            timeout: 180000, // 3 minutes timeout
          }
        );

        // Convert to base64
        imageBase64 = Buffer.from(response.data).toString('base64');
        imageUrl = `data:image/png;base64,${imageBase64}`;
      }

      const generationTime = Date.now() - startTime;

      // Update generation record
      await prisma.imageGeneration.update({
        where: { id: generationRecord.id },
        data: {
          status: 'completed',
          imageUrl,
          generationTime,
        },
      });

      // Update key usage
      const currentUsage = this.keyUsage.get(apiKey) || 0;
      this.keyUsage.set(apiKey, currentUsage + 1);

      logger.info('Image generation completed', {
        userId,
        model: modelConfig.name,
        generationTime,
        seed,
      });

      return {
        success: true,
        imageUrl,
        imageBase64,
        model: modelConfig.name,
        originalPrompt: options.prompt,
        enhancedPrompt,
        seed,
        generationTime,
        style: options.style,
        aspectRatio: options.aspectRatio,
      };

    } catch (error: any) {
      const generationTime = Date.now() - startTime;
      
      await prisma.imageGeneration.update({
        where: { id: generationRecord.id },
        data: {
          status: 'failed',
          error: error.message,
          generationTime,
        },
      });

      logger.error('Image generation failed:', {
        error: error.message,
        model: modelConfig.name,
        status: error.response?.status,
      });

      // Handle specific errors
      if (error.response?.status === 503) {
        return {
          success: false,
          model: modelConfig.name,
          originalPrompt: options.prompt,
          enhancedPrompt,
          seed,
          generationTime,
          error: 'Model is loading. Please try again in 30-60 seconds.',
        };
      }

      if (error.response?.status === 429) {
        return {
          success: false,
          model: modelConfig.name,
          originalPrompt: options.prompt,
          enhancedPrompt,
          seed,
          generationTime,
          error: 'Rate limit exceeded. Please try again in a few minutes.',
        };
      }

      return {
        success: false,
        model: modelConfig.name,
        originalPrompt: options.prompt,
        enhancedPrompt,
        seed,
        generationTime,
        error: error.message || 'Image generation failed. Please try again.',
      };
    }
  }

  /**
   * Generate variations of an existing image
   */
  public async generateVariations(
    userId: string,
    imageId: string,
    numVariations: number = 3
  ): Promise<ImageGenerationResult[]> {
    // Get original image
    const original = await prisma.imageGeneration.findFirst({
      where: { id: imageId, userId },
    });

    if (!original) {
      throw new Error('Original image not found');
    }

    // Check user limit
    const limitStatus = await this.checkUserLimit(userId);
    if (limitStatus.remainingGenerations < numVariations) {
      throw new Error(`Not enough remaining generations. You have ${limitStatus.remainingGenerations} left.`);
    }

    const variations: ImageGenerationResult[] = [];

    for (let i = 0; i < numVariations; i++) {
      const result = await this.generateImage(userId, {
        prompt: original.prompt,
        negativePrompt: original.negativePrompt || undefined,
        model: original.model,
        width: original.width,
        height: original.height,
        enhancePrompt: false, // Use original enhanced prompt
      });

      variations.push(result);

      // Small delay between generations
      if (i < numVariations - 1) {
        await new Promise(resolve => setTimeout(resolve, 1000));
      }
    }

    return variations;
  }

  /**
   * Batch generate images (Pro users only)
   */
  public async batchGenerate(
    userId: string,
    prompts: string[],
    options: Partial<ImageGenerationOptions> = {}
  ): Promise<BatchGenerationResult> {
    // Check user tier
    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: { tier: true },
    });

    if (user?.tier === 'free') {
      throw new Error('Batch generation is only available for Pro and Enterprise users');
    }

    // Check limit
    const limitStatus = await this.checkUserLimit(userId);
    if (limitStatus.remainingGenerations < prompts.length) {
      throw new Error(`Not enough remaining generations. You have ${limitStatus.remainingGenerations} left, but requested ${prompts.length}.`);
    }

    const results: BatchGenerationResult['results'] = [];
    let totalGenerated = 0;
    let totalFailed = 0;

    for (const prompt of prompts) {
      try {
        const result = await this.generateImage(userId, {
          ...options,
          prompt,
        });

        if (result.success) {
          results.push({
            success: true,
            prompt,
            imageUrl: result.imageUrl,
          });
          totalGenerated++;
        } else {
          results.push({
            success: false,
            prompt,
            error: result.error,
          });
          totalFailed++;
        }
      } catch (error: any) {
        results.push({
          success: false,
          prompt,
          error: error.message,
        });
        totalFailed++;
      }

      // Delay between generations
      await new Promise(resolve => setTimeout(resolve, 2000));
    }

    return {
      success: totalGenerated > 0,
      results,
      totalGenerated,
      totalFailed,
    };
  }

  /**
   * Get AI-powered suggestions to improve a prompt
   */
  public async getSuggestions(prompt: string): Promise<PromptSuggestion[]> {
    try {
      const suggestionPrompt = `Given this image generation prompt, suggest 3 specific improvements that would make the image more interesting, detailed, or beautiful.

Original prompt: "${prompt}"

Return ONLY a JSON array with exactly 3 objects:
[
  {"improvement": "specific suggestion", "reason": "why this helps", "enhancedPrompt": "full improved prompt"},
  {"improvement": "specific suggestion", "reason": "why this helps", "enhancedPrompt": "full improved prompt"},
  {"improvement": "specific suggestion", "reason": "why this helps", "enhancedPrompt": "full improved prompt"}
]`;

      const response = await aiRouter.chat({
        messages: [{ role: 'user', content: suggestionPrompt }],
        temperature: 0.7,
        maxTokens: 1000,
      });

      const content = response.content?.trim() || '[]';
      const jsonStr = content.replace(/```json\n?|\n?```/g, '').trim();
      
      return JSON.parse(jsonStr);
    } catch (error) {
      logger.error('Failed to get suggestions:', error);
      return [
        {
          improvement: 'Add lighting details',
          reason: 'Specific lighting creates mood and depth',
          enhancedPrompt: `${prompt}, dramatic lighting, golden hour`,
        },
        {
          improvement: 'Include style reference',
          reason: 'Style references help achieve consistent aesthetics',
          enhancedPrompt: `${prompt}, digital art style, trending on artstation`,
        },
        {
          improvement: 'Add quality modifiers',
          reason: 'Quality terms improve output fidelity',
          enhancedPrompt: `${prompt}, highly detailed, 8k, professional`,
        },
      ];
    }
  }

  /**
   * Call ImagePro Space for image generation (Gradio API)
   * Supports multiple API formats for compatibility
   */
  private async callImageProSpace(
    prompt: string,
    negativePrompt: string,
    apiKey: string
  ): Promise<{ success: boolean; imageUrl?: string; imageBase64?: string; error?: string }> {
    const headers = {
      'Authorization': `Bearer ${apiKey}`,
      'Content-Type': 'application/json',
    };

    // Try multiple Gradio API formats for compatibility
    const apiMethods = [
      // Method 1: Gradio 4.x /gradio_api/call/inference endpoint (correct for this Space)
      async () => {
        logger.info('Trying ImagePro Space: /gradio_api/call/inference');
        const callResponse = await axios.post(
          IMAGEPRO_SPACE.apiEndpoint,
          { data: [prompt] }, // ImagePro may only need the prompt
          { headers, timeout: 120000 }
        );
        
        if (callResponse.data?.event_id) {
          // Poll for result using SSE
          const eventId = callResponse.data.event_id;
          logger.info(`Got event_id: ${eventId}, polling for result...`);
          
          for (let i = 0; i < 90; i++) { // Up to 3 minutes of polling
            await new Promise(r => setTimeout(r, 2000));
            
            try {
              const resultResponse = await axios.get(
                `${IMAGEPRO_SPACE.apiEndpoint}/${eventId}`,
                { headers, timeout: 30000, responseType: 'text' }
              );
              
              const responseText = typeof resultResponse.data === 'string' 
                ? resultResponse.data 
                : JSON.stringify(resultResponse.data);
              
              // Parse SSE format
              const lines = responseText.split('\n');
              for (const line of lines) {
                if (line.startsWith('data:')) {
                  try {
                    const jsonStr = line.substring(5).trim();
                    if (jsonStr) {
                      const jsonData = JSON.parse(jsonStr);
                      // Handle various response formats
                      const imageData = Array.isArray(jsonData) ? jsonData[0] : jsonData;
                      
                      if (imageData?.url) {
                        logger.info('Got image URL from ImagePro Space');
                        // Download the image
                        const imgResponse = await axios.get(imageData.url, { 
                          responseType: 'arraybuffer',
                          timeout: 30000 
                        });
                        const base64 = Buffer.from(imgResponse.data).toString('base64');
                        return { success: true, imageBase64: base64, imageUrl: `data:image/png;base64,${base64}` };
                      }
                      if (imageData?.path) {
                        // Handle file path format
                        const fileUrl = `${IMAGEPRO_SPACE.url}/file=${imageData.path}`;
                        const imgResponse = await axios.get(fileUrl, { 
                          responseType: 'arraybuffer',
                          timeout: 30000 
                        });
                        const base64 = Buffer.from(imgResponse.data).toString('base64');
                        return { success: true, imageBase64: base64, imageUrl: `data:image/png;base64,${base64}` };
                      }
                      if (typeof imageData === 'string' && imageData.startsWith('data:')) {
                        const base64 = imageData.split(',')[1];
                        return { success: true, imageBase64: base64, imageUrl: imageData };
                      }
                    }
                  } catch (parseError) {
                    // Continue parsing other lines
                  }
                }
                
                // Check for completion event
                if (line.startsWith('event: complete')) {
                  logger.info('Received completion event');
                }
              }
            } catch (pollError: any) {
              if (pollError.response?.status === 404) {
                // Event might have expired, continue polling
                continue;
              }
              throw pollError;
            }
          }
          throw new Error('Timeout waiting for image generation (3 minutes)');
        }
        throw new Error('No event_id returned from ImagePro Space');
      },
      
      // Method 2: Gradio /run/predict endpoint
      async () => {
        logger.info('Trying ImagePro Space: /gradio_api/run/predict');
        const response = await axios.post(
          IMAGEPRO_SPACE.runEndpoint,
          { 
            data: [prompt],
            fn_index: 4 // Index for 'inference' function based on config
          },
          { headers, timeout: 180000 }
        );
        
        if (response.data?.data?.[0]) {
          const result = response.data.data[0];
          if (typeof result === 'string' && result.startsWith('data:')) {
            const base64 = result.split(',')[1];
            return { success: true, imageBase64: base64, imageUrl: result };
          }
          if (result?.url) {
            const imgResponse = await axios.get(result.url, { responseType: 'arraybuffer' });
            const base64 = Buffer.from(imgResponse.data).toString('base64');
            return { success: true, imageBase64: base64, imageUrl: `data:image/png;base64,${base64}` };
          }
          if (result?.path) {
            const fileUrl = `${IMAGEPRO_SPACE.url}/file=${result.path}`;
            const imgResponse = await axios.get(fileUrl, { responseType: 'arraybuffer' });
            const base64 = Buffer.from(imgResponse.data).toString('base64');
            return { success: true, imageBase64: base64, imageUrl: `data:image/png;base64,${base64}` };
          }
        }
        throw new Error('Invalid response format from /run/predict');
      },
      
      // Method 3: Legacy /api/predict endpoint
      async () => {
        logger.info('Trying ImagePro Space: /api/predict (legacy)');
        const response = await axios.post(
          IMAGEPRO_SPACE.legacyEndpoint,
          { 
            data: [prompt],
            fn_index: 4
          },
          { headers, timeout: 180000 }
        );
        
        if (response.data?.data?.[0]) {
          const result = response.data.data[0];
          if (typeof result === 'string') {
            if (result.startsWith('data:')) {
              const base64 = result.split(',')[1];
              return { success: true, imageBase64: base64, imageUrl: result };
            }
            // URL format
            const imgResponse = await axios.get(result, { responseType: 'arraybuffer' });
            const base64 = Buffer.from(imgResponse.data).toString('base64');
            return { success: true, imageBase64: base64, imageUrl: `data:image/png;base64,${base64}` };
          }
        }
        throw new Error('Invalid response format from /api/predict');
      },
    ];

    // Try each method until one succeeds
    for (let i = 0; i < apiMethods.length; i++) {
      try {
        const result = await apiMethods[i]();
        if (result.success) {
          logger.info(`ImagePro Space succeeded with method ${i + 1}`);
          return result;
        }
      } catch (error: any) {
        logger.warn(`ImagePro Space method ${i + 1} failed: ${error.message}`);
        if (i === apiMethods.length - 1) {
          return { success: false, error: `All ImagePro Space methods failed. Last error: ${error.message}` };
        }
      }
    }

    return { success: false, error: 'All ImagePro Space API methods failed' };
  }

  /**
   * Get default negative prompt
   */
  private getDefaultNegativePrompt(): string {
    return 'low quality, blurry, distorted, deformed, ugly, bad anatomy, watermark, text, signature, cropped, out of frame, worst quality, jpeg artifacts, duplicate, morbid, mutilated, extra fingers, mutated hands, poorly drawn hands, poorly drawn face, mutation, deformed, bad proportions, extra limbs, cloned face, disfigured, gross proportions, malformed limbs, missing arms, missing legs, extra arms, extra legs, fused fingers, too many fingers, long neck';
  }

  /**
   * Get available models
   */
  public getAvailableModels(): Array<{
    id: string;
    name: string;
    quality: string;
    speed: string;
    maxResolution: string;
  }> {
    return Object.entries(MODELS).map(([key, config]) => ({
      id: key,
      name: config.name,
      quality: config.quality,
      speed: config.speed,
      maxResolution: `${config.maxWidth}x${config.maxHeight}`,
    }));
  }

  /**
   * Get available styles
   */
  public getAvailableStyles(): Array<{ id: string; name: string }> {
    return Object.entries(IMAGE_STYLE_PRESETS).map(([id, preset]) => ({
      id,
      name: preset.name,
    }));
  }

  /**
   * Get available aspect ratios
   */
  public getAvailableAspectRatios(): Array<{ id: string; name: string; dimensions: string }> {
    return Object.entries(ASPECT_RATIOS).map(([id, config]) => ({
      id,
      name: config.name,
      dimensions: `${config.width}x${config.height}`,
    }));
  }

  /**
   * Get user's generation history
   */
  public async getUserHistory(
    userId: string,
    limit: number = 20,
    offset: number = 0
  ): Promise<Array<{
    id: string;
    prompt: string;
    imageUrl: string | null;
    model: string;
    style?: string;
    status: string;
    createdAt: Date;
  }>> {
    const generations = await prisma.imageGeneration.findMany({
      where: { userId },
      orderBy: { createdAt: 'desc' },
      take: limit,
      skip: offset,
      select: {
        id: true,
        prompt: true,
        imageUrl: true,
        model: true,
        status: true,
        createdAt: true,
      },
    });

    return generations;
  }

  /**
   * Check if service is available
   */
  public isAvailable(): boolean {
    return this.HF_API_KEYS.length > 0;
  }

  /**
   * Get service status
   */
  public getStatus(): {
    available: boolean;
    totalKeys: number;
    modelsAvailable: number;
    stylesAvailable: number;
  } {
    return {
      available: this.isAvailable(),
      totalKeys: this.HF_API_KEYS.length,
      modelsAvailable: Object.keys(MODELS).length,
      stylesAvailable: Object.keys(IMAGE_STYLE_PRESETS).length,
    };
  }
}

// Export singleton instance
export const imageGeneration = new ImageGenerationServiceClass();
export default imageGeneration;
