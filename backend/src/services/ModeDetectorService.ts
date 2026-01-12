/**
 * Advanced Mode Detector Service
 * Intelligently detects user intent and routes to appropriate AI mode
 * 
 * Modes:
 * - CHAT: Default conversation
 * - IMAGE_GEN: Create images from text
 * - VISION: Analyze uploaded images
 * - WEB_SEARCH: Search web for current info
 * - CODE: Programming assistance
 * - DATA_ANALYSIS: Analyze data, create charts
 * - MATH: Mathematical problem solving
 * - CREATIVE: Stories, poems, scripts
 * - TRANSLATE: Language translation
 * - SUMMARIZE: Summarize content
 * - EXPLAIN: Educational explanations
 * - RESEARCH: Deep research with sources
 * - DEBUG: Code debugging
 * - TUTOR: Teaching mode
 * 
 * @module ModeDetectorService
 */

import { logger } from '../utils/logger.js';

// ============================================
// Types
// ============================================

export enum AIMode {
  // Core modes
  CHAT = 'chat',
  IMAGE_GEN = 'image-generation',
  VISION = 'vision',
  WEB_SEARCH = 'web-search',
  
  // Specialized modes
  CODE = 'code',
  DATA_ANALYSIS = 'data-analysis',
  MATH = 'math',
  CREATIVE = 'creative',
  TRANSLATE = 'translate',
  SUMMARIZE = 'summarize',
  EXPLAIN = 'explain',
  
  // Advanced modes
  RESEARCH = 'research',
  DEBUG = 'debug',
  TUTOR = 'tutor',
  BUSINESS = 'business',
}

export interface ModeConfig {
  mode: AIMode;
  displayName: string;
  icon: string;
  description: string;
  capabilities: string[];
  requiresSpecialAPI: boolean;
  dailyLimits: {
    free: number;
    pro: number;
    enterprise: number;
  };
  temperature: number;
  maxTokens: number;
}

export interface DetectedModeResult {
  mode: AIMode;
  confidence: number; // 0-1
  detectedKeywords: string[];
  suggestedModes?: AIMode[]; // Alternative modes
}

export interface Attachment {
  type: 'image' | 'csv' | 'pdf' | 'document' | 'audio';
  id?: string;
  mimeType?: string;
}

// ============================================
// Mode Configurations
// ============================================

