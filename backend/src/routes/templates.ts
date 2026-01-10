/**
 * Template Routes
 * API endpoints for conversation templates
 * 
 * @module Routes/Templates
 */

import { Router, Request, Response } from 'express';
import { authenticate, validate, schemas } from '../middleware/index.js';
import { templateService } from '../services/TemplateService.js';
import { prisma } from '../config/database.js';
import { logger } from '../utils/logger.js';

const router = Router();

// ============================================
// Template Routes
// ============================================

/**
 * GET /api/v1/templates
 * List all available templates
 */
router.get(
  '/',
  authenticate,
  async (req: Request, res: Response): Promise<void> => {
    try {
      const userId = req.user!.userId;
      const { category } = req.query;

      let templates;
      if (category) {
        templates = await templateService.getTemplatesByCategory(
          category as string,
          userId
        );
      } else {
        templates = await templateService.getTemplates(userId);
      }

      res.json({
        success: true,
        data: templates,
      });
    } catch (error) {
      logger.error('List templates error:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to list templates',
      });
    }
  }
);

/**
 * GET /api/v1/templates/categories
 * Get all template categories
 */
router.get(
  '/categories',
  async (_req: Request, res: Response): Promise<void> => {
    try {
      const categories = templateService.getCategories();

      res.json({
        success: true,
        data: categories,
      });
    } catch (error) {
      logger.error('Get categories error:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to get categories',
      });
    }
  }
);

/**
 * GET /api/v1/templates/:id
 * Get a single template
 */
router.get(
  '/:id',
  authenticate,
  async (req: Request, res: Response): Promise<void> => {
    try {
      const { id } = req.params;

      const template = await templateService.getTemplate(id);

      if (!template) {
        res.status(404).json({
          success: false,
          error: 'Template not found',
        });
        return;
      }

      res.json({
        success: true,
        data: template,
      });
    } catch (error) {
      logger.error('Get template error:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to get template',
      });
    }
  }
);

/**
 * POST /api/v1/templates
 * Create a custom template
 */
router.post(
  '/',
  authenticate,
  async (req: Request, res: Response): Promise<void> => {
    try {
      const userId = req.user!.userId;
      const { name, description, systemPrompt, category, icon, isPublic } = req.body;

      if (!name || !systemPrompt) {
        res.status(400).json({
          success: false,
          error: 'Name and systemPrompt are required',
        });
        return;
      }

      const result = await templateService.createTemplate(userId, {
        name,
        description,
        systemPrompt,
        category,
        icon,
        isPublic,
      });

      if (!result.success) {
        res.status(500).json({
          success: false,
          error: result.error,
        });
        return;
      }

      res.status(201).json({
        success: true,
        data: result.template,
        message: 'Template created',
      });
    } catch (error) {
      logger.error('Create template error:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to create template',
      });
    }
  }
);

/**
 * PUT /api/v1/templates/:id
 * Update a custom template
 */
router.put(
  '/:id',
  authenticate,
  async (req: Request, res: Response): Promise<void> => {
    try {
      const userId = req.user!.userId;
      const { id } = req.params;

      const result = await templateService.updateTemplate(id, userId, req.body);

      if (!result.success) {
        res.status(404).json({
          success: false,
          error: result.error,
        });
        return;
      }

      res.json({
        success: true,
        data: result.template,
        message: 'Template updated',
      });
    } catch (error) {
      logger.error('Update template error:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to update template',
      });
    }
  }
);

/**
 * DELETE /api/v1/templates/:id
 * Delete a custom template
 */
router.delete(
  '/:id',
  authenticate,
  async (req: Request, res: Response): Promise<void> => {
    try {
      const userId = req.user!.userId;
      const { id } = req.params;

      const result = await templateService.deleteTemplate(id, userId);

      if (!result.success) {
        res.status(404).json({
          success: false,
          error: result.error,
        });
        return;
      }

      res.json({
        success: true,
        message: 'Template deleted',
      });
    } catch (error) {
      logger.error('Delete template error:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to delete template',
      });
    }
  }
);

/**
 * POST /api/v1/templates/:id/use
 * Start a conversation from a template
 */
router.post(
  '/:id/use',
  authenticate,
  async (req: Request, res: Response): Promise<void> => {
    try {
      const userId = req.user!.userId;
      const { id } = req.params;
      const { title, projectId } = req.body;

      const template = await templateService.getTemplate(id);

      if (!template) {
        res.status(404).json({
          success: false,
          error: 'Template not found',
        });
        return;
      }

      // Create conversation with template's system prompt
      const conversation = await prisma.conversation.create({
        data: {
          userId,
          title: title || `${template.name} - ${new Date().toLocaleDateString()}`,
          systemPrompt: template.systemPrompt,
          projectId,
        },
      });

      // Increment template usage
      await templateService.incrementUsage(id);

      res.status(201).json({
        success: true,
        data: conversation,
        message: 'Conversation created from template',
      });
    } catch (error) {
      logger.error('Use template error:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to create conversation from template',
      });
    }
  }
);

export default router;
