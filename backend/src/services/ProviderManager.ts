/**
 * Provider Manager Service
 * Centralized management of all AI providers with intelligent load balancing,
 * automatic failover, and usage tracking.
 * 
 * @module ProviderManager
 */

import { config, limits } from '../config/index.js';
import { logger } from '../utils/logger.js';
import { prisma } from '../config/database.js';

// ============================================
// Types
// ============================================

export type ProviderType = 'groq' | 'openrouter' | 'deepseek' | 'huggingface' | 'gemini' | 'ocrspace';
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

// ============================================
// Configuration
// ============================================

/**
 * Task to provider mapping - defines which providers handle which tasks
 * Order matters: first available provider is used
 */
const TASK_PROVIDERS: Record<TaskType, ProviderType[]> = {
  chat: ['groq', 'openrouter', 'deepseek', 'gemini'],
  vision: ['gemini', 'openrouter'],
  'image-to-text': ['ocrspace', 'gemini'],
  ocr: ['ocrspace', 'gemini'],
  embedding: ['huggingface', 'openrouter'],
};

/**
 * Provider base URLs
 */
const PROVIDER_URLS: Record<ProviderType, string> = {
  groq: config.urls.groq,
  openrouter: config.urls.openRouter,
  deepseek: config.urls.deepSeek,
  huggingface: config.urls.huggingFace,
  gemini: config.urls.gemini,
  ocrspace: config.urls.ocrSpace,
};

/**
 * Provider daily limits
 */
const PROVIDER_LIMITS: Record<ProviderType, number> = {
  groq: limits.groq,
  openrouter: limits.openRouter,
  deepseek: limits.deepseek,
  huggingface: limits.huggingFace,
  gemini: limits.gemini,
  ocrspace: limits.ocrSpace,
};

// ============================================
// Provider Manager Class
// ============================================

class ProviderManagerService {
  private providers: Map<ProviderType, ProviderState> = new Map();
  private lastResetDate: string = '';
  private initialized: boolean = false;

  constructor() {
    this.initializeProviders();
    this.scheduleCounterReset();
    this.loadUsageFromDatabase();
  }

  /**
   * Initialize all providers with their API keys
   */
  private initializeProviders(): void {
    // Initialize each provider
    this.initProvider('groq', config.providers.groq.keys, PROVIDER_LIMITS.groq);
    this.initProvider('openrouter', config.providers.openRouter.keys, PROVIDER_LIMITS.openrouter);
    this.initProvider('deepseek', config.providers.deepSeek.keys, PROVIDER_LIMITS.deepseek);
    this.initProvider('huggingface', config.providers.huggingFace.keys, PROVIDER_LIMITS.huggingface);
    this.initProvider('gemini', config.providers.gemini.keys, PROVIDER_LIMITS.gemini);
    this.initProvider('ocrspace', config.providers.ocrSpace.keys, PROVIDER_LIMITS.ocrspace);

    this.initialized = true;
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
    
    let totalKeys = 0;
    let totalCapacity = 0;

    this.providers.forEach((state, provider) => {
      const available = state.keys.filter(k => k.isAvailable).length;
      const capacity = available * state.dailyLimit;
      totalKeys += available;
      totalCapacity += capacity;
      
      if (available > 0) {
        logger.info(`   ✅ ${provider.toUpperCase()}: ${available} keys, ${capacity.toLocaleString()} req/day`);
      } else {
        logger.warn(`   ⚠️ ${provider.toUpperCase()}: No keys configured`);
      }
    });

    logger.info(`   📊 TOTAL: ${totalKeys} keys, ${totalCapacity.toLocaleString()} req/day capacity`);
  }

  /**
   * Get the next available key for a provider using round-robin
   */
  public getNextKey(provider: ProviderType): { key: string; index: number } | null {
    const state = this.providers.get(provider);
    if (!state || state.keys.length === 0) {
      logger.warn(`No keys configured for provider: ${provider}`);
      return null;
    }

    // Filter available keys
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

    // Save to database asynchronously
    this.saveUsageToDatabase(provider, key.index, key.requestCount);

    logger.debug(`Using ${provider} key #${key.index + 1}, requests: ${key.requestCount}/${state.dailyLimit}`);

    return { key: key.key, index: key.index };
  }

  /**
   * Get the best available provider for a specific task
   */
  public getBestProviderForTask(task: TaskType): ProviderType | null {
    const providers = TASK_PROVIDERS[task];
    
    if (!providers) {
      logger.error(`Unknown task type: ${task}`);
      return null;
    }
    
    for (const provider of providers) {
      if (this.hasCapacity(provider)) {
        return provider;
      }
    }

    logger.error(`❌ No available provider for task: ${task}`);
    return null;
  }

  /**
   * Get all providers that can handle a task
   */
  public getProvidersForTask(task: TaskType): ProviderType[] {
    const providers = TASK_PROVIDERS[task] || [];
    return providers.filter(p => this.hasCapacity(p));
  }

