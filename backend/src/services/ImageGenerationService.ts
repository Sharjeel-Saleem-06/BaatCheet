/**
 * Image Generation Service
 * Generates images using HuggingFace free models
 * 
 * Features:
 * - Multi-model support (Stable Diffusion, FLUX, etc.)
 * - Per-user daily limits (1 image/24hr for free tier)
 * - Optimized prompts for quality results
 * - Load balancing across API keys
 * 
 * @module ImageGenerationService
 */

import axios from 'axios';
import { logger } from '../utils/logger.js';
import { prisma } from '../config/database.js';

// ============================================
// Types
// ============================================

export interface ImageGenerationOptions {
  prompt: string;
  negativePrompt?: string;
  width?: number;
  height?: number;
  steps?: number;
  guidanceScale?: number;
  model?: string;
}

export interface ImageGenerationResult {
  success: boolean;
  imageUrl?: string;
  imageBase64?: string;
  model: string;
  prompt: string;
  generationTime: number;
  error?: string;
}

export interface UserGenerationStatus {
  canGenerate: boolean;
  remainingGenerations: number;
  nextAvailableAt?: Date;
  totalGenerated: number;
}

interface ModelConfig {
  id: string;
  name: string;
  endpoint: string;
  maxWidth: number;
  maxHeight: number;
  defaultSteps: number;
  quality: 'fast' | 'balanced' | 'high';
}

// ============================================
// Image Generation Service Class
// ============================================

class ImageGenerationServiceClass {
  // HuggingFace API keys (multi-key rotation)
  private readonly HF_API_KEYS: string[] = [];
  private currentKeyIndex = 0;

  // Daily limits per tier
  private readonly DAILY_LIMITS = {
    free: 1,      // 1 image per 24 hours
    pro: 10,      // 10 images per 24 hours
    enterprise: 100, // 100 images per 24 hours
  };

  // Available models (HuggingFace free inference)
  private readonly MODELS: ModelConfig[] = [
    {
      id: 'stabilityai/stable-diffusion-xl-base-1.0',
      name: 'Stable Diffusion XL',
      endpoint: 'https://api-inference.huggingface.co/models/stabilityai/stable-diffusion-xl-base-1.0',
      maxWidth: 1024,
      maxHeight: 1024,
      defaultSteps: 30,
      quality: 'high',
    },
    {
      id: 'runwayml/stable-diffusion-v1-5',
      name: 'Stable Diffusion 1.5',
      endpoint: 'https://api-inference.huggingface.co/models/runwayml/stable-diffusion-v1-5',
      maxWidth: 512,
      maxHeight: 512,
      defaultSteps: 25,
      quality: 'balanced',
    },
    {
      id: 'CompVis/stable-diffusion-v1-4',
      name: 'Stable Diffusion 1.4',
      endpoint: 'https://api-inference.huggingface.co/models/CompVis/stable-diffusion-v1-4',
      maxWidth: 512,
      maxHeight: 512,
      defaultSteps: 20,
      quality: 'fast',
    },
  ];

  // Default negative prompt for better results
  private readonly DEFAULT_NEGATIVE_PROMPT = 
    'blurry, bad quality, distorted, ugly, deformed, disfigured, ' +
    'low resolution, pixelated, watermark, text, logo, signature, ' +
    'cropped, out of frame, worst quality, low quality, jpeg artifacts';

  constructor() {
    this.loadApiKeys();
  }

  /**
   * Load HuggingFace API keys from environment
   */
  private loadApiKeys(): void {
    for (let i = 1; i <= 10; i++) {
      const key = process.env[`HUGGINGFACE_API_KEY_${i}`];
      if (key && key.startsWith('hf_')) {
        this.HF_API_KEYS.push(key);
      }
    }
    
    const singleKey = process.env.HUGGINGFACE_API_KEY;
    if (singleKey && singleKey.startsWith('hf_') && !this.HF_API_KEYS.includes(singleKey)) {
      this.HF_API_KEYS.push(singleKey);
    }
    
    logger.info(`Image Generation initialized with ${this.HF_API_KEYS.length} HuggingFace keys`);
  }

  /**
   * Get next available API key (round-robin)
   */
  private getNextApiKey(): string | null {
    if (this.HF_API_KEYS.length === 0) return null;
    const key = this.HF_API_KEYS[this.currentKeyIndex];
    this.currentKeyIndex = (this.currentKeyIndex + 1) % this.HF_API_KEYS.length;
    return key;
  }

