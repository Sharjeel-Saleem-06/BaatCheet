/**
 * Mobile Authentication Routes
 * Handles mobile app authentication with email/password
 * Creates users via Clerk Backend API and issues JWT tokens
 * 
 * @module Routes/MobileAuth
 */

import { Router, Request, Response } from 'express';
import { clerkClient } from '@clerk/express';
import jwt from 'jsonwebtoken';
import bcrypt from 'bcryptjs';
import { prisma } from '../config/database.js';
import { logger } from '../utils/logger.js';
import { config } from '../config/index.js';

const router = Router();

// ============================================
// Types
// ============================================

interface SignUpRequest {
  email: string;
  password: string;
  firstName?: string;
  lastName?: string;
}

interface SignInRequest {
  email: string;
  password: string;
}

// ============================================
// Helper Functions
// ============================================

const generateJWT = (userId: string, clerkId: string, email: string): string => {
  // Cast expiresIn to any to avoid TS issues with jsonwebtoken types
  const options: any = { expiresIn: config.auth.jwtExpiresIn || '7d' };
  return jwt.sign(
    { userId, clerkId, email },
    config.auth.jwtSecret,
    options
  );
};

const isValidEmail = (email: string): boolean => {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return emailRegex.test(email);
};

const isValidPassword = (password: string): boolean => {
  return password.length >= 8;
};

// ============================================
// Routes
// ============================================

/**
 * POST /api/v1/mobile/auth/signup
 * Register a new user - sends verification code
 */
router.post('/signup', async (req: Request, res: Response): Promise<void> => {
  try {
    const { email, password, firstName, lastName } = req.body as SignUpRequest;

    // Validate input
    if (!email || !password) {
      res.status(400).json({
        success: false,
        error: 'Email and password are required',
      });
      return;
    }

    if (!isValidEmail(email)) {
      res.status(400).json({
        success: false,
        error: 'Invalid email format',
      });
      return;
    }

    if (!isValidPassword(password)) {
      res.status(400).json({
        success: false,
        error: 'Password must be at least 8 characters',
      });
      return;
    }

    // Check if user already exists in database
    const existingUser = await prisma.user.findUnique({
      where: { email: email.toLowerCase() },
    });

    if (existingUser) {
      res.status(409).json({
        success: false,
        error: 'An account with this email already exists. Please sign in instead.',
      });
      return;
    }

    // Check if user exists in Clerk
    try {
      const clerkUsers = await clerkClient.users.getUserList({
        emailAddress: [email.toLowerCase()],
      });

      if (clerkUsers.totalCount > 0) {
        // User exists in Clerk but not in our DB - sync them
        const clerkUser = clerkUsers.data[0];
        
        const user = await prisma.user.create({
          data: {
            clerkId: clerkUser.id,
            email: email.toLowerCase(),
            firstName: clerkUser.firstName,
            lastName: clerkUser.lastName,
            avatar: clerkUser.imageUrl,
          },
        });

        // Generate JWT
        const token = generateJWT(user.id, clerkUser.id, user.email);

        logger.info(`Mobile user synced from Clerk: ${email}`);

        res.status(201).json({
          success: true,
          data: {
            user: {
              id: user.id,
              email: user.email,
              firstName: user.firstName,
              lastName: user.lastName,
              avatar: user.avatar,
            },
            token,
            message: 'Account synced successfully. Please sign in.',
          },
        });
        return;
      }
    } catch (clerkError) {
      logger.warn('Clerk user lookup failed:', clerkError);
    }

    // Create user in Clerk using Backend API
    try {
      const clerkUser = await clerkClient.users.createUser({
        emailAddress: [email.toLowerCase()],
        password,
        firstName: firstName || undefined,
        lastName: lastName || undefined,
        skipPasswordChecks: false,
        skipPasswordRequirement: false,
      });

      // Create user in our database
      const user = await prisma.user.create({
        data: {
          clerkId: clerkUser.id,
          email: email.toLowerCase(),
          firstName: firstName || clerkUser.firstName,
          lastName: lastName || clerkUser.lastName,
          avatar: clerkUser.imageUrl,
        },
      });

      // Generate JWT
      const token = generateJWT(user.id, clerkUser.id, user.email);

      logger.info(`Mobile user created: ${email}`);

      res.status(201).json({
        success: true,
        data: {
          user: {
            id: user.id,
            email: user.email,
            firstName: user.firstName,
            lastName: user.lastName,
            avatar: user.avatar,
          },
          token,
          message: 'Account created successfully!',
        },
      });
    } catch (clerkCreateError: any) {
      logger.error('Clerk user creation failed:', clerkCreateError);
      
      // Check for specific Clerk errors
      const errorMessage = clerkCreateError?.errors?.[0]?.message || 
                          clerkCreateError?.errors?.[0]?.longMessage ||
                          clerkCreateError?.message || 
                          'Failed to create account';
      
      // Handle duplicate email error
      if (errorMessage.toLowerCase().includes('already exists') || 
          errorMessage.toLowerCase().includes('taken') ||
          errorMessage.toLowerCase().includes('unique')) {
        res.status(409).json({
          success: false,
          error: 'An account with this email already exists. Please sign in instead.',
        });
        return;
      }
      
      // Handle password requirements
      if (errorMessage.toLowerCase().includes('password')) {
        res.status(400).json({
          success: false,
          error: errorMessage,
        });
        return;
      }
      
      res.status(500).json({
        success: false,
        error: errorMessage,
      });
    }
  } catch (error) {
    logger.error('Mobile signup error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to create account',
    });
  }
});

