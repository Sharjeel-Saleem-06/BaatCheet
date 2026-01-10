/**
 * Routes Index
 * Central export point for all API routes
 * 
 * @module Routes
 */

import { Router } from 'express';
import authRoutes from './auth.js';
import chatRoutes from './chat.js';
import conversationRoutes from './conversations.js';
import projectRoutes from './projects.js';
import imageRoutes from './images.js';
import exportRoutes from './export.js';
import shareRoutes from './share.js';
import templateRoutes from './templates.js';
import audioRoutes from './audio.js';
import analyticsRoutes from './analytics.js';
import webhookRoutes from './webhooks.js';
import apiKeyRoutes from './apikeys.js';

const router = Router();

// ============================================
// Mount Routes
// ============================================

// Authentication
router.use('/auth', authRoutes);

// Chat & AI
router.use('/chat', chatRoutes);

// Conversations
router.use('/conversations', conversationRoutes);

// Projects
router.use('/projects', projectRoutes);

// Images (upload, OCR, analysis)
router.use('/images', imageRoutes);

// Audio (voice input, transcription)
router.use('/audio', audioRoutes);

// Export (PDF, TXT, JSON, MD)
router.use('/export', exportRoutes);

// Share links
router.use('/share', shareRoutes);

// Templates
router.use('/templates', templateRoutes);

// Analytics
router.use('/analytics', analyticsRoutes);

// Webhooks
router.use('/webhooks', webhookRoutes);

// API Keys
router.use('/api-keys', apiKeyRoutes);

export default router;
