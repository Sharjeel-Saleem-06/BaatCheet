/**
 * Export Service
 * Handles conversation export to various formats
 * 
 * @module ExportService
 */

import PDFDocument from 'pdfkit';
import { prisma } from '../config/database.js';
import { logger } from '../utils/logger.js';

// ============================================
// Types
// ============================================

interface ExportMessage {
  role: string;
  content: string;
  createdAt: Date;
  model?: string | null;
}

interface ConversationExport {
  id: string;
  title: string;
  model: string;
  systemPrompt?: string | null;
  tags: string[];
  createdAt: Date;
  updatedAt: Date;
  messages: ExportMessage[];
}

export interface ExportResult {
  success: boolean;
  data?: Buffer | string;
  filename?: string;
  mimeType?: string;
  error?: string;
}

// ============================================
// Export Service Class
// ============================================

class ExportServiceClass {
  /**
   * Get conversation data for export
   */
  private async getConversationData(
    conversationId: string,
    userId: string
  ): Promise<ConversationExport | null> {
    const conversation = await prisma.conversation.findFirst({
      where: { id: conversationId, userId },
      include: {
        messages: {
          orderBy: { createdAt: 'asc' },
          select: {
            role: true,
            content: true,
            createdAt: true,
            model: true,
          },
        },
      },
    });

    if (!conversation) return null;

    return {
      id: conversation.id,
      title: conversation.title,
      model: conversation.model,
      systemPrompt: conversation.systemPrompt,
      tags: conversation.tags,
      createdAt: conversation.createdAt,
      updatedAt: conversation.updatedAt,
      messages: conversation.messages,
    };
  }

  /**
   * Export conversation to JSON
   */
  public async exportToJSON(
    conversationId: string,
    userId: string
  ): Promise<ExportResult> {
    try {
      const data = await this.getConversationData(conversationId, userId);
      if (!data) {
        return { success: false, error: 'Conversation not found' };
      }

      const json = JSON.stringify(data, null, 2);
      const filename = `${this.sanitizeFilename(data.title)}-${Date.now()}.json`;

      return {
        success: true,
        data: json,
        filename,
        mimeType: 'application/json',
      };
    } catch (error) {
      logger.error('JSON export failed:', error);
      return { success: false, error: 'Export failed' };
    }
  }

  /**
   * Export conversation to plain text
   */
  public async exportToTXT(
    conversationId: string,
    userId: string
  ): Promise<ExportResult> {
    try {
      const data = await this.getConversationData(conversationId, userId);
      if (!data) {
        return { success: false, error: 'Conversation not found' };
      }

      let text = `# ${data.title}\n`;
      text += `Model: ${data.model}\n`;
      text += `Created: ${data.createdAt.toISOString()}\n`;
      if (data.tags.length > 0) {
        text += `Tags: ${data.tags.join(', ')}\n`;
      }
      text += '\n' + '='.repeat(50) + '\n\n';

      if (data.systemPrompt) {
        text += `[System]\n${data.systemPrompt}\n\n`;
      }

      for (const msg of data.messages) {
        const timestamp = msg.createdAt.toLocaleString();
        const role = msg.role === 'user' ? 'You' : 'BaatCheet';
        text += `[${role}] (${timestamp})\n${msg.content}\n\n`;
      }

      const filename = `${this.sanitizeFilename(data.title)}-${Date.now()}.txt`;

      return {
        success: true,
        data: text,
        filename,
        mimeType: 'text/plain',
      };
    } catch (error) {
      logger.error('TXT export failed:', error);
      return { success: false, error: 'Export failed' };
    }
  }

  /**
   * Export conversation to Markdown
   */
  public async exportToMarkdown(
    conversationId: string,
    userId: string
  ): Promise<ExportResult> {
    try {
      const data = await this.getConversationData(conversationId, userId);
      if (!data) {
        return { success: false, error: 'Conversation not found' };
      }

      let md = `# ${data.title}\n\n`;
      md += `**Model:** ${data.model}  \n`;
      md += `**Created:** ${data.createdAt.toISOString()}  \n`;
      if (data.tags.length > 0) {
        md += `**Tags:** ${data.tags.map(t => `\`${t}\``).join(', ')}  \n`;
      }
      md += '\n---\n\n';

      if (data.systemPrompt) {
        md += `> **System Prompt:**\n> ${data.systemPrompt.replace(/\n/g, '\n> ')}\n\n`;
      }

      for (const msg of data.messages) {
        const timestamp = msg.createdAt.toLocaleString();
        const role = msg.role === 'user' ? '👤 **You**' : '🤖 **BaatCheet**';
        
        md += `### ${role}\n`;
        md += `*${timestamp}*\n\n`;
        md += `${msg.content}\n\n`;
        md += '---\n\n';
      }

