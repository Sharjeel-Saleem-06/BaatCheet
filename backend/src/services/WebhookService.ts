/**
 * Webhook Service
 * Event-driven webhook delivery with retry logic
 * 
 * @module WebhookService
 */

import crypto from 'crypto';
import axios from 'axios';
import { v4 as uuidv4 } from 'uuid';
import { prisma } from '../config/database.js';
import { logger } from '../utils/logger.js';

// ============================================
// Types
// ============================================

export type WebhookEvent =
  | 'message.created'
  | 'message.completed'
  | 'conversation.created'
  | 'conversation.archived'
  | 'image.uploaded'
  | 'audio.transcribed'
  | 'export.generated';

export interface WebhookPayload {
  event: WebhookEvent;
  timestamp: string;
  data: Record<string, unknown>;
}

export interface WebhookConfig {
  id: string;
  url: string;
  events: string[];
  secret: string;
  isActive: boolean;
}

// ============================================
// Constants
// ============================================

const WEBHOOK_TIMEOUT = 10000; // 10 seconds
const MAX_RETRIES = 3;
const RETRY_DELAYS = [1000, 5000, 25000]; // 1s, 5s, 25s
const MAX_FAILURES_BEFORE_DISABLE = 10;

const AVAILABLE_EVENTS: WebhookEvent[] = [
  'message.created',
  'message.completed',
  'conversation.created',
  'conversation.archived',
  'image.uploaded',
  'audio.transcribed',
  'export.generated',
];

// ============================================
// Webhook Service Class
// ============================================

class WebhookServiceClass {
  /**
   * Create a new webhook
   */
  public async createWebhook(
    userId: string,
    url: string,
    events: WebhookEvent[]
  ): Promise<{ success: boolean; webhook?: WebhookConfig; error?: string }> {
    try {
      // Validate URL
      if (!this.isValidUrl(url)) {
        return { success: false, error: 'Invalid webhook URL' };
      }

      // Validate events
      const invalidEvents = events.filter((e) => !AVAILABLE_EVENTS.includes(e));
      if (invalidEvents.length > 0) {
        return { success: false, error: `Invalid events: ${invalidEvents.join(', ')}` };
      }

      // Generate secret
      const secret = crypto.randomBytes(32).toString('hex');

      const webhook = await prisma.webhook.create({
        data: {
          userId,
          url,
          events,
          secret,
        },
      });

      logger.info(`Webhook created: ${webhook.id} for user ${userId}`);

      return {
        success: true,
        webhook: {
          id: webhook.id,
          url: webhook.url,
          events: webhook.events,
          secret: webhook.secret,
          isActive: webhook.isActive,
        },
      };
    } catch (error) {
      logger.error('Create webhook error:', error);
      return { success: false, error: 'Failed to create webhook' };
    }
  }

  /**
   * Get user's webhooks
   */
  public async getUserWebhooks(userId: string): Promise<WebhookConfig[]> {
    const webhooks = await prisma.webhook.findMany({
      where: { userId },
      orderBy: { createdAt: 'desc' },
    });

    return webhooks.map((w) => ({
      id: w.id,
      url: w.url,
      events: w.events,
      secret: '••••••••', // Mask secret
      isActive: w.isActive,
    }));
  }

  /**
   * Update webhook
   */
  public async updateWebhook(
    webhookId: string,
    userId: string,
    updates: { url?: string; events?: WebhookEvent[]; isActive?: boolean }
  ): Promise<{ success: boolean; error?: string }> {
    try {
      const webhook = await prisma.webhook.findFirst({
        where: { id: webhookId, userId },
      });

      if (!webhook) {
        return { success: false, error: 'Webhook not found' };
      }

      if (updates.url && !this.isValidUrl(updates.url)) {
        return { success: false, error: 'Invalid webhook URL' };
      }

      await prisma.webhook.update({
        where: { id: webhookId },
        data: updates,
      });

      return { success: true };
    } catch (error) {
      logger.error('Update webhook error:', error);
      return { success: false, error: 'Failed to update webhook' };
    }
  }

  /**
   * Delete webhook
   */
  public async deleteWebhook(webhookId: string, userId: string): Promise<boolean> {
    try {
      const webhook = await prisma.webhook.findFirst({
        where: { id: webhookId, userId },
      });

      if (!webhook) return false;

      await prisma.webhook.delete({ where: { id: webhookId } });
      logger.info(`Webhook deleted: ${webhookId}`);
      return true;
    } catch (error) {
      logger.error('Delete webhook error:', error);
      return false;
    }
  }

  /**
   * Trigger webhooks for an event
   */
  public async triggerEvent(
    userId: string,
    event: WebhookEvent,
    data: Record<string, unknown>
  ): Promise<void> {
    try {
      // Find active webhooks subscribed to this event
      const webhooks = await prisma.webhook.findMany({
        where: {
          userId,
          isActive: true,
          events: { has: event },
        },
      });

      if (webhooks.length === 0) return;

      // Prepare payload
      const payload: WebhookPayload = {
        event,
        timestamp: new Date().toISOString(),
        data,
      };

      // Deliver to each webhook
      for (const webhook of webhooks) {
        await this.deliverWebhook(webhook.id, payload);
      }
    } catch (error) {
      logger.error('Trigger event error:', error);
    }
  }