export const MODE_CONFIGS: Record<AIMode, ModeConfig> = {
  [AIMode.CHAT]: {
    mode: AIMode.CHAT,
    displayName: 'Chat',
    icon: '💬',
    description: 'General conversation',
    capabilities: ['conversation', 'questions', 'advice'],
    requiresSpecialAPI: false,
    dailyLimits: { free: 1000, pro: 10000, enterprise: 100000 },
    temperature: 0.7,
    maxTokens: 4000,
  },
  [AIMode.IMAGE_GEN]: {
    mode: AIMode.IMAGE_GEN,
    displayName: 'Create Image',
    icon: '🎨',
    description: 'Generate images from text',
    capabilities: ['image-generation', 'art', 'design'],
    requiresSpecialAPI: true,
    dailyLimits: { free: 1, pro: 50, enterprise: 500 },
    temperature: 0.8,
    maxTokens: 500,
  },
  [AIMode.VISION]: {
    mode: AIMode.VISION,
    displayName: 'Analyze Image',
    icon: '👁️',
    description: 'Analyze and describe images',
    capabilities: ['image-analysis', 'ocr', 'description'],
    requiresSpecialAPI: true,
    dailyLimits: { free: 10, pro: 200, enterprise: 2000 },
    temperature: 0.3,
    maxTokens: 2000,
  },
  [AIMode.WEB_SEARCH]: {
    mode: AIMode.WEB_SEARCH,
    displayName: 'Browse',
    icon: '🌐',
    description: 'Search the web for current info',
    capabilities: ['web-search', 'current-events', 'real-time'],
    requiresSpecialAPI: true,
    dailyLimits: { free: 10, pro: 200, enterprise: 2000 },
    temperature: 0.4,
    maxTokens: 4000,
  },
  [AIMode.CODE]: {
    mode: AIMode.CODE,
    displayName: 'Code',
    icon: '💻',
    description: 'Programming assistance',
    capabilities: ['coding', 'debugging', 'algorithms'],
    requiresSpecialAPI: false,
    dailyLimits: { free: 100, pro: 1000, enterprise: 10000 },
    temperature: 0.2,
    maxTokens: 8000,
  },
  [AIMode.DATA_ANALYSIS]: {
    mode: AIMode.DATA_ANALYSIS,
    displayName: 'Analyze Data',
    icon: '📊',
    description: 'Data analysis & charts',
    capabilities: ['data-analysis', 'charts', 'statistics'],
    requiresSpecialAPI: false,
    dailyLimits: { free: 20, pro: 200, enterprise: 2000 },
    temperature: 0.3,
    maxTokens: 6000,
  },
  [AIMode.MATH]: {
    mode: AIMode.MATH,
    displayName: 'Math',
    icon: '🔢',
    description: 'Mathematical problem solving',
    capabilities: ['calculations', 'equations', 'proofs'],
    requiresSpecialAPI: false,
    dailyLimits: { free: 50, pro: 500, enterprise: 5000 },
    temperature: 0.1,
    maxTokens: 4000,
  },
  [AIMode.CREATIVE]: {
    mode: AIMode.CREATIVE,
    displayName: 'Write',
    icon: '✍️',
    description: 'Creative writing',
    capabilities: ['stories', 'poems', 'scripts'],
    requiresSpecialAPI: false,
    dailyLimits: { free: 50, pro: 500, enterprise: 5000 },
    temperature: 0.9,
    maxTokens: 8000,
  },
  [AIMode.TRANSLATE]: {
    mode: AIMode.TRANSLATE,
    displayName: 'Translate',
    icon: '🌍',
    description: 'Language translation',
    capabilities: ['translation', 'languages'],
    requiresSpecialAPI: false,
    dailyLimits: { free: 50, pro: 500, enterprise: 5000 },
    temperature: 0.3,
    maxTokens: 4000,
  },
  [AIMode.SUMMARIZE]: {
    mode: AIMode.SUMMARIZE,
    displayName: 'Summarize',
    icon: '📝',
    description: 'Summarize long content',
    capabilities: ['summarization', 'key-points'],
    requiresSpecialAPI: false,
    dailyLimits: { free: 50, pro: 500, enterprise: 5000 },
    temperature: 0.3,
    maxTokens: 2000,
  },
  [AIMode.EXPLAIN]: {
    mode: AIMode.EXPLAIN,
    displayName: 'Explain',
    icon: '📚',
    description: 'Educational explanations',
    capabilities: ['explanations', 'teaching', 'concepts'],
    requiresSpecialAPI: false,
    dailyLimits: { free: 100, pro: 1000, enterprise: 10000 },
    temperature: 0.5,
    maxTokens: 6000,
  },
  [AIMode.RESEARCH]: {
    mode: AIMode.RESEARCH,
    displayName: 'Research',
    icon: '🔍',
    description: 'Deep research with sources',
    capabilities: ['research', 'citations', 'analysis'],
    requiresSpecialAPI: true,
    dailyLimits: { free: 5, pro: 50, enterprise: 500 },
    temperature: 0.4,
    maxTokens: 8000,
  },
  [AIMode.DEBUG]: {
    mode: AIMode.DEBUG,
    displayName: 'Debug',
    icon: '🐛',
    description: 'Code debugging',
    capabilities: ['debugging', 'error-fixing', 'optimization'],
    requiresSpecialAPI: false,
    dailyLimits: { free: 50, pro: 500, enterprise: 5000 },
    temperature: 0.2,
    maxTokens: 6000,
  },
  [AIMode.TUTOR]: {
    mode: AIMode.TUTOR,
    displayName: 'Tutor',
    icon: '👨‍🏫',
    description: 'Patient teaching mode',
    capabilities: ['teaching', 'step-by-step', 'learning'],
    requiresSpecialAPI: false,
    dailyLimits: { free: 50, pro: 500, enterprise: 5000 },
    temperature: 0.6,
    maxTokens: 6000,
  },
  [AIMode.BUSINESS]: {
    mode: AIMode.BUSINESS,
    displayName: 'Business',
    icon: '💼',
    description: 'Business analysis',
    capabilities: ['business', 'strategy', 'analysis'],
    requiresSpecialAPI: false,
    dailyLimits: { free: 20, pro: 200, enterprise: 2000 },
    temperature: 0.4,
    maxTokens: 6000,
  },
};

