/**
 * Authentication Routes
 * Handles user authentication with Clerk
 * 
 * @module Routes/Auth
 */

import { Router, Request, Response } from 'express';
import { clerkClient, getAuth } from '@clerk/express';
import { prisma } from '../config/database.js';
import { clerkAuth, optionalClerkAuth } from '../middleware/index.js';
import { logger } from '../utils/logger.js';
import { UserPreferences } from '../types/index.js';

const router = Router();

// ============================================
// Helper Functions
// ============================================

const parsePreferences = (prefs: unknown): UserPreferences => {
  const defaults: UserPreferences = {
    theme: 'dark',
    defaultModel: 'llama-3.3-70b-versatile',
    language: 'en',
  };

  if (typeof prefs === 'object' && prefs !== null) {
    const p = prefs as Record<string, unknown>;
    return {
      theme: (p.theme as 'light' | 'dark') || defaults.theme,
      defaultModel: (p.defaultModel as string) || defaults.defaultModel,
      language: (p.language as 'en' | 'ur') || defaults.language,
    };
  }

  return defaults;
};

// ============================================
// Authentication Routes
// ============================================

/**
 * GET /api/v1/auth/me
 * Get current user profile (syncs with Clerk)
 */
router.get(
  '/me',
  clerkAuth,
  async (req: Request, res: Response): Promise<void> => {
    try {
      const user = await prisma.user.findUnique({
        where: { id: req.user!.id },
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
          preferences: true,
          createdAt: true,
          updatedAt: true,
          _count: {
            select: {
              conversations: true,
              projects: true,
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

      res.json({
        success: true,
        data: {
          ...user,
          preferences: parsePreferences(user.preferences),
        },
      });
    } catch (error) {
      logger.error('Get user error:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to get user',
      });
    }
  }
);

/**
 * POST /api/v1/auth/sync
 * Sync user data from Clerk to database
 */
router.post(
  '/sync',
  async (req: Request, res: Response): Promise<void> => {
    try {
      const { userId: clerkUserId } = getAuth(req);

      if (!clerkUserId) {
        res.status(401).json({
          success: false,
          error: 'Not authenticated',
        });
        return;
      }

      // Get user from Clerk
      const clerkUser = await clerkClient.users.getUser(clerkUserId);

      // Upsert user in database
      const user = await prisma.user.upsert({
        where: { clerkId: clerkUserId },
        update: {
          email: clerkUser.emailAddresses[0]?.emailAddress || '',
          username: clerkUser.username,
          firstName: clerkUser.firstName,
          lastName: clerkUser.lastName,
          avatar: clerkUser.imageUrl,
          lastLoginAt: new Date(),
          loginCount: { increment: 1 },
        },
        create: {
          clerkId: clerkUserId,
          email: clerkUser.emailAddresses[0]?.emailAddress || '',
          username: clerkUser.username,
          firstName: clerkUser.firstName,
          lastName: clerkUser.lastName,
          avatar: clerkUser.imageUrl,
        },
      });

      // Create audit log
      await prisma.auditLog.create({
        data: {
          userId: user.id,
          action: 'user.sync',
          resource: 'user',
          resourceId: user.id,
          ipAddress: req.ip,
          userAgent: req.get('user-agent'),
        },
      });

      logger.info(`User synced: ${user.email}`);

      res.json({
        success: true,
        data: {
          id: user.id,
          email: user.email,
          username: user.username,
          firstName: user.firstName,
          lastName: user.lastName,
          avatar: user.avatar,
          role: user.role,
          tier: user.tier,
          preferences: parsePreferences(user.preferences),
        },
      });
    } catch (error) {
      logger.error('Sync user error:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to sync user',
      });
    }
  }
);

/**
 * PUT /api/v1/auth/preferences
 * Update user preferences
 */
router.put(
  '/preferences',
  clerkAuth,
  async (req: Request, res: Response): Promise<void> => {
    try {
      const { theme, defaultModel, language } = req.body;

      const currentUser = await prisma.user.findUnique({
        where: { id: req.user!.id },
      });

      if (!currentUser) {
        res.status(404).json({
          success: false,
          error: 'User not found',
        });
        return;
      }

      const currentPrefs = parsePreferences(currentUser.preferences);
      const newPreferences = {
        theme: theme || currentPrefs.theme,
        defaultModel: defaultModel || currentPrefs.defaultModel,
        language: language || currentPrefs.language,
      };

      const user = await prisma.user.update({
        where: { id: req.user!.id },
        data: { preferences: newPreferences },
        select: {
          id: true,
          preferences: true,
        },
      });

      res.json({
        success: true,
        data: { preferences: parsePreferences(user.preferences) },
        message: 'Preferences updated',
      });
    } catch (error) {
      logger.error('Update preferences error:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to update preferences',
      });
    }
  }
);

/**
 * DELETE /api/v1/auth/account
 * Delete user account (GDPR compliance)
 */
router.delete(
  '/account',
  clerkAuth,
  async (req: Request, res: Response): Promise<void> => {
    try {
      const user = await prisma.user.findUnique({
        where: { id: req.user!.id },
      });

      if (!user) {
        res.status(404).json({
          success: false,
          error: 'User not found',
        });
        return;
      }

      // Create audit log before deletion
      await prisma.auditLog.create({
        data: {
          action: 'user.deleted',
          resource: 'user',
          resourceId: user.id,
          ipAddress: req.ip,
          userAgent: req.get('user-agent'),
          metadata: { email: user.email, reason: 'user_requested' },
        },
      });

      // Delete user from database (cascades to all related data)
      await prisma.user.delete({
        where: { id: user.id },
      });

      // Delete user from Clerk
      try {
        await clerkClient.users.deleteUser(user.clerkId);
      } catch (clerkError) {
        logger.warn('Failed to delete user from Clerk:', clerkError);
      }

      logger.info(`User account deleted: ${user.email}`);

      res.json({
        success: true,
        message: 'Account deleted successfully',
      });
    } catch (error) {
      logger.error('Delete account error:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to delete account',
      });
    }
  }
);