  /**
   * Deliver webhook with retry logic
   */
  private async deliverWebhook(webhookId: string, payload: WebhookPayload): Promise<void> {
    const webhook = await prisma.webhook.findUnique({
      where: { id: webhookId },
    });

    if (!webhook || !webhook.isActive) return;

    const deliveryId = uuidv4();

    // Create delivery record
    const delivery = await prisma.webhookDelivery.create({
      data: {
        webhookId,
        event: payload.event,
        payload: JSON.parse(JSON.stringify(payload)),
        status: 'pending',
      },
    });

    // Attempt delivery
    await this.attemptDelivery(webhook, delivery.id, payload, deliveryId, 0);
  }

  /**
   * Attempt webhook delivery
   */
  private async attemptDelivery(
    webhook: { id: string; url: string; secret: string; failureCount: number },
    deliveryId: string,
    payload: WebhookPayload,
    webhookDeliveryId: string,
    attempt: number
  ): Promise<void> {
    try {
      // Sign payload
      const signature = this.signPayload(payload, webhook.secret);

      // Send request
      const response = await axios.post(webhook.url, payload, {
        timeout: WEBHOOK_TIMEOUT,
        headers: {
          'Content-Type': 'application/json',
          'X-BaatCheet-Signature': signature,
          'X-BaatCheet-Event': payload.event,
          'X-BaatCheet-Delivery-ID': webhookDeliveryId,
        },
      });

      // Success
      await prisma.webhookDelivery.update({
        where: { id: deliveryId },
        data: {
          status: 'success',
          statusCode: response.status,
          attempts: attempt + 1,
        },
      });

      // Reset failure count
      await prisma.webhook.update({
        where: { id: webhook.id },
        data: {
          failureCount: 0,
          lastTriggered: new Date(),
        },
      });

      logger.debug(`Webhook delivered: ${webhook.id} - ${payload.event}`);
    } catch (error) {
      const statusCode = axios.isAxiosError(error) ? error.response?.status : undefined;
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';

      // Update delivery record
      await prisma.webhookDelivery.update({
        where: { id: deliveryId },
        data: {
          status: attempt >= MAX_RETRIES - 1 ? 'failed' : 'pending',
          statusCode,
          response: errorMessage.substring(0, 500),
          attempts: attempt + 1,
          nextRetry: attempt < MAX_RETRIES - 1
            ? new Date(Date.now() + RETRY_DELAYS[attempt])
            : null,
        },
      });

      // Retry if attempts remaining
      if (attempt < MAX_RETRIES - 1) {
        setTimeout(
          () => this.attemptDelivery(webhook, deliveryId, payload, webhookDeliveryId, attempt + 1),
          RETRY_DELAYS[attempt]
        );
      } else {
        // Final failure - increment webhook failure count
        const newFailureCount = webhook.failureCount + 1;
        await prisma.webhook.update({
          where: { id: webhook.id },
          data: {
            failureCount: newFailureCount,
            isActive: newFailureCount < MAX_FAILURES_BEFORE_DISABLE,
            lastTriggered: new Date(),
          },
        });

        if (newFailureCount >= MAX_FAILURES_BEFORE_DISABLE) {
          logger.warn(`Webhook disabled after ${MAX_FAILURES_BEFORE_DISABLE} failures: ${webhook.id}`);
        }
      }
    }
  }

  /**
   * Sign payload with HMAC-SHA256
   */
  private signPayload(payload: WebhookPayload, secret: string): string {
    const hmac = crypto.createHmac('sha256', secret);
    hmac.update(JSON.stringify(payload));
    return `sha256=${hmac.digest('hex')}`;
  }

  /**
   * Validate URL
   */
  private isValidUrl(url: string): boolean {
    try {
      const parsed = new URL(url);
      return ['http:', 'https:'].includes(parsed.protocol);
    } catch {
      return false;
    }
  }

  /**
   * Send test webhook
   */
  public async sendTestWebhook(
    webhookId: string,
    userId: string
  ): Promise<{ success: boolean; error?: string }> {
    const webhook = await prisma.webhook.findFirst({
      where: { id: webhookId, userId },
    });

    if (!webhook) {
      return { success: false, error: 'Webhook not found' };
    }

    const testPayload: WebhookPayload = {
      event: 'message.created',
      timestamp: new Date().toISOString(),
      data: {
        test: true,
        message: 'This is a test webhook from BaatCheet',
      },
    };

    try {
      const signature = this.signPayload(testPayload, webhook.secret);

      await axios.post(webhook.url, testPayload, {
        timeout: WEBHOOK_TIMEOUT,
        headers: {
          'Content-Type': 'application/json',
          'X-BaatCheet-Signature': signature,
          'X-BaatCheet-Event': 'test',
          'X-BaatCheet-Delivery-ID': uuidv4(),
        },
      });

      return { success: true };
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      return { success: false, error: errorMessage };
    }
  }

  /**
   * Get webhook delivery history
   */
  public async getDeliveryHistory(
    webhookId: string,
    userId: string,
    limit: number = 50
  ): Promise<Array<{
    id: string;
    event: string;
    status: string;
    statusCode?: number | null;
    attempts: number;
    createdAt: Date;
  }>> {
    const webhook = await prisma.webhook.findFirst({
      where: { id: webhookId, userId },
    });

    if (!webhook) return [];

    const deliveries = await prisma.webhookDelivery.findMany({
      where: { webhookId },
      orderBy: { createdAt: 'desc' },
      take: limit,
      select: {
        id: true,
        event: true,
        status: true,
        statusCode: true,
        attempts: true,
        createdAt: true,
      },
    });

    return deliveries;
  }

  /**
   * Get available webhook events
   */
  public getAvailableEvents(): WebhookEvent[] {
    return [...AVAILABLE_EVENTS];
  }
}

// Export singleton
export const webhookService = new WebhookServiceClass();
export default webhookService;