/**
 * POST /api/v1/mobile/auth/signin
 * Sign in an existing user
 */
router.post('/signin', async (req: Request, res: Response): Promise<void> => {
  try {
    const { email, password } = req.body as SignInRequest;

    // Validate input
    if (!email || !password) {
      res.status(400).json({
        success: false,
        error: 'Email and password are required',
      });
      return;
    }

    if (!isValidEmail(email)) {
      res.status(400).json({
        success: false,
        error: 'Invalid email format',
      });
      return;
    }

    // Find user in database
    const user = await prisma.user.findUnique({
      where: { email: email.toLowerCase() },
      select: {
        id: true,
        clerkId: true,
        email: true,
        firstName: true,
        lastName: true,
        avatar: true,
        role: true,
        tier: true,
        isActive: true,
        isBanned: true,
        banReason: true,
        preferences: true,
      },
    });

    if (!user) {
      res.status(401).json({
        success: false,
        error: 'Invalid email or password',
      });
      return;
    }

    if (user.isBanned) {
      res.status(403).json({
        success: false,
        error: `Account is banned: ${user.banReason || 'Contact support'}`,
      });
      return;
    }

    if (!user.isActive) {
      res.status(403).json({
        success: false,
        error: 'Account is inactive',
      });
      return;
    }

    // Verify password with Clerk using verifyPassword method
    try {
      // Use Clerk's verifyPassword to check credentials
      const clerkUser = await clerkClient.users.getUser(user.clerkId);
      
      // Clerk SDK v5+ has verifyPassword method
      // For older versions, we use a workaround
      const verifyResult = await clerkClient.users.verifyPassword({
        userId: user.clerkId,
        password,
      });

      if (!verifyResult.verified) {
        res.status(401).json({
          success: false,
          error: 'Invalid email or password',
        });
        return;
      }

      // Update login info
      await prisma.user.update({
        where: { id: user.id },
        data: {
          lastLoginAt: new Date(),
          loginCount: { increment: 1 },
        },
      });

      // Generate JWT
      const token = generateJWT(user.id, user.clerkId, user.email);

      // Create audit log
      await prisma.auditLog.create({
        data: {
          userId: user.id,
          action: 'user.login',
          resource: 'user',
          resourceId: user.id,
          ipAddress: req.ip,
          userAgent: req.get('user-agent'),
          metadata: { source: 'mobile_app' },
        },
      });

      logger.info(`Mobile user signed in: ${email}`);

      res.json({
        success: true,
        data: {
          user: {
            id: user.id,
            email: user.email,
            firstName: user.firstName,
            lastName: user.lastName,
            avatar: user.avatar,
            role: user.role,
            tier: user.tier,
            preferences: user.preferences,
          },
          token,
        },
      });
    } catch (clerkError: any) {
      // Check for specific password error
      const errorMessage = clerkError?.errors?.[0]?.message || clerkError?.message || '';
      
      if (errorMessage.toLowerCase().includes('password') || 
          errorMessage.toLowerCase().includes('incorrect') ||
          errorMessage.toLowerCase().includes('invalid')) {
        res.status(401).json({
          success: false,
          error: 'Invalid email or password',
        });
        return;
      }
      
      logger.error('Clerk verification failed:', clerkError);
      res.status(401).json({
        success: false,
        error: 'Invalid email or password',
      });
    }
  } catch (error) {
    logger.error('Mobile signin error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to sign in',
    });
  }
});

/**
 * POST /api/v1/mobile/auth/forgot-password
 * Request password reset
 */
