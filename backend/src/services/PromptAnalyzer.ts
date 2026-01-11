/**
 * Prompt Analyzer Service
 * Advanced analysis of user prompts to detect intent, format requirements, and complexity
 * Based on ChatGPT's understanding mechanisms
 * 
 * @module PromptAnalyzer
 */

import { logger } from '../utils/logger.js';
import { languageHandler } from './LanguageHandler.js';

// ============================================
// Types
// ============================================

export interface PromptAnalysis {
  intent: string;
  formatRequested: 'markdown' | 'table' | 'list' | 'code' | 'json' | 'plain';
  complexity: 'simple' | 'moderate' | 'complex';
  language: string;
  requiresStructuring: boolean;
  detectedKeywords: string[];
  specialInstructions: {
    useHeadings: boolean;
    useBulletPoints: boolean;
    useNumberedList: boolean;
    makeTable: boolean;
    highlightImportant: boolean;
    addExamples: boolean;
    useCodeBlock: boolean;
    codeLanguage?: string;
  };
  suggestedTemperature: number;
  suggestedMaxTokens: number;
  confidenceScore: number;
}

// ============================================
// Keyword Patterns
// ============================================

const INTENT_PATTERNS: Record<string, RegExp> = {
  create_table: /\b(create|make|generate|show|give|build).*\b(table|comparison|vs|versus|compare|tabulate|tabular)\b/i,
  compare: /\b(compare|comparison|difference|versus|vs|between|contrast)\b/i,
  write_code: /\b(write|create|generate|make|build|implement|code|function|program|script|class|method)\b.*\b(code|function|program|script|class|method|api|endpoint)\b/i,
  explain: /\b(explain|what is|what are|what's|how does|how do|why|describe|tell me about|meaning|definition)\b/i,
  summarize: /\b(summarize|summary|brief|tldr|tl;dr|short version|overview|gist)\b/i,
  list_items: /\b(list|enumerate|name|give me|show me|what are).*\b(items|things|ways|steps|points|options|features|benefits|advantages|disadvantages)\b/i,
  steps: /\b(steps|how to|guide|tutorial|process|procedure|instructions|walkthrough)\b/i,
  analyze: /\b(analyze|analyse|examine|investigate|study|evaluate|assess|review)\b/i,
  translate: /\b(translate|translation|convert|change).*\b(to|into|from)\b/i,
  format: /\b(format|organize|structure|arrange|layout)\b/i,
  fix_code: /\b(fix|debug|solve|resolve|error|bug|issue|problem|not working)\b.*\b(code|function|program|script)\b/i,
  optimize: /\b(optimize|improve|enhance|better|faster|efficient)\b/i,
  creative: /\b(write|create|compose|draft).*\b(story|poem|essay|article|blog|content|copy)\b/i,
};

const TABLE_KEYWORDS = [
  'table', 'tabulate', 'comparison', 'vs', 'versus', 'compare', 
  'side by side', 'differences', 'similarities', 'pros and cons',
  'advantages and disadvantages', 'features comparison', 'pricing',
  'matrix', 'grid', 'chart', 'data', 'statistics', 'breakdown'
];

const LIST_KEYWORDS = [
  'list', 'enumerate', 'steps', 'points', 'bullets', 'items',
  'things', 'ways', 'options', 'features', 'benefits', 'tips',
  'reasons', 'examples', 'types', 'kinds', 'categories'
];

const NUMBERED_LIST_KEYWORDS = [
  'steps', 'step by step', 'procedure', 'process', 'order',
  'sequence', 'instructions', 'how to', 'guide', 'tutorial',
  'first', 'then', 'finally', 'ranked', 'top', 'best'
];

const HEADING_KEYWORDS = [
  'organize', 'sections', 'parts', 'chapters', 'headers',
  'detailed', 'comprehensive', 'thorough', 'in-depth',
  'structure', 'breakdown', 'explain in detail'
];

const EMPHASIS_KEYWORDS = [
  'important', 'highlight', 'bold', 'emphasize', 'key points',
  'main', 'critical', 'essential', 'crucial', 'significant'
];

const CODE_KEYWORDS = [
  'code', 'function', 'program', 'script', 'implement', 'algorithm',
  'class', 'method', 'api', 'endpoint', 'query', 'sql', 'regex'
];

const CODE_LANGUAGES: Record<string, RegExp> = {
  python: /\b(python|py|django|flask|pandas|numpy)\b/i,
  javascript: /\b(javascript|js|node|nodejs|react|vue|angular|express)\b/i,
  typescript: /\b(typescript|ts)\b/i,
  java: /\b(java|spring|springboot)\b/i,
  csharp: /\b(c#|csharp|\.net|dotnet|asp\.net)\b/i,
  cpp: /\b(c\+\+|cpp)\b/i,
  c: /\b(^c$|c language)\b/i,
  go: /\b(golang|go language)\b/i,
  rust: /\b(rust)\b/i,
  php: /\b(php|laravel)\b/i,
  ruby: /\b(ruby|rails)\b/i,
  swift: /\b(swift|ios)\b/i,
  kotlin: /\b(kotlin|android)\b/i,
  sql: /\b(sql|mysql|postgresql|postgres|sqlite|database query)\b/i,
  html: /\b(html|webpage)\b/i,
  css: /\b(css|stylesheet|styling)\b/i,
  bash: /\b(bash|shell|terminal|command line|cli)\b/i,
  json: /\b(json)\b/i,
  yaml: /\b(yaml|yml)\b/i,
};

// ============================================
// Prompt Analyzer Class
// ============================================

class PromptAnalyzerClass {
  /**
   * Analyze a user prompt comprehensively
   */
  public async analyze(userPrompt: string): Promise<PromptAnalysis> {
    const startTime = Date.now();
    const lowercasePrompt = userPrompt.toLowerCase();
    
    // Detect language
    const languageAnalysis = languageHandler.detectLanguage(userPrompt);
    
    // Detect intent
    const intent = this.determineIntent(userPrompt);
    
    // Detect format requirements
    const formatRequested = this.detectFormat(userPrompt);
    
    // Assess complexity
    const complexity = this.assessComplexity(userPrompt);
    
    // Detect special instructions
    const specialInstructions = this.detectSpecialInstructions(userPrompt, lowercasePrompt);
    
    // Extract key keywords
    const detectedKeywords = this.extractKeywords(userPrompt);
    
    // Calculate confidence
    const confidenceScore = this.calculateConfidence(intent, formatRequested, detectedKeywords);
    
    // Determine optimal parameters
    const suggestedTemperature = this.getSuggestedTemperature(intent, complexity);
    const suggestedMaxTokens = this.getSuggestedMaxTokens(complexity, specialInstructions);
    
    const analysis: PromptAnalysis = {
      intent,
      formatRequested,
      complexity,
      language: languageAnalysis.primaryLanguage,
      requiresStructuring: specialInstructions.makeTable || 
                          specialInstructions.useBulletPoints || 
                          specialInstructions.useNumberedList ||
                          specialInstructions.useHeadings,
      detectedKeywords,
      specialInstructions,
      suggestedTemperature,
      suggestedMaxTokens,
      confidenceScore,
    };
    
    const analysisTime = Date.now() - startTime;
    logger.debug('Prompt analyzed', { 
      intent, 
      format: formatRequested, 
      complexity,
      analysisTime: `${analysisTime}ms`
    });
    
    return analysis;
  }
  
  /**
   * Determine the primary intent of the prompt
   */
  private determineIntent(prompt: string): string {
    for (const [intent, pattern] of Object.entries(INTENT_PATTERNS)) {
      if (pattern.test(prompt)) {
        return intent;
      }
    }
    
    // Fallback detection based on question patterns
    if (/\?$/.test(prompt.trim())) {
      if (/^(what|who|where|when|which)\b/i.test(prompt)) {
        return 'explain';
      }
      if (/^(how)\b/i.test(prompt)) {
        return 'steps';
      }
      if (/^(why)\b/i.test(prompt)) {
        return 'explain';
      }
      if (/^(can|could|would|should)\b/i.test(prompt)) {
        return 'general_query';
      }
    }
    
    return 'general_query';
  }
  
  /**
   * Detect the requested output format
   */
  private detectFormat(prompt: string): 'markdown' | 'table' | 'list' | 'code' | 'json' | 'plain' {
    const lowerPrompt = prompt.toLowerCase();
    
    // Explicit format requests
    if (/\b(table|tabulate|tabular|grid|matrix)\b/i.test(prompt)) return 'table';
    if (/\bjson\b/i.test(prompt)) return 'json';
    if (/\b(code|function|program|script|implement)\b/i.test(prompt)) return 'code';
    if (/\b(list|bullet|enumerate|items)\b/i.test(prompt)) return 'list';
    if (/\bmarkdown\b/i.test(prompt)) return 'markdown';
    
    // Implicit format detection
    if (TABLE_KEYWORDS.some(kw => lowerPrompt.includes(kw))) return 'table';
    if (CODE_KEYWORDS.some(kw => lowerPrompt.includes(kw))) return 'code';
    if (LIST_KEYWORDS.some(kw => lowerPrompt.includes(kw))) return 'list';
    
    // Default to markdown for structured responses
    if (this.assessComplexity(prompt) !== 'simple') {
      return 'markdown';
    }
    
    return 'plain';
  }
  
  /**
   * Assess the complexity of the prompt
   */
  private assessComplexity(prompt: string): 'simple' | 'moderate' | 'complex' {
    const wordCount = prompt.split(/\s+/).length;
    const sentenceCount = (prompt.match(/[.!?]+/g) || []).length + 1;
    const hasMultipleQuestions = (prompt.match(/\?/g) || []).length > 1;
    const hasSubquestions = /\b(first|then|also|additionally|furthermore|moreover|and also|as well as)\b/i.test(prompt);
    const hasConditionals = /\b(if|when|unless|provided|assuming)\b/i.test(prompt);
    const hasMultipleParts = /\b(and|or)\b.*\b(and|or)\b/i.test(prompt);
    
    // Calculate complexity score
    let complexityScore = 0;
    
    if (wordCount > 50) complexityScore += 2;
    else if (wordCount > 25) complexityScore += 1;
    
    if (sentenceCount > 3) complexityScore += 1;
    if (hasMultipleQuestions) complexityScore += 2;
    if (hasSubquestions) complexityScore += 1;
    if (hasConditionals) complexityScore += 1;
    if (hasMultipleParts) complexityScore += 1;
    
    if (complexityScore >= 4) return 'complex';
    if (complexityScore >= 2) return 'moderate';
    return 'simple';
  }
  
  /**
   * Detect special formatting instructions
   */
  private detectSpecialInstructions(
    prompt: string, 
    lowercasePrompt: string
  ): PromptAnalysis['specialInstructions'] {
    // Detect table request
    const makeTable = TABLE_KEYWORDS.some(kw => lowercasePrompt.includes(kw)) ||
                     /\b(compare|vs|versus)\b/i.test(prompt);
    
    // Detect list types
    const wantsList = LIST_KEYWORDS.some(kw => lowercasePrompt.includes(kw));
    const wantsNumbered = NUMBERED_LIST_KEYWORDS.some(kw => lowercasePrompt.includes(kw));
    
    // Detect headings need
    const useHeadings = HEADING_KEYWORDS.some(kw => lowercasePrompt.includes(kw)) ||
                       this.assessComplexity(prompt) === 'complex';
    
    // Detect emphasis
    const highlightImportant = EMPHASIS_KEYWORDS.some(kw => lowercasePrompt.includes(kw));
    
    // Detect examples request
    const addExamples = /\b(example|for instance|such as|like|demonstrate|show me)\b/i.test(prompt);
    
    // Detect code request and language
    const useCodeBlock = CODE_KEYWORDS.some(kw => lowercasePrompt.includes(kw));
    let codeLanguage: string | undefined;
    
    if (useCodeBlock) {
      for (const [lang, pattern] of Object.entries(CODE_LANGUAGES)) {
        if (pattern.test(prompt)) {
          codeLanguage = lang;
          break;
        }
      }
    }
    
    return {
      useHeadings,
      useBulletPoints: wantsList && !wantsNumbered,
      useNumberedList: wantsNumbered,
      makeTable,
      highlightImportant,
      addExamples,
      useCodeBlock,
      codeLanguage,
    };
  }
  
  /**
   * Extract key keywords from the prompt
   */
  private extractKeywords(prompt: string): string[] {
    const keywords: string[] = [];
    
    // Extract nouns and important terms (simplified)
    const importantWords = prompt
      .replace(/[^\w\s]/g, ' ')
      .split(/\s+/)
      .filter(word => word.length > 3)
      .filter(word => !this.isStopWord(word));
    
    // Get unique keywords
    const seen = new Set<string>();
    for (const word of importantWords) {
      const lower = word.toLowerCase();
      if (!seen.has(lower)) {
        seen.add(lower);
        keywords.push(word);
      }
    }
    
    return keywords.slice(0, 10); // Limit to 10 keywords
  }
  
  /**
   * Check if word is a stop word
   */
  private isStopWord(word: string): boolean {
    const stopWords = new Set([
      'the', 'a', 'an', 'is', 'are', 'was', 'were', 'be', 'been', 'being',
      'have', 'has', 'had', 'do', 'does', 'did', 'will', 'would', 'could',
      'should', 'may', 'might', 'must', 'shall', 'can', 'need', 'dare',
      'ought', 'used', 'this', 'that', 'these', 'those', 'what', 'which',
      'who', 'whom', 'whose', 'where', 'when', 'why', 'how', 'all', 'each',
      'every', 'both', 'few', 'more', 'most', 'other', 'some', 'such', 'only',
      'own', 'same', 'than', 'too', 'very', 'just', 'also', 'now', 'here',
      'there', 'then', 'once', 'from', 'with', 'without', 'about', 'into',
      'through', 'during', 'before', 'after', 'above', 'below', 'between',
      'under', 'again', 'further', 'while', 'and', 'but', 'for', 'nor',
      'yet', 'because', 'although', 'unless', 'until', 'when', 'where',
      'mujhe', 'mein', 'hai', 'hain', 'kya', 'kaise', 'aap', 'tum', 'hum',
      'yeh', 'woh', 'aur', 'lekin', 'please', 'give', 'show', 'tell', 'make'
    ]);
    
    return stopWords.has(word.toLowerCase());
  }
  
  /**
   * Calculate confidence score for the analysis
   */
  private calculateConfidence(
    intent: string, 
    format: string, 
    keywords: string[]
  ): number {
    let confidence = 0.5; // Base confidence
    
    // Higher confidence if clear intent detected
    if (intent !== 'general_query') confidence += 0.2;
    
    // Higher confidence if format is explicitly requested
    if (format !== 'plain') confidence += 0.15;
    
    // Higher confidence with more keywords
    if (keywords.length >= 5) confidence += 0.1;
    else if (keywords.length >= 3) confidence += 0.05;
    
    return Math.min(confidence, 0.95);
  }
  
  /**
   * Get suggested temperature based on intent
   */
  private getSuggestedTemperature(intent: string, complexity: string): number {
    // Factual/structured tasks need lower temperature
    const factualIntents = ['create_table', 'list_items', 'compare', 'analyze', 'fix_code', 'steps'];
    
    // Creative tasks need higher temperature
    const creativeIntents = ['creative', 'general_query'];
    
    if (factualIntents.includes(intent)) {
      return 0.3;
    } else if (creativeIntents.includes(intent)) {
      return 0.8;
    } else if (intent === 'write_code') {
      return 0.4; // Slightly creative but accurate
    }
    
    // Adjust based on complexity
    if (complexity === 'complex') {
      return 0.5; // More deterministic for complex queries
    }
    
    return 0.7; // Default balanced
  }
  
  /**
   * Get suggested max tokens based on complexity
   */
  private getSuggestedMaxTokens(
    complexity: string,
    instructions: PromptAnalysis['specialInstructions']
  ): number {
    let baseTokens: number;
    
    switch (complexity) {
      case 'simple':
        baseTokens = 500;
        break;
      case 'moderate':
        baseTokens = 1000;
        break;
      case 'complex':
        baseTokens = 2000;
        break;
      default:
        baseTokens = 1000;
    }
    
    // Adjust for special instructions
    if (instructions.makeTable) baseTokens += 300;
    if (instructions.useCodeBlock) baseTokens += 500;
    if (instructions.addExamples) baseTokens += 300;
    if (instructions.useHeadings) baseTokens += 200;
    
    return Math.min(baseTokens, 4000); // Cap at 4000
  }
  
  /**
   * Generate formatting hints for system prompt
   */
  public generateFormattingHints(analysis: PromptAnalysis): string {
    const hints: string[] = [];
    
    if (analysis.specialInstructions.makeTable) {
      hints.push('User wants a TABLE. Create a properly formatted Markdown table with | column | separators and |---|---| header row.');
    }
    
    if (analysis.specialInstructions.useBulletPoints) {
      hints.push('User wants a BULLET LIST. Use - for each item, keep items concise.');
    }
    
    if (analysis.specialInstructions.useNumberedList) {
      hints.push('User wants a NUMBERED LIST. Use 1. 2. 3. format for sequential steps.');
    }
    
    if (analysis.specialInstructions.useHeadings) {
      hints.push('Organize response with HEADINGS. Use ## for main sections and ### for subsections.');
    }
    
    if (analysis.specialInstructions.highlightImportant) {
      hints.push('EMPHASIZE key points using **bold** for important terms.');
    }
    
    if (analysis.specialInstructions.useCodeBlock) {
      const lang = analysis.specialInstructions.codeLanguage || 'the appropriate language';
      hints.push(`Include CODE BLOCKS using \`\`\`${lang} syntax with proper formatting.`);
    }
    
    if (analysis.specialInstructions.addExamples) {
      hints.push('Include EXAMPLES to illustrate concepts clearly.');
    }
    
    if (hints.length === 0) {
      return '';
    }
    
    return '\n\n**FORMATTING INSTRUCTIONS (Important!):**\n' + hints.map(h => `- ${h}`).join('\n');
  }
}

// Export singleton
export const promptAnalyzer = new PromptAnalyzerClass();
export default promptAnalyzer;
