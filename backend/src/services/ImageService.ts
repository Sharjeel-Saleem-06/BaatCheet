/**
 * Image Service
 * Handles image upload, storage, and processing
 * 
 * @module ImageService
 */

import { Request } from 'express';
import multer, { FileFilterCallback } from 'multer';
import path from 'path';
import fs from 'fs/promises';
import { v4 as uuidv4 } from 'uuid';
import { logger } from '../utils/logger.js';
import { prisma } from '../config/database.js';
import { ocrService } from './OCRService.js';
import { visionService } from './VisionService.js';

// ============================================
// Types
// ============================================

export interface UploadedImage {
  id: string;
  originalName: string;
  storedName: string;
  mimeType: string;
  size: number;
  path: string;
  url: string;
}

export interface ImageAnalysisResult {
  success: boolean;
  imageId?: string;
  ocrText?: string;
  analysis?: string;
  provider?: string;
  error?: string;
}

// ============================================
// Configuration
// ============================================

const UPLOAD_DIR = path.join(process.cwd(), 'uploads', 'images');
const TEMP_DIR = path.join(process.cwd(), 'uploads', 'temp');
const MAX_FILE_SIZE = 10 * 1024 * 1024; // 10MB
const ALLOWED_MIME_TYPES = [
  'image/jpeg',
  'image/png',
  'image/webp',
  'image/gif',
  'application/pdf',
];

// Ensure directories exist
const ensureDirectories = async () => {
  try {
    await fs.mkdir(UPLOAD_DIR, { recursive: true });
    await fs.mkdir(TEMP_DIR, { recursive: true });
  } catch (error) {
    logger.error('Failed to create upload directories:', error);
  }
};
ensureDirectories();

// ============================================
// Multer Configuration
// ============================================

const storage = multer.diskStorage({
  destination: (_req, _file, cb) => {
    cb(null, UPLOAD_DIR);
  },
  filename: (_req, file, cb) => {
    const ext = path.extname(file.originalname).toLowerCase();
    const uniqueName = `${uuidv4()}${ext}`;
    cb(null, uniqueName);
  },
});

const fileFilter = (
  _req: Request,
  file: Express.Multer.File,
  cb: FileFilterCallback
) => {
  if (ALLOWED_MIME_TYPES.includes(file.mimetype)) {
    cb(null, true);
  } else {
    cb(new Error(`Invalid file type. Allowed: ${ALLOWED_MIME_TYPES.join(', ')}`));
  }
};

export const upload = multer({
  storage,
  fileFilter,
  limits: {
    fileSize: MAX_FILE_SIZE,
    files: 5, // Max 5 files per request
  },
});

// ============================================
// Image Service Class
// ============================================

class ImageServiceClass {
  /**
   * Process uploaded file and save metadata
   */
  public async processUpload(
    file: Express.Multer.File,
    userId: string,
    messageId?: string
  ): Promise<UploadedImage> {
    const imageUrl = `/uploads/images/${file.filename}`;

    // If messageId provided, create attachment record
    if (messageId) {
      await prisma.attachment.create({
        data: {
          messageId,
          type: file.mimetype.startsWith('image/') ? 'image' : 'document',
          url: imageUrl,
          metadata: {
            originalName: file.originalname,
            size: file.size,
            mimeType: file.mimetype,
          },
        },
      });
    }

    logger.info(`Image uploaded: ${file.filename} by user ${userId}`);

    return {
      id: path.basename(file.filename, path.extname(file.filename)),
      originalName: file.originalname,
      storedName: file.filename,
      mimeType: file.mimetype,
      size: file.size,
      path: file.path,
      url: imageUrl,
    };
  }

  /**
   * Get image as base64 for API processing
   */
  public async getImageBase64(imagePath: string): Promise<string> {
    const fullPath = path.isAbsolute(imagePath)
      ? imagePath
      : path.join(UPLOAD_DIR, imagePath);

    const buffer = await fs.readFile(fullPath);
    return buffer.toString('base64');
  }

  /**
   * Extract text from image using OCR
   */
  public async extractText(
    imagePath: string,
    mimeType: string,
    language: string = 'eng'
  ): Promise<{ success: boolean; text: string; provider?: string; error?: string }> {
    try {
      const base64 = await this.getImageBase64(imagePath);
      const result = await ocrService.extractText(base64, mimeType, { language });

      return {
        success: result.success,
        text: result.text,
        provider: result.provider,
        error: result.error,
      };
    } catch (error) {
      logger.error('OCR extraction failed:', error);
      return {
        success: false,
        text: '',
        error: error instanceof Error ? error.message : 'OCR failed',
      };
    }
  }

