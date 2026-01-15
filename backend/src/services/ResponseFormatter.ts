/**
 * Response Formatter Service
 * Post-processes AI responses to ensure proper formatting
 * Enhances readability and visual hierarchy
 * 
 * @module ResponseFormatter
 */

import { logger } from '../utils/logger.js';
import { PromptAnalysis } from './PromptAnalyzer.js';

// ============================================
// Types
// ============================================

export interface FormattingOptions {
  promptAnalysis: PromptAnalysis;
  rawResponse: string;
  userPreferences?: UserFormatPreferences;
}

export interface UserFormatPreferences {
  preferTables: boolean;
  preferLists: boolean;
  detailLevel: 'brief' | 'normal' | 'detailed';
  codeStyle: 'compact' | 'verbose';
}

export interface FormattedResponse {
  content: string;
  formattingApplied: string[];
  metadata: {
    hasTable: boolean;
    hasList: boolean;
    hasCode: boolean;
    hasHeadings: boolean;
    wordCount: number;
  };
}

// ============================================
// Response Formatter Class
// ============================================

class ResponseFormatterClass {
  /**
   * Format and enhance AI response
   */
  public async format(options: FormattingOptions): Promise<FormattedResponse> {
    const { promptAnalysis, rawResponse, userPreferences } = options;
    const formattingApplied: string[] = [];
    
    let formattedResponse = rawResponse;
    
    // 1. Fix common Markdown issues
    formattedResponse = this.fixMarkdownIssues(formattedResponse);
    formattingApplied.push('markdown_fixes');
    
    // 2. Ensure proper table formatting
    if (this.hasTable(formattedResponse)) {
      formattedResponse = this.fixTableFormatting(formattedResponse);
      formattingApplied.push('table_formatting');
    }
    
    // 3. Ensure proper code block formatting
    if (this.hasCodeBlock(formattedResponse)) {
      formattedResponse = this.fixCodeBlockFormatting(formattedResponse);
      formattingApplied.push('code_formatting');
    }
    
    // 4. Add headings if needed and not present
    if (promptAnalysis.specialInstructions.useHeadings && !this.hasHeadings(formattedResponse)) {
      if (formattedResponse.length > 500) {
        formattedResponse = this.addHeadings(formattedResponse);
        formattingApplied.push('headings_added');
      }
    }
    
    // 5. Enhance lists if present
    if (this.hasList(formattedResponse)) {
      formattedResponse = this.enhanceLists(formattedResponse);
      formattingApplied.push('list_enhancement');
    }
    
    // 6. Add emphasis to important terms
    if (promptAnalysis.specialInstructions.highlightImportant) {
      formattedResponse = this.addEmphasis(formattedResponse);
      formattingApplied.push('emphasis_added');
    }
    
    // 7. Improve spacing and readability
    formattedResponse = this.improveSpacing(formattedResponse);
    formattingApplied.push('spacing_improved');
    
    // 8. Clean up any formatting artifacts
    formattedResponse = this.cleanupArtifacts(formattedResponse);
    
    // Generate metadata
    const metadata = {
      hasTable: this.hasTable(formattedResponse),
      hasList: this.hasList(formattedResponse),
      hasCode: this.hasCodeBlock(formattedResponse),
      hasHeadings: this.hasHeadings(formattedResponse),
      wordCount: formattedResponse.split(/\s+/).length,
    };
    
    logger.debug('Response formatted', { 
      formattingApplied, 
      metadata 
    });
    
    return {
      content: formattedResponse,
      formattingApplied,
      metadata,
    };
  }
  
  /**
   * Fix common Markdown issues
   */
  private fixMarkdownIssues(text: string): string {
    return text
      // Fix missing space after heading markers
      .replace(/^(#{1,6})([^\s#])/gm, '$1 $2')
      // Fix missing space after list markers
      .replace(/^(\s*[-*+])([^\s])/gm, '$1 $2')
      .replace(/^(\s*\d+\.)([^\s])/gm, '$1 $2')
      // Fix unclosed bold/italic
      .replace(/\*\*([^*]+)$/gm, '**$1**')
      .replace(/\*([^*]+)$/gm, '*$1*')
      // Fix broken links
      .replace(/\[([^\]]+)\]\s+\(([^)]+)\)/g, '[$1]($2)')
      // Normalize line endings
      .replace(/\r\n/g, '\n')
      .replace(/\r/g, '\n');
  }
  
  /**
   * Check if text contains a Markdown table
   */
  private hasTable(text: string): boolean {
    // Look for table pattern: | col | col | with separator row
    return /\|[^|]+\|[^|]+\|/.test(text) && /\|[-:]+\|[-:]+\|/.test(text);
  }
  
