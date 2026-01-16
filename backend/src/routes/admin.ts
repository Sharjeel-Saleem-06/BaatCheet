/**
 * Admin Routes
 * All admin panel API endpoints
 * 
 * @module AdminRoutes
 */

import { Router } from 'express';
import { requireClerkAuth } from '../middleware/clerkAuth.js';
import { 
  requireAdmin, 
  requireFullAdmin,
  requirePermission,
  auditLog,
  adminRateLimit,
  AdminPermission 
} from '../middleware/adminAuth.js';
import {
  dashboardController,
  usersController,
  moderationController,
  analyticsController,
  settingsController,
} from '../controllers/admin/index.js';

const router = Router();

// ============================================
// All admin routes require authentication + admin role
// ============================================

router.use(requireClerkAuth);
router.use(requireAdmin);
router.use(adminRateLimit(200, 60000)); // 200 requests per minute for admins

// ============================================
// Dashboard Routes
// ============================================

/**
 * @swagger
 * /admin/dashboard:
 *   get:
 *     summary: Get admin dashboard overview
 *     tags: [Admin - Dashboard]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Dashboard data
 */
router.get('/dashboard', dashboardController.getDashboard);

/**
 * @swagger
 * /admin/dashboard/stats:
 *   get:
 *     summary: Get quick stats (for real-time updates)
 *     tags: [Admin - Dashboard]
 */
router.get('/dashboard/stats', dashboardController.getQuickStats);

// ============================================
// User Management Routes
// ============================================

/**
 * @swagger
 * /admin/users:
 *   get:
 *     summary: List all users
 *     tags: [Admin - Users]
 *     parameters:
 *       - in: query
 *         name: page
 *         schema:
 *           type: integer
 *       - in: query
 *         name: limit
 *         schema:
 *           type: integer
 *       - in: query
 *         name: search
 *         schema:
 *           type: string
 *       - in: query
 *         name: role
 *         schema:
 *           type: string
 *       - in: query
 *         name: tier
 *         schema:
 *           type: string
 *       - in: query
 *         name: status
 *         schema:
 *           type: string
 */
router.get(
  '/users',
  requirePermission(AdminPermission.VIEW_USERS),
  usersController.listUsers
);

/**
 * @swagger
 * /admin/users/{userId}:
 *   get:
 *     summary: Get user details
 *     tags: [Admin - Users]
 */
router.get(
  '/users/:userId',
  requirePermission(AdminPermission.VIEW_USERS),
  usersController.getUserDetails
);

/**
 * @swagger
 * /admin/users/{userId}:
 *   put:
 *     summary: Update user
 *     tags: [Admin - Users]
 */
router.put(
  '/users/:userId',
  requirePermission(AdminPermission.EDIT_USERS),
  auditLog('USER_UPDATED'),
  usersController.updateUser
);

/**
 * @swagger
 * /admin/users/{userId}/suspend:
 *   post:
 *     summary: Suspend user
 *     tags: [Admin - Users]
 */
router.post(
  '/users/:userId/suspend',
  requirePermission(AdminPermission.SUSPEND_USERS),
  auditLog('USER_SUSPENDED'),
  usersController.suspendUser
);

/**
 * @swagger
 * /admin/users/{userId}/unsuspend:
 *   post:
 *     summary: Unsuspend user
 *     tags: [Admin - Users]
 */
router.post(
  '/users/:userId/unsuspend',
  requirePermission(AdminPermission.SUSPEND_USERS),
  auditLog('USER_UNSUSPENDED'),
  usersController.unsuspendUser
);

/**
 * @swagger
 * /admin/users/{userId}:
 *   delete:
 *     summary: Delete user
 *     tags: [Admin - Users]
 */
router.delete(
  '/users/:userId',
  requireFullAdmin, // Only full admins can delete
  requirePermission(AdminPermission.DELETE_USERS),
  auditLog('USER_DELETED'),
  usersController.deleteUser
);

/**
 * @swagger
 * /admin/users/bulk-action:
 *   post:
 *     summary: Bulk action on users
 *     tags: [Admin - Users]
 */
router.post(
  '/users/bulk-action',
  requireFullAdmin,
  auditLog('BULK_ACTION'),
  usersController.bulkAction
);

/**
 * @swagger
 * /admin/users/{userId}/export:
 *   get:
 *     summary: Export user data (GDPR)
 *     tags: [Admin - Users]
 */
router.get(
  '/users/:userId/export',
  requireFullAdmin,
  auditLog('USER_DATA_EXPORTED'),
  usersController.exportUserData
);

/**
 * @swagger
 * /admin/moderators/invite:
 *   post:
 *     summary: Invite a user as moderator
 *     tags: [Admin - Users]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               email:
 *                 type: string
 *               role:
 *                 type: string
 *                 enum: [admin, moderator]
 */
router.post(
  '/moderators/invite',
  requireFullAdmin,
  auditLog('MODERATOR_INVITED'),
  usersController.inviteModerator
);

/**
 * @swagger
 * /admin/moderators:
 *   get:
 *     summary: List all moderators and admins
 *     tags: [Admin - Users]
 */
router.get(
  '/moderators',
  requirePermission(AdminPermission.VIEW_USERS),
  usersController.listModerators
);

/**
 * @swagger
 * /admin/moderators/{userId}/revoke:
 *   post:
 *     summary: Revoke moderator/admin access
 *     tags: [Admin - Users]
 */
router.post(
  '/moderators/:userId/revoke',
  requireFullAdmin,
  auditLog('MODERATOR_REVOKED'),
  usersController.revokeModerator
);

// ============================================
// Content Moderation Routes
// ============================================

