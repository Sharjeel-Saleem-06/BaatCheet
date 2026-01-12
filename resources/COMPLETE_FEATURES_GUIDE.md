# 🗣️ BaatCheet - Complete Features Guide

## Overview

BaatCheet is an advanced AI chat application with features that rival and surpass ChatGPT. This document provides a comprehensive guide to all backend features available for frontend/mobile implementation.

---

## 📋 Table of Contents

1. [Authentication](#authentication)
2. [AI Chat System](#ai-chat-system)
3. [AI Modes](#ai-modes)
4. [Chat Tags](#chat-tags)
5. [Image Generation](#image-generation)
6. [Voice Input/Output](#voice-inputoutput)
7. [Web Search](#web-search)
8. [File Handling](#file-handling)
9. [Memory System](#memory-system)
10. [Conversations](#conversations)
11. [Projects](#projects)
12. [Templates](#templates)
13. [Export/Share](#exportshare)
14. [User Profile](#user-profile)
15. [Analytics](#analytics)
16. [Admin Panel](#admin-panel)
17. [API Keys Management](#api-keys-management)
18. [Health & Monitoring](#health--monitoring)
19. [Rate Limits](#rate-limits)
20. [GDPR Compliance](#gdpr-compliance)
21. [API Reference](#api-reference)

---

## 🔐 Authentication

### Provider: Clerk
- Email/Password authentication
- Email verification required
- Session management
- JWT tokens for API calls

### Frontend Implementation:
```typescript
// Use Clerk React SDK
import { ClerkProvider, SignIn, SignUp, useAuth } from '@clerk/clerk-react';

// Get token for API calls
const { getToken } = useAuth();
const token = await getToken();

// Include in API requests
headers: {
  'Authorization': `Bearer ${token}`
}
```

### Endpoints:
| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/api/v1/auth/webhook` | Clerk webhook handler |
| GET | `/api/v1/auth/me` | Get current user |

---

## 💬 AI Chat System

### Features:
- ✅ Streaming responses (real-time typing effect)
- ✅ Multi-model support (Groq, OpenRouter, DeepSeek, Gemini)
- ✅ Context management (remembers conversation history)
- ✅ Intelligent prompt analysis
- ✅ Response formatting (markdown, code, tables)
- ✅ Automatic mode detection

### Endpoints:
| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/api/v1/chat/completions` | Send message (streaming) |
| POST | `/api/v1/chat/message` | Send message (non-streaming) |

### Request Body:
```json
{
  "conversationId": "optional-uuid",
  "message": "User's message",
  "model": "llama-3.3-70b-versatile",
  "stream": true,
  "imageIds": ["image-uuid"],
  "mode": "code"
}
```

### Streaming Response:
```javascript
// Frontend implementation
const response = await fetch('/api/v1/chat/completions', {
  method: 'POST',
  headers: {
    'Authorization': `Bearer ${token}`,
    'Content-Type': 'application/json'
  },
  body: JSON.stringify({ message, conversationId, stream: true })
});

const reader = response.body.getReader();
const decoder = new TextDecoder();

while (true) {
  const { done, value } = await reader.read();
  if (done) break;
  
  const chunk = decoder.decode(value);
  const lines = chunk.split('\n');
  
  for (const line of lines) {
    if (line.startsWith('data: ')) {
      const data = JSON.parse(line.slice(6));
      if (data.content) {
        // Append to message display
        appendToMessage(data.content);
      }
    }
  }
}
```

---

## 🏷️ Chat Tags

### Available Tags:
Use these tags at the start of your message to trigger specific actions:

| Tag | Description | Example |
|-----|-------------|---------|
| `@image` | Generate an image | `@image A sunset over mountains` |
| `@browse` | Search the web | `@browse latest AI news` |
| `@code` | Code assistance mode | `@code write a Python function` |
| `@explain` | Detailed explanation | `@explain how DNS works` |
| `@summarize` | Summarize content | `@summarize this article` |
| `@translate` | Translate text | `@translate Hello to Spanish` |
| `@math` | Mathematical problems | `@math solve x^2 + 5x + 6 = 0` |
| `@creative` | Creative writing | `@creative write a haiku` |
| `@debug` | Debug code | `@debug why is this not working` |
| `@analyze` | Data analysis | `@analyze this CSV data` |

### Endpoints:
| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/v1/tags` | List all available tags |
| GET | `/api/v1/tags/help` | Get tag usage help |

### Frontend Implementation:
```typescript
// Tag detection and autocomplete
const TAGS = ['@image', '@browse', '@code', '@explain', '@summarize', 
              '@translate', '@math', '@creative', '@debug', '@analyze'];

const detectTag = (message: string) => {
  const tag = TAGS.find(t => message.toLowerCase().startsWith(t));
  return tag || null;
};

// Show tag suggestions when user types @
const TagAutocomplete = ({ input, onSelect }) => {
  const showSuggestions = input.startsWith('@') && input.length < 10;
  const filtered = TAGS.filter(t => t.startsWith(input.toLowerCase()));
  
  if (!showSuggestions) return null;
  
  return (
    <div className="tag-suggestions">
      {filtered.map(tag => (
        <button key={tag} onClick={() => onSelect(tag)}>
          {tag}
        </button>
      ))}
    </div>
  );
};
```

---

## 🎯 AI Modes

### Available Modes (15+):

| Mode ID | Name | Icon | Description | Temperature |
|---------|------|------|-------------|-------------|
| `chat` | Chat | 💬 | General conversation | 0.7 |
| `image-generation` | Create Image | 🎨 | Generate images | 0.8 |
| `vision` | Analyze Image | 👁️ | Analyze uploaded images | 0.3 |
| `web-search` | Browse | 🌐 | Search web for info | 0.4 |
| `code` | Code | 💻 | Programming help | 0.2 |
| `debug` | Debug | 🐛 | Fix code bugs | 0.2 |
| `data-analysis` | Analyze Data | 📊 | Data & charts | 0.3 |
| `math` | Math | 🔢 | Mathematical problems | 0.1 |
| `creative` | Write | ✍️ | Stories, poems | 0.9 |
| `translate` | Translate | 🌍 | Language translation | 0.3 |
| `summarize` | Summarize | 📝 | Summarize content | 0.3 |
| `explain` | Explain | 📚 | Educational explanations | 0.5 |
| `research` | Research | 🔍 | Deep research | 0.4 |
| `tutor` | Tutor | 👨‍🏫 | Teaching mode | 0.6 |
| `business` | Business | 💼 | Business analysis | 0.4 |

### Endpoints:
| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/v1/modes` | List all modes |
| GET | `/api/v1/modes/:modeId` | Get mode details |
| POST | `/api/v1/modes/detect` | Detect mode from message |
| GET | `/api/v1/modes/info/categories` | Modes by category |

### Frontend Implementation:
```typescript
// Mode selector component
const modes = [
  { id: 'chat', icon: '💬', label: 'Chat' },
  { id: 'image-generation', icon: '🎨', label: 'Create Image' },
  { id: 'code', icon: '💻', label: 'Code' },
  // ... more modes
];

// Auto-detect mode from message
const detectMode = async (message: string) => {
  const response = await api.post('/modes/detect', { message });
  return response.data.detectedMode;
};
```

---

## 🎨 Image Generation

### Features:
- ✅ Multiple AI models (FLUX, SDXL, Playground, SD 1.5)
- ✅ 15+ style presets
- ✅ AI prompt enhancement
- ✅ Image variations
- ✅ Batch generation (Pro)
- ✅ Aspect ratio support
- ✅ Seed control for reproducibility

### Available Models:
| Model | Quality | Speed | Max Resolution |
|-------|---------|-------|----------------|
| `flux-schnell` | Excellent | Fast | 1024x1024 |
| `stable-diffusion-xl` | High | Medium | 1024x1024 |
| `playground-v2.5` | Excellent | Medium | 1024x1024 |
| `stable-diffusion-1.5` | Balanced | Fast | 512x512 |

### Style Presets:
| Style ID | Name | Description |
|----------|------|-------------|
| `realistic` | Photorealistic | High-detail photography |
| `anime` | Anime | Japanese animation style |
| `cartoon` | Cartoon | Colorful, playful |
| `sketch` | Pencil Sketch | Hand-drawn look |
| `watercolor` | Watercolor | Soft, flowing colors |
| `digital-art` | Digital Art | Trending on ArtStation |
| `oil-painting` | Oil Painting | Classical art style |
| `cyberpunk` | Cyberpunk | Neon, futuristic |
| `fantasy` | Fantasy | Magical, ethereal |
| `minimalist` | Minimalist | Clean, simple |
| `vintage` | Vintage | Retro, nostalgic |
| `abstract` | Abstract | Geometric, modern |
| `3d-render` | 3D Render | Octane/Unreal style |
| `pixel-art` | Pixel Art | Retro game style |
| `comic` | Comic Book | Bold lines, halftone |

### Aspect Ratios:
| Ratio | Dimensions | Use Case |
|-------|------------|----------|
| `1:1` | 1024x1024 | Profile pictures, icons |
| `16:9` | 1344x768 | Landscape, wallpapers |
| `9:16` | 768x1344 | Mobile wallpapers, stories |
| `4:3` | 1152x896 | Standard photos |
| `3:4` | 896x1152 | Portrait photos |
| `21:9` | 1536x640 | Ultrawide banners |

### Daily Limits:
| Tier | Images/Day | Batch | Variations |
|------|------------|-------|------------|
| Free | 1 | ❌ | ❌ |
| Pro | 50 | ✅ | ✅ |
| Enterprise | 500 | ✅ | ✅ |

### Endpoints:
| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/api/v1/image-gen/generate` | Generate image |
| POST | `/api/v1/image-gen/variations/:id` | Generate variations |
| POST | `/api/v1/image-gen/batch` | Batch generation (Pro) |
| POST | `/api/v1/image-gen/enhance-prompt` | AI prompt enhancement |
| POST | `/api/v1/image-gen/suggestions` | Get improvement suggestions |
| GET | `/api/v1/image-gen/status` | User's generation status |
| GET | `/api/v1/image-gen/models` | Available models |
| GET | `/api/v1/image-gen/styles` | Style presets |
| GET | `/api/v1/image-gen/aspect-ratios` | Aspect ratios |
| GET | `/api/v1/image-gen/history` | Generation history |

### Request Example:
```json
{
  "prompt": "A majestic lion in a sunset savanna",
  "style": "realistic",
  "aspectRatio": "16:9",
  "model": "stable-diffusion-xl",
  "enhancePrompt": true
}
```

### Response:
```json
{
  "success": true,
  "data": {
    "imageUrl": "data:image/png;base64,...",
    "model": "Stable Diffusion XL",
    "originalPrompt": "A majestic lion in a sunset savanna",
    "enhancedPrompt": "A majestic lion in a sunset savanna, photorealistic, highly detailed, 8k, golden hour lighting, dramatic composition",
    "seed": 123456789,
    "generationTime": 12500,
    "style": "realistic",
    "aspectRatio": "16:9"
  }
}
```

### Frontend Implementation:
```typescript
// Image generation component
const generateImage = async (prompt: string, options: ImageOptions) => {
  setLoading(true);
  
  const response = await api.post('/image-gen/generate', {
    prompt,
    style: options.style,
    aspectRatio: options.aspectRatio,
    model: options.model,
    enhancePrompt: true
  });
  
  if (response.data.success) {
    setGeneratedImage(response.data.data.imageUrl);
  }
  
  setLoading(false);
};

// Check user's remaining generations
const checkStatus = async () => {
  const response = await api.get('/image-gen/status');
  return {
    canGenerate: response.data.data.canGenerate,
    remaining: response.data.data.remainingToday,
    limit: response.data.data.dailyLimit
  };
};
```

---

## 🎤 Voice Input/Output

### Voice Input (Speech-to-Text):
- ✅ Whisper API transcription
- ✅ Multiple language support
- ✅ Real-time transcription (Web Speech API)
- ✅ Auto-stop on silence

### Voice Output (Text-to-Speech):
- ✅ OpenAI TTS
- ✅ ElevenLabs (6 API keys)
- ✅ Google Cloud TTS
- ✅ Multiple voices

### Endpoints:
| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/api/v1/audio/upload` | Upload audio for transcription |
| POST | `/api/v1/audio/transcribe` | Transcribe audio file |
| POST | `/api/v1/tts/generate` | Generate speech from text |
| GET | `/api/v1/tts/voices` | Available voices |
| GET | `/api/v1/tts/status` | TTS service status |

### TTS Request:
```json
{
  "text": "Hello, how can I help you today?",
  "voice": "alloy",
  "speed": 1.0
}
```

### Frontend Voice Input:
```typescript
// Using Web Speech API for real-time transcription
const recognition = new webkitSpeechRecognition();
recognition.continuous = true;
recognition.interimResults = true;

recognition.onresult = (event) => {
  const transcript = Array.from(event.results)
    .map(result => result[0].transcript)
    .join('');
  setTranscript(transcript);
};

// Or upload audio file
const uploadAudio = async (audioBlob: Blob) => {
  const formData = new FormData();
  formData.append('audio', audioBlob, 'recording.webm');
  
  const response = await api.post('/audio/upload', formData);
  return response.data.transcription;
};
```

---

## 🌐 Web Search

### Features:
- ✅ Brave Search integration (2 API keys)
- ✅ SerpAPI backup
- ✅ DuckDuckGo fallback
- ✅ Date filtering
- ✅ Source citations

### Endpoints:
| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/api/v1/search` | Perform web search |
| GET | `/api/v1/search/status` | Search service status |
| POST | `/api/v1/search/check` | Check if query needs search |

### Request:
```json
{
  "query": "Latest AI news 2026",
  "numResults": 5,
  "dateFilter": "week"
}
```

### Auto-Trigger Keywords:
- "today", "latest", "recent", "current"
- "news about", "what happened"
- "weather", "stock price", "score"

---

## 📁 File Handling

### Supported File Types:

#### Images:
| Format | Max Size | Features |
|--------|----------|----------|
| JPEG/JPG | 10MB | OCR, Vision analysis |
| PNG | 10MB | OCR, Vision analysis |
| GIF | 5MB | First frame analysis |
| WebP | 10MB | OCR, Vision analysis |

#### Documents:
| Format | Max Size | Features |
|--------|----------|----------|
| PDF | 20MB | Text extraction, analysis |
| TXT | 5MB | Direct reading |
| MD | 5MB | Markdown parsing |
| DOC/DOCX | 10MB | Text extraction |
| CSV | 10MB | Data analysis |
| JSON | 5MB | Structure analysis |

### Endpoints:
| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/api/v1/images/upload` | Upload image |
| GET | `/api/v1/images/:id` | Get image |
| POST | `/api/v1/files/upload` | Upload document |
| GET | `/api/v1/files/:id` | Get file |
| GET | `/api/v1/files/:id/content` | Get extracted content |

### Frontend Implementation:
```typescript
// Image upload with preview
const uploadImage = async (file: File) => {
  const formData = new FormData();
  formData.append('image', file);
  
  const response = await api.post('/images/upload', formData);
  
  return {
    id: response.data.data.id,
    url: response.data.data.url,
    ocrText: response.data.data.ocrText // After OCR processing
  };
};

// Document upload
const uploadDocument = async (file: File) => {
  const formData = new FormData();
  formData.append('file', file);
  
  const response = await api.post('/files/upload', formData);
  return response.data;
};
```

---

## 🧠 Memory System

### Features:
- ✅ Automatic fact extraction from conversations
- ✅ User profile building
- ✅ Conversation summaries
- ✅ Personalized responses
- ✅ Skill level tracking
- ✅ Interest decay
- ✅ Goal monitoring

### Fact Categories:
| Category | Examples |
|----------|----------|
| `personal` | Name, location, birthday |
| `professional` | Job, company, industry |
| `preference` | Likes, dislikes, style |
| `skill` | Programming languages, expertise |
| `interest` | Hobbies, topics |
| `goal` | Learning objectives, projects |
| `relationship` | Family, colleagues |

### Endpoints:
| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/v1/profile/facts` | Get learned facts |
| POST | `/api/v1/profile/teach` | Explicitly teach a fact |
| DELETE | `/api/v1/profile/facts/:id` | Delete a fact |
| POST | `/api/v1/profile/ask` | Ask about profile |
| GET | `/api/v1/profile/summary` | Get profile summary |

### Frontend Implementation:
```typescript
// View learned facts
const getLearnedFacts = async () => {
  const response = await api.get('/profile/facts');
  return response.data.data.facts;
};

// Teach the AI something
const teachFact = async (fact: string) => {
  await api.post('/profile/teach', {
    fact: "My favorite programming language is TypeScript"
  });
};

// Display in settings
const ProfileSettings = () => {
  const [facts, setFacts] = useState([]);
  
  useEffect(() => {
    getLearnedFacts().then(setFacts);
  }, []);
  
  return (
    <div>
      <h2>What I Know About You</h2>
      {facts.map(fact => (
        <FactCard 
          key={fact.id}
          category={fact.category}
          value={fact.factValue}
          onDelete={() => deleteFact(fact.id)}
        />
      ))}
    </div>
  );
};
```

---

## 💬 Conversations

### Features:
- ✅ Create/list/delete conversations
- ✅ Conversation history
- ✅ Title generation
- ✅ Model per conversation
- ✅ System prompt customization

### Endpoints:
| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/v1/conversations` | List conversations |
| GET | `/api/v1/conversations/:id` | Get conversation |
| POST | `/api/v1/conversations` | Create conversation |
| DELETE | `/api/v1/conversations/:id` | Delete conversation |
| PATCH | `/api/v1/conversations/:id` | Update conversation |

### Response:
```json
{
  "success": true,
  "data": {
    "items": [
      {
        "id": "uuid",
        "title": "Help with React hooks",
        "model": "llama-3.3-70b-versatile",
        "messageCount": 12,
        "createdAt": "2026-01-12T10:00:00Z",
        "updatedAt": "2026-01-12T11:30:00Z"
      }
    ],
    "total": 25,
    "page": 1,
    "limit": 20
  }
}
```

---

## 📂 Projects

### Features:
- ✅ Organize conversations into projects
- ✅ Project-level settings
- ✅ Shared context across conversations
- ✅ Project templates

### Endpoints:
| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/v1/projects` | List user's projects |
| GET | `/api/v1/projects/:id` | Get project details |
| POST | `/api/v1/projects` | Create new project |
| PATCH | `/api/v1/projects/:id` | Update project |
| DELETE | `/api/v1/projects/:id` | Delete project |
| GET | `/api/v1/projects/:id/conversations` | Get project conversations |

### Request Body:
```json
{
  "name": "My AI Project",
  "description": "Project for learning AI",
  "systemPrompt": "You are a helpful AI tutor",
  "model": "llama-3.3-70b-versatile"
}
```

---

## 📝 Templates

### Features:
- ✅ Pre-built prompt templates
- ✅ Custom templates
- ✅ Categories (coding, writing, analysis, etc.)
- ✅ Variables support

### Default Templates:
| Template | Category | Description |
|----------|----------|-------------|
| Code Review | coding | Review code for issues |
| Bug Fix | coding | Help fix bugs |
| Story Writer | creative | Write creative stories |
| Email Writer | business | Professional emails |
| Summarizer | productivity | Summarize content |
| Translator | language | Translate text |
| Explainer | education | Explain concepts |
| Data Analyst | analysis | Analyze data |

### Endpoints:
| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/v1/templates` | List templates |
| GET | `/api/v1/templates/:id` | Get template |
| POST | `/api/v1/templates` | Create template |
| DELETE | `/api/v1/templates/:id` | Delete template |

---

## 📤 Export/Share

### Export Formats:
| Format | Description |
|--------|-------------|
| PDF | Formatted document |
| TXT | Plain text |
| MD | Markdown |
| JSON | Structured data |

### Share Features:
- ✅ Public share links
- ✅ Expiration dates
- ✅ View counts
- ✅ Revoke access

### Endpoints:
| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/api/v1/export/:conversationId` | Export conversation |
| POST | `/api/v1/share/:conversationId` | Create share link |
| GET | `/api/v1/share/:shareId` | View shared conversation |
| DELETE | `/api/v1/share/:shareId` | Revoke share link |

---

## 👤 User Profile

### Endpoints:
| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/v1/auth/me` | Get current user |
| PATCH | `/api/v1/profile/preferences` | Update preferences |

### Preferences:
```json
{
  "theme": "dark",
  "defaultModel": "llama-3.3-70b-versatile",
  "language": "en",
  "streamingEnabled": true
}
```

---

## 📊 Analytics

### Features:
- ✅ Usage statistics
- ✅ Token consumption tracking
- ✅ Model usage breakdown
- ✅ Daily/weekly/monthly reports

### Endpoints:
| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/v1/analytics/usage` | Get usage statistics |
| GET | `/api/v1/analytics/tokens` | Token consumption |
| GET | `/api/v1/analytics/models` | Model usage breakdown |
| GET | `/api/v1/analytics/daily` | Daily statistics |

### Response:
```json
{
  "success": true,
  "data": {
    "totalMessages": 1250,
    "totalTokens": 450000,
    "conversationCount": 45,
    "modelUsage": {
      "llama-3.3-70b-versatile": 800,
      "gemini-2.0-flash": 350,
      "deepseek-chat": 100
    },
    "dailyUsage": [
      { "date": "2026-01-12", "messages": 50, "tokens": 18000 }
    ]
  }
}
```

---

## 🔧 Admin Panel

### Features (Admin only):
- ✅ User management
- ✅ Content moderation
- ✅ API usage tracking
- ✅ System settings
- ✅ Audit logs

### Endpoints:
| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/v1/admin/users` | List users |
| GET | `/api/v1/admin/stats` | System statistics |
| POST | `/api/v1/admin/users/:id/ban` | Ban user |
| GET | `/api/v1/admin/audit-logs` | View audit logs |

---

## 🔑 API Keys Management

### Features:
- ✅ Create personal API keys
- ✅ Key rotation
- ✅ Usage tracking per key
- ✅ Rate limiting per key
- ✅ Revoke keys

### Endpoints:
| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/v1/api-keys` | List user's API keys |
| POST | `/api/v1/api-keys` | Create new API key |
| DELETE | `/api/v1/api-keys/:id` | Revoke API key |
| GET | `/api/v1/api-keys/:id/usage` | Get key usage stats |

### Response:
```json
{
  "success": true,
  "data": {
    "id": "key-uuid",
    "name": "My App Key",
    "key": "baat_sk_xxxx...xxxx", // Only shown once on creation
    "lastUsed": "2026-01-12T10:00:00Z",
    "requestCount": 150,
    "createdAt": "2026-01-01T00:00:00Z"
  }
}
```

---

## 🏥 Health & Monitoring

### Features:
- ✅ Health checks
- ✅ Readiness probes
- ✅ Liveness probes
- ✅ Metrics endpoint
- ✅ Provider status

### Endpoints:
| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/v1/health` | Basic health check |
| GET | `/api/v1/health/ready` | Readiness probe |
| GET | `/api/v1/health/live` | Liveness probe |
| GET | `/api/v1/health/metrics` | System metrics |
| GET | `/api/v1/health/providers` | AI provider status |

### Health Response:
```json
{
  "status": "healthy",
  "timestamp": "2026-01-12T10:00:00Z",
  "version": "1.0.0",
  "uptime": 86400,
  "checks": {
    "database": "healthy",
    "redis": "healthy",
    "aiProviders": "healthy"
  }
}
```

### Provider Status Response:
```json
{
  "groq": {
    "available": true,
    "totalKeys": 14,
    "availableKeys": 14,
    "remainingCapacity": 201600
  },
  "openrouter": {
    "available": true,
    "totalKeys": 12,
    "availableKeys": 12,
    "remainingCapacity": 2400
  }
}
```

---

## ⚡ Rate Limits

### By Tier:

| Endpoint | Free | Pro | Enterprise |
|----------|------|-----|------------|
| Chat | 50/hr | 500/hr | 5000/hr |
| Image Gen | 1/day | 50/day | 500/day |
| Web Search | 10/hr | 100/hr | 1000/hr |
| TTS | 5/hr | 50/hr | 500/hr |
| Audio | 5/hr | 50/hr | 500/hr |
| Export | 10/hr | 100/hr | 1000/hr |

### Headers:
```
X-RateLimit-Limit: 50
X-RateLimit-Remaining: 45
X-RateLimit-Reset: 2026-01-12T12:00:00Z
```

---

## 🔒 GDPR Compliance

### Features:
- ✅ Data export (JSON format)
- ✅ Complete data deletion
- ✅ Portable data format
- ✅ Right to be forgotten

### Endpoints:
| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/v1/gdpr/export` | Export all user data |
| DELETE | `/api/v1/gdpr/delete-all` | Delete all user data |
| GET | `/api/v1/gdpr/export-portable` | Portable data export |

### Export Response:
```json
{
  "success": true,
  "data": {
    "user": {
      "id": "uuid",
      "email": "user@example.com",
      "createdAt": "2026-01-01T00:00:00Z"
    },
    "conversations": [...],
    "messages": [...],
    "images": [...],
    "facts": [...],
    "exportedAt": "2026-01-12T10:00:00Z"
  }
}
```

### Delete Response:
```json
{
  "success": true,
  "message": "All user data has been permanently deleted",
  "deletedItems": {
    "conversations": 45,
    "messages": 1250,
    "images": 30,
    "facts": 15
  }
}
```

---

## 🔔 Webhooks

### Features:
- ✅ Event notifications
- ✅ Custom webhook URLs
- ✅ Retry on failure
- ✅ Event filtering

### Supported Events:
| Event | Description |
|-------|-------------|
| `message.created` | New message sent |
| `conversation.created` | New conversation started |
| `image.generated` | Image generation completed |
| `export.completed` | Export ready for download |

### Endpoints:
| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/v1/webhooks` | List webhooks |
| POST | `/api/v1/webhooks` | Create webhook |
| DELETE | `/api/v1/webhooks/:id` | Delete webhook |
| POST | `/api/v1/webhooks/:id/test` | Test webhook |

### Webhook Payload:
```json
{
  "event": "message.created",
  "timestamp": "2026-01-12T10:00:00Z",
  "data": {
    "conversationId": "uuid",
    "messageId": "uuid",
    "role": "assistant",
    "content": "Hello! How can I help you?"
  }
}
```

---

## 📚 API Reference

### Base URL:
```
Production: https://your-domain.com/api/v1
Development: http://localhost:5001/api/v1
```

### Authentication:
```
Authorization: Bearer <clerk-session-token>
```

### All Endpoints Summary:

#### Authentication
| Method | Endpoint | Auth | Description |
|--------|----------|------|-------------|
| POST | `/auth/webhook` | No | Clerk webhook |
| GET | `/auth/me` | Yes | Get current user |

#### Chat & AI
| Method | Endpoint | Auth | Description |
|--------|----------|------|-------------|
| POST | `/chat/completions` | Yes | Stream chat |
| POST | `/chat/message` | Yes | Non-stream chat |

#### Modes & Tags
| Method | Endpoint | Auth | Description |
|--------|----------|------|-------------|
| GET | `/modes` | Yes | List AI modes |
| POST | `/modes/detect` | Yes | Detect mode |
| GET | `/tags` | Yes | List tags |

#### Image Generation
| Method | Endpoint | Auth | Description |
|--------|----------|------|-------------|
| POST | `/image-gen/generate` | Yes | Generate image |
| POST | `/image-gen/variations/:id` | Yes | Variations |
| POST | `/image-gen/batch` | Yes | Batch (Pro) |
| GET | `/image-gen/status` | Yes | User status |
| GET | `/image-gen/models` | Yes | Models list |
| GET | `/image-gen/styles` | Yes | Style presets |

#### Voice & Audio
| Method | Endpoint | Auth | Description |
|--------|----------|------|-------------|
| POST | `/audio/upload` | Yes | Upload audio |
| POST | `/audio/transcribe` | Yes | Transcribe |
| POST | `/tts/generate` | Yes | Text to speech |
| GET | `/tts/voices` | Yes | Available voices |

#### Web Search
| Method | Endpoint | Auth | Description |
|--------|----------|------|-------------|
| POST | `/search` | Yes | Search web |
| GET | `/search/status` | Yes | Service status |

#### Files & Images
| Method | Endpoint | Auth | Description |
|--------|----------|------|-------------|
| POST | `/images/upload` | Yes | Upload image |
| GET | `/images/:id` | Yes | Get image |
| POST | `/files/upload` | Yes | Upload file |
| GET | `/files/:id` | Yes | Get file |

#### Conversations
| Method | Endpoint | Auth | Description |
|--------|----------|------|-------------|
| GET | `/conversations` | Yes | List |
| POST | `/conversations` | Yes | Create |
| GET | `/conversations/:id` | Yes | Get one |
| PATCH | `/conversations/:id` | Yes | Update |
| DELETE | `/conversations/:id` | Yes | Delete |

#### Projects
| Method | Endpoint | Auth | Description |
|--------|----------|------|-------------|
| GET | `/projects` | Yes | List |
| POST | `/projects` | Yes | Create |
| GET | `/projects/:id` | Yes | Get one |
| DELETE | `/projects/:id` | Yes | Delete |

#### Profile & Memory
| Method | Endpoint | Auth | Description |
|--------|----------|------|-------------|
| GET | `/profile/facts` | Yes | Get facts |
| POST | `/profile/teach` | Yes | Teach fact |
| DELETE | `/profile/facts/:id` | Yes | Delete fact |

#### Export & Share
| Method | Endpoint | Auth | Description |
|--------|----------|------|-------------|
| POST | `/export/:id` | Yes | Export chat |
| POST | `/share/:id` | Yes | Create link |
| GET | `/share/:shareId` | No | View shared |

#### Templates
| Method | Endpoint | Auth | Description |
|--------|----------|------|-------------|
| GET | `/templates` | Yes | List |
| POST | `/templates` | Yes | Create |
| DELETE | `/templates/:id` | Yes | Delete |

#### Analytics
| Method | Endpoint | Auth | Description |
|--------|----------|------|-------------|
| GET | `/analytics/usage` | Yes | Usage stats |
| GET | `/analytics/tokens` | Yes | Token usage |

#### GDPR
| Method | Endpoint | Auth | Description |
|--------|----------|------|-------------|
| GET | `/gdpr/export` | Yes | Export data |
| DELETE | `/gdpr/delete-all` | Yes | Delete all |

#### Health (No Auth)
| Method | Endpoint | Auth | Description |
|--------|----------|------|-------------|
| GET | `/health` | No | Health check |
| GET | `/health/ready` | No | Readiness |
| GET | `/health/live` | No | Liveness |
| GET | `/health/metrics` | No | Metrics |

#### Admin (Admin Only)
| Method | Endpoint | Auth | Description |
|--------|----------|------|-------------|
| GET | `/admin/users` | Admin | List users |
| GET | `/admin/stats` | Admin | Statistics |
| POST | `/admin/users/:id/ban` | Admin | Ban user |

### Error Response:
```json
{
  "success": false,
  "error": "Error message",
  "code": "ERROR_CODE"
}
```

### Common Error Codes:
| Code | Description |
|------|-------------|
| 400 | Bad Request |
| 401 | Unauthorized |
| 403 | Forbidden |
| 404 | Not Found |
| 429 | Rate Limit Exceeded |
| 500 | Internal Server Error |

---

## 📱 Mobile App Considerations

### React Native Implementation:
```typescript
// API client setup
import axios from 'axios';
import { useAuth } from '@clerk/clerk-expo';

const api = axios.create({
  baseURL: 'https://api.baatcheet.com/api/v1'
});

// Add auth interceptor
api.interceptors.request.use(async (config) => {
  const { getToken } = useAuth();
  const token = await getToken();
  config.headers.Authorization = `Bearer ${token}`;
  return config;
});
```

### Key Features for Mobile:
1. **Offline Support**: Cache conversations locally
2. **Push Notifications**: New message alerts
3. **Voice Input**: Native speech recognition
4. **Image Picker**: Camera and gallery access
5. **Share Extension**: Share content to BaatCheet
6. **Widgets**: Quick chat access

### Performance Tips:
- Use pagination for conversations list
- Implement infinite scroll for messages
- Cache images locally
- Use WebSocket for real-time updates
- Compress images before upload

---

## 🚀 Deployment

### Hugging Face Spaces:
- See `/huggingface/README.md` for deployment guide
- Set secrets in HF Space settings
- Auto-deploy on push

### Environment Variables:
- See `/resources/ENV_TEMPLATE.md` for all required variables

---

*Last Updated: January 2026*
*Version: 1.0.0*
