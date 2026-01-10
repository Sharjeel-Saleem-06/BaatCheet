/**
 * Context Manager Service
 * Handles conversation context, memory management, and
 * intelligent context window optimization.
 * 
 * @module ContextManager
 */

import { logger } from '../utils/logger.js';
import { getRedis } from '../config/database.js';

// ============================================
// Types
// ============================================

interface Message {
  role: 'system' | 'user' | 'assistant';
  content: string;
}

interface ConversationContext {
  messages: Message[];
  lastUpdated: Date;
  totalTokens: number;
}

// ============================================
// Context Manager Class
// ============================================

class ContextManagerService {
  private localCache: Map<string, ConversationContext> = new Map();
  private readonly CACHE_TTL = 3600; // 1 hour
  private readonly MAX_CACHE_SIZE = 1000;
  private readonly MAX_CONTEXT_TOKENS = 100000; // Conservative limit

  /**
   * Get context for a conversation
   */
  public async getContext(conversationId: string): Promise<Message[]> {
    // Try local cache first
    const local = this.localCache.get(conversationId);
    if (local) {
      return local.messages;
    }

    // Try Redis if available
    const redis = getRedis();
    if (redis) {
      try {
        const cached = await redis.get(`context:${conversationId}`);
        if (cached) {
          const context: ConversationContext = JSON.parse(cached);
          this.localCache.set(conversationId, context);
          return context.messages;
        }
      } catch (error) {
        logger.warn('Redis get error:', error);
      }
    }

    return [];
  }

  /**
   * Update context for a conversation
   */
  public async updateContext(conversationId: string, messages: Message[]): Promise<void> {
    // Optimize messages to fit within context window
    const optimized = this.optimizeContext(messages);
    const totalTokens = this.estimateTokens(optimized);

    const context: ConversationContext = {
      messages: optimized,
      lastUpdated: new Date(),
      totalTokens,
    };

    // Update local cache
    this.localCache.set(conversationId, context);
    this.pruneLocalCache();

    // Update Redis if available
    const redisClient = getRedis();
    if (redisClient) {
      try {
        await redisClient.setEx(
          `context:${conversationId}`,
          this.CACHE_TTL,
          JSON.stringify(context)
        );
      } catch (error) {
        logger.warn('Redis set error:', error);
      }
    }
  }

  /**
   * Clear context for a conversation
   */
  public async clearContext(conversationId: string): Promise<void> {
    this.localCache.delete(conversationId);

    const redisForDelete = getRedis();
    if (redisForDelete) {
      try {
        await redisForDelete.del(`context:${conversationId}`);
      } catch (error) {
        logger.warn('Redis del error:', error);
      }
    }
  }

  /**
   * Alias for clearContext (backward compatibility)
   */
  public async clearCache(conversationId: string): Promise<void> {
    return this.clearContext(conversationId);
  }

  /**
   * Optimize context to fit within token limits
   */
  private optimizeContext(messages: Message[]): Message[] {
    if (messages.length === 0) return [];

    // Always keep system message
    const systemMessage = messages.find(m => m.role === 'system');
    const conversationMessages = messages.filter(m => m.role !== 'system');

    // Calculate available tokens
    const systemTokens = systemMessage ? this.estimateTokens([systemMessage]) : 0;
    const availableTokens = this.MAX_CONTEXT_TOKENS - systemTokens;

    // Build optimized context from recent messages
    const optimized: Message[] = [];
    let currentTokens = 0;

    // Process messages from newest to oldest
    for (let i = conversationMessages.length - 1; i >= 0; i--) {
      const msg = conversationMessages[i];
      const msgTokens = this.estimateMessageTokens(msg);

      if (currentTokens + msgTokens > availableTokens) {
        // If we haven't added any messages yet, add at least the last one
        if (optimized.length === 0) {
          optimized.unshift(this.truncateMessage(msg, availableTokens));
        }
        break;
      }

      optimized.unshift(msg);
      currentTokens += msgTokens;
    }

    // Add system message at the beginning
    if (systemMessage) {
      optimized.unshift(systemMessage);
    }

    return optimized;
  }

  /**
   * Truncate a message to fit within token limit
   */
  private truncateMessage(message: Message, maxTokens: number): Message {
    const maxChars = maxTokens * 4; // Rough approximation
    if (message.content.length <= maxChars) {
      return message;
    }

    return {
      ...message,
      content: message.content.substring(0, maxChars) + '... [truncated]',
    };
  }

  /**
   * Estimate total tokens for messages
   */
  private estimateTokens(messages: Message[]): number {
    return messages.reduce((sum, msg) => sum + this.estimateMessageTokens(msg), 0);
  }

  /**
   * Estimate tokens for a single message
   */
  private estimateMessageTokens(message: Message): number {
    // Rough estimate: ~4 characters per token + overhead for role
    return Math.ceil(message.content.length / 4) + 4;
  }

  /**
   * Prune local cache to prevent memory issues
   */
  private pruneLocalCache(): void {
    if (this.localCache.size <= this.MAX_CACHE_SIZE) return;

    // Convert to array and sort by lastUpdated
    const entries = Array.from(this.localCache.entries())
      .map(([key, value]) => ({ key, lastUpdated: value.lastUpdated }))
      .sort((a, b) => a.lastUpdated.getTime() - b.lastUpdated.getTime());

    // Remove oldest entries until we're under the limit
    const toRemove = entries.slice(0, this.localCache.size - this.MAX_CACHE_SIZE);
    toRemove.forEach(entry => this.localCache.delete(entry.key));

    logger.debug(`Pruned ${toRemove.length} entries from context cache`);
  }

  /**
   * Get cache statistics
   */
  public getStats(): {
    localCacheSize: number;
    maxCacheSize: number;
    maxContextTokens: number;
  } {
    return {
      localCacheSize: this.localCache.size,
      maxCacheSize: this.MAX_CACHE_SIZE,
      maxContextTokens: this.MAX_CONTEXT_TOKENS,
    };
  }

  /**
   * Build context for a new chat with optional history
   */
  public buildContext(
    systemPrompt: string,
    history: Array<{ role: string; content: string }>,
    currentMessage: string
  ): Message[] {
    const messages: Message[] = [
      { role: 'system', content: systemPrompt },
    ];

    // Add history
    for (const msg of history) {
      if (msg.role === 'user' || msg.role === 'assistant') {
        messages.push({
          role: msg.role as 'user' | 'assistant',
          content: msg.content,
        });
      }
    }

    // Add current message
    messages.push({ role: 'user', content: currentMessage });

    // Optimize to fit context window
    return this.optimizeContext(messages);
  }

  /**
   * Summarize a conversation for long-term memory
   */
  public async summarizeConversation(messages: Message[]): Promise<string> {
    // Filter out system messages
    const conversation = messages.filter(m => m.role !== 'system');
    
    if (conversation.length === 0) return '';

    // Build a simple summary
    const userMessages = conversation.filter(m => m.role === 'user').length;
    const assistantMessages = conversation.filter(m => m.role === 'assistant').length;
    
    // Get topics from first few messages
    const firstMessages = conversation.slice(0, 4)
      .map(m => m.content.substring(0, 100))
      .join(' ');

    return `Conversation with ${userMessages} user messages and ${assistantMessages} assistant responses. Topics: ${firstMessages}...`;
  }
}

// Export singleton instance
export const contextManager = new ContextManagerService();
export default contextManager;
