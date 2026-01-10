# 🔑 API Keys Guide for BaatCheet

This guide explains all the API keys needed for BaatCheet and how to obtain them.

---

## 📋 Required API Keys Summary

| Provider | Required? | Free Tier | Purpose |
|----------|-----------|-----------|---------|
| **Groq** | ✅ YES | 14,400 req/day per key | Primary AI provider |
| Together AI | Optional | $25 credit | Backup provider |
| DeepSeek | Optional | Free tier | Second backup |
| OCR.space | Optional | 500 req/day | Image text extraction |

---

## 1️⃣ Groq API Keys (REQUIRED)

Groq is the **primary AI provider** - you need at least 1 key.

### How to Get Groq API Keys:

1. **Go to Groq Console:**
   ```
   https://console.groq.com/
   ```

2. **Sign Up / Login:**
   - Click "Sign Up" or "Log In"
   - Use Google, GitHub, or email

3. **Create API Key:**
   - Go to "API Keys" in the sidebar
   - Click "Create API Key"
   - Give it a name (e.g., "BaatCheet-Key-1")
   - Copy the key (starts with `gsk_`)

4. **Get Multiple Keys (Recommended):**
   - You can create up to **10 keys per account**
   - Each key gets **14,400 requests/day**
   - 10 keys = **144,000 requests/day FREE**

5. **Add to .env file:**
   ```env
   GROQ_API_KEY_1=gsk_xxxxxxxxxxxxxxxxxxxxx
   GROQ_API_KEY_2=gsk_xxxxxxxxxxxxxxxxxxxxx
   GROQ_API_KEY_3=gsk_xxxxxxxxxxxxxxxxxxxxx
   # ... up to GROQ_API_KEY_10
   ```

### Groq Free Tier Limits:
- **Requests:** ~14,400 per day per key
- **Tokens:** 6,000 tokens/minute
- **Models:** llama-3.1-70b-versatile, llama-3.1-8b, mixtral-8x7b

---

## 2️⃣ Together AI API Key (Optional - Backup)

Together AI is the **first backup** when Groq is exhausted.

### How to Get Together AI Key:

1. **Go to Together AI:**
   ```
   https://api.together.xyz/
   ```

2. **Sign Up:**
   - Click "Get Started"
   - Create account with email or Google

3. **Get API Key:**
   - Go to Settings → API Keys
   - Click "Create API Key"
   - Copy the key

4. **Add to .env file:**
   ```env
   TOGETHER_API_KEY=your_together_api_key_here
   ```

### Together AI Free Tier:
- **$25 free credit** on signup
- Models: Meta-Llama-3.1-70B-Instruct-Turbo
- Good speed (100+ tokens/sec)

---

## 3️⃣ DeepSeek API Key (Optional - Backup)

DeepSeek is the **second backup** provider.

### How to Get DeepSeek Key:

1. **Go to DeepSeek Platform:**
   ```
   https://platform.deepseek.com/
   ```

2. **Sign Up:**
   - Create account
   - Verify email

3. **Get API Key:**
   - Go to API Keys section
   - Create new key
   - Copy it

4. **Add to .env file:**
   ```env
   DEEPSEEK_API_KEY=your_deepseek_api_key_here
   ```

### DeepSeek Free Tier:
- Free developer access
- Model: deepseek-chat
- 4096 token context

---

## 4️⃣ OCR.space API Key (Optional - Phase 2)

For image text extraction (OCR).

### How to Get OCR.space Key:

1. **Go to OCR.space:**
   ```
   https://ocr.space/ocrapi
   ```

2. **Get Free API Key:**
   - Scroll down to "Free OCR API"
   - Enter your email
   - You'll receive the key via email

3. **Add to .env file:**
   ```env
   OCR_SPACE_API_KEY=your_ocr_space_key_here
   ```

### OCR.space Free Tier:
- 500 requests/day
- Supports 60+ languages including Urdu
- JPG, PNG, PDF formats

---

## 📝 Complete .env Example

```env
# Server Configuration
NODE_ENV=development
PORT=5001
API_VERSION=v1

# PostgreSQL Database
DATABASE_URL="postgresql://baatcheet_user:BaatCheet2024Secure!@localhost:5432/baatcheet?schema=public"

# Redis (optional)
REDIS_URL=redis://localhost:6379

# JWT Configuration
JWT_SECRET=your-super-secret-jwt-key-change-in-production-minimum-32-chars
JWT_EXPIRES_IN=7d

# ============================================
# AI Provider API Keys
# ============================================

# Groq API Keys (REQUIRED - at least 1)
GROQ_API_KEY_1=gsk_your_actual_groq_key_1
GROQ_API_KEY_2=gsk_your_actual_groq_key_2
GROQ_API_KEY_3=gsk_your_actual_groq_key_3
GROQ_API_KEY_4=gsk_your_actual_groq_key_4
GROQ_API_KEY_5=gsk_your_actual_groq_key_5
GROQ_API_KEY_6=gsk_your_actual_groq_key_6
GROQ_API_KEY_7=gsk_your_actual_groq_key_7
GROQ_API_KEY_8=gsk_your_actual_groq_key_8
GROQ_API_KEY_9=gsk_your_actual_groq_key_9
GROQ_API_KEY_10=gsk_your_actual_groq_key_10

# Together AI (Optional - Backup)
TOGETHER_API_KEY=your_together_api_key

# DeepSeek (Optional - Backup)
DEEPSEEK_API_KEY=your_deepseek_api_key

# OCR.space (Optional - for image text extraction)
OCR_SPACE_API_KEY=your_ocr_space_api_key

# Rate Limiting
RATE_LIMIT_WINDOW_MS=900000
RATE_LIMIT_MAX_REQUESTS=100

# Logging
LOG_LEVEL=debug

# AI Model Configuration
DEFAULT_MODEL=llama-3.1-70b-versatile
MAX_CONTEXT_MESSAGES=50
MAX_TOKENS=8000
```

---

## ✅ Quick Start Checklist

1. [ ] Create Groq account at https://console.groq.com/
2. [ ] Create at least 1 Groq API key
3. [ ] (Optional) Create 9 more Groq keys for load balancing
4. [ ] Copy keys to `.env` file
5. [ ] Restart the backend server
6. [ ] Test chat endpoint

---

## 🔒 Security Notes

- **NEVER** commit `.env` file to Git
- **NEVER** expose API keys in frontend code
- Rotate keys if compromised
- Use different keys for development/production
