# 🔑 BaatCheet API Key Management System

## Overview

BaatCheet implements a sophisticated multi-provider AI system with intelligent load balancing, automatic failover, and comprehensive usage tracking. This document explains how the API key management system works.

---

## 📊 Architecture Diagram

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                           BaatCheet Backend                                  │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                              │
│  ┌─────────────────┐     ┌─────────────────┐     ┌─────────────────┐       │
│  │   Chat Routes   │     │  Vision Routes  │     │   OCR Routes    │       │
│  └────────┬────────┘     └────────┬────────┘     └────────┬────────┘       │
│           │                       │                       │                 │
│           ▼                       ▼                       ▼                 │
│  ┌─────────────────────────────────────────────────────────────────┐       │
│  │                      Service Layer                               │       │
│  │  ┌──────────┐  ┌──────────────┐  ┌────────────┐  ┌───────────┐ │       │
│  │  │AIRouter  │  │VisionService │  │ OCRService │  │ChatService│ │       │
│  │  └────┬─────┘  └──────┬───────┘  └─────┬──────┘  └─────┬─────┘ │       │
│  └───────┼───────────────┼────────────────┼───────────────┼───────┘       │
│          │               │                │               │                 │
│          ▼               ▼                ▼               ▼                 │
│  ┌─────────────────────────────────────────────────────────────────┐       │
│  │                    Provider Manager                              │       │
│  │  ┌─────────────────────────────────────────────────────────┐   │       │
│  │  │  Key Pool Management                                     │   │       │
│  │  │  • Round-robin selection                                 │   │       │
│  │  │  • Usage tracking                                        │   │       │
│  │  │  • Error handling                                        │   │       │
│  │  │  • Daily limit enforcement                               │   │       │
│  │  └─────────────────────────────────────────────────────────┘   │       │
│  └─────────────────────────────────────────────────────────────────┘       │
│                                    │                                        │
│                                    ▼                                        │
│  ┌─────────────────────────────────────────────────────────────────┐       │
│  │                     AI Providers                                 │       │
│  │  ┌────────┐ ┌──────────┐ ┌────────┐ ┌───────┐ ┌───────┐ ┌────┐ │       │
│  │  │ Groq   │ │OpenRouter│ │DeepSeek│ │Gemini │ │  HF   │ │OCR │ │       │
│  │  │14 keys │ │ 12 keys  │ │ 4 keys │ │3 keys │ │5 keys │ │6key│ │       │
│  │  └────────┘ └──────────┘ └────────┘ └───────┘ └───────┘ └────┘ │       │
│  └─────────────────────────────────────────────────────────────────┘       │
│                                                                              │
└─────────────────────────────────────────────────────────────────────────────┘
```

---

## 🔄 Request Flow

### 1. Chat Request Flow

```
User Request
    │
    ▼
┌──────────────────────────────────────────────────────────────────┐
│ 1. Chat Route receives request                                    │
│    - Validates input                                              │
│    - Extracts user context                                        │
└──────────────────────────────────────────────────────────────────┘
    │
    ▼
┌──────────────────────────────────────────────────────────────────┐
│ 2. ChatService processes message                                  │
│    - Builds conversation context                                  │
│    - Retrieves message history                                    │
└──────────────────────────────────────────────────────────────────┘
    │
    ▼
┌──────────────────────────────────────────────────────────────────┐
│ 3. AIRouter selects provider                                      │
│    - Checks provider availability                                 │
│    - Priority: Groq → OpenRouter → DeepSeek → Gemini             │
└──────────────────────────────────────────────────────────────────┘
    │
    ▼
┌──────────────────────────────────────────────────────────────────┐
│ 4. ProviderManager selects key                                    │
│    - Round-robin selection                                        │
│    - Checks daily limit                                           │
│    - Validates key availability                                   │
└──────────────────────────────────────────────────────────────────┘
    │
    ▼
┌──────────────────────────────────────────────────────────────────┐
│ 5. API Call to Provider                                           │
│    - Sends request with selected key                              │
│    - Handles streaming if enabled                                 │
└──────────────────────────────────────────────────────────────────┘
    │
    ├── Success ──────────────────────────────────────────────────┐
    │   │                                                          │
    │   ▼                                                          │
    │   ┌──────────────────────────────────────────────────────┐   │
    │   │ 6a. Record Success                                    │   │
    │   │     - Increment request count                         │   │
    │   │     - Reset error count                               │   │
    │   │     - Save to database                                │   │
    │   └──────────────────────────────────────────────────────┘   │
    │                                                              │
    └── Failure ──────────────────────────────────────────────────┐
        │                                                          │
        ▼                                                          │
        ┌──────────────────────────────────────────────────────┐   │
        │ 6b. Handle Error                                      │   │
        │     - Increment error count                           │   │
        │     - If rate limited: disable key                    │   │
        │     - If 5+ errors: disable key                       │   │
        │     - Try next provider (failover)                    │   │
        └──────────────────────────────────────────────────────┘   │
