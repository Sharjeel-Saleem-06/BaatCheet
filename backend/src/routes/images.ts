/**
 * Image Routes
 * API endpoints for image upload, OCR, and analysis
 * 
 * @module Routes/Images
 */

import { Router, Request, Response } from 'express';
import path from 'path';
import { authenticate, chatLimiter } from '../middleware/index.js';
import { imageService, upload } from '../services/ImageService.js';
import { logger } from '../utils/logger.js';

const router = Router();

// ============================================
// Image Upload Routes
// ============================================

/**
 * POST /api/v1/images/upload
 * Upload single or multiple images
 */
router.post(
  '/upload',
  authenticate,
  upload.array('images', 5),
  async (req: Request, res: Response): Promise<void> => {
    try {
      const userId = req.user!.userId;
      const files = req.files as Express.Multer.File[];
      const { messageId } = req.body;

      if (!files || files.length === 0) {
        res.status(400).json({
          success: false,
          error: 'No files uploaded',
        });
        return;
      }

      const uploadedImages = await Promise.all(
        files.map((file) => imageService.processUpload(file, userId, messageId))
      );

      res.json({
        success: true,
        data: {
          images: uploadedImages,
          count: uploadedImages.length,
        },
      });
    } catch (error) {
      logger.error('Image upload error:', error);
      res.status(500).json({
        success: false,
        error: error instanceof Error ? error.message : 'Upload failed',
      });
    }
  }
);

/**
 * POST /api/v1/images/ocr
 * Extract text from an uploaded image
 */
router.post(
  '/ocr',
  authenticate,
  chatLimiter,
  upload.single('image'),
  async (req: Request, res: Response): Promise<void> => {
    try {
      const file = req.file;
      const { language = 'eng' } = req.body;

      if (!file) {
        res.status(400).json({
          success: false,
          error: 'No image provided',
        });
        return;
      }

      const result = await imageService.extractText(
        file.filename,
        file.mimetype,
        language
      );

      res.json({
        success: result.success,
        data: result.success ? {
          text: result.text,
          provider: result.provider,
          imageUrl: `/uploads/images/${file.filename}`,
        } : undefined,
        error: result.error,
      });
    } catch (error) {
      logger.error('OCR error:', error);
      res.status(500).json({
        success: false,
        error: 'OCR extraction failed',
      });
    }
  }
);

/**
 * POST /api/v1/images/analyze
 * Get AI analysis of an uploaded image
 */
router.post(
  '/analyze',
  authenticate,
  chatLimiter,
  upload.single('image'),
  async (req: Request, res: Response): Promise<void> => {
    try {
      const file = req.file;
      const { prompt, language = 'en' } = req.body;

      if (!file) {
        res.status(400).json({
          success: false,
          error: 'No image provided',
        });
        return;
      }

      const result = await imageService.analyzeImage(
        file.filename,
        file.mimetype,
        prompt || 'Describe this image in detail.',
        language
      );

      res.json({
        success: result.success,
        data: result.success ? {
          analysis: result.analysis,
          provider: result.provider,
          imageUrl: `/uploads/images/${file.filename}`,
        } : undefined,
        error: result.error,
      });
    } catch (error) {
      logger.error('Image analysis error:', error);
      res.status(500).json({
        success: false,
        error: 'Image analysis failed',
      });
    }
  }
);

/**
 * POST /api/v1/images/process
 * Full image processing: OCR + Analysis
 */
router.post(
  '/process',
  authenticate,
  chatLimiter,
  upload.single('image'),
  async (req: Request, res: Response): Promise<void> => {
    try {
      const file = req.file;
      const { extractText = true, analyze = true, prompt, language = 'eng' } = req.body;

      if (!file) {
        res.status(400).json({
          success: false,
          error: 'No image provided',
        });
        return;
      }

      const result = await imageService.processImage(file.filename, file.mimetype, {
        extractText: extractText === 'true' || extractText === true,
        analyze: analyze === 'true' || analyze === true,
        prompt,
        language,
      });

      res.json({
        success: result.success,
        data: result.success ? {
          ocrText: result.ocrText,
          analysis: result.analysis,
          provider: result.provider,
          imageUrl: `/uploads/images/${file.filename}`,
        } : undefined,
        error: result.error,
      });
    } catch (error) {
      logger.error('Image processing error:', error);
      res.status(500).json({
        success: false,
        error: 'Image processing failed',
      });
    }
  }
);

/**
 * GET /api/v1/images/:filename
 * Get image metadata or serve image
 */
router.get(
  '/:filename',
  authenticate,
  async (req: Request, res: Response): Promise<void> => {
    try {
      const { filename } = req.params;
      const { metadata } = req.query;

      const info = await imageService.getImageInfo(filename);

      if (!info.exists) {
        res.status(404).json({
          success: false,
          error: 'Image not found',
        });
        return;
      }

      if (metadata === 'true') {
        res.json({
          success: true,
          data: {
            filename,
            ...info,
          },
        });
      } else {
        // Serve the image file
        const filePath = path.join(process.cwd(), 'uploads', 'images', filename);
        res.sendFile(filePath);
      }
    } catch (error) {
      logger.error('Get image error:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to get image',
      });
    }
  }
);

/**
 * DELETE /api/v1/images/:filename
 * Delete an image
 */
router.delete(
  '/:filename',
  authenticate,
  async (req: Request, res: Response): Promise<void> => {
    try {
      const { filename } = req.params;

      const deleted = await imageService.deleteImage(filename);

      if (!deleted) {
        res.status(404).json({
          success: false,
          error: 'Image not found or could not be deleted',
        });
        return;
      }

      res.json({
        success: true,
        message: 'Image deleted',
      });
    } catch (error) {
      logger.error('Delete image error:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to delete image',
      });
    }
  }
);

export default router;