  /**
   * Fix table formatting issues
   */
  private fixTableFormatting(text: string): string {
    const lines = text.split('\n');
    const result: string[] = [];
    let inTable = false;
    let tableLines: string[] = [];
    
    for (const line of lines) {
      const isTableLine = /^\s*\|.+\|\s*$/.test(line);
      
      if (isTableLine) {
        inTable = true;
        tableLines.push(line);
      } else {
        if (inTable && tableLines.length > 0) {
          // Process and add the table
          result.push(...this.formatTable(tableLines));
          tableLines = [];
          inTable = false;
        }
        result.push(line);
      }
    }
    
    // Handle table at end of text
    if (tableLines.length > 0) {
      result.push(...this.formatTable(tableLines));
    }
    
    return result.join('\n');
  }
  
  /**
   * Format a table for proper alignment
   */
  private formatTable(lines: string[]): string[] {
    if (lines.length < 2) return lines;
    
    // Parse cells
    const rows: string[][] = lines.map(line => 
      line.split('|')
        .slice(1, -1) // Remove empty first/last from split
        .map(cell => cell.trim())
    );
    
    // Calculate max width for each column
    const numCols = Math.max(...rows.map(r => r.length));
    const colWidths: number[] = Array(numCols).fill(3);
    
    for (const row of rows) {
      for (let i = 0; i < row.length; i++) {
        if (!row[i].match(/^[-:]+$/)) { // Skip separator row
          colWidths[i] = Math.max(colWidths[i], row[i].length);
        }
      }
    }
    
    // Format rows with proper padding
    const formattedLines: string[] = [];
    let separatorAdded = false;
    
    for (let rowIdx = 0; rowIdx < rows.length; rowIdx++) {
      const row = rows[rowIdx];
      const isSeparator = row.every(cell => /^[-:]+$/.test(cell));
      
      if (isSeparator) {
        // Format separator row
        const sep = colWidths.map((w, i) => {
          const cell = row[i] || '---';
          const leftAlign = cell.startsWith(':');
          const rightAlign = cell.endsWith(':');
          const center = leftAlign && rightAlign;
          
          if (center) return ':' + '-'.repeat(w) + ':';
          if (rightAlign) return '-'.repeat(w + 1) + ':';
          if (leftAlign) return ':' + '-'.repeat(w + 1);
          return '-'.repeat(w + 2);
        });
        formattedLines.push('| ' + sep.join(' | ') + ' |');
        separatorAdded = true;
      } else {
        // Format data row
        const cells = colWidths.map((w, i) => {
          const cell = row[i] || '';
          return cell.padEnd(w);
        });
        formattedLines.push('| ' + cells.join(' | ') + ' |');
        
        // Add separator after header if not present
        if (rowIdx === 0 && !separatorAdded && rows.length > 1) {
          const nextRow = rows[rowIdx + 1];
          if (!nextRow || !nextRow.every(cell => /^[-:]+$/.test(cell))) {
            const sep = colWidths.map(w => '-'.repeat(w + 2));
            formattedLines.push('| ' + sep.join(' | ') + ' |');
            separatorAdded = true;
          }
        }
      }
    }
    
    return formattedLines;
  }
  
  /**
   * Check if text contains code blocks
   */
  private hasCodeBlock(text: string): boolean {
    return /```[\s\S]*?```/.test(text);
  }
  
