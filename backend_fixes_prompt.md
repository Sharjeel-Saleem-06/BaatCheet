# CURSOR PROMPT: BaatCheet Backend - Complete Validation & Fixes

You are auditing and fixing the BaatCheet backend to ensure production readiness. Review each critical system and implement missing or incomplete features.

---

## CRITICAL FIXES REQUIRED

### 1. REDIS IMPLEMENTATION VERIFICATION & FIXES

**Task:** Ensure Redis is properly integrated throughout the application

**Requirements:**
- Verify Redis connection in config/redis.config.ts
- Implement Redis cache for:
  - User sessions (TTL: 7 days)
  - Conversation context (TTL: 24 hours)
  - Project statistics (TTL: 1 hour)
  - Analytics dashboard data (TTL: 5 minutes)
  - OCR results (permanent until image deleted)
  - Audio transcriptions (permanent)
- Implement rate limiting with Redis store (express-rate-limit-redis)
- Cache invalidation logic when data changes
- Connection error handling with retry logic

**Implementation:**
```typescript
// config/redis.config.ts
import Redis from 'ioredis';

export const redis = new Redis({
  host: process.env.REDIS_HOST || 'localhost',
  port: parseInt(process.env.REDIS_PORT || '6379'),
  maxRetriesPerRequest: 3,
  retryStrategy: (times) => {
    if (times > 3) return null;
    return Math.min(times * 100, 3000);
  },
  lazyConnect: true
});

redis.on('error', (err) => {
  logger.error('Redis connection error:', err);
});

redis.on('connect', () => {
  logger.info('Redis connected successfully');
});

// Cache helper functions
export const cacheService = {
  async get(key: string) {
    const data = await redis.get(key);
    return data ? JSON.parse(data) : null;
  },
  async set(key: string, value: any, ttl?: number) {
    const serialized = JSON.stringify(value);
    if (ttl) {
      await redis.setex(key, ttl, serialized);
    } else {
      await redis.set(key, serialized);
    }
  },
  async del(key: string) {
    await redis.del(key);
  },
  async exists(key: string) {
    return await redis.exists(key);
  }
};
```

---

### 2. TOKEN COUNTING IMPLEMENTATION

**Task:** Implement accurate token counting for context management

**Requirements:**
- Install tiktoken library: `npm install tiktoken`
- Count tokens for each message before adding to context
- Track total tokens in conversation
- Prune old messages when exceeding 8000 token limit
- Different tokenizers for different models:
  - Groq/OpenRouter: cl100k_base (GPT-3.5/4 tokenizer)
  - DeepSeek: Custom tokenizer or estimate
  - Gemini: Custom tokenizer or estimate
- Log token usage for analytics

**Implementation:**
```typescript
// utils/token-counter.ts
import { encoding_for_model } from 'tiktoken';

const encoder = encoding_for_model('gpt-3.5-turbo');

export function countTokens(text: string): number {
  try {
    const tokens = encoder.encode(text);
    return tokens.length;
  } catch (error) {
    // Fallback: rough estimate (1 token ≈ 4 characters)
    return Math.ceil(text.length / 4);
  }
}

export function estimateTokensForMessages(messages: Message[]): number {
  let total = 0;
  for (const msg of messages) {
    // Format: role + content + overhead
    total += countTokens(msg.role);
    total += countTokens(msg.content);
    total += 4; // Overhead per message
  }
  return total;
}
```

**Update context-manager.service.ts:**
- Before adding message, count tokens
- If total > 8000, prune oldest messages (keep system prompt + last 20)
- Store token count in database
- Return warning if approaching limit

---

### 3. BACKGROUND JOB QUEUE SYSTEM

**Task:** Implement Bull/BullMQ for async tasks

**Requirements:**
- Install: `npm install bull @types/bull`
- Create queue for:
  - OCR processing (priority: high)
  - Audio transcription (priority: high)
  - PDF export (priority: medium)
  - Webhook delivery (priority: medium)
  - Analytics aggregation (priority: low)
- Implement retry logic (3 attempts, exponential backoff)
- Job timeout settings
- Job progress tracking
- Failed job handling

