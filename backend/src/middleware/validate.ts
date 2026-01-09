import { Request, Response, NextFunction } from 'express';
import { z, ZodSchema } from 'zod';

// ============================================
// Validation Middleware using Zod
// ============================================

export const validate = (schema: ZodSchema) => {
  return (req: Request, res: Response, next: NextFunction): void => {
    try {
      schema.parse(req.body);
      next();
    } catch (error) {
      if (error instanceof z.ZodError) {
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

// Common validation schemas
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
    message: z.string().min(1, 'Message is required').max(10000, 'Message too long'),
    conversationId: z.string().optional(),
    model: z.string().optional(),
    systemPrompt: z.string().max(2000, 'System prompt too long').optional(),
  }),

  // Project schemas
  createProject: z.object({
    name: z.string().min(1, 'Name is required').max(100, 'Name too long'),
    description: z.string().max(500, 'Description too long').optional(),
    color: z.string().optional(),
    icon: z.string().optional(),
  }),

  // Conversation schemas
  updateConversation: z.object({
    title: z.string().max(200, 'Title too long').optional(),
    tags: z.array(z.string()).optional(),
    isArchived: z.boolean().optional(),
    isPinned: z.boolean().optional(),
    projectId: z.string().nullable().optional(),
  }),
};

export default validate;