  /**
   * Analyze image with AI
   */
  public async analyzeImage(
    imagePath: string,
    mimeType: string,
    prompt: string = 'Describe this image in detail.',
    language: 'en' | 'ur' = 'en'
  ): Promise<{ success: boolean; analysis: string; provider?: string; error?: string }> {
    try {
      const base64 = await this.getImageBase64(imagePath);
      const result = await visionService.analyzeImage(base64, mimeType, prompt, { language });

      return {
        success: result.success,
        analysis: result.response,
        provider: result.provider,
        error: result.error,
      };
    } catch (error) {
      logger.error('Image analysis failed:', error);
      return {
        success: false,
        analysis: '',
        error: error instanceof Error ? error.message : 'Analysis failed',
      };
    }
  }

  /**
   * Full image processing: OCR + Analysis
   */
  public async processImage(
    imagePath: string,
    mimeType: string,
    options: {
      extractText?: boolean;
      analyze?: boolean;
      prompt?: string;
      language?: string;
    } = {}
  ): Promise<ImageAnalysisResult> {
    const { extractText = true, analyze = true, prompt, language = 'eng' } = options;

    try {
      let ocrText: string | undefined;
      let analysis: string | undefined;
      let provider: string | undefined;

      // Extract text if requested
      if (extractText) {
        const ocrResult = await this.extractText(imagePath, mimeType, language);
        if (ocrResult.success) {
          ocrText = ocrResult.text;
          provider = ocrResult.provider;
        }
      }

      // Analyze if requested
      if (analyze) {
        const analysisPrompt = prompt || 
          (ocrText 
            ? `Describe this image. The image contains the following text: "${ocrText.substring(0, 500)}..."`
            : 'Describe this image in detail.');
        
        const analysisResult = await this.analyzeImage(
          imagePath, 
          mimeType, 
          analysisPrompt,
          language === 'urd' ? 'ur' : 'en'
        );
        
        if (analysisResult.success) {
          analysis = analysisResult.analysis;
          provider = analysisResult.provider;
        }
      }

      return {
        success: true,
        ocrText,
        analysis,
        provider,
      };
    } catch (error) {
      logger.error('Image processing failed:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Processing failed',
      };
    }
  }

  /**
   * Delete image file
   */
  public async deleteImage(filename: string): Promise<boolean> {
    try {
      const filePath = path.join(UPLOAD_DIR, filename);
      await fs.unlink(filePath);
      logger.info(`Image deleted: ${filename}`);
      return true;
    } catch (error) {
      logger.error('Failed to delete image:', error);
      return false;
    }
  }

  /**
   * Get image metadata
   */
  public async getImageInfo(filename: string): Promise<{
    exists: boolean;
    size?: number;
    mimeType?: string;
    createdAt?: Date;
  }> {
    try {
      const filePath = path.join(UPLOAD_DIR, filename);
      const stats = await fs.stat(filePath);
      const ext = path.extname(filename).toLowerCase();
      
      const mimeTypes: Record<string, string> = {
        '.jpg': 'image/jpeg',
        '.jpeg': 'image/jpeg',
        '.png': 'image/png',
        '.webp': 'image/webp',
        '.gif': 'image/gif',
        '.pdf': 'application/pdf',
      };

      return {
        exists: true,
        size: stats.size,
        mimeType: mimeTypes[ext] || 'application/octet-stream',
        createdAt: stats.birthtime,
      };
    } catch {
      return { exists: false };
    }
  }

  /**
   * Cleanup old temporary files
   */
  public async cleanupTempFiles(maxAgeHours: number = 24): Promise<number> {
    try {
      const files = await fs.readdir(TEMP_DIR);
      const now = Date.now();
      let deleted = 0;

      for (const file of files) {
        const filePath = path.join(TEMP_DIR, file);
        const stats = await fs.stat(filePath);
        const ageHours = (now - stats.mtimeMs) / (1000 * 60 * 60);

        if (ageHours > maxAgeHours) {
          await fs.unlink(filePath);
          deleted++;
        }
      }

      if (deleted > 0) {
        logger.info(`Cleaned up ${deleted} temporary files`);
      }

      return deleted;
    } catch (error) {
      logger.error('Temp cleanup failed:', error);
      return 0;
    }
  }
}

// Export singleton instance
export const imageService = new ImageServiceClass();
export default imageService;