  /**
   * Check if a provider has available capacity
   */
  public hasCapacity(provider: ProviderType): boolean {
    const state = this.providers.get(provider);
    if (!state) return false;
    
    return state.keys.some(
      k => k.isAvailable && k.requestCount < state.dailyLimit && k.errorCount < 5
    );
  }

  /**
   * Mark a key as having an error
   */
  public markKeyError(
    provider: ProviderType, 
    keyIndex: number, 
    error: string, 
    isRateLimit: boolean = false
  ): void {
    const state = this.providers.get(provider);
    if (!state || !state.keys[keyIndex]) return;

    const key = state.keys[keyIndex];
    key.lastError = error;
    key.errorCount++;

    if (isRateLimit) {
      key.isAvailable = false;
      logger.warn(`🚫 ${provider} key #${keyIndex + 1} rate limited: ${error}`);
    } else if (key.errorCount >= 5) {
      key.isAvailable = false;
      logger.warn(`🚫 ${provider} key #${keyIndex + 1} disabled after 5 errors`);
    } else {
      logger.warn(`⚠️ ${provider} key #${keyIndex + 1} error (${key.errorCount}/5): ${error}`);
    }
  }

  /**
   * Mark a key as successful (reset error count)
   */
  public markKeySuccess(provider: ProviderType, keyIndex: number): void {
    const state = this.providers.get(provider);
    if (!state || !state.keys[keyIndex]) return;

    const key = state.keys[keyIndex];
    if (key.errorCount > 0) {
      key.errorCount = 0;
      key.lastError = undefined;
    }
  }

  /**
   * Get comprehensive health status of all providers
   */
  public getHealthStatus(): Record<ProviderType, {
    available: boolean;
    totalKeys: number;
    availableKeys: number;
    totalCapacity: number;
    usedToday: number;
    remainingCapacity: number;
    percentUsed: number;
  }> {
    const status: Record<string, {
      available: boolean;
      totalKeys: number;
      availableKeys: number;
      totalCapacity: number;
      usedToday: number;
      remainingCapacity: number;
      percentUsed: number;
    }> = {};

    this.providers.forEach((state, provider) => {
      const availableKeys = state.keys.filter(
        k => k.isAvailable && k.requestCount < state.dailyLimit && k.errorCount < 5
      );
      const usedToday = state.keys.reduce((sum, k) => sum + k.requestCount, 0);
      const totalCapacity = state.keys.length * state.dailyLimit;
      const remainingCapacity = totalCapacity - usedToday;

      status[provider] = {
        available: availableKeys.length > 0,
        totalKeys: state.keys.length,
        availableKeys: availableKeys.length,
        totalCapacity,
        usedToday,
        remainingCapacity: Math.max(0, remainingCapacity),
        percentUsed: totalCapacity > 0 ? Math.round((usedToday / totalCapacity) * 100) : 0,
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
    lastError?: string;
  }> {
    const state = this.providers.get(provider);
    if (!state) return [];

    return state.keys.map(k => ({
      index: k.index + 1,
      available: k.isAvailable && k.requestCount < state.dailyLimit && k.errorCount < 5,
      requests: k.requestCount,
      limit: state.dailyLimit,
      errorCount: k.errorCount,
      lastError: k.lastError,
    }));
  }

  /**
   * Get base URL for a provider
   */
  public getBaseUrl(provider: ProviderType): string {
    return PROVIDER_URLS[provider];
  }

  /**
   * Load usage from database on startup
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
      logger.warn('⚠️ Could not load API key usage from database');
    }
  }

  /**
   * Save usage to database
   */
  private async saveUsageToDatabase(
    provider: ProviderType, 
    keyIndex: number, 
    requestCount: number
  ): Promise<void> {
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
    } catch {
      // Silent fail - usage tracking is not critical
    }
  }

  /**
   * Schedule daily counter reset at midnight UTC
   */
  private scheduleCounterReset(): void {
    const checkAndReset = () => {
      const today = new Date().toISOString().split('T')[0];
      
      if (this.lastResetDate !== today) {
        this.resetAllCounters();
        this.lastResetDate = today;
      }
    };

    // Check every minute
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
   * Get summary statistics
   */
  public getSummary(): {
    totalProviders: number;
    activeProviders: number;
    totalKeys: number;
    totalCapacity: number;
    totalUsed: number;
  } {
    let totalKeys = 0;
    let totalCapacity = 0;
    let totalUsed = 0;
    let activeProviders = 0;

    this.providers.forEach((state) => {
      totalKeys += state.keys.length;
      totalCapacity += state.keys.length * state.dailyLimit;
      totalUsed += state.keys.reduce((sum, k) => sum + k.requestCount, 0);
      if (state.keys.some(k => k.isAvailable)) {
        activeProviders++;
      }
    });

    return {
      totalProviders: this.providers.size,
      activeProviders,
      totalKeys,
      totalCapacity,
      totalUsed,
    };
  }
}

// Export singleton instance
export const providerManager = new ProviderManagerService();
export default providerManager;