```

### 2. OCR Request Flow

```
Image Upload
    │
    ▼
┌──────────────────────────────────────────────────────────────────┐
│ 1. OCR Route receives image (base64)                              │
│    - Validates image format                                       │
│    - Extracts language preference                                 │
└──────────────────────────────────────────────────────────────────┘
    │
    ▼
┌──────────────────────────────────────────────────────────────────┐
│ 2. OCRService processes request                                   │
│    - Priority: OCR.space → Gemini                                 │
│    - Selects best provider for task                               │
└──────────────────────────────────────────────────────────────────┘
    │
    ├── OCR.space ────────────────────────────────────────────────┐
    │   │                                                          │
    │   ▼                                                          │
    │   ┌──────────────────────────────────────────────────────┐   │
    │   │ 3a. OCR.space Processing                              │   │
    │   │     - Send to OCR.space API                           │   │
    │   │     - Supports 60+ languages                          │   │
    │   │     - Returns extracted text                          │   │
    │   └──────────────────────────────────────────────────────┘   │
    │                                                              │
    └── Gemini (Backup) ──────────────────────────────────────────┐
        │                                                          │
        ▼                                                          │
        ┌──────────────────────────────────────────────────────┐   │
        │ 3b. Gemini Vision Processing                          │   │
        │     - Use Gemini's vision capabilities                │   │
        │     - Extract text from image                         │   │
        │     - Returns extracted text                          │   │
        └──────────────────────────────────────────────────────┘   │
    │
    ▼
┌──────────────────────────────────────────────────────────────────┐
│ 4. Optional: Process with Groq                                    │
│    - Summarize extracted text                                     │
│    - Translate content                                            │
│    - Answer questions about content                               │
└──────────────────────────────────────────────────────────────────┘
```

---

## 🔧 Provider Configuration

### Current Provider Setup

| Provider | Keys | Daily Limit/Key | Total Capacity | Primary Use |
|----------|------|-----------------|----------------|-------------|
| **Groq** | 14 | 14,400 | 201,600 | Chat (Primary) |
| **OpenRouter** | 12 | 200 | 2,400 | Chat (Backup) |
| **DeepSeek** | 4 | 1,000 | 4,000 | Chat (Backup) |
| **Gemini** | 3 | 1,500 | 4,500 | Vision/OCR |
| **Hugging Face** | 5 | 1,000 | 5,000 | Image Captioning |
| **OCR.space** | 6 | 500 | 3,000 | OCR (Primary) |

### Task-to-Provider Mapping

```typescript
const TASK_PROVIDERS = {
  chat: ['groq', 'openrouter', 'deepseek', 'gemini'],
  vision: ['gemini', 'openrouter'],
  'image-to-text': ['ocrspace', 'gemini'],
  ocr: ['ocrspace', 'gemini'],
  embedding: ['huggingface', 'openrouter'],
};
```

---

## ⚙️ Key Management Algorithms

### 1. Round-Robin Selection

```typescript
// Simplified algorithm
function getNextKey(provider: ProviderType): Key | null {
  const state = providers.get(provider);
  
  // Filter available keys
  const availableKeys = state.keys.filter(
    k => k.isAvailable && k.requestCount < dailyLimit && k.errorCount < 5
  );
  
  if (availableKeys.length === 0) return null;
  
  // Round-robin selection
  const key = availableKeys[currentIndex % availableKeys.length];
  currentIndex++;
  
  return key;
}
```

### 2. Failover Logic

```typescript
// Simplified failover
async function chatWithFailover(request: ChatRequest): Promise<Response> {
  const providers = ['groq', 'openrouter', 'deepseek', 'gemini'];
  
  for (const provider of providers) {
    if (!hasCapacity(provider)) continue;
    
    try {
      const response = await callProvider(provider, request);
      recordSuccess(provider);
      return response;
    } catch (error) {
      recordError(provider, error);
      continue; // Try next provider
    }
  }
  
  throw new Error('All providers unavailable');
}
```

### 3. Daily Reset

```typescript
// Runs at midnight UTC
function resetDailyCounters(): void {
  providers.forEach(state => {
    state.keys.forEach(key => {
      key.requestCount = 0;
      key.isAvailable = true;
      key.errorCount = 0;
    });
  });
}
```

---

## 📈 Usage Tracking

### Database Schema

```prisma
model ApiKeyUsage {
  id            String   @id @default(uuid())
  provider      String   // groq, openrouter, etc.
  keyIndex      Int      // Which key (0, 1, 2, etc.)
  requestCount  Int      // Requests made today
  date          DateTime // Date of usage
  
  @@unique([provider, keyIndex, date])
}
```

### Usage Flow

1. **On Request**: Increment `requestCount` for the used key
2. **On Success**: Reset `errorCount` to 0
3. **On Error**: Increment `errorCount`
4. **On Rate Limit**: Set `isAvailable = false`
5. **Daily Reset**: Reset all counters at midnight UTC

---

## 🛡️ Error Handling

### Error Types & Actions

| Error Type | Action | Recovery |
|------------|--------|----------|
| **Rate Limit (429)** | Disable key immediately | Wait for daily reset |
| **Auth Error (401)** | Mark key as invalid | Manual fix required |
| **Server Error (500)** | Increment error count | Try next key |
| **Timeout** | Increment error count | Try next provider |
| **5+ Consecutive Errors** | Disable key | Wait for daily reset |

### Error Response to Frontend

```json
{
  "success": false,
  "error": "All AI providers are currently unavailable. Please try again later.",
  "code": "PROVIDERS_EXHAUSTED"
}
```

---

## 🔍 Health Monitoring

### Health Check Endpoint

```
GET /api/v1/chat/providers/health
```

### Response Example

```json
{
  "success": true,
  "data": {
    "status": "healthy",
    "providers": {
      "groq": {
        "available": true,
        "totalKeys": 14,
        "availableKeys": 14,
        "totalCapacity": 201600,
        "usedToday": 150,
        "remainingCapacity": 201450,
        "percentUsed": 0.07
      },
      "openrouter": {
        "available": true,
        "totalKeys": 12,
        "availableKeys": 12,
        "totalCapacity": 2400,
        "usedToday": 0,
        "remainingCapacity": 2400,
        "percentUsed": 0
      }
    },
    "services": {
      "chat": true,
      "vision": true,
      "ocr": true
    }
  }
}
```

---

## 🚀 Best Practices

### 1. Key Distribution

- **Chat**: Primarily uses Groq (fastest, highest capacity)
- **Vision**: Uses Gemini (best vision capabilities)
- **OCR**: Uses OCR.space (specialized, accurate)
- **Backup**: OpenRouter provides access to 100+ models

### 2. Capacity Planning

```
Total Daily Capacity:
- Chat: ~208,000 requests (Groq + OpenRouter + DeepSeek)
- Vision: ~7,000 requests (Gemini + OpenRouter)
- OCR: ~7,500 requests (OCR.space + Gemini)
```

### 3. Monitoring Recommendations

1. Monitor `/providers/health` endpoint regularly
2. Set alerts when `percentUsed > 80%`
3. Track error rates per provider
4. Review daily usage patterns

---

## 📝 Configuration

### Environment Variables

```env
# Groq (14 keys)
GROQ_API_KEY_1=gsk_...
GROQ_API_KEY_2=gsk_...
# ... up to GROQ_API_KEY_14