// ============================================
// Keyword Patterns for Detection
// ============================================

const MODE_KEYWORDS: Record<AIMode, string[]> = {
  [AIMode.IMAGE_GEN]: [
    // Direct requests
    'generate image', 'create image', 'make image', 'draw', 'paint',
    'generate picture', 'create picture', 'make picture',
    'visualize', 'design', 'illustrate', 'render',
    // Specific styles
    'photorealistic', 'cartoon', 'anime', 'sketch', 'watercolor',
    'digital art', '3d render', 'pixel art', 'oil painting',
    // Common phrases
    'show me', 'i want to see', 'can you show', 'can you draw',
    'picture of', 'image of', 'illustration of', 'artwork of',
    // Urdu/Hindi
    'tasveer banao', 'photo banao', 'تصویر بناؤ',
  ],
  [AIMode.VISION]: [
    'what is in this', 'what do you see', 'describe this image',
    'what\'s in the', 'analyze this image', 'read this',
    'what does this say', 'transcribe', 'extract text from',
    'identify', 'recognize', 'what\'s this', 'explain this image',
  ],
  [AIMode.WEB_SEARCH]: [
    'today', 'yesterday', 'this week', 'latest', 'recent', 'current',
    'breaking news', 'what happened', 'search for', 'look up',
    'weather', 'stock price', 'score', 'results', 'news about',
    'find information', 'search online', 'google', 'browse',
  ],
  [AIMode.CODE]: [
    'code', 'function', 'program', 'script', 'algorithm',
    'python', 'javascript', 'java', 'c++', 'react', 'node',
    'api', 'database', 'query', 'class', 'method',
    'implement', 'create function', 'write code', 'coding',
    'frontend', 'backend', 'fullstack', 'typescript', 'rust', 'go',
  ],
  [AIMode.DEBUG]: [
    'debug', 'error', 'bug', 'fix', 'not working',
    'exception', 'crash', 'issue', 'problem with code',
    'why doesn\'t', 'what\'s wrong', 'troubleshoot',
    'undefined', 'null', 'syntax error', 'runtime error',
  ],
  [AIMode.DATA_ANALYSIS]: [
    'analyze data', 'data analysis', 'chart', 'graph', 'plot',
    'statistics', 'average', 'mean', 'median', 'trend',
    'csv', 'spreadsheet', 'table', 'correlation', 'regression',
    'visualize data', 'dashboard', 'metrics', 'kpi',
  ],
  [AIMode.MATH]: [
    'calculate', 'solve', 'equation', 'formula', 'derivative',
    'integral', 'algebra', 'calculus', 'geometry', 'trigonometry',
    'matrix', 'vector', 'probability', 'statistics', 'proof',
    'factorial', 'logarithm', 'exponential', 'limit',
  ],
  [AIMode.CREATIVE]: [
    'write a story', 'write a poem', 'write a script',
    'create a character', 'creative', 'fiction', 'narrative',
    'dialogue', 'scene', 'novel', 'short story', 'essay',
    'article', 'blog post', 'lyrics', 'song', 'haiku',
  ],
  [AIMode.TRANSLATE]: [
    'translate', 'translation', 'convert to', 'in urdu',
    'in english', 'in hindi', 'in arabic', 'how do you say',
    'in spanish', 'in french', 'in german', 'in chinese',
    'meaning in', 'translate this', 'ترجمہ',
  ],
  [AIMode.SUMMARIZE]: [
    'summarize', 'summary', 'tldr', 'brief', 'key points',
    'main ideas', 'overview', 'condense', 'shorten',
    'in short', 'briefly', 'nutshell', 'gist',
  ],
  [AIMode.EXPLAIN]: [
    'explain', 'what is', 'how does', 'why does',
    'tell me about', 'describe', 'elaborate', 'clarify',
    'break down', 'help me understand', 'what are',
  ],
  [AIMode.RESEARCH]: [
    'research', 'deep dive', 'comprehensive analysis',
    'detailed report', 'thorough investigation',
    'explore in depth', 'full breakdown', 'study',
    'investigate', 'analyze thoroughly', 'with sources',
  ],
  [AIMode.TUTOR]: [
    'teach me', 'learn', 'lesson', 'tutorial',
    'step by step', 'guide me', 'help me learn',
    'explain like', 'beginner', 'course', 'training',
  ],
  [AIMode.BUSINESS]: [
    'business', 'strategy', 'market', 'competitor',
    'swot', 'roi', 'revenue', 'profit', 'startup',
    'pitch', 'investor', 'business plan', 'marketing',
  ],
  [AIMode.CHAT]: [], // Default fallback
};