  /**
   * Fix code block formatting
   */
  private fixCodeBlockFormatting(text: string): string {
    return text
      // Ensure language is specified (default to text if none)
      .replace(/```\n/g, '```text\n')
      // Fix common language typos
      .replace(/```(javascript|js)\n/gi, '```javascript\n')
      .replace(/```(typescript|ts)\n/gi, '```typescript\n')
      .replace(/```(python|py)\n/gi, '```python\n')
      // Ensure proper closing
      .replace(/```(\w+)\n([\s\S]*?)(?=```|$)/g, (match, lang, code) => {
        if (!match.endsWith('```')) {
          return '```' + lang + '\n' + code.trimEnd() + '\n```';
        }
        return match;
      })
      // Add newline before code blocks if missing
      .replace(/([^\n])(\n```)/g, '$1\n$2')
      // Add newline after code blocks if missing
      .replace(/(```\n)([^\n])/g, '$1\n$2');
  }
  
  /**
   * Check if text contains headings
   */
  private hasHeadings(text: string): boolean {
    return /^#{1,6}\s+.+$/m.test(text);
  }
  
  /**
   * Add headings to long text
   */
  private addHeadings(text: string): string {
    const paragraphs = text.split('\n\n');
    
    if (paragraphs.length < 3) return text;
    
    const result: string[] = [];
    let sectionCount = 0;
    
    for (let i = 0; i < paragraphs.length; i++) {
      const para = paragraphs[i].trim();
      
      if (!para) continue;
      
      // Check if this looks like a section start
      const firstLine = para.split('\n')[0];
      const isShortIntro = firstLine.length < 80 && !firstLine.endsWith('.');
      const startsWithTransition = /^(first|second|third|next|then|finally|additionally|furthermore|however|moreover|in conclusion)/i.test(firstLine);
      
      if ((isShortIntro || startsWithTransition) && sectionCount < 5) {
        // Add as heading
        if (sectionCount === 0 && i === 0) {
          result.push(`## ${firstLine}\n`);
        } else {
          result.push(`### ${firstLine}\n`);
        }
        
        // Add rest of paragraph if any
        const rest = para.split('\n').slice(1).join('\n');
        if (rest.trim()) {
          result.push(rest);
        }
        
        sectionCount++;
      } else {
        result.push(para);
      }
    }
    
    return result.join('\n\n');
  }
  
  /**
   * Check if text contains lists
   */
  private hasList(text: string): boolean {
    return /^\s*[-*+]\s+.+$/m.test(text) || /^\s*\d+\.\s+.+$/m.test(text);
  }
  
  /**
   * Enhance list formatting
   */
  private enhanceLists(text: string): string {
    const lines = text.split('\n');
    const result: string[] = [];
    let inList = false;
    
    for (let i = 0; i < lines.length; i++) {
      const line = lines[i];
      const isListItem = /^\s*[-*+]\s+.+$/.test(line) || /^\s*\d+\.\s+.+$/.test(line);
      
      if (isListItem) {
        if (!inList) {
          // Add blank line before list if needed
          if (result.length > 0 && result[result.length - 1].trim() !== '') {
            result.push('');
          }
          inList = true;
        }
        result.push(line);
      } else {
        if (inList && line.trim() !== '') {
          // Add blank line after list
          result.push('');
          inList = false;
        }
        result.push(line);
      }
    }
    
    return result.join('\n');
  }
  
  /**
   * Add emphasis to important terms
   */
  private addEmphasis(text: string): string {
    const importantTerms = [
      'important', 'critical', 'essential', 'required', 'must',
      'key', 'primary', 'warning', 'note', 'caution', 'remember',
      'tip', 'best practice', 'recommended', 'avoid', 'never',
      'always', 'crucial', 'vital', 'significant', 'main'
    ];
    
    let emphasized = text;
    
    for (const term of importantTerms) {
      // Only add bold if not already bold and not in code block
      const regex = new RegExp(`(?<!\\*\\*)\\b(${term})\\b(?!\\*\\*)`, 'gi');
      emphasized = emphasized.replace(regex, (match, capture) => {
        // Don't modify if inside code block
        const beforeMatch = emphasized.substring(0, emphasized.indexOf(match));
        const openCodeBlocks = (beforeMatch.match(/```/g) || []).length;
        if (openCodeBlocks % 2 !== 0) {
          return match; // Inside code block
        }
        return `**${capture}**`;
      });
    }
    
    return emphasized;
  }
  
  /**
   * Improve spacing and readability
   */
  private improveSpacing(text: string): string {
    return text
      // Remove excessive blank lines (max 2)
      .replace(/\n{4,}/g, '\n\n\n')
      // Ensure space after headings
      .replace(/^(#{1,6}\s+.+)\n(?!\n)/gm, '$1\n\n')
      // Ensure space before headings
      .replace(/([^\n])\n(#{1,6}\s+)/g, '$1\n\n$2')
      // Ensure space after tables
      .replace(/(\|\s*\n)(?!\n|\|)/g, '$1\n')
      // Ensure space after code blocks
      .replace(/(```\n)(?!\n)/g, '$1\n')
      // Trim trailing whitespace from lines
      .split('\n').map(line => line.trimEnd()).join('\n')
      // Trim overall
      .trim();
  }
  
  /**
   * Clean up formatting artifacts
   */
  private cleanupArtifacts(text: string): string {
    return text
      // Remove duplicate bold markers
      .replace(/\*\*\*\*+/g, '**')
      // Remove empty bold
      .replace(/\*\*\s*\*\*/g, '')
      // Remove empty italic
      .replace(/\*\s*\*/g, '')
      // Remove trailing asterisks at end of paragraphs (common AI artifact)
      .replace(/\*+\s*$/gm, '')
      .replace(/\*+\n/g, '\n')
      // Remove orphan asterisks that aren't part of formatting
      .replace(/([.!?])\s*\*+\s*$/gm, '$1')
      .replace(/([.!?])\s*\*+\n/g, '$1\n')
      // Fix broken lists
      .replace(/^-\s*$/gm, '')
      // Remove trailing colons from headings
      .replace(/^(#{1,6}\s+.+):$/gm, '$1')
      // Normalize bullet points to • for better appearance
      .replace(/^\s*[-*+]\s+/gm, '• ')
      // Clean up multiple newlines
      .replace(/\n{4,}/g, '\n\n\n');
  }
  
  /**
   * Quick format check for streaming responses
   */
  public quickFormat(chunk: string, previousContent: string): string {
    // For streaming, only do minimal fixes
    return chunk
      .replace(/\r\n/g, '\n')
      .replace(/\r/g, '\n');
  }
}

// Export singleton
export const responseFormatter = new ResponseFormatterClass();
export default responseFormatter;
