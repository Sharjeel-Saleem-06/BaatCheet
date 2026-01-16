/**
 * Admin Users Controller
 * User management for administrators
 * 
 * @module AdminUsers
 */

import { Request, Response } from 'express';
import { prisma } from '../../config/database.js';
import { logAdminAction } from '../../middleware/adminAuth.js';
import { logger } from '../../utils/logger.js';

// ============================================
// List Users
// ============================================

/**
 * GET /api/v1/admin/users
 * List all users with pagination and filters
 */
export const listUsers = async (req: Request, res: Response): Promise<void> => {
  try {
    const {
      page = '1',
      limit = '50',
      search,
      role,
      tier,
      status,
      sortBy = 'createdAt',
      sortOrder = 'desc',
    } = req.query;

    const pageNum = parseInt(page as string);
    const limitNum = Math.min(parseInt(limit as string), 100); // Max 100
    const skip = (pageNum - 1) * limitNum;

    // Build where clause
    const where: any = {};

    if (search) {
      where.OR = [
        { email: { contains: search as string, mode: 'insensitive' } },
        { firstName: { contains: search as string, mode: 'insensitive' } },
        { lastName: { contains: search as string, mode: 'insensitive' } },
        { username: { contains: search as string, mode: 'insensitive' } },
      ];
    }

    if (role) where.role = role;
    if (tier) where.tier = tier;
    
    if (status === 'active') {
      where.isActive = true;
      where.isBanned = false;
    } else if (status === 'suspended') {
      where.isBanned = true;
    } else if (status === 'inactive') {
      where.isActive = false;
    }

    // Get users with counts
    const [users, total] = await Promise.all([
      prisma.user.findMany({
        where,
        skip,
        take: limitNum,
        orderBy: { [sortBy as string]: sortOrder },
        select: {
          id: true,
          clerkId: true,
          email: true,
          username: true,
          firstName: true,
          lastName: true,
          avatar: true,
          role: true,
          tier: true,
          isActive: true,
          isBanned: true,
          banReason: true,
          lastLoginAt: true,
          loginCount: true,
          createdAt: true,
          _count: {
            select: {
              conversations: true,
              projects: true,
              apiKeys: true,
            },
          },
        },
      }),
      prisma.user.count({ where }),
    ]);

    res.json({
      success: true,
      data: {
        users: users.map(user => ({
          ...user,
          name: `${user.firstName || ''} ${user.lastName || ''}`.trim() || user.email,
          conversationsCount: user._count.conversations,
          projectsCount: user._count.projects,
          apiKeysCount: user._count.apiKeys,
          _count: undefined,
        })),
        pagination: {
          page: pageNum,
          limit: limitNum,
          total,
          totalPages: Math.ceil(total / limitNum),
        },
      },
    });
  } catch (error) {
    logger.error('List users error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to list users',
    });
  }
};

// ============================================
// Get User Details
// ============================================

/**
 * GET /api/v1/admin/users/:userId
 * Get detailed user information
 */
