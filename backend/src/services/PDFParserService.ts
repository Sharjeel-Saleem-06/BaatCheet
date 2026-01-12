/**
 * PDF Parser Service
 * Advanced PDF document parsing with page-level extraction
 * and AI-powered document analysis
 * 
 * @module PDFParserService
 */

import * as pdfParse from 'pdf-parse';
import { logger } from '../utils/logger.js';
import { aiRouter } from './AIRouter.js';
import { prisma } from '../config/database.js';

// ============================================
// Types
// ============================================

export interface PDFContent {
  text: string;
  numPages: number;
  metadata: PDFMetadata;
  pages: PageContent[];
  wordCount: number;
  charCount: number;
}

export interface PDFMetadata {
  title?: string;
  author?: string;
  subject?: string;
  keywords?: string;
  creator?: string;
  producer?: string;
  creationDate?: Date;
  modificationDate?: Date;
}

export interface PageContent {
  pageNumber: number;
  text: string;
  wordCount: number;
}

export interface PDFAnalysisResult {
  summary: string;
  keyTopics: string[];
  mainPoints: string[];
  documentType: string;
  answer?: string;
}

// ============================================
// PDF Parser Service Class
// ============================================

class PDFParserServiceClass {
  private readonly MAX_CHARS_FOR_AI = 100000; // ~25k tokens
  private readonly MAX_PAGES_FOR_FULL_ANALYSIS = 50;

  /**
   * Parse a PDF file and extract content
   */
  public async parsePDF(fileBuffer: Buffer): Promise<PDFContent> {
    try {
      // Use pdf-parse to extract text
      const data = await (pdfParse as any).default(fileBuffer);
      
      // Extract metadata
      const metadata: PDFMetadata = {
        title: data.info?.Title,
        author: data.info?.Author,
        subject: data.info?.Subject,
        keywords: data.info?.Keywords,
        creator: data.info?.Creator,
        producer: data.info?.Producer,
        creationDate: data.info?.CreationDate ? new Date(data.info.CreationDate) : undefined,
        modificationDate: data.info?.ModDate ? new Date(data.info.ModDate) : undefined,
      };
      
      // Extract pages (estimated split)
      const pages = this.extractPages(data.text, data.numpages);
      
      // Calculate statistics
      const wordCount = data.text.split(/\s+/).filter((w: string) => w.length > 0).length;
      const charCount = data.text.length;
      
      logger.info('PDF parsed successfully', {
        numPages: data.numpages,
        wordCount,
        charCount,
      });
      
      return {
        text: data.text,
        numPages: data.numpages,
        metadata,
        pages,
        wordCount,
        charCount,
      };
    } catch (error) {
      logger.error('PDF parsing failed:', error);
      throw new Error('Failed to parse PDF document');
    }
  }

  /**
   * Extract pages from full text
   * Note: pdf-parse doesn't provide page-level text, so we estimate
   */
  private extractPages(fullText: string, numPages: number): PageContent[] {
    if (numPages <= 0) {
      return [{
        pageNumber: 1,
        text: fullText,
        wordCount: fullText.split(/\s+/).length,
      }];
    }
    
    const pages: PageContent[] = [];
    
    // Try to split by page break characters first
    const pageBreakPattern = /\f|\n{4,}/g;
    const splits = fullText.split(pageBreakPattern);
    
    if (splits.length >= numPages * 0.8) {
      // Page breaks found, use them
      for (let i = 0; i < Math.min(splits.length, numPages); i++) {
        const pageText = splits[i].trim();
        pages.push({
          pageNumber: i + 1,
          text: pageText,
          wordCount: pageText.split(/\s+/).filter(w => w.length > 0).length,
        });
      }
    } else {
      // Estimate page boundaries by character count
      const avgCharsPerPage = Math.ceil(fullText.length / numPages);
      
      for (let i = 0; i < numPages; i++) {
        const start = i * avgCharsPerPage;
        const end = Math.min((i + 1) * avgCharsPerPage, fullText.length);
        const pageText = fullText.substring(start, end).trim();
        
        pages.push({
          pageNumber: i + 1,
          text: pageText,
          wordCount: pageText.split(/\s+/).filter(w => w.length > 0).length,
        });
      }
    }
    
    return pages;
  }

  /**
   * Analyze PDF content using AI
   */
  public async analyzePDF(pdfContent: PDFContent): Promise<PDFAnalysisResult> {
    try {
      // Truncate text if too long
      const textForAnalysis = pdfContent.text.length > this.MAX_CHARS_FOR_AI
        ? pdfContent.text.substring(0, this.MAX_CHARS_FOR_AI) + '\n\n[Document truncated for analysis...]'
        : pdfContent.text;
      
      const analysisPrompt = `Analyze this PDF document and provide:
1. A brief summary (2-3 sentences)
2. Key topics covered (list 3-5 main topics)
3. Main points or findings (list 3-5 key points)
4. Document type (e.g., report, article, manual, contract, etc.)

Document metadata:
- Title: ${pdfContent.metadata.title || 'Unknown'}
- Author: ${pdfContent.metadata.author || 'Unknown'}
- Pages: ${pdfContent.numPages}
- Words: ${pdfContent.wordCount}

Document content:
${textForAnalysis}

Respond in JSON format:
{
  "summary": "...",
  "keyTopics": ["topic1", "topic2", ...],
  "mainPoints": ["point1", "point2", ...],
  "documentType": "..."
}`;

      const response = await aiRouter.chat({
        messages: [{ role: 'user', content: analysisPrompt }],
        temperature: 0.3,
        maxTokens: 1000,
      });
      
      if (!response.success || !response.content) {
        throw new Error('AI analysis failed');
      }
      
      // Parse JSON response
      let content = response.content.trim();
      content = content.replace(/```json\n?|\n?```/g, '').trim();
      
      const jsonMatch = content.match(/\{[\s\S]*\}/);
      if (!jsonMatch) {
        throw new Error('Invalid AI response format');
      }
      
      const analysis = JSON.parse(jsonMatch[0]) as PDFAnalysisResult;
      
      logger.info('PDF analysis completed', {
        documentType: analysis.documentType,
        topicsCount: analysis.keyTopics.length,
      });
      
      return analysis;
    } catch (error) {
      logger.error('PDF analysis failed:', error);
      
      // Return basic analysis on failure
      return {
        summary: 'Unable to generate AI summary.',
        keyTopics: [],
        mainPoints: [],
        documentType: 'unknown',
      };
    }
  }

