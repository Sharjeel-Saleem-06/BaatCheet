import Groq from 'groq-sdk';
import axios from 'axios';
import { config } from '../config/index.js';
import { logger } from '../utils/logger.js';
import { providerManager, ProviderType, TaskType } from './ProviderManager.js';
import { AIProvider, AIProviderStatus } from '../types/index.js';

// ============================================
// AI Router Service
// Routes requests to the best available provider
// ============================================

interface ChatMessage {
  role: 'system' | 'user' | 'assistant';
  content: string;
}

interface ChatCompletionOptions {
  model?: string;
  maxTokens?: number;
  temperature?: number;
  stream?: boolean;
}

class AIRouterService {
  /**
   * Get Groq client with next available key
   */
  public async getGroqClient(): Promise<{ client: Groq; keyIndex: number } | null> {
    const keyData = providerManager.getNextKey('groq');
    if (!keyData) {
      return null;
    }

    return {
      client: new Groq({ apiKey: keyData.key }),
      keyIndex: keyData.index,
    };
  }

  /**
   * Get the best provider for chat
   */
  public getCurrentProvider(): AIProvider {
    const provider = providerManager.getBestProviderForTask('chat');
    
    if (!provider) {
      logger.warn('⚠️ No chat providers available, using fallback');
      return 'puter';
    }

    return provider as AIProvider;
  }

  /**
   * Make chat completion request with automatic failover
   */
  public async chatCompletion(
    messages: ChatMessage[],
    options: ChatCompletionOptions = {}
  ): Promise<{ content: string; provider: ProviderType; model: string }> {
    const providers: ProviderType[] = ['groq', 'openrouter', 'deepseek', 'gemini'];
    
    for (const provider of providers) {
      if (!providerManager.hasCapacity(provider)) {
        continue;
      }

      try {
        const result = await this.callProvider(provider, messages, options);
        return { ...result, provider };
      } catch (error) {
        logger.warn(`${provider} failed, trying next provider...`);
        continue;
      }
    }

    throw new Error('All AI providers exhausted. Please try again later.');
  }

