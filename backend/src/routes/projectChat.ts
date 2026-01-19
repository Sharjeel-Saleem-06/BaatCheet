import { Router, Request, Response } from 'express';
import { prisma } from '../config/database.js';
import { clerkAuth } from '../middleware/index.js';
import { logger } from '../utils/logger.js';

const router = Router();

// ============================================
// Helper Functions
// ============================================

/**
 * Check if user has access to project and get their role
 */
async function getUserProjectAccess(projectId: string, userId: string) {
  const project = await prisma.project.findFirst({
    where: { id: projectId },
    include: {
      collaborators: {
        where: { userId },
      },
      chatSettings: true,
    },
  });

  if (!project) return null;

  const isOwner = project.userId === userId;
  const collaborator = project.collaborators[0];
  
  if (!isOwner && !collaborator) return null;

  const role = isOwner ? 'admin' : (collaborator?.role || 'viewer');
  const chatSettings = project.chatSettings;

  return {
    project,
    isOwner,
    role,
    collaborator,
    chatSettings,
  };
}

/**
 * Check if user can send messages based on chat settings
 */
function canSendMessage(role: string, chatAccess: string | undefined): boolean {
  const access = chatAccess || 'all';
  
  switch (access) {
    case 'admin_only':
      return role === 'admin';
    case 'admin_moderator':
      return role === 'admin' || role === 'moderator';
    case 'all':
    default:
      return true;
  }
}

// ============================================
// Chat Settings Routes
// ============================================

/**
 * GET /api/v1/projects/:projectId/chat/settings
 * Get chat settings for a project
 */
router.get(
  '/:projectId/chat/settings',
  clerkAuth,
  async (req: Request, res: Response): Promise<void> => {
    try {
      const userId = req.user!.id;
      const { projectId } = req.params;

      const access = await getUserProjectAccess(projectId, userId);
      if (!access) {
        res.status(404).json({ success: false, error: 'Project not found or no access' });
        return;
      }

      // Get or create chat settings
      let settings = access.chatSettings;
      if (!settings) {
        settings = await prisma.projectChatSettings.create({
          data: { projectId },
        });
      }

      res.json({
        success: true,
        data: {
          ...settings,
          canSendMessage: canSendMessage(access.role, settings.chatAccess),
          myRole: access.role,
          isOwner: access.isOwner,
        },
      });
    } catch (error) {
      logger.error('Get chat settings error:', error);
      res.status(500).json({ success: false, error: 'Failed to get chat settings' });
    }
  }
);

/**
 * PUT /api/v1/projects/:projectId/chat/settings
 * Update chat settings (only admin can do this)
 */
router.put(
  '/:projectId/chat/settings',
  clerkAuth,
  async (req: Request, res: Response): Promise<void> => {
    try {
      const userId = req.user!.id;
      const { projectId } = req.params;
      const { chatAccess, allowImages, allowEmojis, allowEditing, allowDeleting } = req.body;

      const access = await getUserProjectAccess(projectId, userId);
      if (!access) {
        res.status(404).json({ success: false, error: 'Project not found or no access' });
        return;
      }

      // Only admin can change chat settings
      if (access.role !== 'admin') {
        res.status(403).json({ success: false, error: 'Only admin can change chat settings' });
        return;
      }

      // Validate chatAccess value
      if (chatAccess && !['all', 'admin_moderator', 'admin_only'].includes(chatAccess)) {
        res.status(400).json({ success: false, error: 'Invalid chatAccess value' });
        return;
      }

      // Upsert chat settings
      const settings = await prisma.projectChatSettings.upsert({
        where: { projectId },
        create: {
          projectId,
          chatAccess: chatAccess || 'all',
          allowImages: allowImages ?? true,
          allowEmojis: allowEmojis ?? true,
          allowEditing: allowEditing ?? true,
          allowDeleting: allowDeleting ?? true,
        },
        update: {
          ...(chatAccess !== undefined && { chatAccess }),
          ...(allowImages !== undefined && { allowImages }),
          ...(allowEmojis !== undefined && { allowEmojis }),
          ...(allowEditing !== undefined && { allowEditing }),
          ...(allowDeleting !== undefined && { allowDeleting }),
        },
      });

      // Create system message about settings change
      await prisma.projectChatMessage.create({
        data: {
          projectId,
          senderId: userId,
          content: `Chat settings updated by admin`,
          messageType: 'system',
        },
      });

      logger.info('Chat settings updated', { projectId, userId, chatAccess });

      res.json({
        success: true,
        data: settings,
        message: 'Chat settings updated',
      });
    } catch (error) {
      logger.error('Update chat settings error:', error);
      res.status(500).json({ success: false, error: 'Failed to update chat settings' });
    }
  }
);

