import { Router, Request, Response } from 'express';
import { v4 as uuidv4 } from 'uuid';
import { Project } from '../models/Project.js';
import { Conversation } from '../models/Conversation.js';
import { authenticate, validate, schemas } from '../middleware/index.js';
import { logger } from '../utils/logger.js';

const router = Router();

// ============================================
// Project Routes
// ============================================

// GET /api/v1/projects - List all projects
router.get(
  '/',
  authenticate,
  async (req: Request, res: Response): Promise<void> => {
    try {
      const userId = req.user!.userId;

      const projects = await Project.find({ userId }).sort({ createdAt: -1 });

      res.json({
        success: true,
        data: projects,
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

// GET /api/v1/projects/:id - Get single project
router.get(
  '/:id',
  authenticate,
  async (req: Request, res: Response): Promise<void> => {
    try {
      const userId = req.user!.userId;
      const { id } = req.params;

      const project = await Project.findOne({ projectId: id, userId });

      if (!project) {
        res.status(404).json({
          success: false,
          error: 'Project not found',
        });
        return;
      }

      res.json({
        success: true,
        data: project,
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

// POST /api/v1/projects - Create new project
router.post(
  '/',
  authenticate,
  validate(schemas.createProject),
  async (req: Request, res: Response): Promise<void> => {
    try {
      const userId = req.user!.userId;
      const { name, description, color, icon } = req.body;

      const project = new Project({
        projectId: uuidv4(),
        userId,
        name,
        description,
        color,
        icon,
      });

      await project.save();

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

// PUT /api/v1/projects/:id - Update project
router.put(
  '/:id',
  authenticate,
  async (req: Request, res: Response): Promise<void> => {
    try {
      const userId = req.user!.userId;
      const { id } = req.params;
      const { name, description, color, icon } = req.body;

      const project = await Project.findOneAndUpdate(
        { projectId: id, userId },
        { $set: { name, description, color, icon } },
        { new: true }
      );

      if (!project) {
        res.status(404).json({
          success: false,
          error: 'Project not found',
        });
        return;
      }

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

// DELETE /api/v1/projects/:id - Delete project
router.delete(
  '/:id',
  authenticate,
  async (req: Request, res: Response): Promise<void> => {
    try {
      const userId = req.user!.userId;
      const { id } = req.params;

      const project = await Project.findOneAndDelete({ projectId: id, userId });

      if (!project) {
        res.status(404).json({
          success: false,
          error: 'Project not found',
        });
        return;
      }

      // Optionally: Remove project reference from conversations
      await Conversation.updateMany(
        { projectId: id, userId },
        { $set: { projectId: null } }
      );

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

// GET /api/v1/projects/:id/conversations - Get project conversations
router.get(
  '/:id/conversations',
  authenticate,
  async (req: Request, res: Response): Promise<void> => {
    try {
      const userId = req.user!.userId;
      const { id } = req.params;

      // Verify project exists
      const project = await Project.findOne({ projectId: id, userId });
      if (!project) {
        res.status(404).json({
          success: false,
          error: 'Project not found',
        });
        return;
      }

      const conversations = await Conversation.find({
        projectId: id,
        userId,
      })
        .select('conversationId title model tags isPinned createdAt updatedAt')
        .sort({ updatedAt: -1 });

      res.json({
        success: true,
        data: conversations,
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
