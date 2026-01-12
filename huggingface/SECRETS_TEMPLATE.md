# 🔐 Hugging Face Repository Secrets Template

Copy each secret name and value to your Hugging Face Space settings.

**Location:** Your Space → Settings → Repository secrets

---

## ⚠️ IMPORTANT

- Add secrets ONE BY ONE
- Names are CASE SENSITIVE
- No quotes around values
- No spaces before/after values

---

## Required Secrets

### Database
```
DATABASE_URL = postgresql://user:password@host:5432/dbname?sslmode=require
```

### Authentication (Clerk)
```
CLERK_SECRET_KEY = sk_test_xxxx
CLERK_PUBLISHABLE_KEY = pk_test_xxxx
CLERK_WEBHOOK_SECRET = whsec_xxxx
```

### JWT
```
JWT_SECRET = your-64-char-random-string-here-make-it-very-long-and-random
```

---

## AI Provider Secrets

### Groq (Primary Chat)
```
GROQ_API_KEY_1 = gsk_xxxx
GROQ_API_KEY_2 = gsk_xxxx
GROQ_API_KEY_3 = gsk_xxxx
```

### OpenRouter (Backup)
```
OPENROUTER_API_KEY_1 = sk-or-xxxx
```

### DeepSeek (Backup)
```
DEEPSEEK_API_KEY_1 = sk-xxxx
```

### Hugging Face
```
HUGGINGFACE_API_KEY_1 = hf_xxxx
```

### Google Gemini (Vision)
```
GEMINI_API_KEY_1 = AIza_xxxx
GEMINI_API_KEY_2 = AIza_xxxx
GEMINI_API_KEY_3 = AIza_xxxx
```

---

## Web Search Secrets

### Brave Search
```
BRAVE_SEARCH_KEY_1 = BSAxxxx
BRAVE_SEARCH_KEY_2 = BSAxxxx
```

### SerpAPI
```
SERPAPI_KEY = xxxx
```

---

## Text-to-Speech (ElevenLabs)

```
ELEVENLABS_API_KEY_1 = sk_xxxx
ELEVENLABS_API_KEY_2 = sk_xxxx
ELEVENLABS_API_KEY_3 = sk_xxxx
ELEVENLABS_API_KEY_4 = sk_xxxx
ELEVENLABS_API_KEY_5 = sk_xxxx
ELEVENLABS_API_KEY_6 = sk_xxxx
```

---

## OCR Service

```
OCR_SPACE_API_KEY_1 = Kxxxx
```

---

## Environment

```
NODE_ENV = production
PORT = 7860
```

---

## Checklist

Before deploying, ensure you have added:

- [ ] DATABASE_URL
- [ ] CLERK_SECRET_KEY
- [ ] CLERK_PUBLISHABLE_KEY
- [ ] JWT_SECRET
- [ ] At least 1 GROQ_API_KEY
- [ ] At least 1 ELEVENLABS_API_KEY (for TTS)
- [ ] At least 1 BRAVE_SEARCH_KEY (for web search)
- [ ] At least 1 GEMINI_API_KEY (for vision)

---

## Quick Copy Format

For bulk adding (if your tool supports it):

```
DATABASE_URL=postgresql://...
CLERK_SECRET_KEY=sk_test_...
CLERK_PUBLISHABLE_KEY=pk_test_...
JWT_SECRET=random64chars...
NODE_ENV=production
PORT=7860
GROQ_API_KEY_1=gsk_...
ELEVENLABS_API_KEY_1=sk_...
BRAVE_SEARCH_KEY_1=BSA...
GEMINI_API_KEY_1=AIza...
```