// ============================================
// Chat Messages Routes
// ============================================

/**
 * GET /api/v1/projects/:projectId/chat/messages
 * Get chat messages for a project
 */
router.get(
  '/:projectId/chat/messages',
  clerkAuth,
  async (req: Request, res: Response): Promise<void> => {
    try {
      const userId = req.user!.id;
      const { projectId } = req.params;
      const { limit = '50', before, after } = req.query;

      const access = await getUserProjectAccess(projectId, userId);
      if (!access) {
        res.status(404).json({ success: false, error: 'Project not found or no access' });
        return;
      }

      // Build query conditions
      const whereConditions: any = {
        projectId,
        isDeleted: false,
      };

      if (before) {
        whereConditions.createdAt = { lt: new Date(before as string) };
      }
      if (after) {
        whereConditions.createdAt = { ...whereConditions.createdAt, gt: new Date(after as string) };
      }

      const messages = await prisma.projectChatMessage.findMany({
        where: whereConditions,
        orderBy: { createdAt: 'desc' },
        take: Math.min(parseInt(limit as string) || 50, 100),
        include: {
          replyTo: {
            select: {
              id: true,
              content: true,
              senderId: true,
            },
          },
        },
      });

      // Get sender info
      const senderIds = [...new Set(messages.map(m => m.senderId))];
      const senders = await prisma.user.findMany({
        where: { id: { in: senderIds } },
        select: { id: true, firstName: true, lastName: true, username: true, avatar: true, email: true },
      });
      const senderMap = new Map(senders.map(s => [s.id, s]));

      // Get collaborator roles for senders
      const collaborators = await prisma.projectCollaborator.findMany({
        where: { projectId, userId: { in: senderIds } },
        select: { userId: true, role: true },
      });
      const roleMap = new Map(collaborators.map(c => [c.userId, c.role]));

      // Check if project owner is in senders
      const isOwnerInSenders = senderIds.includes(access.project.userId);

      const items = messages.map(m => ({
        ...m,
        sender: senderMap.get(m.senderId) || null,
        senderRole: m.senderId === access.project.userId ? 'admin' : (roleMap.get(m.senderId) || 'viewer'),
        isOwner: m.senderId === access.project.userId,
        canEdit: m.senderId === userId && access.chatSettings?.allowEditing !== false,
        canDelete: m.senderId === userId && access.chatSettings?.allowDeleting !== false,
      }));

      // Get chat settings for response
      const settings = access.chatSettings || { chatAccess: 'all', allowImages: true, allowEmojis: true };

      res.json({
        success: true,
        data: {
          messages: items.reverse(), // Return in chronological order
          canSendMessage: canSendMessage(access.role, settings.chatAccess),
          settings: {
            chatAccess: settings.chatAccess,
            allowImages: settings.allowImages,
            allowEmojis: settings.allowEmojis,
            allowEditing: settings.allowEditing,
            allowDeleting: settings.allowDeleting,
          },
          myRole: access.role,
          isOwner: access.isOwner,
        },
      });
    } catch (error) {
      logger.error('Get chat messages error:', error);
      res.status(500).json({ success: false, error: 'Failed to get chat messages' });
    }
  }
);

/**
 * POST /api/v1/projects/:projectId/chat/messages
 * Send a chat message
 */
