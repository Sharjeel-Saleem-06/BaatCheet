# 🔧 BaatCheet Backend - Critical Fixes & Optimizations

## Context
The BaatCheet backend is functionally complete but has critical issues that need immediate fixing before production deployment or frontend development. These fixes address performance, security, scalability, and reliability concerns.

---

## 🎯 CRITICAL FIX #1: Context Management & Token Counting

**Problem:** No context management service implemented. Messages stored in PostgreSQL but no intelligent context pruning, token counting, or Redis caching for fast retrieval.

**Fix Required:**

Create `src/services/context-manager.service.ts`:

```typescript
interface ContextConfig {
  maxTokens: number; // 8000 default
  maxMessages: number; // 50 default
  systemPromptTokens: number;
}

class ContextManagerService {
  /**
   * Get optimized context for AI request
   * - Fetches messages from database
   * - Counts tokens per message
   * - Prunes old messages if exceeds maxTokens
   * - Always keeps system prompt
   * - Caches in Redis for 1 hour
   */
  async getContext(conversationId: string, config: ContextConfig): Promise<Message[]>
  
  /**
   * Count tokens in text using tiktoken
   * - Use cl100k_base encoding (GPT-4/GPT-3.5)
   * - Cache token counts in message records
   */
  countTokens(text: string): number
  
  /**
   * Prune context intelligently
   * - Keep system prompt
   * - Keep last 20 messages
   * - Summarize older messages if needed
   * - Return pruned context under maxTokens
   */
  private pruneContext(messages: Message[], maxTokens: number): Message[]
  
  /**
   * Cache context in Redis
   * - Key: `context:${conversationId}`
   * - TTL: 1 hour
   * - Store as JSON
   */
  private async cacheContext(conversationId: string, context: Message[]): Promise<void>
}
```

**Implementation Steps:**
1. Install tiktoken: `npm install tiktoken`
2. Create context manager service with above methods
3. Update chat controller to use context manager before AI calls
4. Add token count field to Message model in Prisma schema
5. Update message creation to calculate and store token count
6. Add Redis caching with 1-hour TTL
7. Write unit tests for token counting accuracy
8. Test context pruning with 100-message conversation

**Success Criteria:**
- Context retrieval < 50ms (from Redis cache)
- Token counting accurate within 5%
- Context stays under 8000 tokens
- System prompt always included
- Old messages summarized, not lost

---

## 🎯 CRITICAL FIX #2: Background Job Queue

**Problem:** No job queue for async tasks. OCR, audio transcription, PDF exports, and webhooks should run in background to avoid blocking API responses.

**Fix Required:**

Install and configure Bull queue:

```bash
npm install bull @types/bull
```

Create `src/services/queue.service.ts`:

