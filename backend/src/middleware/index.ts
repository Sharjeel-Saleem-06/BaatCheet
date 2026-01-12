// Legacy JWT Auth (kept for backward compatibility)
export { authenticate, optionalAuth } from './auth.js';

// Clerk Auth (primary)
export { 
  clerkAuth, 
  optionalClerkAuth, 
  requireRole, 
  requireAdmin as requireAdminRole, 
  requireModerator,
  requireClerkAuth
} from './clerkAuth.js';

// Admin Auth (permissions & audit)
export {
  requireAdmin,
  requireFullAdmin,
  requirePermission,
  logAdminAction,
  auditLog,
  adminRateLimit,
  AdminPermission,
  ROLE_PERMISSIONS,
} from './adminAuth.js';

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
  chatRateLimiter as legacyChatRateLimiter,
  imageRateLimiter,
  audioRateLimiter,
  searchRateLimiter as legacySearchRateLimiter,
  distributedRateLimiter,
  ipWhitelist,
  sanitizeInput as legacySanitizeInput,
  preventInjection,
  validateFileUpload,
  validateUrl,
  securityMiddleware,
} from './security.js';

// Advanced Rate Limiting (Tiered)
export {
  createTieredRateLimiter,
  chatRateLimiter,
  imageUploadRateLimiter,
  audioRateLimiter as advancedAudioRateLimiter,
  searchRateLimiter,
  ttsRateLimiter,
  exportRateLimiter,
  profileRateLimiter,
  apiRateLimiter,
  ipRateLimiter,
  burstProtection,
  RATE_LIMITS,
} from './advancedRateLimit.js';

// Input Sanitization
export {
  sanitizeInput,
  strictSanitize,
  sanitizeFileName,
  sanitizeURL,
  sanitizeEmail,
  isSafeForDB,
  isSafeForHTML,
} from './sanitization.js';