**Implementation:**
```typescript
// services/queue.service.ts
import Bull from 'bull';

// Create queues
export const ocrQueue = new Bull('ocr', process.env.REDIS_URL);
export const audioQueue = new Bull('audio', process.env.REDIS_URL);
export const webhookQueue = new Bull('webhooks', process.env.REDIS_URL);

// OCR job processor
ocrQueue.process(async (job) => {
  const { imageId, userId } = job.data;
  try {
    const result = await ocrService.processImage(imageId);
    await prisma.attachment.update({
      where: { id: imageId },
      data: { extractedText: result.text }
    });
    return result;
  } catch (error) {
    throw error; // Will retry
  }
});

// Webhook job processor
webhookQueue.process(async (job) => {
  const { webhookId, eventType, payload } = job.data;
  const webhook = await prisma.webhook.findUnique({ where: { id: webhookId } });
  
  const signature = generateHmacSignature(payload, webhook.secret);
  
  try {
    const response = await axios.post(webhook.url, payload, {
      headers: {
        'X-BaatCheet-Signature': signature,
        'X-BaatCheet-Event': eventType
      },
      timeout: 10000
    });
    
    await prisma.webhookDelivery.create({
      data: {
        webhookId,
        eventType,
        status: 'success',
        statusCode: response.status
      }
    });
  } catch (error) {
    if (job.attemptsMade < 3) {
      throw error; // Will retry
    } else {
      // Final failure
      await prisma.webhookDelivery.create({
        data: {
          webhookId,
          eventType,
          status: 'failed',
          error: error.message
        }
      });
      // Notify user of failure
    }
  }
});

// Export helper functions
export async function queueOCR(imageId: string, userId: string) {
  await ocrQueue.add({ imageId, userId }, {
    attempts: 3,
    backoff: { type: 'exponential', delay: 2000 },
    timeout: 30000
  });
}

export async function queueWebhook(webhookId: string, eventType: string, payload: any) {
  await webhookQueue.add({ webhookId, eventType, payload }, {
    attempts: 3,
    backoff: { type: 'exponential', delay: 5000 }
  });
}
```

**Update controllers to use queues:**
- Image upload → queue OCR instead of sync processing
- Audio upload → queue transcription
- Conversation created → queue webhook delivery

---

### 4. FILE STORAGE CONFIGURATION

**Task:** Implement proper file storage with Cloudinary or S3

**Requirements:**
- Choose storage: Cloudinary (recommended for easy start) or AWS S3
- Configure upload with Multer
- Store files with unique names
- Generate public URLs
- Implement file deletion when attachments deleted
- Handle large files (up to 25MB for audio)
- Image optimization (compress, resize)

**Implementation (Cloudinary):**
```typescript
// config/cloudinary.config.ts
import { v2 as cloudinary } from 'cloudinary';
import multer from 'multer';
import { CloudinaryStorage } from 'multer-storage-cloudinary';

cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET
});

const imageStorage = new CloudinaryStorage({
  cloudinary,
  params: {
    folder: 'baatcheet/images',
    allowed_formats: ['jpg', 'png', 'webp', 'pdf'],
    transformation: [{ width: 1920, height: 1920, crop: 'limit' }]
  }
});

const audioStorage = new CloudinaryStorage({
  cloudinary,
  params: {
    folder: 'baatcheet/audio',
    resource_type: 'raw',
    allowed_formats: ['mp3', 'wav', 'ogg', 'webm']
  }
});

export const uploadImage = multer({
  storage: imageStorage,
  limits: { fileSize: 10 * 1024 * 1024 } // 10MB
});

export const uploadAudio = multer({
  storage: audioStorage,
  limits: { fileSize: 25 * 1024 * 1024 } // 25MB
});

export async function deleteFile(publicId: string) {
  await cloudinary.uploader.destroy(publicId);
}
```

**Update routes:**
- Use uploadImage.single('file') middleware
- Store file.path in database (Cloudinary URL)
- Delete from Cloudinary when attachment deleted

---

### 5. ERROR TRACKING WITH SENTRY

**Task:** Implement Sentry for error monitoring

**Requirements:**
- Install: `npm install @sentry/node @sentry/tracing`
- Configure Sentry in server.ts
- Capture exceptions automatically
- Add context (userId, requestId)
- Track performance
- Set up error alerts

