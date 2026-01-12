/**
 * Chat Service
 * High-level service for handling chat conversations with
 * context management, streaming, and conversation persistence.
 * 
 * @module ChatService
 */

import { Response } from 'express';
import { logger } from '../utils/logger.js';
import { aiRouter, Message, ChatRequest } from './AIRouter.js';
import { contextManager } from './ContextManager.js';
import { promptAnalyzer, PromptAnalysis } from './PromptAnalyzer.js';
import { responseFormatter } from './ResponseFormatter.js';
import { profileLearning } from './ProfileLearningService.js';
import { prisma } from '../config/database.js';
import { config } from '../config/index.js';
import { getSystemPrompt, getIntentPrompt } from '../config/systemPrompts.js';

// ============================================
// Types
// ============================================

export interface ChatMessage {
  role: 'user' | 'assistant' | 'system';
  content: string;
}

export interface ChatOptions {
  conversationId?: string;
  userId: string;
  model?: string;
  systemPrompt?: string;
  maxTokens?: number;
  temperature?: number;
  stream?: boolean;
  originalMessage?: string; // Original message without image context
  imageIds?: string[]; // Attached image IDs
}

export interface ChatResult {
  success: boolean;
  message?: ChatMessage;
  conversationId?: string;
  model?: string;
  provider?: string;
  tokens?: {
    prompt: number;
    completion: number;
    total: number;
  };
  error?: string;
  metadata?: {
    intent: string;
    formatApplied: string;
    language: string;
  };
}

// ============================================
// Chat Service Class
// ============================================

