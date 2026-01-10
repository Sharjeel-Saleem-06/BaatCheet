/**
 * Queue Service
 * Background job processing for async tasks using Bull
 * 
 * @module QueueService
 */

import Queue, { Job, JobOptions } from 'bull';
import { logger } from '../utils/logger.js';
import { config } from '../config/index.js';
import { prisma } from '../config/database.js';
import axios from 'axios';
import crypto from 'crypto';

// ============================================
// Queue Configuration
// ============================================

const redisConfig = {
  redis: config.redis.url || 'redis://localhost:6379',
};

const defaultJobOptions: JobOptions = {
  attempts: 3,
  backoff: {
    type: 'exponential',
    delay: 2000,
  },
  removeOnComplete: 100, // Keep last 100 completed jobs
  removeOnFail: 500, // Keep last 500 failed jobs
};

// ============================================
// Queue Definitions
// ============================================

// OCR Processing Queue
export const ocrQueue = new Queue('ocr', redisConfig);

// Audio Transcription Queue
export const audioQueue = new Queue('audio', redisConfig);

// Export Generation Queue
export const exportQueue = new Queue('export', redisConfig);

// Webhook Delivery Queue
export const webhookQueue = new Queue('webhook', redisConfig);

// Analytics Aggregation Queue
export const analyticsQueue = new Queue('analytics', redisConfig);

// ============================================
// Job Types
// ============================================

interface OCRJobData {
  attachmentId: string;
  imageUrl: string;
  conversationId: string;
  language?: string;
}

interface AudioJobData {
  audioId: string;
  audioUrl: string;
  userId: string;
  conversationId?: string;
}

interface ExportJobData {
  conversationId: string;
  format: 'pdf' | 'txt' | 'json' | 'md';
  userId: string;
}

interface WebhookJobData {
  webhookId: string;
  event: string;
  payload: Record<string, unknown>;
  deliveryId?: string;
}

interface AnalyticsJobData {
  userId: string;
  action: string;
  metadata?: Record<string, unknown>;
}

// ============================================
// OCR Queue Processor
// ============================================

ocrQueue.process(async (job: Job<OCRJobData>) => {
  const { attachmentId, imageUrl, conversationId, language } = job.data;
  
  logger.info(`Processing OCR job ${job.id} for attachment ${attachmentId}`);
  
  try {
    // Import OCR service dynamically to avoid circular dependency
    const { ocrService } = await import('./OCRService.js');
    
    // Perform OCR
    const result = await ocrService.extractText(imageUrl, language);
    
    // Update attachment in database
    await prisma.attachment.update({
      where: { id: attachmentId },
      data: { 
        extractedText: result.text,
        metadata: {
          ocrConfidence: result.confidence,
          ocrLanguage: result.language || 'unknown',
          processedAt: new Date().toISOString(),
        },
      },
    });
    
    // Trigger webhook if configured
    await triggerWebhooks(conversationId, 'image.ocr_completed', {
      attachmentId,
      conversationId,
      extractedText: result.text.substring(0, 500), // Limit for webhook
    });
    
    logger.info(`OCR job ${job.id} completed successfully`);
    return { success: true, text: result.text };
  } catch (error) {
    logger.error(`OCR job ${job.id} failed:`, error);
    throw error;
  }
});

// ============================================
// Audio Queue Processor
// ============================================

audioQueue.process(async (job: Job<AudioJobData>) => {
  const { audioId, audioUrl, userId, conversationId } = job.data;
  
  logger.info(`Processing audio transcription job ${job.id} for audio ${audioId}`);
  
  try {
    // Import audio service dynamically
    const { audioService } = await import('./AudioService.js');
    
    // Perform transcription
    const result = await audioService.transcribe(audioUrl);
    
    // Update audio record in database
    await prisma.audio.update({
      where: { id: audioId },
      data: {
        transcription: result.text || '',
        detectedLanguage: result.language || 'unknown',
        confidence: result.confidence || 0,
        transcriptionModel: 'whisper-1',
      },
    });
    
    // Trigger webhook
    if (conversationId && result.text) {
      await triggerWebhooks(userId, 'audio.transcribed', {
        audioId,
        conversationId,
        transcription: result.text.substring(0, 500),
      });
    }
    
    logger.info(`Audio transcription job ${job.id} completed`);
    return { success: true, transcription: result.text };
  } catch (error) {
    logger.error(`Audio transcription job ${job.id} failed:`, error);
    throw error;
  }
});