// ============================================
// Mode Detector Service Class
// ============================================

class ModeDetectorServiceClass {
  /**
   * Detect the most appropriate mode based on user message and attachments
   */
  public detectMode(
    userMessage: string, 
    attachments?: Attachment[],
    explicitMode?: AIMode
  ): DetectedModeResult {
    // If explicit mode is provided, use it
    if (explicitMode && Object.values(AIMode).includes(explicitMode)) {
      return {
        mode: explicitMode,
        confidence: 1.0,
        detectedKeywords: ['explicit-selection'],
      };
    }

    const lowerMessage = userMessage.toLowerCase();
    const scores: Map<AIMode, { score: number; keywords: string[] }> = new Map();

    // Initialize scores
    for (const mode of Object.values(AIMode)) {
      scores.set(mode, { score: 0, keywords: [] });
    }

    // Check for attachments first (high priority)
    if (attachments && attachments.length > 0) {
      const attachmentMode = this.detectFromAttachments(attachments, lowerMessage);
      if (attachmentMode) {
        const current = scores.get(attachmentMode)!;
        current.score += 50; // High weight for attachment-based detection
        current.keywords.push('attachment-detected');
      }
    }

    // Score each mode based on keywords
    for (const [mode, keywords] of Object.entries(MODE_KEYWORDS)) {
      const modeEnum = mode as AIMode;
      const current = scores.get(modeEnum)!;

      for (const keyword of keywords) {
        if (lowerMessage.includes(keyword)) {
          current.score += this.getKeywordWeight(keyword, modeEnum);
          current.keywords.push(keyword);
        }
      }
    }

    // Check for math symbols
    if (this.hasMathSymbols(lowerMessage)) {
      const mathScore = scores.get(AIMode.MATH)!;
      mathScore.score += 30;
      mathScore.keywords.push('math-symbols');
    }

    // Check for code patterns
    if (this.hasCodePatterns(lowerMessage)) {
      const codeScore = scores.get(AIMode.CODE)!;
      codeScore.score += 25;
      codeScore.keywords.push('code-patterns');
    }

    // Find the highest scoring mode
    let bestMode = AIMode.CHAT;
    let bestScore = 0;
    let bestKeywords: string[] = [];

    for (const [mode, data] of scores.entries()) {
      if (data.score > bestScore) {
        bestScore = data.score;
        bestMode = mode;
        bestKeywords = data.keywords;
      }
    }

    // Calculate confidence (normalize score)
    const confidence = Math.min(bestScore / 100, 1.0);

    // Get alternative suggestions
    const suggestedModes = this.getSuggestedModes(scores, bestMode);

    logger.debug('Mode detected', {
      mode: bestMode,
      confidence,
      keywords: bestKeywords,
      messagePreview: lowerMessage.substring(0, 50),
    });

    return {
      mode: bestMode,
      confidence,
      detectedKeywords: bestKeywords,
      suggestedModes,
    };
  }

  /**
   * Detect mode from attachments
   */
  private detectFromAttachments(attachments: Attachment[], message: string): AIMode | null {
    const hasImage = attachments.some(a => a.type === 'image');
    const hasCSV = attachments.some(a => a.type === 'csv');
    const hasPDF = attachments.some(a => a.type === 'pdf');
    const hasDocument = attachments.some(a => a.type === 'document');

    if (hasImage) {
      // Check if user is asking about the image (Vision) or wants to generate (unlikely with attachment)
      const visionKeywords = ['what', 'describe', 'analyze', 'read', 'extract', 'identify'];
      if (visionKeywords.some(kw => message.includes(kw))) {
        return AIMode.VISION;
      }
      return AIMode.VISION; // Default for image attachments
    }

    if (hasCSV) {
      return AIMode.DATA_ANALYSIS;
    }

    if (hasPDF || hasDocument) {
      const summarizeKeywords = ['summarize', 'summary', 'tldr', 'key points'];
      if (summarizeKeywords.some(kw => message.includes(kw))) {
        return AIMode.SUMMARIZE;
      }
      return AIMode.EXPLAIN; // Default for documents
    }

    return null;
  }

