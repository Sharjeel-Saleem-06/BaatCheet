import { Router, Request, Response } from 'express';
import { prisma } from '../config/database.js';
import { clerkAuth, validate, schemas } from '../middleware/index.js';
import { logger } from '../utils/logger.js';
import { aiRouter } from '../services/AIRouter.js';

const router = Router();

// ============================================
// Project Context Service
// ============================================

/**
 * Update project context based on conversations
 * This helps AI understand what the project is about
 * Exported for use by ChatService after new messages
 */
export async function updateProjectContext(projectId: string): Promise<void> {
  try {
    // Get recent conversations in this project
    const conversations = await prisma.conversation.findMany({
      where: { projectId },
      include: {
        messages: {
          orderBy: { createdAt: 'desc' },
          take: 10, // Last 10 messages per conversation
          where: { role: { in: ['user', 'assistant'] } },
        },
      },
      orderBy: { updatedAt: 'desc' },
      take: 10, // Last 10 conversations
    });

    if (conversations.length === 0) return;

    // Collect all topics and content
    const allMessages = conversations.flatMap(c => c.messages);
    const allTitles = conversations.map(c => c.title);
    const allTags = [...new Set(conversations.flatMap(c => c.tags))];

    // Build context summary using AI
    const contextPrompt = `Analyze these conversation titles and messages from a project. 
Provide a brief summary (2-3 sentences) of what this project is about, its main goals, and technologies used.

Conversation Titles:
${allTitles.join('\n')}

Sample Messages:
${allMessages.slice(0, 20).map(m => `${m.role}: ${m.content.substring(0, 200)}`).join('\n')}

Tags: ${allTags.join(', ')}

Respond in JSON format:
{
  "summary": "Brief project description",
  "keyTopics": ["topic1", "topic2"],
  "techStack": ["tech1", "tech2"],
  "goals": ["goal1", "goal2"]
}`;

    const result = await aiRouter.chat({
      messages: [{ role: 'user', content: contextPrompt }],
      maxTokens: 500,
    });

    if (result.success && result.content) {
      try {
        // Parse JSON from response
        const jsonMatch = result.content.match(/\{[\s\S]*\}/);
        if (jsonMatch) {
          const parsed = JSON.parse(jsonMatch[0]);
          
          await prisma.project.update({
            where: { id: projectId },
            data: {
              context: parsed.summary || null,
              keyTopics: parsed.keyTopics || [],
              techStack: parsed.techStack || [],
              goals: parsed.goals || [],
              lastContextUpdate: new Date(),
            },
          });
          
          logger.info('Project context updated', { projectId });
        }
      } catch (parseError) {
        logger.warn('Failed to parse project context JSON', { projectId, error: parseError });
      }
    }
  } catch (error) {
    logger.error('Update project context error:', error);
  }
}

// ============================================
// Project Routes
// ============================================

/**
 * GET /api/v1/projects
 * List all projects for the user
 */
