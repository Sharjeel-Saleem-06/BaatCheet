/**
 * Clerk Webhook Handler
 * Syncs Clerk user events with database
 * 
 * @module Routes/ClerkWebhook
 */

import { Router, Request, Response } from 'express';
import { Webhook } from 'svix';
import { prisma } from '../config/database.js';
import { logger } from '../utils/logger.js';
import { config } from '../config/index.js';

const router = Router();

// ============================================
// Types
// ============================================

interface ClerkUserData {
  id: string;
  email_addresses: Array<{ email_address: string; id: string }>;
  username: string | null;
  first_name: string | null;
  last_name: string | null;
  image_url: string | null;
  created_at: number;
  updated_at: number;
}

interface ClerkWebhookEvent {
  type: string;
  data: ClerkUserData;
}

// ============================================
// Webhook Handler
// ============================================

/**
 * POST /api/v1/clerk/webhook
 * Handle Clerk webhook events
 */
router.post(
  '/webhook',
  async (req: Request, res: Response): Promise<void> => {
    try {
      const webhookSecret = config.clerk.webhookSecret;

      if (!webhookSecret) {
        logger.error('Clerk webhook secret not configured');
        res.status(500).json({ error: 'Webhook secret not configured' });
        return;
      }

      // Get headers
      const svixId = req.headers['svix-id'] as string;
      const svixTimestamp = req.headers['svix-timestamp'] as string;
      const svixSignature = req.headers['svix-signature'] as string;

      if (!svixId || !svixTimestamp || !svixSignature) {
        res.status(400).json({ error: 'Missing svix headers' });
        return;
      }

      // Verify webhook
      const wh = new Webhook(webhookSecret);
      let event: ClerkWebhookEvent;

      try {
        event = wh.verify(JSON.stringify(req.body), {
          'svix-id': svixId,
          'svix-timestamp': svixTimestamp,
          'svix-signature': svixSignature,
        }) as ClerkWebhookEvent;
      } catch (err) {
        logger.error('Webhook verification failed:', err);
        res.status(400).json({ error: 'Webhook verification failed' });
        return;
      }

      // Handle event
      const { type, data } = event;

      switch (type) {
        case 'user.created':
          await handleUserCreated(data);
          break;

        case 'user.updated':
          await handleUserUpdated(data);
          break;

        case 'user.deleted':
          await handleUserDeleted(data);
          break;

        default:
          logger.info(`Unhandled Clerk webhook event: ${type}`);
      }

      res.status(200).json({ received: true });
    } catch (error) {
      logger.error('Clerk webhook error:', error);
      res.status(500).json({ error: 'Webhook processing failed' });
    }
  }
);

// ============================================
// Event Handlers
// ============================================

// ============================================
// Admin/Moderator Email Mappings
// ============================================
const ADMIN_EMAILS = ['sharry00010@gmail.com'];
const MODERATOR_EMAILS = ['clashroyale8ab@gmail.com'];

function getRoleForEmail(email: string): 'admin' | 'moderator' | 'user' {
  const lowerEmail = email.toLowerCase();
  if (ADMIN_EMAILS.includes(lowerEmail)) return 'admin';
  if (MODERATOR_EMAILS.includes(lowerEmail)) return 'moderator';
  return 'user';
}

async function handleUserCreated(data: ClerkUserData): Promise<void> {
  const email = data.email_addresses[0]?.email_address;

  if (!email) {
    logger.warn('User created without email:', data.id);
    return;
  }

  // Check if user already exists
  const existing = await prisma.user.findUnique({
    where: { clerkId: data.id },
  });

  if (existing) {
    logger.info(`User already exists: ${data.id}`);
    return;
  }

  // Determine role based on email
  const role = getRoleForEmail(email);

  // Create user
  const user = await prisma.user.create({
    data: {
      clerkId: data.id,
      email,
      username: data.username,
      firstName: data.first_name,
      lastName: data.last_name,
      avatar: data.image_url,
      role, // Assign role based on email
    },
  });

  // Create audit log
  await prisma.auditLog.create({
    data: {
      userId: user.id,
      action: 'user.created',
      resource: 'user',
      resourceId: user.id,
      metadata: { source: 'clerk_webhook', assignedRole: role },
    },
  });

  logger.info(`User created via webhook: ${email} (role: ${role})`);
}

async function handleUserUpdated(data: ClerkUserData): Promise<void> {
  const email = data.email_addresses[0]?.email_address;

  const user = await prisma.user.findUnique({
    where: { clerkId: data.id },
  });

  if (!user) {
    // User doesn't exist, create them
    await handleUserCreated(data);
    return;
  }

  // Update user
  await prisma.user.update({
    where: { id: user.id },
    data: {
      email: email || user.email,
      username: data.username,
      firstName: data.first_name,
      lastName: data.last_name,
      avatar: data.image_url,
    },
  });

  // Create audit log
  await prisma.auditLog.create({
    data: {
      userId: user.id,
      action: 'user.updated',
      resource: 'user',
      resourceId: user.id,
      metadata: { source: 'clerk_webhook' },
    },
  });

  logger.info(`User updated via webhook: ${email}`);
}

async function handleUserDeleted(data: ClerkUserData): Promise<void> {
  const user = await prisma.user.findUnique({
    where: { clerkId: data.id },
  });

  if (!user) {
    logger.warn(`User not found for deletion: ${data.id}`);
    return;
  }

  // Create audit log before deletion
  await prisma.auditLog.create({
    data: {
      action: 'user.deleted',
      resource: 'user',
      resourceId: user.id,
      metadata: { source: 'clerk_webhook', email: user.email },
    },
  });

  // Delete user (cascades to all related data)
  await prisma.user.delete({
    where: { id: user.id },
  });

  logger.info(`User deleted via webhook: ${user.email}`);
}

export default router;
