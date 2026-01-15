/**
 * AI Router Service
 * Intelligent routing of chat requests to AI providers with
 * automatic failover, load balancing, and streaming support.
 * 
 * @module AIRouter
 */

import Groq from 'groq-sdk';
import axios from 'axios';
import { logger } from '../utils/logger.js';
import { providerManager, ProviderType } from './ProviderManager.js';
import { config } from '../config/index.js';

// ============================================
// Types
// ============================================

export interface Message {
  role: 'system' | 'user' | 'assistant';
  content: string;
}

export interface ChatRequest {
  messages: Message[];
  model?: string;
  maxTokens?: number;
  temperature?: number;
  stream?: boolean;
}

export interface ChatResponse {
  success: boolean;
  content: string;
  model: string;
  provider: ProviderType | 'unknown';
  tokens?: {
    prompt: number;
    completion: number;
    total: number;
  };
  error?: string;
  processingTime?: number;
}

export interface StreamChunk {
  content: string;
  done: boolean;
  model?: string;
  provider?: ProviderType;
}

// ============================================
// Model Configuration
// ============================================

export const MODELS = {
  groq: [
    { id: 'llama-3.3-70b-versatile', name: 'Llama 3.3 70B', context: 131072, isDefault: true },
    { id: 'llama-3.1-8b-instant', name: 'Llama 3.1 8B Instant', context: 8192 },
    { id: 'mixtral-8x7b-32768', name: 'Mixtral 8x7B', context: 32768 },
    { id: 'gemma2-9b-it', name: 'Gemma 2 9B', context: 8192 },
  ],
  openrouter: [
    { id: 'meta-llama/llama-3.1-70b-instruct:free', name: 'Llama 3.1 70B (Free)', context: 131072, isDefault: true },
    { id: 'google/gemini-2.0-flash-exp:free', name: 'Gemini 2.0 Flash (Free)', context: 1000000 },
    { id: 'mistralai/mistral-7b-instruct:free', name: 'Mistral 7B (Free)', context: 32768 },
  ],
  deepseek: [
    { id: 'deepseek-chat', name: 'DeepSeek Chat', context: 32768, isDefault: true },
    { id: 'deepseek-coder', name: 'DeepSeek Coder', context: 16384 },
  ],
  gemini: [
    { id: 'gemini-2.5-flash', name: 'Gemini 2.5 Flash', context: 1000000, isDefault: true },
    { id: 'gemini-2.0-flash-exp', name: 'Gemini 2.0 Flash', context: 1000000 },
  ],
};

// ============================================
// AI Router Class
// ============================================

class AIRouterService {
  /**
   * Send a chat completion request with automatic failover
   */
  public async chat(request: ChatRequest): Promise<ChatResponse> {
    const startTime = Date.now();
    const providers: ProviderType[] = ['groq', 'openrouter', 'deepseek', 'gemini'];
    const errors: string[] = [];

    // First pass: try providers with capacity
    for (const provider of providers) {
      if (!providerManager.hasCapacity(provider)) {
        logger.debug(`${provider} has no capacity, trying next...`);
        continue;
      }

      try {
        const response = await this.tryProvider(provider, request);
        if (response.success) {
          response.processingTime = Date.now() - startTime;
          return response;
        }
        errors.push(`${provider}: ${response.error || 'Unknown error'}`);
      } catch (error) {
        const errMsg = error instanceof Error ? error.message : 'Unknown error';
        errors.push(`${provider}: ${errMsg}`);
        logger.warn(`Chat with ${provider} failed:`, error);
        continue;
      }
    }

    // Second pass: try all providers as fallback (ignore capacity)
    logger.warn('⚠️ All providers with capacity failed. Trying fallback...');
    providerManager.resetAllProviders(); // Reset errors to give providers another chance
    
    for (const provider of providers) {
      try {
        const response = await this.tryProvider(provider, request);
        if (response.success) {
          response.processingTime = Date.now() - startTime;
          logger.info(`✅ Fallback to ${provider} succeeded`);
          return response;
        }
      } catch (error) {
        logger.warn(`Fallback with ${provider} also failed:`, error);
        continue;
      }
    }

    return {
      success: false,
      content: '',
      model: 'unknown',
      provider: 'unknown',
      error: `All AI providers are currently unavailable. Errors: ${errors.slice(0, 3).join('; ')}`,
      processingTime: Date.now() - startTime,
    };
  }