/**
 * GET /api/v1/auth/export
 * Export user data (GDPR compliance)
 */
router.get(
  '/export',
  clerkAuth,
  async (req: Request, res: Response): Promise<void> => {
    try {
      const user = await prisma.user.findUnique({
        where: { id: req.user!.id },
        include: {
          conversations: {
            include: {
              messages: true,
            },
          },
          projects: true,
          audioFiles: true,
          analytics: true,
          webhooks: true,
          apiKeys: {
            select: {
              id: true,
              name: true,
              keyPrefix: true,
              permissions: true,
              createdAt: true,
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

      // Create audit log
      await prisma.auditLog.create({
        data: {
          userId: user.id,
          action: 'user.data_export',
          resource: 'user',
          resourceId: user.id,
          ipAddress: req.ip,
          userAgent: req.get('user-agent'),
        },
      });

      // Remove sensitive fields
      const exportData = {
        ...user,
        clerkId: undefined,
      };

      res.setHeader('Content-Disposition', `attachment; filename="baatcheet-data-${Date.now()}.json"`);
      res.setHeader('Content-Type', 'application/json');
      res.send(JSON.stringify(exportData, null, 2));
    } catch (error) {
      logger.error('Export data error:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to export data',
      });
    }
  }
);

/**
 * GET /api/v1/auth/session
 * Get current session info
 */
router.get(
  '/session',
  optionalClerkAuth,
  async (req: Request, res: Response): Promise<void> => {
    try {
      const { userId: clerkUserId, sessionId } = getAuth(req);

      if (!clerkUserId) {
        res.json({
          success: true,
          data: {
            authenticated: false,
          },
        });
        return;
      }

      const user = await prisma.user.findUnique({
        where: { clerkId: clerkUserId },
        select: {
          id: true,
          email: true,
          role: true,
          tier: true,
        },
      });

      res.json({
        success: true,
        data: {
          authenticated: true,
          sessionId,
          user: user ? {
            id: user.id,
            email: user.email,
            role: user.role,
            tier: user.tier,
          } : null,
        },
      });
    } catch (error) {
      logger.error('Session check error:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to check session',
      });
    }
  }
);

// ============================================
// Google OAuth Routes
// ============================================

/**
 * POST /api/v1/auth/google
 * Authenticate with Google ID Token
 * Used by Android app to sign in with Google credentials
 */
router.post(
  '/google',
  async (req: Request, res: Response): Promise<void> => {
    try {
      const { idToken, platform = 'android' } = req.body;

      if (!idToken) {
        res.status(400).json({
          success: false,
          error: 'Google ID token is required',
        });
        return;
      }

      logger.info('Processing Google OAuth', { platform });

      // Verify the Google ID token with Google's API
      const { OAuth2Client } = await import('google-auth-library');
      const client = new OAuth2Client(process.env.GOOGLE_CLIENT_ID);

      const ticket = await client.verifyIdToken({
        idToken,
        audience: process.env.GOOGLE_CLIENT_ID,
      });

      const payload = ticket.getPayload();

      if (!payload || !payload.email) {
        res.status(401).json({
          success: false,
          error: 'Invalid Google token',
        });
        return;
      }

      const { email, given_name, family_name, picture, sub: googleId } = payload;

      logger.info('Google token verified', { email, googleId });

      // Check if user exists
      let user = await prisma.user.findUnique({
        where: { email },
      });

      if (user) {
        // Update user with Google info if not already set
        user = await prisma.user.update({
          where: { id: user.id },
          data: {
            firstName: user.firstName || given_name,
            lastName: user.lastName || family_name,
            avatar: user.avatar || picture,
            lastLoginAt: new Date(),
            loginCount: { increment: 1 },
          },
        });

        logger.info('Existing user logged in via Google', { userId: user.id, email });
      } else {
        // Create new user
        const username = email.split('@')[0] + '_' + Math.random().toString(36).substring(2, 8);
        
        user = await prisma.user.create({
          data: {
            clerkId: `google_${googleId}`, // Use Google ID as clerk ID for Google users
            email,
            username,
            firstName: given_name,
            lastName: family_name,
            avatar: picture,
            role: 'user',
            tier: 'free',
            lastLoginAt: new Date(),
            loginCount: 1,
          },
        });

        // Create default quota
        await prisma.imageGenerationQuota.create({
          data: {
            userId: user.id,
            dailyLimit: 5,
            monthlyLimit: 50,
          },
        });

        logger.info('New user created via Google OAuth', { userId: user.id, email });
      }

      // Generate a session token (simple JWT for now)
      const jwt = await import('jsonwebtoken');
      const sessionToken = jwt.default.sign(
        {
          userId: user.id,
          email: user.email,
          provider: 'google',
        },
        process.env.JWT_SECRET || 'baatcheet-secret-key',
        { expiresIn: '30d' }
      );

      res.json({
        success: true,
        data: {
          user: {
            id: user.id,
            email: user.email,
            username: user.username,
            firstName: user.firstName,
            lastName: user.lastName,
            avatar: user.avatar,
            tier: user.tier,
          },
          token: sessionToken,
          isNewUser: user.loginCount === 1,
        },
      });
    } catch (error) {
      logger.error('Google OAuth error:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to authenticate with Google',
      });
    }
  }
);

export default router;
