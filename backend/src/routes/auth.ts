import { Router, Request, Response } from 'express';
import jwt from 'jsonwebtoken';
import bcrypt from 'bcryptjs';
import { prisma } from '../config/database.js';
import { config } from '../config/index.js';
import { authenticate, authLimiter, validate, schemas } from '../middleware/index.js';
import { logger } from '../utils/logger.js';
import { UserPreferences } from '../types/index.js';

const router = Router();

// ============================================
// Authentication Routes
// ============================================

/**
 * Parse user preferences from JSON
 */
const parsePreferences = (prefs: unknown): UserPreferences => {
  const defaults: UserPreferences = {
    theme: 'dark',
    defaultModel: 'llama-3.1-70b-versatile',
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

/**
 * POST /api/v1/auth/register
 * Create a new user account
 */
router.post(
  '/register',
  authLimiter,
  validate(schemas.register),
  async (req: Request, res: Response): Promise<void> => {
    try {
      const { email, password, name } = req.body;

      // Check if user exists
      const existingUser = await prisma.user.findUnique({
        where: { email: email.toLowerCase() },
      });

      if (existingUser) {
        res.status(400).json({
          success: false,
          error: 'User already exists with this email',
        });
        return;
      }

      // Hash password
      const hashedPassword = await bcrypt.hash(password, 10);

      // Create user
      const user = await prisma.user.create({
        data: {
          email: email.toLowerCase(),
          password: hashedPassword,
          name,
        },
      });

      // Generate token
      const token = jwt.sign(
        { userId: user.id, email: user.email },
        config.jwtSecret,
        { expiresIn: '7d' }
      );

      logger.info(`New user registered: ${email}`);

      res.status(201).json({
        success: true,
        data: {
          user: {
            id: user.id,
            email: user.email,
            name: user.name,
            preferences: parsePreferences(user.preferences),
            createdAt: user.createdAt,
          },
          token,
        },
        message: 'Registration successful',
      });
    } catch (error) {
      logger.error('Registration error:', error);
      res.status(500).json({
        success: false,
        error: 'Registration failed',
      });
    }
  }
);

/**
 * POST /api/v1/auth/login
 * User login
 */
router.post(
  '/login',
  authLimiter,
  validate(schemas.login),
  async (req: Request, res: Response): Promise<void> => {
    try {
      const { email, password } = req.body;

      // Find user
      const user = await prisma.user.findUnique({
        where: { email: email.toLowerCase() },
      });

      if (!user) {
        res.status(401).json({
          success: false,
          error: 'Invalid email or password',
        });
        return;
      }

      // Verify password
      const isMatch = await bcrypt.compare(password, user.password);
      if (!isMatch) {
        res.status(401).json({
          success: false,
          error: 'Invalid email or password',
        });
        return;
      }

      // Generate token
      const token = jwt.sign(
        { userId: user.id, email: user.email },
        config.jwtSecret,
        { expiresIn: '7d' }
      );

      logger.info(`User logged in: ${email}`);

      res.json({
        success: true,
        data: {
          user: {
            id: user.id,
            email: user.email,
            name: user.name,
            avatar: user.avatar,
            preferences: parsePreferences(user.preferences),
            createdAt: user.createdAt,
          },
          token,
        },
        message: 'Login successful',
      });
    } catch (error) {
      logger.error('Login error:', error);
      res.status(500).json({
        success: false,
        error: 'Login failed',
      });
    }
  }
);

/**
 * POST /api/v1/auth/logout
 * User logout (client should remove token)
 */
router.post('/logout', authenticate, (_req: Request, res: Response): void => {
  res.json({
    success: true,
    message: 'Logout successful',
  });
});

/**
 * GET /api/v1/auth/me
 * Get current user profile
 */
router.get(
  '/me',
  authenticate,
  async (req: Request, res: Response): Promise<void> => {
    try {
      const user = await prisma.user.findUnique({
        where: { id: req.user!.userId },
        select: {
          id: true,
          email: true,
          name: true,
          avatar: true,
          preferences: true,
          createdAt: true,
          updatedAt: true,
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
 * PUT /api/v1/auth/preferences
 * Update user preferences
 */
router.put(
  '/preferences',
  authenticate,
  async (req: Request, res: Response): Promise<void> => {
    try {
      const { theme, defaultModel, language } = req.body;

      const currentUser = await prisma.user.findUnique({
        where: { id: req.user!.userId },
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
        where: { id: req.user!.userId },
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

export default router;