class ChatServiceClass {
  /**
   * Process a chat message with context, prompt analysis, and intelligent formatting
   */
  public async processMessage(
    userMessage: string,
    options: ChatOptions
  ): Promise<ChatResult> {
    try {
      // Step 1: Analyze the user prompt for intent and formatting needs
      const promptAnalysis = await promptAnalyzer.analyze(userMessage);
      
      logger.info('Prompt analyzed', {
        intent: promptAnalysis.intent,
        format: promptAnalysis.formatRequested,
        complexity: promptAnalysis.complexity,
        language: promptAnalysis.language,
      });

      // Get or create conversation
      let conversationId = options.conversationId;
      let conversation;

      if (conversationId) {
        conversation = await prisma.conversation.findUnique({
          where: { id: conversationId },
          include: { messages: { orderBy: { createdAt: 'asc' }, take: 50 } },
        });

        if (!conversation || conversation.userId !== options.userId) {
          return { success: false, error: 'Conversation not found' };
        }
      } else {
        // Create new conversation
        conversation = await prisma.conversation.create({
          data: {
            userId: options.userId,
            title: this.generateTitle(userMessage),
            model: options.model || config.ai.defaultModel,
            systemPrompt: options.systemPrompt,
          },
          include: { messages: true },
        });
        conversationId = conversation.id;
      }

      // Step 2: Extract facts from user message (async, don't block response)
      const conversationHistory = conversation.messages?.map(m => ({
        role: m.role as 'user' | 'assistant',
        content: m.content,
      })) || [];

      // Run fact extraction in background (non-blocking)
      profileLearning.extractFactsFromMessage(
        options.userId,
        conversationId,
        userMessage,
        conversationHistory
      ).then(async facts => {
        if (facts.length > 0) {
          const savedCount = await profileLearning.saveFacts(options.userId, conversationId!, facts);
          logger.info(`Learned ${savedCount} new facts`, { userId: options.userId });
        }
      }).catch(err => logger.error('Background fact extraction failed:', err));

      // Step 3: Build enhanced system prompt with user profile context
      const userContext = await profileLearning.getUserContext(options.userId, conversationId);
      
      const baseSystemPrompt = options.systemPrompt || conversation.systemPrompt || this.getAdvancedSystemPrompt(promptAnalysis);
      
      // Add formatting hints based on prompt analysis
      const formattingHints = promptAnalyzer.generateFormattingHints(promptAnalysis);
      
      // Combine: base prompt + profile context + recent conversations + formatting hints
      const enhancedSystemPrompt = baseSystemPrompt + 
        userContext.profile + 
        userContext.recentConversations + 
        formattingHints;
      
      logger.info('Memory context injected', {
        userId: options.userId,
        factCount: userContext.factCount,
        hasProfile: userContext.profile.length > 0,
        hasRecentContext: userContext.recentConversations.length > 0,
      });

      // Build messages array with context
      const messages: Message[] = [];
      messages.push({ role: 'system', content: enhancedSystemPrompt });

      // Add conversation history
      if (conversation.messages) {
        for (const msg of conversation.messages) {
          messages.push({
            role: msg.role as 'user' | 'assistant',
            content: msg.content,
          });
        }
      }

      // Add current user message
      messages.push({ role: 'user', content: userMessage });

      // Save user message to database
      await prisma.message.create({
        data: {
          conversationId,
          role: 'user',
          content: userMessage,
          tokens: this.estimateTokens(userMessage),
        },
      });

      // Step 3: Get AI response with optimized parameters
      const request: ChatRequest = {
        messages,
        model: options.model || conversation.model,
        maxTokens: options.maxTokens || promptAnalysis.suggestedMaxTokens,
        temperature: options.temperature ?? promptAnalysis.suggestedTemperature,
      };

      const response = await aiRouter.chat(request);

      if (!response.success) {
        return { success: false, error: response.error };
      }

      // Step 4: Post-process response with intelligent formatting
      const formattedResponse = await responseFormatter.format({
        promptAnalysis,
        rawResponse: response.content,
      });

      // Save assistant message to database
      await prisma.message.create({
        data: {
          conversationId,
          role: 'assistant',
          content: formattedResponse.content,
          model: response.model,
          tokens: response.tokens?.completion || this.estimateTokens(formattedResponse.content),
        },
      });

      // Update conversation total tokens
      await prisma.conversation.update({
        where: { id: conversationId },
        data: {
          totalTokens: { increment: response.tokens?.total || 0 },
          updatedAt: new Date(),
        },
      });

      // Update context cache
      await contextManager.updateContext(conversationId, [
        ...messages,
        { role: 'assistant', content: formattedResponse.content },
      ]);

      // Generate conversation summary if needed (every 10 messages, async)
      profileLearning.shouldGenerateSummary(conversationId).then(async shouldSummarize => {
        if (shouldSummarize) {
          await profileLearning.generateConversationSummary(options.userId, conversationId!);
        }
      }).catch(err => logger.error('Summary check failed:', err));

      return {
        success: true,
        message: { role: 'assistant', content: formattedResponse.content },
        conversationId,
        model: response.model,
        provider: response.provider,
        tokens: response.tokens,
        metadata: {
          intent: promptAnalysis.intent,
          formatApplied: promptAnalysis.formatRequested,
          language: promptAnalysis.language,
        },
      };
    } catch (error) {
      logger.error('Chat processing error:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to process message',
      };
    }
  }

