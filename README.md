# 🗣️ BaatCheet - Advanced AI Chat Application

<p align="center">
  <img src="BaatCheetLogo.jpg" alt="BaatCheet Logo" width="200"/>
</p>

> A powerful, free ChatGPT alternative with multi-provider AI support, OCR capabilities, and enterprise features.

## ✨ Features

### 🤖 Multi-Provider AI System
- **Groq** - Primary chat provider (14 keys, 201,600 req/day)
- **OpenRouter** - Access to 100+ models (12 keys)
- **DeepSeek** - Backup chat provider (4 keys)
- **Google Gemini** - Vision and multimodal (3 keys)
- **Hugging Face** - Image captioning (5 keys)
- **OCR.space** - Text extraction (6 keys)

### 📸 Vision & OCR
- Extract text from images (60+ languages)
- Analyze and describe images
- Process documents and receipts
- Urdu/English language support

### 💬 Chat Features
- Real-time streaming responses (SSE)
- Conversation history & context
- Multiple AI model selection
- Custom system prompts

### 🔒 Security
- JWT authentication
- Rate limiting
- Input validation (Zod)
- Helmet security headers

## 🚀 Quick Start

### Prerequisites
- Node.js 18+
- PostgreSQL 14+
- Redis (optional, for caching)

### Installation

```bash
# Clone the repository
git clone https://github.com/Sharjeel-Saleem-06/BaatCheet.git
cd BaatCheet

# Backend setup
cd backend
cp env.example .env
npm install
npx prisma generate
npx prisma db push

# Start the server
npm run dev
```

### Environment Setup

Create a `.env` file in the backend directory:

```env
# Database
DATABASE_URL=postgresql://user:password@localhost:5432/baatcheet

# Auth
JWT_SECRET=your-secret-key

# AI Providers (add your keys)
GROQ_API_KEY_1=gsk_...
OPENROUTER_API_KEY_1=sk-or-...
GEMINI_API_KEY_1=AIza...
OCR_SPACE_API_KEY_1=K...
```

## 📖 API Documentation

### Chat Endpoints

```
POST /api/v1/chat/completions    - Send chat message
POST /api/v1/chat/regenerate     - Regenerate response
GET  /api/v1/chat/models         - List available models
GET  /api/v1/chat/providers/health - Provider status
```

### Vision & OCR Endpoints

```
POST /api/v1/chat/vision/analyze - Analyze image
POST /api/v1/chat/ocr/extract    - Extract text (OCR)
POST /api/v1/chat/ocr/process    - OCR + AI processing
```

### Auth Endpoints

```
POST /api/v1/auth/register - Create account
POST /api/v1/auth/login    - Login
GET  /api/v1/auth/me       - Get current user
```

## 🏗️ Architecture

```
┌─────────────────────────────────────────────────────────────────┐
│                        BaatCheet Backend                         │
├─────────────────────────────────────────────────────────────────┤
│  Routes → Services → Provider Manager → AI Providers            │
│                                                                  │
│  ┌──────────┐  ┌──────────┐  ┌──────────┐  ┌──────────┐        │
│  │   Chat   │  │  Vision  │  │   OCR    │  │   Auth   │        │
│  └──────────┘  └──────────┘  └──────────┘  └──────────┘        │
│                       │                                          │
│                       ▼                                          │
│  ┌─────────────────────────────────────────────────────────┐   │
│  │              Provider Manager (44 keys)                  │   │
│  │  Groq • OpenRouter • DeepSeek • Gemini • HF • OCR.space │   │
│  └─────────────────────────────────────────────────────────┘   │
└─────────────────────────────────────────────────────────────────┘
```

## 📊 Provider Capacity

| Provider | Keys | Daily Limit | Total Capacity |
|----------|------|-------------|----------------|
| Groq | 14 | 14,400/key | 201,600 |
| OpenRouter | 12 | 200/key | 2,400 |
| DeepSeek | 4 | 1,000/key | 4,000 |
| Gemini | 3 | 1,500/key | 4,500 |
| Hugging Face | 5 | 1,000/key | 5,000 |
| OCR.space | 6 | 500/key | 3,000 |
| **TOTAL** | **44** | - | **220,500/day** |

## 📁 Project Structure

```
BaatCheet/
├── backend/
│   ├── src/
│   │   ├── config/       # Configuration
│   │   ├── middleware/   # Auth, validation, rate limiting
│   │   ├── routes/       # API endpoints
│   │   ├── services/     # Business logic
│   │   │   ├── AIRouter.ts        # Chat routing
│   │   │   ├── ChatService.ts     # Chat handling
│   │   │   ├── ContextManager.ts  # Conversation context
│   │   │   ├── OCRService.ts      # OCR processing
│   │   │   ├── ProviderManager.ts # Key management
│   │   │   └── VisionService.ts   # Image analysis
│   │   ├── types/        # TypeScript types
│   │   └── utils/        # Utilities
│   ├── prisma/           # Database schema
│   └── package.json
├── frontend/             # React frontend (coming soon)
├── resources/            # Documentation
│   ├── API_KEYS_GUIDE.md
│   ├── API_KEY_MECHANISM.md
│   ├── DATABASE_GUIDE.md
│   └── PRISMA_GUIDE.md
└── README.md
```

## 🔧 Development

```bash
# Run in development mode
npm run dev

# Build for production
npm run build

# Run tests
npm test

# Database commands
npm run db:generate  # Generate Prisma client
npm run db:push      # Push schema to database
npm run db:studio    # Open Prisma Studio
```

## 📚 Documentation

See the `resources/` folder for detailed guides:

- [API Keys Guide](resources/API_KEYS_GUIDE.md) - How to obtain API keys
- [API Key Mechanism](resources/API_KEY_MECHANISM.md) - How the key system works
- [Database Guide](resources/DATABASE_GUIDE.md) - PostgreSQL setup
- [Prisma Guide](resources/PRISMA_GUIDE.md) - ORM documentation

## 🤝 Contributing

1. Fork the repository
2. Create your feature branch (`git checkout -b feature/amazing`)
3. Commit your changes (`git commit -m 'Add amazing feature'`)
4. Push to the branch (`git push origin feature/amazing`)
5. Open a Pull Request

## 📄 License

MIT License - see [LICENSE](LICENSE) for details.

## 👨‍💻 Author

**Sharjeel Saleem**
- GitHub: [@Sharjeel-Saleem-06](https://github.com/Sharjeel-Saleem-06)

---

<p align="center">Made with ❤️ in Pakistan</p>