/**
 * @swagger
 * /admin/conversations:
 *   get:
 *     summary: List all conversations
 *     tags: [Admin - Moderation]
 */
router.get(
  '/conversations',
  requirePermission(AdminPermission.VIEW_CONVERSATIONS),
  moderationController.listConversations
);

/**
 * @swagger
 * /admin/conversations/{conversationId}:
 *   get:
 *     summary: Get conversation details
 *     tags: [Admin - Moderation]
 */
router.get(
  '/conversations/:conversationId',
  requirePermission(AdminPermission.VIEW_CONVERSATIONS),
  moderationController.getConversation
);

/**
 * @swagger
 * /admin/conversations/{conversationId}/flag:
 *   post:
 *     summary: Flag conversation
 *     tags: [Admin - Moderation]
 */
router.post(
  '/conversations/:conversationId/flag',
  requirePermission(AdminPermission.FLAG_CONTENT),
  auditLog('CONVERSATION_FLAGGED'),
  moderationController.flagConversation
);

/**
 * @swagger
 * /admin/conversations/{conversationId}:
 *   delete:
 *     summary: Delete conversation
 *     tags: [Admin - Moderation]
 */
router.delete(
  '/conversations/:conversationId',
  requirePermission(AdminPermission.DELETE_CONVERSATIONS),
  auditLog('CONVERSATION_DELETED'),
  moderationController.deleteConversation
);

/**
 * @swagger
 * /admin/flagged-content:
 *   get:
 *     summary: List flagged content
 *     tags: [Admin - Moderation]
 */
router.get(
  '/flagged-content',
  requirePermission(AdminPermission.REVIEW_FLAGS),
  moderationController.listFlaggedContent
);

/**
 * @swagger
 * /admin/flagged-content/{flagId}/review:
 *   post:
 *     summary: Review flagged content
 *     tags: [Admin - Moderation]
 */
router.post(
  '/flagged-content/:flagId/review',
  requirePermission(AdminPermission.REVIEW_FLAGS),
  auditLog('FLAG_REVIEWED'),
  moderationController.reviewFlag
);

// ============================================
// API Usage & Analytics Routes
// ============================================

/**
 * @swagger
 * /admin/api-usage:
 *   get:
 *     summary: Get API usage statistics
 *     tags: [Admin - Analytics]
 */
router.get(
  '/api-usage',
  requirePermission(AdminPermission.VIEW_ANALYTICS),
  analyticsController.getApiUsage
);

/**
 * @swagger
 * /admin/api-usage/providers/{provider}:
 *   get:
 *     summary: Get provider-specific usage
 *     tags: [Admin - Analytics]
 */
router.get(
  '/api-usage/providers/:provider',
  requirePermission(AdminPermission.VIEW_ANALYTICS),
  analyticsController.getProviderUsage
);

/**
 * @swagger
 * /admin/api-usage/users/{userId}:
 *   get:
 *     summary: Get user-specific usage
 *     tags: [Admin - Analytics]
 */
router.get(
  '/api-usage/users/:userId',
  requirePermission(AdminPermission.VIEW_ANALYTICS),
  analyticsController.getUserUsage
);

/**
 * @swagger
 * /admin/api-usage/top-users:
 *   get:
 *     summary: Get top users by usage
 *     tags: [Admin - Analytics]
 */
router.get(
  '/api-usage/top-users',
  requirePermission(AdminPermission.VIEW_ANALYTICS),
  analyticsController.getTopUsers
);

// ============================================
// System Settings Routes
// ============================================

/**
 * @swagger
 * /admin/settings:
 *   get:
 *     summary: Get system settings
 *     tags: [Admin - Settings]
 */
router.get(
  '/settings',
  requirePermission(AdminPermission.VIEW_SETTINGS),
  settingsController.getSettings
);

/**
 * @swagger
 * /admin/settings:
 *   put:
 *     summary: Update system settings
 *     tags: [Admin - Settings]
 */
router.put(
  '/settings',
  requireFullAdmin,
  requirePermission(AdminPermission.EDIT_SETTINGS),
  auditLog('SETTINGS_UPDATED'),
  settingsController.updateSettings
);

/**
 * @swagger
 * /admin/settings/ai-providers:
 *   get:
 *     summary: Get AI provider configurations
 *     tags: [Admin - Settings]
 */
router.get(
  '/settings/ai-providers',
  requirePermission(AdminPermission.VIEW_SETTINGS),
  settingsController.getProviders
);

/**
 * @swagger
 * /admin/settings/ai-providers/{provider}:
 *   put:
 *     summary: Update provider settings
 *     tags: [Admin - Settings]
 */
router.put(
  '/settings/ai-providers/:provider',
  requireFullAdmin,
  requirePermission(AdminPermission.MANAGE_PROVIDERS),
  auditLog('PROVIDER_UPDATED'),
  settingsController.updateProvider
);

// ============================================
// Audit Log Routes
// ============================================

/**
 * @swagger
 * /admin/audit-logs:
 *   get:
 *     summary: Get audit logs
 *     tags: [Admin - Audit]
 */
router.get(
  '/audit-logs',
  requirePermission(AdminPermission.VIEW_AUDIT_LOGS),
  settingsController.getAuditLogs
);

/**
 * @swagger
 * /admin/audit-logs/export:
 *   get:
 *     summary: Export audit logs
 *     tags: [Admin - Audit]
 */
router.get(
  '/audit-logs/export',
  requireFullAdmin,
  requirePermission(AdminPermission.EXPORT_AUDIT_LOGS),
  auditLog('AUDIT_LOGS_EXPORTED'),
  settingsController.exportAuditLogs
);

export default router;
