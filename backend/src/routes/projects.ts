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
 * List all projects for the user (owned + collaborations)
 */
router.get(
  '/',
  clerkAuth,
  async (req: Request, res: Response): Promise<void> => {
    try {
      const userId = req.user!.id;
      const { includeArchived } = req.query;

      // Get owned projects
      const ownedProjects = await prisma.project.findMany({
        where: { 
          userId,
          isArchived: includeArchived === 'true' ? undefined : false,
        },
        include: {
          _count: {
            select: { conversations: true, collaborators: true },
          },
          collaborators: {
            take: 5,
            include: {
              // We need user info but can't include it directly here
            },
          },
        },
        orderBy: { updatedAt: 'desc' },
      });

      // Transform to include counts and role
      const items = ownedProjects.map((p) => ({
        id: p.id,
        name: p.name,
        description: p.description,
        color: p.color,
        icon: p.icon,
        emoji: p.emoji,
        isArchived: p.isArchived,
        context: p.context,
        keyTopics: p.keyTopics,
        techStack: p.techStack,
        goals: p.goals,
        constraints: p.constraints,
        targetAudience: p.targetAudience,
        communicationStyle: p.communicationStyle,
        preferredLanguage: p.preferredLanguage,
        domainExpertise: p.domainExpertise,
        customInstructions: p.customInstructions,
        lastContextUpdate: p.lastContextUpdate,
        messageCount: p.messageCount,
        conversationCount: p._count.conversations,
        collaboratorCount: p._count.collaborators,
        myRole: 'admin', // Owner is always admin
        isOwner: true,
        createdAt: p.createdAt,
        updatedAt: p.updatedAt,
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
                select: { id: true, username: true, firstName: true, lastName: true, avatar: true, email: true },
              },
              _count: { select: { conversations: true, collaborators: true } },
            },
          },
        },
        orderBy: { addedAt: 'desc' },
      });

      // Update last accessed
      await prisma.projectCollaborator.updateMany({
        where: { userId },
        data: { 
          lastAccessedAt: new Date(),
          accessCount: { increment: 1 },
        },
      });

      const items = collaborations.map(c => ({
        id: c.project.id,
        name: c.project.name,
        description: c.project.description,
        color: c.project.color,
        icon: c.project.icon,
        emoji: c.project.emoji,
        context: c.project.context,
        keyTopics: c.project.keyTopics,
        techStack: c.project.techStack,
        goals: c.project.goals,
        conversationCount: c.project._count.conversations,
        collaboratorCount: c.project._count.collaborators,
        myRole: c.role,
        canEdit: c.canEdit,
        canDelete: c.canDelete,
        canInvite: c.canInvite,
        canManageRoles: c.canManageRoles,
        isOwner: false,
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
 * Get a single project with full details (owner or collaborator)
 */
router.get(
  '/:id',
  clerkAuth,
  async (req: Request, res: Response): Promise<void> => {
    try {
      const userId = req.user!.id;
      const { id } = req.params;

      // Check if user is owner or collaborator
      const project = await prisma.project.findFirst({
        where: { 
          id,
          OR: [
            { userId },
            { collaborators: { some: { userId } } },
          ],
        },
        include: {
          user: {
            select: { id: true, username: true, firstName: true, lastName: true, avatar: true, email: true },
          },
          _count: {
            select: { conversations: true, collaborators: true },
          },
          collaborators: {
            include: {
              // Get user info for collaborators
            },
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

      // Get user's role in this project
      const isOwner = project.userId === userId;
      let myRole = isOwner ? 'admin' : 'viewer';
      let permissions = { canEdit: isOwner, canDelete: isOwner, canInvite: isOwner, canManageRoles: isOwner };

      if (!isOwner) {
        const collaboration = await prisma.projectCollaborator.findUnique({
          where: { projectId_userId: { projectId: id, userId } },
        });
        if (collaboration) {
          myRole = collaboration.role;
          permissions = {
            canEdit: collaboration.canEdit,
            canDelete: collaboration.canDelete,
            canInvite: collaboration.canInvite,
            canManageRoles: collaboration.canManageRoles,
          };
        }
      }

      // Get collaborator user info
      const collaboratorUserIds = project.collaborators.map(c => c.userId);
      const collaboratorUsers = await prisma.user.findMany({
        where: { id: { in: collaboratorUserIds } },
        select: { id: true, username: true, firstName: true, lastName: true, avatar: true, email: true },
      });
      const userMap = new Map(collaboratorUsers.map(u => [u.id, u]));

      res.json({
        success: true,
        data: {
          id: project.id,
          name: project.name,
          description: project.description,
          color: project.color,
          icon: project.icon,
          emoji: project.emoji,
          isArchived: project.isArchived,
          context: project.context,
          keyTopics: project.keyTopics,
          techStack: project.techStack,
          goals: project.goals,
          constraints: project.constraints,
          targetAudience: project.targetAudience,
          communicationStyle: project.communicationStyle,
          preferredLanguage: project.preferredLanguage,
          domainExpertise: project.domainExpertise,
          customInstructions: project.customInstructions,
          lastContextUpdate: project.lastContextUpdate,
          messageCount: project.messageCount,
          conversationCount: project._count.conversations,
          collaboratorCount: project._count.collaborators,
          myRole,
          isOwner,
          ...permissions,
          owner: project.user,
          collaborators: project.collaborators.map(c => ({
            id: c.id,
            userId: c.userId,
            role: c.role,
            canEdit: c.canEdit,
            canDelete: c.canDelete,
            canInvite: c.canInvite,
            canManageRoles: c.canManageRoles,
            addedAt: c.addedAt,
            user: userMap.get(c.userId),
          })),
          createdAt: project.createdAt,
          updatedAt: project.updatedAt,
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
 * Create a new project with advanced context options
 */
router.post(
  '/',
  clerkAuth,
  validate(schemas.createProject),
  async (req: Request, res: Response): Promise<void> => {
    try {
      const userId = req.user!.id;
      const { 
        name, 
        description, 
        color, 
        icon,
        emoji,
        targetAudience,
        communicationStyle,
        preferredLanguage,
        domainExpertise,
        customInstructions,
        constraints,
        goals,
      } = req.body;

      const project = await prisma.project.create({
        data: {
          userId,
          name,
          description,
          color: color || '#1e293b',
          icon: icon || 'folder',
          emoji,
          targetAudience,
          communicationStyle,
          preferredLanguage,
          domainExpertise: domainExpertise || [],
          customInstructions,
          constraints: constraints || [],
          goals: goals || [],
        },
        include: {
          _count: { select: { conversations: true, collaborators: true } },
        },
      });

      res.status(201).json({
        success: true,
        data: {
          ...project,
          conversationCount: project._count.conversations,
          collaboratorCount: project._count.collaborators,
          myRole: 'admin',
          isOwner: true,
          _count: undefined,
        },
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
 * - Name & Emoji: Only owner/admin can change
 * - Description & Instructions: Anyone with canEdit permission
 */
router.put(
  '/:id',
  clerkAuth,
  validate(schemas.updateProject),
  async (req: Request, res: Response): Promise<void> => {
    try {
      const userId = req.user!.id;
      const { id } = req.params;
      const { name, description, emoji, instructions } = req.body;

      // Check if user is owner or has edit permission
      const project = await prisma.project.findFirst({
        where: { id },
        include: {
          collaborators: {
            where: { userId },
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

      const isOwner = project.userId === userId;
      const collaborator = project.collaborators[0];
      const isAdmin = collaborator?.role === 'admin';
      const canEdit = isOwner || collaborator?.canEdit;
      const canChangeNameAndEmoji = isOwner || isAdmin; // Only owner or admin

      if (!canEdit) {
        res.status(403).json({
          success: false,
          error: 'You do not have permission to edit this project',
        });
        return;
      }

      // Check if trying to change name/emoji without admin rights
      if ((name !== undefined || emoji !== undefined) && !canChangeNameAndEmoji) {
        res.status(403).json({
          success: false,
          error: 'Only the project owner or admin can change the project name and emoji',
        });
        return;
      }

      // Build update data
      const updateData: Record<string, any> = {};
      // Only owner/admin can change name and emoji
      if (name !== undefined && canChangeNameAndEmoji) updateData.name = name;
      if (emoji !== undefined && canChangeNameAndEmoji) updateData.emoji = emoji;
      // Anyone with canEdit can change description and instructions
      if (description !== undefined) updateData.description = description;
      if (instructions !== undefined) updateData.customInstructions = instructions;

      const updatedProject = await prisma.project.update({
        where: { id },
        data: updateData,
        include: {
          _count: {
            select: { conversations: true },
          },
        },
      });

      res.json({
        success: true,
        data: {
          ...updatedProject,
          conversationCount: updatedProject._count.conversations,
          _count: undefined,
        },
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
 * Delete a project (only owner or admin collaborator can delete)
 */
router.delete(
  '/:id',
  clerkAuth,
  async (req: Request, res: Response): Promise<void> => {
    try {
      const userId = req.user!.id;
      const { id } = req.params;

      // Check if user is owner or has delete permission
      const project = await prisma.project.findFirst({
        where: { id },
        include: {
          collaborators: {
            where: { userId },
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

      const isOwner = project.userId === userId;
      const collaborator = project.collaborators[0];
      const canDelete = isOwner || collaborator?.canDelete;

      if (!canDelete) {
        res.status(403).json({
          success: false,
          error: 'You do not have permission to delete this project',
        });
        return;
      }

      // Delete all collaborators first
      await prisma.projectCollaborator.deleteMany({
        where: { projectId: id },
      });

      // Delete all invitations
      await prisma.projectInvitation.deleteMany({
        where: { projectId: id },
      });

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
 * Get all conversations in a project (owner and collaborators can access)
 */
router.get(
  '/:id/conversations',
  clerkAuth,
  async (req: Request, res: Response): Promise<void> => {
    try {
      const userId = req.user!.id;
      const { id } = req.params;

      // Verify user is owner or collaborator
      const project = await prisma.project.findFirst({
        where: { 
          id,
          OR: [
            { userId },
            { collaborators: { some: { userId } } },
          ],
        },
        include: {
          collaborators: {
            where: { userId },
          },
        },
      });

      if (!project) {
        res.status(404).json({
          success: false,
          error: 'Project not found or you do not have access',
        });
        return;
      }

      // Get all conversations in the project (not filtered by userId for shared projects)
      const conversations = await prisma.conversation.findMany({
        where: { projectId: id },
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
          userId: true,
          user: {
            select: {
              id: true,
              firstName: true,
              lastName: true,
              email: true,
              avatar: true,
            },
          },
          _count: {
            select: { messages: true },
          },
        },
        orderBy: [{ isPinned: 'desc' }, { updatedAt: 'desc' }],
      });

      const items = conversations.map((c) => ({
        ...c,
        messageCount: c._count.messages,
        isOwner: c.userId === userId,
        createdBy: c.user,
        user: undefined,
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
 * GET /api/v1/projects/check-email/:email
 * Check if a user exists by email (for invite validation)
 */
router.get(
  '/check-email/:email',
  clerkAuth,
  async (req: Request, res: Response): Promise<void> => {
    try {
      const { email } = req.params;
      const currentUserId = req.user!.id;

      if (!email || !email.includes('@')) {
        res.status(400).json({ success: false, error: 'Valid email is required' });
        return;
      }

      const user = await prisma.user.findUnique({
        where: { email: email.toLowerCase() },
        select: {
          id: true,
          firstName: true,
          lastName: true,
          username: true,
          avatar: true,
        },
      });

      if (!user) {
        res.json({ 
          success: true, 
          data: { 
            exists: false,
            message: 'User not found. They must sign up first.'
          } 
        });
        return;
      }

      // Check if it's the current user
      if (user.id === currentUserId) {
        res.json({ 
          success: true, 
          data: { 
            exists: true,
            isSelf: true,
            message: 'You cannot invite yourself'
          } 
        });
        return;
      }

      res.json({
        success: true,
        data: {
          exists: true,
          isSelf: false,
          user: {
            firstName: user.firstName,
            lastName: user.lastName,
            username: user.username,
            avatar: user.avatar,
          }
        }
      });
    } catch (error) {
      logger.error('Error checking email:', error);
      res.status(500).json({ success: false, error: 'Failed to check email' });
    }
  }
);

/**
 * POST /api/v1/projects/:id/invite
 * Invite a collaborator to a project (owner or collaborator with canInvite permission)
 * Role must be specified and will be assigned on acceptance
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

      // Validate role
      if (!['admin', 'moderator', 'viewer'].includes(role)) {
        res.status(400).json({ success: false, error: 'Invalid role. Must be admin, moderator, or viewer.' });
        return;
      }

      // Check if user is owner or has invite permission
      const project = await prisma.project.findFirst({
        where: { id },
        include: {
          collaborators: {
            where: { userId },
          },
        },
      });

      if (!project) {
        res.status(404).json({ success: false, error: 'Project not found' });
        return;
      }

      const isOwner = project.userId === userId;
      const collaborator = project.collaborators[0];
      const canInvite = isOwner || collaborator?.canInvite;

      if (!canInvite) {
        res.status(403).json({ success: false, error: 'You do not have permission to invite collaborators' });
        return;
      }

      // Check if user exists in system
      const invitee = await prisma.user.findUnique({
        where: { email: email.toLowerCase() },
      });

      // User must exist in the system to be invited
      if (!invitee) {
        res.status(404).json({ success: false, error: 'User not found. They must sign up first before being invited.' });
        return;
      }

      // Check if trying to invite yourself
      if (invitee.id === userId) {
        res.status(400).json({ success: false, error: 'You cannot invite yourself' });
        return;
      }

      // Check if already a collaborator
      const existing = await prisma.projectCollaborator.findUnique({
        where: { projectId_userId: { projectId: id, userId: invitee.id } },
      });
      if (existing) {
        res.status(400).json({ success: false, error: 'User is already a collaborator' });
        return;
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

      // Create invitation with specified role (role is now an enum)
      const roleEnum = role === 'admin' ? 'admin' : role === 'moderator' ? 'moderator' : 'viewer';
      
      const invitation = await prisma.projectInvitation.create({
        data: {
          projectId: id,
          inviterId: userId,
          inviteeEmail: email.toLowerCase(),
          inviteeId: invitee?.id || null,
          role: roleEnum as any, // Cast to ProjectRole enum
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
        // Set permissions based on role from invitation
        // The role is already a ProjectRole enum from the invitation
        const roleValue = invitation.role;
        const isAdmin = roleValue === 'admin';
        const isModerator = roleValue === 'moderator';

        // Add as collaborator with role-based permissions
        // Role permissions:
        // - Owner: Full access (edit, delete, invite, manage roles, change name/emoji)
        // - Admin: Full access (edit, delete, invite, manage roles, change name/emoji)
        // - Moderator: Can edit context, invite others, create chats (NOT delete, NOT manage roles, NOT change name/emoji)
        // - Viewer: Can only view and create new chats (NOT edit context, NOT delete, NOT invite)
        await prisma.projectCollaborator.create({
          data: {
            projectId: invitation.projectId,
            userId: userId,
            role: roleValue, // Use the role directly from invitation (already ProjectRole enum)
            addedBy: invitation.inviterId,
            canEdit: isAdmin || isModerator, // Admin and Moderator can edit context/instructions
            canDelete: isAdmin, // Only Admin can delete chats
            canInvite: isAdmin || isModerator, // Admin and Moderator can invite others
            canManageRoles: isAdmin, // Only Admin can manage roles
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
 * Remove a collaborator from project (owner or collaborator with canManageRoles permission)
 */
router.delete(
  '/:id/collaborators/:collaboratorId',
  clerkAuth,
  async (req: Request, res: Response): Promise<void> => {
    try {
      const userId = req.user!.id;
      const { id, collaboratorId } = req.params;

      // Check if user is owner or has manage roles permission
      const project = await prisma.project.findFirst({
        where: { id },
        include: {
          collaborators: {
            where: { userId },
          },
        },
      });

      if (!project) {
        res.status(404).json({ success: false, error: 'Project not found' });
        return;
      }

      const isOwner = project.userId === userId;
      const myCollaborator = project.collaborators[0];
      const canManageRoles = isOwner || myCollaborator?.canManageRoles;

      // Users can always remove themselves
      const isSelfRemoval = collaboratorId === userId;

      if (!canManageRoles && !isSelfRemoval) {
        res.status(403).json({ success: false, error: 'You do not have permission to remove collaborators' });
        return;
      }

      // Prevent removing the owner
      if (collaboratorId === project.userId) {
        res.status(400).json({ success: false, error: 'Cannot remove the project owner' });
        return;
      }

      await prisma.projectCollaborator.deleteMany({
        where: { projectId: id, userId: collaboratorId },
      });

      logger.info('Collaborator removed', { projectId: id, collaboratorId, removedBy: userId });

      res.json({
        success: true,
        message: isSelfRemoval ? 'You have left the project' : 'Collaborator removed',
      });
    } catch (error) {
      logger.error('Remove collaborator error:', error);
      res.status(500).json({ success: false, error: 'Failed to remove collaborator' });
    }
  }
);

/**
 * PUT /api/v1/projects/:id/collaborators/:collaboratorId/role
 * Update a collaborator's role (only owner or admin can do this)
 */
router.put(
  '/:id/collaborators/:collaboratorId/role',
  clerkAuth,
  async (req: Request, res: Response): Promise<void> => {
    try {
      const userId = req.user!.id;
      const { id, collaboratorId } = req.params;
      const { role } = req.body;

      if (!role || !['admin', 'moderator', 'viewer'].includes(role)) {
        res.status(400).json({ success: false, error: 'Invalid role. Must be admin, moderator, or viewer.' });
        return;
      }

      // Check if user is owner or has manage roles permission
      const project = await prisma.project.findFirst({
        where: { id },
        include: {
          collaborators: {
            where: { userId },
          },
        },
      });

      if (!project) {
        res.status(404).json({ success: false, error: 'Project not found' });
        return;
      }

      const isOwner = project.userId === userId;
      const myCollaborator = project.collaborators[0];
      const canManageRoles = isOwner || myCollaborator?.canManageRoles;

      if (!canManageRoles) {
        res.status(403).json({ success: false, error: 'You do not have permission to change roles' });
        return;
      }

      // Prevent changing owner's role
      if (collaboratorId === project.userId) {
        res.status(400).json({ success: false, error: 'Cannot change the project owner\'s role' });
        return;
      }

      // Set permissions based on new role
      // Role permissions:
      // - Admin: Full access (edit, delete, invite, manage roles)
      // - Moderator: Can edit context, invite others (NOT delete, NOT manage roles)
      // - Viewer: Can only view and create new chats (NOT edit, NOT delete, NOT invite)
      const isAdmin = role === 'admin';
      const isModerator = role === 'moderator';

      const updated = await prisma.projectCollaborator.updateMany({
        where: { projectId: id, userId: collaboratorId },
        data: {
          role: role,
          canEdit: isAdmin || isModerator, // Admin and Moderator can edit context
          canDelete: isAdmin, // Only Admin can delete chats
          canInvite: isAdmin || isModerator, // Admin and Moderator can invite
          canManageRoles: isAdmin, // Only Admin can manage roles
        },
      });

      if (updated.count === 0) {
        res.status(404).json({ success: false, error: 'Collaborator not found' });
        return;
      }

      logger.info('Collaborator role updated', { projectId: id, collaboratorId, newRole: role, updatedBy: userId });

      res.json({
        success: true,
        message: `Role updated to ${role}`,
      });
    } catch (error) {
      logger.error('Update collaborator role error:', error);
      res.status(500).json({ success: false, error: 'Failed to update role' });
    }
  }
);

export default router;
