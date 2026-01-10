/**
 * Clerk Authentication Middleware
 * Handles authentication using Clerk
 * 
 * @module ClerkAuth
 */

import { Request, Response, NextFunction } from 'express';
import { clerkClient, getAuth } from '@clerk/express';
import { prisma } from '../config/database.js';
import { logger } from '../utils/logger.js';
import { UserRole } from '@prisma/client';
import { ClerkUser } from '../types/index.js';

// ============================================
// Clerk Authentication Middleware
// ============================================

/**
 * Authenticate user via Clerk and sync with database
 */
export const clerkAuth = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const { userId: clerkUserId } = getAuth(req);

    if (!clerkUserId) {
      res.status(401).json({
        success: false,
        error: 'Unauthorized. Please sign in.',
      });
      return;
    }

    // Get or create user in database
    let user = await prisma.user.findUnique({
      where: { clerkId: clerkUserId },
    });

    if (!user) {
      // Fetch user details from Clerk
      const clerkUser = await clerkClient.users.getUser(clerkUserId);

      // Create user in database
      user = await prisma.user.create({
        data: {
          clerkId: clerkUserId,
          email: clerkUser.emailAddresses[0]?.emailAddress || '',
          username: clerkUser.username,
          firstName: clerkUser.firstName,
          lastName: clerkUser.lastName,
          avatar: clerkUser.imageUrl,
        },
      });

      logger.info(`New user created from Clerk: ${user.email}`);
    } else {
      // Update last login
      await prisma.user.update({
        where: { id: user.id },
        data: {
          lastLoginAt: new Date(),
          loginCount: { increment: 1 },
        },
      });
    }

    // Check if user is banned
    if (user.isBanned) {
      res.status(403).json({
        success: false,
        error: 'Account suspended',
        reason: user.banReason,
      });
      return;
    }

    // Attach user to request
    req.user = {
      id: user.id,
      clerkId: user.clerkId,
      email: user.email,
      role: user.role,
      tier: user.tier,
    };

    next();
  } catch (error) {
    logger.error('Clerk auth error:', error);
    res.status(401).json({
      success: false,
      error: 'Authentication failed',
    });
  }
};

/**
 * Optional authentication - doesn't fail if no token
 */
export const optionalClerkAuth = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const { userId: clerkUserId } = getAuth(req);

    if (clerkUserId) {
      const user = await prisma.user.findUnique({
        where: { clerkId: clerkUserId },
      });

      if (user && !user.isBanned) {
        req.user = {
          id: user.id,
          clerkId: user.clerkId,
          email: user.email,
          role: user.role,
          tier: user.tier,
        };
      }
    }

    next();
  } catch {
    // Continue without user
    next();
  }
};

/**
 * Role-based access control middleware
 */
export const requireRole = (allowedRoles: UserRole[]) => {
  return (req: Request, res: Response, next: NextFunction): void => {
    if (!req.user) {
      res.status(401).json({
        success: false,
        error: 'Authentication required',
      });
      return;
    }

    if (!allowedRoles.includes(req.user.role)) {
      res.status(403).json({
        success: false,
        error: 'Insufficient permissions',
      });
      return;
    }

    next();
  };
};

/**
 * Admin-only middleware
 */
export const requireAdmin = requireRole(['admin']);

/**
 * Moderator or admin middleware
 */
export const requireModerator = requireRole(['admin', 'moderator']);

export default clerkAuth;
