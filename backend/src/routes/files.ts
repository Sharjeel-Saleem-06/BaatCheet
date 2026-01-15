/**
 * File Upload Routes
 * Handles document uploads (PDF, TXT, DOC, etc.)
 * Includes daily upload limits for free users
 */

import { Router, Request, Response } from 'express';
import multer from 'multer';
import path from 'path';
import fs from 'fs/promises';
import { v4 as uuidv4 } from 'uuid';
import { clerkAuth } from '../middleware/clerkAuth.js';
import { chatLimiter } from '../middleware/rateLimit.js';
import { prisma } from '../config/database.js';
import { logger } from '../utils/logger.js';

const router = Router();

// File size limits (to control token consumption)
// Limit to ~500KB for optimal token usage (roughly 2-5 pages of text)
const FILE_SIZE_LIMITS = {
  document: 500 * 1024, // 500KB for documents (~2-5 pages)
  image: 2 * 1024 * 1024, // 2MB for images
};

// Daily upload limits by user tier (COMBINED for files, images, camera - all share same limit)
const DAILY_UPLOAD_LIMITS = {
  free: 2,      // 2 uploads per day for free users (testing)
  pro: 100,     // 100 uploads per day for pro users
  enterprise: 1000, // 1000 uploads per day for enterprise
};

/**
 * Check if user has exceeded daily upload limit
 * NOTE: This counts ALL uploads (documents + images) together as a combined limit
 */
async function checkDocumentUploadLimit(userId: string): Promise<{
  allowed: boolean;
  used: number;
  limit: number;
  remaining: number;
  nextAvailableAt?: string;
}> {
  // Get user tier
  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: { tier: true },
  });
  
  const tier = (user?.tier || 'free') as keyof typeof DAILY_UPLOAD_LIMITS;
  const limit = DAILY_UPLOAD_LIMITS[tier] || DAILY_UPLOAD_LIMITS.free;
  
  // Count ALL uploads in last 24 hours (documents + images combined)
  const twentyFourHoursAgo = new Date(Date.now() - 24 * 60 * 60 * 1000);
  
  const todayUploads = await prisma.attachment.count({
    where: {
      userId,
      createdAt: {
        gte: twentyFourHoursAgo,
      },
    },
  });
  
  // Calculate next available time if limit reached
  let nextAvailableAt: string | undefined;
  if (todayUploads >= limit) {
    const oldestUpload = await prisma.attachment.findFirst({
      where: {
        userId,
        createdAt: { gte: twentyFourHoursAgo },
      },
      orderBy: { createdAt: 'asc' },
    });
    
    if (oldestUpload) {
      nextAvailableAt = new Date(oldestUpload.createdAt.getTime() + 24 * 60 * 60 * 1000).toISOString();
    }
  }
  
  return {
    allowed: todayUploads < limit,
    used: todayUploads,
    limit,
    remaining: Math.max(0, limit - todayUploads),
    nextAvailableAt,
  };
}

// Allowed MIME types for documents and images
const ALLOWED_DOCUMENT_TYPES = [
  // Documents
  'application/pdf',
  'text/plain',
  'text/markdown',
  'application/msword',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  'text/csv',
  'application/json',
  'text/html',
  'text/xml',
  'application/xml',
  // Images (for OCR)
  'image/jpeg',
  'image/jpg',
  'image/png',
  'image/gif',
  'image/webp',
  'image/bmp',
];

// Configure multer for document uploads - use memory storage for HuggingFace compatibility
const storage = multer.memoryStorage();

const fileFilter = (
  req: Request,
  file: Express.Multer.File,
  cb: multer.FileFilterCallback
) => {
  // Check MIME type
  if (ALLOWED_DOCUMENT_TYPES.includes(file.mimetype) || file.mimetype.startsWith('text/') || file.mimetype.startsWith('image/')) {
    cb(null, true);
  } else {
    cb(new Error(`Unsupported file type: ${file.mimetype}`));
  }
};

const upload = multer({
  storage,
  limits: {
    fileSize: FILE_SIZE_LIMITS.image, // Use larger limit, we check individually
    files: 5, // Max 5 files at once
  },
  fileFilter: (req, file, cb) => {
    // Check MIME type
    if (!ALLOWED_DOCUMENT_TYPES.includes(file.mimetype) && 
        !file.mimetype.startsWith('text/') && 
        !file.mimetype.startsWith('image/')) {
      cb(new Error(`Unsupported file type: ${file.mimetype}`));
      return;
    }
    
    // Note: Size check happens after upload in the route handler
    cb(null, true);
  },
});

/**
 * GET /api/v1/files/upload-status
 * Get user's document upload status (used/remaining)
 */
