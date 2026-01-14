# 🚀 BaatCheet Backend Deployment to HuggingFace Spaces

## Complete Step-by-Step Guide

This guide will help you deploy the BaatCheet backend to HuggingFace Spaces with all your environment variables automatically configured.

---

## 📋 Prerequisites

1. HuggingFace account (free): https://huggingface.co/join
2. Python 3.8+ installed
3. Git installed

---

## Step 1: Create a Free Cloud Database (Required)

HuggingFace Spaces doesn't provide PostgreSQL, so you need a free cloud database.

### Option A: Neon (Recommended - Easiest)

1. Go to https://neon.tech
2. Sign up (free tier: 0.5GB storage, enough for this app)
3. Create a new project named "baatcheet"
4. Copy the connection string (looks like):
   ```
   postgresql://username:password@ep-xxx.region.aws.neon.tech/baatcheet?sslmode=require
   ```
5. **Save this URL** - you'll need it in Step 4

### Option B: Supabase

1. Go to https://supabase.com
2. Create a new project
3. Go to Settings → Database → Connection string
4. Copy the URI (change `[YOUR-PASSWORD]` to your actual password)

---

## Step 2: Create HuggingFace Space

1. Go to https://huggingface.co/new-space
2. Fill in:
   - **Owner**: Your username (sharry121)
   - **Space name**: BaatChhet
   - **License**: MIT
   - **Select SDK**: Docker
   - **Choose a Docker template**: Blank
   - **Hardware**: CPU Basic (free)
   - **Visibility**: Public (or Private if you prefer)
3. Click **Create Space**

---

## Step 3: Install HuggingFace CLI & Login

Open Terminal and run:

```bash
# Install huggingface_hub
pip install huggingface_hub

# Login to HuggingFace (this will open a browser)
huggingface-cli login
```

When prompted, create a token at https://huggingface.co/settings/tokens with **write** permissions.

---

## Step 4: Set All Environment Variables Automatically

This is where the magic happens! Run the Python script to set all 60+ secrets at once:

```bash
cd /Users/muhammadsharjeel/Documents/BaatCheet/backend

# Run the setup script
python scripts/setup_huggingface.py
```

This will automatically set all your API keys (GROQ, OpenRouter, DeepSeek, Gemini, etc.)

### Set Database URL Manually

After running the script, you need to add your database URL:

**Option A: Via CLI**
```bash
huggingface-cli repo-settings set-secret sharry121/BaatChhet DATABASE_URL "postgresql://your-neon-connection-string" --repo-type space
```

**Option B: Via Web UI**
1. Go to https://huggingface.co/spaces/sharry121/BaatChhet/settings
2. Scroll to "Repository secrets"
3. Add new secret:
   - Name: `DATABASE_URL`
   - Value: Your Neon/Supabase connection string

---

## Step 5: Push Backend Code to HuggingFace

```bash
# Clone your space (this creates a new folder)
cd /Users/muhammadsharjeel/Documents/BaatCheet
git clone https://huggingface.co/spaces/sharry121/BaatChhet huggingface-space

# Copy backend files to the space
cp -r backend/src huggingface-space/
cp -r backend/prisma huggingface-space/
cp backend/package.json huggingface-space/
cp backend/package-lock.json huggingface-space/
cp backend/tsconfig.json huggingface-space/
cp backend/huggingface/Dockerfile huggingface-space/Dockerfile
cp backend/huggingface/README.md huggingface-space/README.md

# Push to HuggingFace
cd huggingface-space
git add .
git commit -m "Deploy BaatCheet Backend"
git push
```

---

## Step 6: Initialize Database Schema

After the space is running, you need to run Prisma migrations. 

**Option A: Add to Dockerfile (Recommended)**

The Dockerfile already handles this, but if you need to run manually:

1. Go to your space: https://huggingface.co/spaces/sharry121/BaatChhet
2. Click on "Files" → edit Dockerfile
3. Add before the CMD line:
   ```dockerfile
   RUN npx prisma db push --skip-generate
   ```

**Option B: Run locally against cloud database**
```bash
cd /Users/muhammadsharjeel/Documents/BaatCheet/backend
DATABASE_URL="your-neon-connection-string" npx prisma db push
```

---

## Step 7: Update Mobile Apps with Production URL

Once deployed, your API will be at:
```
https://sharry121-baatchhet.hf.space/api/v1
```

### Update iOS:

Edit `/IOS/iOSBaseProject/Network/ClerkAuthService.swift`:
```swift
struct APIConfig {
    #if DEBUG
    static let baseURL = "http://192.168.18.110:5001/api/v1"  // Local dev
    #else
    static let baseURL = "https://sharry121-baatchhet.hf.space/api/v1"  // Production
    #endif
    
    static let mobileAuthURL = "\(baseURL)/mobile/auth"
}
```

### Update Android:

Edit `/android/app/src/main/java/com/baatcheet/app/ui/login/ClerkAuthService.kt`:
```kotlin
object APIConfig {
    // For production, use HuggingFace Spaces URL
    const val BASE_URL = "https://sharry121-baatchhet.hf.space/api/v1"
    const val MOBILE_AUTH_URL = "$BASE_URL/mobile/auth"
}
```

---

## Step 8: Test the Deployment

1. Wait for the space to build (check logs at https://huggingface.co/spaces/sharry121/BaatChhet/logs)
2. Test the health endpoint:
   ```bash
   curl https://sharry121-baatchhet.hf.space/health
   ```
3. Test the API:
   ```bash
   curl https://sharry121-baatchhet.hf.space/api/v1/health
   ```

---

## 🔧 Troubleshooting

### Build Failed
- Check the build logs for errors
- Ensure Dockerfile is correct
- Verify all files are present

### Database Connection Error
- Verify DATABASE_URL is set correctly in secrets
- Ensure the database exists and is accessible
- Check if SSL is required (`?sslmode=require`)

### API Not Responding
- Check if the space is running (green status)
- View logs for any startup errors
- Ensure PORT is set to 7860

### Secrets Not Working
- Secrets are only available at runtime, not build time
- Restart the space after adding secrets

---

## 📊 Expected Costs

- **HuggingFace Spaces**: FREE (CPU Basic)
- **Neon PostgreSQL**: FREE (0.5GB tier)
- **Total**: $0/month

---

## 🔐 Security Notes

1. All secrets are encrypted in HuggingFace
2. Never commit `.env` files to git
3. Use production Clerk keys for production deployment
4. Consider using a separate database for production

---

## Quick Reference

| Service | URL |
|---------|-----|
| HuggingFace Space | https://huggingface.co/spaces/sharry121/BaatChhet |
| API Base | https://sharry121-baatchhet.hf.space/api/v1 |
| Health Check | https://sharry121-baatchhet.hf.space/health |
| API Docs | https://sharry121-baatchhet.hf.space/api/docs |
| Logs | https://huggingface.co/spaces/sharry121/BaatChhet/logs |

---

## Files Created

- `backend/scripts/setup_huggingface.py` - Auto-sets all 60+ secrets
- `backend/scripts/setup-huggingface-secrets.sh` - Shell script alternative
- `backend/huggingface/Dockerfile` - Docker configuration for HF Spaces
- `backend/huggingface/README.md` - Space metadata