**Implementation:**
```typescript
// server.ts
import * as Sentry from '@sentry/node';
import * as Tracing from '@sentry/tracing';

Sentry.init({
  dsn: process.env.SENTRY_DSN,
  environment: process.env.NODE_ENV,
  integrations: [
    new Sentry.Integrations.Http({ tracing: true }),
    new Tracing.Integrations.Express({ app })
  ],
  tracesSampleRate: 0.1
});

// Request handler (must be first middleware)
app.use(Sentry.Handlers.requestHandler());
app.use(Sentry.Handlers.tracingHandler());

// Routes...

// Error handler (must be last middleware)
app.use(Sentry.Handlers.errorHandler());

// Custom error handler
app.use((err, req, res, next) => {
  Sentry.captureException(err, {
    user: { id: req.userId },
    extra: { requestId: req.requestId }
  });
  
  res.status(500).json({
    error: 'Internal server error',
    requestId: req.requestId
  });
});
```

---

### 6. GRACEFUL SHUTDOWN

**Task:** Handle SIGTERM/SIGINT for clean shutdown

**Implementation:**
```typescript
// server.ts
let server: Server;

async function gracefulShutdown(signal: string) {
  logger.info(`${signal} received, starting graceful shutdown`);
  
  // Stop accepting new requests
  server.close(() => {
    logger.info('HTTP server closed');
  });
  
  // Set timeout for forced shutdown
  const forceShutdownTimeout = setTimeout(() => {
    logger.error('Forced shutdown after timeout');
    process.exit(1);
  }, 30000); // 30 seconds
  
  try {
    // Close database connections
    await prisma.$disconnect();
    logger.info('Database disconnected');
    
    // Close Redis connection
    await redis.quit();
    logger.info('Redis disconnected');
    
    // Wait for pending jobs to complete
    await ocrQueue.close();
    await webhookQueue.close();
    logger.info('Job queues closed');
    
    clearTimeout(forceShutdownTimeout);
    logger.info('Graceful shutdown completed');
    process.exit(0);
  } catch (error) {
    logger.error('Error during shutdown:', error);
    process.exit(1);
  }
}

process.on('SIGTERM', () => gracefulShutdown('SIGTERM'));
process.on('SIGINT', () => gracefulShutdown('SIGINT'));

server = app.listen(PORT, () => {
  logger.info(`Server running on port ${PORT}`);
});
```

---

### 7. REQUEST ID TRACKING

**Task:** Add unique ID to each request for tracing

**Implementation:**
```typescript
// middleware/request-id.middleware.ts
import { v4 as uuidv4 } from 'uuid';

export function requestIdMiddleware(req, res, next) {
  const requestId = req.headers['x-request-id'] || uuidv4();
  req.requestId = requestId;
  res.setHeader('X-Request-ID', requestId);
  next();
}

// Update logger to include requestId
logger.info('Request received', {
  requestId: req.requestId,
  method: req.method,
  path: req.path,
  userId: req.userId
});
```

---

### 8. HEALTH CHECK ENHANCEMENTS

**Task:** Improve health check with actual service checks

**Implementation:**
```typescript
// routes/health.routes.ts
export async function healthCheck(req, res) {
  const checks = {
    timestamp: new Date().toISOString(),
    status: 'healthy',
    uptime: process.uptime(),
    version: process.env.npm_package_version,
    services: {}
  };
  
  // Check database
  try {
    await prisma.$queryRaw`SELECT 1`;
    const start = Date.now();
    await prisma.$queryRaw`SELECT 1`;
    const latency = Date.now() - start;
    checks.services.database = { status: 'connected', latency };
  } catch (error) {
    checks.services.database = { status: 'disconnected', error: error.message };
    checks.status = 'unhealthy';
  }
  
  // Check Redis
  try {
    const start = Date.now();
    await redis.ping();
    const latency = Date.now() - start;
    checks.services.redis = { status: 'connected', latency };
  } catch (error) {
    checks.services.redis = { status: 'disconnected', error: error.message };
    checks.status = 'unhealthy';
  }
  
  // Check AI providers (sample one key each)
  checks.services.groq = await checkProvider('groq', process.env.GROQ_API_KEY_1);
  checks.services.openrouter = await checkProvider('openrouter', process.env.OPENROUTER_API_KEY_1);
  
  res.status(checks.status === 'healthy' ? 200 : 503).json(checks);
}

async function checkProvider(name: string, apiKey: string) {
  try {
    // Make lightweight test request
    // Return { status: 'available', latency }
  } catch (error) {
    return { status: 'unavailable', error: error.message };
  }
}
```