  /**
   * Call a specific provider
   */
  private async callProvider(
    provider: ProviderType,
    messages: ChatMessage[],
    options: ChatCompletionOptions
  ): Promise<{ content: string; model: string }> {
    const keyData = providerManager.getNextKey(provider);
    if (!keyData) {
      throw new Error(`No keys available for ${provider}`);
    }

    try {
      let result: { content: string; model: string };

      switch (provider) {
        case 'groq':
          result = await this.callGroq(keyData.key, messages, options);
          break;
        case 'openrouter':
          result = await this.callOpenRouter(keyData.key, messages, options);
          break;
        case 'deepseek':
          result = await this.callDeepSeek(keyData.key, messages, options);
          break;
        case 'gemini':
          result = await this.callGemini(keyData.key, messages, options);
          break;
        default:
          throw new Error(`Unknown provider: ${provider}`);
      }

      providerManager.markKeySuccess(provider, keyData.index);
      return result;
    } catch (error: unknown) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      const isRateLimit = errorMessage.includes('rate') || errorMessage.includes('429') || errorMessage.includes('quota');
      
      providerManager.markKeyError(provider, keyData.index, errorMessage, isRateLimit);
      throw error;
    }
  }

  /**
   * Call Groq API
   */
  private async callGroq(
    apiKey: string,
    messages: ChatMessage[],
    options: ChatCompletionOptions
  ): Promise<{ content: string; model: string }> {
    const groq = new Groq({ apiKey });
    const model = options.model || 'llama-3.3-70b-versatile';

    const response = await groq.chat.completions.create({
      model,
      messages,
      max_tokens: options.maxTokens || 4096,
      temperature: options.temperature || 0.7,
    });

    return {
      content: response.choices[0]?.message?.content || '',
      model,
    };
  }

  /**
   * Call OpenRouter API
   */
  private async callOpenRouter(
    apiKey: string,
    messages: ChatMessage[],
    options: ChatCompletionOptions
  ): Promise<{ content: string; model: string }> {
    const model = options.model || 'meta-llama/llama-3.2-3b-instruct:free';

    const response = await axios.post(
      'https://openrouter.ai/api/v1/chat/completions',
      {
        model,
        messages,
        max_tokens: options.maxTokens || 4096,
        temperature: options.temperature || 0.7,
      },
      {
        headers: {
          'Authorization': `Bearer ${apiKey}`,
          'Content-Type': 'application/json',
          'HTTP-Referer': 'https://baatcheet.app',
          'X-Title': 'BaatCheet',
        },
      }
    );

    return {
      content: response.data.choices[0]?.message?.content || '',
      model,
    };
  }

  /**
   * Call DeepSeek API
   */
  private async callDeepSeek(
    apiKey: string,
    messages: ChatMessage[],
    options: ChatCompletionOptions
  ): Promise<{ content: string; model: string }> {
    const model = options.model || 'deepseek-chat';

    const response = await axios.post(
      'https://api.deepseek.com/v1/chat/completions',
      {
        model,
        messages,
        max_tokens: options.maxTokens || 4096,
        temperature: options.temperature || 0.7,
      },
      {
        headers: {
          'Authorization': `Bearer ${apiKey}`,
          'Content-Type': 'application/json',
        },
      }
    );

    return {
      content: response.data.choices[0]?.message?.content || '',
      model,
    };
  }

  /**
   * Call Gemini API
   */
  private async callGemini(
    apiKey: string,
    messages: ChatMessage[],
    options: ChatCompletionOptions
  ): Promise<{ content: string; model: string }> {
    const model = 'gemini-2.5-flash';

    // Convert messages to Gemini format
    const contents = messages
      .filter(m => m.role !== 'system')
      .map(m => ({
        role: m.role === 'assistant' ? 'model' : 'user',
        parts: [{ text: m.content }],
      }));

    // Add system instruction if present
    const systemMessage = messages.find(m => m.role === 'system');

    const response = await axios.post(
      `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${apiKey}`,
      {
        contents,
        systemInstruction: systemMessage ? { parts: [{ text: systemMessage.content }] } : undefined,
        generationConfig: {
          maxOutputTokens: options.maxTokens || 4096,
          temperature: options.temperature || 0.7,
        },
      },
      {
        headers: {
          'Content-Type': 'application/json',
        },
      }
    );

    const content = response.data.candidates?.[0]?.content?.parts?.[0]?.text || '';
    return { content, model };
  }

  /**
   * Create streaming chat completion (Groq only for now)
   */
  public async createStreamingCompletion(
    messages: ChatMessage[],
    model: string = 'llama-3.3-70b-versatile'
  ): Promise<{ stream: AsyncIterable<{ choices: Array<{ delta: { content?: string | null } }> }>; keyIndex: number; provider: ProviderType } | null> {
    // Try Groq first (best streaming support)
    const groqResult = await this.getGroqClient();
    if (groqResult) {
      const stream = await groqResult.client.chat.completions.create({
        model,
        messages,
        stream: true,
        max_tokens: 4096,
        temperature: 0.7,
      });

      return {
        stream,
        keyIndex: groqResult.keyIndex,
        provider: 'groq',
      };
    }

    // Fallback to OpenRouter streaming
    const openRouterKey = providerManager.getNextKey('openrouter');
    if (openRouterKey) {
      // OpenRouter also supports streaming via SSE
      // For now, return null and let ChatService handle non-streaming fallback
      logger.warn('Groq unavailable, falling back to non-streaming response');
    }

    return null;
  }

  /**
   * Mark a Groq key as rate limited
   */
  public markKeyRateLimited(keyIndex: number, error?: string): void {
    providerManager.markKeyError('groq', keyIndex, error || 'Rate limited', true);
  }

  /**
   * Mark a Groq key as having an error
   */
  public markKeyError(keyIndex: number, error: string): void {
    providerManager.markKeyError('groq', keyIndex, error, false);
  }

  /**
   * Get health status of all providers
   */
  public getProvidersHealth(): AIProviderStatus[] {
    const health = providerManager.getHealthStatus();
    
    return Object.entries(health).map(([provider, status]) => ({
      provider: provider as AIProvider,
      isAvailable: status.available,
      availableKeys: status.availableKeys,
      totalKeys: status.totalKeys,
      lastChecked: new Date(),
    }));
  }

  /**
   * Get detailed usage statistics
   */
  public getUsageStats(): {
    totalRequests: number;
    availableKeys: number;
    exhaustedKeys: number;
    keyDetails: Array<{
      index: number;
      requests: number;
      limit: number;
      available: boolean;
    }>;
    byProvider: Record<string, { used: number; capacity: number }>;
  } {
    const health = providerManager.getHealthStatus();
    const groqDetails = providerManager.getKeyDetails('groq');
    
    let totalRequests = 0;
    let availableKeys = 0;
    let exhaustedKeys = 0;
    const byProvider: Record<string, { used: number; capacity: number }> = {};

    Object.entries(health).forEach(([provider, status]) => {
      totalRequests += status.usedToday;
      availableKeys += status.availableKeys;
      exhaustedKeys += status.totalKeys - status.availableKeys;
      byProvider[provider] = {
        used: status.usedToday,
        capacity: status.totalCapacity,
      };
    });

    return {
      totalRequests,
      availableKeys,
      exhaustedKeys,
      keyDetails: groqDetails,
      byProvider,
    };
  }
}

// Export singleton instance
export const aiRouter = new AIRouterService();
export default aiRouter;