router.post(
  '/:projectId/chat/messages',
  clerkAuth,
  async (req: Request, res: Response): Promise<void> => {
    try {
      const userId = req.user!.id;
      const { projectId } = req.params;
      const { content, messageType = 'text', imageUrl, replyToId } = req.body;

      if (!content && !imageUrl) {
        res.status(400).json({ success: false, error: 'Message content or image is required' });
        return;
      }

      const access = await getUserProjectAccess(projectId, userId);
      if (!access) {
        res.status(404).json({ success: false, error: 'Project not found or no access' });
        return;
      }

      // Check if user can send messages
      const settings = access.chatSettings || { chatAccess: 'all', allowImages: true, allowEmojis: true };
      
      if (!canSendMessage(access.role, settings.chatAccess)) {
        res.status(403).json({ 
          success: false, 
          error: 'You do not have permission to send messages in this chat. Only admins and moderators can send messages.' 
        });
        return;
      }

      // Check if images are allowed
      if (imageUrl && !settings.allowImages) {
        res.status(403).json({ success: false, error: 'Images are not allowed in this chat' });
        return;
      }

      // Validate reply target exists
      if (replyToId) {
        const replyTarget = await prisma.projectChatMessage.findFirst({
          where: { id: replyToId, projectId, isDeleted: false },
        });
        if (!replyTarget) {
          res.status(400).json({ success: false, error: 'Reply target message not found' });
          return;
        }
      }

      // Create message
      const message = await prisma.projectChatMessage.create({
        data: {
          projectId,
          senderId: userId,
          content: content || '',
          messageType: imageUrl ? 'image' : messageType,
          imageUrl,
          replyToId,
        },
        include: {
          replyTo: {
            select: {
              id: true,
              content: true,
              senderId: true,
            },
          },
        },
      });

      // Get sender info
      const sender = await prisma.user.findUnique({
        where: { id: userId },
        select: { id: true, firstName: true, lastName: true, username: true, avatar: true, email: true },
      });

      logger.info('Chat message sent', { projectId, userId, messageId: message.id });

      res.status(201).json({
        success: true,
        data: {
          ...message,
          sender,
          senderRole: access.role,
          isOwner: access.isOwner,
          canEdit: settings.allowEditing !== false,
          canDelete: settings.allowDeleting !== false,
        },
        message: 'Message sent',
      });
    } catch (error) {
      logger.error('Send chat message error:', error);
      res.status(500).json({ success: false, error: 'Failed to send message' });
    }
  }
);

/**
 * PUT /api/v1/projects/:projectId/chat/messages/:messageId
 * Edit a chat message (only sender can edit their own messages)
 */
router.put(
  '/:projectId/chat/messages/:messageId',
  clerkAuth,
  async (req: Request, res: Response): Promise<void> => {
    try {
      const userId = req.user!.id;
      const { projectId, messageId } = req.params;
      const { content } = req.body;

      if (!content) {
        res.status(400).json({ success: false, error: 'Message content is required' });
        return;
      }

      const access = await getUserProjectAccess(projectId, userId);
      if (!access) {
        res.status(404).json({ success: false, error: 'Project not found or no access' });
        return;
      }

      // Check if editing is allowed
      const settings = access.chatSettings || { allowEditing: true };
      if (!settings.allowEditing) {
        res.status(403).json({ success: false, error: 'Editing messages is not allowed in this chat' });
        return;
      }

      // Find the message
      const message = await prisma.projectChatMessage.findFirst({
        where: { id: messageId, projectId, isDeleted: false },
      });

      if (!message) {
        res.status(404).json({ success: false, error: 'Message not found' });
        return;
      }

      // Only sender can edit their own messages
      if (message.senderId !== userId) {
        res.status(403).json({ success: false, error: 'You can only edit your own messages' });
        return;
      }

      // Cannot edit system messages
      if (message.messageType === 'system') {
        res.status(403).json({ success: false, error: 'Cannot edit system messages' });
        return;
      }

      // Update message
      const updatedMessage = await prisma.projectChatMessage.update({
        where: { id: messageId },
        data: {
          content,
          isEdited: true,
          editedAt: new Date(),
        },
      });

      logger.info('Chat message edited', { projectId, messageId, userId });

      res.json({
        success: true,
        data: updatedMessage,
        message: 'Message updated',
      });
    } catch (error) {
      logger.error('Edit chat message error:', error);
      res.status(500).json({ success: false, error: 'Failed to edit message' });
    }
  }
);

/**
 * DELETE /api/v1/projects/:projectId/chat/messages/:messageId
 * Delete a chat message (sender can delete their own, admin can delete any)
 */
