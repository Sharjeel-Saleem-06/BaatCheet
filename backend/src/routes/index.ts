import { Router } from 'express';
import authRoutes from './auth.js';
import chatRoutes from './chat.js';
import conversationRoutes from './conversations.js';
import projectRoutes from './projects.js';

const router = Router();

// Mount routes
router.use('/auth', authRoutes);
router.use('/chat', chatRoutes);
router.use('/conversations', conversationRoutes);
router.use('/projects', projectRoutes);

export default router;