  /**
   * Check if user can generate an image
   */
  public async checkUserLimit(userId: string): Promise<UserGenerationStatus> {
    try {
      // Get user tier
      const user = await prisma.user.findUnique({
        where: { id: userId },
        select: { tier: true },
      });

      const tier = (user?.tier || 'free') as keyof typeof this.DAILY_LIMITS;
      const dailyLimit = this.DAILY_LIMITS[tier] || this.DAILY_LIMITS.free;

      // Count generations in last 24 hours
      const twentyFourHoursAgo = new Date(Date.now() - 24 * 60 * 60 * 1000);
      
      const recentGenerations = await prisma.imageGeneration.count({
        where: {
          userId,
          createdAt: { gte: twentyFourHoursAgo },
          status: 'completed',
        },
      });

      // Get total generations
      const totalGenerated = await prisma.imageGeneration.count({
        where: { userId, status: 'completed' },
      });

      const canGenerate = recentGenerations < dailyLimit;
      const remainingGenerations = Math.max(0, dailyLimit - recentGenerations);

      // Calculate next available time
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
        nextAvailableAt,
        totalGenerated,
      };
    } catch (error) {
      logger.error('Error checking user generation limit:', error);
      return {
        canGenerate: false,
        remainingGenerations: 0,
        totalGenerated: 0,
      };
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

    // Check user limit first
    const limitStatus = await this.checkUserLimit(userId);
    if (!limitStatus.canGenerate) {
      return {
        success: false,
        model: '',
        prompt: options.prompt,
        generationTime: 0,
        error: `Daily limit reached. Next generation available at ${limitStatus.nextAvailableAt?.toISOString()}`,
      };
    }

    // Get API key
    const apiKey = this.getNextApiKey();
    if (!apiKey) {
      return {
        success: false,
        model: '',
        prompt: options.prompt,
        generationTime: 0,
        error: 'No HuggingFace API keys available',
      };
    }

    // Select model (default to balanced)
    const modelConfig = this.MODELS.find(m => m.id === options.model) || this.MODELS[1];

    // Optimize prompt for better results
    const optimizedPrompt = this.optimizePrompt(options.prompt);
    const negativePrompt = options.negativePrompt || this.DEFAULT_NEGATIVE_PROMPT;

    // Constrain dimensions
    const width = Math.min(options.width || 512, modelConfig.maxWidth);
    const height = Math.min(options.height || 512, modelConfig.maxHeight);

    // Create generation record
    const generationRecord = await prisma.imageGeneration.create({
      data: {
        userId,
        prompt: options.prompt,
        optimizedPrompt,
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
        promptLength: optimizedPrompt.length,
      });

      // Call HuggingFace API
      const response = await axios.post(
        modelConfig.endpoint,
        {
          inputs: optimizedPrompt,
          parameters: {
            negative_prompt: negativePrompt,
            width,
            height,
            num_inference_steps: options.steps || modelConfig.defaultSteps,
            guidance_scale: options.guidanceScale || 7.5,
          },
        },
        {
          headers: {
            'Authorization': `Bearer ${apiKey}`,
            'Content-Type': 'application/json',
          },
          responseType: 'arraybuffer',
          timeout: 120000, // 2 minutes timeout
        }
      );

      // Convert to base64
      const imageBase64 = Buffer.from(response.data).toString('base64');
      const imageUrl = `data:image/png;base64,${imageBase64}`;

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

      logger.info('Image generation completed', {
        userId,
        model: modelConfig.name,
        generationTime,
      });

      return {
        success: true,
        imageUrl,
        imageBase64,
        model: modelConfig.name,
        prompt: options.prompt,
        generationTime,
      };

    } catch (error: any) {
      const generationTime = Date.now() - startTime;
      
      // Update generation record as failed
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
          prompt: options.prompt,
          generationTime,
          error: 'Model is loading. Please try again in a few seconds.',
        };
      }

      return {
        success: false,
        model: modelConfig.name,
        prompt: options.prompt,
        generationTime,
        error: error.message || 'Image generation failed',
      };
    }
  }

  /**
   * Optimize prompt for better image quality
   */
  private optimizePrompt(prompt: string): string {
    // Add quality enhancers if not present
    const qualityTerms = [
      'high quality',
      'detailed',
      '4k',
      'sharp focus',
      'professional',
    ];

    let optimized = prompt.trim();
    
    // Check if prompt already has quality terms
    const hasQualityTerms = qualityTerms.some(term => 
      optimized.toLowerCase().includes(term)
    );

    // Add quality enhancement if not present
    if (!hasQualityTerms && optimized.length < 200) {
      optimized = `${optimized}, high quality, detailed, sharp focus`;
    }

    // Limit prompt length to avoid token issues
    if (optimized.length > 500) {
      optimized = optimized.substring(0, 500);
    }

    return optimized;
  }

  /**
   * Get available models
   */
  public getAvailableModels(): Array<{
    id: string;
    name: string;
    quality: string;
    maxResolution: string;
  }> {
    return this.MODELS.map(m => ({
      id: m.id,
      name: m.name,
      quality: m.quality,
      maxResolution: `${m.maxWidth}x${m.maxHeight}`,
    }));
  }

  /**
   * Get user's generation history
   */
  public async getUserHistory(
    userId: string,
    limit: number = 10
  ): Promise<Array<{
    id: string;
    prompt: string;
    imageUrl: string | null;
    model: string;
    status: string;
    createdAt: Date;
  }>> {
    const generations = await prisma.imageGeneration.findMany({
      where: { userId },
      orderBy: { createdAt: 'desc' },
      take: limit,
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
}

// Export singleton instance
export const imageGeneration = new ImageGenerationServiceClass();
export default imageGeneration;
