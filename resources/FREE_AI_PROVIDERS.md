# 🆓 Free AI API Providers Guide

This guide lists all FREE AI API providers you can use with BaatCheet for maximum availability and load balancing.

---

## 📊 Provider Comparison

| Provider | Free Tier | Models | Speed | Best For |
|----------|-----------|--------|-------|----------|
| **Groq** | 14,400 req/day/key | Llama 3.3, 4 | ⚡ Fastest | Primary use |
| **DeepSeek** | Free tier | DeepSeek Chat | 🚀 Fast | Backup |
| **OpenRouter** | $5 free credit | 100+ models | 🚀 Fast | Variety |
| **Hugging Face** | Free tier | Open source | 🔄 Variable | Experimentation |
| **Mistral AI** | Free tier | Mistral models | 🚀 Fast | European users |
| **Cohere** | 100 req/min free | Command models | 🚀 Fast | Text tasks |
| **Puter.js** | Unlimited | GPT-4o, o1 | 🔄 Variable | Last resort |

---

## 1️⃣ Groq (RECOMMENDED - Already Setup)

**Status:** ✅ Already configured with 14 keys

**Your Capacity:**
- 14 keys × 14,400 requests = **201,600 requests/day**
- That's ~140 requests per minute!

**Models Available:**
- `llama-3.3-70b-versatile` (Default)
- `meta-llama/llama-4-scout-17b-16e-instruct`
- `meta-llama/llama-4-maverick-17b-128e-instruct`
- `groq/compound`

---

## 2️⃣ OpenRouter (HIGHLY RECOMMENDED)

**Why:** Access to 100+ models through ONE API!

### How to Get API Key:

1. **Go to:** https://openrouter.ai/

2. **Sign Up:**
   - Click "Get Started"
   - Sign in with Google/GitHub

3. **Get Free Credits:**
   - New accounts get **$5 free credit**
   - Some models are completely free

4. **Create API Key:**
   - Go to https://openrouter.ai/keys
   - Click "Create Key"
   - Copy the key (starts with `sk-or-`)

5. **Add to .env:**
   ```env
   OPENROUTER_API_KEY=sk-or-v1-xxxxxxxxxxxxx
   ```

### Free Models on OpenRouter:
```
meta-llama/llama-3.2-3b-instruct:free
google/gemma-2-9b-it:free
mistralai/mistral-7b-instruct:free
qwen/qwen-2-7b-instruct:free
```

---

## 3️⃣ Hugging Face Inference API

**Why:** Access to thousands of open-source models

### How to Get API Key:

1. **Go to:** https://huggingface.co/

2. **Sign Up:**
   - Create free account
   - Verify email

3. **Get Token:**
   - Go to https://huggingface.co/settings/tokens
   - Click "New token"
   - Select "Read" access
   - Copy the token (starts with `hf_`)

4. **Add to .env:**
   ```env
   HUGGINGFACE_API_KEY=hf_xxxxxxxxxxxxx
   ```

### Free Tier Limits:
- Rate limited but generous
- Access to all public models
- Some models have queues

### Popular Free Models:
```
meta-llama/Llama-3.2-3B-Instruct
mistralai/Mistral-7B-Instruct-v0.3
google/gemma-2-9b-it
Qwen/Qwen2.5-7B-Instruct
```

---

## 4️⃣ Mistral AI

**Why:** High-quality European AI models

### How to Get API Key:

1. **Go to:** https://console.mistral.ai/

2. **Sign Up:**
   - Create account
   - Verify email

3. **Get API Key:**
   - Go to API Keys section
   - Create new key
   - Copy it

4. **Add to .env:**
   ```env
   MISTRAL_API_KEY=xxxxxxxxxxxxx
   ```

### Free Tier:
- Limited free requests
- Access to Mistral 7B, Mixtral

---

## 5️⃣ Cohere

**Why:** Excellent for text generation and embeddings

### How to Get API Key:

1. **Go to:** https://dashboard.cohere.com/

2. **Sign Up:**
   - Create free account

3. **Get API Key:**
   - Go to API Keys
   - Copy trial key

4. **Add to .env:**
   ```env
   COHERE_API_KEY=xxxxxxxxxxxxx
   ```

### Free Tier:
- 100 requests/minute
- Access to Command models

---

## 6️⃣ Puter.js (Client-Side - Always Free)

**Why:** Unlimited, runs in browser

**Note:** This is a client-side solution, not server API.

### How to Use:

```javascript
// In frontend code
<script src="https://js.puter.com/v2/"></script>

const response = await puter.ai.chat("Hello!");
```

### Models Available:
- GPT-4o
- GPT-4
- Claude 3.5
- o1-mini

---

## 7️⃣ Google AI Studio (Gemini)

**Why:** Access to Gemini models

### How to Get API Key:

1. **Go to:** https://aistudio.google.com/

2. **Sign in** with Google account

3. **Get API Key:**
   - Click "Get API Key"
   - Create in new project
   - Copy the key

4. **Add to .env:**
   ```env
   GOOGLE_AI_API_KEY=xxxxxxxxxxxxx
   ```

### Free Tier:
- 60 requests/minute
- Gemini Pro, Gemini Flash

---

## 🔄 Recommended Provider Priority

For BaatCheet, use this failover order:

```
1. Groq (14 keys) → Primary, fastest
2. OpenRouter → Many models, good speed  
3. DeepSeek → Good backup
4. Hugging Face → Open source models
5. Puter.js → Last resort (client-side)
```

---

## 📝 Complete .env Example with All Providers

```env
# ============================================
# AI Provider API Keys
# ============================================

# Groq (Primary - 14 keys)
GROQ_API_KEY_1=gsk_xxx
GROQ_API_KEY_2=gsk_xxx
# ... up to GROQ_API_KEY_14

# DeepSeek (Backup)
DEEPSEEK_API_KEY_1=sk-xxx
DEEPSEEK_API_KEY_2=sk-xxx

# OpenRouter (100+ models)
OPENROUTER_API_KEY=sk-or-v1-xxx

# Hugging Face (Open source)
HUGGINGFACE_API_KEY=hf_xxx

# Mistral AI
MISTRAL_API_KEY=xxx

# Cohere
COHERE_API_KEY=xxx

# Google AI (Gemini)
GOOGLE_AI_API_KEY=xxx
```

---

## 💡 Tips for Maximum Free Usage

1. **Use multiple Groq accounts** - Create more keys
2. **Rotate providers** - Don't exhaust one provider
3. **Cache responses** - Reduce API calls
4. **Use smaller models** for simple tasks
5. **Implement retry logic** for rate limits

---

## 🚀 Quick Setup Commands

### Get OpenRouter Key:
```bash
# After getting key from https://openrouter.ai/keys
echo 'OPENROUTER_API_KEY=sk-or-v1-xxx' >> backend/.env
```

### Get Hugging Face Key:
```bash
# After getting key from https://huggingface.co/settings/tokens
echo 'HUGGINGFACE_API_KEY=hf_xxx' >> backend/.env
```

---

## 📊 Your Current Capacity

With your 14 Groq keys:

| Metric | Value |
|--------|-------|
| Daily Requests | 201,600 |
| Requests/Hour | 8,400 |
| Requests/Minute | 140 |
| Tokens/Day | ~800 million |

**This is MORE than enough for a production app!**
