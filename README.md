# 🗣️ BaatCheet

<p align="center">
  <img src="BaatCheetLogo.jpg" alt="BaatCheet Logo" width="200"/>
</p>

<p align="center">
  <strong>Advanced AI Chat Application with Multi-Language Support</strong>
</p>

<p align="center">
  <em>"Baatcheet" means "Conversation" in Urdu/Hindi</em>
</p>

---

## ✨ Features

- 🤖 **Multiple AI Providers** - Groq, Together AI, DeepSeek with automatic failover
- 🔄 **Real-time Streaming** - Server-Sent Events for instant responses
- 📁 **Project Organization** - Organize conversations by topic
- 🔍 **Full-text Search** - Search across all your conversations
- 🌐 **Multi-language** - English and Urdu support with RTL text
- 🖼️ **Image Analysis** - OCR and vision capabilities (coming soon)
- 🌙 **Dark/Light Theme** - Beautiful UI with theme support
- 🔐 **Secure** - JWT authentication, rate limiting, input validation

## 🏗️ Tech Stack

### Backend
- **Runtime:** Node.js + TypeScript
- **Framework:** Express.js
- **Database:** MongoDB + Redis
- **AI:** Groq SDK (10-key rotation for 144K+ daily requests)
- **Auth:** JWT + bcrypt
- **Validation:** Zod

### Frontend (Testing)
- **Framework:** React + Vite
- **Styling:** Tailwind CSS
- **State:** React Query

## 🚀 Quick Start

### Prerequisites
- Node.js 18+
- MongoDB (local or Atlas)
- Redis (optional, for caching)
- Groq API Key(s)

### Backend Setup

```bash
# Navigate to backend
cd backend

# Install dependencies
npm install

# Create environment file
cp env.example .env

# Edit .env with your API keys
nano .env

# Start development server
npm run dev
```

### Environment Variables

```env
# Required
MONGODB_URI=mongodb://localhost:27017/baatcheet
JWT_SECRET=your-super-secret-key
GROQ_API_KEY_1=your-groq-api-key

# Optional (for load balancing)
GROQ_API_KEY_2=your-second-groq-key
GROQ_API_KEY_3=your-third-groq-key
# ... up to 10 keys
```

## 📚 API Endpoints

### Authentication
| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/api/v1/auth/register` | Create account |
| POST | `/api/v1/auth/login` | User login |
| POST | `/api/v1/auth/logout` | User logout |
| GET | `/api/v1/auth/me` | Get current user |

### Chat
| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/api/v1/chat/completions` | Send message (streaming) |
| POST | `/api/v1/chat/regenerate` | Regenerate response |
| GET | `/api/v1/chat/providers/health` | Check AI status |
| GET | `/api/v1/chat/models` | List available models |

### Conversations
| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/v1/conversations` | List conversations |
| GET | `/api/v1/conversations/:id` | Get conversation |
| PUT | `/api/v1/conversations/:id` | Update conversation |
| DELETE | `/api/v1/conversations/:id` | Delete conversation |
| GET | `/api/v1/conversations/search` | Search conversations |

### Projects
| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/v1/projects` | List projects |
| POST | `/api/v1/projects` | Create project |
| PUT | `/api/v1/projects/:id` | Update project |
| DELETE | `/api/v1/projects/:id` | Delete project |

## 🎨 Color Palette

Based on our logo:
- **Primary (Navy):** `#1e293b`
- **Secondary (Green):** `#22c55e`
- **Background:** `#f1f5f9` (light) / `#0f172a` (dark)

## 📁 Project Structure

```
BaatCheet/
├── backend/
│   ├── src/
│   │   ├── config/         # Configuration files
│   │   ├── middleware/     # Express middleware
│   │   ├── models/         # MongoDB models
│   │   ├── routes/         # API routes
│   │   ├── services/       # Business logic
│   │   ├── types/          # TypeScript types
│   │   ├── utils/          # Utility functions
│   │   └── index.ts        # Entry point
│   ├── package.json
│   └── tsconfig.json
├── frontend/               # React testing frontend (coming soon)
├── docs/                   # Documentation
└── README.md
```

## 🔧 Development

```bash
# Run backend in development
cd backend && npm run dev

# Build for production
npm run build

# Run production
npm start

# Run tests
npm test
```

## 🚢 Deployment

### Recommended Platforms
- **Backend:** Render.com, Railway.app, Fly.io
- **Database:** MongoDB Atlas (free tier)
- **Cache:** Redis Cloud (free tier)

## 📈 Performance

- **API Response:** < 200ms
- **First Token:** < 1 second
- **Streaming:** 50-300 tokens/second
- **Concurrent Users:** 1000+

## 🔒 Security

- JWT authentication with 7-day expiry
- Rate limiting (100 req/15 min)
- Input validation with Zod
- Password hashing with bcrypt
- Helmet security headers
- CORS protection

## 🤝 Contributing

Contributions are welcome! Please read our contributing guidelines first.

## 📄 License

MIT License - see [LICENSE](LICENSE) for details.

---

<p align="center">
  Made with ❤️ by <a href="https://github.com/Sharjeel-Saleem-06">Sharjeel Saleem</a>
</p>
