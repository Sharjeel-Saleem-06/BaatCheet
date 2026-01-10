import Groq from 'groq-sdk';
import { config } from '../config/index.js';
import { logger } from '../utils/logger.js';
import { prisma } from '../config/database.js';
import { AIProvider, AIProviderStatus, AIKeyState } from '../types/index.js';

// ============================================
// AI Router Service
// Manages multiple AI providers with intelligent routing
// ============================================

class AIRouterService {
  private groqKeys: AIKeyState[] = [];
  private currentKeyIndex: number = 0;
  private providerStatus: Map<AIProvider, AIProviderStatus> = new Map();
  private lastResetDate: string = '';

  constructor() {
    this.initializeKeys();
    this.initializeProviderStatus();
    this.loadUsageFromDatabase();
    this.scheduleCounterReset();
  }

  /**
   * Initialize Groq API keys from environment
   */
  private initializeKeys(): void {
    this.groqKeys = config.groqApiKeys.map((key, index) => ({
      key,
      index,
      requestCount: 0,
      isAvailable: true,
      lastUsed: new Date(),
    }));

    logger.info(`🔑 Initialized ${this.groqKeys.length} Groq API keys`);
  }

  /**
   * Initialize provider status tracking
   */
  private initializeProviderStatus(): void {
    const providers: AIProvider[] = ['groq', 'together', 'deepseek', 'puter'];
    
    providers.forEach((provider) => {
      this.providerStatus.set(provider, {
        provider,
        isAvailable: this.checkProviderAvailability(provider),
        lastChecked: new Date(),
      });
    });
  }

  /**
   * Load usage counts from database for today
   */
  private async loadUsageFromDatabase(): Promise<void> {
    try {
      const today = new Date();
      today.setHours(0, 0, 0, 0);

      const usageRecords = await prisma.apiKeyUsage.findMany({
        where: {
          provider: 'groq',
          date: today,
        },
      });

      usageRecords.forEach((record) => {
        if (this.groqKeys[record.keyIndex]) {
          this.groqKeys[record.keyIndex].requestCount = record.requestCount;
          
          // Mark as unavailable if limit reached
          if (record.requestCount >= config.groqDailyLimit) {
            this.groqKeys[record.keyIndex].isAvailable = false;
          }
        }
      });

      logger.info('📊 Loaded API key usage from database');
    } catch (error) {
      logger.warn('⚠️ Could not load API key usage:', error);
    }
  }