export const getUserDetails = async (req: Request, res: Response): Promise<void> => {
  try {
    const { userId } = req.params;

    const user = await prisma.user.findUnique({
      where: { id: userId },
      include: {
        conversations: {
          take: 10,
          orderBy: { updatedAt: 'desc' },
          select: {
            id: true,
            title: true,
            model: true,
            createdAt: true,
            updatedAt: true,
            _count: { select: { messages: true } },
          },
        },
        projects: {
          take: 10,
          orderBy: { updatedAt: 'desc' },
          select: {
            id: true,
            name: true,
            createdAt: true,
            _count: { select: { conversations: true } },
          },
        },
        apiKeys: {
          select: {
            id: true,
            name: true,
            keyPrefix: true,
            permissions: true,
            isActive: true,
            lastUsed: true,
            usageCount: true,
            createdAt: true,
          },
        },
        webhooks: {
          select: {
            id: true,
            url: true,
            events: true,
            isActive: true,
            failureCount: true,
            lastTriggered: true,
          },
        },
      },
    });

    if (!user) {
      res.status(404).json({
        success: false,
        error: 'User not found',
      });
      return;
    }

    // Get usage stats
    const [conversationCount, messageCount, analyticsSum] = await Promise.all([
      prisma.conversation.count({ where: { userId } }),
      prisma.message.count({ where: { conversation: { userId } } }),
      prisma.analytics.aggregate({
        where: { userId },
        _sum: {
          messagesCount: true,
          responsesCount: true,
          imagesUploaded: true,
          audioTranscribed: true,
          exportsGenerated: true,
        },
      }),
    ]);

    // Get recent activity
    const recentActivity = await prisma.auditLog.findMany({
      where: { userId },
      take: 20,
      orderBy: { createdAt: 'desc' },
      select: {
        id: true,
        action: true,
        resource: true,
        createdAt: true,
      },
    });

    res.json({
      success: true,
      data: {
        user: {
          id: user.id,
          clerkId: user.clerkId,
          email: user.email,
          username: user.username,
          firstName: user.firstName,
          lastName: user.lastName,
          name: `${user.firstName || ''} ${user.lastName || ''}`.trim() || user.email,
          avatar: user.avatar,
          role: user.role,
          tier: user.tier,
          preferences: user.preferences,
          isActive: user.isActive,
          isBanned: user.isBanned,
          banReason: user.banReason,
          lastLoginAt: user.lastLoginAt,
          loginCount: user.loginCount,
          createdAt: user.createdAt,
          updatedAt: user.updatedAt,
        },
        stats: {
          totalConversations: conversationCount,
          totalMessages: messageCount,
          totalMessagesFromAnalytics: analyticsSum._sum.messagesCount || 0,
          totalResponses: analyticsSum._sum.responsesCount || 0,
          imagesUploaded: analyticsSum._sum.imagesUploaded || 0,
          audioTranscribed: analyticsSum._sum.audioTranscribed || 0,
          exportsGenerated: analyticsSum._sum.exportsGenerated || 0,
          apiKeysCreated: user.apiKeys.length,
          webhooksCreated: user.webhooks.length,
        },
        recentConversations: user.conversations.map(c => ({
          ...c,
          messagesCount: c._count.messages,
          _count: undefined,
        })),
        projects: user.projects.map(p => ({
          ...p,
          conversationsCount: p._count.conversations,
          _count: undefined,
        })),
        apiKeys: user.apiKeys,
        webhooks: user.webhooks,
        recentActivity,
      },
    });
  } catch (error) {
    logger.error('Get user details error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to get user details',
    });
  }
};

// ============================================
// Update User
// ============================================

/**
 * PUT /api/v1/admin/users/:userId
 * Update user details
 */
export const updateUser = async (req: Request, res: Response): Promise<void> => {
  try {
    const { userId } = req.params;
    const { role, tier, isActive, firstName, lastName } = req.body;

    // Verify user exists
    const existingUser = await prisma.user.findUnique({
      where: { id: userId },
      select: { id: true, role: true, tier: true },
    });

    if (!existingUser) {
      res.status(404).json({
        success: false,
        error: 'User not found',
      });
      return;
    }

    // Prevent self-demotion
    if (userId === req.user?.id && role && role !== existingUser.role) {
      res.status(400).json({
        success: false,
        error: 'Cannot change your own role',
      });
      return;
    }

    // Update user
    const updatedUser = await prisma.user.update({
      where: { id: userId },
      data: {
        ...(role && { role }),
        ...(tier && { tier }),
        ...(typeof isActive === 'boolean' && { isActive }),
        ...(firstName !== undefined && { firstName }),
        ...(lastName !== undefined && { lastName }),
      },
      select: {
        id: true,
        email: true,
        role: true,
        tier: true,
        isActive: true,
        firstName: true,
        lastName: true,
      },
    });

    // Log action
    await logAdminAction(
      req.user!.id,
      'USER_UPDATED',
      'user',
      userId,
      { changes: { role, tier, isActive, firstName, lastName } },
      req
    );

    res.json({
      success: true,
      data: updatedUser,
      message: 'User updated successfully',
    });
  } catch (error) {
    logger.error('Update user error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to update user',
    });
  }
};

// ============================================
// Suspend User
// ============================================

/**
 * POST /api/v1/admin/users/:userId/suspend
 * Suspend a user account
 */
