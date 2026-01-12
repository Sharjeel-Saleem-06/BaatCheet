/**
 * Chat Tags Service
 * Detects and handles special tags in chat messages
 * 
 * Supported Tags:
 * - @browse / @search - Web search for real-time info
 * - @image / @generate - Generate an image
 * - @analyze - Analyze uploaded file/image
 * - @code - Code-focused response
 * - @explain - Detailed explanation
 * - @summarize - Summarize content
 * - @translate - Translate text
 * - @math - Math/calculation focused
 * 
 * @module ChatTagsService
 */

import { logger } from '../utils/logger.js';
import { webSearch } from './WebSearchService.js';
import { imageGeneration, ImageGenerationResult } from './ImageGenerationService.js';

// ============================================
// Types
// ============================================

export type ChatTagType = 
  | 'browse' 
  | 'image' 
  | 'analyze' 
  | 'code' 
  | 'explain' 
  | 'summarize' 
  | 'translate' 
  | 'math'
  | 'none';

export interface DetectedTag {
  type: ChatTagType;
  originalTag: string;
  parameters?: Record<string, string>;
  cleanedMessage: string;
}

export interface TagProcessingResult {
  tag: DetectedTag;
  additionalContext?: string;
  imageResult?: ImageGenerationResult;
  searchResults?: any;
  systemPromptAddition?: string;
  shouldContinueChat: boolean;
}

// ============================================
// Tag Definitions
// ============================================

const TAG_DEFINITIONS: Record<ChatTagType, {
  patterns: RegExp[];
  description: string;
  requiresProcessing: boolean;
  systemPromptAddition?: string;
}> = {
  browse: {
    patterns: [
      /@browse\b/i,
      /@search\b/i,
      /@web\b/i,
      /@lookup\b/i,
      /\bsearch (for|the web|online)\b/i,
      /\blook up\b/i,
      /\bfind (information|info|out)\b/i,
    ],
    description: 'Search the web for real-time information',
    requiresProcessing: true,
    systemPromptAddition: 'User requested web search. Use the search results to provide accurate, up-to-date information. Cite sources.',
  },
  image: {
    patterns: [
      /@image\b/i,
      /@generate\b/i,
      /@create\s*image/i,
      /@draw\b/i,
      /@paint\b/i,
      /\bgenerate\s+(an?\s+)?image\b/i,
      /\bcreate\s+(an?\s+)?image\b/i,
      /\bdraw\s+(me\s+)?(an?\s+)?/i,
      /\bgenerate\s+(an?\s+)?picture\b/i,
    ],
    description: 'Generate an image from description',
    requiresProcessing: true,
  },
  analyze: {
    patterns: [
      /@analyze\b/i,
      /@examine\b/i,
      /@inspect\b/i,
      /\banalyze\s+(this|the)\b/i,
    ],
    description: 'Analyze uploaded content in detail',
    requiresProcessing: false,
    systemPromptAddition: 'User requested detailed analysis. Provide thorough, structured analysis of the content.',
  },
  code: {
    patterns: [
      /@code\b/i,
      /@coding\b/i,
      /@program\b/i,
      /@developer\b/i,
    ],
    description: 'Code-focused response with examples',
    requiresProcessing: false,
    systemPromptAddition: 'User requested code-focused response. Provide clean, well-commented code examples. Use appropriate language syntax highlighting.',
  },
  explain: {
    patterns: [
      /@explain\b/i,
      /@detailed\b/i,
      /@elaborate\b/i,
      /\bexplain\s+(in\s+detail|thoroughly)\b/i,
    ],
    description: 'Detailed explanation',
    requiresProcessing: false,
    systemPromptAddition: 'User requested detailed explanation. Be thorough, use examples, and break down complex concepts.',
  },
  summarize: {
    patterns: [
      /@summarize\b/i,
      /@summary\b/i,
      /@tldr\b/i,
      /@brief\b/i,
      /\bsummarize\b/i,
      /\btl;?dr\b/i,
    ],
    description: 'Summarize content briefly',
    requiresProcessing: false,
    systemPromptAddition: 'User requested summary. Be concise and highlight only key points. Use bullet points.',
  },
  translate: {
    patterns: [
      /@translate\b/i,
      /@translation\b/i,
      /\btranslate\s+(to|into)\b/i,
    ],
    description: 'Translate text',
    requiresProcessing: false,
    systemPromptAddition: 'User requested translation. Provide accurate translation while preserving meaning and tone.',
  },
  math: {
    patterns: [
      /@math\b/i,
      /@calculate\b/i,
      /@compute\b/i,
      /@equation\b/i,
      /\bcalculate\b/i,
      /\bsolve\s+(this\s+)?(equation|problem)\b/i,
    ],
    description: 'Math and calculations',
    requiresProcessing: false,
    systemPromptAddition: 'User requested mathematical help. Show step-by-step solutions. Use LaTeX for equations: $inline$ or $$block$$.',
  },
  none: {
    patterns: [],
    description: 'No special tag',
    requiresProcessing: false,
  },
};

