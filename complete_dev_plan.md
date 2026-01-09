# BaatCheet - Complete Development Plan
## Advanced AI Chat Application

---

## 📋 PROJECT OVERVIEW

**Project Name:** BaatCheet (Conversation in Urdu/Hindi)

**Goal:** Build an advanced, free ChatGPT alternative with multiple AI providers, multi-language support, and enterprise features.

**Technology Stack:**
- Backend: Node.js + Express + TypeScript
- Database: MongoDB + Redis
- AI Providers: Groq, Together AI, DeepSeek, Puter.js
- Frontend (Testing): React + Tailwind CSS
- Production Frontend: React Native (Mobile Apps)

---

## 🎯 CORE FEATURES

### 1. Advanced Chat Capabilities
- Real-time streaming responses
- Multiple AI model selection
- Context-aware conversations (up to 50 messages)
- Regenerate responses
- Edit and continue from any message
- Copy, share, export conversations

### 2. Multi-Provider AI System
- Primary: Groq API (10 keys for load balancing)
- Backup: Together AI, DeepSeek, Puter.js
- Automatic failover between providers
- Smart routing based on availability
- Health monitoring for all providers

### 3. Project & Conversation Management
- Create multiple projects/folders
- Organize conversations by topic
- Tag and categorize chats
- Archive old conversations
- Search across all conversations
- Pin important chats

### 4. Image Analysis
- OCR (Optical Character Recognition)
- Image description and analysis
- Support for multiple image formats
- Text extraction from screenshots
- Vision-based Q&A

### 5. Multi-Language Support
- Native Urdu support with RTL text
- English language support
- Mixed language conversations
- Auto-language detection
- Code syntax highlighting

### 6. Advanced Features
- Custom system prompts
- Conversation templates
- Voice input (Speech-to-Text)
- Export to PDF, TXT, JSON
- Conversation sharing with links
- Dark/Light theme

---

## 🏗️ SYSTEM ARCHITECTURE

### Backend Services

#### 1. AI Router Service
- Routes requests to available AI providers
- Implements round-robin load balancing across 10 Groq keys
- Tracks usage per API key (14,400 requests/day limit)
- Automatic failover on rate limits
- Health checks every 5 minutes
- Priority: Groq → Together → DeepSeek → Puter

#### 2. Context Manager Service
- Stores conversation history in Redis
- Maintains last 50 messages per conversation
- Intelligent token counting (max 8000 tokens)
- Prunes old messages when limit reached
- Fast context retrieval (<50ms)

#### 3. Streaming Service
- Server-Sent Events (SSE) implementation
- Real-time response streaming
- Handles client disconnections gracefully
- Buffers chunks for smooth delivery
- Error recovery mechanisms

#### 4. OCR Service
- Integrates OCR.space API (500 requests/day free)
- Fallback to Puter.js OCR (unlimited)
- Extracts text from images
- Supports JPG, PNG, PDF formats
- Caches results to reduce API calls

#### 5. Vision Service
- Analyzes images using AI models
- Describes image content
- Answers questions about images
- Combines OCR + AI understanding

---

## 📊 DATABASE SCHEMA

### User Collection
- userId (unique identifier)
- email, password (hashed)
- name, avatar
- preferences (theme, default model)
- subscription tier (free/premium)
- created_at, updated_at

### Conversation Collection
- conversationId
- userId (foreign key)
- projectId (foreign key)
- title (auto-generated or custom)
- messages[] array
  - messageId
  - role (system/user/assistant)
  - content (text)
  - attachments[] (images)
  - model (which AI generated this)
  - tokens (token count)
  - timestamp
- systemPrompt (custom instructions)
- model (default AI model)
- tags[] (user-defined tags)
- isArchived (boolean)
- isPinned (boolean)
- totalTokens (sum of all messages)
- created_at, updated_at

### Project Collection
- projectId
- userId (foreign key)
- name
- description
- conversationCount
- color/icon
- created_at, updated_at

### Attachment Collection
- attachmentId
- conversationId
- messageId
- type (image/document)
- url (storage path)
- extractedText (OCR result)
- metadata (size, format)
- created_at

---

## 🔐 API ENDPOINTS

### Authentication
- POST /api/v1/auth/register - Create account
- POST /api/v1/auth/login - User login
- POST /api/v1/auth/logout - User logout
- GET /api/v1/auth/me - Get current user

### Chat
- POST /api/v1/chat/completions - Send message (streaming)
- POST /api/v1/chat/regenerate - Regenerate last response
- GET /api/v1/chat/providers/health - Check AI providers status
- POST /api/v1/chat/models - List available models

### Conversations
- GET /api/v1/conversations - List all conversations
- GET /api/v1/conversations/:id - Get single conversation
- POST /api/v1/conversations - Create new conversation
- PUT /api/v1/conversations/:id - Update conversation
- DELETE /api/v1/conversations/:id - Delete conversation
- GET /api/v1/conversations/search?q=query - Search conversations