---

### 9. RATE LIMITING WITH REDIS

**Task:** Implement proper rate limiting with Redis store

**Implementation:**
```typescript
// middleware/rate-limiter.middleware.ts
import rateLimit from 'express-rate-limit';
import RedisStore from 'rate-limit-redis';
import { redis } from '../config/redis.config';

export const globalRateLimiter = rateLimit({
  store: new RedisStore({
    client: redis,
    prefix: 'rl:global:'
  }),
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 1000, // 1000 requests per window
  standardHeaders: true,
  legacyHeaders: false,
  handler: (req, res) => {
    res.status(429).json({
      error: 'Too many requests',
      retryAfter: res.getHeader('Retry-After')
    });
  }
});

export const chatRateLimiter = rateLimit({
  store: new RedisStore({
    client: redis,
    prefix: 'rl:chat:'
  }),
  windowMs: 60 * 60 * 1000, // 1 hour
  max: async (req) => {
    // Tiered limits based on user tier
    const user = await prisma.user.findUnique({ where: { id: req.userId } });
    return user.tier === 'free' ? 100 : user.tier === 'pro' ? 1000 : 10000;
  },
  keyGenerator: (req) => req.userId,
  standardHeaders: true
});

export const imageUploadRateLimiter = rateLimit({
  store: new RedisStore({ client: redis, prefix: 'rl:image:' }),
  windowMs: 60 * 60 * 1000,
  max: 50,
  keyGenerator: (req) => req.userId
});
```

---

### 10. CONTEXT PRUNING ALGORITHM

**Task:** Implement smart context management

**Implementation:**
```typescript
// services/context-manager.service.ts
export async function getContextForAI(conversationId: string, maxTokens = 8000): Promise<Message[]> {
  // Get all messages from database
  const conversation = await prisma.conversation.findUnique({
    where: { id: conversationId },
    include: { messages: { orderBy: { createdAt: 'asc' } } }
  });
  
  const messages = conversation.messages;
  const systemPrompt = conversation.systemPrompt || DEFAULT_SYSTEM_PROMPT;
  
  // Start with system prompt
  const context: Message[] = [{ role: 'system', content: systemPrompt }];
  let totalTokens = countTokens(systemPrompt);
  
  // Always include last 10 messages if possible
  const recentMessages = messages.slice(-10);
  const olderMessages = messages.slice(0, -10);
  
  // Add recent messages
  for (let i = recentMessages.length - 1; i >= 0; i--) {
    const msg = recentMessages[i];
    const tokens = countTokens(msg.content);
    
    if (totalTokens + tokens <= maxTokens) {
      context.unshift({ role: msg.role, content: msg.content });
      totalTokens += tokens;
    } else {
      break;
    }
  }
  
  // If space remains, add older messages
  for (let i = olderMessages.length - 1; i >= 0; i--) {
    const msg = olderMessages[i];
    const tokens = countTokens(msg.content);
    
    if (totalTokens + tokens <= maxTokens) {
      context.splice(1, 0, { role: msg.role, content: msg.content });
      totalTokens += tokens;
    } else {
      break;
    }
  }
  
  // Log context stats
  logger.info('Context prepared', {
    conversationId,
    messagesIncluded: context.length,
    totalMessages: messages.length,
    totalTokens
  });
  
  return context;
}
```

---

### 11. API KEY ROTATION TRACKING

**Task:** Implement and verify key rotation logic

