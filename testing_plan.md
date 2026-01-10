# BaatCheet Backend - Complete Testing Plan

## 🎯 TESTING OVERVIEW

**Objective:** Verify backend is production-ready before mobile app development

**Timeline:** 3-5 days of thorough testing

**Success Criteria:** All tests pass, no critical issues found

---

## PHASE 1: ENVIRONMENT VERIFICATION (Day 1 - Morning)

### 1.1 Database Check
```bash
# Check PostgreSQL is running
docker ps | grep postgres
# OR
pg_isready -h localhost -p 5432

# Connect to database
psql -U postgres -d baatcheet -h localhost

# Verify tables exist
\dt

# Check row counts
SELECT 'users' as table_name, COUNT(*) FROM "User"
UNION ALL
SELECT 'conversations', COUNT(*) FROM "Conversation"
UNION ALL
SELECT 'messages', COUNT(*) FROM "Message";

# Check indexes
\di

# Verify migrations
ls -la backend/prisma/migrations/
```

**Expected Results:**
- ✅ Database is accessible
- ✅ All tables exist (User, Conversation, Message, Project, etc.)
- ✅ Indexes are created
- ✅ Migration files exist

### 1.2 Redis Check
```bash
# Check Redis is running
docker ps | grep redis
# OR
redis-cli ping

# Test Redis operations
redis-cli
> SET test_key "hello"
> GET test_key
> DEL test_key
> EXIT

# Check Redis config
redis-cli INFO | grep maxmemory
redis-cli INFO | grep eviction
```

**Expected Results:**
- ✅ Redis responds to PING with PONG
- ✅ SET/GET/DEL work correctly
- ✅ Memory limit configured
- ✅ Eviction policy set

### 1.3 Backend Server Check
```bash
# Start backend
cd backend
npm run dev

# Should see:
# - Database connected
# - Redis connected  
# - Server running on port 5001
# - Swagger docs at /api/docs
```

**Expected Results:**
- ✅ Server starts without errors
- ✅ Database connection successful
- ✅ Redis connection successful
- ✅ Logs show initialization

### 1.4 Health Endpoints Check
```bash
# Test health endpoint
curl http://localhost:5001/health | jq

# Test readiness
curl http://localhost:5001/ready

# Test liveness
curl http://localhost:5001/live
```

**Expected JSON:**
```json
{
  "status": "healthy",
  "timestamp": "2026-01-10T...",
  "version": "1.0.0",
  "uptime": 123,
  "services": {
    "database": {"status": "connected", "latency": 5},
    "redis": {"status": "connected", "latency": 2},
    "groq": {"status": "available", "keys": 14},
    "openrouter": {"status": "available", "keys": 12},
    "deepseek": {"status": "available", "keys": 4},
    "gemini": {"status": "available", "keys": 3},
    "huggingface": {"status": "available", "keys": 5}
  }
}
```

---

## PHASE 2: API ENDPOINT TESTING (Day 1 - Afternoon)

### 2.1 Authentication Flow
```bash
# Create test user in Clerk Dashboard
# Then get auth token from Clerk

# Test /api/v1/auth/me
curl -H "Authorization: Bearer YOUR_CLERK_TOKEN" \
  http://localhost:5001/api/v1/auth/me | jq

# Test preferences update
curl -X PUT \
  -H "Authorization: Bearer YOUR_CLERK_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"theme": "dark", "defaultModel": "groq:llama-3.3-70b-versatile"}' \
  http://localhost:5001/api/v1/auth/preferences | jq
```

**Expected:**
- ✅ /auth/me returns user data
- ✅ Preferences update successfully
- ✅ 401 without token
- ✅ Invalid token rejected

### 2.2 AI Chat Testing
```bash
# Test simple chat (non-streaming)
curl -X POST \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "message": "Hello, what is 2+2?",
    "conversationId": null,
    "stream": false
  }' \
  http://localhost:5001/api/v1/chat/completions | jq

# Test streaming chat
curl -N -X POST \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "message": "Write a short poem about AI",
    "conversationId": null,
    "stream": true
  }' \
  http://localhost:5001/api/v1/chat/completions

# Test with context (use conversationId from previous response)
curl -X POST \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "message": "What did I just ask you?",
    "conversationId": "CONVERSATION_ID_HERE",
    "stream": false
  }' \
  http://localhost:5001/api/v1/chat/completions | jq

# Test model list
curl -H "Authorization: Bearer YOUR_TOKEN" \
  http://localhost:5001/api/v1/chat/models | jq

# Test provider health
curl http://localhost:5001/api/v1/chat/providers/health | jq
```

