/**
 * Share Service
 * Handles conversation sharing with unique links
 * 
 * @module ShareService
 */

import { v4 as uuidv4 } from 'uuid';
import { prisma } from '../config/database.js';
import { logger } from '../utils/logger.js';

// ============================================
// Types
// ============================================

export interface ShareLink {
  id: string;
  conversationId: string;
  shareId: string;
  expiresAt?: Date | null;
  isPublic: boolean;
  accessCount: number;
  createdAt: Date;
}

export interface SharedConversation {
  title: string;
  model: string;
  createdAt: Date;
  messages: Array<{
    role: string;
    content: string;
    createdAt: Date;
  }>;
}

// ============================================
// Share Service Class
// ============================================

class ShareServiceClass {
  /**
   * Create a share link for a conversation
   */
  public async createShareLink(
    conversationId: string,
    userId: string,
    options: {
      expiresInDays?: number;
      isPublic?: boolean;
    } = {}
  ): Promise<{ success: boolean; shareLink?: ShareLink; error?: string }> {
    try {
      // Verify conversation ownership
      const conversation = await prisma.conversation.findFirst({
        where: { id: conversationId, userId },
      });

      if (!conversation) {
        return { success: false, error: 'Conversation not found' };
      }

      // Check if share already exists
      const existing = await prisma.shareLink.findFirst({
        where: { conversationId },
      });

      if (existing) {
        return {
          success: true,
          shareLink: {
            id: existing.id,
            conversationId: existing.conversationId,
            shareId: existing.shareId,
            expiresAt: existing.expiresAt,
            isPublic: existing.isPublic,
            accessCount: existing.accessCount,
            createdAt: existing.createdAt,
          },
        };
      }

      // Create new share link
      const shareId = uuidv4();
      const expiresAt = options.expiresInDays
        ? new Date(Date.now() + options.expiresInDays * 24 * 60 * 60 * 1000)
        : null;

      const shareLink = await prisma.shareLink.create({
        data: {
          conversationId,
          userId,
          shareId,
          expiresAt,
          isPublic: options.isPublic ?? true,
        },
      });

      logger.info(`Share link created for conversation ${conversationId}`);

      return {
        success: true,
        shareLink: {
          id: shareLink.id,
          conversationId: shareLink.conversationId,
          shareId: shareLink.shareId,
          expiresAt: shareLink.expiresAt,
          isPublic: shareLink.isPublic,
          accessCount: shareLink.accessCount,
          createdAt: shareLink.createdAt,
        },
      };
    } catch (error) {
      logger.error('Create share link failed:', error);
      return { success: false, error: 'Failed to create share link' };
    }
  }

  /**
   * Get shared conversation by share ID
   */
  public async getSharedConversation(
    shareId: string
  ): Promise<{ success: boolean; conversation?: SharedConversation; error?: string }> {
    try {
      const shareLink = await prisma.shareLink.findUnique({
        where: { shareId },
        include: {
          conversation: {
            include: {
              messages: {
                orderBy: { createdAt: 'asc' },
                select: {
                  role: true,
                  content: true,
                  createdAt: true,
                },
              },
            },
          },
        },
      });

      if (!shareLink) {
        return { success: false, error: 'Share link not found' };
      }

      // Check expiry
      if (shareLink.expiresAt && shareLink.expiresAt < new Date()) {
        return { success: false, error: 'Share link has expired' };
      }

      // Increment access count
      await prisma.shareLink.update({
        where: { id: shareLink.id },
        data: { accessCount: { increment: 1 } },
      });

      return {
        success: true,
        conversation: {
          title: shareLink.conversation.title,
          model: shareLink.conversation.model,
          createdAt: shareLink.conversation.createdAt,
          messages: shareLink.conversation.messages,
        },
      };
    } catch (error) {
      logger.error('Get shared conversation failed:', error);
      return { success: false, error: 'Failed to get shared conversation' };
    }
  }

  /**
   * Revoke a share link
   */
  public async revokeShareLink(
    shareId: string,
    userId: string
  ): Promise<{ success: boolean; error?: string }> {
    try {
      const shareLink = await prisma.shareLink.findUnique({
        where: { shareId },
      });

      if (!shareLink) {
        return { success: false, error: 'Share link not found' };
      }

      if (shareLink.userId !== userId) {
        return { success: false, error: 'Not authorized' };
      }

      await prisma.shareLink.delete({
        where: { id: shareLink.id },
      });

      logger.info(`Share link revoked: ${shareId}`);

      return { success: true };
    } catch (error) {
      logger.error('Revoke share link failed:', error);
      return { success: false, error: 'Failed to revoke share link' };
    }
  }

  /**
   * List all share links for a user
   */
  public async listUserShareLinks(
    userId: string
  ): Promise<{ success: boolean; shareLinks?: ShareLink[]; error?: string }> {
    try {
      const shareLinks = await prisma.shareLink.findMany({
        where: { userId },
        orderBy: { createdAt: 'desc' },
        include: {
          conversation: {
            select: { title: true },
          },
        },
      });

      return {
        success: true,
        shareLinks: shareLinks.map((sl) => ({
          id: sl.id,
          conversationId: sl.conversationId,
          shareId: sl.shareId,
          expiresAt: sl.expiresAt,
          isPublic: sl.isPublic,
          accessCount: sl.accessCount,
          createdAt: sl.createdAt,
          conversationTitle: sl.conversation.title,
        })) as ShareLink[],
      };
    } catch (error) {
      logger.error('List share links failed:', error);
      return { success: false, error: 'Failed to list share links' };
    }
  }

  /**
   * Cleanup expired share links
   */
  public async cleanupExpiredLinks(): Promise<number> {
    try {
      const result = await prisma.shareLink.deleteMany({
        where: {
          expiresAt: {
            lt: new Date(),
          },
        },
      });

      if (result.count > 0) {
        logger.info(`Cleaned up ${result.count} expired share links`);
      }

      return result.count;
    } catch (error) {
      logger.error('Cleanup expired links failed:', error);
      return 0;
    }
  }
}

// Export singleton instance
export const shareService = new ShareServiceClass();
export default shareService;
