# BaatCheet - Project Status & Implementation Summary

## Overview
**BaatCheet** is an advanced AI chat application with multi-provider support, built with Node.js/Express backend and React frontend.

**GitHub:** https://github.com/Sharjeel-Saleem-06/BaatCheet.git

---

## Tech Stack

| Layer | Technology |
|-------|------------|
| Backend | Node.js, Express, TypeScript |
| Database | PostgreSQL (Prisma ORM) |
| Cache | Redis |
| Auth | Clerk |
| Frontend | React, Vite, TypeScript, Tailwind CSS |
| AI Providers | Groq, OpenRouter, DeepSeek, Gemini, Hugging Face |
| OCR | OCR.space |
| Deployment | Docker, GitHub Actions CI/CD |

---

## Backend Features (Complete)

### 1. Authentication (Clerk)
- User registration/login via Clerk
- Session management
- Role-based access (user, admin, moderator)
- Tier-based limits (free, pro, enterprise)
- Webhook sync for user data

### 2. AI Chat System
- **Multi-provider routing** with automatic failover
- **14 Groq keys**, **12 OpenRouter keys**, **4 DeepSeek keys**, **3 Gemini keys**, **5 Hugging Face tokens**
- Round-robin key rotation with daily limits
- **Streaming responses** via SSE
- Context management with token counting
- Default model: `llama-3.3-70b-versatile`

### 3. Image Processing
- Image upload (JPG, PNG, WEBP, PDF - max 10MB)
- **OCR** via OCR.space (6 keys) with Gemini fallback
- **Vision analysis** via Gemini
- Multi-language support including Urdu

### 4. Voice Input
- Audio upload (MP3, WAV, OGG, WEBM - max 25MB)
- Transcription via OpenAI Whisper
- Language detection
- Integration with chat flow

### 5. Conversations & Projects
- CRUD operations for conversations
- Project organization with color/icon
- Tags, pinning, archiving
- Search with filters
- Export to PDF, TXT, JSON, Markdown

### 6. Sharing & Templates
- Generate share links with expiry
- Track access counts
- Default and custom templates
- Categories: coding, writing, education, etc.

### 7. Analytics
- Usage tracking per user
- Token usage by model
- Daily/weekly/monthly aggregation
- Dashboard endpoint

### 8. Webhooks
- Create webhooks for events
- HMAC-SHA256 signature verification
- Retry with exponential backoff
- Events: message.created, conversation.created, etc.

### 9. API Key Management
- Users can generate API keys
- Permissions: read, write, admin
- Rate limiting per key
- Key rotation

### 10. Security
- Rate limiting (tiered)
- Helmet.js security headers
- Input sanitization
- Injection prevention
- File validation

### 11. Health & Monitoring
- `/health` - detailed status
- `/ready` - readiness probe
- `/live` - liveness probe
- Metrics endpoint

---

## API Endpoints Summary

| Category | Endpoints |
|----------|-----------|
| Auth | `GET /api/v1/auth/me`, `PUT /api/v1/auth/preferences` |
| Chat | `POST /api/v1/chat/completions`, `GET /api/v1/chat/models`, `GET /api/v1/chat/providers/health` |
| Conversations | CRUD at `/api/v1/conversations` |
| Projects | CRUD at `/api/v1/projects` |
| Images | `POST /api/v1/images/upload`, `POST /api/v1/images/ocr`, `POST /api/v1/images/analyze` |
| Audio | `POST /api/v1/audio/upload`, `POST /api/v1/audio/transcribe` |
| Export | `GET /api/v1/export/:conversationId` |
| Share | `POST /api/v1/share`, `GET /api/v1/share/:shareId` |
| Templates | CRUD at `/api/v1/templates` |
| Analytics | `GET /api/v1/analytics/dashboard` |
| Webhooks | CRUD at `/api/v1/webhooks` |
| API Keys | CRUD at `/api/v1/api-keys` |

**Swagger Docs:** `http://localhost:5001/api/docs`

---

## Database Schema (PostgreSQL)

| Model | Purpose |
|-------|---------|
| User | User accounts (synced from Clerk) |
| Conversation | Chat conversations |
| Message | Individual messages |
| Project | Project organization |
| Attachment | Image/file attachments |
| ShareLink | Shared conversation links |
| Template | Conversation templates |
| Audio | Audio files and transcriptions |
| Analytics | Usage statistics |
| Webhook | User webhooks |
| WebhookDelivery | Webhook delivery logs |
| ApiKey | User-generated API keys |
| ApiKeyUsage | API key usage tracking |

---

## Frontend Status (Basic Structure)

Currently implemented:
- ClerkProvider integration
- Basic routing (Chat, Projects, Analytics, Settings)
- API service layer with Clerk token
- Layout with sidebar

**Needs implementation:**
- Chat interface with streaming
- Project management UI
- Image/audio upload components
- Analytics dashboard
- Settings page
- Responsive design

---

## Environment Variables

```env
# Database
DATABASE_URL=postgresql://user:pass@localhost:5432/baatcheet

# Redis
REDIS_URL=redis://localhost:6379

# Clerk
CLERK_SECRET_KEY=sk_test_xxx
NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY=pk_test_xxx
CLERK_WEBHOOK_SECRET=whsec_xxx

# AI Providers (multiple keys for each)
GROQ_API_KEY_1=gsk_xxx
OPENROUTER_API_KEY_1=sk-or-v1-xxx
DEEPSEEK_API_KEY_1=sk-xxx
GEMINI_API_KEY_1=AIzaSyxxx
HUGGINGFACE_TOKEN_1=hf_xxx
OCR_SPACE_KEY_1=Kxxx
```

---

## Running the Project

```bash
# Backend
cd backend
npm install
npx prisma migrate dev
npm run dev  # Runs on port 5001

# Frontend
cd frontend
npm install
npm run dev  # Runs on port 5173

# Or with Docker
docker-compose up -d
```

---

## CI/CD

- **CI Pipeline**: Lint, test, build on push/PR
- **Deploy Pipeline**: Staging → Production with approval
- **Docker**: Multi-stage builds for both frontend and backend

---

## Next Steps (Frontend Focus)

1. **Chat Interface**
   - Message list with markdown rendering
   - Streaming response display
   - Model selector
   - New conversation button

2. **Sidebar**
   - Conversation list
   - Project organization
   - Search

3. **Features**
   - Image upload with preview
   - Voice recording
   - Export dialog
   - Share modal

4. **Polish**
   - Loading states
   - Error handling
   - Responsive design
   - Dark/light theme

---

## File Structure

```
BaatCheet/
├── backend/
│   ├── src/
│   │   ├── config/       # DB, Redis, Swagger config
│   │   ├── middleware/   # Auth, security, validation
│   │   ├── routes/       # API endpoints
│   │   ├── services/     # Business logic
│   │   ├── types/        # TypeScript types
│   │   └── utils/        # Logger, helpers
│   ├── prisma/           # Database schema
│   └── Dockerfile
├── frontend/
│   ├── src/
│   │   ├── components/   # React components
│   │   ├── pages/        # Page components
│   │   ├── services/     # API client
│   │   └── store/        # State management
│   └── Dockerfile
├── tests/load/           # Artillery load tests
├── resources/            # Documentation
├── docker-compose.yml
└── .github/workflows/    # CI/CD
```

---

**Backend is 100% complete and production-ready. Frontend needs UI implementation.**