**Expected:**
- ✅ Non-streaming returns complete response
- ✅ Streaming sends chunks in real-time
- ✅ Context is maintained across messages
- ✅ Models list returns available models
- ✅ Provider health shows all providers

### 2.3 Image Upload & OCR
```bash
# Create test image
echo "Test Image" > test.txt
convert test.txt test.jpg

# Upload image
curl -X POST \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -F "file=@test.jpg" \
  -F "conversationId=null" \
  http://localhost:5001/api/v1/images/upload | jq

# OCR on uploaded image (use imageId from response)
curl -X POST \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"imageId": "IMAGE_ID_HERE"}' \
  http://localhost:5001/api/v1/images/ocr | jq

# Analyze image with AI
curl -X POST \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "imageId": "IMAGE_ID_HERE",
    "prompt": "Describe this image in detail"
  }' \
  http://localhost:5001/api/v1/images/analyze | jq
```

**Expected:**
- ✅ Image uploads successfully
- ✅ File is stored (verify file exists)
- ✅ OCR extracts text
- ✅ Vision analysis returns description
- ✅ 10MB limit enforced (test with large file)

### 2.4 Audio Transcription
```bash
# Create test audio (or use existing .mp3)
# Upload audio
curl -X POST \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -F "file=@test.mp3" \
  -F "conversationId=null" \
  http://localhost:5001/api/v1/audio/upload | jq

# Transcribe audio
curl -X POST \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"audioId": "AUDIO_ID_HERE"}' \
  http://localhost:5001/api/v1/audio/transcribe | jq
```

**Expected:**
- ✅ Audio uploads successfully
- ✅ Transcription returns text
- ✅ Language detected correctly
- ✅ 25MB limit enforced

### 2.5 Conversations & Projects
```bash
# Create project
curl -X POST \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "name": "Test Project",
    "description": "Testing project creation",
    "color": "#3B82F6",
    "icon": "folder"
  }' \
  http://localhost:5001/api/v1/projects | jq

# List projects
curl -H "Authorization: Bearer YOUR_TOKEN" \
  http://localhost:5001/api/v1/projects | jq

# Create conversation in project
curl -X POST \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "title": "Test Conversation",
    "projectId": "PROJECT_ID_HERE"
  }' \
  http://localhost:5001/api/v1/conversations | jq

# List conversations
curl -H "Authorization: Bearer YOUR_TOKEN" \
  http://localhost:5001/api/v1/conversations | jq

# Search conversations
curl -H "Authorization: Bearer YOUR_TOKEN" \
  "http://localhost:5001/api/v1/conversations/search?q=test" | jq
```

**Expected:**
- ✅ Projects created successfully
- ✅ Conversations linked to projects
- ✅ Search returns relevant results
- ✅ Tags, pinning, archiving work

### 2.6 Export & Share
```bash
# Export conversation to PDF
curl -H "Authorization: Bearer YOUR_TOKEN" \
  "http://localhost:5001/api/v1/export/CONVERSATION_ID?format=pdf" \
  --output conversation.pdf

# Export to JSON
curl -H "Authorization: Bearer YOUR_TOKEN" \
  "http://localhost:5001/api/v1/export/CONVERSATION_ID?format=json" | jq

# Create share link
curl -X POST \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "conversationId": "CONVERSATION_ID",
    "expiresIn": 7
  }' \
  http://localhost:5001/api/v1/share | jq

# Access shared conversation (no auth needed)
curl http://localhost:5001/api/v1/share/SHARE_ID | jq
```

**Expected:**
- ✅ PDF export generates valid PDF
- ✅ JSON export includes all data
- ✅ Share link works without auth
- ✅ Expiry enforced
- ✅ Access count tracked

---

## PHASE 3: STRESS & LOAD TESTING (Day 2)

