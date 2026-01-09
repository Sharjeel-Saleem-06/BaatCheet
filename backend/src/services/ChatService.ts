import { v4 as uuidv4 } from 'uuid';
import { aiRouter } from './AIRouter.js';
import { config } from '../config/index.js';
import { logger } from '../utils/logger.js';
import { Conversation } from '../models/Conversation.js';
import { IMessage, IChatRequest, IStreamChunk, AIProvider } from '../types/index.js';
import { Response } from 'express';

// ============================================
// Chat Service
// Handles AI chat completions with streaming
// ============================================

class ChatService {
  // Send a chat message and stream the response
  async streamChat(
    userId: string,
    request: IChatRequest,
    res: Response
  ): Promise<void> {
    const { message, conversationId, model, systemPrompt } = request;
    
    // Get or create conversation
    let conversation = conversationId
      ? await Conversation.findOne({ conversationId, userId })
      : null;

    const isNewConversation = !conversation;
    const convId = conversationId || uuidv4();

    if (!conversation) {
      conversation = new Conversation({
        conversationId: convId,
        userId,
        title: this.generateTitle(message),
        model: model || config.defaultModel,
        systemPrompt,
        messages: [],
      });
    }

    // Add user message
    const userMessage: IMessage = {
      messageId: uuidv4(),
      role: 'user',
      content: message,
      timestamp: new Date(),
      tokens: this.estimateTokens(message),
    };
    conversation.messages.push(userMessage);

    // Setup SSE headers
    res.setHeader('Content-Type', 'text/event-stream');
    res.setHeader('Cache-Control', 'no-cache');
    res.setHeader('Connection', 'keep-alive');
    res.setHeader('X-Accel-Buffering', 'no');

    // Send conversation ID immediately
    this.sendSSE(res, {
      type: 'content',
      content: '',
      messageId: convId,
    });

    try {
      // Get AI provider and stream response
      const provider = aiRouter.getCurrentProvider();
      let fullResponse = '';

      if (provider === 'groq') {
        fullResponse = await this.streamGroqResponse(
          conversation.messages,
          systemPrompt || conversation.systemPrompt,
          model || conversation.model,
          res
        );
      } else {
        // Fallback providers (implement as needed)
        fullResponse = await this.handleFallbackProvider(provider, message, res);
      }

      // Add assistant message
      const assistantMessage: IMessage = {
        messageId: uuidv4(),
        role: 'assistant',
        content: fullResponse,
        model: model || conversation.model,
        timestamp: new Date(),
        tokens: this.estimateTokens(fullResponse),
      };
      conversation.messages.push(assistantMessage);

      // Update total tokens
      conversation.totalTokens += userMessage.tokens! + assistantMessage.tokens!;

      // Prune old messages if needed
      this.pruneMessages(conversation);

      // Save conversation
      await conversation.save();

      // Send done signal
      this.sendSSE(res, { type: 'done', messageId: convId });
      res.end();

    } catch (error) {
      logger.error('Chat streaming error:', error);
      this.sendSSE(res, {
        type: 'error',
        error: error instanceof Error ? error.message : 'Unknown error occurred',
      });
      res.end();
    }
  }

  // Stream response from Groq
  private async streamGroqResponse(
    messages: IMessage[],
    systemPrompt: string | undefined | null,
    model: string,
    res: Response
  ): Promise<string> {
    const groq = aiRouter.getGroqClient();
    
    if (!groq) {
      throw new Error('No Groq API keys available');
    }

    // Build messages array for API
    const apiMessages: Array<{ role: 'system' | 'user' | 'assistant'; content: string }> = [];
    
    if (systemPrompt) {
      apiMessages.push({ role: 'system', content: systemPrompt });
    }

    // Add conversation messages (limit to last N messages based on tokens)
    const recentMessages = this.getRecentMessages(messages);
    recentMessages.forEach((msg) => {
      apiMessages.push({
        role: msg.role as 'user' | 'assistant',
        content: msg.content,
      });
    });

    // Stream from Groq
    const stream = await groq.chat.completions.create({
      model,
      messages: apiMessages,
      stream: true,
      max_tokens: 4096,
    });

    let fullResponse = '';

    for await (const chunk of stream) {
      const content = chunk.choices[0]?.delta?.content || '';
      if (content) {
        fullResponse += content;
        this.sendSSE(res, { type: 'content', content });
      }
    }

    return fullResponse;
  }

  // Handle fallback providers
  private async handleFallbackProvider(
    provider: AIProvider,
    message: string,
    res: Response
  ): Promise<string> {
    // For now, return a message indicating fallback
    // TODO: Implement Together AI and DeepSeek integrations
    const fallbackMessage = `[Using ${provider} provider - Integration pending]\n\nYour message: ${message}`;
    this.sendSSE(res, { type: 'content', content: fallbackMessage });
    return fallbackMessage;
  }

  // Send SSE event
  private sendSSE(res: Response, data: IStreamChunk): void {
    res.write(`data: ${JSON.stringify(data)}\n\n`);
  }

  // Get recent messages within token limit
  private getRecentMessages(messages: IMessage[]): IMessage[] {
    const maxMessages = config.maxContextMessages;
    const maxTokens = config.maxTokens;

    // Start from most recent
    const reversed = [...messages].reverse();
    const selected: IMessage[] = [];
    let totalTokens = 0;

    for (const msg of reversed) {
      const msgTokens = msg.tokens || this.estimateTokens(msg.content);
      if (totalTokens + msgTokens > maxTokens || selected.length >= maxMessages) {
        break;
      }
      selected.unshift(msg);
      totalTokens += msgTokens;
    }

    return selected;
  }

  // Prune old messages to stay within limits
  private pruneMessages(conversation: { messages: IMessage[] }): void {
    const maxMessages = config.maxContextMessages;
    
    if (conversation.messages.length > maxMessages) {
      // Keep system messages and most recent messages
      const systemMessages = conversation.messages.filter((m) => m.role === 'system');
      const otherMessages = conversation.messages.filter((m) => m.role !== 'system');
      
      // Keep last N non-system messages
      const recentMessages = otherMessages.slice(-maxMessages);
      conversation.messages = [...systemMessages, ...recentMessages];
    }
  }

  // Simple token estimation (roughly 4 chars per token)
  private estimateTokens(text: string): number {
    return Math.ceil(text.length / 4);
  }

  // Generate conversation title from first message
  private generateTitle(message: string): string {
    const maxLength = 50;
    const cleaned = message.replace(/\n/g, ' ').trim();
    return cleaned.length > maxLength
      ? cleaned.substring(0, maxLength) + '...'
      : cleaned;
  }

  // Regenerate last assistant response
  async regenerateResponse(
    userId: string,
    conversationId: string,
    res: Response
  ): Promise<void> {
    const conversation = await Conversation.findOne({ conversationId, userId });
    
    if (!conversation) {
      throw new Error('Conversation not found');
    }

    // Remove last assistant message
    const lastIndex = conversation.messages.length - 1;
    if (conversation.messages[lastIndex]?.role === 'assistant') {
      conversation.messages.pop();
    }

    // Get last user message
    const lastUserMessage = [...conversation.messages]
      .reverse()
      .find((m) => m.role === 'user');

    if (!lastUserMessage) {
      throw new Error('No user message to regenerate from');
    }

    // Stream new response
    await this.streamChat(userId, {
      message: lastUserMessage.content,
      conversationId,
    }, res);
  }
}

export const chatService = new ChatService();
export default chatService;