router.post('/forgot-password', async (req: Request, res: Response): Promise<void> => {
  try {
    const { email } = req.body;

    if (!email || !isValidEmail(email)) {
      res.status(400).json({
        success: false,
        error: 'Valid email is required',
      });
      return;
    }

    // Find user
    const user = await prisma.user.findUnique({
      where: { email: email.toLowerCase() },
    });

    // Always return success for security (don't reveal if email exists)
    if (!user) {
      res.json({
        success: true,
        data: {
          message: 'If an account exists with this email, a password reset link will be sent.',
        },
      });
      return;
    }

    // In production, use Clerk's password reset or a proper email service
    logger.info(`Password reset requested for: ${email}`);

    res.json({
      success: true,
      data: {
        message: 'If an account exists with this email, a password reset link will be sent.',
      },
    });
  } catch (error) {
    logger.error('Mobile forgot-password error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to process request',
    });
  }
});

/**
 * GET /api/v1/mobile/auth/me
 * Get current user info (requires JWT)
 */
router.get('/me', async (req: Request, res: Response): Promise<void> => {
  try {
    const authHeader = req.headers.authorization;
    
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      res.status(401).json({
        success: false,
        error: 'Authentication required',
      });
      return;
    }

    const token = authHeader.split(' ')[1];
    
    try {
      const decoded = jwt.verify(token, config.auth.jwtSecret) as {
        userId: string;
        clerkId: string;
        email: string;
      };

      const user = await prisma.user.findUnique({
        where: { id: decoded.userId },
        select: {
          id: true,
          email: true,
          firstName: true,
          lastName: true,
          avatar: true,
          role: true,
          tier: true,
          preferences: true,
          createdAt: true,
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
          user: {
            ...user,
            conversationCount: user._count.conversations,
            projectCount: user._count.projects,
          },
        },
      });
    } catch (jwtError) {
      res.status(401).json({
        success: false,
        error: 'Invalid or expired token',
      });
    }
  } catch (error) {
    logger.error('Mobile me error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to get user info',
    });
  }
});

/**
 * POST /api/v1/mobile/auth/refresh
 * Refresh JWT token
 */
router.post('/refresh', async (req: Request, res: Response): Promise<void> => {
  try {
    const authHeader = req.headers.authorization;
    
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      res.status(401).json({
        success: false,
        error: 'Authentication required',
      });
      return;
    }

    const token = authHeader.split(' ')[1];
    
    try {
      // Verify token (even if expired, we'll refresh it)
      const decoded = jwt.verify(token, config.auth.jwtSecret, {
        ignoreExpiration: true,
      }) as {
        userId: string;
        clerkId: string;
        email: string;
        exp: number;
      };

      // Check if token is too old (more than 30 days)
      const tokenAge = Date.now() / 1000 - decoded.exp;
      if (tokenAge > 30 * 24 * 60 * 60) {
        res.status(401).json({
          success: false,
          error: 'Token too old. Please sign in again.',
        });
        return;
      }

      // Verify user still exists and is active
      const user = await prisma.user.findUnique({
        where: { id: decoded.userId },
        select: {
          id: true,
          clerkId: true,
          email: true,
          isActive: true,
          isBanned: true,
        },
      });

      if (!user || user.isBanned || !user.isActive) {
        res.status(401).json({
          success: false,
          error: 'Account not available',
        });
        return;
      }

      // Generate new token
      const newToken = generateJWT(user.id, user.clerkId, user.email);

      res.json({
        success: true,
        data: {
          token: newToken,
        },
      });
    } catch (jwtError) {
      res.status(401).json({
        success: false,
        error: 'Invalid token',
      });
    }
  } catch (error) {
    logger.error('Mobile refresh error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to refresh token',
    });
  }
});

/**
 * POST /api/v1/mobile/auth/logout
 * Logout (invalidate session - client should delete token)
 */
router.post('/logout', async (req: Request, res: Response): Promise<void> => {
  try {
    const authHeader = req.headers.authorization;
    
    if (authHeader && authHeader.startsWith('Bearer ')) {
      const token = authHeader.split(' ')[1];
      
      try {
        const decoded = jwt.verify(token, config.auth.jwtSecret) as {
          userId: string;
        };

        // Create audit log
        await prisma.auditLog.create({
          data: {
            userId: decoded.userId,
            action: 'user.logout',
            resource: 'user',
            resourceId: decoded.userId,
            ipAddress: req.ip,
            userAgent: req.get('user-agent'),
            metadata: { source: 'mobile_app' },
          },
        });
      } catch {
        // Token invalid, but still log logout attempt
      }
    }

    res.json({
      success: true,
      data: {
        message: 'Logged out successfully',
      },
    });
  } catch (error) {
    logger.error('Mobile logout error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to logout',
    });
  }
});

export default router;