### Projects
- GET /api/v1/projects - List all projects
- GET /api/v1/projects/:id - Get single project
- POST /api/v1/projects - Create new project
- PUT /api/v1/projects/:id - Update project
- DELETE /api/v1/projects/:id - Delete project
- GET /api/v1/projects/:id/conversations - Get project conversations

### Images
- POST /api/v1/images/upload - Upload image
- POST /api/v1/images/ocr - Extract text from image
- POST /api/v1/images/analyze - Analyze image with AI

### Export
- GET /api/v1/conversations/:id/export?format=pdf - Export conversation
- POST /api/v1/conversations/:id/share - Generate share link

---

## 🔄 DEVELOPMENT PHASES

### Phase 1: Backend Foundation (Week 1)
**Goal:** Core backend with AI routing and streaming

**Tasks:**
1. Initialize Node.js + TypeScript project
2. Setup Express server with middleware
3. Configure MongoDB and Redis connections
4. Implement AI Router with 10-key rotation
5. Build Context Manager service
6. Create Streaming service
7. Design database models
8. Build authentication system
9. Create chat endpoints
10. Write unit tests

**Deliverables:**
- Working backend server
- API documentation
- Health check endpoints
- Basic error handling
- Logger implementation

### Phase 2: Advanced AI Features (Week 2)
**Goal:** Add image analysis, projects, search

**Tasks:**
1. Integrate OCR.space API
2. Build Vision analysis service
3. Create image upload endpoint
4. Implement Projects management
5. Add conversation search
6. Build export functionality
7. Add conversation tagging
8. Implement edit & continue
9. Add regenerate response
10. Write integration tests

**Deliverables:**
- Image analysis working
- Projects CRUD operations
- Search functionality
- Export to PDF/TXT/JSON
- Comprehensive tests

### Phase 3: Testing Frontend (Week 3)
**Goal:** Simple React app to test all backend APIs

**Tasks:**
1. Create React app with Vite
2. Build chat interface
3. Implement streaming display
4. Add project sidebar
5. Create image upload UI
6. Add markdown rendering
7. Implement dark/light theme
8. Add conversation list
9. Build settings page
10. Test all endpoints

**Deliverables:**
- Functional testing interface
- All features working
- Bug fixes from testing
- Performance optimization

### Phase 4: Production Frontend (Week 4)
**Goal:** Polish and prepare for production

**Tasks:**
1. Security hardening
2. Rate limiting refinement
3. Performance optimization
4. API documentation (Swagger)
5. Load testing (1000 concurrent users)
6. Error handling improvements
7. Logging and monitoring setup
8. Deployment preparation
9. Mobile app API preparation
10. Final testing

**Deliverables:**
- Production-ready backend
- Complete API documentation
- Performance benchmarks
- Deployment guide

---

## 🎨 AI PROVIDER DETAILS

### Groq API (Primary)
- **Free Tier:** ~14,400 requests/day per key
- **Model:** llama-3.1-70b-versatile
- **Speed:** Fastest inference (300+ tokens/sec)
- **Context:** 8192 tokens
- **Strategy:** 10 keys = 144,000 requests/day

### Together AI (Secondary)
- **Free Tier:** $25 credit
- **Model:** Meta-Llama-3.1-70B-Instruct-Turbo
- **Speed:** Fast (100+ tokens/sec)
- **Context:** 8192 tokens
- **Use:** Fallback when Groq exhausted

### DeepSeek (Tertiary)
- **Free Tier:** Developer access
- **Model:** deepseek-chat
- **Speed:** Medium (50+ tokens/sec)
- **Context:** 4096 tokens
- **Use:** Second fallback

### Puter.js (Emergency)
- **Free Tier:** Unlimited
- **Models:** GPT-5, GPT-4o, o1-mini
- **Speed:** Variable
- **Context:** 8192 tokens
- **Use:** Last resort fallback

### OCR.space (Image Text)
- **Free Tier:** 500 requests/day
- **Formats:** JPG, PNG, PDF
- **Languages:** 60+ including Urdu
- **Use:** Primary OCR

### Puter.js OCR (Backup)
- **Free Tier:** Unlimited
- **Formats:** All image types
- **Use:** OCR fallback

---

## 🔧 KEY ALGORITHMS

### 1. API Key Rotation Algorithm
```
1. Maintain array of 10 Groq keys
2. Track usage count per key (max 14,400/day)
3. Use round-robin selection
4. If key hits limit, mark unavailable
5. Reset all counters at midnight UTC
6. If all keys exhausted, switch to Together AI
```

### 2. Context Management Algorithm
```
1. Store last 50 messages in Redis
2. Calculate tokens for each message
3. When total exceeds 8000 tokens:
   - Keep system prompt
   - Keep last 20 messages
   - Summarize older messages
4. Cache in Redis with TTL 24 hours
5. Sync to MongoDB every 5 messages
```

### 3. Streaming Algorithm
```
1. Establish SSE connection
2. Send heartbeat every 30 seconds
3. Stream AI chunks as received
4. Format each chunk as JSON
5. Handle client disconnect
6. Save complete response to database
7. Close connection cleanly
```

