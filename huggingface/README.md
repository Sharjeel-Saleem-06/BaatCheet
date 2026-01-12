---
title: BaatCheet AI Backend
emoji: 💬
colorFrom: purple
colorTo: blue
sdk: docker
pinned: false
license: mit
app_port: 7860
---

# BaatCheet AI Backend

Advanced AI Chat Application Backend with:
- 🤖 Multi-provider AI (Groq, OpenRouter, DeepSeek)
- 🔍 Real-time Web Search
- 🔊 Text-to-Speech (ElevenLabs)
- 📄 PDF Analysis
- 🧠 Memory System
- 🔒 Enterprise Security

## API Documentation

Base URL: `https://your-space.hf.space/api/v1`

### Endpoints

- `POST /chat/completions` - Chat with AI
- `GET /health` - Health check
- `POST /search` - Web search
- `POST /tts/generate` - Text to speech

## Environment Variables

Configure in Hugging Face Space Settings > Repository Secrets