// ============================================
// Chat Tags Service Class
// ============================================

class ChatTagsServiceClass {
  /**
   * Detect tags in a message
   */
  public detectTags(message: string): DetectedTag {
    for (const [tagType, definition] of Object.entries(TAG_DEFINITIONS)) {
      if (tagType === 'none') continue;

      for (const pattern of definition.patterns) {
        const match = message.match(pattern);
        if (match) {
          // Remove the tag from the message
          const cleanedMessage = message.replace(pattern, '').trim();
          
          // Extract parameters if any (e.g., @translate:spanish)
          const parameters = this.extractParameters(match[0]);
          
          return {
            type: tagType as ChatTagType,
            originalTag: match[0],
            parameters,
            cleanedMessage,
          };
        }
      }
    }

    return {
      type: 'none',
      originalTag: '',
      cleanedMessage: message,
    };
  }

  /**
   * Extract parameters from tag (e.g., @translate:spanish)
   */
  private extractParameters(tag: string): Record<string, string> | undefined {
    const colonIndex = tag.indexOf(':');
    if (colonIndex === -1) return undefined;

    const paramStr = tag.substring(colonIndex + 1).trim();
    if (!paramStr) return undefined;

    // Simple key=value or just value
    if (paramStr.includes('=')) {
      const params: Record<string, string> = {};
      paramStr.split(',').forEach(pair => {
        const [key, value] = pair.split('=');
        if (key && value) {
          params[key.trim()] = value.trim();
        }
      });
      return params;
    }

    return { value: paramStr };
  }

  /**
   * Process a detected tag
   */
  public async processTag(
    tag: DetectedTag,
    userId: string,
    conversationId?: string
  ): Promise<TagProcessingResult> {
    const definition = TAG_DEFINITIONS[tag.type];

    // For non-processing tags, just return system prompt addition
    if (!definition.requiresProcessing) {
      return {
        tag,
        systemPromptAddition: definition.systemPromptAddition,
        shouldContinueChat: true,
      };
    }

    // Process special tags
    switch (tag.type) {
      case 'browse':
        return await this.processBrowseTag(tag);

      case 'image':
        return await this.processImageTag(tag, userId);

      default:
        return {
          tag,
          shouldContinueChat: true,
        };
    }
  }

  /**
   * Process browse/search tag
   */
  private async processBrowseTag(tag: DetectedTag): Promise<TagProcessingResult> {
    try {
      const searchQuery = tag.cleanedMessage;
      
      if (!searchQuery || searchQuery.length < 3) {
        return {
          tag,
          additionalContext: 'No search query provided.',
          shouldContinueChat: true,
        };
      }

      logger.info('Processing browse tag', { query: searchQuery });

      const searchResults = await webSearch.search(searchQuery, {
        numResults: 5,
        dateFilter: 'month',
      });

      const formattedContext = webSearch.formatForAI(searchResults);

      return {
        tag,
        searchResults,
        additionalContext: formattedContext,
        systemPromptAddition: TAG_DEFINITIONS.browse.systemPromptAddition,
        shouldContinueChat: true,
      };

    } catch (error) {
      logger.error('Browse tag processing failed:', error);
      return {
        tag,
        additionalContext: 'Web search failed. Answering from general knowledge.',
        shouldContinueChat: true,
      };
    }
  }