  /**
   * Answer a question about a PDF document
   */
  public async answerQuestion(
    pdfContent: PDFContent,
    question: string
  ): Promise<string> {
    try {
      // Truncate text if too long
      const textForAnalysis = pdfContent.text.length > this.MAX_CHARS_FOR_AI
        ? pdfContent.text.substring(0, this.MAX_CHARS_FOR_AI) + '\n\n[Document truncated...]'
        : pdfContent.text;
      
      const prompt = `You are analyzing a PDF document. Answer the user's question based ONLY on the document content.

Document Information:
- Title: ${pdfContent.metadata.title || 'Unknown'}
- Author: ${pdfContent.metadata.author || 'Unknown'}
- Pages: ${pdfContent.numPages}

Document Content:
${textForAnalysis}

User Question: ${question}

Instructions:
- Answer based only on information in the document
- If the answer is not in the document, say so
- Reference specific sections or pages when possible
- Be concise but thorough`;

      const response = await aiRouter.chat({
        messages: [{ role: 'user', content: prompt }],
        temperature: 0.3,
        maxTokens: 1500,
      });
      
      if (!response.success || !response.content) {
        throw new Error('AI response failed');
      }
      
      return response.content;
    } catch (error) {
      logger.error('PDF Q&A failed:', error);
      throw new Error('Failed to answer question about document');
    }
  }

  /**
   * Search for text within PDF
   */
  public searchInPDF(
    pdfContent: PDFContent,
    searchTerm: string
  ): Array<{ pageNumber: number; context: string; position: number }> {
    const results: Array<{ pageNumber: number; context: string; position: number }> = [];
    const searchLower = searchTerm.toLowerCase();
    
    for (const page of pdfContent.pages) {
      const pageLower = page.text.toLowerCase();
      let position = 0;
      
      while ((position = pageLower.indexOf(searchLower, position)) !== -1) {
        // Extract context (50 chars before and after)
        const start = Math.max(0, position - 50);
        const end = Math.min(page.text.length, position + searchTerm.length + 50);
        const context = page.text.substring(start, end);
        
        results.push({
          pageNumber: page.pageNumber,
          context: '...' + context + '...',
          position,
        });
        
        position += searchTerm.length;
      }
    }
    
    return results;
  }

  /**
   * Get PDF summary for chat context
   */
  public formatForChat(pdfContent: PDFContent, analysis?: PDFAnalysisResult): string {
    let context = '\n\n## 📄 ATTACHED PDF DOCUMENT\n\n';
    
    context += `**Title:** ${pdfContent.metadata.title || 'Untitled'}\n`;
    context += `**Author:** ${pdfContent.metadata.author || 'Unknown'}\n`;
    context += `**Pages:** ${pdfContent.numPages}\n`;
    context += `**Words:** ${pdfContent.wordCount}\n\n`;
    
    if (analysis) {
      context += `**Summary:** ${analysis.summary}\n\n`;
      context += `**Key Topics:** ${analysis.keyTopics.join(', ')}\n\n`;
      context += `**Document Type:** ${analysis.documentType}\n\n`;
    }
    
    // Include truncated content
    const maxContentLength = 5000;
    const truncatedContent = pdfContent.text.length > maxContentLength
      ? pdfContent.text.substring(0, maxContentLength) + '\n\n[Content truncated...]'
      : pdfContent.text;
    
    context += `**Content Preview:**\n${truncatedContent}\n\n`;
    context += '---\n';
    context += 'The user has attached this PDF. Answer questions about it or reference its content as needed.\n';
    
    return context;
  }

  /**
   * Extract table of contents (if available)
   */
  public extractTOC(pdfContent: PDFContent): string[] {
    const toc: string[] = [];
    
    // Look for common TOC patterns
    const tocPatterns = [
      /^(chapter|section|part)\s+\d+[.:]\s*.+$/gim,
      /^\d+\.\s+[A-Z].+$/gm,
      /^[IVXLCDM]+\.\s+.+$/gm,
    ];
    
    for (const pattern of tocPatterns) {
      const matches = pdfContent.text.match(pattern);
      if (matches && matches.length > 2) {
        toc.push(...matches.slice(0, 20)); // Limit to 20 entries
        break;
      }
    }
    
    return toc;
  }
}

// Export singleton instance
export const pdfParser = new PDFParserServiceClass();
export default pdfParser;
