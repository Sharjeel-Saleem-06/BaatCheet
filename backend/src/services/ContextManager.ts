/**
 * Context Manager Service
 * Handles conversation context, memory management, and
 * intelligent context window optimization with accurate token counting.
 * 
 * @module ContextManager
 */

import { encodingForModel, TiktokenModel } from 'js-tiktoken';
import { logger } from '../utils/logger.js';
import { getRedis } from '../config/database.js';
import { prisma } from '../config/database.js';

// ============================================
// Types
// ============================================

interface Message {
  role: 'system' | 'user' | 'assistant';
  content: string;
  tokens?: number;
}

interface ConversationContext {
  messages: Message[];
  lastUpdated: Date;
  totalTokens: number;
}

interface ContextConfig {
  maxTokens: number;
  maxMessages: number;
  systemPromptTokens: number;
}

// ============================================
// Token Counter Class
// ============================================

class TokenCounter {
  private encoder: ReturnType<typeof encodingForModel> | null = null;
  private model: TiktokenModel = 'gpt-4';

  constructor() {
    try {
      this.encoder = encodingForModel(this.model);
    } catch (error) {
      logger.warn('Failed to initialize tiktoken encoder, using fallback estimation');
    }
  }

  /**
   * Count tokens in text using tiktoken (accurate)
   */
  count(text: string): number {
    if (!text) return 0;
    
    if (this.encoder) {
      try {
        return this.encoder.encode(text).length;
      } catch (error) {
        logger.warn('Tiktoken encode error, using fallback');
      }
    }
    
    // Fallback: ~4 characters per token
    return Math.ceil(text.length / 4);
  }

  /**
   * Count tokens for a message (content + role overhead)
   */
  countMessage(message: Message): number {
    // Each message has ~4 tokens overhead for role/formatting
    return this.count(message.content) + 4;
  }

  /**
   * Count total tokens for messages array
   */
  countMessages(messages: Message[]): number {
    return messages.reduce((sum, msg) => sum + this.countMessage(msg), 0);
  }
}

// ============================================
// Context Manager Class
// ============================================

class ContextManagerService {
  private localCache: Map<string, ConversationContext> = new Map();
  private tokenCounter: TokenCounter;
  
  // Configuration
  private readonly CACHE_TTL = 3600; // 1 hour
  private readonly MAX_CACHE_SIZE = 1000;
  private readonly DEFAULT_CONFIG: ContextConfig = {
    maxTokens: 8000,
    maxMessages: 50,
    systemPromptTokens: 500,
  };

  constructor() {
    this.tokenCounter = new TokenCounter();
  }

  /**
   * Get context for a conversation with token counting
   */
  public async getContext(
    conversationId: string,
    config: Partial<ContextConfig> = {}
  ): Promise<Message[]> {
    const mergedConfig = { ...this.DEFAULT_CONFIG, ...config };
    
    // Try local cache first
    const local = this.localCache.get(conversationId);
    if (local && local.totalTokens <= mergedConfig.maxTokens) {
      return local.messages;
    }

    // Try Redis if available
    const redis = getRedis();
    if (redis) {
      try {
        const cached = await redis.get(`context:${conversationId}`);
        if (cached) {
          const context: ConversationContext = JSON.parse(cached);
          if (context.totalTokens <= mergedConfig.maxTokens) {
            this.localCache.set(conversationId, context);
            return context.messages;
          }
        }
      } catch (error) {
        logger.warn('Redis get error:', error);
      }
    }

    // Fetch from database
    return this.loadContextFromDB(conversationId, mergedConfig);
  }

  /**
   * Load context from database with pruning
   */
  private async loadContextFromDB(
    conversationId: string,
    config: ContextConfig
  ): Promise<Message[]> {
    try {
      const messages = await prisma.message.findMany({
        where: { conversationId },
        orderBy: { createdAt: 'desc' },
        take: config.maxMessages,
        select: {
          role: true,
          content: true,
          tokens: true,
        },
      });

      // Reverse to get chronological order
      const chronological = messages.reverse().map(m => ({
        role: m.role as 'system' | 'user' | 'assistant',
        content: m.content,
        tokens: m.tokens || this.tokenCounter.countMessage({ role: m.role as any, content: m.content }),
      }));

      // Prune to fit within token limit
      const pruned = this.pruneContext(chronological, config.maxTokens);
      
      // Cache the result
      await this.updateContext(conversationId, pruned);
      
      return pruned;
    } catch (error) {
      logger.error('Error loading context from DB:', error);
      return [];
    }
  }

