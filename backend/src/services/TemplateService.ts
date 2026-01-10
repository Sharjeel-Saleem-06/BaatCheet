/**
 * Template Service
 * Handles conversation templates for quick-start
 * 
 * @module TemplateService
 */

import { prisma } from '../config/database.js';
import { logger } from '../utils/logger.js';

// ============================================
// Types
// ============================================

export interface Template {
  id: string;
  name: string;
  description?: string | null;
  systemPrompt: string;
  category: string;
  icon: string;
  isDefault: boolean;
  isPublic: boolean;
  usageCount: number;
  userId?: string | null;
  createdAt: Date;
}

// ============================================
// Default Templates
// ============================================

const DEFAULT_TEMPLATES = [
  {
    name: 'General Assistant',
    description: 'A helpful AI assistant for any task',
    systemPrompt: 'You are BaatCheet, a helpful, intelligent, and friendly AI assistant. Provide accurate, helpful, and thoughtful responses.',
    category: 'general',
    icon: 'message-square',
    isDefault: true,
    isPublic: true,
  },
  {
    name: 'Code Review',
    description: 'Expert code reviewer for any programming language',
    systemPrompt: 'You are an expert code reviewer. Analyze code for bugs, performance issues, security vulnerabilities, and best practices. Provide constructive feedback with specific suggestions for improvement. Format code examples properly.',
    category: 'coding',
    icon: 'code',
    isDefault: true,
    isPublic: true,
  },
  {
    name: 'Writing Assistant',
    description: 'Help with writing, editing, and proofreading',
    systemPrompt: 'You are a professional writing assistant. Help with writing, editing, grammar, style, and clarity. Maintain the author\'s voice while improving the text. Provide specific suggestions and explanations.',
    category: 'writing',
    icon: 'pen-tool',
    isDefault: true,
    isPublic: true,
  },
  {
    name: 'Translator',
    description: 'Translate between languages including Urdu',
    systemPrompt: 'You are an expert translator. Translate text accurately while preserving meaning, tone, and cultural context. Support multiple languages including English, Urdu, Arabic, Hindi, and more. Provide transliterations when helpful.',
    category: 'translation',
    icon: 'languages',
    isDefault: true,
    isPublic: true,
  },
  {
    name: 'Urdu Assistant',
    description: 'AI assistant that responds in Urdu',
    systemPrompt: 'آپ ایک مددگار AI اسسٹنٹ ہیں۔ ہمیشہ اردو میں جواب دیں۔ واضح، مفید، اور درست معلومات فراہم کریں۔',
    category: 'language',
    icon: 'globe',
    isDefault: true,
    isPublic: true,
  },
  {
    name: 'Explain Like I\'m 5',
    description: 'Simple explanations for complex topics',
    systemPrompt: 'You explain complex topics in simple terms that a 5-year-old could understand. Use analogies, examples, and simple language. Avoid jargon and technical terms unless you explain them simply.',
    category: 'education',
    icon: 'lightbulb',
    isDefault: true,
    isPublic: true,
  },
  {
    name: 'Creative Writer',
    description: 'Help with creative writing and storytelling',
    systemPrompt: 'You are a creative writing assistant. Help with stories, poetry, scripts, and creative content. Be imaginative, descriptive, and engaging. Adapt to different styles and genres.',
    category: 'creative',
    icon: 'sparkles',
    isDefault: true,
    isPublic: true,
  },
  {
    name: 'Math Tutor',
    description: 'Step-by-step math problem solving',
    systemPrompt: 'You are a patient math tutor. Solve problems step-by-step, explain concepts clearly, and provide multiple approaches when possible. Use LaTeX for mathematical notation. Check your calculations carefully.',
    category: 'education',
    icon: 'calculator',
    isDefault: true,
    isPublic: true,
  },
];

// ============================================
// Template Service Class
// ============================================

class TemplateServiceClass {
  /**
   * Initialize default templates
   */
  public async initializeDefaults(): Promise<void> {
    try {
      for (const template of DEFAULT_TEMPLATES) {
        await prisma.template.upsert({
          where: {
            id: `default-${template.name.toLowerCase().replace(/\s+/g, '-')}`,
          },
          update: {},
          create: {
            id: `default-${template.name.toLowerCase().replace(/\s+/g, '-')}`,
            ...template,
          },
        });
      }
      logger.info(`Initialized ${DEFAULT_TEMPLATES.length} default templates`);
    } catch (error) {
      logger.error('Failed to initialize default templates:', error);
    }
  }