router.get(
  '/upload-status',
  clerkAuth,
  async (req: Request, res: Response): Promise<void> => {
    try {
      const userId = req.user!.id;
      const status = await checkDocumentUploadLimit(userId);
      
      res.json({
        success: true,
        data: {
          uploadsUsedToday: status.used,
          dailyLimit: status.limit,
          remaining: status.remaining,
          canUpload: status.allowed,
          nextAvailableAt: status.nextAvailableAt, // ISO string for client-side formatting
        },
      });
    } catch (error) {
      logger.error('Get upload status error:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to get upload status',
      });
    }
  }
);

/**
 * POST /api/v1/files/upload
 * Upload document files (with daily limit enforcement)
 * Uses memory storage for HuggingFace compatibility
 */
router.post(
  '/upload',
  clerkAuth,
  chatLimiter,
  upload.single('file'),
  async (req: Request, res: Response): Promise<void> => {
    try {
      const userId = req.user!.id;
      const file = req.file;
      const { conversationId } = req.body;

      if (!file) {
        res.status(400).json({
          success: false,
          error: 'No file provided',
        });
        return;
      }

      // Check file size based on type
      const isImage = file.mimetype.startsWith('image/');
      const maxSize = isImage ? FILE_SIZE_LIMITS.image : FILE_SIZE_LIMITS.document;
      
      if (file.size > maxSize) {
        const maxSizeKB = Math.round(maxSize / 1024);
        res.status(413).json({
          success: false,
          error: `File too large. Maximum size is ${maxSizeKB}KB for ${isImage ? 'images' : 'documents'}. Please reduce file size or split into smaller files.`,
        });
        return;
      }

      // Check daily upload limit
      const limitStatus = await checkDocumentUploadLimit(userId);
      if (!limitStatus.allowed) {
        res.status(429).json({
          success: false,
          error: `Daily upload limit reached (${limitStatus.limit}/day). Try again in 24 hours or upgrade to Pro.`,
          data: {
            used: limitStatus.used,
            limit: limitStatus.limit,
            remaining: 0,
          },
        });
        return;
      }

      const uniqueFilename = `${uuidv4()}${path.extname(file.originalname)}`;

      // Create attachment record
      const attachment = await prisma.attachment.create({
        data: {
          userId,
          conversationId: conversationId || null,
          type: file.mimetype.startsWith('image/') ? 'image' : 'document',
          originalName: file.originalname,
          storedName: uniqueFilename,
          fileSize: file.size,
          mimeType: file.mimetype,
          url: `/uploads/${uniqueFilename}`,
          status: 'processing',
          extractedText: null,
          analysisResult: null,
        },
      });

      logger.info(`File uploaded: ${file.originalname} (${file.mimetype}) by user ${userId}, Attachment ID: ${attachment.id}`);

      // Process text extraction in background using file buffer
      processDocumentFromBuffer(attachment.id, file.buffer, file.mimetype, file.originalname).catch((err) => {
        logger.error(`Document processing failed for ${attachment.id}:`, err);
      });

      res.json({
        success: true,
        data: {
          id: attachment.id,
          originalName: file.originalname,
          storedName: uniqueFilename,
          mimeType: file.mimetype,
          size: file.size,
          url: `/uploads/${uniqueFilename}`,
          status: 'processing',
        },
      });
    } catch (error) {
      logger.error('Document upload error:', error);
      res.status(500).json({
        success: false,
        error: error instanceof Error ? error.message : 'Upload failed',
      });
    }
  }
);

/**
 * GET /api/v1/files/:id/status
 * Get document processing status
 */
router.get(
  '/:id/status',
  clerkAuth,
  async (req: Request, res: Response): Promise<void> => {
    try {
      const userId = req.user!.id;
      const { id } = req.params;

      const attachment = await prisma.attachment.findFirst({
        where: { id, userId },
        select: {
          id: true,
          status: true,
          extractedText: true,
          analysisResult: true,
          url: true,
          originalName: true,
        },
      });

      if (!attachment) {
        res.status(404).json({
          success: false,
          error: 'File not found',
        });
        return;
      }

      res.json({
        success: true,
        data: {
          id: attachment.id,
          status: attachment.status,
          extractedText: attachment.extractedText,
          analysisResult: attachment.analysisResult,
          url: attachment.url,
          name: attachment.originalName,
        },
      });
    } catch (error) {
      logger.error('Get file status error:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to get file status',
      });
    }
  }
);

/**
 * Process document text extraction from buffer (memory storage)
 */
