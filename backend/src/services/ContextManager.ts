import { getRedisClient } from '../config/database.js';
import { prisma } from '../config/database.js';
import { config } from '../config/index.js';
import { logger } from '../utils/logger.js';
import { ConversationContext, ContextMessage } from '../types/index.js';
import { Role } from '@prisma/client';

// ============================================
// Context Manager Service
// Handles conversation memory with Redis caching
// ============================================

class ContextManagerService {
  private readonly CACHE_TTL = 86400; // 24 hours in seconds
  private readonly SYNC_THRESHOLD = 5; // Sync to DB every N messages
  private messageCounts: Map<string, number> = new Map();

  /**
   * Get cache key for a conversation
   */
  private getCacheKey(conversationId: string): string {
    return `baatcheet:context:${conversationId}`;
  }

  /**
   * Estimate tokens for a text (roughly 4 chars per token)
   */
  public estimateTokens(text: string): number {
    return Math.ceil(text.length / 4);
  }

  /**
   * Get conversation context (from cache or database)
   */
  public async getContext(conversationId: string): Promise<ConversationContext | null> {
    const redis = getRedisClient();

    // Try cache first
    if (redis) {
      try {
        const cached = await redis.get(this.getCacheKey(conversationId));
        if (cached) {
          logger.debug(`Cache hit for conversation ${conversationId}`);
          return JSON.parse(cached);
        }
      } catch (error) {
        logger.warn('Redis get error:', error);
      }
    }

    // Fetch from database
    const conversation = await prisma.conversation.findUnique({
      where: { id: conversationId },
      include: {
        messages: {
          orderBy: { createdAt: 'asc' },
          take: config.maxContextMessages,
        },
      },
    });

    if (!conversation) {
      return null;
    }

    const context: ConversationContext = {
      conversationId,
      systemPrompt: conversation.systemPrompt || undefined,
      messages: conversation.messages.map((m) => ({
        role: m.role,
        content: m.content,
        tokens: m.tokens,
      })),
      totalTokens: conversation.totalTokens,
    };

    // Cache the context
    await this.cacheContext(context);

    return context;
  }

  /**
   * Cache conversation context in Redis
   */
  private async cacheContext(context: ConversationContext): Promise<void> {
    const redis = getRedisClient();
    if (!redis) return;

    try {
      await redis.setEx(
        this.getCacheKey(context.conversationId),
        this.CACHE_TTL,
        JSON.stringify(context)
      );
    } catch (error) {
      logger.warn('Redis set error:', error);
    }
  }

  /**
   * Add a message to the context
   */
  public async addMessage(
    conversationId: string,
    role: Role,
    content: string,
    model?: string
  ): Promise<{ messageId: string; tokens: number }> {
    const tokens = this.estimateTokens(content);

    // Save to database
    const message = await prisma.message.create({
      data: {
        conversationId,
        role,
        content,
        model,
        tokens,
      },
    });

    // Update conversation total tokens
    await prisma.conversation.update({
      where: { id: conversationId },
      data: {
        totalTokens: { increment: tokens },
        updatedAt: new Date(),
      },
    });

    // Update cache
    const context = await this.getContext(conversationId);
    if (context) {
      context.messages.push({ role, content, tokens });
      context.totalTokens += tokens;

      // Prune if needed
      await this.pruneIfNeeded(context);
      await this.cacheContext(context);
    }

    // Track message count for sync
    const count = (this.messageCounts.get(conversationId) || 0) + 1;
    this.messageCounts.set(conversationId, count);

    // Sync to DB periodically
    if (count >= this.SYNC_THRESHOLD) {
      this.messageCounts.set(conversationId, 0);
      // Sync happens automatically via Prisma
    }

    return { messageId: message.id, tokens };
  }

  /**
   * Prune old messages if token limit exceeded
   */
  private async pruneIfNeeded(context: ConversationContext): Promise<void> {
    if (context.totalTokens <= config.maxTokens && 
        context.messages.length <= config.maxContextMessages) {
      return;
    }

    logger.debug(`Pruning context for ${context.conversationId}`);

    // Keep system messages separate
    const systemMessages = context.messages.filter((m) => m.role === 'system');
    const otherMessages = context.messages.filter((m) => m.role !== 'system');

    // Calculate tokens for system messages
    const systemTokens = systemMessages.reduce((sum, m) => sum + m.tokens, 0);
    const availableTokens = config.maxTokens - systemTokens;

    // Keep most recent messages within token limit
    const prunedMessages: ContextMessage[] = [];
    let currentTokens = 0;

    // Add messages from most recent, working backwards
    for (let i = otherMessages.length - 1; i >= 0; i--) {
      const msg = otherMessages[i];
      if (currentTokens + msg.tokens <= availableTokens) {
        prunedMessages.unshift(msg);
        currentTokens += msg.tokens;
      } else {
        break;
      }
    }

    // Limit to max messages
    const maxOtherMessages = config.maxContextMessages - systemMessages.length;
    if (prunedMessages.length > maxOtherMessages) {
      const excess = prunedMessages.length - maxOtherMessages;
      prunedMessages.splice(0, excess);
    }

    // Update context
    context.messages = [...systemMessages, ...prunedMessages];
    context.totalTokens = context.messages.reduce((sum, m) => sum + m.tokens, 0);

    logger.debug(
      `Pruned to ${context.messages.length} messages, ${context.totalTokens} tokens`
    );
  }

  /**
   * Build messages array for AI API call
   */
  public buildApiMessages(
    context: ConversationContext,
    newMessage: string
  ): Array<{ role: 'system' | 'user' | 'assistant'; content: string }> {
    const messages: Array<{ role: 'system' | 'user' | 'assistant'; content: string }> = [];

    // Add system prompt if exists
    if (context.systemPrompt) {
      messages.push({ role: 'system', content: context.systemPrompt });
    }

    // Add conversation history
    context.messages
      .filter((m) => m.role !== 'system')
      .forEach((m) => {
        messages.push({
          role: m.role as 'user' | 'assistant',
          content: m.content,
        });
      });

    // Add new user message
    messages.push({ role: 'user', content: newMessage });

    return messages;
  }

  /**
   * Clear cache for a conversation
   */
  public async clearCache(conversationId: string): Promise<void> {
    const redis = getRedisClient();
    if (!redis) return;

    try {
      await redis.del(this.getCacheKey(conversationId));
      logger.debug(`Cache cleared for conversation ${conversationId}`);
    } catch (error) {
      logger.warn('Redis delete error:', error);
    }
  }

  /**
   * Create initial context for a new conversation
   */
  public createInitialContext(
    conversationId: string,
    systemPrompt?: string
  ): ConversationContext {
    return {
      conversationId,
      systemPrompt,
      messages: [],
      totalTokens: systemPrompt ? this.estimateTokens(systemPrompt) : 0,
    };
  }
}

// Export singleton instance
export const contextManager = new ContextManagerService();
export default contextManager;