  /**
   * Stream a chat response with SSE and intelligent formatting
   */
  public async streamMessage(
    res: Response,
    userMessage: string,
    options: ChatOptions
  ): Promise<void> {
    try {
      // Set SSE headers
      res.setHeader('Content-Type', 'text/event-stream');
      res.setHeader('Cache-Control', 'no-cache');
      res.setHeader('Connection', 'keep-alive');
      res.setHeader('X-Accel-Buffering', 'no');

      // Step 1: Analyze the user prompt
      const promptAnalysis = await promptAnalyzer.analyze(userMessage);
      
      logger.info('Stream: Prompt analyzed', {
        intent: promptAnalysis.intent,
        format: promptAnalysis.formatRequested,
        complexity: promptAnalysis.complexity,
      });

      // Get or create conversation
      let conversationId = options.conversationId;
      let conversation;

      if (conversationId) {
        conversation = await prisma.conversation.findUnique({
          where: { id: conversationId },
          include: { messages: { orderBy: { createdAt: 'asc' }, take: 50 } },
        });

        if (!conversation || conversation.userId !== options.userId) {
          this.sendSSE(res, { error: 'Conversation not found' });
          res.end();
          return;
        }
      } else {
        conversation = await prisma.conversation.create({
          data: {
            userId: options.userId,
            title: this.generateTitle(userMessage),
            model: options.model || config.ai.defaultModel,
            systemPrompt: options.systemPrompt,
          },
          include: { messages: true },
        });
        conversationId = conversation.id;
      }

      // Step 2: Extract facts from user message (async, don't block response)
      const conversationHistory = conversation.messages?.map(m => ({
        role: m.role as 'user' | 'assistant',
        content: m.content,
      })) || [];

      // Run fact extraction in background (non-blocking)
      profileLearning.extractFactsFromMessage(
        options.userId,
        conversationId!,
        userMessage,
        conversationHistory
      ).then(async facts => {
        if (facts.length > 0) {
          const savedCount = await profileLearning.saveFacts(options.userId, conversationId!, facts);
          logger.info(`Learned ${savedCount} new facts from stream`, { userId: options.userId });
        }
      }).catch(err => logger.error('Background fact extraction failed:', err));

      // Step 3: Build enhanced system prompt with user profile context
      const userContext = await profileLearning.getUserContext(options.userId, conversationId);
      
      const baseSystemPrompt = options.systemPrompt || conversation.systemPrompt || this.getAdvancedSystemPrompt(promptAnalysis);
      const formattingHints = promptAnalyzer.generateFormattingHints(promptAnalysis);
      
      // Combine: base prompt + profile context + recent conversations + formatting hints
      const enhancedSystemPrompt = baseSystemPrompt + 
        userContext.profile + 
        userContext.recentConversations + 
        formattingHints;

      logger.info('Stream: Memory context injected', {
        userId: options.userId,
        factCount: userContext.factCount,
        hasProfile: userContext.profile.length > 0,
      });

      // Build messages array
      const messages: Message[] = [];
      messages.push({ role: 'system', content: enhancedSystemPrompt });

      if (conversation.messages) {
        for (const msg of conversation.messages) {
          messages.push({
            role: msg.role as 'user' | 'assistant',
            content: msg.content,
          });
        }
      }

      messages.push({ role: 'user', content: userMessage });

      // Save user message (use original without image context for storage)
      const messageToStore = options.originalMessage || userMessage;
      const savedMessage = await prisma.message.create({
        data: {
          conversationId,
          role: 'user',
          content: messageToStore,
          tokens: this.estimateTokens(messageToStore),
        },
      });

      // Link images to message if provided
      if (options.imageIds && options.imageIds.length > 0) {
        await prisma.attachment.updateMany({
          where: {
            id: { in: options.imageIds },
            userId: options.userId,
          },
          data: {
            messageId: savedMessage.id,
            conversationId,
          },
        });
      }

      // Send conversation ID
      this.sendSSE(res, { conversationId });

      // Stream response with optimized parameters
      let fullContent = '';
      let model = '';
      let provider = '';

      const request: ChatRequest = {
        messages,
        model: options.model || conversation.model,
        maxTokens: options.maxTokens || promptAnalysis.suggestedMaxTokens,
        temperature: options.temperature ?? promptAnalysis.suggestedTemperature,
        stream: true,
      };

      for await (const chunk of aiRouter.chatStream(request)) {
        if (chunk.content) {
          fullContent += chunk.content;
          this.sendSSE(res, { content: chunk.content });
        }
        if (chunk.model) model = chunk.model;
        if (chunk.provider) provider = chunk.provider;
        if (chunk.done) break;
      }

      // Save assistant message
      const tokens = this.estimateTokens(fullContent);
      await prisma.message.create({
        data: {
          conversationId,
          role: 'assistant',
          content: fullContent,
          model,
          tokens,
        },
      });

      // Update conversation
      await prisma.conversation.update({
        where: { id: conversationId },
        data: {
          totalTokens: { increment: tokens },
          updatedAt: new Date(),
        },
      });

      // Generate conversation summary if needed (every 10 messages, async)
      profileLearning.shouldGenerateSummary(conversationId!).then(async shouldSummarize => {
        if (shouldSummarize) {
          await profileLearning.generateConversationSummary(options.userId, conversationId!);
        }
      }).catch(err => logger.error('Summary check failed:', err));

      // Send completion event with metadata
      this.sendSSE(res, {
        done: true,
        model,
        provider,
        tokens,
        metadata: {
          intent: promptAnalysis.intent,
          formatApplied: promptAnalysis.formatRequested,
          language: promptAnalysis.language,
        },
      });

      res.end();
    } catch (error) {
      logger.error('Stream error:', error);
      this.sendSSE(res, { error: error instanceof Error ? error.message : 'Stream failed' });
      res.end();
    }
  }