  /**
   * Try a specific provider
   */
  private async tryProvider(provider: ProviderType, request: ChatRequest): Promise<ChatResponse> {
    switch (provider) {
      case 'groq':
        return await this.groqChat(request);
      case 'openrouter':
        return await this.openRouterChat(request);
      case 'deepseek':
        return await this.deepSeekChat(request);
      case 'gemini':
        return await this.geminiChat(request);
      default:
        throw new Error(`Unknown provider: ${provider}`);
    }
  }

  /**
   * Stream a chat completion with automatic failover
   */
  public async *chatStream(request: ChatRequest): AsyncGenerator<StreamChunk> {
    const providers: ProviderType[] = ['groq', 'openrouter', 'deepseek'];

    for (const provider of providers) {
      if (!providerManager.hasCapacity(provider)) {
        continue;
      }

      try {
        switch (provider) {
          case 'groq':
            yield* this.groqStream(request);
            return;
          case 'openrouter':
            yield* this.openRouterStream(request);
            return;
          case 'deepseek':
            yield* this.deepSeekStream(request);
            return;
        }
      } catch (error) {
        logger.warn(`Stream with ${provider} failed:`, error);
        continue;
      }
    }

    yield {
      content: 'All AI providers are currently unavailable. Please try again later.',
      done: true,
    };
  }

