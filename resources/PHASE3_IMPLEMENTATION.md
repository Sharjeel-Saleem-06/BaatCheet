# BaatCheet Phase 3 Implementation

## Overview

Phase 3 adds advanced features to BaatCheet:
- **Voice Input** - Audio upload and transcription with Whisper
- **Analytics** - Usage tracking and insights dashboard
- **Webhooks** - Event-driven integrations
- **API Keys** - User API key management
- **Testing Frontend** - React app to test all APIs

---

## 1. Voice Input Service

### Features
- Audio upload (MP3, WAV, OGG, WEBM, FLAC, M4A)
- File size limit: 25MB
- Transcription using Groq Whisper (primary) and OpenRouter (backup)
- Support for 13+ languages including English, Urdu, Arabic, Hindi
- Language auto-detection
- Voice-to-chat integration

### API Endpoints

| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/api/v1/audio/upload` | Upload audio file |
| POST | `/api/v1/audio/transcribe` | Transcribe uploaded audio |
| POST | `/api/v1/audio/transcribe-upload` | Upload and transcribe in one request |
| POST | `/api/v1/audio/voice-chat` | Voice chat (upload → transcribe → AI response) |
| GET | `/api/v1/audio/:id` | Get audio info |
| DELETE | `/api/v1/audio/:id` | Delete audio |
| GET | `/api/v1/audio/config/languages` | List supported languages |
| GET | `/api/v1/audio/config/health` | Audio service health |

### Usage Example

```bash
# Upload and transcribe audio
curl -X POST http://localhost:5001/api/v1/audio/transcribe-upload \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -F "audio=@recording.mp3" \
  -F "language=en"

# Response
{
  "success": true,
  "data": {
    "audioId": "abc-123",
    "audioUrl": "/uploads/audio/xyz.mp3",
    "text": "Hello, this is a test recording",
    "language": "en",
    "duration": 5.2,
    "provider": "groq-whisper"
  }
}
```

---

## 2. Analytics Service

### Features
- Track messages, tokens, conversations, projects
- Track image uploads and audio transcriptions
- Calculate average response times
- Identify top models and tags
- Daily, weekly, monthly aggregation
- Export analytics as JSON or CSV

### API Endpoints

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/v1/analytics/dashboard` | Overall statistics |
| GET | `/api/v1/analytics/usage?period=7d` | Usage over time |
| GET | `/api/v1/analytics/tokens` | Token usage by model |
| GET | `/api/v1/analytics/conversations` | Conversation statistics |
| GET | `/api/v1/analytics/insights` | AI-generated insights |
| GET | `/api/v1/analytics/export?format=csv` | Export analytics data |
| GET | `/api/v1/analytics/admin/global` | Global platform stats (admin) |

### Dashboard Response

```json
{
  "success": true,
  "data": {
    "totalConversations": 42,
    "totalMessages": 1234,
    "totalTokens": 567890,
    "totalProjects": 5,
    "totalImages": 23,
    "totalAudioMinutes": 15,
    "averageResponseTime": 450,
    "topModels": ["llama-3.3-70b-versatile", "gemini-2.5-flash"],
    "topTags": ["coding", "writing", "research"]
  }
}
```

---

## 3. Webhook System

### Features
- Create webhooks with custom URLs
- Subscribe to specific events
- HMAC-SHA256 signature verification
- Automatic retry with exponential backoff (1s, 5s, 25s)
- Auto-disable after 10 consecutive failures
- Delivery history tracking

### Supported Events

| Event | Description |
|-------|-------------|
| `message.created` | User sends a message |
| `message.completed` | AI response finished |
| `conversation.created` | New conversation created |
| `conversation.archived` | Conversation archived |
| `image.uploaded` | Image uploaded |
| `audio.transcribed` | Audio transcribed |
| `export.generated` | Export generated |

### API Endpoints

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/v1/webhooks` | List webhooks |
| POST | `/api/v1/webhooks` | Create webhook |
| GET | `/api/v1/webhooks/:id` | Get webhook details |
| PUT | `/api/v1/webhooks/:id` | Update webhook |
| DELETE | `/api/v1/webhooks/:id` | Delete webhook |
| POST | `/api/v1/webhooks/:id/test` | Send test webhook |
| GET | `/api/v1/webhooks/:id/deliveries` | View delivery history |
| GET | `/api/v1/webhooks/events` | List available events |

### Webhook Payload

```json
{
  "event": "message.completed",
  "timestamp": "2024-01-10T12:00:00.000Z",
  "data": {
    "conversationId": "conv-123",
    "messageId": "msg-456",
    "content": "AI response content..."
  }
}
```

### Webhook Headers

```
X-BaatCheet-Signature: sha256=abc123...
X-BaatCheet-Event: message.completed
X-BaatCheet-Delivery-ID: del-789
```

---

## 4. API Key Management

### Features
- Generate secure API keys (`bc_` prefix + 32 chars)
- Hashed storage with bcrypt
- Per-key rate limiting (configurable)
- Key rotation without downtime
- Usage tracking per key
- Permissions: read, write, admin

### Rate Limits by Tier

| Tier | Requests/Hour |
|------|---------------|
| Free | 100 |
| Pro | 1,000 |
| Enterprise | 10,000 |

### API Endpoints

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/v1/api-keys` | List API keys |
| POST | `/api/v1/api-keys` | Create new key |
| GET | `/api/v1/api-keys/:id` | Get key details |
| PUT | `/api/v1/api-keys/:id` | Update key settings |
| DELETE | `/api/v1/api-keys/:id` | Revoke key |
| POST | `/api/v1/api-keys/:id/rotate` | Rotate key |
| GET | `/api/v1/api-keys/:id/usage` | View usage stats |