  /**
   * Get keyword weight based on specificity
   */
  private getKeywordWeight(keyword: string, mode: AIMode): number {
    // More specific keywords get higher weight
    const specificKeywords: Record<string, number> = {
      // Image generation - very specific
      'generate image': 40,
      'create image': 40,
      'draw': 35,
      'paint': 35,
      'illustrate': 35,
      
      // Code - specific
      'function': 20,
      'algorithm': 25,
      'implement': 20,
      
      // Math - specific
      'derivative': 30,
      'integral': 30,
      'equation': 25,
      
      // Debug - specific
      'debug': 35,
      'error': 20,
      'bug': 25,
      
      // Default
      'default': 10,
    };

    return specificKeywords[keyword] || specificKeywords['default'];
  }

  /**
   * Check for mathematical symbols
   */
  private hasMathSymbols(message: string): boolean {
    const mathSymbolPattern = /[∫∑∏√∞±×÷≠≤≥≈∂∇∈∉⊂⊃∪∩]|\\frac|\\sqrt|\\sum|\\int/;
    const equationPattern = /\d+\s*[\+\-\*\/\^]\s*\d+\s*=|x\s*[\+\-\*\/\^]|solve|equation/i;
    
    return mathSymbolPattern.test(message) || equationPattern.test(message);
  }

  /**
   * Check for code patterns
   */
  private hasCodePatterns(message: string): boolean {
    const codePatterns = [
      /```[\w]*\n/,                    // Code blocks
      /function\s*\(/,                 // Function declarations
      /const\s+\w+\s*=/,              // Variable declarations
      /import\s+.*from/,              // ES6 imports
      /class\s+\w+/,                  // Class declarations
      /def\s+\w+\(/,                  // Python functions
      /\w+\.\w+\(/,                   // Method calls
      /<\w+.*>/,                      // HTML/JSX tags
    ];

    return codePatterns.some(pattern => pattern.test(message));
  }

  /**
   * Get suggested alternative modes
   */
  private getSuggestedModes(
    scores: Map<AIMode, { score: number; keywords: string[] }>,
    bestMode: AIMode
  ): AIMode[] {
    const suggestions: AIMode[] = [];
    
    const sortedModes = Array.from(scores.entries())
      .filter(([mode]) => mode !== bestMode && mode !== AIMode.CHAT)
      .sort((a, b) => b[1].score - a[1].score)
      .slice(0, 2);

    for (const [mode, data] of sortedModes) {
      if (data.score > 10) { // Only suggest if score is meaningful
        suggestions.push(mode);
      }
    }

    return suggestions;
  }

  /**
   * Get mode configuration
   */
  public getModeConfig(mode: AIMode): ModeConfig {
    return MODE_CONFIGS[mode] || MODE_CONFIGS[AIMode.CHAT];
  }

  /**
   * Get all available modes
   */
  public getAllModes(): ModeConfig[] {
    return Object.values(MODE_CONFIGS);
  }

  /**
   * Check if mode requires special API (image gen, web search, etc.)
   */
  public requiresSpecialAPI(mode: AIMode): boolean {
    return MODE_CONFIGS[mode]?.requiresSpecialAPI || false;
  }

  /**
   * Get mode temperature
   */
  public getModeTemperature(mode: AIMode): number {
    return MODE_CONFIGS[mode]?.temperature || 0.7;
  }

  /**
   * Get mode max tokens
   */
  public getModeMaxTokens(mode: AIMode): number {
    return MODE_CONFIGS[mode]?.maxTokens || 4000;
  }

  /**
   * Get daily limit for mode based on user tier
   */
  public getDailyLimit(mode: AIMode, tier: 'free' | 'pro' | 'enterprise'): number {
    return MODE_CONFIGS[mode]?.dailyLimits[tier] || 100;
  }
}

// Export singleton instance
export const modeDetector = new ModeDetectorServiceClass();
export default modeDetector;
