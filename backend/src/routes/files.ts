/**
 * File Upload Routes
 * Handles document uploads (PDF, TXT, DOC, etc.)
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
const FILE_SIZE_LIMITS = {
  document: 5 * 1024 * 1024, // 5MB for documents
};

// Allowed MIME types for documents
const ALLOWED_DOCUMENT_TYPES = [
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
];

// Configure multer for document uploads
const storage = multer.diskStorage({
  destination: async (req, file, cb) => {
    const uploadDir = path.join(process.cwd(), 'uploads', 'documents');
    try {
      await fs.mkdir(uploadDir, { recursive: true });
      cb(null, uploadDir);
    } catch (error) {
      cb(error as Error, uploadDir);
    }
  },
  filename: (req, file, cb) => {
    const uniqueName = `${uuidv4()}${path.extname(file.originalname)}`;
    cb(null, uniqueName);
  },
});

const fileFilter = (
  req: Request,
  file: Express.Multer.File,
  cb: multer.FileFilterCallback
) => {
  // Check MIME type
  if (ALLOWED_DOCUMENT_TYPES.includes(file.mimetype) || file.mimetype.startsWith('text/')) {
    cb(null, true);
  } else {
    cb(new Error(`Unsupported file type: ${file.mimetype}`));
  }
};

const upload = multer({
  storage,
  limits: {
    fileSize: FILE_SIZE_LIMITS.document,
    files: 5, // Max 5 files at once
  },
  fileFilter,
});

/**
 * POST /api/v1/files/upload
 * Upload document files
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

      const fileUrl = `/uploads/documents/${file.filename}`;

      // Create attachment record
      const attachment = await prisma.attachment.create({
        data: {
          userId,
          conversationId: conversationId || null,
          type: 'document',
          originalName: file.originalname,
          storedName: file.filename,
          fileSize: file.size,
          mimeType: file.mimetype,
          url: fileUrl,
          status: 'processing',
          extractedText: null,
          analysisResult: null,
        },
      });

      logger.info(`Document uploaded: ${file.filename} by user ${userId}, Attachment ID: ${attachment.id}`);

      // Process text extraction in background
      processDocumentText(attachment.id, file.path, file.mimetype).catch((err) => {
        logger.error(`Document processing failed for ${attachment.id}:`, err);
      });

      res.json({
        success: true,
        data: {
          id: attachment.id,
          originalName: file.originalname,
          storedName: file.filename,
          mimeType: file.mimetype,
          size: file.size,
          url: fileUrl,
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
 * Process document text extraction
 */
async function processDocumentText(
  attachmentId: string,
  filePath: string,
  mimeType: string
): Promise<void> {
  try {
    let extractedText = '';

    // Handle different file types
    if (mimeType === 'text/plain' || mimeType === 'text/markdown' || mimeType.startsWith('text/')) {
      // Plain text files - read directly
      extractedText = await fs.readFile(filePath, 'utf-8');
    } else if (mimeType === 'application/json') {
      // JSON files - read and stringify
      const content = await fs.readFile(filePath, 'utf-8');
      try {
        const json = JSON.parse(content);
        extractedText = JSON.stringify(json, null, 2);
      } catch {
        extractedText = content;
      }
    } else if (mimeType === 'text/csv') {
      // CSV files - read as text
      extractedText = await fs.readFile(filePath, 'utf-8');
    } else if (mimeType === 'application/pdf') {
      // PDF files - use pdf-parse if available, otherwise mark as unsupported
      try {
        // Dynamic import for pdf-parse
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const pdfParse = (await import('pdf-parse')) as any;
        const dataBuffer = await fs.readFile(filePath);
        const pdfData = await (pdfParse.default || pdfParse)(dataBuffer);
        extractedText = pdfData.text;
      } catch (pdfError) {
        logger.warn('PDF parsing failed, falling back to placeholder:', pdfError);
        extractedText = '[PDF content - text extraction unavailable]';
      }
    } else if (
      mimeType === 'application/msword' ||
      mimeType === 'application/vnd.openxmlformats-officedocument.wordprocessingml.document'
    ) {
      // Word documents - basic extraction
      try {
        const mammothModule = await import('mammoth');
        const mammoth = mammothModule.default || mammothModule;
        const result = await mammoth.extractRawText({ path: filePath });
        extractedText = result.value;
      } catch (docError) {
        logger.warn('Word document parsing failed:', docError);
        extractedText = '[Word document content - text extraction unavailable]';
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
        status: 'completed',
        extractedText,
      },
    });

    logger.info(`Document text extraction completed for ${attachmentId}, ${extractedText.length} chars`);
  } catch (error) {
    logger.error(`Document text extraction failed for ${attachmentId}:`, error);
    
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