### Usage Example

```bash
# Create API key
curl -X POST http://localhost:5001/api/v1/api-keys \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"name": "My App"}'

# Response (key shown only once!)
{
  "success": true,
  "data": {
    "key": "bc_a1b2c3d4e5f6...",
    "id": "key-123",
    "name": "My App",
    "keyPrefix": "bc_a1b2c",
    "permissions": ["read", "write"],
    "rateLimit": 100
  }
}
```

---

## 5. Testing Frontend

### Structure

```
frontend/
├── src/
│   ├── components/
│   │   └── Layout.tsx
│   ├── pages/
│   │   ├── Login.tsx
│   │   ├── Chat.tsx
│   │   ├── Projects.tsx
│   │   ├── Analytics.tsx
│   │   └── Settings.tsx
│   ├── services/
│   │   └── api.ts
│   ├── store/
│   │   └── auth.ts
│   ├── App.tsx
│   ├── main.tsx
│   └── index.css
├── index.html
├── package.json
├── tailwind.config.js
├── tsconfig.json
└── vite.config.ts
```

### Features

- **Login/Register** - JWT authentication
- **Chat** - Real-time streaming with SSE
- **Projects** - Project management with CRUD
- **Analytics** - Usage statistics and charts
- **Settings** - API keys and webhooks management

### Running the Frontend

```bash
cd frontend
npm install
npm run dev
# Opens at http://localhost:3000
```

---

## 6. Database Schema Updates

### New Models

```prisma
model Audio {
  id               String  @id @default(uuid())
  userId           String
  conversationId   String?
  originalFilename String
  storedFilename   String
  fileSize         Int
  duration         Float?
  format           String
  storageUrl       String
  transcription    String?
  detectedLanguage String?
  confidence       Float?
  transcriptionModel String?
  createdAt        DateTime @default(now())
}

model Analytics {
  id                    String   @id @default(uuid())
  userId                String
  date                  DateTime @db.Date
  messagesCount         Int      @default(0)
  responsesCount        Int      @default(0)
  tokensByModel         Json     @default("{}")
  conversationsCreated  Int      @default(0)
  projectsCreated       Int      @default(0)
  imagesUploaded        Int      @default(0)
  audioTranscribed      Float    @default(0)
  exportsGenerated      Int      @default(0)
  searchesPerformed     Int      @default(0)
  averageResponseTime   Float    @default(0)
  topTags               String[] @default([])
  topModels             String[] @default([])
  createdAt             DateTime @default(now())
  updatedAt             DateTime @updatedAt
}

model Webhook {
  id           String    @id @default(uuid())
  userId       String
  url          String
  events       String[]  @default([])
  secret       String
  isActive     Boolean   @default(true)
  failureCount Int       @default(0)
  lastTriggered DateTime?
  createdAt    DateTime  @default(now())
  updatedAt    DateTime  @updatedAt
}

model WebhookDelivery {
  id           String   @id @default(uuid())
  webhookId    String
  event        String
  payload      Json
  status       String   // pending, success, failed
  statusCode   Int?
  response     String?
  attempts     Int      @default(0)
  nextRetry    DateTime?
  createdAt    DateTime @default(now())
}

model ApiKey {
  id          String    @id @default(uuid())
  userId      String
  name        String
  keyHash     String
  keyPrefix   String
  permissions String[]  @default(["read", "write"])
  rateLimit   Int       @default(100)
  lastUsed    DateTime?
  expiresAt   DateTime?
  isActive    Boolean   @default(true)
  usageCount  Int       @default(0)
  createdAt   DateTime  @default(now())
  updatedAt   DateTime  @updatedAt
}
```

---

## 7. Testing

### Backend Health Check

```bash
curl http://localhost:5001/health
```

### Test Audio Languages

```bash
curl http://localhost:5001/api/v1/audio/config/languages
```

### Test Webhook Events

```bash
curl http://localhost:5001/api/v1/webhooks/events
```

### Test Analytics (requires auth)

```bash
curl http://localhost:5001/api/v1/analytics/dashboard \
  -H "Authorization: Bearer YOUR_TOKEN"
```

---

## 8. Security Considerations

- **Audio files**: Validated by MIME type and magic numbers
- **Webhook secrets**: Hashed with crypto.randomBytes(32)
- **API keys**: Hashed with bcrypt, prefix stored for identification
- **Webhook URLs**: Validated to prevent SSRF
- **Rate limiting**: Per-endpoint and per-API-key limits
- **All sensitive data**: Encrypted at rest

---

## 9. Performance Optimizations

- **Redis caching**: Sessions, analytics, context
- **Local cache**: In-memory fallback when Redis unavailable
- **Streaming**: SSE for real-time responses
- **Database indexes**: On frequently queried fields
- **Connection pooling**: Prisma manages PostgreSQL connections
- **Graceful degradation**: App works without Redis

---

## Next Steps (Phase 4)

1. **Slack/Discord integrations** - Bot commands
2. **Zapier integration** - REST hooks
3. **Load testing** - Artillery performance tests
4. **Error tracking** - Sentry integration
5. **Advanced caching** - Cache warming, invalidation
6. **Background jobs** - Bull queue for async tasks
