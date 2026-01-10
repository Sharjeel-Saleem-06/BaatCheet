/**
 * Export Routes
 * API endpoints for conversation export
 * 
 * @module Routes/Export
 */

import { Router, Request, Response } from 'express';
import { authenticate } from '../middleware/index.js';
import { exportService } from '../services/ExportService.js';
import { logger } from '../utils/logger.js';

const router = Router();

// ============================================
// Export Routes
// ============================================

/**
 * GET /api/v1/export/:conversationId
 * Export a conversation in specified format
 */
router.get(
  '/:conversationId',
  authenticate,
  async (req: Request, res: Response): Promise<void> => {
    try {
      const userId = req.user!.userId;
      const { conversationId } = req.params;
      const format = (req.query.format as string || 'json').toLowerCase();

      if (!['json', 'txt', 'md', 'pdf'].includes(format)) {
        res.status(400).json({
          success: false,
          error: 'Invalid format. Supported: json, txt, md, pdf',
        });
        return;
      }

      const result = await exportService.export(
        conversationId,
        userId,
        format as 'json' | 'txt' | 'md' | 'pdf'
      );

      if (!result.success) {
        res.status(404).json({
          success: false,
          error: result.error,
        });
        return;
      }

      // Set appropriate headers for download
      res.setHeader('Content-Disposition', `attachment; filename="${result.filename}"`);
      res.setHeader('Content-Type', result.mimeType!);

      if (Buffer.isBuffer(result.data)) {
        res.send(result.data);
      } else {
        res.send(result.data);
      }
    } catch (error) {
      logger.error('Export error:', error);
      res.status(500).json({
        success: false,
        error: 'Export failed',
      });
    }
  }
);

/**
 * GET /api/v1/export/:conversationId/preview
 * Preview export without downloading
 */
router.get(
  '/:conversationId/preview',
  authenticate,
  async (req: Request, res: Response): Promise<void> => {
    try {
      const userId = req.user!.userId;
      const { conversationId } = req.params;
      const format = (req.query.format as string || 'json').toLowerCase();

      if (!['json', 'txt', 'md'].includes(format)) {
        res.status(400).json({
          success: false,
          error: 'Preview not available for this format',
        });
        return;
      }

      const result = await exportService.export(
        conversationId,
        userId,
        format as 'json' | 'txt' | 'md'
      );

      if (!result.success) {
        res.status(404).json({
          success: false,
          error: result.error,
        });
        return;
      }

      res.json({
        success: true,
        data: {
          content: result.data,
          filename: result.filename,
          format,
        },
      });
    } catch (error) {
      logger.error('Export preview error:', error);
      res.status(500).json({
        success: false,
        error: 'Export preview failed',
      });
    }
  }
);

export default router;