// ============================================
// Export Queue Processor
// ============================================

exportQueue.process(async (job: Job<ExportJobData>) => {
  const { conversationId, format, userId } = job.data;
  
  logger.info(`Processing export job ${job.id} for conversation ${conversationId}`);
  
  try {
    // Import export service dynamically
    const { exportService } = await import('./ExportService.js');
    
    // Generate export
    const result = await exportService.export(conversationId, userId, format);
    
    // Update analytics
    await prisma.analytics.upsert({
      where: {
        userId_date: {
          userId,
          date: new Date(new Date().toISOString().split('T')[0]),
        },
      },
      update: {
        exportsGenerated: { increment: 1 },
      },
      create: {
        userId,
        date: new Date(new Date().toISOString().split('T')[0]),
        exportsGenerated: 1,
      },
    });
    
    logger.info(`Export job ${job.id} completed`);
    return { success: true, filename: result.filename };
  } catch (error) {
    logger.error(`Export job ${job.id} failed:`, error);
    throw error;
  }
});

// ============================================
// Webhook Queue Processor
// ============================================

webhookQueue.process(async (job: Job<WebhookJobData>) => {
  const { webhookId, event, payload, deliveryId } = job.data;
  
  logger.info(`Processing webhook delivery ${job.id} for webhook ${webhookId}`);
  
  try {
    const webhook = await prisma.webhook.findUnique({
      where: { id: webhookId },
    });
    
    if (!webhook || !webhook.isActive) {
      logger.warn(`Webhook ${webhookId} not found or inactive`);
      return { success: false, reason: 'Webhook not found or inactive' };
    }
    
    // Generate HMAC signature
    const signature = generateHMAC(JSON.stringify(payload), webhook.secret);
    
    // Send webhook
    const response = await axios.post(webhook.url, payload, {
      headers: {
        'Content-Type': 'application/json',
        'X-BaatCheet-Signature': signature,
        'X-BaatCheet-Event': event,
        'X-BaatCheet-Delivery-ID': deliveryId || job.id?.toString() || 'unknown',
        'X-BaatCheet-Timestamp': Date.now().toString(),
      },
      timeout: 10000, // 10 second timeout
    });
    
    // Log successful delivery
    await prisma.webhookDelivery.upsert({
      where: { id: deliveryId || 'temp-' + job.id },
      update: {
        status: 'success',
        statusCode: response.status,
        response: JSON.stringify(response.data).substring(0, 1000),
        attempts: job.attemptsMade + 1,
      },
      create: {
        id: deliveryId,
        webhookId,
        event,
        payload: payload as any,
        status: 'success',
        statusCode: response.status,
        response: JSON.stringify(response.data).substring(0, 1000),
        attempts: job.attemptsMade + 1,
      },
    });
    
    // Reset failure count
    await prisma.webhook.update({
      where: { id: webhookId },
      data: {
        failureCount: 0,
        lastTriggered: new Date(),
      },
    });
    
    logger.info(`Webhook delivery ${job.id} successful`);
    return { success: true };
  } catch (error: any) {
    logger.error(`Webhook delivery ${job.id} failed:`, error.message);
    
    // Log failed delivery
    await prisma.webhookDelivery.upsert({
      where: { id: deliveryId || 'temp-' + job.id },
      update: {
        status: 'failed',
        statusCode: error.response?.status || 0,
        response: error.message,
        attempts: job.attemptsMade + 1,
        nextRetry: job.attemptsMade < 2 ? new Date(Date.now() + Math.pow(2, job.attemptsMade + 1) * 2000) : null,
      },
      create: {
        id: deliveryId,
        webhookId,
        event,
        payload: payload as any,
        status: 'failed',
        statusCode: error.response?.status || 0,
        response: error.message,
        attempts: job.attemptsMade + 1,
        nextRetry: job.attemptsMade < 2 ? new Date(Date.now() + Math.pow(2, job.attemptsMade + 1) * 2000) : null,
      },
    });
    
    // Increment failure count
    const updated = await prisma.webhook.update({
      where: { id: webhookId },
      data: {
        failureCount: { increment: 1 },
      },
    });
    
    // Disable webhook after 10 consecutive failures
    if (updated.failureCount >= 10) {
      await prisma.webhook.update({
        where: { id: webhookId },
        data: { isActive: false },
      });
      logger.warn(`Webhook ${webhookId} disabled after 10 consecutive failures`);
    }
    
    throw error;
  }
});

