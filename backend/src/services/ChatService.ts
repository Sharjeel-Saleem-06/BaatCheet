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
import { prisma } from '../config/database.js';
import { config } from '../config/index.js';

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
}

// ============================================
// Chat Service Class
// ============================================

class ChatServiceClass {
  /**
   * Process a chat message with context and optional streaming
   */
  public async processMessage(
    userMessage: string,
    options: ChatOptions
  ): Promise<ChatResult> {
    try {
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

      // Build messages array with context
      const messages: Message[] = [];

      // Add system prompt
      const systemPrompt = options.systemPrompt || conversation.systemPrompt || this.getDefaultSystemPrompt();
      messages.push({ role: 'system', content: systemPrompt });

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

      // Get AI response
      const request: ChatRequest = {
        messages,
        model: options.model || conversation.model,
        maxTokens: options.maxTokens,
        temperature: options.temperature,
      };

      const response = await aiRouter.chat(request);

      if (!response.success) {
        return { success: false, error: response.error };
      }

      // Save assistant message to database
      await prisma.message.create({
        data: {
          conversationId,
          role: 'assistant',
          content: response.content,
          model: response.model,
          tokens: response.tokens?.completion || this.estimateTokens(response.content),
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
        { role: 'assistant', content: response.content },
      ]);

      return {
        success: true,
        message: { role: 'assistant', content: response.content },
        conversationId,
        model: response.model,
        provider: response.provider,
        tokens: response.tokens,
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
   * Stream a chat response with SSE
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

      // Build messages array
      const messages: Message[] = [];
      const systemPrompt = options.systemPrompt || conversation.systemPrompt || this.getDefaultSystemPrompt();
      messages.push({ role: 'system', content: systemPrompt });

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

      // Stream response
      let fullContent = '';
      let model = '';
      let provider = '';

      const request: ChatRequest = {
        messages,
        model: options.model || conversation.model,
        maxTokens: options.maxTokens,
        temperature: options.temperature,
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

      // Send completion event
      this.sendSSE(res, {
        done: true,
        model,
        provider,
        tokens,
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
   * Get default system prompt with Roman Urdu support
   */
  private getDefaultSystemPrompt(): string {
    return `You are BaatCheet, a helpful, intelligent, and friendly AI assistant.

Key traits:
- You provide accurate, helpful, and thoughtful responses
- You're conversational and engaging while remaining professional
- You format responses with markdown when helpful (code blocks, lists, headers)
- You acknowledge when you're unsure about something
- You're concise but thorough

Language Support:
- You understand and respond fluently in English, Roman Urdu (Urdu written in Latin script), and mixed language (code-mixing)
- When the user speaks or types in Roman Urdu, respond naturally in the same style
- Keep responses conversational and culturally appropriate for Pakistani users
- Use respectful forms (aap) unless the user uses casual forms (tum/yaar)

Examples of Roman Urdu understanding:
- "Mujhe madad chahiye" = "I need help"
- "Aap kaise hain?" = "How are you?"
- "Yaar, kya scene hai?" = "Hey, what's up?"
- "Theek hai, samajh gaya" = "Okay, I understood"

When user uses mixed language (common in Pakistan):
- Match their style naturally
- Example: "Mujhe coding mein help chahiye" → Respond mixing both languages appropriately

Current date: ${new Date().toLocaleDateString('en-US', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}`;
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
