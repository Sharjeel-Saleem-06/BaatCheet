import { Response } from 'express';
import { logger } from '../utils/logger.js';
import { StreamChunk } from '../types/index.js';

// ============================================
// Streaming Service
// Handles Server-Sent Events for real-time responses
// ============================================

class StreamingService {
  private readonly HEARTBEAT_INTERVAL = 30000; // 30 seconds
  private activeConnections: Map<string, NodeJS.Timeout> = new Map();

  /**
   * Initialize SSE connection with proper headers
   */
  public initializeSSE(res: Response, connectionId: string): void {
    // Set SSE headers
    res.setHeader('Content-Type', 'text/event-stream');
    res.setHeader('Cache-Control', 'no-cache');
    res.setHeader('Connection', 'keep-alive');
    res.setHeader('X-Accel-Buffering', 'no'); // Disable nginx buffering
    res.setHeader('Access-Control-Allow-Origin', '*');

    // Flush headers
    res.flushHeaders();

    // Start heartbeat
    const heartbeat = setInterval(() => {
      this.sendHeartbeat(res);
    }, this.HEARTBEAT_INTERVAL);

    this.activeConnections.set(connectionId, heartbeat);

    // Handle client disconnect
    res.on('close', () => {
      this.cleanup(connectionId);
      logger.debug(`SSE connection closed: ${connectionId}`);
    });

    logger.debug(`SSE connection established: ${connectionId}`);
  }

  /**
   * Send a chunk to the client
   */
  public sendChunk(res: Response, chunk: StreamChunk): void {
    try {
      const data = JSON.stringify(chunk);
      res.write(`data: ${data}\n\n`);
    } catch (error) {
      logger.warn('Error sending SSE chunk:', error);
    }
  }

  /**
   * Send start event with conversation ID
   */
  public sendStart(res: Response, conversationId: string): void {
    this.sendChunk(res, {
      type: 'start',
      conversationId,
    });
  }

  /**
   * Send content chunk
   */
  public sendContent(res: Response, content: string): void {
    this.sendChunk(res, {
      type: 'content',
      content,
    });
  }

  /**
   * Send error event
   */
  public sendError(res: Response, error: string): void {
    this.sendChunk(res, {
      type: 'error',
      error,
    });
  }

  /**
   * Send done event and close connection
   */
  public sendDone(res: Response, connectionId: string, messageId?: string): void {
    this.sendChunk(res, {
      type: 'done',
      messageId,
    });

    this.cleanup(connectionId);
    res.end();
  }

  /**
   * Send heartbeat to keep connection alive
   */
  private sendHeartbeat(res: Response): void {
    try {
      res.write(': heartbeat\n\n');
    } catch {
      // Connection may be closed
    }
  }

  /**
   * Cleanup connection resources
   */
  private cleanup(connectionId: string): void {
    const heartbeat = this.activeConnections.get(connectionId);
    if (heartbeat) {
      clearInterval(heartbeat);
      this.activeConnections.delete(connectionId);
    }
  }

  /**
   * Get number of active connections
   */
  public getActiveConnectionCount(): number {
    return this.activeConnections.size;
  }
}

// Export singleton instance
export const streamingService = new StreamingService();
export default streamingService;
