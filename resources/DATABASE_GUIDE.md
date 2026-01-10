# 🗄️ PostgreSQL Database Guide

This guide explains how to access and manage your BaatCheet PostgreSQL database.

---

## 📋 Your Database Credentials

| Property | Value |
|----------|-------|
| **Host** | `localhost` |
| **Port** | `5432` |
| **Database** | `baatcheet` |
| **Username** | `baatcheet_user` |
| **Password** | `BaatCheet2024Secure!` |
| **Connection URL** | `postgresql://baatcheet_user:BaatCheet2024Secure!@localhost:5432/baatcheet` |

---

## 🔌 How to Connect to Your Database

### Method 1: Terminal (psql)

```bash
# Connect to the database
psql -h localhost -U baatcheet_user -d baatcheet

# Enter password when prompted: BaatCheet2024Secure!

# You'll see:
# baatcheet=>
```

### Useful psql Commands:

```sql
-- List all tables
\dt

-- Describe a table structure
\d users
\d conversations
\d messages

-- List all data in users table
SELECT * FROM users;

-- List all conversations
SELECT * FROM conversations;

-- List all messages
SELECT * FROM messages;

-- Count records
SELECT COUNT(*) FROM users;
SELECT COUNT(*) FROM conversations;

-- Exit psql
\q
```

---

### Method 2: GUI Application (Recommended)

#### Option A: pgAdmin (Official PostgreSQL GUI)

1. **Download pgAdmin:**
   ```
   https://www.pgadmin.org/download/
   ```

2. **Install and Open pgAdmin**

3. **Add New Server:**
   - Right-click "Servers" → "Create" → "Server"
   - **General Tab:**
     - Name: `BaatCheet Local`
   - **Connection Tab:**
     - Host: `localhost`
     - Port: `5432`
     - Database: `baatcheet`
     - Username: `baatcheet_user`
     - Password: `BaatCheet2024Secure!`
   - Click "Save"

4. **Browse Your Data:**
   - Expand: Servers → BaatCheet Local → Databases → baatcheet → Schemas → public → Tables

---

#### Option B: TablePlus (Modern, Beautiful UI)

1. **Download TablePlus:**
   ```
   https://tableplus.com/
   ```
   (Free version available)

2. **Create New Connection:**
   - Click "Create a new connection"
   - Select "PostgreSQL"
   - Fill in:
     - Name: `BaatCheet`
     - Host: `localhost`
     - Port: `5432`
     - User: `baatcheet_user`
     - Password: `BaatCheet2024Secure!`
     - Database: `baatcheet`
   - Click "Connect"

---

#### Option C: DBeaver (Free, Cross-Platform)

1. **Download DBeaver:**
   ```
   https://dbeaver.io/download/
   ```

2. **Create Connection:**
   - Click "New Database Connection"
   - Select "PostgreSQL"
   - Enter credentials (same as above)
   - Click "Test Connection" then "Finish"

---

### Method 3: VS Code Extension

1. **Install Extension:**
   - Search for "PostgreSQL" by Chris Kolkman
   - Or "Database Client" by Weijan Chen

2. **Add Connection:**
   - Click database icon in sidebar
   - Add new connection with credentials

---

## 📊 Database Tables Overview

### 1. users
```
┌─────────────┬──────────────┬───────────────────────────┐
│ Column      │ Type         │ Description               │
├─────────────┼──────────────┼───────────────────────────┤
│ id          │ UUID         │ Primary key               │
│ email       │ VARCHAR      │ Unique email              │
│ password    │ VARCHAR      │ Bcrypt hashed             │
│ name        │ VARCHAR      │ Display name              │
│ avatar      │ VARCHAR      │ Profile picture URL       │
│ preferences │ JSON         │ Theme, language, etc.     │
│ created_at  │ TIMESTAMP    │ Registration date         │
│ updated_at  │ TIMESTAMP    │ Last update               │
└─────────────┴──────────────┴───────────────────────────┘
```

### 2. conversations
```
┌───────────────┬──────────────┬───────────────────────────┐
│ Column        │ Type         │ Description               │
├───────────────┼──────────────┼───────────────────────────┤
│ id            │ UUID         │ Primary key               │
│ user_id       │ UUID         │ Foreign key → users       │
│ project_id    │ UUID         │ Foreign key → projects    │
│ title         │ VARCHAR      │ Conversation title        │
│ system_prompt │ TEXT         │ Custom AI instructions    │
│ model         │ VARCHAR      │ AI model used             │
│ tags          │ VARCHAR[]    │ Array of tags             │
│ is_archived   │ BOOLEAN      │ Archived status           │
│ is_pinned     │ BOOLEAN      │ Pinned status             │
│ total_tokens  │ INTEGER      │ Total tokens used         │
│ created_at    │ TIMESTAMP    │ Creation date             │
│ updated_at    │ TIMESTAMP    │ Last message date         │
└───────────────┴──────────────┴───────────────────────────┘
```

### 3. messages
```
┌─────────────────┬──────────────┬───────────────────────────┐
│ Column          │ Type         │ Description               │
├─────────────────┼──────────────┼───────────────────────────┤
│ id              │ UUID         │ Primary key               │
│ conversation_id │ UUID         │ Foreign key → conversations│
│ role            │ ENUM         │ system/user/assistant     │
│ content         │ TEXT         │ Message content           │
│ model           │ VARCHAR      │ AI model (for assistant)  │
│ tokens          │ INTEGER      │ Token count               │
│ created_at      │ TIMESTAMP    │ Message timestamp         │
└─────────────────┴──────────────┴───────────────────────────┘
```

### 4. projects
```
┌─────────────┬──────────────┬───────────────────────────┐
│ Column      │ Type         │ Description               │
├─────────────┼──────────────┼───────────────────────────┤
│ id          │ UUID         │ Primary key               │
│ user_id     │ UUID         │ Foreign key → users       │
│ name        │ VARCHAR      │ Project name              │
│ description │ TEXT         │ Project description       │
│ color       │ VARCHAR      │ Hex color code            │
│ icon        │ VARCHAR      │ Icon name                 │
│ created_at  │ TIMESTAMP    │ Creation date             │
│ updated_at  │ TIMESTAMP    │ Last update               │
└─────────────┴──────────────┴───────────────────────────┘
```

---

## 🔧 Common Database Operations

### View All Users
```sql
SELECT id, email, name, created_at FROM users;
```

### View User's Conversations
```sql
SELECT c.id, c.title, c.model, c.created_at
FROM conversations c
JOIN users u ON c.user_id = u.id
WHERE u.email = 'test@baatcheet.com';
```

### View Messages in a Conversation
```sql
SELECT role, content, tokens, created_at
FROM messages
WHERE conversation_id = 'your-conversation-id'
ORDER BY created_at;
```

### Count Messages Per Conversation
```sql
SELECT c.title, COUNT(m.id) as message_count
FROM conversations c
LEFT JOIN messages m ON c.id = m.conversation_id
GROUP BY c.id, c.title;
```

### Delete a User (and all their data)
```sql
-- This will cascade delete all conversations and messages
DELETE FROM users WHERE email = 'test@baatcheet.com';
```

---

## 🔄 Backup & Restore

### Backup Database
```bash
pg_dump -h localhost -U baatcheet_user -d baatcheet > backup.sql
```

### Restore Database
```bash
psql -h localhost -U baatcheet_user -d baatcheet < backup.sql
```

---

## ⚠️ Important Notes

1. **Password Security:** Change the password in production!
2. **Backups:** Set up regular backups
3. **Connection Pooling:** Use connection pooling for production
4. **Indexes:** Prisma creates indexes automatically
