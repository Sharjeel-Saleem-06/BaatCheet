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
import fileRoutes from './files.js';
import exportRoutes from './export.js';
import shareRoutes from './share.js';
import templateRoutes from './templates.js';
import audioRoutes from './audio.js';
import analyticsRoutes from './analytics.js';
import webhookRoutes from './webhooks.js';
import apiKeyRoutes from './apikeys.js';
import healthRoutes from './health.js';
import adminRoutes from './admin.js';
import profileRoutes from './profile.js';

const router = Router();

// ============================================
// Mount Routes
// ============================================

// Health checks (no auth required)
router.use('/health', healthRoutes);

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

// Files (documents: PDF, TXT, DOC, etc.)
router.use('/files', fileRoutes);

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

// Admin Panel (requires admin role)
router.use('/admin', adminRoutes);

// User Profile & Memory System
router.use('/profile', profileRoutes);

export default router;