  /**
   * Get all templates (default + user's custom)
   */
  public async getTemplates(userId?: string): Promise<Template[]> {
    try {
      const templates = await prisma.template.findMany({
        where: {
          OR: [
            { isDefault: true },
            { isPublic: true },
            ...(userId ? [{ userId }] : []),
          ],
        },
        orderBy: [
          { isDefault: 'desc' },
          { usageCount: 'desc' },
          { name: 'asc' },
        ],
      });

      return templates;
    } catch (error) {
      logger.error('Failed to get templates:', error);
      return [];
    }
  }

  /**
   * Get templates by category
   */
  public async getTemplatesByCategory(
    category: string,
    userId?: string
  ): Promise<Template[]> {
    try {
      const templates = await prisma.template.findMany({
        where: {
          category,
          OR: [
            { isDefault: true },
            { isPublic: true },
            ...(userId ? [{ userId }] : []),
          ],
        },
        orderBy: { usageCount: 'desc' },
      });

      return templates;
    } catch (error) {
      logger.error('Failed to get templates by category:', error);
      return [];
    }
  }

  /**
   * Get a single template
   */
  public async getTemplate(templateId: string): Promise<Template | null> {
    try {
      const template = await prisma.template.findUnique({
        where: { id: templateId },
      });

      return template;
    } catch (error) {
      logger.error('Failed to get template:', error);
      return null;
    }
  }

  /**
   * Create a custom template
   */
  public async createTemplate(
    userId: string,
    data: {
      name: string;
      description?: string;
      systemPrompt: string;
      category?: string;
      icon?: string;
      isPublic?: boolean;
    }
  ): Promise<{ success: boolean; template?: Template; error?: string }> {
    try {
      const template = await prisma.template.create({
        data: {
          userId,
          name: data.name,
          description: data.description,
          systemPrompt: data.systemPrompt,
          category: data.category || 'custom',
          icon: data.icon || 'file-text',
          isPublic: data.isPublic ?? false,
        },
      });

      return { success: true, template };
    } catch (error) {
      logger.error('Failed to create template:', error);
      return { success: false, error: 'Failed to create template' };
    }
  }

  /**
   * Update a custom template
   */
  public async updateTemplate(
    templateId: string,
    userId: string,
    data: Partial<{
      name: string;
      description: string;
      systemPrompt: string;
      category: string;
      icon: string;
      isPublic: boolean;
    }>
  ): Promise<{ success: boolean; template?: Template; error?: string }> {
    try {
      // Verify ownership
      const existing = await prisma.template.findFirst({
        where: { id: templateId, userId },
      });

      if (!existing) {
        return { success: false, error: 'Template not found' };
      }

      if (existing.isDefault) {
        return { success: false, error: 'Cannot modify default templates' };
      }

      const template = await prisma.template.update({
        where: { id: templateId },
        data,
      });

      return { success: true, template };
    } catch (error) {
      logger.error('Failed to update template:', error);
      return { success: false, error: 'Failed to update template' };
    }
  }

  /**
   * Delete a custom template
   */
  public async deleteTemplate(
    templateId: string,
    userId: string
  ): Promise<{ success: boolean; error?: string }> {
    try {
      const existing = await prisma.template.findFirst({
        where: { id: templateId, userId },
      });

      if (!existing) {
        return { success: false, error: 'Template not found' };
      }

      if (existing.isDefault) {
        return { success: false, error: 'Cannot delete default templates' };
      }

      await prisma.template.delete({
        where: { id: templateId },
      });

      return { success: true };
    } catch (error) {
      logger.error('Failed to delete template:', error);
      return { success: false, error: 'Failed to delete template' };
    }
  }

  /**
   * Increment template usage count
   */
  public async incrementUsage(templateId: string): Promise<void> {
    try {
      await prisma.template.update({
        where: { id: templateId },
        data: { usageCount: { increment: 1 } },
      });
    } catch (error) {
      logger.error('Failed to increment template usage:', error);
    }
  }

  /**
   * Get template categories
   */
  public getCategories(): Array<{ id: string; name: string; icon: string }> {
    return [
      { id: 'general', name: 'General', icon: 'message-square' },
      { id: 'coding', name: 'Coding', icon: 'code' },
      { id: 'writing', name: 'Writing', icon: 'pen-tool' },
      { id: 'translation', name: 'Translation', icon: 'languages' },
      { id: 'education', name: 'Education', icon: 'graduation-cap' },
      { id: 'creative', name: 'Creative', icon: 'sparkles' },
      { id: 'language', name: 'Language', icon: 'globe' },
      { id: 'custom', name: 'Custom', icon: 'file-text' },
    ];
  }
}

// Export singleton instance
export const templateService = new TemplateServiceClass();
export default templateService;