```typescript
import Queue from 'bull';

// Define job queues
const ocrQueue = new Queue('ocr', process.env.REDIS_URL);
const audioQueue = new Queue('audio', process.env.REDIS_URL);
const exportQueue = new Queue('export', process.env.REDIS_URL);
const webhookQueue = new Queue('webhook', process.env.REDIS_URL);

// OCR Job Processor
ocrQueue.process(async (job) => {
  const { imageUrl, conversationId, messageId } = job.data;
  
  try {
    // Perform OCR
    const extractedText = await ocrService.extractText(imageUrl);
    
    // Update attachment in database
    await prisma.attachment.update({
      where: { id: job.data.attachmentId },
      data: { extractedText }
    });
    
    // Trigger webhook if configured
    await triggerWebhook('image.ocr_completed', { conversationId, extractedText });
    
    return { success: true, text: extractedText };
  } catch (error) {
    // Retry logic handled by Bull (3 attempts)
    throw error;
  }
});

// Audio Transcription Processor
audioQueue.process(async (job) => {
  const { audioUrl, audioId } = job.data;
  
  try {
    const transcription = await audioService.transcribe(audioUrl);
    
    await prisma.audio.update({
      where: { id: audioId },
      data: { 
        transcriptionText: transcription.text,
        detectedLanguage: transcription.language,
        confidence: transcription.confidence
      }
    });
    
    return { success: true, transcription };
  } catch (error) {
    throw error;
  }
});

// Export Job Processor
exportQueue.process(async (job) => {
  const { conversationId, format, userId } = job.data;
  
  try {
    const filePath = await exportService.generate(conversationId, format);
    
    // Store export metadata
    await prisma.export.create({
      data: {
        conversationId,
        format,
        filePath,
        userId
      }
    });
    
    // Send notification to user
    await notifyUser(userId, 'Export ready', filePath);
    
    return { success: true, filePath };
  } catch (error) {
    throw error;
  }
});

// Webhook Delivery Processor
webhookQueue.process(async (job) => {
  const { webhookId, event, payload } = job.data;
  
  try {
    const webhook = await prisma.webhook.findUnique({ where: { id: webhookId } });
    
    // Sign payload with HMAC
    const signature = generateHMAC(payload, webhook.secret);
    
    // Send webhook
    const response = await axios.post(webhook.url, payload, {
      headers: {
        'X-BaatCheet-Signature': signature,
        'X-BaatCheet-Event': event,
        'X-BaatCheet-Delivery-ID': job.id
      },
      timeout: 10000 // 10 second timeout
    });
    
    // Log successful delivery
    await prisma.webhookDelivery.create({
      data: {
        webhookId,
        event,
        payload,
        statusCode: response.status,
        success: true
      }
    });
    
    return { success: true };
  } catch (error) {
    // Log failed delivery
    await prisma.webhookDelivery.create({
      data: {
        webhookId: job.data.webhookId,
        event: job.data.event,
        payload: job.data.payload,
        statusCode: error.response?.status || 0,
        success: false,
        errorMessage: error.message
      }
    });
    
    throw error; // Retry via Bull (exponential backoff)
  }
});

export { ocrQueue, audioQueue, exportQueue, webhookQueue };
```

**Update Controllers to Use Queues:**

```typescript
// In image.controller.ts
async uploadImage(req, res) {
  const file = await uploadFile(req.file);
  
  // Add OCR job to queue (don't wait)
  await ocrQueue.add({
    imageUrl: file.url,
    attachmentId: attachment.id,
    conversationId: req.body.conversationId
  }, {
    attempts: 3,
    backoff: {
      type: 'exponential',
      delay: 2000
    }
  });
  
  // Return immediately
  res.json({ 
    success: true, 
    attachment,
    message: 'OCR processing in background' 
  });
}
```

**Success Criteria:**
- API responses < 200ms (no blocking)
- Failed jobs retry 3 times with exponential backoff
- Queue dashboard accessible (Bull Board)
- Dead letter queue for failed jobs
- Job status queryable by user

---

## 🎯 CRITICAL FIX #3: Database Connection Pooling

**Problem:** Prisma connection pool not configured. Will crash under concurrent load.

**Fix Required:**

Update `src/config/database.config.ts`:

```typescript
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient({
  datasources: {
    db: {
      url: process.env.DATABASE_URL
    }
  },
  log: process.env.NODE_ENV === 'development' ? ['query', 'error', 'warn'] : ['error'],
  
  // Connection pool configuration
  connectionTimeout: 10000, // 10 seconds
  maxConnections: 100, // Max pool size
  minConnections: 10, // Min pool size
  
  // Query performance
  queryTimeout: 30000, // 30 seconds max query time
  
  // Retry logic
  connectionRetries: 3,
  connectionRetryDelay: 1000
});

// Graceful shutdown
process.on('SIGINT', async () => {
  await prisma.$disconnect();
  process.exit(0);
});

process.on('SIGTERM', async () => {
  await prisma.$disconnect();
  process.exit(0);
});

export default prisma;
```

Update `.env`:

```env
# PostgreSQL connection URL with pool settings
DATABASE_URL="postgresql://user:password@localhost:5432/baatcheet?connection_limit=100&pool_timeout=10"
```

**Add Database Indexes:**

Create migration file:

