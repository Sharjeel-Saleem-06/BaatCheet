/**
 * Admin Authentication & Authorization Middleware
 * Handles admin-only access and audit logging
 * 
 * @module AdminAuth
 */

import { Request, Response, NextFunction } from 'express';
import { prisma } from '../config/database.js';
import { logger } from '../utils/logger.js';

// ============================================
// Types
// ============================================

export enum AdminPermission {
  // User Management
  VIEW_USERS = 'view_users',
  EDIT_USERS = 'edit_users',
  DELETE_USERS = 'delete_users',
  SUSPEND_USERS = 'suspend_users',
  
  // Content Moderation
  VIEW_CONVERSATIONS = 'view_conversations',
  DELETE_CONVERSATIONS = 'delete_conversations',
  FLAG_CONTENT = 'flag_content',
  REVIEW_FLAGS = 'review_flags',
  
  // System Settings
  VIEW_SETTINGS = 'view_settings',
  EDIT_SETTINGS = 'edit_settings',
  MANAGE_PROVIDERS = 'manage_providers',
  
  // Analytics
  VIEW_ANALYTICS = 'view_analytics',
  EXPORT_REPORTS = 'export_reports',
  
  // Audit
  VIEW_AUDIT_LOGS = 'view_audit_logs',
  EXPORT_AUDIT_LOGS = 'export_audit_logs',
}

export const ROLE_PERMISSIONS: Record<string, AdminPermission[]> = {
  admin: Object.values(AdminPermission), // Full access
  moderator: [
    AdminPermission.VIEW_USERS,
    AdminPermission.VIEW_CONVERSATIONS,
    AdminPermission.DELETE_CONVERSATIONS,
    AdminPermission.FLAG_CONTENT,
    AdminPermission.REVIEW_FLAGS,
    AdminPermission.VIEW_ANALYTICS,
  ],
  user: [], // No admin permissions
};

// Extend Express Request
declare global {
  namespace Express {
    interface Request {
      isAdmin?: boolean;
      adminRole?: string;
      adminPermissions?: AdminPermission[];
    }
  }
}

// ============================================
// Middleware Functions
// ============================================

/**
 * Require admin role (admin or moderator)
 */
export const requireAdmin = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    // Check if user is authenticated
    if (!req.user || !req.user.id) {
      res.status(401).json({ 
        success: false, 
        error: 'Unauthorized: Authentication required' 
      });
      return;
    }

    // Get user role from database
    const user = await prisma.user.findUnique({
      where: { id: req.user.id },
      select: { role: true, isBanned: true, isActive: true },
    });

    if (!user) {
      res.status(404).json({ 
        success: false, 
        error: 'User not found' 
      });
      return;
    }

    // Check if user is banned or inactive
    if (user.isBanned || !user.isActive) {
      res.status(403).json({ 
        success: false, 
        error: 'Account is suspended or inactive' 
      });
      return;
    }

    // Check if user has admin or moderator role
    if (user.role !== 'admin' && user.role !== 'moderator') {
      logger.warn(`Non-admin user ${req.user.id} attempted to access admin endpoint: ${req.path}`);
      res.status(403).json({ 
        success: false, 
        error: 'Forbidden: Admin access required' 
      });
      return;
    }

    // Set admin flags on request
    req.isAdmin = true;
    req.adminRole = user.role;
    req.adminPermissions = ROLE_PERMISSIONS[user.role] || [];

    next();
  } catch (error) {
    logger.error('Admin auth error:', error);
    res.status(500).json({ 
      success: false, 
      error: 'Authentication error' 
    });
  }
};

/**
 * Require specific permission
 */
export const requirePermission = (permission: AdminPermission) => {
  return async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    // First check admin status
    if (!req.isAdmin) {
      res.status(403).json({ 
        success: false, 
        error: 'Forbidden: Admin access required' 
      });
      return;
    }

    // Check if user has the required permission
    const permissions = req.adminPermissions || [];
    if (!permissions.includes(permission)) {
      logger.warn(`Admin ${req.user?.id} lacks permission: ${permission}`);
      res.status(403).json({ 
        success: false, 
        error: `Forbidden: ${permission} permission required` 
      });
      return;
    }

    next();
  };
};

/**
 * Require full admin role (not moderator)
 */
export const requireFullAdmin = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  if (req.adminRole !== 'admin') {
    res.status(403).json({ 
      success: false, 
      error: 'Forbidden: Full admin access required' 
    });
    return;
  }
  next();
};

// ============================================
// Audit Logging
// ============================================

/**
 * Log admin action to audit log
 */
export const logAdminAction = async (
  userId: string,
  action: string,
  resource: string,
  resourceId?: string,
  metadata?: Record<string, unknown>,
  req?: Request
): Promise<void> => {
  try {
    await prisma.auditLog.create({
      data: {
        userId,
        action,
        resource,
        resourceId,
        ipAddress: req?.ip || req?.headers['x-forwarded-for']?.toString() || 'unknown',
        userAgent: req?.headers['user-agent'] || 'unknown',
        metadata: metadata ? JSON.parse(JSON.stringify(metadata)) : undefined,
      },
    });
  } catch (error) {
    logger.error('Failed to create audit log:', error);
  }
};

/**
 * Audit log middleware - wraps response to log after completion
 */
export const auditLog = (action: string) => {
  return async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    // Store original json method
    const originalJson = res.json.bind(res);

    // Override json to log after response
    res.json = function (body: any) {
      // Log admin action
      if (req.user?.id) {
        logAdminAction(
          req.user.id,
          action,
          req.path,
          req.params.userId || req.params.id,
          {
            method: req.method,
            body: sanitizeBody(req.body),
            statusCode: res.statusCode,
            success: res.statusCode < 400,
          },
          req
        ).catch((err) => logger.error('Audit log failed:', err));
      }

      return originalJson(body);
    };

    next();
  };
};

/**
 * Sanitize request body for audit log (remove sensitive data)
 */
function sanitizeBody(body: Record<string, unknown>): Record<string, unknown> {
  if (!body) return {};
  
  const sanitized = { ...body };
  const sensitiveFields = ['password', 'secret', 'token', 'key', 'apiKey'];
  
  for (const field of sensitiveFields) {
    if (sanitized[field]) {
      sanitized[field] = '[REDACTED]';
    }
  }
  
  return sanitized;
}

// ============================================
// Rate Limiting for Admin
// ============================================

const adminRateLimits = new Map<string, { count: number; resetAt: number }>();

/**
 * Admin-specific rate limiting (stricter)
 */
export const adminRateLimit = (maxRequests: number = 100, windowMs: number = 60000) => {
  return (req: Request, res: Response, next: NextFunction): void => {
    const key = `admin:${req.user?.id || req.ip}`;
    const now = Date.now();
    
    const limit = adminRateLimits.get(key);
    
    if (!limit || now > limit.resetAt) {
      adminRateLimits.set(key, { count: 1, resetAt: now + windowMs });
      next();
      return;
    }
    
    if (limit.count >= maxRequests) {
      res.status(429).json({
        success: false,
        error: 'Too many requests',
        retryAfter: Math.ceil((limit.resetAt - now) / 1000),
      });
      return;
    }
    
    limit.count++;
    next();
  };
};

// Clean up rate limit map periodically
setInterval(() => {
  const now = Date.now();
  for (const [key, value] of adminRateLimits.entries()) {
    if (now > value.resetAt) {
      adminRateLimits.delete(key);
    }
  }
}, 60000);
