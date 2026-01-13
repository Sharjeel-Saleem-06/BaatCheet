import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import { jwtSecret } from '../config/index.js';
import { prisma } from '../config/database.js';
import { AuthPayload } from '../types/index.js';
import { logger } from '../utils/logger.js';

// Mobile JWT payload structure
interface MobileJwtPayload {
  userId: string;
  clerkId: string;
  email: string;
  iat?: number;
  exp?: number;
}

// ============================================
// Authentication Middleware
// ============================================

/**
 * Verify JWT token and attach user to request
 * Works with both mobile JWT tokens and can lookup full user details
 */
export const authenticate = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const authHeader = req.headers.authorization;

    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      res.status(401).json({
        success: false,
        error: 'Access denied. No token provided.',
      });
      return;
    }

    const token = authHeader.split(' ')[1];
    const decoded = jwt.verify(token, jwtSecret) as MobileJwtPayload;

    // Lookup full user details from database
    const user = await prisma.user.findUnique({
      where: { id: decoded.userId },
      select: {
        id: true,
        clerkId: true,
        email: true,
        role: true,
        tier: true,
        isBanned: true,
        banReason: true,
      },
    });

    if (!user) {
      res.status(401).json({
        success: false,
        error: 'User not found.',
      });
      return;
    }

    if (user.isBanned) {
      res.status(403).json({
        success: false,
        error: 'Account suspended',
        reason: user.banReason,
      });
      return;
    }

    req.user = {
      id: user.id,
      clerkId: user.clerkId,
      email: user.email,
      role: user.role,
      tier: user.tier,
    };
    
    next();
  } catch (error) {
    logger.error('JWT auth error:', error);
    res.status(401).json({
      success: false,
      error: 'Invalid or expired token.',
    });
  }
};

/**
 * Optional authentication - doesn't fail if no token
 */
export const optionalAuth = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const authHeader = req.headers.authorization;

    if (authHeader && authHeader.startsWith('Bearer ')) {
      const token = authHeader.split(' ')[1];
      const decoded = jwt.verify(token, jwtSecret) as MobileJwtPayload;
      
      // Lookup full user details from database
      const user = await prisma.user.findUnique({
        where: { id: decoded.userId },
        select: {
          id: true,
          clerkId: true,
          email: true,
          role: true,
          tier: true,
          isBanned: true,
        },
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

// Alias for clarity
export const jwtAuth = authenticate;
export const mobileAuth = authenticate;

export default authenticate;