```typescript
// prisma/migrations/XXXXXX_add_performance_indexes.sql

-- Conversation queries
CREATE INDEX idx_conversation_user_updated ON "Conversation"(userId, updatedAt DESC);
CREATE INDEX idx_conversation_project ON "Conversation"(projectId, updatedAt DESC);
CREATE INDEX idx_conversation_archived ON "Conversation"(userId, isArchived);

-- Message queries
CREATE INDEX idx_message_conversation ON "Message"(conversationId, createdAt DESC);
CREATE INDEX idx_message_role ON "Message"(conversationId, role);

-- Full-text search
CREATE INDEX idx_conversation_title_search ON "Conversation" USING GIN(to_tsvector('english', title));
CREATE INDEX idx_message_content_search ON "Message" USING GIN(to_tsvector('english', content));

-- Analytics queries
CREATE INDEX idx_analytics_user_date ON "Analytics"(userId, date DESC);

-- Webhook queries
CREATE INDEX idx_webhook_user_active ON "Webhook"(userId, isActive);
CREATE INDEX idx_webhook_delivery_created ON "WebhookDelivery"(webhookId, createdAt DESC);
```

Run migration:
```bash
npx prisma migrate dev --name add_performance_indexes
```

**Success Criteria:**
- Connection pool maintains 10-100 connections
- No connection timeout errors under load
- Query times < 50ms for indexed queries
- Graceful shutdown releases all connections

---

## 🎯 CRITICAL FIX #4: API Key Security

**Problem:** 38 API keys stored in .env file. High risk of exposure. No secret rotation strategy.

**Fix Required:**

**Option A: AWS Secrets Manager (Recommended for Production)**

```bash
npm install @aws-sdk/client-secrets-manager
```

```typescript
// src/config/secrets.config.ts
import { SecretsManagerClient, GetSecretValueCommand } from "@aws-sdk/client-secrets-manager";

const client = new SecretsManagerClient({ region: "us-east-1" });

async function getSecret(secretName: string): Promise<any> {
  try {
    const response = await client.send(
      new GetSecretValueCommand({ SecretId: secretName })
    );
    return JSON.parse(response.SecretString);
  } catch (error) {
    console.error(`Error fetching secret ${secretName}:`, error);
    throw error;
  }
}

// Load all API keys from Secrets Manager
export async function loadAPIKeys() {
  const groqKeys = await getSecret('baatcheet/groq-api-keys');
  const openRouterKeys = await getSecret('baatcheet/openrouter-api-keys');
  const deepSeekKeys = await getSecret('baatcheet/deepseek-api-keys');
  // ... etc
  
  return {
    groq: groqKeys.keys, // Array of 14 keys
    openRouter: openRouterKeys.keys,
    deepSeek: deepSeekKeys.keys,
    // ...
  };
}
```

**Option B: HashiCorp Vault (Self-Hosted)**

```bash
npm install node-vault
```

```typescript
import vault from 'node-vault';

const vaultClient = vault({
  apiVersion: 'v1',
  endpoint: process.env.VAULT_ADDR,
  token: process.env.VAULT_TOKEN
});

async function getAPIKeys() {
  const result = await vaultClient.read('secret/data/baatcheet/api-keys');
  return result.data.data;
}
```

**Option C: Encrypted .env (Development Only)**

```bash
npm install dotenv-vault
```

```bash
# Encrypt .env file
npx dotenv-vault local build

# Decrypt on startup
npx dotenv-vault local decrypt
```

**Update AI Router to Use Secrets:**

```typescript
// src/services/ai-router.service.ts
import { loadAPIKeys } from '../config/secrets.config';

class AIRouterService {
  private apiKeys: APIKeys;
  
  async initialize() {
    this.apiKeys = await loadAPIKeys();
    console.log(`Loaded ${this.apiKeys.groq.length} Groq keys`);
  }
  
  // Use this.apiKeys.groq[index] instead of process.env.GROQ_API_KEY_1
}
```

**Key Rotation Strategy:**

```typescript
// src/scripts/rotate-keys.ts
// Run monthly via cron

async function rotateAPIKeys() {
  // 1. Generate new keys via provider APIs
  const newGroqKeys = await generateNewGroqKeys();
  
  // 2. Update secrets