async function processDocumentFromBuffer(
  attachmentId: string,
  buffer: Buffer,
  mimeType: string,
  originalName: string
): Promise<void> {
  try {
    let extractedText = '';

    // Handle different file types
    if (mimeType === 'text/plain' || mimeType === 'text/markdown' || mimeType.startsWith('text/')) {
      // Plain text files - read directly from buffer
      extractedText = buffer.toString('utf-8');
    } else if (mimeType === 'application/json') {
      // JSON files - read and stringify
      const content = buffer.toString('utf-8');
      try {
        const json = JSON.parse(content);
        extractedText = JSON.stringify(json, null, 2);
      } catch {
        extractedText = content;
      }
    } else if (mimeType === 'text/csv') {
      // CSV files - read as text
      extractedText = buffer.toString('utf-8');
    } else if (mimeType === 'application/pdf') {
      // PDF files - try pdf-parse first, then OCR as fallback for scanned PDFs
      try {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const pdfParse = (await import('pdf-parse')) as any;
        const pdfData = await (pdfParse.default || pdfParse)(buffer);
        extractedText = pdfData.text?.trim() || '';
        
        // If pdf-parse returned empty/minimal text, it might be a scanned PDF - try OCR
        if (extractedText.length < 50) {
          logger.info(`PDF has minimal text (${extractedText.length} chars), trying OCR for scanned content...`);
          try {
            const { ocrService } = await import('../services/OCRService.js');
            const base64 = buffer.toString('base64');
            const ocrResult = await ocrService.extractText(base64, 'application/pdf', {
              language: 'eng',
              isDocument: true,
            });
            
            if (ocrResult.success && ocrResult.text && ocrResult.text.length > extractedText.length) {
              extractedText = ocrResult.text;
              logger.info(`PDF OCR extracted: ${extractedText.length} chars from ${originalName}`);
            }
          } catch (ocrError) {
            logger.warn('PDF OCR fallback failed:', ocrError);
          }
        } else {
          logger.info(`PDF text extracted: ${extractedText.length} chars from ${originalName}`);
        }
      } catch (pdfError) {
        logger.warn('PDF parsing failed, trying OCR:', pdfError);
        
        // Try OCR as complete fallback
        try {
          const { ocrService } = await import('../services/OCRService.js');
          const base64 = buffer.toString('base64');
          const ocrResult = await ocrService.extractText(base64, 'application/pdf', {
            language: 'eng',
            isDocument: true,
          });
          
          if (ocrResult.success && ocrResult.text) {
            extractedText = ocrResult.text;
            logger.info(`PDF OCR extracted (fallback): ${extractedText.length} chars from ${originalName}`);
          } else {
            extractedText = '[PDF content - text extraction unavailable. The document may be image-based or encrypted.]';
          }
        } catch (ocrError) {
          logger.error('PDF OCR fallback also failed:', ocrError);
          extractedText = '[PDF content - text extraction unavailable. Please try a different file format.]';
        }
      }
    } else if (
      mimeType === 'application/msword' ||
      mimeType === 'application/vnd.openxmlformats-officedocument.wordprocessingml.document'
    ) {
      // Word documents - extract from buffer
      try {
        const mammothModule = await import('mammoth');
        const mammoth = mammothModule.default || mammothModule;
        const result = await mammoth.extractRawText({ buffer });
        extractedText = result.value;
        logger.info(`Word doc extracted: ${extractedText.length} chars from ${originalName}`);
      } catch (docError) {
        logger.warn('Word document parsing failed:', docError);
        extractedText = '[Word document content - text extraction unavailable]';
      }
    } else if (mimeType.startsWith('image/')) {
      // Images - use OCR service
      try {
        const { ocrService } = await import('../services/OCRService.js');
        const base64 = buffer.toString('base64');
        const result = await ocrService.extractText(base64, mimeType, {
          language: 'eng',
          isDocument: false, // This is an image
        });
        
        if (result.success && result.text) {
          extractedText = result.text;
          logger.info(`OCR extracted: ${extractedText.length} chars from ${originalName} using ${result.provider}`);
        } else {
          extractedText = '[Image - no text detected or OCR failed]';
          logger.warn(`OCR failed for ${originalName}: ${result.error}`);
        }
      } catch (ocrError) {
        logger.error('OCR service error:', ocrError);
        extractedText = '[Image - OCR service unavailable]';
      }
    } else {
      extractedText = `[File type ${mimeType} - content not extractable]`;
    }

    // Truncate if too long (to prevent token overflow)
    const MAX_TEXT_LENGTH = 50000; // ~12,500 tokens
    if (extractedText.length > MAX_TEXT_LENGTH) {
      extractedText = extractedText.substring(0, MAX_TEXT_LENGTH) + '\n\n[... content truncated due to length ...]';
    }

    // Update attachment with extracted text
    await prisma.attachment.update({
      where: { id: attachmentId },
      data: {
        status: extractedText.length > 0 ? 'completed' : 'failed',
        extractedText: extractedText || null,
      },
    });

    logger.info(`Document processing completed for ${attachmentId}, ${extractedText.length} chars extracted`);
  } catch (error) {
    logger.error(`Document processing failed for ${attachmentId}:`, error);
    
    await prisma.attachment.update({
      where: { id: attachmentId },
      data: {
        status: 'failed',
        extractedText: null,
      },
    });
  }
}

export default router;