// ============================================
// Analytics Queue Processor
// ============================================

analyticsQueue.process(async (job: Job<AnalyticsJobData>) => {
  const { userId, action, metadata } = job.data;
  
  try {
    const today = new Date(new Date().toISOString().split('T')[0]);
    
    const updateData: Record<string, any> = {};
    
    switch (action) {
      case 'message_sent':
        updateData.messagesCount = { increment: 1 };
        break;
      case 'response_received':
        updateData.responsesCount = { increment: 1 };
        if (metadata?.responseTime) {
          // Update average response time
          const current = await prisma.analytics.findUnique({
            where: { userId_date: { userId, date: today } },
          });
          const currentAvg = current?.averageResponseTime || 0;
          const currentCount = current?.responsesCount || 0;
          const newAvg = (currentAvg * currentCount + (metadata.responseTime as number)) / (currentCount + 1);
          updateData.averageResponseTime = newAvg;
        }
        break;
      case 'conversation_created':
        updateData.conversationsCreated = { increment: 1 };
        break;
      case 'project_created':
        updateData.projectsCreated = { increment: 1 };
        break;
      case 'image_uploaded':
        updateData.imagesUploaded = { increment: 1 };
        break;
      case 'search_performed':
        updateData.searchesPerformed = { increment: 1 };
        break;
    }
    
    await prisma.analytics.upsert({
      where: { userId_date: { userId, date: today } },
      update: updateData,
      create: {
        userId,
        date: today,
        ...Object.fromEntries(
          Object.entries(updateData).map(([k, v]) => [k, typeof v === 'object' ? 1 : v])
        ),
      },
    });
    
    return { success: true };
  } catch (error) {
    logger.error(`Analytics job failed:`, error);
    throw error;
  }
});

// ============================================
// Helper Functions
// ============================================

function generateHMAC(payload: string, secret: string): string {
  return crypto
    .createHmac('sha256', secret)
    .update(payload)
    .digest('hex');
}

async function triggerWebhooks(
  userIdOrConversationId: string,
  event: string,
  payload: Record<string, unknown>
): Promise<void> {
  try {
    // Find user ID from conversation if needed
    let userId = userIdOrConversationId;
    
    if (event.startsWith('image.') || event.startsWith('conversation.')) {
      const conversation = await prisma.conversation.findUnique({
        where: { id: userIdOrConversationId },
        select: { userId: true },
      });
      if (conversation) {
        userId = conversation.userId;
      }
    }
    
    // Find active webhooks for this user and event
    const webhooks = await prisma.webhook.findMany({
      where: {
        userId,
        isActive: true,
        events: { has: event },
      },
    });
    
    // Queue webhook deliveries
    for (const webhook of webhooks) {
      const deliveryId = crypto.randomUUID();
      
      await webhookQueue.add(
        {
          webhookId: webhook.id,
          event,
          payload: {
            ...payload,
            event,
            timestamp: new Date().toISOString(),
          },
          deliveryId,
        },
        defaultJobOptions
      );
    }
  } catch (error) {
    logger.error('Error triggering webhooks:', error);
  }
}

// ============================================
// Queue Service Class
// ============================================