router.get(
  '/',
  clerkAuth,
  async (req: Request, res: Response): Promise<void> => {
    try {
      const userId = req.user!.id;

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

// ============================================
// Static routes MUST come before dynamic /:id routes
// ============================================

/**
 * GET /api/v1/projects/collaborations
 * Get all projects where user is a collaborator (not owner)
 */
router.get(
  '/collaborations',
  clerkAuth,
  async (req: Request, res: Response): Promise<void> => {
    try {
      const userId = req.user!.id;

      const collaborations = await prisma.projectCollaborator.findMany({
        where: { userId },
        include: {
          project: {
            include: {
              user: {
                select: { id: true, username: true, firstName: true, avatar: true },
              },
              _count: { select: { conversations: true } },
            },
          },
        },
        orderBy: { addedAt: 'desc' },
      });

      const items = collaborations.map(c => ({
        ...c.project,
        conversationCount: c.project._count.conversations,
        myRole: c.role,
        owner: c.project.user,
        _count: undefined,
      }));

      res.json({
        success: true,
        data: items,
      });
    } catch (error) {
      logger.error('Get collaborations error:', error);
      res.status(500).json({ success: false, error: 'Failed to get collaborations' });
    }
  }
);

/**
 * GET /api/v1/projects/:id
 * Get a single project
 */
router.get(
  '/:id',
  clerkAuth,
  async (req: Request, res: Response): Promise<void> => {
    try {
      const userId = req.user!.id;
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
  clerkAuth,
  validate(schemas.createProject),
  async (req: Request, res: Response): Promise<void> => {
    try {
      const userId = req.user!.id;
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
  clerkAuth,
  validate(schemas.updateProject),
  async (req: Request, res: Response): Promise<void> => {
    try {
      const userId = req.user!.id;
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
  clerkAuth,
  async (req: Request, res: Response): Promise<void> => {
    try {
      const userId = req.user!.id;
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
  clerkAuth,
  async (req: Request, res: Response): Promise<void> => {
    try {
      const userId = req.user!.id;
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

// ============================================
// Project Context Endpoints
// ============================================

/**
 * GET /api/v1/projects/:id/context
 * Get project context (what the project is about)
 */
router.get(
  '/:id/context',
  clerkAuth,
  async (req: Request, res: Response): Promise<void> => {
    try {
      const userId = req.user!.id;
      const { id } = req.params;

      const project = await prisma.project.findFirst({
        where: { 
          id,
          OR: [
            { userId },
            { collaborators: { some: { userId } } },
          ],
        },
        select: {
          id: true,
          name: true,
          context: true,
          keyTopics: true,
          techStack: true,
          goals: true,
          lastContextUpdate: true,
        },
      });

      if (!project) {
        res.status(404).json({ success: false, error: 'Project not found' });
        return;
      }

      res.json({
        success: true,
        data: project,
      });
    } catch (error) {
      logger.error('Get project context error:', error);
      res.status(500).json({ success: false, error: 'Failed to get project context' });
    }
  }
);

/**
 * POST /api/v1/projects/:id/context/refresh
 * Refresh project context (AI re-analyzes conversations)
 */
router.post(
  '/:id/context/refresh',
  clerkAuth,
  async (req: Request, res: Response): Promise<void> => {
    try {
      const userId = req.user!.id;
      const { id } = req.params;

      // Verify ownership
      const project = await prisma.project.findFirst({
        where: { id, userId },
      });

      if (!project) {
        res.status(404).json({ success: false, error: 'Project not found' });
        return;
      }

      // Update context in background
      updateProjectContext(id);

      res.json({
        success: true,
        message: 'Context refresh started. Check back in a few seconds.',
      });
    } catch (error) {
      logger.error('Refresh project context error:', error);
      res.status(500).json({ success: false, error: 'Failed to refresh context' });
    }
  }
);

// ============================================
// Collaboration Endpoints
// ============================================

/**
 * POST /api/v1/projects/:id/invite
 * Invite a collaborator to a project
 */
router.post(
  '/:id/invite',
  clerkAuth,
  async (req: Request, res: Response): Promise<void> => {
    try {
      const userId = req.user!.id;
      const { id } = req.params;
      const { email, role = 'viewer', message } = req.body;

      if (!email) {
        res.status(400).json({ success: false, error: 'Email is required' });
        return;
      }

      // Verify project ownership
      const project = await prisma.project.findFirst({
        where: { id, userId },
      });

      if (!project) {
        res.status(404).json({ success: false, error: 'Project not found or not owner' });
        return;
      }

      // Check if user exists in system
      const invitee = await prisma.user.findUnique({
        where: { email: email.toLowerCase() },
      });

      // Check if already a collaborator
      if (invitee) {
        const existing = await prisma.projectCollaborator.findUnique({
          where: { projectId_userId: { projectId: id, userId: invitee.id } },
        });
        if (existing) {
          res.status(400).json({ success: false, error: 'User is already a collaborator' });
          return;
        }
      }

      // Check if invitation already pending
      const pendingInvite = await prisma.projectInvitation.findFirst({
        where: { 
          projectId: id, 
          inviteeEmail: email.toLowerCase(),
          status: 'pending',
        },
      });

      if (pendingInvite) {
        res.status(400).json({ success: false, error: 'Invitation already pending for this email' });
        return;
      }

      // Create invitation
      const invitation = await prisma.projectInvitation.create({
        data: {
          projectId: id,
          inviterId: userId,
          inviteeEmail: email.toLowerCase(),
          inviteeId: invitee?.id || null,
          role,
          message,
          expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000), // 7 days
        },
      });

      logger.info('Project invitation sent', { projectId: id, inviteeEmail: email });

      res.json({
        success: true,
        data: invitation,
        message: invitee 
          ? 'Invitation sent to existing user' 
          : 'Invitation created. User will see it when they sign up with this email.',
      });
    } catch (error) {
      logger.error('Invite collaborator error:', error);
      res.status(500).json({ success: false, error: 'Failed to send invitation' });
    }
  }
);

/**
 * GET /api/v1/projects/invitations/pending
 * Get pending invitations for current user
 */
router.get(
  '/invitations/pending',
  clerkAuth,
  async (req: Request, res: Response): Promise<void> => {
    try {
      const userId = req.user!.id;
      const user = await prisma.user.findUnique({ where: { id: userId } });

      if (!user) {
        res.status(404).json({ success: false, error: 'User not found' });
        return;
      }

      const invitations = await prisma.projectInvitation.findMany({
        where: {
          OR: [
            { inviteeId: userId },
            { inviteeEmail: user.email.toLowerCase() },
          ],
          status: 'pending',
          expiresAt: { gt: new Date() },
        },
        include: {
          project: {
            select: {
              id: true,
              name: true,
              description: true,
              color: true,
              icon: true,
            },
          },
        },
        orderBy: { createdAt: 'desc' },
      });

      // Get inviter info
      const invitersIds = [...new Set(invitations.map(i => i.inviterId))];
      const inviters = await prisma.user.findMany({
        where: { id: { in: invitersIds } },
        select: { id: true, username: true, firstName: true, lastName: true, email: true },
      });
      const inviterMap = new Map(inviters.map(u => [u.id, u]));

      const items = invitations.map(inv => ({
        ...inv,
        inviter: inviterMap.get(inv.inviterId) || null,
      }));

      res.json({
        success: true,
        data: items,
      });
    } catch (error) {
      logger.error('Get pending invitations error:', error);
      res.status(500).json({ success: false, error: 'Failed to get invitations' });
    }
  }
);

/**
 * POST /api/v1/projects/invitations/:invitationId/respond
 * Accept or reject an invitation
 */
router.post(
  '/invitations/:invitationId/respond',
  clerkAuth,
  async (req: Request, res: Response): Promise<void> => {
    try {
      const userId = req.user!.id;
      const { invitationId } = req.params;
      const { accept } = req.body;

      const user = await prisma.user.findUnique({ where: { id: userId } });
      if (!user) {
        res.status(404).json({ success: false, error: 'User not found' });
        return;
      }

      const invitation = await prisma.projectInvitation.findFirst({
        where: {
          id: invitationId,
          OR: [
            { inviteeId: userId },
            { inviteeEmail: user.email.toLowerCase() },
          ],
          status: 'pending',
        },
      });

      if (!invitation) {
        res.status(404).json({ success: false, error: 'Invitation not found or expired' });
        return;
      }

      if (accept) {
        // Add as collaborator
        await prisma.projectCollaborator.create({
          data: {
            projectId: invitation.projectId,
            userId: userId,
            role: invitation.role,
            addedBy: invitation.inviterId,
          },
        });
      }

      // Update invitation status
      await prisma.projectInvitation.update({
        where: { id: invitationId },
        data: {
          status: accept ? 'accepted' : 'rejected',
          respondedAt: new Date(),
        },
      });

      logger.info('Invitation responded', { invitationId, accept, userId });

      res.json({
        success: true,
        message: accept ? 'You are now a collaborator on this project' : 'Invitation declined',
      });
    } catch (error) {
      logger.error('Respond to invitation error:', error);
      res.status(500).json({ success: false, error: 'Failed to respond to invitation' });
    }
  }
);

/**
 * GET /api/v1/projects/:id/collaborators
 * Get all collaborators for a project
 */
router.get(
  '/:id/collaborators',
  clerkAuth,
  async (req: Request, res: Response): Promise<void> => {
    try {
      const userId = req.user!.id;
      const { id } = req.params;

      // Verify access (owner or collaborator)
      const project = await prisma.project.findFirst({
        where: {
          id,
          OR: [
            { userId },
            { collaborators: { some: { userId } } },
          ],
        },
      });

      if (!project) {
        res.status(404).json({ success: false, error: 'Project not found' });
        return;
      }

      const collaborators = await prisma.projectCollaborator.findMany({
        where: { projectId: id },
        orderBy: { addedAt: 'asc' },
      });

      // Get user info
      const userIds = collaborators.map(c => c.userId);
      const users = await prisma.user.findMany({
        where: { id: { in: userIds } },
        select: { id: true, username: true, firstName: true, lastName: true, email: true, avatar: true },
      });
      const userMap = new Map(users.map(u => [u.id, u]));

      const items = collaborators.map(c => ({
        ...c,
        user: userMap.get(c.userId) || null,
      }));

      // Add owner
      const owner = await prisma.user.findUnique({
        where: { id: project.userId },
        select: { id: true, username: true, firstName: true, lastName: true, email: true, avatar: true },
      });

      res.json({
        success: true,
        data: {
          owner,
          collaborators: items,
        },
      });
    } catch (error) {
      logger.error('Get collaborators error:', error);
      res.status(500).json({ success: false, error: 'Failed to get collaborators' });
    }
  }
);

/**
 * DELETE /api/v1/projects/:id/collaborators/:collaboratorId
 * Remove a collaborator from project
 */
router.delete(
  '/:id/collaborators/:collaboratorId',
  clerkAuth,
  async (req: Request, res: Response): Promise<void> => {
    try {
      const userId = req.user!.id;
      const { id, collaboratorId } = req.params;

      // Verify ownership
      const project = await prisma.project.findFirst({
        where: { id, userId },
      });

      if (!project) {
        res.status(404).json({ success: false, error: 'Project not found or not owner' });
        return;
      }

      await prisma.projectCollaborator.deleteMany({
        where: { projectId: id, userId: collaboratorId },
      });

      logger.info('Collaborator removed', { projectId: id, collaboratorId });

      res.json({
        success: true,
        message: 'Collaborator removed',
      });
    } catch (error) {
      logger.error('Remove collaborator error:', error);
      res.status(500).json({ success: false, error: 'Failed to remove collaborator' });
    }
  }
);

export default router;
