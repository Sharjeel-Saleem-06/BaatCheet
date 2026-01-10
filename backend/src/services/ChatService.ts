import { Response } from 'express';
import { v4 as uuidv4 } from 'uuid';
import { aiRouter } from './AIRouter.js';
import { contextManager } from './ContextManager.js';
import { streamingService } from './StreamingService.js';
import { prisma } from '../config/database.js';
import { config } from '../config/index.js';
import { logger } from '../utils/logger.js';
import { ChatRequest, AIProvider } from '../types/index.js';
import { Role } from '@prisma/client';

// ============================================
// Chat Service
// Handles AI chat completions with streaming
// ============================================

class ChatService {
  /**
   * Send a chat message and stream the response
   */
  public async streamChat(
    userId: string,
    request: ChatRequest,
    res: Response
  ): Promise<void> {
    const { message, conversationId: existingConvId, model, systemPrompt } = request;
    const connectionId = uuidv4();

    // Initialize SSE
    streamingService.initializeSSE(res, connectionId);

    try {
      // Get or create conversation
      let conversationId = existingConvId;
      let context = existingConvId
        ? await contextManager.getContext(existingConvId)
        : null;

      // Create new conversation if needed
      if (!context) {
        const conversation = await prisma.conversation.create({
          data: {
            userId,
            title: this.generateTitle(message),
            model: model || config.defaultModel,
            systemPrompt,
          },
        });
        conversationId = conversation.id;
        context = contextManager.createInitialContext(conversationId, systemPrompt);
      }

      // Send start event with conversation ID
      streamingService.sendStart(res, conversationId!);

      // Add user message to context and database
      await contextManager.addMessage(conversationId!, Role.user, message);

      // Get AI provider and stream response
      const provider = aiRouter.getCurrentProvider();
      let fullResponse = '';

      if (provider === 'groq') {
        fullResponse = await this.streamGroqResponse(
          context,
          message,
          model || config.defaultModel,
          res
        );
      } else {
        // Fallback providers
        fullResponse = await this.handleFallbackProvider(provider, message, res);
      }

      // Save assistant response
      const { messageId } = await contextManager.addMessage(
        conversationId!,
        Role.assistant,
        fullResponse,
        model || config.defaultModel
      );

      // Send done event
      streamingService.sendDone(res, connectionId, messageId);

      logger.info(`Chat completed: ${conversationId}, ${fullResponse.length} chars`);
    } catch (error) {
      logger.error('Chat streaming error:', error);
      streamingService.sendError(
        res,
        error instanceof Error ? error.message : 'An error occurred'
      );
      streamingService.sendDone(res, connectionId);
    }
  }

  /**
   * Stream response from Groq API
   */
  private async streamGroqResponse(
    context: { conversationId: string; systemPrompt?: string; messages: Array<{ role: Role; content: string; tokens: number }> },
    newMessage: string,
    model: string,
    res: Response
  ): Promise<string> {
    const groqResult = await aiRouter.getGroqClient();

    if (!groqResult) {
      throw new Error('No Groq API keys available. Please try again later.');
    }

    const { client: groq, keyIndex } = groqResult;

    try {
      // Build messages for API
      const apiMessages = contextManager.buildApiMessages(
        context as Parameters<typeof contextManager.buildApiMessages>[0],
        newMessage
      );

      // Create streaming completion
      const stream = await groq.chat.completions.create({
        model,
        messages: apiMessages,
        stream: true,
        max_tokens: 4096,
        temperature: 0.7,
      });

      // Stream the response manually
      let fullResponse = '';

      for await (const chunk of stream) {
        const content = chunk.choices[0]?.delta?.content;
        if (content) {
          fullResponse += content;
          streamingService.sendContent(res, content);
        }
      }

      return fullResponse;
    } catch (error: unknown) {
      // Handle rate limiting
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      
      if (errorMessage.includes('rate_limit') || errorMessage.includes('429')) {
        aiRouter.markKeyRateLimited(keyIndex, errorMessage);
        
        // Try with another key
        logger.warn(`Groq key #${keyIndex + 1} rate limited, trying another...`);
        return this.streamGroqResponse(context, newMessage, model, res);
      }

      aiRouter.markKeyError(keyIndex, errorMessage);
      throw error;
    }
  }

  /**
   * Handle fallback providers (Together AI, DeepSeek, Puter)
   */
  private async handleFallbackProvider(
    provider: AIProvider,
    message: string,
    res: Response
  ): Promise<string> {
    // TODO: Implement Together AI and DeepSeek integrations
    const fallbackMessage = `I'm currently using ${provider} as a fallback provider. Full integration coming soon!\n\nYour message: "${message}"`;
    
    // Simulate streaming for fallback
    const words = fallbackMessage.split(' ');
    for (const word of words) {
      streamingService.sendContent(res, word + ' ');
      await new Promise((resolve) => setTimeout(resolve, 50));
    }

    return fallbackMessage;
  }

  /**
   * Regenerate the last assistant response
   */
  public async regenerateResponse(
    userId: string,
    conversationId: string,
    res: Response
  ): Promise<void> {
    const connectionId = uuidv4();
    streamingService.initializeSSE(res, connectionId);

    try {
      // Get conversation
      const conversation = await prisma.conversation.findFirst({
        where: { id: conversationId, userId },
        include: {
          messages: {
            orderBy: { createdAt: 'desc' },
            take: 2,
          },
        },
      });

      if (!conversation) {
        throw new Error('Conversation not found');
      }

      // Find last user message
      const lastUserMessage = conversation.messages.find((m) => m.role === Role.user);
      if (!lastUserMessage) {
        throw new Error('No user message to regenerate from');
      }

      // Delete last assistant message if exists
      const lastAssistantMessage = conversation.messages.find(
        (m) => m.role === Role.assistant
      );
      if (lastAssistantMessage) {
        await prisma.message.delete({
          where: { id: lastAssistantMessage.id },
        });

        // Update token count
        await prisma.conversation.update({
          where: { id: conversationId },
          data: {
            totalTokens: { decrement: lastAssistantMessage.tokens },
          },
        });
      }

      // Clear cache
      await contextManager.clearCache(conversationId);

      // Stream new response
      const context = await contextManager.getContext(conversationId);
      if (!context) {
        throw new Error('Could not load conversation context');
      }

      streamingService.sendStart(res, conversationId);

      const provider = aiRouter.getCurrentProvider();
      let fullResponse = '';

      if (provider === 'groq') {
        fullResponse = await this.streamGroqResponse(
          context,
          lastUserMessage.content,
          conversation.model,
          res
        );
      } else {
        fullResponse = await this.handleFallbackProvider(
          provider,
          lastUserMessage.content,
          res
        );
      }

      // Save new response
      const { messageId } = await contextManager.addMessage(
        conversationId,
        Role.assistant,
        fullResponse,
        conversation.model
      );

      streamingService.sendDone(res, connectionId, messageId);
    } catch (error) {
      logger.error('Regenerate error:', error);
      streamingService.sendError(
        res,
        error instanceof Error ? error.message : 'Regeneration failed'
      );
      streamingService.sendDone(res, connectionId);
    }
  }

  /**
   * Generate conversation title from first message
   */
  private generateTitle(message: string): string {
    const maxLength = 50;
    const cleaned = message.replace(/\n/g, ' ').trim();
    return cleaned.length > maxLength
      ? cleaned.substring(0, maxLength) + '...'
      : cleaned || 'New Conversation';
  }
}

// Export singleton instance
export const chatService = new ChatService();
export default chatService;