  /**
   * Update context for a conversation
   */
  public async updateContext(conversationId: string, messages: Message[]): Promise<void> {
    // Calculate tokens for each message if not present
    const withTokens = messages.map(msg => ({
      ...msg,
      tokens: msg.tokens || this.tokenCounter.countMessage(msg),
    }));

    const totalTokens = withTokens.reduce((sum, m) => sum + (m.tokens || 0), 0);

    const context: ConversationContext = {
      messages: withTokens,
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
   * Add a single message to context
   */
  public async addMessage(
    conversationId: string,
    message: Message
  ): Promise<void> {
    const currentContext = await this.getContext(conversationId);
    const tokens = this.tokenCounter.countMessage(message);
    
    currentContext.push({ ...message, tokens });
    
    // Prune if needed
    const pruned = this.pruneContext(currentContext, this.DEFAULT_CONFIG.maxTokens);
    await this.updateContext(conversationId, pruned);
  }

  /**
   * Prune context intelligently to fit within token limit
   */
  private pruneContext(messages: Message[], maxTokens: number): Message[] {
    if (messages.length === 0) return [];

    // Always keep system message
    const systemMessage = messages.find(m => m.role === 'system');
    const conversationMessages = messages.filter(m => m.role !== 'system');

    // Calculate available tokens
    const systemTokens = systemMessage 
      ? this.tokenCounter.countMessage(systemMessage) 
      : 0;
    const availableTokens = maxTokens - systemTokens;

    // Build optimized context from recent messages
    const optimized: Message[] = [];
    let currentTokens = 0;

    // Process messages from newest to oldest
    for (let i = conversationMessages.length - 1; i >= 0; i--) {
      const msg = conversationMessages[i];
      const msgTokens = msg.tokens || this.tokenCounter.countMessage(msg);

      if (currentTokens + msgTokens > availableTokens) {
        // If we haven't added any messages yet, add at least the last one (truncated)
        if (optimized.length === 0) {
          optimized.unshift(this.truncateMessage(msg, availableTokens));
        }
        break;
      }

      optimized.unshift({ ...msg, tokens: msgTokens });
      currentTokens += msgTokens;
    }

    // Add system message at the beginning
    if (systemMessage) {
      optimized.unshift(systemMessage);
    }

    logger.debug(`Context pruned: ${messages.length} → ${optimized.length} messages, ${currentTokens + systemTokens} tokens`);
    return optimized;
  }

  /**
   * Truncate a message to fit within token limit
   */
  private truncateMessage(message: Message, maxTokens: number): Message {
    const currentTokens = this.tokenCounter.count(message.content);
    if (currentTokens <= maxTokens) {
      return message;
    }

    // Binary search for optimal truncation point
    let low = 0;
    let high = message.content.length;
    
    while (low < high) {
      const mid = Math.floor((low + high + 1) / 2);
      const truncated = message.content.substring(0, mid);
      const tokens = this.tokenCounter.count(truncated);
      
      if (tokens <= maxTokens - 10) { // Leave room for truncation marker
        low = mid;
      } else {
        high = mid - 1;
      }
    }

    return {
      ...message,
      content: message.content.substring(0, low) + '... [truncated]',
      tokens: maxTokens,
    };
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
   * Prune local cache to prevent memory issues
   */
  private pruneLocalCache(): void {
    if (this.localCache.size <= this.MAX_CACHE_SIZE) return;

    const entries = Array.from(this.localCache.entries())
      .map(([key, value]) => ({ key, lastUpdated: value.lastUpdated }))
      .sort((a, b) => a.lastUpdated.getTime() - b.lastUpdated.getTime());

    const toRemove = entries.slice(0, this.localCache.size - this.MAX_CACHE_SIZE);
    toRemove.forEach(entry => this.localCache.delete(entry.key));

    logger.debug(`Pruned ${toRemove.length} entries from context cache`);
  }

  /**
   * Count tokens in text (public method)
   */
  public countTokens(text: string): number {
    return this.tokenCounter.count(text);
  }

  /**
   * Count tokens for a message (public method)
   */
  public countMessageTokens(message: Message): number {
    return this.tokenCounter.countMessage(message);
  }

  /**
   * Get cache statistics
   */
  public getStats(): {
    localCacheSize: number;
    maxCacheSize: number;
    defaultMaxTokens: number;
    defaultMaxMessages: number;
  } {
    return {
      localCacheSize: this.localCache.size,
      maxCacheSize: this.MAX_CACHE_SIZE,
      defaultMaxTokens: this.DEFAULT_CONFIG.maxTokens,
      defaultMaxMessages: this.DEFAULT_CONFIG.maxMessages,
    };
  }

  /**
   * Build context for a new chat with optional history
   */
  public buildContext(
    systemPrompt: string,
    history: Array<{ role: string; content: string }>,
    currentMessage: string,
    maxTokens: number = this.DEFAULT_CONFIG.maxTokens
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

    // Prune to fit context window
    return this.pruneContext(messages, maxTokens);
  }

  /**
   * Summarize a conversation for long-term memory
   */
  public async summarizeConversation(messages: Message[]): Promise<string> {
    const conversation = messages.filter(m => m.role !== 'system');
    
    if (conversation.length === 0) return '';

    const userMessages = conversation.filter(m => m.role === 'user').length;
    const assistantMessages = conversation.filter(m => m.role === 'assistant').length;
    const totalTokens = this.tokenCounter.countMessages(conversation);
    
    // Get topics from first few messages
    const firstMessages = conversation.slice(0, 4)
      .map(m => m.content.substring(0, 100))
      .join(' ');

    return `Conversation with ${userMessages} user messages and ${assistantMessages} assistant responses (${totalTokens} tokens). Topics: ${firstMessages}...`;
  }

  /**
   * Update token count for a message in database
   */
  public async updateMessageTokenCount(messageId: string, content: string): Promise<number> {
    const tokens = this.tokenCounter.count(content) + 4; // +4 for role overhead
    
    await prisma.message.update({
      where: { id: messageId },
      data: { tokens },
    });
    
    return tokens;
  }
}

// Export singleton instance
export const contextManager = new ContextManagerService();
export default contextManager;