export const suspendUser = async (req: Request, res: Response): Promise<void> => {
  try {
    const { userId } = req.params;
    const { reason } = req.body;

    if (!reason) {
      res.status(400).json({
        success: false,
        error: 'Suspension reason is required',
      });
      return;
    }

    // Prevent self-suspension
    if (userId === req.user?.id) {
      res.status(400).json({
        success: false,
        error: 'Cannot suspend your own account',
      });
      return;
    }

    // Verify user exists
    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: { id: true, role: true, isBanned: true },
    });

    if (!user) {
      res.status(404).json({
        success: false,
        error: 'User not found',
      });
      return;
    }

    if (user.isBanned) {
      res.status(400).json({
        success: false,
        error: 'User is already suspended',
      });
      return;
    }

    // Prevent suspending admins (unless you're an admin)
    if (user.role === 'admin' && req.adminRole !== 'admin') {
      res.status(403).json({
        success: false,
        error: 'Cannot suspend admin users',
      });
      return;
    }

    // Suspend user
    await prisma.user.update({
      where: { id: userId },
      data: {
        isBanned: true,
        banReason: reason,
        isActive: false,
      },
    });

    // Log action
    await logAdminAction(
      req.user!.id,
      'USER_SUSPENDED',
      'user',
      userId,
      { reason },
      req
    );

    res.json({
      success: true,
      message: 'User suspended successfully',
    });
  } catch (error) {
    logger.error('Suspend user error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to suspend user',
    });
  }
};

// ============================================
// Unsuspend User
// ============================================

/**
 * POST /api/v1/admin/users/:userId/unsuspend
 * Reactivate a suspended user account
 */
export const unsuspendUser = async (req: Request, res: Response): Promise<void> => {
  try {
    const { userId } = req.params;

    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: { id: true, isBanned: true },
    });

    if (!user) {
      res.status(404).json({
        success: false,
        error: 'User not found',
      });
      return;
    }

    if (!user.isBanned) {
      res.status(400).json({
        success: false,
        error: 'User is not suspended',
      });
      return;
    }

    // Unsuspend user
    await prisma.user.update({
      where: { id: userId },
      data: {
        isBanned: false,
        banReason: null,
        isActive: true,
      },
    });

    // Log action
    await logAdminAction(
      req.user!.id,
      'USER_UNSUSPENDED',
      'user',
      userId,
      {},
      req
    );

    res.json({
      success: true,
      message: 'User unsuspended successfully',
    });
  } catch (error) {
    logger.error('Unsuspend user error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to unsuspend user',
    });
  }
};

// ============================================
// Delete User
// ============================================

/**
 * DELETE /api/v1/admin/users/:userId
 * Delete a user (soft or hard delete)
 */
export const deleteUser = async (req: Request, res: Response): Promise<void> => {
  try {
    const { userId } = req.params;
    const { hardDelete = false, confirmed = false } = req.body;

    // Require confirmation for destructive action
    if (!confirmed) {
      res.status(400).json({
        success: false,
        error: 'Deletion requires confirmation. Set confirmed: true',
      });
      return;
    }

    // Prevent self-deletion
    if (userId === req.user?.id) {
      res.status(400).json({
        success: false,
        error: 'Cannot delete your own account',
      });
      return;
    }

    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: { id: true, role: true, email: true },
    });

    if (!user) {
      res.status(404).json({
        success: false,
        error: 'User not found',
      });
      return;
    }

    // Prevent deleting admins
    if (user.role === 'admin') {
      res.status(403).json({
        success: false,
        error: 'Cannot delete admin users',
      });
      return;
    }

    if (hardDelete) {
      // Hard delete - GDPR compliant full deletion
      // This cascades due to schema relations
      await prisma.user.delete({
        where: { id: userId },
      });

      await logAdminAction(
        req.user!.id,
        'USER_HARD_DELETED',
        'user',
        userId,
        { email: user.email },
        req
      );

      res.json({
        success: true,
        message: 'User and all data permanently deleted',
      });
    } else {
      // Soft delete - mark as deleted
      await prisma.user.update({
        where: { id: userId },
        data: {
          isActive: false,
          isBanned: true,
          banReason: 'Account deleted by admin',
        },
      });

      await logAdminAction(
        req.user!.id,
        'USER_SOFT_DELETED',
        'user',
        userId,
        {},
        req
      );

      res.json({
        success: true,
        message: 'User account deactivated',
      });
    }
  } catch (error) {
    logger.error('Delete user error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to delete user',
    });
  }
};

// ============================================
// Bulk Actions
// ============================================

