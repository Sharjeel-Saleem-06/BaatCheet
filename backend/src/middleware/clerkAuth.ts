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
// Admin/Moderator Email Mappings
// ============================================
const ADMIN_EMAILS = ['sharry00010@gmail.com'];
const MODERATOR_EMAILS = ['clashroyale8ab@gmail.com'];

function getRoleForEmail(email: string): UserRole {
  const lowerEmail = email.toLowerCase();
  if (ADMIN_EMAILS.includes(lowerEmail)) return 'admin';
  if (MODERATOR_EMAILS.includes(lowerEmail)) return 'moderator';
  return 'user';
}

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
      const email = clerkUser.emailAddresses[0]?.emailAddress || '';
      
      // Determine role based on email
      const role = getRoleForEmail(email);

      // Create user in database
      user = await prisma.user.create({
        data: {
          clerkId: clerkUserId,
          email,
          username: clerkUser.username,
          firstName: clerkUser.firstName,
          lastName: clerkUser.lastName,
          avatar: clerkUser.imageUrl,
          role, // Assign role based on email
        },
      });

      logger.info(`New user created from Clerk: ${user.email} (role: ${role})`);
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

/**
 * Alias for clerkAuth (clearer naming)
 */
export const requireClerkAuth = clerkAuth;

export default clerkAuth;
