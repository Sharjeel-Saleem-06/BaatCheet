// Legacy JWT Auth (kept for backward compatibility)
export { authenticate, optionalAuth } from './auth.js';

// Clerk Auth (primary)
export { 
  clerkAuth, 
  optionalClerkAuth, 
  requireRole, 
  requireAdmin, 
  requireModerator 
} from './clerkAuth.js';

// Error Handling
export { errorHandler, notFoundHandler, createError, AppError } from './errorHandler.js';

// Rate Limiting
export { apiLimiter, authLimiter, chatLimiter, strictLimiter } from './rateLimit.js';

// Validation
export { validate, validateQuery, schemas } from './validate.js';

// Security
export {
  requestId,
  responseTime,
  securityHeaders,
  corsOptions,
  globalRateLimiter,
  authRateLimiter,
  chatRateLimiter,
  imageRateLimiter,
  audioRateLimiter,
  searchRateLimiter,
  distributedRateLimiter,
  ipWhitelist,
  sanitizeInput,
  preventInjection,
  validateFileUpload,
  validateUrl,
  securityMiddleware,
} from './security.js';
