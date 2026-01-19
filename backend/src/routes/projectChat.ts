import { Router, Request, Response } from 'express';
import { prisma } from '../config/database.js';
import { clerkAuth } from '../middleware/index.js';
import { logger } from '../utils/logger.js';

const router = Router();

// ============================================
// Helper Functions - Security & Access Control
// ============================================

/**
 * Check if user has access to project and get their role
 * This is the CORE security function - ensures users can only access their projects
 */
async function getUserProjectAccess(projectId: string, userId: string) {
  // First, verify the project exists
  const project = await prisma.project.findUnique({
    where: { id: projectId },
    include: {
      chatSettings: true,
    },
  });

  if (!project) return null;

  // Check if user is the owner
  const isOwner = project.userId === userId;
  
  if (isOwner) {
    return {
      project,
      isOwner: true,
      role: 'admin' as const,
      collaborator: null,
      chatSettings: project.chatSettings,
      canEdit: true,
      canDelete: true,
      canInvite: true,
      canManageRoles: true,
    };
  }

  // Check if user is a collaborator
  const collaborator = await prisma.projectCollaborator.findUnique({
    where: {
      projectId_userId: { projectId, userId },
    },
  });

  // If not owner and not collaborator, NO ACCESS
  if (!collaborator) return null;

  return {
    project,
    isOwner: false,
    role: collaborator.role as 'admin' | 'moderator' | 'viewer',
    collaborator,
    chatSettings: project.chatSettings,
    canEdit: collaborator.canEdit,
    canDelete: collaborator.canDelete,
    canInvite: collaborator.canInvite,
    canManageRoles: collaborator.canManageRoles,
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

/**
 * Check if user can edit a specific message
 * Only the sender can edit their own messages (if editing is allowed)
 */
function canEditMessage(
  message: { senderId: string },
  userId: string,
  settings: { allowEditing?: boolean } | null
): boolean {
  // Only sender can edit
  if (message.senderId !== userId) return false;
  // Check if editing is allowed in settings
  return settings?.allowEditing !== false;
}

/**
 * Check if user can delete a specific message
 * - Sender can delete their own messages (if allowed)
 * - Admin can delete any message
 */
function canDeleteMessage(
  message: { senderId: string },
  userId: string,
  role: string,
  settings: { allowDeleting?: boolean } | null
): { canDeleteForMe: boolean; canDeleteForEveryone: boolean } {
  const isSender = message.senderId === userId;
  const isAdmin = role === 'admin';
  
  // Everyone can "delete for me" (hide message)
  const canDeleteForMe = true;
  
  // Delete for everyone: sender (if allowed) or admin
  let canDeleteForEveryone = false;
  if (isAdmin) {
    canDeleteForEveryone = true;
  } else if (isSender && settings?.allowDeleting !== false) {
    canDeleteForEveryone = true;
  }
  
  return { canDeleteForMe, canDeleteForEveryone };
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

      // SECURITY: Verify user has access to this project
      const access = await getUserProjectAccess(projectId, userId);
      if (!access) {
        res.status(403).json({ success: false, error: 'Access denied. You are not a member of this project.' });
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

      // SECURITY: Verify user has access and is admin
      const access = await getUserProjectAccess(projectId, userId);
      if (!access) {
        res.status(403).json({ success: false, error: 'Access denied. You are not a member of this project.' });
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
 * SECURITY: Only returns messages for projects user has access to
 * Excludes messages deleted for everyone and messages hidden by this user
 */
router.get(
  '/:projectId/chat/messages',
  clerkAuth,
  async (req: Request, res: Response): Promise<void> => {
    try {
      const userId = req.user!.id;
      const { projectId } = req.params;
      const { limit = '50', before, after } = req.query;

      // SECURITY: Verify user has access to this project
      const access = await getUserProjectAccess(projectId, userId);
      if (!access) {
        res.status(403).json({ success: false, error: 'Access denied. You are not a member of this project.' });
        return;
      }

      // Get messages hidden by this user
      const hiddenMessages = await prisma.projectChatHiddenMessage.findMany({
        where: { userId },
        select: { messageId: true },
      });
      const hiddenMessageIds = hiddenMessages.map(h => h.messageId);

      // Build query conditions
      const whereConditions: any = {
        projectId,
        isDeleted: false, // Exclude messages deleted for everyone
        id: { notIn: hiddenMessageIds }, // Exclude messages hidden by this user
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
              isDeleted: true,
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

      // Get chat settings for permissions
      const settings = access.chatSettings || { chatAccess: 'all', allowImages: true, allowEmojis: true, allowEditing: true, allowDeleting: true };

      const items = messages.map(m => {
        const senderRole = m.senderId === access.project.userId ? 'admin' : (roleMap.get(m.senderId) || 'viewer');
        const deletePerms = canDeleteMessage(m, userId, access.role, settings);
        
        return {
          ...m,
          sender: senderMap.get(m.senderId) || null,
          senderRole,
          isOwner: m.senderId === access.project.userId,
          canEdit: canEditMessage(m, userId, settings),
          canDeleteForMe: deletePerms.canDeleteForMe,
          canDeleteForEveryone: deletePerms.canDeleteForEveryone,
          // Hide reply content if reply was deleted
          replyTo: m.replyTo?.isDeleted ? { ...m.replyTo, content: '[Message deleted]' } : m.replyTo,
        };
      });

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
 * SECURITY: Verifies user has access and permission to send messages
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

      // SECURITY: Verify user has access to this project
      const access = await getUserProjectAccess(projectId, userId);
      if (!access) {
        res.status(403).json({ success: false, error: 'Access denied. You are not a member of this project.' });
        return;
      }

      // Check if user can send messages based on role and settings
      const settings = access.chatSettings || { chatAccess: 'all', allowImages: true, allowEmojis: true };
      
      if (!canSendMessage(access.role, settings.chatAccess)) {
        res.status(403).json({ 
          success: false, 
          error: `You do not have permission to send messages. Chat is restricted to ${settings.chatAccess === 'admin_only' ? 'admin only' : 'admins and moderators'}.`
        });
        return;
      }

      // Check if images are allowed
      if (imageUrl && !settings.allowImages) {
        res.status(403).json({ success: false, error: 'Images are not allowed in this chat' });
        return;
      }

      // Validate reply target exists and is in the same project
      if (replyToId) {
        const replyTarget = await prisma.projectChatMessage.findFirst({
          where: { 
            id: replyToId, 
            projectId, // SECURITY: Ensure reply is to a message in the same project
            isDeleted: false 
          },
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

      const deletePerms = canDeleteMessage(message, userId, access.role, settings);

      res.status(201).json({
        success: true,
        data: {
          ...message,
          sender,
          senderRole: access.role,
          isOwner: access.isOwner,
          canEdit: settings.allowEditing !== false,
          canDeleteForMe: deletePerms.canDeleteForMe,
          canDeleteForEveryone: deletePerms.canDeleteForEveryone,
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
 * SECURITY: Verifies user owns the message and has edit permission
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

      // SECURITY: Verify user has access to this project
      const access = await getUserProjectAccess(projectId, userId);
      if (!access) {
        res.status(403).json({ success: false, error: 'Access denied. You are not a member of this project.' });
        return;
      }

      // Find the message - SECURITY: Ensure it belongs to this project
      const message = await prisma.projectChatMessage.findFirst({
        where: { 
          id: messageId, 
          projectId, // SECURITY: Must be in the same project
          isDeleted: false 
        },
      });

      if (!message) {
        res.status(404).json({ success: false, error: 'Message not found' });
        return;
      }

      // SECURITY: Only sender can edit their own messages
      if (message.senderId !== userId) {
        res.status(403).json({ success: false, error: 'You can only edit your own messages' });
        return;
      }

      // Check if editing is allowed
      const settings = access.chatSettings || { allowEditing: true };
      if (!settings.allowEditing) {
        res.status(403).json({ success: false, error: 'Editing messages is not allowed in this chat' });
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
 * Delete a chat message
 * SECURITY: Verifies permissions and supports two delete modes:
 * - deleteForEveryone: Soft delete (marks as deleted) - sender or admin
 * - deleteForMe: Hides message for this user only
 */
router.delete(
  '/:projectId/chat/messages/:messageId',
  clerkAuth,
  async (req: Request, res: Response): Promise<void> => {
    try {
      const userId = req.user!.id;
      const { projectId, messageId } = req.params;
      const { deleteForEveryone = false } = req.query;

      // SECURITY: Verify user has access to this project
      const access = await getUserProjectAccess(projectId, userId);
      if (!access) {
        res.status(403).json({ success: false, error: 'Access denied. You are not a member of this project.' });
        return;
      }

      // Find the message - SECURITY: Ensure it belongs to this project
      const message = await prisma.projectChatMessage.findFirst({
        where: { 
          id: messageId, 
          projectId, // SECURITY: Must be in the same project
          isDeleted: false 
        },
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

      const settings = access.chatSettings || { allowDeleting: true };
      const deletePerms = canDeleteMessage(message, userId, access.role, settings);

      if (deleteForEveryone === 'true' || deleteForEveryone === true) {
        // DELETE FOR EVERYONE - Soft delete
        if (!deletePerms.canDeleteForEveryone) {
          res.status(403).json({ 
            success: false, 
            error: access.role !== 'admin' && !settings.allowDeleting 
              ? 'Deleting messages is not allowed in this chat' 
              : 'You can only delete your own messages'
          });
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

        logger.info('Chat message deleted for everyone', { projectId, messageId, userId, deletedBy: access.role === 'admin' ? 'admin' : 'sender' });

        res.json({
          success: true,
          message: 'Message deleted for everyone',
          deleteType: 'everyone',
        });
      } else {
        // DELETE FOR ME - Hide message for this user only
        await prisma.projectChatHiddenMessage.upsert({
          where: {
            messageId_userId: { messageId, userId },
          },
          create: {
            messageId,
            userId,
          },
          update: {
            hiddenAt: new Date(),
          },
        });

        logger.info('Chat message hidden for user', { projectId, messageId, userId });

        res.json({
          success: true,
          message: 'Message hidden for you',
          deleteType: 'me',
        });
      }
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

      // SECURITY: Verify user has access to this project
      const access = await getUserProjectAccess(projectId, userId);
      if (!access) {
        res.status(403).json({ success: false, error: 'Access denied. You are not a member of this project.' });
        return;
      }

      // Verify message exists in this project
      const message = await prisma.projectChatMessage.findFirst({
        where: { id: messageId, projectId },
      });

      if (!message) {
        res.status(404).json({ success: false, error: 'Message not found' });
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

      // SECURITY: Verify user has access to this project
      const access = await getUserProjectAccess(projectId, userId);
      if (!access) {
        res.status(403).json({ success: false, error: 'Access denied. You are not a member of this project.' });
        return;
      }

      // Get all unread messages in this project
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

      // SECURITY: Verify user has access to this project
      const access = await getUserProjectAccess(projectId, userId);
      if (!access) {
        res.status(403).json({ success: false, error: 'Access denied. You are not a member of this project.' });
        return;
      }

      // Get messages hidden by this user
      const hiddenMessages = await prisma.projectChatHiddenMessage.findMany({
        where: { userId },
        select: { messageId: true },
      });
      const hiddenMessageIds = hiddenMessages.map(h => h.messageId);

      // Count unread messages (excluding hidden and own messages)
      const unreadCount = await prisma.projectChatMessage.count({
        where: {
          projectId,
          isDeleted: false,
          senderId: { not: userId }, // Don't count own messages
          id: { notIn: hiddenMessageIds }, // Don't count hidden messages
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

/**
 * POST /api/v1/projects/:projectId/chat/unhide/:messageId
 * Unhide a message that was hidden (delete for me)
 */
router.post(
  '/:projectId/chat/unhide/:messageId',
  clerkAuth,
  async (req: Request, res: Response): Promise<void> => {
    try {
      const userId = req.user!.id;
      const { projectId, messageId } = req.params;

      // SECURITY: Verify user has access to this project
      const access = await getUserProjectAccess(projectId, userId);
      if (!access) {
        res.status(403).json({ success: false, error: 'Access denied. You are not a member of this project.' });
        return;
      }

      // Remove the hidden record
      await prisma.projectChatHiddenMessage.deleteMany({
        where: {
          messageId,
          userId,
        },
      });

      res.json({
        success: true,
        message: 'Message unhidden',
      });
    } catch (error) {
      logger.error('Unhide message error:', error);
      res.status(500).json({ success: false, error: 'Failed to unhide message' });
    }
  }
);

export default router;