/**
 * POST /api/v1/admin/users/bulk-action
 * Perform bulk actions on multiple users
 */
export const bulkAction = async (req: Request, res: Response): Promise<void> => {
  try {
    const { userIds, action, data, confirmed = false } = req.body;

    if (!userIds || !Array.isArray(userIds) || userIds.length === 0) {
      res.status(400).json({
        success: false,
        error: 'userIds array is required',
      });
      return;
    }

    if (userIds.length > 100) {
      res.status(400).json({
        success: false,
        error: 'Maximum 100 users per bulk action',
      });
      return;
    }

    if (!confirmed) {
      res.status(400).json({
        success: false,
        error: 'Bulk action requires confirmation',
        affectedUsers: userIds.length,
      });
      return;
    }

    // Remove self from bulk actions
    const filteredIds = userIds.filter((id: string) => id !== req.user?.id);

    const results = {
      success: [] as string[],
      failed: [] as { userId: string; error: string }[],
    };

    for (const userId of filteredIds) {
      try {
        switch (action) {
          case 'suspend':
            await prisma.user.update({
              where: { id: userId },
              data: {
                isBanned: true,
                banReason: data?.reason || 'Bulk suspension',
                isActive: false,
              },
            });
            results.success.push(userId);
            break;

          case 'unsuspend':
            await prisma.user.update({
              where: { id: userId },
              data: {
                isBanned: false,
                banReason: null,
                isActive: true,
              },
            });
            results.success.push(userId);
            break;

          case 'change_tier':
            if (!data?.tier) throw new Error('Tier is required');
            await prisma.user.update({
              where: { id: userId },
              data: { tier: data.tier },
            });
            results.success.push(userId);
            break;

          case 'change_role':
            if (!data?.role) throw new Error('Role is required');
            await prisma.user.update({
              where: { id: userId },
              data: { role: data.role },
            });
            results.success.push(userId);
            break;

          default:
            results.failed.push({ userId, error: 'Unknown action' });
        }
      } catch (error: any) {
        results.failed.push({ userId, error: error.message });
      }
    }

    // Log bulk action
    await logAdminAction(
      req.user!.id,
      'BULK_ACTION',
      'users',
      undefined,
      { action, userCount: filteredIds.length, results },
      req
    );

    res.json({
      success: true,
      data: results,
      message: `Bulk action completed: ${results.success.length} succeeded, ${results.failed.length} failed`,
    });
  } catch (error) {
    logger.error('Bulk action error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to perform bulk action',
    });
  }
};

// ============================================
// Export User Data (GDPR)
// ============================================

/**
 * GET /api/v1/admin/users/:userId/export
 * Export all user data (GDPR compliance)
 */
export const exportUserData = async (req: Request, res: Response): Promise<void> => {
  try {
    const { userId } = req.params;

    const [user, conversations, analytics, apiKeys, webhooks, auditLogs] = await Promise.all([
      prisma.user.findUnique({ where: { id: userId } }),
      prisma.conversation.findMany({
        where: { userId },
        include: { messages: true },
      }),
      prisma.analytics.findMany({ where: { userId } }),
      prisma.apiKey.findMany({ where: { userId } }),
      prisma.webhook.findMany({ where: { userId } }),
      prisma.auditLog.findMany({ where: { userId } }),
    ]);

    if (!user) {
      res.status(404).json({
        success: false,
        error: 'User not found',
      });
      return;
    }

    const exportData = {
      user: {
        ...user,
        // Exclude sensitive fields
        preferences: undefined,
      },
      conversations,
      analytics,
      apiKeys: apiKeys.map(k => ({ ...k, keyHash: '[REDACTED]' })),
      webhooks: webhooks.map(w => ({ ...w, secret: '[REDACTED]' })),
      auditLogs,
      exportedAt: new Date(),
      exportedBy: req.user?.id,
    };

    // Log export
    await logAdminAction(
      req.user!.id,
      'USER_DATA_EXPORTED',
      'user',
      userId,
      {},
      req
    );

    // Send as downloadable JSON
    const filename = `user_${userId}_export_${Date.now()}.json`;
    res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
    res.setHeader('Content-Type', 'application/json');
    res.json(exportData);
  } catch (error) {
    logger.error('Export user data error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to export user data',
    });
  }
};

