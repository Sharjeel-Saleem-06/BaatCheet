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
import { webSearch } from './WebSearchService.js';
import { chatTags, TagProcessingResult } from './ChatTagsService.js';
import { modeDetector, AIMode } from './ModeDetectorService.js';
import { imageGeneration } from './ImageGenerationService.js';
import { getModeSystemPrompt } from '../config/modePrompts.js';
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
  explicitMode?: string; // Explicit mode selection from frontend (e.g., "image-generation", "code", "web-search")
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
    mode?: string;
    modeConfidence?: number;
  };
  imageResult?: {
    success: boolean;
    imageUrl?: string;
    imageBase64?: string;
    model?: string;
    originalPrompt?: string;
    enhancedPrompt?: string;
    seed?: number;
    generationTime?: number;
    style?: string;
    error?: string;
  };
  tagDetected?: string;
  modeDetected?: string;
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
      // Step 0: Detect AI mode - use explicit mode if provided, otherwise detect
      const attachments = options.imageIds?.map(id => ({ type: 'image' as const, id }));
      const explicitModeValue = options.explicitMode as AIMode | undefined;
      const modeResult = modeDetector.detectMode(userMessage, attachments, explicitModeValue);
      
      logger.info('Mode detected', {
        mode: modeResult.mode,
        confidence: modeResult.confidence,
        keywords: modeResult.detectedKeywords,
        explicitMode: options.explicitMode,
        userId: options.userId,
      });

      // Step 0.5: Handle IMAGE_GEN mode specially
      const isImageGenMode = modeResult.mode === AIMode.IMAGE_GEN && 
        (options.explicitMode === AIMode.IMAGE_GEN || modeResult.confidence > 0.5);
      
      if (isImageGenMode) {
        try {
          // Check user limit first for better UX
          const limitStatus = await imageGeneration.checkUserLimit(options.userId);
          
          if (!limitStatus.canGenerate) {
            // Return friendly limit reached message
            const nextAvailable = limitStatus.nextAvailableAt 
              ? new Date(limitStatus.nextAvailableAt).toLocaleString('en-US', { 
                  hour: 'numeric', 
                  minute: 'numeric', 
                  hour12: true,
                  month: 'short',
                  day: 'numeric'
                })
              : 'tomorrow';
            
            return {
              success: true,
              message: {
                role: 'assistant',
                content: `⏳ **Image Generation Limit Reached**\n\nYou've used your daily image generation quota (${limitStatus.dailyLimit} image${limitStatus.dailyLimit > 1 ? 's' : ''}/day for ${limitStatus.tier} tier).\n\n🕐 **Next Available:** ${nextAvailable}\n\n💡 **Tip:** Upgrade to Pro for 50 images/day, or check back later!\n\n---\n*Meanwhile, I can help you craft the perfect prompt for when your limit resets. What image would you like to create?*`,
              },
              conversationId: options.conversationId,
              modeDetected: AIMode.IMAGE_GEN,
            };
          }
          
          // Extract image prompt from message
          const imagePrompt = this.extractImagePrompt(userMessage);
          
          // Generate the image
          const imageResult = await imageGeneration.generateImage(options.userId, {
            prompt: imagePrompt,
            enhancePrompt: true,
          });

          if (imageResult.success) {
            return {
              success: true,
              message: {
                role: 'assistant',
                content: `✅ **Image Generated Successfully!**\n\n**Your Prompt:** ${imageResult.originalPrompt}\n\n**Enhanced Prompt:** ${imageResult.enhancedPrompt}\n\n**Model:** ${imageResult.model}\n**Generation Time:** ${(imageResult.generationTime / 1000).toFixed(1)}s\n**Seed:** ${imageResult.seed}\n\n🎨 *Remaining today: ${limitStatus.remainingGenerations - 1}*`,
              },
              conversationId: options.conversationId,
              imageResult: {
                success: true,
                imageUrl: imageResult.imageUrl,
                imageBase64: imageResult.imageBase64,
                model: imageResult.model,
                originalPrompt: imageResult.originalPrompt,
                enhancedPrompt: imageResult.enhancedPrompt,
                seed: imageResult.seed,
                generationTime: imageResult.generationTime,
                style: imageResult.style,
              },
              modeDetected: AIMode.IMAGE_GEN,
            };
          } else {
            // Image generation failed - return error message
            return {
              success: true,
              message: {
                role: 'assistant',
                content: `❌ **Image Generation Failed**\n\n${imageResult.error}\n\n💡 *Try rephrasing your prompt or try again in a few moments.*`,
              },
              conversationId: options.conversationId,
              modeDetected: AIMode.IMAGE_GEN,
            };
          }
        } catch (error: any) {
          logger.error('Image generation error:', error);
          return {
            success: true,
            message: {
              role: 'assistant',
              content: `❌ **Image Generation Error**\n\nSomething went wrong while generating your image. Please try again.\n\n*Error: ${error.message || 'Unknown error'}*`,
            },
            conversationId: options.conversationId,
            modeDetected: AIMode.IMAGE_GEN,
          };
        }
      }
      
      // Step 0.6: Handle WEB_SEARCH mode with explicit selection
      const isWebSearchMode = modeResult.mode === AIMode.WEB_SEARCH && 
        (options.explicitMode === AIMode.WEB_SEARCH || modeResult.confidence > 0.5);
      
      // Step 0.7: Handle CODE mode - use DeepSeek Coder for better results
      const isCodeMode = modeResult.mode === AIMode.CODE && 
        (options.explicitMode === AIMode.CODE || modeResult.confidence > 0.5);
      
      // Step 0.8: Handle RESEARCH mode - deep research with multiple sources
      const isResearchMode = modeResult.mode === AIMode.RESEARCH && 
        (options.explicitMode === AIMode.RESEARCH || modeResult.confidence > 0.5);

      // Step 1: Detect and process any chat tags (legacy support)
      const detectedTag = chatTags.detectTags(userMessage);
      let tagResult: TagProcessingResult | null = null;
      let messageForProcessing = userMessage;
      
      if (detectedTag.type !== 'none') {
        logger.info('Chat tag detected', { 
          tag: detectedTag.type, 
          userId: options.userId 
        });
        
        tagResult = await chatTags.processTag(
          detectedTag, 
          options.userId, 
          options.conversationId
        );
        
        // Use cleaned message (without tag) for further processing
        messageForProcessing = detectedTag.cleanedMessage;
        
        // If tag processing returned an image, return early with image result
        if (tagResult.imageResult?.success && !tagResult.shouldContinueChat) {
          return {
            success: true,
            message: {
              role: 'assistant',
              content: tagResult.additionalContext || 'Image generated successfully!',
            },
            conversationId: options.conversationId,
            imageResult: tagResult.imageResult,
            modeDetected: modeResult.mode,
          };
        }
      }

      // Step 2: Analyze the user prompt for intent and formatting needs
      const promptAnalysis = await promptAnalyzer.analyze(messageForProcessing);
      
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

      // Step 3: Check if query needs web search (or if browse tag was used, or explicit mode)
      let webSearchContext = '';
      const shouldSearch = isWebSearchMode || isResearchMode || tagResult?.tag.type === 'browse' || webSearch.needsWebSearch(messageForProcessing);
      
      if (shouldSearch) {
        // Use tag search results if available, otherwise perform new search
        if (tagResult?.searchResults) {
          webSearchContext = tagResult.additionalContext || '';
        } else {
          const numResults = isResearchMode ? 10 : 5; // More results for research mode
          logger.info('Web search triggered', { query: messageForProcessing.substring(0, 100), mode: modeResult.mode, numResults });
          try {
            const searchResults = await webSearch.search(messageForProcessing, {
              numResults,
              dateFilter: isResearchMode ? 'year' : 'month', // Longer timeframe for research
            });
            webSearchContext = webSearch.formatForAI(searchResults);
            
            // Add research mode instructions if applicable
            if (isResearchMode) {
              webSearchContext += '\n\n**RESEARCH MODE ACTIVE:** Provide a comprehensive analysis with citations. Synthesize information from multiple sources. Highlight conflicting viewpoints if any exist.';
            }
          } catch (err) {
            logger.error('Web search failed:', err);
          }
        }
      }
      
      // Add tag-specific context
      let tagContext = '';
      if (tagResult?.additionalContext && tagResult.tag.type !== 'browse') {
        tagContext = tagResult.additionalContext;
      }
      
      // Add tag-specific system prompt addition
      let tagSystemPrompt = '';
      if (tagResult?.systemPromptAddition) {
        tagSystemPrompt = '\n\n' + tagResult.systemPromptAddition;
      }

      // Step 4: Build enhanced system prompt with user profile context and mode
      const userContext = await profileLearning.getUserContext(options.userId, conversationId);
      
      // Get mode-specific system prompt
      const modeSystemPrompt = getModeSystemPrompt(modeResult.mode);
      
      // Use mode temperature and max tokens
      const modeConfig = modeDetector.getModeConfig(modeResult.mode);
      const effectiveTemperature = options.temperature ?? modeConfig.temperature;
      const effectiveMaxTokens = options.maxTokens ?? modeConfig.maxTokens;
      
      const baseSystemPrompt = options.systemPrompt || conversation.systemPrompt || this.getAdvancedSystemPrompt(promptAnalysis);
      
      // Add formatting hints based on prompt analysis
      const formattingHints = promptAnalyzer.generateFormattingHints(promptAnalysis);
      
      // Combine: base prompt + mode prompt + tag context + profile context + recent conversations + web search + formatting hints
      const enhancedSystemPrompt = baseSystemPrompt + 
        '\n\n' + modeSystemPrompt +
        tagSystemPrompt +
        userContext.profile + 
        userContext.recentConversations + 
        webSearchContext +
        tagContext +
        formattingHints;
      
      logger.info('Context injected', {
        userId: options.userId,
        factCount: userContext.factCount,
        hasProfile: userContext.profile.length > 0,
        hasRecentContext: userContext.recentConversations.length > 0,
        hasTag: detectedTag.type !== 'none',
        tagType: detectedTag.type,
        mode: modeResult.mode,
        modeConfidence: modeResult.confidence,
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

      // Step 3: Get AI response with mode-optimized parameters
      // Select appropriate model based on mode for best results
      let selectedModel = options.model || conversation.model;
      
      // Advanced mode-to-model routing for optimal performance
      if (!options.model) {
        switch (modeResult.mode) {
          case AIMode.CODE:
          case AIMode.DEBUG:
            // DeepSeek Coder is the best for code-related tasks
            selectedModel = 'deepseek-coder';
            logger.info('Using DeepSeek Coder for code/debug mode');
            break;
            
          case AIMode.RESEARCH:
          case AIMode.DATA_ANALYSIS:
          case AIMode.BUSINESS:
            // Gemini 2.5 Flash has large context for research and analysis
            selectedModel = 'gemini-2.5-flash';
            logger.info('Using Gemini 2.5 Flash for research/analysis mode');
            break;
            
          case AIMode.VISION:
            // Gemini is best for vision/image analysis
            selectedModel = 'gemini-2.5-flash';
            logger.info('Using Gemini 2.5 Flash for vision mode');
            break;
            
          case AIMode.MATH:
          case AIMode.TUTOR:
          case AIMode.EXPLAIN:
            // These benefit from strong reasoning - use Llama 70B
            selectedModel = 'llama-3.3-70b-versatile';
            logger.info('Using Llama 3.3 70B for reasoning-intensive mode');
            break;
            
          case AIMode.CREATIVE:
          case AIMode.TRANSLATE:
            // Creative tasks need high-quality generation
            selectedModel = 'llama-3.3-70b-versatile';
            logger.info('Using Llama 3.3 70B for creative/translation mode');
            break;
            
          case AIMode.WEB_SEARCH:
          case AIMode.SUMMARIZE:
          case AIMode.CHAT:
          default:
            // Default to fast, high-quality Groq models
            selectedModel = 'llama-3.3-70b-versatile';
            break;
        }
      }
      
      const request: ChatRequest = {
        messages,
        model: selectedModel,
        maxTokens: effectiveMaxTokens || promptAnalysis.suggestedMaxTokens,
        temperature: effectiveTemperature ?? promptAnalysis.suggestedTemperature,
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

      // Step 3: Check if query needs web search
      let webSearchContext = '';
      if (webSearch.needsWebSearch(userMessage)) {
        logger.info('Stream: Web search triggered', { query: userMessage.substring(0, 100) });
        try {
          const searchResults = await webSearch.search(userMessage, {
            numResults: 5,
            dateFilter: 'month',
          });
          webSearchContext = webSearch.formatForAI(searchResults);
        } catch (err) {
          logger.error('Stream: Web search failed:', err);
        }
      }

      // Step 4: Build enhanced system prompt with user profile context
      const userContext = await profileLearning.getUserContext(options.userId, conversationId);
      
      const baseSystemPrompt = options.systemPrompt || conversation.systemPrompt || this.getAdvancedSystemPrompt(promptAnalysis);
      const formattingHints = promptAnalyzer.generateFormattingHints(promptAnalysis);
      
      // Combine: base prompt + profile context + recent conversations + web search + formatting hints
      const enhancedSystemPrompt = baseSystemPrompt + 
        userContext.profile + 
        userContext.recentConversations + 
        webSearchContext +
        formattingHints;

      logger.info('Stream: Context injected', {
        userId: options.userId,
        factCount: userContext.factCount,
        hasProfile: userContext.profile.length > 0,
        hasWebSearch: webSearchContext.length > 0,
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
   * Extract image generation prompt from user message
   */
  private extractImagePrompt(message: string): string {
    // Remove common image generation keywords
    const removePatterns = [
      /^(generate|create|make|draw|paint|visualize|design|illustrate|render)\s+(an?\s+)?(image|picture|illustration|artwork|photo)(\s+of)?/i,
      /^(show me|i want to see|can you show|can you draw)\s+(an?\s+)?/i,
      /(image|picture|illustration|artwork)\s+of\s+/i,
    ];

    let prompt = message;
    
    for (const pattern of removePatterns) {
      prompt = prompt.replace(pattern, '');
    }

    // Clean up
    prompt = prompt
      .replace(/^\s*[,.:;]\s*/, '') // Remove leading punctuation
      .replace(/\s+/g, ' ')
      .trim();

    // If prompt is too short after cleaning, use original
    if (prompt.length < 5) {
      prompt = message;
    }

    return prompt;
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