  /**
   * Process image generation tag
   */
  private async processImageTag(
    tag: DetectedTag,
    userId: string
  ): Promise<TagProcessingResult> {
    try {
      // Check if user can generate
      const limitStatus = await imageGeneration.checkUserLimit(userId);
      
      if (!limitStatus.canGenerate) {
        const nextTime = limitStatus.nextAvailableAt 
          ? new Date(limitStatus.nextAvailableAt).toLocaleString()
          : 'later';
          
        return {
          tag,
          additionalContext: `⚠️ **Image Generation Limit Reached**\n\nYou've used your daily image generation. Next generation available: ${nextTime}\n\nYou can still ask me to describe or explain what the image would look like!`,
          shouldContinueChat: true,
        };
      }

      // Extract image prompt
      const imagePrompt = tag.cleanedMessage;
      
      if (!imagePrompt || imagePrompt.length < 5) {
        return {
          tag,
          additionalContext: 'Please provide a description of the image you want to generate. For example: "@image a sunset over mountains with purple sky"',
          shouldContinueChat: true,
        };
      }

      logger.info('Processing image generation tag', { 
        userId, 
        promptLength: imagePrompt.length 
      });

      // Generate the image
      const imageResult = await imageGeneration.generateImage(userId, {
        prompt: imagePrompt,
        width: 512,
        height: 512,
      });

      if (imageResult.success) {
        return {
          tag,
          imageResult,
          additionalContext: `✅ **Image Generated Successfully!**\n\n**Prompt:** ${imagePrompt}\n**Model:** ${imageResult.model}\n**Time:** ${(imageResult.generationTime / 1000).toFixed(1)}s\n\nRemaining generations today: ${limitStatus.remainingGenerations - 1}`,
          shouldContinueChat: false, // Don't need AI response for successful image
        };
      } else {
        return {
          tag,
          imageResult,
          additionalContext: `❌ **Image Generation Failed**\n\n${imageResult.error}\n\nTip: Try simplifying your prompt or try again in a moment.`,
          shouldContinueChat: true,
        };
      }

    } catch (error) {
      logger.error('Image tag processing failed:', error);
      return {
        tag,
        additionalContext: 'Image generation encountered an error. Please try again.',
        shouldContinueChat: true,
      };
    }
  }

  /**
   * Get all available tags
   */
  public getAvailableTags(): Array<{
    tag: string;
    aliases: string[];
    description: string;
    example: string;
  }> {
    return [
      {
        tag: '@browse',
        aliases: ['@search', '@web', '@lookup'],
        description: 'Search the web for real-time information',
        example: '@browse latest news about AI',
      },
      {
        tag: '@image',
        aliases: ['@generate', '@draw', '@create image'],
        description: 'Generate an image (1 per day for free users)',
        example: '@image a cat wearing a space helmet',
      },
      {
        tag: '@code',
        aliases: ['@coding', '@program'],
        description: 'Get code-focused responses with examples',
        example: '@code how to sort an array in Python',
      },
      {
        tag: '@explain',
        aliases: ['@detailed', '@elaborate'],
        description: 'Get detailed explanations',
        example: '@explain how neural networks work',
      },
      {
        tag: '@summarize',
        aliases: ['@summary', '@tldr', '@brief'],
        description: 'Get concise summaries',
        example: '@summarize this article',
      },
      {
        tag: '@translate',
        aliases: ['@translation'],
        description: 'Translate text to another language',
        example: '@translate Hello world to Spanish',
      },
      {
        tag: '@math',
        aliases: ['@calculate', '@equation'],
        description: 'Math help with step-by-step solutions',
        example: '@math solve x^2 + 5x + 6 = 0',
      },
      {
        tag: '@analyze',
        aliases: ['@examine', '@inspect'],
        description: 'Detailed analysis of content',
        example: '@analyze this code for bugs',
      },
    ];
  }

  /**
   * Check if message contains any tag
   */
  public hasTag(message: string): boolean {
    return this.detectTags(message).type !== 'none';
  }

  /**
   * Get tag help message
   */
  public getHelpMessage(): string {
    const tags = this.getAvailableTags();
    
    let help = '## 🏷️ Available Chat Tags\n\n';
    help += 'Use these tags to unlock special features:\n\n';
    
    for (const tag of tags) {
      help += `### ${tag.tag}\n`;
      help += `${tag.description}\n`;
      help += `*Aliases:* ${tag.aliases.join(', ')}\n`;
      help += `*Example:* \`${tag.example}\`\n\n`;
    }
    
    help += '---\n';
    help += '*Tip: You can also just describe what you want naturally, and I\'ll try to understand!*';
    
    return help;
  }
}

// Export singleton instance
export const chatTags = new ChatTagsServiceClass();
export default chatTags;
