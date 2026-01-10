# 🗣️ BaatCheet

**BaatCheet** (باتچیت - "Conversation" in Urdu) is an advanced, free AI chat application that rivals ChatGPT. Built with modern technologies and designed for scalability, it supports multiple AI providers with intelligent failover.

![BaatCheet Logo](BaatCheetLogo.jpg)

## ✨ Features

### Core Features
- 🤖 **Multiple AI Providers** - Groq, Together AI, DeepSeek with automatic failover
- 🔄 **10 Groq API Keys** - Intelligent round-robin rotation with 14,400 requests/day each
- 📡 **Real-time Streaming** - Server-Sent Events for instant responses
- 💾 **Context Management** - Redis caching with PostgreSQL persistence
- 🔐 **JWT Authentication** - Secure user authentication
- 🌍 **Multi-language Support** - English and Urdu

### Technical Highlights
- TypeScript with strict mode
- Clean Architecture with SOLID principles
- Rate limiting and security headers
- Comprehensive error handling
- Winston logging

## 🏗️ Architecture

```
┌─────────────────────────────────────────────────────────────────┐
│                        BaatCheet Backend                        │
├─────────────────────────────────────────────────────────────────┤
│                                                                 │
│  ┌──────────────┐    ┌──────────────┐    ┌──────────────┐      │
│  │   Express    │    │   AI Router  │    │   Streaming  │      │
│  │   Server     │───▶│   Service    │───▶│   Service    │      │
│  └──────────────┘    └──────────────┘    └──────────────┘      │
│         │                   │                   │               │
│         ▼                   ▼                   ▼               │
│  ┌──────────────┐    ┌──────────────┐    ┌──────────────┐      │
│  │  PostgreSQL  │    │    Redis     │    │   Context    │      │
│  │   (Prisma)   │    │   (Cache)    │    │   Manager    │      │
│  └──────────────┘    └──────────────┘    └──────────────┘      │
│                                                                 │
└─────────────────────────────────────────────────────────────────┘
```

## 📁 Project Structure

```
baatcheet/
├── backend/
│   ├── src/
│   │   ├── config/          # Configuration files
│   │   ├── middleware/      # Express middleware
│   │   ├── routes/          # API routes
│   │   ├── services/        # Business logic
│   │   ├── types/           # TypeScript types
│   │   ├── utils/           # Utility functions
│   │   └── index.ts         # Entry point
│   ├── prisma/
│   │   └── schema.prisma    # Database schema
│   ├── package.json
│   └── tsconfig.json
├── frontend/                 # React frontend (testing)
└── README.md
```

## 🚀 Quick Start

### Prerequisites

- Node.js 18+
- PostgreSQL 14+
- Redis (optional, for caching)
- Groq API Key(s)

### Installation

1. **Clone the repository**
   ```bash
   git clone https://github.com/Sharjeel-Saleem-06/BaatCheet.git
   cd BaatCheet
   ```

2. **Setup Backend**
   ```bash
   cd backend
   npm install
   ```

3. **Configure Environment**
   ```bash
   cp env.example .env
   # Edit .env with your database credentials and API keys
   ```

4. **Setup Database**
   ```bash
   # Create PostgreSQL database
   psql postgres -c "CREATE DATABASE baatcheet;"
   
   # Run Prisma migrations
   npx prisma generate
   npx prisma db push
   ```

5. **Start Development Server**
   ```bash
   npm run dev
   ```

The server will start at `http://localhost:5001`

## 🔧 Configuration

### Environment Variables

```env
# Server
PORT=5001
NODE_ENV=development

# Database
DATABASE_URL="postgresql://user:password@localhost:5432/baatcheet"

# Redis (optional)
REDIS_URL=redis://localhost:6379

# JWT
JWT_SECRET=your-secret-key
JWT_EXPIRES_IN=7d

# Groq API Keys (up to 10)
GROQ_API_KEY_1=gsk_xxx
GROQ_API_KEY_2=gsk_xxx
# ... up to GROQ_API_KEY_10

# Fallback Providers
TOGETHER_API_KEY=xxx
DEEPSEEK_API_KEY=xxx
```

