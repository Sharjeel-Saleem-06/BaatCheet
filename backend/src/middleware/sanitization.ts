/**
 * Input Sanitization Middleware
 * Protects against XSS, SQL Injection, and other input-based attacks
 * 
 * @module Sanitization
 */

import { Request, Response, NextFunction } from 'express';
import { logger } from '../utils/logger.js';

// ============================================
// Dangerous Patterns
// ============================================

// SQL Injection patterns
const SQL_INJECTION_PATTERNS = [
  /(\b(SELECT|INSERT|UPDATE|DELETE|DROP|CREATE|ALTER|TRUNCATE|EXEC|EXECUTE|UNION|JOIN)\b)/gi,
  /(\b(OR|AND)\s+\d+\s*=\s*\d+)/gi,
  /(--|\#|\/\*|\*\/)/g,
  /(\bOR\b\s+'[^']*'\s*=\s*'[^']*')/gi,
  /(\bAND\b\s+'[^']*'\s*=\s*'[^']*')/gi,
  /(;\s*(DROP|DELETE|UPDATE|INSERT))/gi,
];

// XSS patterns
const XSS_PATTERNS = [
  /<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi,
  /javascript:/gi,
  /on\w+\s*=/gi,
  /<iframe\b[^<]*(?:(?!<\/iframe>)<[^<]*)*<\/iframe>/gi,
  /<object\b[^<]*(?:(?!<\/object>)<[^<]*)*<\/object>/gi,
  /<embed\b[^<]*>/gi,
  /<link\b[^<]*>/gi,
  /expression\s*\(/gi,
  /url\s*\(\s*['"]?\s*javascript:/gi,
];

// Path traversal patterns
const PATH_TRAVERSAL_PATTERNS = [
  /\.\.\//g,
  /\.\.\\/, // Windows path
  /%2e%2e%2f/gi,
  /%2e%2e\//gi,
  /\.%2e\//gi,
  /%2e\.\//gi,
];

// Command injection patterns
const COMMAND_INJECTION_PATTERNS = [
  /[;&|`$]/g,
  /\$\(/g,
  /`[^`]*`/g,
  /\|\|/g,
  /&&/g,
];

// ============================================
// Sanitization Functions
// ============================================

/**
 * Escape HTML entities
 */
function escapeHTML(str: string): string {
  const htmlEntities: Record<string, string> = {
    '&': '&amp;',
    '<': '&lt;',
    '>': '&gt;',
    '"': '&quot;',
    "'": '&#x27;',
    '/': '&#x2F;',
    '`': '&#x60;',
    '=': '&#x3D;',
  };
  
  return str.replace(/[&<>"'`=/]/g, char => htmlEntities[char] || char);
}

/**
 * Check for SQL injection attempts
 */
function hasSQLInjection(str: string): boolean {
  return SQL_INJECTION_PATTERNS.some(pattern => pattern.test(str));
}

/**
 * Check for XSS attempts
 */
function hasXSS(str: string): boolean {
  return XSS_PATTERNS.some(pattern => pattern.test(str));
}

/**
 * Check for path traversal attempts
 */
function hasPathTraversal(str: string): boolean {
  return PATH_TRAVERSAL_PATTERNS.some(pattern => pattern.test(str));
}

/**
 * Check for command injection attempts
 */
function hasCommandInjection(str: string): boolean {
  return COMMAND_INJECTION_PATTERNS.some(pattern => pattern.test(str));
}

/**
 * Sanitize a string value
 */
function sanitizeString(value: string, options: SanitizeOptions = {}): string {
  const {
    escapeHtml = true,
    removeScripts = true,
    maxLength = 100000,
    allowedTags = [],
  } = options;
  
  let sanitized = value;
  
  // Trim and limit length
  sanitized = sanitized.trim().substring(0, maxLength);
  
  // Remove null bytes
  sanitized = sanitized.replace(/\0/g, '');
  
  // Remove script tags
  if (removeScripts) {
    sanitized = sanitized.replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, '');
  }
  
  // Escape HTML if not allowed
  if (escapeHtml && allowedTags.length === 0) {
    // Don't escape for chat messages - they need markdown
    // Only escape for form fields
  }
  
  return sanitized;
}

/**
 * Recursively sanitize an object
 */
function sanitizeObject(obj: any, options: SanitizeOptions = {}): any {
  if (obj === null || obj === undefined) {
    return obj;
  }
  
  if (typeof obj === 'string') {
    return sanitizeString(obj, options);
  }
  
  if (Array.isArray(obj)) {
    return obj.map(item => sanitizeObject(item, options));
  }
  
  if (typeof obj === 'object') {
    const sanitized: Record<string, any> = {};
    for (const [key, value] of Object.entries(obj)) {
      // Sanitize keys too
      const sanitizedKey = sanitizeString(key, { ...options, maxLength: 100 });
      sanitized[sanitizedKey] = sanitizeObject(value, options);
    }
    return sanitized;
  }
  
  return obj;
}

// ============================================
// Types
// ============================================

interface SanitizeOptions {
  escapeHtml?: boolean;
  removeScripts?: boolean;
  maxLength?: number;
  allowedTags?: string[];
}

interface SanitizationResult {
  isSafe: boolean;
  threats: string[];
  sanitized: any;
}

// ============================================
// Middleware
// ============================================

/**
 * Main sanitization middleware
 */
export function sanitizeInput(options: SanitizeOptions = {}) {
  return (req: Request, res: Response, next: NextFunction) => {
    try {
      const threats: string[] = [];
      
      // Check body
      if (req.body) {
        const bodyStr = JSON.stringify(req.body);
        
        // Check for threats (but don't block chat messages with code)
        const isChatEndpoint = req.path.includes('/chat') || req.path.includes('/completions');
        
        if (!isChatEndpoint) {
          if (hasSQLInjection(bodyStr)) {
            threats.push('Potential SQL injection detected');
          }
          if (hasXSS(bodyStr)) {
            threats.push('Potential XSS detected');
          }
          if (hasCommandInjection(bodyStr)) {
            threats.push('Potential command injection detected');
          }
        }
        
        // Sanitize body
        req.body = sanitizeObject(req.body, {
          ...options,
          // Don't escape HTML for chat messages (they contain code)
          escapeHtml: !isChatEndpoint,
        });
      }
      
      // Check query parameters
      if (req.query) {
        const queryStr = JSON.stringify(req.query);
        
        if (hasSQLInjection(queryStr)) {
          threats.push('Potential SQL injection in query');
        }
        if (hasPathTraversal(queryStr)) {
          threats.push('Potential path traversal in query');
        }
        
        // Sanitize query
        req.query = sanitizeObject(req.query, options) as any;
      }
      
      // Check params
      if (req.params) {
        const paramsStr = JSON.stringify(req.params);
        
        if (hasPathTraversal(paramsStr)) {
          threats.push('Potential path traversal in params');
        }
        
        // Sanitize params
        req.params = sanitizeObject(req.params, options) as any;
      }
      
      // Log threats but don't block (for now)
      if (threats.length > 0) {
        logger.warn('Input sanitization threats detected', {
          threats,
          path: req.path,
          method: req.method,
          ip: req.ip,
          userId: (req as any).user?.id,
        });
      }
      
      next();
    } catch (error) {
      logger.error('Sanitization middleware error:', error);
      next();
    }
  };
}

/**
 * Strict sanitization middleware (blocks suspicious requests)
 */
export function strictSanitize(options: SanitizeOptions = {}) {
  return (req: Request, res: Response, next: NextFunction) => {
    try {
      const threats: string[] = [];
      
      // Check all input
      const allInput = JSON.stringify({
        body: req.body,
        query: req.query,
        params: req.params,
      });
      
      if (hasSQLInjection(allInput)) {
        threats.push('SQL injection');
      }
      if (hasXSS(allInput)) {
        threats.push('XSS');
      }
      if (hasPathTraversal(allInput)) {
        threats.push('Path traversal');
      }
      if (hasCommandInjection(allInput)) {
        threats.push('Command injection');
      }
      
      if (threats.length > 0) {
        logger.warn('Strict sanitization blocked request', {
          threats,
          path: req.path,
          method: req.method,
          ip: req.ip,
        });
        
        return res.status(400).json({
          success: false,
          error: 'Invalid input detected',
          message: 'Your request contains potentially harmful content',
        });
      }
      
      // Apply normal sanitization
      if (req.body) {
        req.body = sanitizeObject(req.body, options);
      }
      if (req.query) {
        req.query = sanitizeObject(req.query, options) as any;
      }
      if (req.params) {
        req.params = sanitizeObject(req.params, options) as any;
      }
      
      next();
    } catch (error) {
      logger.error('Strict sanitization error:', error);
      res.status(500).json({ error: 'Input validation failed' });
    }
  };
}

/**
 * File name sanitization
 */
export function sanitizeFileName(fileName: string): string {
  // Remove path separators and dangerous characters
  let safe = fileName
    .replace(/[\/\\]/g, '_')
    .replace(/\.\./g, '_')
    .replace(/[<>:"|?*]/g, '_')
    .replace(/\s+/g, '_')
    .replace(/[^\w\-_.]/g, '');
  
  // Limit length
  if (safe.length > 255) {
    const ext = safe.split('.').pop() || '';
    const name = safe.substring(0, 255 - ext.length - 1);
    safe = `${name}.${ext}`;
  }
  
  return safe || 'unnamed_file';
}

/**
 * URL sanitization
 */
export function sanitizeURL(url: string): string | null {
  try {
    const parsed = new URL(url);
    
    // Only allow http and https
    if (!['http:', 'https:'].includes(parsed.protocol)) {
      return null;
    }
    
    // Block localhost and private IPs in production
    if (process.env.NODE_ENV === 'production') {
      const hostname = parsed.hostname.toLowerCase();
      if (
        hostname === 'localhost' ||
        hostname === '127.0.0.1' ||
        hostname.startsWith('192.168.') ||
        hostname.startsWith('10.') ||
        hostname.startsWith('172.16.')
      ) {
        return null;
      }
    }
    
    return parsed.toString();
  } catch {
    return null;
  }
}

/**
 * Email sanitization
 */
export function sanitizeEmail(email: string): string | null {
  const trimmed = email.trim().toLowerCase();
  
  // Basic email validation
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  if (!emailRegex.test(trimmed)) {
    return null;
  }
  
  // Limit length
  if (trimmed.length > 254) {
    return null;
  }
  
  return trimmed;
}

// ============================================
// Validation Helpers
// ============================================

/**
 * Validate and sanitize input against schema
 */
export function validateInput<T>(
  input: unknown,
  validator: (input: unknown) => T | null
): T | null {
  try {
    return validator(input);
  } catch {
    return null;
  }
}

/**
 * Check if string is safe for database
 */
export function isSafeForDB(str: string): boolean {
  return !hasSQLInjection(str);
}

/**
 * Check if string is safe for HTML output
 */
export function isSafeForHTML(str: string): boolean {
  return !hasXSS(str);
}

export default sanitizeInput;
