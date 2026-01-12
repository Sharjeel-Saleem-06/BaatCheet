# 🏷️ BaatCheet Chat Tags & Image Generation Guide

## Overview

BaatCheet features an advanced tagging system that allows users to unlock special capabilities by using specific tags in their messages. This system includes:

- **Web Search** - Real-time information from the web
- **Image Generation** - AI-powered image creation (with daily limits)
- **Code Mode** - Optimized code responses
- **Math Mode** - Step-by-step mathematical solutions
- **And more...**

## Available Tags

### 🌐 @browse / @search
Search the web for real-time information.

**Usage:**
```
@browse latest news about AI
@search what is the weather in New York
@web current stock price of Apple
```

**Features:**
- Uses Brave Search and SerpAPI
- Provides source citations
- Filters by date (day, week, month)

### 🖼️ @image / @generate
Generate AI images from text descriptions.

**Usage:**
```
@image a sunset over mountains with purple sky
@generate a cat wearing a space helmet
@draw a futuristic city at night
```

**Limits:**
| Tier | Daily Limit | Hourly Limit |
|------|-------------|--------------|
| Free | 1 image | 1 |
| Pro | 10 images | 5 |
| Enterprise | 100 images | 20 |

**Tips for Better Images:**
- Be descriptive: "a golden retriever playing in autumn leaves" > "dog"
- Include style: "digital art", "photorealistic", "oil painting"
- Specify lighting: "soft sunset lighting", "dramatic shadows"
- Add quality terms: "4k", "detailed", "sharp focus"

### 💻 @code
Get code-focused responses with syntax highlighting.

**Usage:**
```
@code how to sort an array in Python
@coding implement binary search in JavaScript
@program create a REST API in Node.js
```

### 📐 @math
Mathematical help with step-by-step solutions.

**Usage:**
```
@math solve x^2 + 5x + 6 = 0
@calculate the derivative of sin(x)cos(x)
@equation integrate e^x from 0 to 1
```

**Features:**
- LaTeX rendering for equations
- Step-by-step solutions
- Graph descriptions when relevant

### 📝 @explain
Get detailed explanations.

**Usage:**
```
@explain how neural networks work
@detailed explain quantum computing
@elaborate on the theory of relativity
```

### 📋 @summarize
Get concise summaries.

**Usage:**
```
@summarize this article
@tldr what is machine learning
@brief explain blockchain
```

### 🌍 @translate
Translate text to another language.

**Usage:**
```
@translate Hello world to Spanish
@translate Bonjour to English
@translate こんにちは to French
```

### 🔍 @analyze
Detailed analysis of uploaded content.

**Usage:**
```
@analyze this code for bugs
@examine this data
@inspect this image
```

## API Endpoints

### Get Available Tags
```http
GET /api/v1/tags
```

### Get Tags Help
```http
GET /api/v1/tags/help
```

### Detect Tags in Message
```http
POST /api/v1/tags/detect
Content-Type: application/json

{
  "message": "@image a beautiful sunset"
}
```

### Generate Image
```http
POST /api/v1/image-gen/generate
Content-Type: application/json
Authorization: Bearer <token>

{
  "prompt": "a beautiful sunset over mountains",
  "width": 512,
  "height": 512
}
```

### Check Image Generation Status
```http
GET /api/v1/image-gen/status
Authorization: Bearer <token>
```

### Get Generation History
```http
GET /api/v1/image-gen/history?limit=10
Authorization: Bearer <token>
```

### Get Available Models
```http
GET /api/v1/image-gen/models
Authorization: Bearer <token>
```

## Image Generation Models

| Model | Quality | Max Resolution | Speed |
|-------|---------|----------------|-------|
| Stable Diffusion XL | High | 1024x1024 | Slow |
| Stable Diffusion 1.5 | Balanced | 512x512 | Medium |
| Stable Diffusion 1.4 | Fast | 512x512 | Fast |

## Rate Limiting

### Chat Tags
- Tags are processed within the normal chat rate limits
- Web search has additional limits (10/hour free, 100/hour pro)

### Image Generation
- Strict daily limits to conserve API resources
- Additional hourly rate limiting
- Admin users bypass rate limits

## Technical Implementation

### Tag Detection
Tags are detected using regex patterns at the start of messages:
```typescript
const patterns = [
  /@browse\b/i,
  /@search\b/i,
  /@image\b/i,
  // etc.
];
```

### Image Generation Flow
1. User sends message with @image tag
2. System checks daily limit
3. If allowed, prompt is optimized
4. HuggingFace API generates image
5. Image is stored and returned
6. Usage is tracked

### Load Balancing
- Multiple HuggingFace API keys rotate
- Automatic failover between models
- Usage tracking per key

## Best Practices

### For Users
1. Use specific, descriptive prompts
2. Check your remaining generations before requesting
3. Use tags at the start of your message
4. Don't include sensitive information in image prompts

### For Developers
1. Always check user limits before generation
2. Handle model loading states (503 errors)
3. Implement proper error handling
4. Log all generation attempts

## Error Handling

| Error | Cause | Solution |
|-------|-------|----------|
| "Daily limit reached" | User exceeded limit | Wait 24 hours |
| "Model is loading" | HuggingFace cold start | Retry in 30 seconds |
| "No API keys available" | All keys exhausted | Contact admin |
| "Prompt too short" | Less than 5 characters | Provide more detail |

## Security Considerations

1. **Prompt Filtering**: Negative prompts filter inappropriate content
2. **Rate Limiting**: Prevents abuse
3. **User Tracking**: All generations are logged
4. **API Key Security**: Keys stored in environment variables only

## Future Enhancements

- [ ] Image-to-image generation
- [ ] Style transfer
- [ ] Upscaling
- [ ] Multiple image generation
- [ ] Custom negative prompts
- [ ] NSFW filtering

---

*Last updated: January 2026*