  /**
   * Groq chat completion
   */
  private async groqChat(request: ChatRequest): Promise<ChatResponse> {
    const keyData = providerManager.getNextKey('groq');
    if (!keyData) throw new Error('No Groq keys available');

    try {
      const groq = new Groq({ apiKey: keyData.key });
      const model = request.model || 'llama-3.3-70b-versatile';

      const completion = await groq.chat.completions.create({
        model,
        messages: request.messages,
        max_tokens: request.maxTokens || config.ai.maxTokens,
        temperature: request.temperature || 0.7,
      });

      providerManager.markKeySuccess('groq', keyData.index);

      return {
        success: true,
        content: completion.choices[0]?.message?.content || '',
        model,
        provider: 'groq',
        tokens: {
          prompt: completion.usage?.prompt_tokens || 0,
          completion: completion.usage?.completion_tokens || 0,
          total: completion.usage?.total_tokens || 0,
        },
      };
    } catch (error: unknown) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      const isRateLimit = errorMessage.includes('rate') || errorMessage.includes('429');
      providerManager.markKeyError('groq', keyData.index, errorMessage, isRateLimit);
      throw error;
    }
  }

  /**
   * Groq streaming
   */
  private async *groqStream(request: ChatRequest): AsyncGenerator<StreamChunk> {
    const keyData = providerManager.getNextKey('groq');
    if (!keyData) throw new Error('No Groq keys available');

    try {
      const groq = new Groq({ apiKey: keyData.key });
      const model = request.model || 'llama-3.3-70b-versatile';

      const stream = await groq.chat.completions.create({
        model,
        messages: request.messages,
        max_tokens: request.maxTokens || config.ai.maxTokens,
        temperature: request.temperature || 0.7,
        stream: true,
      });

      for await (const chunk of stream) {
        const content = chunk.choices[0]?.delta?.content || '';
        if (content) {
          yield { content, done: false, model, provider: 'groq' };
        }
      }

      yield { content: '', done: true, model, provider: 'groq' };
      providerManager.markKeySuccess('groq', keyData.index);
    } catch (error: unknown) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      providerManager.markKeyError('groq', keyData.index, errorMessage);
      throw error;
    }
  }

  /**
   * OpenRouter chat completion
   */
  private async openRouterChat(request: ChatRequest): Promise<ChatResponse> {
    const keyData = providerManager.getNextKey('openrouter');
    if (!keyData) throw new Error('No OpenRouter keys available');

    try {
      const model = request.model || 'meta-llama/llama-3.1-70b-instruct:free';

      const response = await axios.post(
        `${config.urls.openRouter}/chat/completions`,
        {
          model,
          messages: request.messages,
          max_tokens: request.maxTokens || config.ai.maxTokens,
          temperature: request.temperature || 0.7,
        },
        {
          headers: {
            'Authorization': `Bearer ${keyData.key}`,
            'Content-Type': 'application/json',
            'HTTP-Referer': 'https://baatcheet.app',
            'X-Title': 'BaatCheet',
          },
          timeout: 60000,
        }
      );

      providerManager.markKeySuccess('openrouter', keyData.index);

      return {
        success: true,
        content: response.data.choices?.[0]?.message?.content || '',
        model,
        provider: 'openrouter',
        tokens: {
          prompt: response.data.usage?.prompt_tokens || 0,
          completion: response.data.usage?.completion_tokens || 0,
          total: response.data.usage?.total_tokens || 0,
        },
      };
    } catch (error: unknown) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      const isRateLimit = errorMessage.includes('rate') || errorMessage.includes('429');
      providerManager.markKeyError('openrouter', keyData.index, errorMessage, isRateLimit);
      throw error;
    }
  }

  /**
   * OpenRouter streaming
   */
  private async *openRouterStream(request: ChatRequest): AsyncGenerator<StreamChunk> {
    const keyData = providerManager.getNextKey('openrouter');
    if (!keyData) throw new Error('No OpenRouter keys available');

    try {
      const model = request.model || 'meta-llama/llama-3.1-70b-instruct:free';

      const response = await axios.post(
        `${config.urls.openRouter}/chat/completions`,
        {
          model,
          messages: request.messages,
          max_tokens: request.maxTokens || config.ai.maxTokens,
          temperature: request.temperature || 0.7,
          stream: true,
        },
        {
          headers: {
            'Authorization': `Bearer ${keyData.key}`,
            'Content-Type': 'application/json',
            'HTTP-Referer': 'https://baatcheet.app',
          },
          responseType: 'stream',
          timeout: 60000,
        }
      );

      let buffer = '';
      
      for await (const chunk of response.data) {
        buffer += chunk.toString();
        const lines = buffer.split('\n');
        buffer = lines.pop() || '';

        for (const line of lines) {
          if (line.startsWith('data: ')) {
            const data = line.slice(6);
            if (data === '[DONE]') {
              yield { content: '', done: true, model, provider: 'openrouter' };
              providerManager.markKeySuccess('openrouter', keyData.index);
              return;
            }
            try {
              const parsed = JSON.parse(data);
              const content = parsed.choices?.[0]?.delta?.content || '';
              if (content) {
                yield { content, done: false, model, provider: 'openrouter' };
              }
            } catch {
              // Skip invalid JSON
            }
          }
        }
      }
    } catch (error: unknown) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      providerManager.markKeyError('openrouter', keyData.index, errorMessage);
      throw error;
    }
  }

  /**
   * DeepSeek chat completion
   */
  private async deepSeekChat(request: ChatRequest): Promise<ChatResponse> {
    const keyData = providerManager.getNextKey('deepseek');
    if (!keyData) throw new Error('No DeepSeek keys available');

    try {
      const model = request.model || 'deepseek-chat';

      const response = await axios.post(
        `${config.urls.deepSeek}/chat/completions`,
        {
          model,
          messages: request.messages,
          max_tokens: request.maxTokens || config.ai.maxTokens,
          temperature: request.temperature || 0.7,
        },
        {
          headers: {
            'Authorization': `Bearer ${keyData.key}`,
            'Content-Type': 'application/json',
          },
          timeout: 60000,
        }
      );

      providerManager.markKeySuccess('deepseek', keyData.index);

      return {
        success: true,
        content: response.data.choices?.[0]?.message?.content || '',
        model,
        provider: 'deepseek',
        tokens: {
          prompt: response.data.usage?.prompt_tokens || 0,
          completion: response.data.usage?.completion_tokens || 0,
          total: response.data.usage?.total_tokens || 0,
        },
      };
    } catch (error: unknown) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      const isRateLimit = errorMessage.includes('rate') || errorMessage.includes('429');
      providerManager.markKeyError('deepseek', keyData.index, errorMessage, isRateLimit);
      throw error;
    }
  }

  /**
   * DeepSeek streaming
   */
  private async *deepSeekStream(request: ChatRequest): AsyncGenerator<StreamChunk> {
    const keyData = providerManager.getNextKey('deepseek');
    if (!keyData) throw new Error('No DeepSeek keys available');

    try {
      const model = request.model || 'deepseek-chat';

      const response = await axios.post(
        `${config.urls.deepSeek}/chat/completions`,
        {
          model,
          messages: request.messages,
          max_tokens: request.maxTokens || config.ai.maxTokens,
          temperature: request.temperature || 0.7,
          stream: true,
        },
        {
          headers: {
            'Authorization': `Bearer ${keyData.key}`,
            'Content-Type': 'application/json',
          },
          responseType: 'stream',
          timeout: 60000,
        }
      );

      let buffer = '';
      
      for await (const chunk of response.data) {
        buffer += chunk.toString();
        const lines = buffer.split('\n');
        buffer = lines.pop() || '';

        for (const line of lines) {
          if (line.startsWith('data: ')) {
            const data = line.slice(6);
            if (data === '[DONE]') {
              yield { content: '', done: true, model, provider: 'deepseek' };
              providerManager.markKeySuccess('deepseek', keyData.index);
              return;
            }
            try {
              const parsed = JSON.parse(data);
              const content = parsed.choices?.[0]?.delta?.content || '';
              if (content) {
                yield { content, done: false, model, provider: 'deepseek' };
              }
            } catch {
              // Skip invalid JSON
            }
          }
        }
      }
    } catch (error: unknown) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      providerManager.markKeyError('deepseek', keyData.index, errorMessage);
      throw error;
    }
  }

  /**
   * Gemini chat completion
   */
  private async geminiChat(request: ChatRequest): Promise<ChatResponse> {
    const keyData = providerManager.getNextKey('gemini');
    if (!keyData) throw new Error('No Gemini keys available');

    try {
      const model = request.model || 'gemini-2.5-flash';

      // Convert messages to Gemini format
      const contents = request.messages
        .filter(m => m.role !== 'system')
        .map(m => ({
          role: m.role === 'assistant' ? 'model' : 'user',
          parts: [{ text: m.content }],
        }));

      // Add system instruction if present
      const systemMessage = request.messages.find(m => m.role === 'system');
      
      const response = await axios.post(
        `${config.urls.gemini}/models/${model}:generateContent?key=${keyData.key}`,
        {
          contents,
          systemInstruction: systemMessage ? { parts: [{ text: systemMessage.content }] } : undefined,
          generationConfig: {
            maxOutputTokens: request.maxTokens || config.ai.maxTokens,
            temperature: request.temperature || 0.7,
          },
        },
        {
          headers: { 'Content-Type': 'application/json' },
          timeout: 60000,
        }
      );

      providerManager.markKeySuccess('gemini', keyData.index);

      return {
        success: true,
        content: response.data.candidates?.[0]?.content?.parts?.[0]?.text || '',
        model,
        provider: 'gemini',
        tokens: {
          prompt: response.data.usageMetadata?.promptTokenCount || 0,
          completion: response.data.usageMetadata?.candidatesTokenCount || 0,
          total: response.data.usageMetadata?.totalTokenCount || 0,
        },
      };
    } catch (error: unknown) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      const isRateLimit = errorMessage.includes('rate') || errorMessage.includes('429');
      providerManager.markKeyError('gemini', keyData.index, errorMessage, isRateLimit);
      throw error;
    }
  }

  /**
   * Get all available models
   */
  public getAvailableModels(): Array<{
    id: string;
    name: string;
    provider: ProviderType;
    context: number;
    available: boolean;
  }> {
    const models: Array<{
      id: string;
      name: string;
      provider: ProviderType;
      context: number;
      available: boolean;
    }> = [];

    for (const [provider, providerModels] of Object.entries(MODELS)) {
      const hasCapacity = providerManager.hasCapacity(provider as ProviderType);
      for (const model of providerModels) {
        models.push({
          id: model.id,
          name: model.name,
          provider: provider as ProviderType,
          context: model.context,
          available: hasCapacity,
        });
      }
    }

    return models;
  }

  /**
   * Get health status of all providers
   */
  public getHealth(): Record<ProviderType, boolean> {
    return {
      groq: providerManager.hasCapacity('groq'),
      openrouter: providerManager.hasCapacity('openrouter'),
      deepseek: providerManager.hasCapacity('deepseek'),
      huggingface: providerManager.hasCapacity('huggingface'),
      gemini: providerManager.hasCapacity('gemini'),
      ocrspace: providerManager.hasCapacity('ocrspace'),
    };
  }
}

// Export singleton instance
export const aiRouter = new AIRouterService();
export default aiRouter;