// ============================================
// Moderator Management
// ============================================

/**
 * POST /api/v1/admin/moderators/invite
 * Invite a user as moderator or admin
 */
export const inviteModerator = async (req: Request, res: Response): Promise<void> => {
  try {
    const { email, role = 'moderator' } = req.body;

    if (!email) {
      res.status(400).json({
        success: false,
        error: 'Email is required',
      });
      return;
    }

    if (!['admin', 'moderator'].includes(role)) {
      res.status(400).json({
        success: false,
        error: 'Role must be admin or moderator',
      });
      return;
    }

    // Check if user exists
    const user = await prisma.user.findUnique({
      where: { email: email.toLowerCase() },
      select: { id: true, email: true, role: true, firstName: true, lastName: true },
    });

    if (!user) {
      res.status(404).json({
        success: false,
        error: 'User not found. They must sign up first before being promoted to moderator.',
      });
      return;
    }

    // Check if already has elevated role
    if (user.role === 'admin' || user.role === 'moderator') {
      res.status(400).json({
        success: false,
        error: `User is already a ${user.role}`,
      });
      return;
    }

    // Promote user
    const updatedUser = await prisma.user.update({
      where: { id: user.id },
      data: { role },
      select: {
        id: true,
        email: true,
        role: true,
        firstName: true,
        lastName: true,
      },
    });

    // Log action
    await logAdminAction(
      req.user!.id,
      'MODERATOR_INVITED',
      'user',
      user.id,
      { email, role },
      req
    );

    logger.info(`User ${email} promoted to ${role} by ${req.user?.email}`);

    res.json({
      success: true,
      data: updatedUser,
      message: `User ${email} has been promoted to ${role}`,
    });
  } catch (error) {
    logger.error('Invite moderator error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to invite moderator',
    });
  }
};

/**
 * GET /api/v1/admin/moderators
 * List all moderators and admins
 */
export const listModerators = async (req: Request, res: Response): Promise<void> => {
  try {
    const moderators = await prisma.user.findMany({
      where: {
        role: { in: ['admin', 'moderator'] },
      },
      orderBy: [
        { role: 'asc' }, // admins first
        { createdAt: 'desc' },
      ],
      select: {
        id: true,
        email: true,
        username: true,
        firstName: true,
        lastName: true,
        avatar: true,
        role: true,
        isActive: true,
        lastLoginAt: true,
        createdAt: true,
      },
    });

    res.json({
      success: true,
      data: {
        moderators: moderators.map(m => ({
          ...m,
          name: `${m.firstName || ''} ${m.lastName || ''}`.trim() || m.email,
        })),
        count: moderators.length,
        admins: moderators.filter(m => m.role === 'admin').length,
        moderatorCount: moderators.filter(m => m.role === 'moderator').length,
      },
    });
  } catch (error) {
    logger.error('List moderators error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to list moderators',
    });
  }
};

/**
 * POST /api/v1/admin/moderators/:userId/revoke
 * Revoke moderator/admin access (demote to user)
 */
export const revokeModerator = async (req: Request, res: Response): Promise<void> => {
  try {
    const { userId } = req.params;

    // Prevent self-demotion
    if (userId === req.user?.id) {
      res.status(400).json({
        success: false,
        error: 'Cannot revoke your own moderator access',
      });
      return;
    }

    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: { id: true, email: true, role: true },
    });

    if (!user) {
      res.status(404).json({
        success: false,
        error: 'User not found',
      });
      return;
    }

    if (user.role === 'user') {
      res.status(400).json({
        success: false,
        error: 'User is not a moderator or admin',
      });
      return;
    }

    // Demote to regular user
    const updatedUser = await prisma.user.update({
      where: { id: userId },
      data: { role: 'user' },
      select: {
        id: true,
        email: true,
        role: true,
      },
    });

    // Log action
    await logAdminAction(
      req.user!.id,
      'MODERATOR_REVOKED',
      'user',
      userId,
      { previousRole: user.role },
      req
    );

    logger.info(`User ${user.email} demoted from ${user.role} to user by ${req.user?.email}`);

    res.json({
      success: true,
      data: updatedUser,
      message: `${user.email}'s moderator access has been revoked`,
    });
  } catch (error) {
    logger.error('Revoke moderator error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to revoke moderator access',
    });
  }
};
