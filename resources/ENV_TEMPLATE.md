# Environment Variables Template

Copy the content below to your `backend/.env` file.

## ⚠️ SECURITY NOTICE
- NEVER commit `.env` files to Git
- The `.gitignore` already excludes `.env` files
- Only share this template, never actual keys

---

```env
# ===========================================
# BaatCheet Backend Environment Variables
# ===========================================

# Server Configuration
NODE_ENV=development
PORT=5001

# Database
DATABASE_URL=postgresql://user:password@localhost:5432/baatcheet?schema=public

# Redis (optional)
REDIS_URL=redis://localhost:6379

# ===========================================
# CLERK AUTHENTICATION
# ===========================================
CLERK_PUBLISHABLE_KEY=pk_test_xxxx
CLERK_SECRET_KEY=sk_test_xxxx
CLERK_WEBHOOK_SECRET=whsec_xxxx

# ===========================================
# AI PROVIDERS - GROQ (Primary Chat)
# ===========================================
GROQ_API_KEY_1=gsk_xxxx
GROQ_API_KEY_2=gsk_xxxx

# ===========================================
# AI PROVIDERS - OPENROUTER (Backup)
# ===========================================
OPENROUTER_API_KEY_1=sk-or-xxxx

# ===========================================
# AI PROVIDERS - DEEPSEEK (Backup)
# ===========================================
DEEPSEEK_API_KEY_1=sk-xxxx

# ===========================================
# AI PROVIDERS - HUGGING FACE
# ===========================================
HUGGINGFACE_API_KEY_1=hf_xxxx

# ===========================================
# AI PROVIDERS - GOOGLE GEMINI (Vision)
# ===========================================
GEMINI_API_KEY_1=AIza_xxxx
GEMINI_API_KEY_2=AIza_xxxx
GEMINI_API_KEY_3=AIza_xxxx

# ===========================================
# OCR SERVICE
# ===========================================
OCR_SPACE_API_KEY_1=K_xxxx

# ===========================================
# WEB SEARCH PROVIDERS
# ===========================================
BRAVE_SEARCH_KEY=BSA_xxxx
SERPAPI_KEY=xxxx

# ===========================================
# TEXT-TO-SPEECH - ELEVENLABS (Multi-Key)
# ===========================================
# Free tier: 10,000 chars/month per account
# Use multiple accounts for higher limits
ELEVENLABS_API_KEY_1=sk_xxxx
ELEVENLABS_API_KEY_2=sk_xxxx
ELEVENLABS_API_KEY_3=sk_xxxx
ELEVENLABS_API_KEY_4=sk_xxxx
ELEVENLABS_API_KEY_5=sk_xxxx

# ===========================================
# TEXT-TO-SPEECH - ALTERNATIVES
# ===========================================
OPENAI_API_KEY=sk-xxxx
GOOGLE_CLOUD_TTS_KEY=xxxx

# ===========================================
# LEGACY AUTH
# ===========================================
JWT_SECRET=your-super-secret-jwt-key
JWT_EXPIRES_IN=7d

# ===========================================
# RATE LIMITING
# ===========================================
RATE_LIMIT_WINDOW_MS=900000
RATE_LIMIT_MAX_REQUESTS=100

# ===========================================
# LOGGING
# ===========================================
LOG_LEVEL=debug

# ===========================================
# AI CONFIGURATION
# ===========================================
DEFAULT_MODEL=llama-3.3-70b-versatile
MAX_CONTEXT_MESSAGES=50
MAX_TOKENS=8000
```

---

## API Key Sources

| Provider | Free Tier | Get Key |
|----------|-----------|---------|
| Groq | 14,400 req/day | https://console.groq.com |
| OpenRouter | 200 req/day | https://openrouter.ai |
| DeepSeek | 1000 req/day | https://platform.deepseek.com |
| Hugging Face | 1000 req/day | https://huggingface.co/settings/tokens |
| Google Gemini | 1500 req/day | https://makersuite.google.com |
| OCR.space | 500 req/day | https://ocr.space/ocrapi |
| Brave Search | 2000/month | https://api.search.brave.com |
| SerpAPI | 100/month | https://serpapi.com |
| ElevenLabs | 10k chars/month | https://elevenlabs.io |
| OpenAI | Paid | https://platform.openai.com |
| Google Cloud TTS | 1M chars/month | https://cloud.google.com |
