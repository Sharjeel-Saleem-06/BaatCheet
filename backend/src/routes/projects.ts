import { Router, Request, Response } from 'express';
import { prisma } from '../config/database.js';
import { authenticate, validate, schemas } from '../middleware/index.js';
import { logger } from '../utils/logger.js';

const router = Router();

// ============================================
// Project Routes
// ============================================

/**
 * GET /api/v1/projects
 * List all projects for the user
 */
router.get(
  '/',
  authenticate,
  async (req: Request, res: Response): Promise<void> => {
    try {
      const userId = req.user!.userId;

      const projects = await prisma.project.findMany({
        where: { userId },
        include: {
          _count: {
            select: { conversations: true },
          },
        },
        orderBy: { createdAt: 'desc' },
      });

      // Transform to include conversation count
      const items = projects.map((p) => ({
        ...p,
        conversationCount: p._count.conversations,
        _count: undefined,
      }));

      res.json({
        success: true,
        data: items,
      });
    } catch (error) {
      logger.error('List projects error:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to list projects',
      });
    }
  }
);

/**
 * GET /api/v1/projects/:id
 * Get a single project
 */
router.get(
  '/:id',
  authenticate,
  async (req: Request, res: Response): Promise<void> => {
    try {
      const userId = req.user!.userId;
      const { id } = req.params;

      const project = await prisma.project.findFirst({
        where: { id, userId },
        include: {
          _count: {
            select: { conversations: true },
          },
        },
      });

      if (!project) {
        res.status(404).json({
          success: false,
          error: 'Project not found',
        });
        return;
      }

      res.json({
        success: true,
        data: {
          ...project,
          conversationCount: project._count.conversations,
          _count: undefined,
        },
      });
    } catch (error) {
      logger.error('Get project error:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to get project',
      });
    }
  }
);

/**
 * POST /api/v1/projects
 * Create a new project
 */
router.post(
  '/',
  authenticate,
  validate(schemas.createProject),
  async (req: Request, res: Response): Promise<void> => {
    try {
      const userId = req.user!.userId;
      const { name, description, color, icon } = req.body;

      const project = await prisma.project.create({
        data: {
          userId,
          name,
          description,
          color,
          icon,
        },
      });

      res.status(201).json({
        success: true,
        data: project,
        message: 'Project created',
      });
    } catch (error) {
      logger.error('Create project error:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to create project',
      });
    }
  }
);

/**
 * PUT /api/v1/projects/:id
 * Update a project
 */
router.put(
  '/:id',
  authenticate,
  validate(schemas.updateProject),
  async (req: Request, res: Response): Promise<void> => {
    try {
      const userId = req.user!.userId;
      const { id } = req.params;

      // Verify ownership
      const existing = await prisma.project.findFirst({
        where: { id, userId },
      });

      if (!existing) {
        res.status(404).json({
          success: false,
          error: 'Project not found',
        });
        return;
      }

      const project = await prisma.project.update({
        where: { id },
        data: req.body,
      });

      res.json({
        success: true,
        data: project,
        message: 'Project updated',
      });
    } catch (error) {
      logger.error('Update project error:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to update project',
      });
    }
  }
);

/**
 * DELETE /api/v1/projects/:id
 * Delete a project (conversations are unlinked, not deleted)
 */
router.delete(
  '/:id',
  authenticate,
  async (req: Request, res: Response): Promise<void> => {
    try {
      const userId = req.user!.userId;
      const { id } = req.params;

      // Verify ownership
      const existing = await prisma.project.findFirst({
        where: { id, userId },
      });

      if (!existing) {
        res.status(404).json({
          success: false,
          error: 'Project not found',
        });
        return;
      }

      // Delete project (conversations will have projectId set to null)
      await prisma.project.delete({ where: { id } });

      res.json({
        success: true,
        message: 'Project deleted',
      });
    } catch (error) {
      logger.error('Delete project error:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to delete project',
      });
    }
  }
);

/**
 * GET /api/v1/projects/:id/conversations
 * Get all conversations in a project
 */
router.get(
  '/:id/conversations',
  authenticate,
  async (req: Request, res: Response): Promise<void> => {
    try {
      const userId = req.user!.userId;
      const { id } = req.params;

      // Verify project ownership
      const project = await prisma.project.findFirst({
        where: { id, userId },
      });

      if (!project) {
        res.status(404).json({
          success: false,
          error: 'Project not found',
        });
        return;
      }

      const conversations = await prisma.conversation.findMany({
        where: { projectId: id, userId },
        select: {
          id: true,
          title: true,
          model: true,
          tags: true,
          isPinned: true,
          isArchived: true,
          totalTokens: true,
          createdAt: true,
          updatedAt: true,
          _count: {
            select: { messages: true },
          },
        },
        orderBy: [{ isPinned: 'desc' }, { updatedAt: 'desc' }],
      });

      const items = conversations.map((c) => ({
        ...c,
        messageCount: c._count.messages,
        _count: undefined,
      }));

      res.json({
        success: true,
        data: items,
      });
    } catch (error) {
      logger.error('Get project conversations error:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to get project conversations',
      });
    }
  }
);

export default router;