## 📚 API Endpoints

### Authentication
| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/api/v1/auth/register` | Register new user |
| POST | `/api/v1/auth/login` | User login |
| POST | `/api/v1/auth/logout` | User logout |
| GET | `/api/v1/auth/me` | Get current user |

### Chat
| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/api/v1/chat/completions` | Send message (streaming) |
| POST | `/api/v1/chat/regenerate` | Regenerate response |
| GET | `/api/v1/chat/models` | List AI models |
| GET | `/api/v1/chat/providers/health` | Provider status |

### Conversations
| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/v1/conversations` | List conversations |
| POST | `/api/v1/conversations` | Create conversation |
| GET | `/api/v1/conversations/:id` | Get conversation |
| PUT | `/api/v1/conversations/:id` | Update conversation |
| DELETE | `/api/v1/conversations/:id` | Delete conversation |

### Projects
| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/v1/projects` | List projects |
| POST | `/api/v1/projects` | Create project |
| GET | `/api/v1/projects/:id` | Get project |
| PUT | `/api/v1/projects/:id` | Update project |
| DELETE | `/api/v1/projects/:id` | Delete project |

## 🔑 AI Provider Rotation

BaatCheet implements intelligent API key rotation:

1. **Round-Robin Selection** - Keys are used in rotation
2. **Daily Limits** - Each key has 14,400 requests/day limit
3. **Automatic Failover** - When Groq is exhausted:
   - Groq → Together AI → DeepSeek → Puter.js
4. **Midnight Reset** - Counters reset at UTC midnight

## 🛡️ Security Features

- 🔐 JWT Authentication
- 🚦 Rate Limiting (100 req/15min)
- 🛡️ Helmet security headers
- ✅ Zod input validation
- 🔒 CORS configuration
- 🔑 Bcrypt password hashing

## 📊 Database Schema

```prisma
model User {
  id            String         @id @default(uuid())
  email         String         @unique
  password      String
  name          String
  preferences   Json
  conversations Conversation[]
  projects      Project[]
}

model Conversation {
  id           String    @id @default(uuid())
  userId       String
  title        String
  systemPrompt String?
  model        String
  messages     Message[]
}

model Message {
  id             String   @id @default(uuid())
  conversationId String
  role           Role     // system, user, assistant
  content        String
  tokens         Int
}
```

## 🧪 Testing

```bash
# Health check
curl http://localhost:5001/health

# Register
curl -X POST http://localhost:5001/api/v1/auth/register \
  -H "Content-Type: application/json" \
  -d '{"email":"test@example.com","password":"test123","name":"Test"}'

# Login
curl -X POST http://localhost:5001/api/v1/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"test@example.com","password":"test123"}'
```

## 🚧 Development Roadmap

- [x] Phase 1: Backend Foundation
  - [x] PostgreSQL + Prisma setup
  - [x] Authentication system
  - [x] AI Router with key rotation
  - [x] Streaming service
  - [x] REST API endpoints

- [ ] Phase 2: Enhanced Features
  - [ ] Image analysis (OCR, Vision)
  - [ ] Voice input support
  - [ ] Export conversations
  - [ ] Custom prompts library

- [ ] Phase 3: Frontend
  - [ ] React UI with Tailwind
  - [ ] Dark/Light theme
  - [ ] Mobile responsive
  - [ ] PWA support

## 📝 License

MIT License - see [LICENSE](LICENSE) for details.

## 🤝 Contributing

Contributions are welcome! Please read our contributing guidelines first.

## 📧 Contact

- **Author**: Sharjeel Saleem
- **GitHub**: [@Sharjeel-Saleem-06](https://github.com/Sharjeel-Saleem-06)

---

<p align="center">Made with ❤️ for the open-source community</p>