### 3.1 Install Artillery
```bash
npm install -g artillery
```

### 3.2 Create Load Test Scenarios

**File: tests/load/chat-load.yml**
```yaml
config:
  target: "http://localhost:5001"
  phases:
    - duration: 60
      arrivalRate: 5
      name: "Warm up"
    - duration: 120
      arrivalRate: 10
      rampTo: 50
      name: "Ramp up load"
    - duration: 300
      arrivalRate: 50
      name: "Sustained load"
  variables:
    authToken: "YOUR_CLERK_TOKEN"

scenarios:
  - name: "Send chat messages"
    flow:
      - post:
          url: "/api/v1/chat/completions"
          headers:
            Authorization: "Bearer {{ authToken }}"
          json:
            message: "What is {{ $randomNumber(1, 100) }} + {{ $randomNumber(1, 100) }}?"
            conversationId: null
            stream: false
          expect:
            - statusCode: 200
```

**File: tests/load/streaming-load.yml**
```yaml
config:
  target: "http://localhost:5001"
  phases:
    - duration: 180
      arrivalRate: 10
      name: "Streaming load"
  variables:
    authToken: "YOUR_CLERK_TOKEN"

scenarios:
  - name: "Streaming chat"
    flow:
      - post:
          url: "/api/v1/chat/completions"
          headers:
            Authorization: "Bearer {{ authToken }}"
          json:
            message: "Write a {{ $randomNumber(50, 200) }} word story"
            conversationId: null
            stream: true
          expect:
            - statusCode: 200
```

### 3.3 Run Load Tests
```bash
# Test 1: Basic chat load
artillery run tests/load/chat-load.yml

# Test 2: Streaming load
artillery run tests/load/streaming-load.yml

# Test 3: Image upload load
artillery run tests/load/image-load.yml

# Test 4: Mixed operations
artillery run tests/load/mixed-load.yml

# Generate HTML report
artillery run tests/load/chat-load.yml --output report.json
artillery report report.json --output report.html
```

### 3.4 Monitor During Load Tests
```bash
# Terminal 1: Watch backend logs
docker logs -f baatcheet-backend

# Terminal 2: Monitor Docker stats
docker stats

# Terminal 3: Monitor Redis
redis-cli INFO stats

# Terminal 4: Monitor PostgreSQL
psql -U postgres -c "SELECT * FROM pg_stat_activity;"
```

**Success Criteria:**
- ✅ 50 concurrent users sustained for 5 minutes
- ✅ Response time p95 < 1 second (non-streaming)
- ✅ Error rate < 1%
- ✅ Memory usage stable (no leaks)
- ✅ CPU usage < 80%
- ✅ No connection pool exhaustion
- ✅ No database deadlocks

---

## PHASE 4: SECURITY TESTING (Day 3)

### 4.1 SQL Injection Tests
```bash
# Test with malicious input
curl -X POST \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "message": "Hello'; DROP TABLE users; --"
  }' \
  http://localhost:5001/api/v1/chat/completions

# Should: Not execute SQL, just treat as string
```

### 4.2 XSS Tests
```bash
# Test with script tags
curl -X POST \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "message": "<script>alert(\"XSS\")</script>"
  }' \
  http://localhost:5001/api/v1/chat/completions

# Should: Sanitize and escape HTML
```

### 4.3 File Upload Security
```bash
# Create malicious file
echo "<?php system($_GET['cmd']); ?>" > malicious.php
mv malicious.php malicious.jpg

# Try to upload
curl -X POST \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -F "file=@malicious.jpg" \
  http://localhost:5001/api/v1/images/upload

# Should: Reject based on content (magic numbers), not extension
```

### 4.4 Rate Limit Testing
```bash
# Spam requests
for i in {1..200}; do
  curl -X POST \
    -H "Authorization: Bearer YOUR_TOKEN" \
    -H "Content-Type: application/json" \
    -d '{"message": "test"}' \
    http://localhost:5001/api/v1/chat/completions &
done

# Should: Return 429 after limit exceeded
```

