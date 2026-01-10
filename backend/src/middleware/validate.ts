import { Request, Response, NextFunction } from 'express';
import { z, ZodSchema, ZodError } from 'zod';

// ============================================
// Validation Middleware using Zod
// ============================================

/**
 * Validate request body against a Zod schema
 */
export const validate = (schema: ZodSchema) => {
  return (req: Request, res: Response, next: NextFunction): void => {
    try {
      schema.parse(req.body);
      next();
    } catch (error) {
      if (error instanceof ZodError) {
        res.status(400).json({
          success: false,
          error: 'Validation failed',
          details: error.errors.map((e) => ({
            field: e.path.join('.'),
            message: e.message,
          })),
        });
        return;
      }
      next(error);
    }
  };
};

/**
 * Validate query parameters
 */
export const validateQuery = (schema: ZodSchema) => {
  return (req: Request, res: Response, next: NextFunction): void => {
    try {
      req.query = schema.parse(req.query);
      next();
    } catch (error) {
      if (error instanceof ZodError) {
        res.status(400).json({
          success: false,
          error: 'Invalid query parameters',
          details: error.errors.map((e) => ({
            field: e.path.join('.'),
            message: e.message,
          })),
        });
        return;
      }
      next(error);
    }
  };
};

// ============================================
// Validation Schemas
// ============================================

export const schemas = {
  // Auth schemas
  register: z.object({
    email: z.string().email('Invalid email format'),
    password: z.string().min(6, 'Password must be at least 6 characters'),
    name: z.string().min(1, 'Name is required').max(50, 'Name too long'),
  }),

  login: z.object({
    email: z.string().email('Invalid email format'),
    password: z.string().min(1, 'Password is required'),
  }),

  // Chat schemas
  chatMessage: z.object({
    message: z.string().min(1, 'Message is required').max(32000, 'Message too long'),
    conversationId: z.string().uuid().optional(),
    model: z.string().optional(),
    systemPrompt: z.string().max(4000, 'System prompt too long').optional(),
  }),

  regenerate: z.object({
    conversationId: z.string().uuid('Invalid conversation ID'),
  }),

  // Project schemas
  createProject: z.object({
    name: z.string().min(1, 'Name is required').max(100, 'Name too long'),
    description: z.string().max(500, 'Description too long').optional(),
    color: z.string().regex(/^#[0-9A-Fa-f]{6}$/, 'Invalid color format').optional(),
    icon: z.string().max(50).optional(),
  }),

  updateProject: z.object({
    name: z.string().min(1).max(100).optional(),
    description: z.string().max(500).optional(),
    color: z.string().regex(/^#[0-9A-Fa-f]{6}$/).optional(),
    icon: z.string().max(50).optional(),
  }),

  // Conversation schemas
  updateConversation: z.object({
    title: z.string().max(200, 'Title too long').optional(),
    tags: z.array(z.string().max(50)).max(10).optional(),
    isArchived: z.boolean().optional(),
    isPinned: z.boolean().optional(),
    projectId: z.string().uuid().nullable().optional(),
    systemPrompt: z.string().max(4000).optional(),
  }),

  // Query schemas
  paginationQuery: z.object({
    limit: z.coerce.number().min(1).max(100).default(50),
    offset: z.coerce.number().min(0).default(0),
  }),

  conversationQuery: z.object({
    limit: z.coerce.number().min(1).max(100).default(50),
    offset: z.coerce.number().min(0).default(0),
    projectId: z.string().uuid().optional(),
    archived: z.enum(['true', 'false']).optional(),
    pinned: z.enum(['true', 'false']).optional(),
  }),

  searchQuery: z.object({
    q: z.string().min(1, 'Search query required').max(200),
    limit: z.coerce.number().min(1).max(50).default(20),
  }),
};

export default validate;