  /**
   * Regenerate the last assistant response
   */
  public async regenerateResponse(
    conversationId: string,
    userId: string,
    options?: { model?: string; temperature?: number }
  ): Promise<ChatResult> {
    try {
      const conversation = await prisma.conversation.findUnique({
        where: { id: conversationId },
        include: { messages: { orderBy: { createdAt: 'asc' } } },
      });

      if (!conversation || conversation.userId !== userId) {
        return { success: false, error: 'Conversation not found' };
      }

      // Find the last user message
      const messages = conversation.messages;
      let lastUserMessageIndex = -1;

      for (let i = messages.length - 1; i >= 0; i--) {
        if (messages[i].role === 'user') {
          lastUserMessageIndex = i;
          break;
        }
      }

      if (lastUserMessageIndex === -1) {
        return { success: false, error: 'No user message to regenerate from' };
      }

      // Delete messages after the last user message
      const messagesToDelete = messages.slice(lastUserMessageIndex + 1);
      await prisma.message.deleteMany({
        where: { id: { in: messagesToDelete.map(m => m.id) } },
      });

      // Get the last user message content
      const lastUserMessage = messages[lastUserMessageIndex].content;

      // Process with new response
      return this.processMessage(lastUserMessage, {
        conversationId,
        userId,
        model: options?.model || conversation.model,
        temperature: options?.temperature,
      });
    } catch (error) {
      logger.error('Regenerate error:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to regenerate',
      };
    }
  }

  /**
   * Get advanced system prompt based on prompt analysis
   */
  private getAdvancedSystemPrompt(analysis: PromptAnalysis): string {
    // Build system prompt with relevant enhancements
    const includeRomanUrdu = analysis.language === 'urdu' || 
                             analysis.language === 'mixed' ||
                             analysis.language === 'other';
    
    let prompt = getSystemPrompt({
      includeFormatting: analysis.requiresStructuring,
      includeRomanUrdu,
      intentHint: analysis.intent !== 'general_query' ? analysis.intent : undefined,
    });
    
    // Add intent-specific instructions
    const intentPrompt = getIntentPrompt(analysis.intent);
    if (intentPrompt) {
      prompt += '\n\n' + intentPrompt;
    }
    
    return prompt;
  }

  /**
   * Get default system prompt (fallback)
   */
  private getDefaultSystemPrompt(): string {
    return getSystemPrompt({
      includeFormatting: true,
      includeRomanUrdu: true,
    });
  }

  /**
   * Generate a title from the first message
   */
  private generateTitle(message: string): string {
    // Clean and truncate
    const cleaned = message
      .replace(/\n/g, ' ')
      .replace(/\s+/g, ' ')
      .trim();

    if (cleaned.length <= 50) return cleaned;

    // Try to break at a word boundary
    const truncated = cleaned.substring(0, 50);
    const lastSpace = truncated.lastIndexOf(' ');

    return lastSpace > 30 ? truncated.substring(0, lastSpace) + '...' : truncated + '...';
  }

  /**
   * Estimate token count (rough approximation)
   */
  private estimateTokens(text: string): number {
    // Rough estimate: ~4 characters per token for English
    return Math.ceil(text.length / 4);
  }

  /**
   * Send SSE event
   */
  private sendSSE(res: Response, data: Record<string, unknown>): void {
    res.write(`data: ${JSON.stringify(data)}\n\n`);
  }
}

// Export singleton instance
export const chatService = new ChatServiceClass();
export default chatService;
