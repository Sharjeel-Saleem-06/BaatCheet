import Groq from 'groq-sdk';
import { config } from '../config/index.js';
import { logger } from '../utils/logger.js';
import { AIProvider, IAIProviderStatus } from '../types/index.js';

// ============================================
// AI Router Service
// Simple, extensible AI provider management
// ============================================

interface AIKeyState {
  key: string;
  requestCount: number;
  isAvailable: boolean;
  lastUsed: Date;
}

class AIRouterService {
  private groqKeys: AIKeyState[] = [];
  private currentKeyIndex: number = 0;
  private readonly MAX_REQUESTS_PER_KEY = 14400; // Groq daily limit
  
  private providerStatus: Map<AIProvider, IAIProviderStatus> = new Map();

  constructor() {
    this.initializeKeys();
    this.initializeProviderStatus();
    
    // Reset counters at midnight UTC
    this.scheduleCounterReset();
  }

  // Initialize Groq API keys
  private initializeKeys(): void {
    this.groqKeys = config.groqApiKeys.map((key) => ({
      key,
      requestCount: 0,
      isAvailable: true,
      lastUsed: new Date(),
    }));

    logger.info(`🔑 Initialized ${this.groqKeys.length} Groq API keys`);
  }

  // Initialize provider status tracking
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

  // Check if a provider is available
  private checkProviderAvailability(provider: AIProvider): boolean {
    switch (provider) {
      case 'groq':
        return this.groqKeys.length > 0;
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

  // Get the next available Groq key (round-robin)
  private getNextGroqKey(): AIKeyState | null {
    const availableKeys = this.groqKeys.filter(
      (k) => k.isAvailable && k.requestCount < this.MAX_REQUESTS_PER_KEY
    );

    if (availableKeys.length === 0) {
      logger.warn('⚠️ All Groq keys exhausted');
      return null;
    }

    // Round-robin selection
    const key = availableKeys[this.currentKeyIndex % availableKeys.length];
    this.currentKeyIndex = (this.currentKeyIndex + 1) % availableKeys.length;
    
    return key;
  }

  // Get Groq client with next available key
  public getGroqClient(): Groq | null {
    const keyState = this.getNextGroqKey();
    
    if (!keyState) {
      return null;
    }

    // Increment usage
    keyState.requestCount++;
    keyState.lastUsed = new Date();

    logger.debug(`Using Groq key index: ${this.groqKeys.indexOf(keyState)}, requests: ${keyState.requestCount}`);

    return new Groq({ apiKey: keyState.key });
  }

  // Mark a key as rate limited
  public markKeyRateLimited(keyIndex: number): void {
    if (this.groqKeys[keyIndex]) {
      this.groqKeys[keyIndex].isAvailable = false;
      logger.warn(`🚫 Groq key ${keyIndex} marked as rate limited`);
    }
  }

  // Get current provider to use (with fallback logic)
  public getCurrentProvider(): AIProvider {
    // Check Groq first
    if (this.getNextGroqKey()) {
      return 'groq';
    }

    // Fallback to Together
    if (config.togetherApiKey) {
      return 'together';
    }

    // Fallback to DeepSeek
    if (config.deepseekApiKey) {
      return 'deepseek';
    }

    // Last resort: Puter (client-side)
    return 'puter';
  }

  // Get all providers health status
  public getProvidersHealth(): IAIProviderStatus[] {
    // Update status before returning
    this.providerStatus.forEach((status, provider) => {
      status.isAvailable = this.checkProviderAvailability(provider);
      status.lastChecked = new Date();
      
      if (provider === 'groq') {
        const availableKeys = this.groqKeys.filter(
          (k) => k.isAvailable && k.requestCount < this.MAX_REQUESTS_PER_KEY
        );
        status.currentKeyIndex = this.currentKeyIndex;
        status.totalKeys = this.groqKeys.length;
      }
    });

    return Array.from(this.providerStatus.values());
  }

  // Get usage statistics
  public getUsageStats(): {
    totalRequests: number;
    availableKeys: number;
    exhaustedKeys: number;
  } {
    const totalRequests = this.groqKeys.reduce((sum, k) => sum + k.requestCount, 0);
    const availableKeys = this.groqKeys.filter(
      (k) => k.isAvailable && k.requestCount < this.MAX_REQUESTS_PER_KEY
    ).length;
    const exhaustedKeys = this.groqKeys.length - availableKeys;

    return { totalRequests, availableKeys, exhaustedKeys };
  }

  // Schedule daily counter reset at midnight UTC
  private scheduleCounterReset(): void {
    const now = new Date();
    const tomorrow = new Date(now);
    tomorrow.setUTCDate(tomorrow.getUTCDate() + 1);
    tomorrow.setUTCHours(0, 0, 0, 0);
    
    const msUntilMidnight = tomorrow.getTime() - now.getTime();

    setTimeout(() => {
      this.resetAllCounters();
      // Schedule next reset
      setInterval(() => this.resetAllCounters(), 24 * 60 * 60 * 1000);
    }, msUntilMidnight);

    logger.info(`⏰ Counter reset scheduled in ${Math.round(msUntilMidnight / 1000 / 60)} minutes`);
  }

  // Reset all key counters
  private resetAllCounters(): void {
    this.groqKeys.forEach((key) => {
      key.requestCount = 0;
      key.isAvailable = true;
    });
    this.currentKeyIndex = 0;
    logger.info('🔄 All Groq key counters reset');
  }
}

// Export singleton instance
export const aiRouter = new AIRouterService();
export default aiRouter;