### 4.5 Authentication Bypass Attempts
```bash
# Try without token
curl http://localhost:5001/api/v1/conversations

# Try with invalid token
curl -H "Authorization: Bearer invalid_token" \
  http://localhost:5001/api/v1/conversations

# Try with expired token
curl -H "Authorization: Bearer EXPIRED_TOKEN" \
  http://localhost:5001/api/v1/conversations

# All should: Return 401 Unauthorized
```

---

## PHASE 5: INTEGRATION TESTING (Day 4)

### 5.1 Complete User Journey Test
```bash
# 1. Register/Login via Clerk
# 2. Create project
# 3. Start conversation
# 4. Send 10 messages
# 5. Upload image
# 6. Ask question about image
# 7. Upload audio
# 8. Transcribe and chat
# 9. Search conversations
# 10. Export to PDF
# 11. Share conversation
# 12. Access shared link
# 13. Create webhook
# 14. Verify webhook delivery
# 15. Generate API key
# 16. Use API key to make request
```

### 5.2 AI Provider Failover Test
```bash
# Exhaust Groq keys (send 14,400 * 14 = 201,600 requests)
# Monitor logs for automatic failover to OpenRouter
# Then exhaust OpenRouter
# Verify failover to DeepSeek
# Then to Gemini
# Then to Hugging Face
```

### 5.3 Context Management Test
```bash
# Send 50 messages in same conversation
# Verify context is maintained
# Check token count doesn't exceed limit
# Verify old messages are pruned
```

---

## PHASE 6: PRODUCTION READINESS (Day 5)

### 6.1 Documentation Check
- [ ] README.md complete with setup instructions
- [ ] API documentation at /api/docs accessible
- [ ] Environment variables documented
- [ ] Deployment guide exists
- [ ] Troubleshooting guide available

### 6.2 Monitoring Setup
- [ ] Sentry configured for error tracking
- [ ] Logs are structured (JSON format)
- [ ] Health check endpoint monitored
- [ ] Alerts configured for critical errors
- [ ] Uptime monitoring (UptimeRobot)

### 6.3 Backup Verification
- [ ] Database backup script exists
- [ ] Backup can be restored successfully
- [ ] File storage has redundancy
- [ ] Redis persistence enabled

### 6.4 Deployment Test
```bash
# Build Docker image
docker build -t baatcheet-backend ./backend

# Run in production mode
docker run -e NODE_ENV=production baatcheet-backend

# Verify no errors in production mode
```

---

## 🎯 TESTING SUMMARY CHECKLIST

### Environment
- [ ] PostgreSQL running and accessible
- [ ] Redis running and accessible
- [ ] Backend server starts without errors
- [ ] All environment variables set
- [ ] Clerk webhook configured

### API Endpoints
- [ ] All endpoints return expected responses
- [ ] Error handling works correctly
- [ ] Rate limiting enforced
- [ ] Authentication required where needed
- [ ] Swagger documentation accessible

### AI Features
- [ ] Chat responses generated successfully
- [ ] Streaming works in real-time
- [ ] Context maintained across messages
- [ ] All 5 AI providers working
- [ ] Automatic failover functioning

### File Handling
- [ ] Images upload successfully
- [ ] OCR extracts text accurately
- [ ] Vision analysis returns results
- [ ] Audio transcription works
- [ ] Files stored permanently

### Performance
- [ ] Handles 50+ concurrent users
- [ ] Response times acceptable
- [ ] Memory usage stable
- [ ] No connection issues under load
- [ ] Database queries optimized

### Security
- [ ] No SQL injection vulnerabilities
- [ ] XSS prevention working
- [ ] File upload security enforced
- [ ] Rate limits prevent abuse
- [ ] Authentication cannot be bypassed

### Integration
- [ ] Complete user journey works end-to-end
- [ ] Webhooks deliver successfully
- [ ] Export generates valid files
- [ ] Share links work correctly
- [ ] API keys authenticate properly

---

## 📊 SUCCESS METRICS

**Backend is Production-Ready if:**
- ✅ All tests pass (100% pass rate)
- ✅ No critical or high severity issues
- ✅ Performance meets targets
- ✅ Security audit clean
- ✅ Documentation complete
- ✅ Load tested successfully

**If any of above fails:** Fix before proceeding to mobile app

---

**Estimated Testing Time:** 3-5 days
**Next Step After Testing:** Deploy to staging environment, then proceed to mobile app development