  /**
   * Save usage count to database
   */
  private async saveUsageToDatabase(keyIndex: number, requestCount: number): Promise<void> {
    try {
      const today = new Date();
      today.setHours(0, 0, 0, 0);

      await prisma.apiKeyUsage.upsert({
        where: {
          provider_keyIndex_date: {
            provider: 'groq',
            keyIndex,
            date: today,
          },
        },
        update: {
          requestCount,
        },
        create: {
          provider: 'groq',
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
   * Check if a provider is available
   */
  private checkProviderAvailability(provider: AIProvider): boolean {
    switch (provider) {
      case 'groq':
        return this.groqKeys.some(
          (k) => k.isAvailable && k.requestCount < config.groqDailyLimit
        );
      case 'together':
        return !!config.togetherApiKey;
      case 'deepseek':
        return !!config.deepseekApiKey;
      case 'puter':
        return true; // Always available (client-side)
      default:
        return false;
    }
  }

  /**
   * Get the next available Groq key using round-robin
   */
  private getNextGroqKey(): AIKeyState | null {
    const availableKeys = this.groqKeys.filter(
      (k) => k.isAvailable && k.requestCount < config.groqDailyLimit
    );

    if (availableKeys.length === 0) {
      logger.warn('⚠️ All Groq keys exhausted for today');
      return null;
    }

    // Round-robin selection from available keys
    const key = availableKeys[this.currentKeyIndex % availableKeys.length];
    this.currentKeyIndex = (this.currentKeyIndex + 1) % availableKeys.length;
    
    return key;
  }

  /**
   * Get Groq client with the next available key
   */
  public async getGroqClient(): Promise<{ client: Groq; keyIndex: number } | null> {
    const keyState = this.getNextGroqKey();
    
    if (!keyState) {
      return null;
    }

    // Increment usage
    keyState.requestCount++;
    keyState.lastUsed = new Date();

    // Save to database (async, don't wait)
    this.saveUsageToDatabase(keyState.index, keyState.requestCount);

    logger.debug(
      `Using Groq key #${keyState.index + 1}, requests today: ${keyState.requestCount}/${config.groqDailyLimit}`
    );

    return {
      client: new Groq({ apiKey: keyState.key }),
      keyIndex: keyState.index,
    };
  }

  /**
   * Mark a key as rate limited
   */
  public markKeyRateLimited(keyIndex: number, error?: string): void {
    if (this.groqKeys[keyIndex]) {
      this.groqKeys[keyIndex].isAvailable = false;
      this.groqKeys[keyIndex].lastError = error;
      logger.warn(`🚫 Groq key #${keyIndex + 1} marked as rate limited`);
    }
  }

  /**
   * Mark a key as having an error (temporary)
   */
  public markKeyError(keyIndex: number, error: string): void {
    if (this.groqKeys[keyIndex]) {
      this.groqKeys[keyIndex].lastError = error;
      logger.warn(`⚠️ Groq key #${keyIndex + 1} error: ${error}`);
    }
  }

  /**
   * Get the current best provider to use
   */
  public getCurrentProvider(): AIProvider {
    // Check Groq first (primary)
    if (this.checkProviderAvailability('groq')) {
      return 'groq';
    }

    // Fallback to Together AI
    if (this.checkProviderAvailability('together')) {
      logger.info('📡 Switching to Together AI (Groq exhausted)');
      return 'together';
    }

    // Fallback to DeepSeek
    if (this.checkProviderAvailability('deepseek')) {
      logger.info('📡 Switching to DeepSeek (Together unavailable)');
      return 'deepseek';
    }

    // Last resort: Puter (client-side)
    logger.info('📡 Switching to Puter.js (all providers exhausted)');
    return 'puter';
  }

  /**
   * Get health status of all providers
   */
  public getProvidersHealth(): AIProviderStatus[] {
    const availableGroqKeys = this.groqKeys.filter(
      (k) => k.isAvailable && k.requestCount < config.groqDailyLimit
    );

    // Update Groq status
    this.providerStatus.set('groq', {
      provider: 'groq',
      isAvailable: availableGroqKeys.length > 0,
      availableKeys: availableGroqKeys.length,
      totalKeys: this.groqKeys.length,
      currentKeyIndex: this.currentKeyIndex,
      lastChecked: new Date(),
    });

    // Update other providers
    ['together', 'deepseek', 'puter'].forEach((p) => {
      const provider = p as AIProvider;
      this.providerStatus.set(provider, {
        provider,
        isAvailable: this.checkProviderAvailability(provider),
        lastChecked: new Date(),
      });
    });

    return Array.from(this.providerStatus.values());
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
  } {
    const totalRequests = this.groqKeys.reduce((sum, k) => sum + k.requestCount, 0);
    const availableKeys = this.groqKeys.filter(
      (k) => k.isAvailable && k.requestCount < config.groqDailyLimit
    ).length;
    const exhaustedKeys = this.groqKeys.length - availableKeys;

    const keyDetails = this.groqKeys.map((k) => ({
      index: k.index + 1,
      requests: k.requestCount,
      limit: config.groqDailyLimit,
      available: k.isAvailable && k.requestCount < config.groqDailyLimit,
    }));

    return { totalRequests, availableKeys, exhaustedKeys, keyDetails };
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
    
    // Initial check
    checkAndReset();

    logger.info('⏰ Daily counter reset scheduler initialized');
  }

  /**
   * Reset all key counters (called at midnight UTC)
   */
  private resetAllCounters(): void {
    this.groqKeys.forEach((key) => {
      key.requestCount = 0;
      key.isAvailable = true;
      key.lastError = undefined;
    });
    this.currentKeyIndex = 0;
    
    logger.info('🔄 All Groq key counters reset for new day');
  }
}

// Export singleton instance
export const aiRouter = new AIRouterService();
export default aiRouter;