### 4. Failover Algorithm
```
1. Try Groq with next available key
2. If Groq returns rate limit error:
   - Mark key as exhausted
   - Try next Groq key
3. If all Groq keys exhausted:
   - Switch to Together AI
4. If Together AI fails:
   - Switch to DeepSeek
5. If DeepSeek fails:
   - Use Puter.js (always available)
6. Log all failovers for monitoring
```

---

## 📈 PERFORMANCE TARGETS

### Response Times
- API response: < 200ms (excluding AI)
- First token: < 1 second
- Streaming: 50-300 tokens/second
- Database queries: < 50ms
- Redis cache: < 10ms

### Scalability
- Concurrent users: 1000+
- Daily requests: 100,000+
- Database size: 10GB+
- Response cache hit rate: > 80%

### Reliability
- Uptime: 99.9%
- Error rate: < 0.1%
- Failover time: < 5 seconds
- Data backup: Every 24 hours

---

## 🔒 SECURITY MEASURES

1. **Authentication:** JWT tokens with 7-day expiry
2. **Rate Limiting:** 100 requests per 15 minutes per IP
3. **Input Validation:** Zod schemas for all inputs
4. **SQL Injection:** Mongoose ODM prevents injection
5. **XSS Protection:** Helmet middleware
6. **CORS:** Whitelist specific origins
7. **API Keys:** Never exposed to frontend
8. **Password:** Bcrypt with 10 rounds
9. **HTTPS:** Required in production
10. **Logging:** Winston logs (no sensitive data)

---

## 🧪 TESTING STRATEGY

### Unit Tests (Jest)
- AI Router key selection
- Context pruning logic
- Token counting accuracy
- Streaming formatting
- Error handling

### Integration Tests
- Complete chat flow
- Provider failover
- Database operations
- Redis caching
- Image upload

### Load Tests (Artillery)
- 1000 concurrent users
- 10,000 requests/minute
- API key rotation under load
- Redis performance
- Memory usage

### Manual Testing
- Urdu text handling
- RTL display
- Image OCR accuracy
- Streaming stability
- Mobile responsiveness

---

## 📦 DEPLOYMENT PLAN

### Backend Hosting Options
1. **Render.com** (Recommended)
   - Free tier available
   - Auto-deploy from Git
   - Built-in SSL
   - 512MB RAM free

2. **Railway.app**
   - $5 credit monthly free
   - Easy setup
   - Good performance

3. **Fly.io**
   - Free tier: 3GB storage
   - Global edge network

### Database Hosting
1. **MongoDB Atlas**
   - Free tier: 512MB
   - Automatic backups
   - Global clusters

2. **Redis Cloud**
   - Free tier: 30MB
   - High availability

### File Storage
1. **Cloudinary**
   - Free tier: 25GB/month
   - Image optimization

---

## 📊 SUCCESS METRICS

### Week 1 Targets
- ✅ Backend server running
- ✅ AI routing working
- ✅ Streaming responses
- ✅ Basic chat functional
- ✅ All tests passing

### Week 2 Targets
- ✅ Image analysis working
- ✅ Projects implemented
- ✅ Search functional
- ✅ Export working
- ✅ 80% code coverage

### Week 3 Targets
- ✅ Testing UI complete
- ✅ All features tested
- ✅ Bugs fixed
- ✅ Performance optimized
- ✅ Documentation complete

### Week 4 Targets
- ✅ Production ready
- ✅ Deployed to hosting
- ✅ Load tested
- ✅ Security hardened
- ✅ Portfolio ready

---

## 🎯 FUTURE ENHANCEMENTS (Post-Launch)

1. Voice input/output
2. Browser extension
3. Desktop app (Electron)
4. Mobile apps (iOS/Android)
5. Team collaboration features
6. API marketplace
7. Custom model fine-tuning
8. Advanced analytics
9. Payment integration (premium tier)
10. Webhook integrations

---

## 📞 SUPPORT & RESOURCES

### Documentation
- API docs: Swagger UI
- User guide: In-app help
- Developer docs: README.md

### Monitoring
- Uptime: UptimeRobot (free)
- Errors: Sentry (free tier)
- Analytics: Plausible (privacy-friendly)

### Community
- GitHub repository
- Discord server
- Twitter updates

---

## ✅ PRE-LAUNCH CHECKLIST

### Backend
- [ ] All endpoints tested
- [ ] Error handling complete
- [ ] Logging implemented
- [ ] Security hardened
- [ ] Performance optimized
- [ ] Documentation written

### Frontend
- [ ] All features working
- [ ] Mobile responsive
- [ ] Accessibility tested
- [ ] Dark mode working
- [ ] Loading states
- [ ] Error states

### DevOps
- [ ] CI/CD pipeline
- [ ] Automated tests
- [ ] Database backups
- [ ] Monitoring setup
- [ ] SSL certificates
- [ ] Domain configured

### Legal
- [ ] Privacy policy
- [ ] Terms of service
- [ ] Cookie policy
- [ ] GDPR compliance

---

**Project Start Date:** [Your Date]
**Expected Completion:** 4 weeks
**Total Development Time:** 160 hours
**Team Size:** 1 developer (You + Cursor AI)

---

*This is a living document. Update as the project evolves.*