**Implementation:**
```typescript
// services/ai-router.service.ts
class GroqKeyManager {
  private keys: string[];
  private currentIndex = 0;
  private usageCounts: Map<string, number> = new Map();
  private lastReset: Date = new Date();
  private readonly DAILY_LIMIT = 14400;
  
  constructor() {
    this.keys = [
      process.env.GROQ_API_KEY_1,
      process.env.GROQ_API_KEY_2,
      // ... all 14 keys
    ].filter(Boolean);
    
    // Initialize usage counters
    this.keys.forEach(key => this.usageCounts.set(key, 0));
    
    // Reset counters daily
    setInterval(() => this.resetDailyLimits(), 24 * 60 * 60 * 1000);
  }
  
  getNextAvailableKey(): string | null {
    // Check if need to reset (new day)
    const now = new Date();
    if (now.getDate() !== this.lastReset.getDate()) {
      this.resetDailyLimits();
    }
    
    // Try all keys starting from current index
    for (let i = 0; i < this.keys.length; i++) {
      const keyIndex = (this.currentIndex + i) % this.keys.length;
      const key = this.keys[keyIndex];
      const usage = this.usageCounts.get(key) || 0;
      
      if (usage < this.DAILY_LIMIT) {
        this.currentIndex = (keyIndex + 1) % this.keys.length;
        this.usageCounts.set(key, usage + 1);
        
        logger.debug('Groq key selected', { keyIndex, usage: usage + 1 });
        return key;
      }
    }
    
    logger.warn('All Groq keys exhausted');
    return null;
  }
  
  resetDailyLimits() {
    this.keys.forEach(key => this.usageCounts.set(key, 0));
    this.lastReset = new Date();
    logger.info('Groq key limits reset');
  }
}

export const groqKeyManager = new GroqKeyManager();
```

---

### 12. TESTING SETUP

**Task:** Add comprehensive test suite

**Requirements:**
- Install Jest: `npm install --save-dev jest @types/jest ts-jest`
- Create test files for each service
- Mock external APIs
- Test error scenarios
- Achieve 80%+ coverage

**Implementation:**
```typescript
// tests/services/ai-router.test.ts
import { groqKeyManager } from '../services/ai-router.service';

describe('GroqKeyManager', () => {
  test('should rotate through keys', () => {
    const key1 = groqKeyManager.getNextAvailableKey();
    const key2 = groqKeyManager.getNextAvailableKey();
    expect(key1).not.toBe(key2);
  });
  
  test('should track usage', () => {
    // Make 14,400 requests with one key
    // Verify it switches to next key
  });
  
  test('should reset daily', () => {
    // Test reset logic
  });
});

// tests/integration/chat-flow.test.ts
describe('Complete Chat Flow', () => {
  test('should send message and get response', async () => {
    const response = await request(app)
      .post('/api/v1/chat/completions')
      .set('Authorization', `Bearer ${testToken}`)
      .send({ message: 'Hello', conversationId: null, stream: false })
      .expect(200);
    
    expect(response.body).toHaveProperty('message');
    expect(response.body).toHaveProperty('conversationId');
  });
});
```

---

## VALIDATION CHECKLIST

After implementing fixes, verify:

### Environment
- [ ] Redis is running: `redis-cli ping` returns PONG
- [ ] PostgreSQL is accessible
- [ ] All environment variables set
- [ ] Clerk webhook configured
- [ ] Cloudinary/S3 configured

### Code Quality
- [ ] TypeScript compiles without errors
- [ ] ESLint passes with no errors
- [ ] All imports resolve correctly
- [ ] No console.log in production code
- [ ] Proper error handling everywhere

### Services
- [ ] Redis cache working (test set/get)
- [ ] Token counting accurate
- [ ] Background jobs processing
- [ ] File upload to cloud storage working
- [ ] Sentry capturing errors
- [ ] Graceful shutdown working
- [ ] Request IDs in logs
- [ ] Health checks return accurate status
- [ ] Rate limiting enforced
- [ ] Context pruning working
- [ ] API key rotation functioning

### Testing
- [ ] Unit tests pass
- [ ] Integration tests pass
- [ ] Load tests pass (50+ concurrent users)
- [ ] Security tests pass
- [ ] All critical paths tested

---

## SUCCESS CRITERIA

Backend is production-ready when:
- ✅ All critical fixes implemented
- ✅ All tests passing
- ✅ No TypeScript errors
- ✅ No console.log statements
- ✅ Error tracking operational
- ✅ Load tested successfully
- ✅ Security audit clean
- ✅ Documentation updated

Only then proceed to mobile app development.

---

## ADDITIONAL ENHANCEMENTS (Optional)

If time permits, add:
1. Prometheus metrics endpoint
2. OpenTelemetry tracing
3. Database query optimization (explain analyze)
4. Caching aggressive optimization
5. Horizontal scaling preparation (session store in Redis)
6. Blue-green deployment support
7. Feature flags system
8. A/B testing infrastructure

---

Implement all critical fixes first, then run complete testing plan. Document any issues found and resolve before moving forward.