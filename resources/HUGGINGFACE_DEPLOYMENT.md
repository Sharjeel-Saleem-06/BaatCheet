# 🚀 BaatCheet - Hugging Face Spaces Deployment Guide

Complete step-by-step guide to deploy BaatCheet backend on Hugging Face Spaces (FREE).

---

## 📋 Table of Contents

1. [Prerequisites](#prerequisites)
2. [Create Hugging Face Account](#step-1-create-hugging-face-account)
3. [Create a New Space](#step-2-create-a-new-space)
4. [Configure Repository Secrets](#step-3-configure-repository-secrets)
5. [Prepare Deployment Files](#step-4-prepare-deployment-files)
6. [Push to Hugging Face](#step-5-push-to-hugging-face)
7. [Database Setup](#step-6-database-setup)
8. [Verify Deployment](#step-7-verify-deployment)
9. [Connect Frontend](#step-8-connect-frontend)
10. [Troubleshooting](#troubleshooting)

---

## Prerequisites

Before starting, ensure you have:

- [ ] Hugging Face account (free)
- [ ] Git installed on your machine
- [ ] All API keys ready (Groq, ElevenLabs, etc.)
- [ ] PostgreSQL database (we'll use free options)

---

## Step 1: Create Hugging Face Account

1. Go to [https://huggingface.co/join](https://huggingface.co/join)
2. Sign up with email or GitHub
3. Verify your email
4. Go to Settings → Access Tokens
5. Create a new token with **write** access
6. Save the token securely (starts with `hf_`)

```bash
# Set your token locally
export HF_TOKEN=hf_your_token_here
```

---

## Step 2: Create a New Space

1. Go to [https://huggingface.co/new-space](https://huggingface.co/new-space)

2. Fill in the details:
   - **Owner**: Your username
   - **Space name**: `baatcheet-backend`
   - **License**: MIT
   - **SDK**: Docker
   - **Hardware**: CPU basic (free)
   - **Visibility**: Private (recommended for API keys)

3. Click "Create Space"

---

## Step 3: Configure Repository Secrets

This is **CRITICAL** for security. Never commit API keys!

1. Go to your Space → Settings → Repository secrets

2. Add each secret one by one:

### Required Secrets:

| Secret Name | Value | Description |
|-------------|-------|-------------|
| `DATABASE_URL` | `postgresql://...` | PostgreSQL connection string |
| `CLERK_SECRET_KEY` | `sk_test_...` | Clerk authentication |
| `CLERK_PUBLISHABLE_KEY` | `pk_test_...` | Clerk public key |

### AI Provider Secrets:

| Secret Name | Value |
|-------------|-------|
| `GROQ_API_KEY_1` | `gsk_...` |
| `GROQ_API_KEY_2` | `gsk_...` |
| `OPENROUTER_API_KEY_1` | `sk-or-...` |
| `DEEPSEEK_API_KEY_1` | `sk-...` |
| `GEMINI_API_KEY_1` | `AIza...` |
| `HUGGINGFACE_API_KEY_1` | `hf_...` |

### Web Search Secrets:

| Secret Name | Value |
|-------------|-------|
| `BRAVE_SEARCH_KEY_1` | `BSA...` |
| `BRAVE_SEARCH_KEY_2` | `BSA...` |
| `SERPAPI_KEY` | `...` |

### ElevenLabs TTS Secrets (6 keys = 60k chars/month FREE):

| Secret Name | Value |
|-------------|-------|
| `ELEVENLABS_API_KEY_1` | `sk_...` |
| `ELEVENLABS_API_KEY_2` | `sk_...` |
| `ELEVENLABS_API_KEY_3` | `sk_...` |
| `ELEVENLABS_API_KEY_4` | `sk_...` |
| `ELEVENLABS_API_KEY_5` | `sk_...` |
| `ELEVENLABS_API_KEY_6` | `sk_...` |

### OCR Secrets:

| Secret Name | Value |
|-------------|-------|
| `OCR_SPACE_API_KEY_1` | `K...` |

### Other Secrets:

| Secret Name | Value |
|-------------|-------|
| `JWT_SECRET` | Random 64-char string |
| `NODE_ENV` | `production` |

---

## Step 4: Prepare Deployment Files

### 4.1 Copy Dockerfile to root

```bash
cp huggingface/Dockerfile ./Dockerfile
```

### 4.2 Create .dockerignore

```bash
cat > .dockerignore << 'EOF'
node_modules
.git
.env
.env.*
*.log
coverage
.nyc_output
dist
frontend
resources
tests
*.md
!README.md
EOF
```

### 4.3 Update package.json build script

Ensure `backend/package.json` has:

```json
{
  "scripts": {
    "build": "tsc",
    "start": "node dist/index.js"
  }
}
```

---

## Step 5: Push to Hugging Face

### 5.1 Clone your Space (first time only)

```bash
# Clone the empty space
git clone https://huggingface.co/spaces/YOUR_USERNAME/baatcheet-backend hf-deploy
cd hf-deploy
```

### 5.2 Copy necessary files

```bash
# From your BaatCheet directory
cp -r backend/src ./src/
cp -r backend/prisma ./prisma/
cp backend/package*.json ./
cp backend/tsconfig.json ./
cp huggingface/Dockerfile ./Dockerfile
cp huggingface/README.md ./README.md
```

### 5.3 Push to Hugging Face

```bash
git add .
git commit -m "Deploy BaatCheet backend"
git push
```

### 5.4 Alternative: Use Hugging Face CLI

```bash
# Install CLI
pip install huggingface_hub

# Login
huggingface-cli login

# Upload
huggingface-cli upload YOUR_USERNAME/baatcheet-backend . --repo-type space
```

---

## Step 6: Database Setup

### Option A: Neon (Recommended - FREE)

1. Go to [https://neon.tech](https://neon.tech)
2. Sign up (free tier: 0.5GB storage)
3. Create a new project
4. Copy the connection string
5. Add to Hugging Face secrets as `DATABASE_URL`

```
postgresql://user:password@ep-xxx.us-east-2.aws.neon.tech/neondb?sslmode=require
```

### Option B: Supabase (FREE)

1. Go to [https://supabase.com](https://supabase.com)
2. Create new project
3. Go to Settings → Database
4. Copy connection string (use "Connection pooling" URL)

### Option C: Railway (FREE tier available)

1. Go to [https://railway.app](https://railway.app)
2. Create PostgreSQL database
3. Copy connection string

### Run Migrations

After setting up database, SSH into your Space or run locally:

```bash
npx prisma db push
```

---

## Step 7: Verify Deployment

### 7.1 Check Space Logs

1. Go to your Space
2. Click "Logs" tab
3. Look for:
   ```
   🚀 BaatCheet API running on port 7860
   ✅ PostgreSQL connected successfully
   ```

### 7.2 Test Health Endpoint

```bash
curl https://YOUR_USERNAME-baatcheet-backend.hf.space/api/v1/health
```

Expected response:
```json
{
  "status": "healthy",
  "timestamp": "2026-01-12T...",
  "version": "1.0.0",
  "environment": "production"
}
```

### 7.3 Test Chat Endpoint (with auth)

```bash
curl -X POST https://YOUR_USERNAME-baatcheet-backend.hf.space/api/v1/chat/completions \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer YOUR_CLERK_TOKEN" \
  -d '{"message": "Hello!"}'
```

---

## Step 8: Connect Frontend

Update your frontend `.env`:

```env
VITE_API_URL=https://YOUR_USERNAME-baatcheet-backend.hf.space
```

Or in `frontend/src/services/api.ts`:

```typescript
const API_BASE_URL = import.meta.env.PROD 
  ? 'https://YOUR_USERNAME-baatcheet-backend.hf.space/api/v1'
  : 'http://localhost:5001/api/v1';
```

---

## Troubleshooting

### Build Fails

1. Check Dockerfile syntax
2. Ensure all dependencies are in package.json
3. Check Space logs for specific errors

### Database Connection Fails

1. Verify DATABASE_URL is correct
2. Ensure SSL is enabled (`?sslmode=require`)
3. Check if IP is whitelisted (Neon auto-allows)

### API Keys Not Working

1. Verify secrets are named correctly (case-sensitive)
2. Check for extra spaces in values
3. Restart Space after adding secrets

### Space Keeps Restarting

1. Check memory usage (free tier: 16GB)
2. Look for infinite loops in logs
3. Ensure health check passes

### CORS Errors

Add your frontend domain to CORS config in `backend/src/index.ts`:

```typescript
app.use(cors({
  origin: [
    'http://localhost:3000',
    'https://your-frontend.vercel.app',
    'https://your-frontend.netlify.app'
  ],
  credentials: true
}));
```

---

## 📊 Free Tier Limits

| Service | Free Limit |
|---------|------------|
| Hugging Face Spaces | 2 vCPU, 16GB RAM |
| Neon PostgreSQL | 0.5GB storage |
| Groq API | 14,400 req/day |
| ElevenLabs (6 keys) | 60k chars/month |
| Brave Search (2 keys) | 4,000 searches/month |
| OCR.space | 500 req/day |

---

## 🔒 Security Checklist

- [ ] All API keys in Repository Secrets (not in code)
- [ ] Space is set to Private
- [ ] DATABASE_URL uses SSL
- [ ] JWT_SECRET is random 64+ chars
- [ ] CORS configured for specific domains
- [ ] Rate limiting enabled
- [ ] Input sanitization active

---

## 📝 Quick Commands Reference

```bash
# Clone Space
git clone https://huggingface.co/spaces/USERNAME/baatcheet-backend

# Push changes
git add . && git commit -m "Update" && git push

# View logs
# Go to Space → Logs tab

# Restart Space
# Go to Space → Settings → Factory reboot

# Run Prisma migrations
npx prisma db push

# Generate Prisma client
npx prisma generate
```

---

## 🎉 Deployment Complete!

Your backend is now live at:
```
https://YOUR_USERNAME-baatcheet-backend.hf.space
```

API Base URL:
```
https://YOUR_USERNAME-baatcheet-backend.hf.space/api/v1
```

---

## Next Steps

1. ✅ Backend deployed on Hugging Face
2. 🔜 Deploy frontend to Vercel/Netlify
3. 🔜 Configure custom domain (optional)
4. 🔜 Set up monitoring (optional)