router.delete(
  '/:projectId/chat/messages/:messageId',
  clerkAuth,
  async (req: Request, res: Response): Promise<void> => {
    try {
      const userId = req.user!.id;
      const { projectId, messageId } = req.params;

      const access = await getUserProjectAccess(projectId, userId);
      if (!access) {
        res.status(404).json({ success: false, error: 'Project not found or no access' });
        return;
      }

      // Check if deleting is allowed
      const settings = access.chatSettings || { allowDeleting: true };
      
      // Find the message
      const message = await prisma.projectChatMessage.findFirst({
        where: { id: messageId, projectId, isDeleted: false },
      });

      if (!message) {
        res.status(404).json({ success: false, error: 'Message not found' });
        return;
      }

      // Cannot delete system messages
      if (message.messageType === 'system') {
        res.status(403).json({ success: false, error: 'Cannot delete system messages' });
        return;
      }

      // Check permissions
      const isSender = message.senderId === userId;
      const isAdmin = access.role === 'admin';

      if (!isSender && !isAdmin) {
        res.status(403).json({ success: false, error: 'You can only delete your own messages' });
        return;
      }

      // If sender but deleting is disabled, only admin can delete
      if (isSender && !settings.allowDeleting && !isAdmin) {
        res.status(403).json({ success: false, error: 'Deleting messages is not allowed in this chat' });
        return;
      }

      // Soft delete message
      await prisma.projectChatMessage.update({
        where: { id: messageId },
        data: {
          isDeleted: true,
          deletedAt: new Date(),
          deletedBy: userId,
        },
      });

      logger.info('Chat message deleted', { projectId, messageId, userId, deletedBy: isAdmin ? 'admin' : 'sender' });

      res.json({
        success: true,
        message: 'Message deleted',
      });
    } catch (error) {
      logger.error('Delete chat message error:', error);
      res.status(500).json({ success: false, error: 'Failed to delete message' });
    }
  }
);

/**
 * POST /api/v1/projects/:projectId/chat/messages/:messageId/read
 * Mark a message as read
 */
router.post(
  '/:projectId/chat/messages/:messageId/read',
  clerkAuth,
  async (req: Request, res: Response): Promise<void> => {
    try {
      const userId = req.user!.id;
      const { projectId, messageId } = req.params;

      const access = await getUserProjectAccess(projectId, userId);
      if (!access) {
        res.status(404).json({ success: false, error: 'Project not found or no access' });
        return;
      }

      // Create or update read receipt
      await prisma.projectChatReadReceipt.upsert({
        where: {
          messageId_userId: { messageId, userId },
        },
        create: {
          messageId,
          userId,
        },
        update: {
          readAt: new Date(),
        },
      });

      res.json({
        success: true,
        message: 'Message marked as read',
      });
    } catch (error) {
      logger.error('Mark message read error:', error);
      res.status(500).json({ success: false, error: 'Failed to mark message as read' });
    }
  }
);

/**
 * POST /api/v1/projects/:projectId/chat/read-all
 * Mark all messages as read
 */
router.post(
  '/:projectId/chat/read-all',
  clerkAuth,
  async (req: Request, res: Response): Promise<void> => {
    try {
      const userId = req.user!.id;
      const { projectId } = req.params;

      const access = await getUserProjectAccess(projectId, userId);
      if (!access) {
        res.status(404).json({ success: false, error: 'Project not found or no access' });
        return;
      }

      // Get all unread messages
      const messages = await prisma.projectChatMessage.findMany({
        where: {
          projectId,
          isDeleted: false,
          readReceipts: {
            none: { userId },
          },
        },
        select: { id: true },
      });

      // Create read receipts for all
      if (messages.length > 0) {
        await prisma.projectChatReadReceipt.createMany({
          data: messages.map(m => ({
            messageId: m.id,
            userId,
          })),
          skipDuplicates: true,
        });
      }

      res.json({
        success: true,
        message: `Marked ${messages.length} messages as read`,
      });
    } catch (error) {
      logger.error('Mark all messages read error:', error);
      res.status(500).json({ success: false, error: 'Failed to mark messages as read' });
    }
  }
);

/**
 * GET /api/v1/projects/:projectId/chat/unread-count
 * Get unread message count
 */
router.get(
  '/:projectId/chat/unread-count',
  clerkAuth,
  async (req: Request, res: Response): Promise<void> => {
    try {
      const userId = req.user!.id;
      const { projectId } = req.params;

      const access = await getUserProjectAccess(projectId, userId);
      if (!access) {
        res.status(404).json({ success: false, error: 'Project not found or no access' });
        return;
      }

      // Count unread messages
      const unreadCount = await prisma.projectChatMessage.count({
        where: {
          projectId,
          isDeleted: false,
          senderId: { not: userId }, // Don't count own messages
          readReceipts: {
            none: { userId },
          },
        },
      });

      res.json({
        success: true,
        data: { unreadCount },
      });
    } catch (error) {
      logger.error('Get unread count error:', error);
      res.status(500).json({ success: false, error: 'Failed to get unread count' });
    }
  }
);

export default router;
