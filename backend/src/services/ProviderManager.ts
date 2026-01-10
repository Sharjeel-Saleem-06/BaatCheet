import axios, { AxiosError } from 'axios';
import { config } from '../config/index.js';
import { logger } from '../utils/logger.js';
import { prisma } from '../config/database.js';

// ============================================
// Provider Manager Service
// Manages all AI providers with load balancing
// ============================================

export type ProviderType = 'groq' | 'openrouter' | 'deepseek' | 'huggingface' | 'gemini';
export type TaskType = 'chat' | 'vision' | 'image-to-text' | 'ocr' | 'embedding';

interface KeyState {
  key: string;
  index: number;
  requestCount: number;
  isAvailable: boolean;
  lastUsed: Date;
  lastError?: string;
  errorCount: number;
}

interface ProviderState {
  provider: ProviderType;
  keys: KeyState[];
  currentKeyIndex: number;
  dailyLimit: number;
  baseUrl: string;
  isHealthy: boolean;
  lastHealthCheck: Date;
}

/**
 * Provider configuration for different tasks
 */
const TASK_PROVIDERS: Record<TaskType, ProviderType[]> = {
  chat: ['groq', 'openrouter', 'deepseek', 'gemini'],
  vision: ['gemini', 'openrouter', 'huggingface'],
  'image-to-text': ['huggingface', 'gemini', 'openrouter'],
  ocr: ['huggingface', 'gemini'],
  embedding: ['huggingface', 'openrouter'],
};

/**
 * Provider base URLs
 */
const PROVIDER_URLS: Record<ProviderType, string> = {
  groq: 'https://api.groq.com/openai/v1',
  openrouter: 'https://openrouter.ai/api/v1',
  deepseek: 'https://api.deepseek.com/v1',
  huggingface: 'https://api-inference.huggingface.co',
  gemini: 'https://generativelanguage.googleapis.com/v1beta',
};

class ProviderManagerService {
  private providers: Map<ProviderType, ProviderState> = new Map();
  private lastResetDate: string = '';

  constructor() {
    this.initializeProviders();
    this.scheduleCounterReset();
    this.loadUsageFromDatabase();
  }

  /**
   * Initialize all providers with their keys
   */
  private initializeProviders(): void {
    // Groq
    this.initProvider('groq', config.groqApiKeys, config.limits.groq);
    
    // OpenRouter
    this.initProvider('openrouter', config.openRouterApiKeys, config.limits.openRouter);
    
    // DeepSeek
    this.initProvider('deepseek', config.deepseekApiKeys, config.limits.deepseek);
    
    // Hugging Face
    this.initProvider('huggingface', config.huggingFaceApiKeys, config.limits.huggingFace);
    
    // Gemini
    this.initProvider('gemini', config.geminiApiKeys, config.limits.gemini);

    this.logProviderStatus();
  }

  /**
   * Initialize a single provider
   */
  private initProvider(provider: ProviderType, keys: string[], dailyLimit: number): void {
    const keyStates: KeyState[] = keys.map((key, index) => ({
      key,
      index,
      requestCount: 0,
      isAvailable: true,
      lastUsed: new Date(),
      errorCount: 0,
    }));

    this.providers.set(provider, {
      provider,
      keys: keyStates,
      currentKeyIndex: 0,
      dailyLimit,
      baseUrl: PROVIDER_URLS[provider],
      isHealthy: keys.length > 0,
      lastHealthCheck: new Date(),
    });
  }

  /**
   * Log provider status on startup
   */
  private logProviderStatus(): void {
    logger.info('🔑 Provider Manager Initialized:');
    this.providers.forEach((state, provider) => {
      const available = state.keys.filter(k => k.isAvailable).length;
      const capacity = available * state.dailyLimit;
      logger.info(`   ${provider.toUpperCase()}: ${available} keys, ${capacity.toLocaleString()} req/day capacity`);
    });
  }

  /**
   * Get the next available key for a provider (round-robin)
   */
  public getNextKey(provider: ProviderType): { key: string; index: number } | null {
    const state = this.providers.get(provider);
    if (!state || state.keys.length === 0) {
      return null;
    }

    const availableKeys = state.keys.filter(
      k => k.isAvailable && k.requestCount < state.dailyLimit && k.errorCount < 5
    );

    if (availableKeys.length === 0) {
      logger.warn(`⚠️ All ${provider} keys exhausted or errored`);
      return null;
    }

    // Round-robin selection
    const key = availableKeys[state.currentKeyIndex % availableKeys.length];
    state.currentKeyIndex = (state.currentKeyIndex + 1) % availableKeys.length;

    // Increment usage
    key.requestCount++;
    key.lastUsed = new Date();

    // Save to database (async)
    this.saveUsageToDatabase(provider, key.index, key.requestCount);

    logger.debug(`Using ${provider} key #${key.index + 1}, requests: ${key.requestCount}/${state.dailyLimit}`);

    return { key: key.key, index: key.index };
  }

  /**
   * Get the best provider for a specific task
   */
  public getBestProviderForTask(task: TaskType): ProviderType | null {
    const providers = TASK_PROVIDERS[task];
    
    for (const provider of providers) {
      const state = this.providers.get(provider);
      if (state && state.isHealthy && state.keys.some(k => k.isAvailable && k.requestCount < state.dailyLimit)) {
        return provider;
      }
    }

    logger.error(`❌ No available provider for task: ${task}`);
    return null;
  }

