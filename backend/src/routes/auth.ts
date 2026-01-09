import { Router, Request, Response } from 'express';
import jwt from 'jsonwebtoken';
import { User } from '../models/User.js';
import { config } from '../config/index.js';
import { authenticate, authLimiter, validate, schemas } from '../middleware/index.js';
import { logger } from '../utils/logger.js';

const router = Router();

// ============================================
// Authentication Routes
// ============================================

// POST /api/v1/auth/register
router.post(
  '/register',
  authLimiter,
  validate(schemas.register),
  async (req: Request, res: Response): Promise<void> => {
    try {
      const { email, password, name } = req.body;

      // Check if user exists
      const existingUser = await User.findOne({ email });
      if (existingUser) {
        res.status(400).json({
          success: false,
          error: 'User already exists with this email',
        });
        return;
      }

      // Create user
      const user = new User({ email, password, name });
      await user.save();

      // Generate token
      const token = jwt.sign(
        { userId: user._id.toString(), email: user.email },
        config.jwtSecret,
        { expiresIn: config.jwtExpiresIn }
      );

      logger.info(`New user registered: ${email}`);

      res.status(201).json({
        success: true,
        data: {
          user: {
            id: user._id,
            email: user.email,
            name: user.name,
            preferences: user.preferences,
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

// POST /api/v1/auth/login
router.post(
  '/login',
  authLimiter,
  validate(schemas.login),
  async (req: Request, res: Response): Promise<void> => {
    try {
      const { email, password } = req.body;

      // Find user with password
      const user = await User.findOne({ email }).select('+password');
      if (!user) {
        res.status(401).json({
          success: false,
          error: 'Invalid email or password',
        });
        return;
      }

      // Check password
      const isMatch = await user.comparePassword(password);
      if (!isMatch) {
        res.status(401).json({
          success: false,
          error: 'Invalid email or password',
        });
        return;
      }

      // Generate token
      const token = jwt.sign(
        { userId: user._id.toString(), email: user.email },
        config.jwtSecret,
        { expiresIn: config.jwtExpiresIn }
      );

      logger.info(`User logged in: ${email}`);

      res.json({
        success: true,
        data: {
          user: {
            id: user._id,
            email: user.email,
            name: user.name,
            preferences: user.preferences,
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

// POST /api/v1/auth/logout
router.post('/logout', authenticate, (_req: Request, res: Response): void => {
  // JWT is stateless, so we just return success
  // Client should remove the token
  res.json({
    success: true,
    message: 'Logout successful',
  });
});

// GET /api/v1/auth/me
router.get(
  '/me',
  authenticate,
  async (req: Request, res: Response): Promise<void> => {
    try {
      const user = await User.findById(req.user?.userId);
      
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
          id: user._id,
          email: user.email,
          name: user.name,
          avatar: user.avatar,
          preferences: user.preferences,
          createdAt: user.createdAt,
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

// PUT /api/v1/auth/preferences
router.put(
  '/preferences',
  authenticate,
  async (req: Request, res: Response): Promise<void> => {
    try {
      const { theme, defaultModel, language } = req.body;
      
      const user = await User.findByIdAndUpdate(
        req.user?.userId,
        {
          $set: {
            'preferences.theme': theme,
            'preferences.defaultModel': defaultModel,
            'preferences.language': language,
          },
        },
        { new: true }
      );

      if (!user) {
        res.status(404).json({
          success: false,
          error: 'User not found',
        });
        return;
      }

      res.json({
        success: true,
        data: { preferences: user.preferences },
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