class QueueService {
  /**
   * Add OCR job to queue
   */
  async addOCRJob(data: OCRJobData): Promise<Job<OCRJobData>> {
    return ocrQueue.add(data, {
      ...defaultJobOptions,
      priority: 1, // High priority
    });
  }

  /**
   * Add audio transcription job to queue
   */
  async addAudioJob(data: AudioJobData): Promise<Job<AudioJobData>> {
    return audioQueue.add(data, {
      ...defaultJobOptions,
      priority: 1,
      timeout: 300000, // 5 minute timeout for audio
    });
  }

  /**
   * Add export job to queue
   */
  async addExportJob(data: ExportJobData): Promise<Job<ExportJobData>> {
    return exportQueue.add(data, {
      ...defaultJobOptions,
      priority: 2, // Medium priority
    });
  }

  /**
   * Add webhook delivery job to queue
   */
  async addWebhookJob(data: WebhookJobData): Promise<Job<WebhookJobData>> {
    return webhookQueue.add(data, {
      ...defaultJobOptions,
      priority: 2,
    });
  }

  /**
   * Track analytics event
   */
  async trackAnalytics(data: AnalyticsJobData): Promise<Job<AnalyticsJobData>> {
    return analyticsQueue.add(data, {
      ...defaultJobOptions,
      priority: 3, // Low priority
      attempts: 1, // Don't retry analytics
    });
  }

  /**
   * Get queue statistics
   */
  async getStats(): Promise<{
    ocr: { waiting: number; active: number; completed: number; failed: number };
    audio: { waiting: number; active: number; completed: number; failed: number };
    export: { waiting: number; active: number; completed: number; failed: number };
    webhook: { waiting: number; active: number; completed: number; failed: number };
    analytics: { waiting: number; active: number; completed: number; failed: number };
  }> {
    const getQueueStats = async (queue: Queue.Queue) => ({
      waiting: await queue.getWaitingCount(),
      active: await queue.getActiveCount(),
      completed: await queue.getCompletedCount(),
      failed: await queue.getFailedCount(),
    });

    return {
      ocr: await getQueueStats(ocrQueue),
      audio: await getQueueStats(audioQueue),
      export: await getQueueStats(exportQueue),
      webhook: await getQueueStats(webhookQueue),
      analytics: await getQueueStats(analyticsQueue),
    };
  }

  /**
   * Get job status
   */
  async getJobStatus(queueName: string, jobId: string): Promise<{
    status: string;
    progress: number;
    data: unknown;
    error?: string;
  } | null> {
    const queues: Record<string, Queue.Queue> = {
      ocr: ocrQueue,
      audio: audioQueue,
      export: exportQueue,
      webhook: webhookQueue,
      analytics: analyticsQueue,
    };

    const queue = queues[queueName];
    if (!queue) return null;

    const job = await queue.getJob(jobId);
    if (!job) return null;

    const state = await job.getState();
    
    return {
      status: state,
      progress: job.progress() as number,
      data: job.data,
      error: job.failedReason,
    };
  }

  /**
   * Clean old jobs
   */
  async cleanOldJobs(olderThanMs: number = 24 * 60 * 60 * 1000): Promise<void> {
    const queues = [ocrQueue, audioQueue, exportQueue, webhookQueue, analyticsQueue];
    
    for (const queue of queues) {
      await queue.clean(olderThanMs, 'completed');
      await queue.clean(olderThanMs * 7, 'failed'); // Keep failed jobs longer
    }
    
    logger.info('Cleaned old jobs from all queues');
  }

  /**
   * Graceful shutdown
   */
  async shutdown(): Promise<void> {
    logger.info('Shutting down queue service...');
    
    await Promise.all([
      ocrQueue.close(),
      audioQueue.close(),
      exportQueue.close(),
      webhookQueue.close(),
      analyticsQueue.close(),
    ]);
    
    logger.info('Queue service shut down complete');
  }
}

// Export singleton
export const queueService = new QueueService();

// Export queues for direct access if needed
export { triggerWebhooks };
