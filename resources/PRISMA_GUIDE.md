# 🔷 Prisma ORM Guide

## What is Prisma?

**Prisma** is a modern database toolkit for Node.js and TypeScript. It replaces traditional ORMs like Mongoose (MongoDB) or Sequelize (SQL) with a more type-safe, developer-friendly approach.

---

## 🎯 Why Prisma?

| Feature | Prisma | Traditional ORMs |
|---------|--------|------------------|
| Type Safety | ✅ Auto-generated types | ❌ Manual typing |
| Schema | Single `.prisma` file | Multiple model files |
| Migrations | Built-in, easy | Often complex |
| Query Builder | Type-safe, autocomplete | String-based |
| Performance | Optimized queries | Variable |
| Developer Experience | Excellent | Good |

---

## 📁 Prisma Files in BaatCheet

```
backend/
├── prisma/
│   └── schema.prisma    # Database schema definition
├── node_modules/
│   └── @prisma/client/  # Auto-generated client
└── .env                 # DATABASE_URL connection string
```

---

## 📝 Understanding schema.prisma

The `schema.prisma` file defines your entire database structure:

```prisma
// Database connection
datasource db {
  provider = "postgresql"
  url      = env("DATABASE_URL")
}

// Client generator
generator client {
  provider = "prisma-client-js"
}

// Models (Tables)
model User {
  id        String   @id @default(uuid())
  email     String   @unique
  password  String
  name      String
  
  // Relations
  conversations Conversation[]
  
  // Timestamps
  createdAt DateTime @default(now())
  updatedAt DateTime @updatedAt
  
  // Table name mapping
  @@map("users")
}
```

---

## 🛠️ Prisma Commands Explained

### 1. `npx prisma generate`
**Purpose:** Creates the Prisma Client from your schema

```bash
npx prisma generate
```

**When to use:**
- After modifying `schema.prisma`
- After fresh `npm install`
- When types are not updating

**What it does:**
- Reads `schema.prisma`
- Generates TypeScript types
- Creates query methods
- Output: `node_modules/@prisma/client`

---

### 2. `npx prisma db push`
**Purpose:** Syncs your schema to the database (development)

```bash
npx prisma db push
```

**When to use:**
- During development
- When you want quick schema changes
- For prototyping

**What it does:**
- Compares schema to database
- Creates/modifies tables
- Does NOT create migration files
- ⚠️ May lose data if columns removed

---

### 3. `npx prisma migrate dev`
**Purpose:** Creates migration files (production-safe)

```bash
npx prisma migrate dev --name add_user_avatar
```

**When to use:**
- For production deployments
- When you need migration history
- For team collaboration

**What it does:**
- Creates SQL migration file
- Applies migration to database
- Keeps history in `prisma/migrations/`

---

### 4. `npx prisma studio`
**Purpose:** Visual database browser

```bash
npx prisma studio
```

**What it does:**
- Opens web interface at `http://localhost:5555`
- Browse all tables
- View/edit/delete data
- No SQL knowledge needed!

---

### 5. `npx prisma db pull`
**Purpose:** Generate schema from existing database

```bash
npx prisma db pull
```

**When to use:**
- When you have an existing database
- Reverse engineering

---

## 📊 Prisma vs MongoDB (Mongoose)

### Mongoose (MongoDB) - OLD
```javascript
// Define schema
const userSchema = new mongoose.Schema({
  email: { type: String, required: true },
  name: String,
});

// Create model
const User = mongoose.model('User', userSchema);

// Query (no type safety)
const user = await User.findOne({ email: 'test@test.com' });
```

### Prisma (PostgreSQL) - NEW
```typescript
// Schema is in schema.prisma file

// Query (fully typed!)
const user = await prisma.user.findUnique({
  where: { email: 'test@test.com' }
});
// TypeScript knows: user.id, user.email, user.name, etc.
```

---

## 🔍 Common Prisma Queries

### Create
```typescript
const user = await prisma.user.create({
  data: {
    email: 'test@example.com',
    password: 'hashed_password',
    name: 'Test User',
  },
});
```

### Find One
```typescript
const user = await prisma.user.findUnique({
  where: { id: 'uuid-here' },
});

// Or by email
const user = await prisma.user.findUnique({
  where: { email: 'test@example.com' },
});
```

### Find Many
```typescript
const conversations = await prisma.conversation.findMany({
  where: { userId: 'user-id' },
  orderBy: { updatedAt: 'desc' },
  take: 50,
  skip: 0,
});
```

### Update
```typescript
const updated = await prisma.user.update({
  where: { id: 'user-id' },
  data: { name: 'New Name' },
});
```

### Delete
```typescript
await prisma.user.delete({
  where: { id: 'user-id' },
});
```

### With Relations
```typescript
const conversation = await prisma.conversation.findUnique({
  where: { id: 'conv-id' },
  include: {
    messages: true,      // Include all messages
    user: true,          // Include user details
    project: true,       // Include project
  },
});
```

---

## 🔄 Development Workflow

### 1. Modify Schema
Edit `prisma/schema.prisma`:
```prisma
model User {
  // Add new field
  avatar String?  // Optional string
}
```

### 2. Push Changes
```bash
npx prisma db push
```

### 3. Regenerate Client
```bash
npx prisma generate
```

### 4. Use in Code
```typescript
// Now TypeScript knows about avatar!
const user = await prisma.user.update({
  where: { id: 'user-id' },
  data: { avatar: 'https://...' },
});
```

---

## 🎨 Prisma Studio (Visual Database)

Run this command:
```bash
cd backend
npx prisma studio
```

Opens at: `http://localhost:5555`

Features:
- 📊 View all tables
- ➕ Add new records
- ✏️ Edit existing data
- 🗑️ Delete records
- 🔍 Filter and search
- 📱 Mobile-friendly

---

## ⚡ Quick Reference

| Task | Command |
|------|---------|
| Generate client | `npx prisma generate` |
| Push schema (dev) | `npx prisma db push` |
| Create migration | `npx prisma migrate dev` |
| Apply migrations | `npx prisma migrate deploy` |
| Visual browser | `npx prisma studio` |
| Pull from DB | `npx prisma db pull` |
| Reset database | `npx prisma migrate reset` |
| Format schema | `npx prisma format` |

---

## 📚 Resources

- **Prisma Docs:** https://www.prisma.io/docs
- **Prisma Examples:** https://github.com/prisma/prisma-examples
- **Prisma Playground:** https://playground.prisma.io/