      const filename = `${this.sanitizeFilename(data.title)}-${Date.now()}.md`;

      return {
        success: true,
        data: md,
        filename,
        mimeType: 'text/markdown',
      };
    } catch (error) {
      logger.error('Markdown export failed:', error);
      return { success: false, error: 'Export failed' };
    }
  }

  /**
   * Export conversation to PDF
   */
  public async exportToPDF(
    conversationId: string,
    userId: string
  ): Promise<ExportResult> {
    try {
      const data = await this.getConversationData(conversationId, userId);
      if (!data) {
        return { success: false, error: 'Conversation not found' };
      }

      return new Promise((resolve) => {
        const doc = new PDFDocument({
          size: 'A4',
          margin: 50,
          bufferPages: true,
        });

        const chunks: Buffer[] = [];
        doc.on('data', (chunk: Buffer) => chunks.push(chunk));
        doc.on('end', () => {
          const buffer = Buffer.concat(chunks);
          const filename = `${this.sanitizeFilename(data.title)}-${Date.now()}.pdf`;
          resolve({
            success: true,
            data: buffer,
            filename,
            mimeType: 'application/pdf',
          });
        });

        // Header
        doc.fontSize(24).fillColor('#1e293b').text('BaatCheet', { align: 'center' });
        doc.moveDown(0.5);
        doc.fontSize(18).fillColor('#334155').text(data.title, { align: 'center' });
        doc.moveDown(0.5);

        // Metadata
        doc.fontSize(10).fillColor('#64748b');
        doc.text(`Model: ${data.model}`, { align: 'center' });
        doc.text(`Created: ${data.createdAt.toLocaleString()}`, { align: 'center' });
        if (data.tags.length > 0) {
          doc.text(`Tags: ${data.tags.join(', ')}`, { align: 'center' });
        }
        doc.moveDown(1);

        // Divider
        doc.strokeColor('#e2e8f0').lineWidth(1)
          .moveTo(50, doc.y).lineTo(545, doc.y).stroke();
        doc.moveDown(1);

        // System prompt
        if (data.systemPrompt) {
          doc.fontSize(10).fillColor('#64748b').text('System Prompt:', { continued: false });
          doc.fontSize(10).fillColor('#475569').text(data.systemPrompt);
          doc.moveDown(1);
        }

        // Messages
        for (const msg of data.messages) {
          const isUser = msg.role === 'user';
          const bgColor = isUser ? '#f1f5f9' : '#ecfdf5';
          const textColor = isUser ? '#1e293b' : '#166534';
          const roleLabel = isUser ? 'You' : 'BaatCheet';

          // Check if we need a new page
          if (doc.y > 700) {
            doc.addPage();
          }

          // Role and timestamp
          doc.fontSize(11).fillColor(textColor).text(roleLabel, { continued: true });
          doc.fontSize(9).fillColor('#94a3b8').text(`  ${msg.createdAt.toLocaleString()}`);
          doc.moveDown(0.3);

          // Message content
          doc.fontSize(11).fillColor('#334155').text(msg.content, {
            width: 495,
            align: 'left',
          });
          doc.moveDown(1);
        }

        // Footer on each page
        const pages = doc.bufferedPageRange();
        for (let i = 0; i < pages.count; i++) {
          doc.switchToPage(i);
          doc.fontSize(8).fillColor('#94a3b8')
            .text(
              `Page ${i + 1} of ${pages.count} | Exported from BaatCheet`,
              50,
              doc.page.height - 30,
              { align: 'center' }
            );
        }

        doc.end();
      });
    } catch (error) {
      logger.error('PDF export failed:', error);
      return { success: false, error: 'Export failed' };
    }
  }

  /**
   * Export in specified format
   */
  public async export(
    conversationId: string,
    userId: string,
    format: 'json' | 'txt' | 'md' | 'pdf'
  ): Promise<ExportResult> {
    switch (format) {
      case 'json':
        return this.exportToJSON(conversationId, userId);
      case 'txt':
        return this.exportToTXT(conversationId, userId);
      case 'md':
        return this.exportToMarkdown(conversationId, userId);
      case 'pdf':
        return this.exportToPDF(conversationId, userId);
      default:
        return { success: false, error: 'Invalid format' };
    }
  }

  /**
   * Sanitize filename
   */
  private sanitizeFilename(name: string): string {
    return name
      .replace(/[^a-zA-Z0-9\s-]/g, '')
      .replace(/\s+/g, '-')
      .substring(0, 50)
      .toLowerCase();
  }
}

// Export singleton instance
export const exportService = new ExportServiceClass();
export default exportService;