# OpenRouter (12 keys)
OPENROUTER_API_KEY_1=sk-or-...
OPENROUTER_API_KEY_2=sk-or-...
# ... up to OPENROUTER_API_KEY_12

# DeepSeek (4 keys)
DEEPSEEK_API_KEY_1=sk-...
# ... up to DEEPSEEK_API_KEY_4

# Gemini (3 keys)
GEMINI_API_KEY_1=AIza...
GEMINI_API_KEY_2=AIza...
GEMINI_API_KEY_3=AIza...

# Hugging Face (5 keys)
HUGGINGFACE_API_KEY_1=hf_...
# ... up to HUGGINGFACE_API_KEY_5

# OCR.space (6 keys)
OCR_SPACE_API_KEY_1=K...
# ... up to OCR_SPACE_API_KEY_6
```

---

## 🔄 Daily Operations

### Automatic Processes

1. **Midnight UTC**: All counters reset
2. **Continuous**: Round-robin key selection
3. **On Error**: Automatic failover to next provider
4. **On Rate Limit**: Key disabled until reset

### Manual Interventions

- Add new keys: Update `.env` and restart
- Check health: `GET /api/v1/chat/providers/health`
- Test providers: `POST /api/v1/chat/test`

---

## 📊 Summary

BaatCheet's API key management system ensures:

✅ **High Availability**: Multiple providers with automatic failover  
✅ **Load Balancing**: Round-robin distribution across keys  
✅ **Usage Optimization**: Daily limits prevent overuse  
✅ **Error Recovery**: Automatic retry with different keys  
✅ **Monitoring**: Comprehensive health endpoints  
✅ **Scalability**: Easy to add more keys/providers  

This architecture allows BaatCheet to handle thousands of requests daily while maintaining reliability and performance.