  /**
   * Mark a key as having an error
   */
  public markKeyError(provider: ProviderType, keyIndex: number, error: string, isRateLimit: boolean = false): void {
    const state = this.providers.get(provider);
    if (!state || !state.keys[keyIndex]) return;

    const key = state.keys[keyIndex];
    key.lastError = error;
    key.errorCount++;

    if (isRateLimit) {
      key.isAvailable = false;
      logger.warn(`🚫 ${provider} key #${keyIndex + 1} rate limited`);
    } else if (key.errorCount >= 5) {
      key.isAvailable = false;
      logger.warn(`🚫 ${provider} key #${keyIndex + 1} disabled after 5 errors`);
    }
  }

  /**
   * Mark a key as successful (reset error count)
   */
  public markKeySuccess(provider: ProviderType, keyIndex: number): void {
    const state = this.providers.get(provider);
    if (!state || !state.keys[keyIndex]) return;

    state.keys[keyIndex].errorCount = 0;
    state.keys[keyIndex].lastError = undefined;
  }

  /**
   * Get health status of all providers
   */
  public getHealthStatus(): Record<ProviderType, {
    available: boolean;
    totalKeys: number;
    availableKeys: number;
    totalCapacity: number;
    usedToday: number;
  }> {
    const status: Record<string, {
      available: boolean;
      totalKeys: number;
      availableKeys: number;
      totalCapacity: number;
      usedToday: number;
    }> = {};

    this.providers.forEach((state, provider) => {
      const availableKeys = state.keys.filter(k => k.isAvailable && k.requestCount < state.dailyLimit);
      const usedToday = state.keys.reduce((sum, k) => sum + k.requestCount, 0);

      status[provider] = {
        available: availableKeys.length > 0,
        totalKeys: state.keys.length,
        availableKeys: availableKeys.length,
        totalCapacity: state.keys.length * state.dailyLimit,
        usedToday,
      };
    });

    return status as Record<ProviderType, typeof status[string]>;
  }

  /**
   * Get detailed key status for a provider
   */
  public getKeyDetails(provider: ProviderType): Array<{
    index: number;
    available: boolean;
    requests: number;
    limit: number;
    errorCount: number;
  }> {
    const state = this.providers.get(provider);
    if (!state) return [];

    return state.keys.map(k => ({
      index: k.index + 1,
      available: k.isAvailable && k.requestCount < state.dailyLimit,
      requests: k.requestCount,
      limit: state.dailyLimit,
      errorCount: k.errorCount,
    }));
  }

  /**
   * Load usage from database
   */
  private async loadUsageFromDatabase(): Promise<void> {
    try {
      const today = new Date();
      today.setHours(0, 0, 0, 0);

      const usageRecords = await prisma.apiKeyUsage.findMany({
        where: { date: today },
      });

      usageRecords.forEach((record) => {
        const state = this.providers.get(record.provider as ProviderType);
        if (state && state.keys[record.keyIndex]) {
          state.keys[record.keyIndex].requestCount = record.requestCount;
          
          if (record.requestCount >= state.dailyLimit) {
            state.keys[record.keyIndex].isAvailable = false;
          }
        }
      });

      logger.info('📊 Loaded API key usage from database');
    } catch (error) {
      logger.warn('⚠️ Could not load API key usage:', error);
    }
  }

  /**
   * Save usage to database
   */
  private async saveUsageToDatabase(provider: ProviderType, keyIndex: number, requestCount: number): Promise<void> {
    try {
      const today = new Date();
      today.setHours(0, 0, 0, 0);

      await prisma.apiKeyUsage.upsert({
        where: {
          provider_keyIndex_date: {
            provider,
            keyIndex,
            date: today,
          },
        },
        update: { requestCount },
        create: {
          provider,
          keyIndex,
          requestCount,
          date: today,
        },
      });
    } catch (error) {
      logger.warn('⚠️ Could not save API key usage:', error);
    }
  }

  /**
   * Schedule daily counter reset
   */
  private scheduleCounterReset(): void {
    const checkAndReset = () => {
      const today = new Date().toISOString().split('T')[0];
      
      if (this.lastResetDate !== today) {
        this.resetAllCounters();
        this.lastResetDate = today;
      }
    };

    setInterval(checkAndReset, 60000);
    checkAndReset();

    logger.info('⏰ Daily counter reset scheduler initialized');
  }

  /**
   * Reset all counters at midnight
   */
  private resetAllCounters(): void {
    this.providers.forEach((state) => {
      state.keys.forEach((key) => {
        key.requestCount = 0;
        key.isAvailable = true;
        key.errorCount = 0;
        key.lastError = undefined;
      });
      state.currentKeyIndex = 0;
    });

    logger.info('🔄 All provider counters reset for new day');
  }

  /**
   * Get base URL for a provider
   */
  public getBaseUrl(provider: ProviderType): string {
    return PROVIDER_URLS[provider];
  }

  /**
   * Check if a provider has available capacity
   */
  public hasCapacity(provider: ProviderType): boolean {
    const state = this.providers.get(provider);
    if (!state) return false;
    
    return state.keys.some(k => k.isAvailable && k.requestCount < state.dailyLimit);
  }
}

// Export singleton instance
export const providerManager = new ProviderManagerService();
export default providerManager;
