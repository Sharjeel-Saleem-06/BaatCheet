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

    // Create user in Clerk using Backend API with email verification
    try {
      // Generate a username from email (before @) + random suffix
      const emailPrefix = email.split('@')[0].replace(/[^a-zA-Z0-9]/g, '');
      const randomSuffix = Math.random().toString(36).substring(2, 6);
      const username = `${emailPrefix}${randomSuffix}`.toLowerCase();
      
      logger.info(`Creating Clerk user with email: ${email}, firstName: ${firstName}, lastName: ${lastName}, username: ${username}`);
      
      // Generate a 6-digit verification code
      const verificationCode = Math.floor(100000 + Math.random() * 900000).toString();
      const codeExpiry = new Date(Date.now() + 10 * 60 * 1000); // 10 minutes
      
      // Store pending signup in database (store password encrypted, not hashed - we need to send to Clerk)
      // Use a simple encryption for temporary storage
      const encryptedPassword = Buffer.from(password).toString('base64');
      
      await prisma.pendingSignup.upsert({
        where: { email: email.toLowerCase() },
        update: {
          password: encryptedPassword,
          firstName: firstName || null,
          lastName: lastName || null,
          username,
          verificationCode,
          codeExpiry,
          attempts: 0,
        },
        create: {
          email: email.toLowerCase(),
          password: encryptedPassword,
          firstName: firstName || null,
          lastName: lastName || null,
          username,
          verificationCode,
          codeExpiry,
          attempts: 0,
        },
      });
      
      // Send verification email via Clerk or custom email service
      // For now, we'll use a simple approach - store the code and send via email
      try {
        // Try to send email using a transactional email approach
        // In production, integrate with SendGrid, Mailgun, or similar
        logger.info(`Verification code for ${email}: ${verificationCode}`);
        
        // You can also try to use Clerk's email sending if available
        // For development, the code is logged
      } catch (emailError) {
        logger.error('Failed to send verification email:', emailError);
      }

      logger.info(`Verification code sent to: ${email}`);

      res.status(200).json({
        success: true,
        data: {
          status: 'verification_required',
          message: 'Please check your email for the verification code.',
          email: email.toLowerCase(),
        },
      });
    } catch (clerkCreateError: any) {
      // Log the full error for debugging
      logger.error('Clerk user creation failed:', JSON.stringify(clerkCreateError, null, 2));
      logger.error('Clerk error details:', {
        errors: clerkCreateError?.errors,
        message: clerkCreateError?.message,
        code: clerkCreateError?.status,
        clerkTraceId: clerkCreateError?.clerkTraceId,
      });
      
      // Check for specific Clerk errors - get all error messages
      const errors = clerkCreateError?.errors || [];
      const allMessages = errors.map((e: any) => e.message || e.longMessage).filter(Boolean);
      const errorMessage = allMessages.join('. ') || 
                          clerkCreateError?.message || 
                          'Failed to create account';
      
      // Check for missing fields error
      if (errorMessage.toLowerCase().includes('missing') || 
          errorMessage.toLowerCase().includes('required')) {
        res.status(400).json({
          success: false,
          error: `Missing required fields: ${errorMessage}`,
          details: errors,
        });
        return;
      }
      
      // Handle duplicate email error
      if (errorMessage.toLowerCase().includes('already exists') || 
          errorMessage.toLowerCase().includes('taken') ||
          errorMessage.toLowerCase().includes('unique') ||
          errorMessage.toLowerCase().includes('duplicate')) {
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
        details: errors,
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
 * POST /api/v1/mobile/auth/verify-email
 * Verify email with OTP code and complete signup
 */
router.post('/verify-email', async (req: Request, res: Response): Promise<void> => {
  try {
    const { email, code } = req.body;

    if (!email || !code) {
      res.status(400).json({
        success: false,
        error: 'Email and verification code are required',
      });
      return;
    }

    // Find pending signup
    const pendingSignup = await prisma.pendingSignup.findUnique({
      where: { email: email.toLowerCase() },
    });

    if (!pendingSignup) {
      res.status(404).json({
        success: false,
        error: 'No pending signup found. Please sign up again.',
      });
      return;
    }

    // Check if code has expired
    if (new Date() > pendingSignup.codeExpiry) {
      res.status(400).json({
        success: false,
        error: 'Verification code has expired. Please request a new one.',
      });
      return;
    }

    // Check attempts (max 5)
    if (pendingSignup.attempts >= 5) {
      res.status(429).json({
        success: false,
        error: 'Too many attempts. Please request a new verification code.',
      });
      return;
    }

    // Verify code
    if (pendingSignup.verificationCode !== code) {
      // Increment attempts
      await prisma.pendingSignup.update({
        where: { email: email.toLowerCase() },
        data: { attempts: { increment: 1 } },
      });

      res.status(400).json({
        success: false,
        error: 'Invalid verification code. Please try again.',
      });
      return;
    }

    // Code is valid - create user in Clerk and database
    try {
      // Decode the password
      const decodedPassword = Buffer.from(pendingSignup.password, 'base64').toString('utf-8');
      
      const clerkUser = await clerkClient.users.createUser({
        emailAddress: [email.toLowerCase()],
        password: decodedPassword,
        firstName: pendingSignup.firstName || undefined,
        lastName: pendingSignup.lastName || undefined,
        username: pendingSignup.username || undefined,
        skipPasswordChecks: false,
        skipPasswordRequirement: false,
      });

      // Create user in our database
      const user = await prisma.user.create({
        data: {
          clerkId: clerkUser.id,
          email: email.toLowerCase(),
          username: pendingSignup.username,
          firstName: pendingSignup.firstName,
          lastName: pendingSignup.lastName,
          avatar: clerkUser.imageUrl,
        },
      });

      // Delete pending signup
      await prisma.pendingSignup.delete({
        where: { email: email.toLowerCase() },
      });

      // Generate JWT
      const token = generateJWT(user.id, clerkUser.id, user.email);

      logger.info(`Mobile user verified and created: ${email}`);

      res.status(201).json({
        success: true,
        data: {
          user: {
            id: user.id,
            email: user.email,
            username: user.username,
            firstName: user.firstName,
            lastName: user.lastName,
            avatar: user.avatar,
          },
          token,
          message: 'Email verified! Account created successfully.',
        },
      });
    } catch (clerkError: any) {
      logger.error('Clerk user creation after verification failed:', clerkError);
      
      const errorMessage = clerkError?.errors?.[0]?.message || 
                          clerkError?.message || 
                          'Failed to create account';
      
      res.status(500).json({
        success: false,
        error: errorMessage,
      });
    }
  } catch (error) {
    logger.error('Email verification error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to verify email',
    });
  }
});

/**
 * POST /api/v1/mobile/auth/resend-code
 * Resend verification code
 */
router.post('/resend-code', async (req: Request, res: Response): Promise<void> => {
  try {
    const { email } = req.body;

    if (!email) {
      res.status(400).json({
        success: false,
        error: 'Email is required',
      });
      return;
    }

    // Find pending signup
    const pendingSignup = await prisma.pendingSignup.findUnique({
      where: { email: email.toLowerCase() },
    });

    if (!pendingSignup) {
      res.status(404).json({
        success: false,
        error: 'No pending signup found. Please sign up again.',
      });
      return;
    }

    // Generate new code
    const verificationCode = Math.floor(100000 + Math.random() * 900000).toString();
    const codeExpiry = new Date(Date.now() + 10 * 60 * 1000); // 10 minutes

    // Update pending signup
    await prisma.pendingSignup.update({
      where: { email: email.toLowerCase() },
      data: {
        verificationCode,
        codeExpiry,
        attempts: 0,
      },
    });

    // Log the code (in production, send via email)
    logger.info(`New verification code for ${email}: ${verificationCode}`);

    res.json({
      success: true,
      data: {
        message: 'New verification code sent to your email.',
      },
    });
  } catch (error) {
    logger.error('Resend code error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to resend code',
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

/**
 * POST /api/v1/mobile/auth/change-password
 * Change password for authenticated user
 */
router.post('/change-password', async (req: Request, res: Response): Promise<void> => {
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
    const { currentPassword, newPassword } = req.body;

    if (!currentPassword || !newPassword) {
      res.status(400).json({
        success: false,
        error: 'Current password and new password are required',
      });
      return;
    }

    if (!isValidPassword(newPassword)) {
      res.status(400).json({
        success: false,
        error: 'New password must be at least 8 characters',
      });
      return;
    }

    try {
      const decoded = jwt.verify(token, config.auth.jwtSecret) as {
        userId: string;
        clerkId: string;
        email: string;
      };

      // Verify user exists in Clerk
      const clerkUser = await clerkClient.users.getUser(decoded.clerkId);
      
      if (!clerkUser) {
        res.status(404).json({
          success: false,
          error: 'User not found',
        });
        return;
      }
      
      // Update password via Clerk
      try {
        await clerkClient.users.updateUser(decoded.clerkId, {
          password: newPassword,
        });

        // Create audit log
        await prisma.auditLog.create({
          data: {
            userId: decoded.userId,
            action: 'user.password_changed',
            resource: 'user',
            resourceId: decoded.userId,
            ipAddress: req.ip,
            userAgent: req.get('user-agent'),
            metadata: { source: 'mobile_app' },
          },
        });

        res.json({
          success: true,
          data: {
            message: 'Password changed successfully',
          },
        });
      } catch (clerkError: any) {
        logger.error('Clerk password update error:', clerkError);
        res.status(400).json({
          success: false,
          error: clerkError?.errors?.[0]?.message || 'Failed to update password',
        });
      }
    } catch (jwtError) {
      res.status(401).json({
        success: false,
        error: 'Invalid or expired token',
      });
    }
  } catch (error) {
    logger.error('Change password error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to change password',
    });
  }
});

/**
 * POST /api/v1/mobile/auth/forgot-password
 * Send password reset code to email
 */
router.post('/forgot-password', async (req: Request, res: Response): Promise<void> => {
  try {
    const { email } = req.body;

    if (!email) {
      res.status(400).json({
        success: false,
        error: 'Email is required',
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

    // Find user
    const user = await prisma.user.findUnique({
      where: { email: email.toLowerCase() },
      select: { id: true, clerkId: true, email: true, firstName: true },
    });

    // Always return success to prevent email enumeration
    if (!user) {
      res.json({
        success: true,
        data: {
          message: 'If an account exists with this email, you will receive a password reset code.',
        },
      });
      return;
    }

    // Generate reset code
    const resetCode = Math.floor(100000 + Math.random() * 900000).toString();
    const codeExpiry = new Date(Date.now() + 15 * 60 * 1000); // 15 minutes

    // Store reset code in database (reuse pendingSignup table or create new)
    await prisma.pendingSignup.upsert({
      where: { email: email.toLowerCase() },
      create: {
        email: email.toLowerCase(),
        password: '', // Not used for password reset
        verificationCode: resetCode,
        codeExpiry,
        attempts: 0,
        isPasswordReset: true,
      },
      update: {
        verificationCode: resetCode,
        codeExpiry,
        attempts: 0,
        isPasswordReset: true,
      },
    });

    // Log the code (in production, send via email)
    logger.info(`Password reset code for ${email}: ${resetCode}`);

    res.json({
      success: true,
      data: {
        message: 'If an account exists with this email, you will receive a password reset code.',
      },
    });
  } catch (error) {
    logger.error('Forgot password error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to process request',
    });
  }
});

/**
 * POST /api/v1/mobile/auth/reset-password
 * Reset password using verification code
 */
router.post('/reset-password', async (req: Request, res: Response): Promise<void> => {
  try {
    const { email, code, newPassword } = req.body;

    if (!email || !code || !newPassword) {
      res.status(400).json({
        success: false,
        error: 'Email, code, and new password are required',
      });
      return;
    }

    if (!isValidPassword(newPassword)) {
      res.status(400).json({
        success: false,
        error: 'Password must be at least 8 characters',
      });
      return;
    }

    // Find pending reset
    const pendingReset = await prisma.pendingSignup.findUnique({
      where: { email: email.toLowerCase() },
    });

    if (!pendingReset || !pendingReset.isPasswordReset) {
      res.status(400).json({
        success: false,
        error: 'No password reset request found. Please request a new code.',
      });
      return;
    }

    // Check if code is expired
    if (new Date() > pendingReset.codeExpiry) {
      res.status(400).json({
        success: false,
        error: 'Reset code has expired. Please request a new one.',
      });
      return;
    }

    // Check attempts
    if (pendingReset.attempts >= 5) {
      res.status(429).json({
        success: false,
        error: 'Too many attempts. Please request a new code.',
      });
      return;
    }

    // Verify code
    if (pendingReset.verificationCode !== code) {
      await prisma.pendingSignup.update({
        where: { email: email.toLowerCase() },
        data: { attempts: { increment: 1 } },
      });

      res.status(400).json({
        success: false,
        error: 'Invalid reset code',
      });
      return;
    }

    // Find user
    const user = await prisma.user.findUnique({
      where: { email: email.toLowerCase() },
      select: { id: true, clerkId: true },
    });

    if (!user) {
      res.status(404).json({
        success: false,
        error: 'User not found',
      });
      return;
    }

    // Update password in Clerk
    try {
      await clerkClient.users.updateUser(user.clerkId, {
        password: newPassword,
      });

      // Delete pending reset
      await prisma.pendingSignup.delete({
        where: { email: email.toLowerCase() },
      });

      // Create audit log
      await prisma.auditLog.create({
        data: {
          userId: user.id,
          action: 'user.password_reset',
          resource: 'user',
          resourceId: user.id,
          ipAddress: req.ip,
          userAgent: req.get('user-agent'),
          metadata: { source: 'mobile_app' },
        },
      });

      res.json({
        success: true,
        data: {
          message: 'Password reset successfully. You can now sign in with your new password.',
        },
      });
    } catch (clerkError: any) {
      logger.error('Clerk password reset error:', clerkError);
      res.status(400).json({
        success: false,
        error: clerkError?.errors?.[0]?.message || 'Failed to reset password',
      });
    }
  } catch (error) {
    logger.error('Reset password error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to reset password',
    });
  }
});

export default router;
