# CURSOR PROMPT: BaatCheet Admin Dashboard & Control Panel

You are building a comprehensive admin dashboard for BaatCheet that provides complete system oversight, user management, analytics, and administrative controls.

---

## PROJECT CONTEXT

**Goal:** Create a powerful admin panel where administrators can:
- Monitor all system activity in real-time
- View and manage all users
- Track API usage and costs
- Moderate content and conversations
- Control system settings
- View detailed analytics
- Manage AI providers
- Handle support tickets
- Audit logs for compliance

---

## ARCHITECTURE OVERVIEW

### Admin Panel Structure
```
/admin
├── /dashboard          # Overview with key metrics
├── /users              # User management
├── /analytics          # Detailed analytics
├── /conversations      # Content moderation
├── /api-usage          # API consumption tracking
├── /providers          # AI provider management
├── /system             # System settings
├── /audit-logs         # Activity audit trail
├── /support            # Support ticket system
└── /reports            # Generate reports
```

---

## PHASE 1: BACKEND - ADMIN API ENDPOINTS

### 1. ADMIN AUTHENTICATION & AUTHORIZATION

**Requirements:**
- Add admin role check middleware
- Implement admin-only routes
- Track admin actions in audit log
- Multi-factor authentication for admins
- Session management for admin users

**Implementation:**

```typescript
// middleware/admin-auth.middleware.ts
export async function requireAdmin(req, res, next) {
  try {
    // Verify user is authenticated (Clerk)
    if (!req.userId) {
      return res.status(401).json({ error: 'Unauthorized' });
    }
    
    // Check if user has admin role
    const user = await prisma.user.findUnique({
      where: { id: req.userId },
      select: { role: true }
    });
    
    if (user.role !== 'admin' && user.role !== 'moderator') {
      return res.status(403).json({ error: 'Forbidden: Admin access required' });
    }
    
    req.isAdmin = true;
    req.adminRole = user.role;
    next();
  } catch (error) {
    res.status(500).json({ error: 'Authentication error' });
  }
}

// middleware/audit-log.middleware.ts
export async function auditLog(action: string) {
  return async (req, res, next) => {
    // Capture original json method
    const originalJson = res.json.bind(res);
    
    res.json = (body) => {
      // Log admin action after response
      prisma.auditLog.create({
        data: {
          userId: req.userId,
          action,
          resource: req.path,
          method: req.method,
          requestBody: req.body,
          responseStatus: res.statusCode,
          ipAddress: req.ip,
          userAgent: req.headers['user-agent']
        }
      }).catch(err => logger.error('Audit log failed:', err));
      
      return originalJson(body);
    };
    
    next();
  };
}
```

---

### 2. ADMIN DASHBOARD ENDPOINTS

**GET /api/v1/admin/dashboard**
- Overview statistics
- Real-time metrics
- System health
- Recent activity

**Response:**
```json
{
  "stats": {
    "totalUsers": 15234,
    "activeUsers": 8912,
    "newUsersToday": 145,
    "totalConversations": 89456,
    "totalMessages": 1234567,
    "totalTokensUsed": 45678901,
    "totalRevenue": 12345.67,
    "averageResponseTime": 234
  },
  "systemHealth": {
    "status": "healthy",
    "database": { "status": "connected", "connections": 45, "maxConnections": 100 },
    "redis": { "status": "connected", "memory": "512MB", "maxMemory": "2GB" },
    "aiProviders": {
      "groq": { "status": "operational", "availableKeys": 12, "totalKeys": 14 },
      "openrouter": { "status": "operational", "availableKeys": 11, "totalKeys": 12 },
      "deepseek": { "status": "operational", "availableKeys": 4, "totalKeys": 4 }
    }
  },
  "recentActivity": [
    {
      "type": "user_registered",
      "userId": "user_123",
      "timestamp": "2026-01-10T12:34:56Z"
    }
  ],
  "topUsers": [
    { "userId": "user_456", "name": "John Doe", "messagesCount": 1234, "tokensUsed": 56789 }
  ],
  "alerts": [
    {
      "level": "warning",
      "message": "Groq API key #7 approaching daily limit",
      "timestamp": "2026-01-10T11:00:00Z"
    }
  ]
}
```

**Implementation:**
```typescript
// controllers/admin/dashboard.controller.ts
export async function getDashboard(req, res) {
  try {
    // Aggregate stats from database
    const [
      totalUsers,
      activeUsers,
      newUsersToday,
      totalConversations,
      totalMessages,
      tokenStats
    ] = await Promise.all([
      prisma.user.count(),
      prisma.user.count({ where: { lastActiveAt: { gte: new Date(Date.now() - 24*60*60*1000) } } }),
      prisma.user.count({ where: { createdAt: { gte: new Date().setHours(0,0,0,0) } } }),
      prisma.conversation.count(),
      prisma.message.count(),
      prisma.analytics.aggregate({ _sum: { tokensUsed: true } })
    ]);
    
    // Get system health
    const systemHealth = await getSystemHealth();
    
    // Get recent activity
    const recentActivity = await prisma.auditLog.findMany({
      take: 50,
      orderBy: { createdAt: 'desc' },
      include: { user: { select: { name: true, email: true } } }
    });
    
    // Get top users by usage
    const topUsers = await prisma.user.findMany({
      take: 10,
      orderBy: { tokensUsed: 'desc' },
      select: { id: true, name: true, email: true, tokensUsed: true, messagesCount: true }
    });
    
    // Get alerts
    const alerts = await getSystemAlerts();
    
    res.json({
      stats: {
        totalUsers,
        activeUsers,
        newUsersToday,
        totalConversations,
        totalMessages,
        totalTokensUsed: tokenStats._sum.tokensUsed || 0
      },
      systemHealth,
      recentActivity,
      topUsers,
      alerts
    });
  } catch (error) {
    res.status(500).json({ error: 'Failed to load dashboard' });
  }
}
```

---

### 3. USER MANAGEMENT ENDPOINTS

**GET /api/v1/admin/users**
- List all users with pagination
- Filter by role, tier, status
- Search by name, email
- Sort by registration date, usage, etc.

**Query Parameters:**
- `page` (default: 1)
- `limit` (default: 50)
- `search` (search name/email)
- `role` (filter: user, admin, moderator)
- `tier` (filter: free, pro, enterprise)
- `status` (filter: active, suspended, deleted)
- `sortBy` (createdAt, tokensUsed, messagesCount)
- `sortOrder` (asc, desc)

**GET /api/v1/admin/users/:userId**
- Detailed user information
- Usage statistics
- Conversation history
- Payment history
- Audit trail for this user

**Response:**
```json
{
  "user": {
    "id": "user_123",
    "email": "user@example.com",
    "name": "John Doe",
    "role": "user",
    "tier": "pro",
    "status": "active",
    "createdAt": "2025-12-01T10:00:00Z",
    "lastActiveAt": "2026-01-10T11:30:00Z",
    "emailVerified": true,
    "phoneVerified": false
  },
  "stats": {
    "totalConversations": 45,
    "totalMessages": 892,
    "totalTokensUsed": 45678,
    "totalImagesUploaded": 23,
    "totalAudioTranscribed": 12,
    "apiKeysGenerated": 2,
    "webhooksCreated": 1
  },
  "usage": {
    "currentMonth": {
      "messages": 123,
      "tokens": 5678,
      "images": 5,
      "audio": 2
    },
    "limits": {
      "messages": 1000,
      "tokens": 100000,
      "images": 100,
      "audio": 50
    }
  },
  "recentActivity": [
    { "action": "message_sent", "timestamp": "2026-01-10T11:25:00Z" },
    { "action": "image_uploaded", "timestamp": "2026-01-10T10:15:00Z" }
  ],
  "paymentHistory": [
    { "amount": 20.00, "plan": "pro", "date": "2026-01-01T00:00:00Z", "status": "paid" }
  ]
}
```

**PUT /api/v1/admin/users/:userId**
- Update user details
- Change role (user ↔ admin ↔ moderator)
- Change tier (free ↔ pro ↔ enterprise)
- Update limits

**POST /api/v1/admin/users/:userId/suspend**
- Suspend user account
- Reason required for audit

**POST /api/v1/admin/users/:userId/unsuspend**
- Reactivate suspended account

**DELETE /api/v1/admin/users/:userId**
- Soft delete user account
- Archive all data
- GDPR compliant deletion

**POST /api/v1/admin/users/:userId/reset-password**
- Send password reset email

**POST /api/v1/admin/users/:userId/verify-email**
- Manually verify user email

**Implementation:**
```typescript
// controllers/admin/users.controller.ts
export async function listUsers(req, res) {
  const {
    page = 1,
    limit = 50,
    search,
    role,
    tier,
    status,
    sortBy = 'createdAt',
    sortOrder = 'desc'
  } = req.query;
  
  const skip = (page - 1) * limit;
  
  // Build where clause
  const where: any = {};
  
  if (search) {
    where.OR = [
      { name: { contains: search, mode: 'insensitive' } },
      { email: { contains: search, mode: 'insensitive' } }
    ];
  }
  
  if (role) where.role = role;
  if (tier) where.tier = tier;
  if (status) where.status = status;
  
  // Get users with stats
  const [users, total] = await Promise.all([
    prisma.user.findMany({
      where,
      skip,
      take: parseInt(limit),
      orderBy: { [sortBy]: sortOrder },
      select: {
        id: true,
        email: true,
        name: true,
        role: true,
        tier: true,
        status: true,
        createdAt: true,
        lastActiveAt: true,
        _count: {
          select: {
            conversations: true,
            messages: true
          }
        }
      }
    }),
    prisma.user.count({ where })
  ]);
  
  res.json({
    users,
    pagination: {
      page: parseInt(page),
      limit: parseInt(limit),
      total,
      totalPages: Math.ceil(total / limit)
    }
  });
}

export async function getUserDetails(req, res) {
  const { userId } = req.params;
  
  const user = await prisma.user.findUnique({
    where: { id: userId },
    include: {
      conversations: { take: 10, orderBy: { updatedAt: 'desc' } },
      apiKeys: true,
      webhooks: true
    }
  });
  
  if (!user) {
    return res.status(404).json({ error: 'User not found' });
  }
  
  // Get usage stats
  const stats = await prisma.analytics.aggregate({
    where: { userId },
    _sum: {
      messagesCount: true,
      tokensUsed: true,
      imagesUploaded: true,
      audioTranscribed: true
    }
  });
  
  // Get recent activity
  const recentActivity = await prisma.auditLog.findMany({
    where: { userId },
    take: 50,
    orderBy: { createdAt: 'desc' }
  });
  
  res.json({
    user,
    stats: stats._sum,
    recentActivity
  });
}

export async function updateUser(req, res) {
  const { userId } = req.params;
  const { name, role, tier, status, limits } = req.body;
  
  const updated = await prisma.user.update({
    where: { id: userId },
    data: { name, role, tier, status, limits }
  });
  
  // Log admin action
  await logAdminAction(req.userId, 'USER_UPDATED', { userId, changes: req.body });
  
  res.json(updated);
}

export async function suspendUser(req, res) {
  const { userId } = req.params;
  const { reason } = req.body;
  
  await prisma.user.update({
    where: { id: userId },
    data: { status: 'suspended', suspendedReason: reason, suspendedAt: new Date() }
  });
  
  await logAdminAction(req.userId, 'USER_SUSPENDED', { userId, reason });
  
  res.json({ success: true });
}

export async function deleteUser(req, res) {
  const { userId } = req.params;
  const { hardDelete = false } = req.body;
  
  if (hardDelete) {
    // GDPR compliant deletion - remove all data
    await prisma.$transaction([
      prisma.message.deleteMany({ where: { conversation: { userId } } }),
      prisma.conversation.deleteMany({ where: { userId } }),
      prisma.analytics.deleteMany({ where: { userId } }),
      prisma.user.delete({ where: { id: userId } })
    ]);
  } else {
    // Soft delete - mark as deleted
    await prisma.user.update({
      where: { id: userId },
      data: { status: 'deleted', deletedAt: new Date() }
    });
  }
  
  await logAdminAction(req.userId, 'USER_DELETED', { userId, hardDelete });
  
  res.json({ success: true });
}
```

---

### 4. API USAGE TRACKING ENDPOINTS

**GET /api/v1/admin/api-usage**
- Overall API usage statistics
- Usage by provider (Groq, OpenRouter, etc.)
- Usage by user
- Cost estimation
- Trends over time

**Query Parameters:**
- `startDate` (ISO date)
- `endDate` (ISO date)
- `groupBy` (day, week, month)
- `provider` (groq, openrouter, deepseek, etc.)

**Response:**
```json
{
  "summary": {
    "totalRequests": 1234567,
    "totalTokens": 98765432,
    "estimatedCost": 1234.56,
    "averageLatency": 234,
    "errorRate": 0.05
  },
  "byProvider": [
    {
      "provider": "groq",
      "requests": 890123,
      "tokens": 67890123,
      "cost": 0,
      "keysUsed": 14,
      "averageLatency": 180
    },
    {
      "provider": "openrouter",
      "requests": 234567,
      "tokens": 23456789,
      "cost": 234.56,
      "keysUsed": 12,
      "averageLatency": 320
    }
  ],
  "timeline": [
    { "date": "2026-01-01", "requests": 12345, "tokens": 987654 },
    { "date": "2026-01-02", "requests": 13456, "tokens": 1098765 }
  ],
  "topUsers": [
    { "userId": "user_123", "name": "John Doe", "requests": 5678, "tokens": 456789 }
  ]
}
```

**GET /api/v1/admin/api-usage/providers/:provider**
- Detailed usage for specific provider
- Key-level breakdown
- Request distribution
- Error analysis

**GET /api/v1/admin/api-usage/users/:userId**
- User-specific API usage
- Breakdown by model
- Cost allocation
- Usage patterns

**Implementation:**
```typescript
// controllers/admin/api-usage.controller.ts
export async function getApiUsage(req, res) {
  const { startDate, endDate, groupBy = 'day', provider } = req.query;
  
  const where: any = {};
  if (startDate) where.createdAt = { gte: new Date(startDate) };
  if (endDate) where.createdAt = { ...where.createdAt, lte: new Date(endDate) };
  if (provider) where.provider = provider;
  
  // Aggregate usage data
  const summary = await prisma.apiUsage.aggregate({
    where,
    _sum: {
      requests: true,
      tokens: true,
      cost: true
    },
    _avg: {
      latency: true
    }
  });
  
  // Usage by provider
  const byProvider = await prisma.apiUsage.groupBy({
    by: ['provider'],
    where,
    _sum: {
      requests: true,
      tokens: true,
      cost: true
    },
    _avg: {
      latency: true
    }
  });
  
  // Timeline data
  const timeline = await prisma.apiUsage.groupBy({
    by: ['date'],
    where,
    _sum: {
      requests: true,
      tokens: true
    },
    orderBy: { date: 'asc' }
  });
  
  // Top users
  const topUsers = await prisma.user.findMany({
    take: 10,
    orderBy: { tokensUsed: 'desc' },
    select: {
      id: true,
      name: true,
      email: true,
      tokensUsed: true
    }
  });
  
  res.json({
    summary: {
      totalRequests: summary._sum.requests,
      totalTokens: summary._sum.tokens,
      estimatedCost: summary._sum.cost,
      averageLatency: summary._avg.latency
    },
    byProvider,
    timeline,
    topUsers
  });
}
```

---

### 5. CONTENT MODERATION ENDPOINTS

**GET /api/v1/admin/conversations**
- List all conversations (paginated)
- Filter by user, project, date
- Search by content
- Flag inappropriate content

**GET /api/v1/admin/conversations/:conversationId**
- View complete conversation
- User details
- Moderation status
- Flag history

**POST /api/v1/admin/conversations/:conversationId/flag**
- Flag conversation for review
- Reason: spam, abuse, inappropriate, other

**POST /api/v1/admin/conversations/:conversationId/delete**
- Delete conversation (content moderation)
- Notify user (optional)

**GET /api/v1/admin/flagged-content**
- View all flagged content
- Sort by severity, date
- Filter by status (pending, reviewed, actioned)

**POST /api/v1/admin/flagged-content/:flagId/review**
- Mark as reviewed
- Take action: delete, warn user, no action

**Implementation:**
```typescript
// controllers/admin/moderation.controller.ts
export async function listConversations(req, res) {
  const { page = 1, limit = 50, userId, search, flagged } = req.query;
  
  const where: any = {};
  if (userId) where.userId = userId;
  if (flagged) where.isFlagged = true;
  if (search) {
    where.OR = [
      { title: { contains: search, mode: 'insensitive' } },
      { messages: { some: { content: { contains: search, mode: 'insensitive' } } } }
    ];
  }
  
  const conversations = await prisma.conversation.findMany({
    where,
    skip: (page - 1) * limit,
    take: limit,
    include: {
      user: { select: { id: true, name: true, email: true } },
      _count: { select: { messages: true } }
    },
    orderBy: { updatedAt: 'desc' }
  });
  
  const total = await prisma.conversation.count({ where });
  
  res.json({
    conversations,
    pagination: {
      page,
      limit,
      total,
      totalPages: Math.ceil(total / limit)
    }
  });
}

export async function flagConversation(req, res) {
  const { conversationId } = req.params;
  const { reason, severity } = req.body;
  
  await prisma.conversation.update({
    where: { id: conversationId },
    data: { isFlagged: true, flagReason: reason, flaggedAt: new Date() }
  });
  
  await prisma.flaggedContent.create({
    data: {
      conversationId,
      reason,
      severity,
      flaggedBy: req.userId,
      status: 'pending'
    }
  });
  
  await logAdminAction(req.userId, 'CONVERSATION_FLAGGED', { conversationId, reason });
  
  res.json({ success: true });
}
```

---

### 6. SYSTEM SETTINGS ENDPOINTS

**GET /api/v1/admin/settings**
- Get all system settings

**PUT /api/v1/admin/settings**
- Update system settings

**Settings Structure:**
```json
{
  "features": {
    "allowNewRegistrations": true,
    "maintenanceMode": false,
    "imageUploadEnabled": true,
    "voiceInputEnabled": true,
    "webhooksEnabled": true
  },
  "limits": {
    "free": {
      "messagesPerDay": 100,
      "tokensPerDay": 10000,
      "imagesPerDay": 10,
      "audioMinutesPerDay": 10
    },
    "pro": {
      "messagesPerDay": 1000,
      "tokensPerDay": 100000,
      "imagesPerDay": 100,
      "audioMinutesPerDay": 60
    },
    "enterprise": {
      "messagesPerDay": -1,
      "tokensPerDay": -1,
      "imagesPerDay": -1,
      "audioMinutesPerDay": -1
    }
  },
  "ai": {
    "defaultModel": "groq:llama-3.3-70b-versatile",
    "enabledProviders": ["groq", "openrouter", "deepseek", "gemini"],
    "maxContextTokens": 8000,
    "temperature": 0.7
  },
  "moderation": {
    "autoModeration": true,
    "flagKeywords": ["spam", "abuse"],
    "requireManualReview": false
  }
}
```

**GET /api/v1/admin/settings/ai-providers**
- List all AI provider configurations

**PUT /api/v1/admin/settings/ai-providers/:provider**
- Update provider settings (enable/disable, add keys, remove keys)

---

### 7. AUDIT LOG ENDPOINTS

**GET /api/v1/admin/audit-logs**
- View all admin actions
- Filter by admin user, action type, date range
- Search by resource

**Query Parameters:**
- `page`, `limit`
- `adminId` (filter by admin)
- `action` (filter by action type)
- `startDate`, `endDate`
- `resource` (filter by affected resource)

**Response:**
```json
{
  "logs": [
    {
      "id": "log_123",
      "adminId": "user_789",
      "adminName": "Admin User",
      "action": "USER_SUSPENDED",
      "resource": "/api/v1/admin/users/user_456",
      "details": {
        "userId": "user_456",
        "reason": "Spam activity detected"
      },
      "ipAddress": "192.168.1.1",
      "userAgent": "Mozilla/5.0...",
      "timestamp": "2026-01-10T12:34:56Z"
    }
  ],
  "pagination": { "page": 1, "limit": 50, "total": 1234 }
}
```

**GET /api/v1/admin/audit-logs/export**
- Export audit logs to CSV/JSON
- For compliance and reporting

---

### 8. REPORTS & ANALYTICS ENDPOINTS

**GET /api/v1/admin/reports/users**
- User growth report
- Active users report
- Churn analysis

**GET /api/v1/admin/reports/usage**
- API usage report
- Token consumption report
- Cost analysis

**GET /api/v1/admin/reports/revenue**
- Revenue report
- Subscription analytics
- MRR/ARR tracking

**POST /api/v1/admin/reports/generate**
- Generate custom report
- Parameters: metric, dateRange, groupBy, filters

---

## DATABASE SCHEMA ADDITIONS

Add these models to Prisma schema:

```prisma
model AuditLog {
  id            String   @id @default(cuid())
  userId        String
  user          User     @relation(fields: [userId], references: [id])
  action        String   // USER_CREATED, USER_UPDATED, USER_SUSPENDED, etc.
  resource      String   // API endpoint affected
  method        String   // GET, POST, PUT, DELETE
  requestBody   Json?
  responseStatus Int
  ipAddress     String
  userAgent     String
  createdAt     DateTime @default(now())
  
  @@index([userId])
  @@index([action])
  @@index([createdAt])
}

model FlaggedContent {
  id              String   @id @default(cuid())
  conversationId  String
  conversation    Conversation @relation(fields: [conversationId], references: [id])
  reason          String
  severity        String   // low, medium, high, critical
  flaggedBy       String   // Admin user ID
  flaggedAt       DateTime @default(now())
  status          String   // pending, reviewed, actioned, dismissed
  reviewedBy      String?
  reviewedAt      DateTime?
  action          String?  // deleted, warned, none
  notes           String?
  
  @@index([status])
  @@index([severity])
}

model SystemSettings {
  id        String   @id @default(cuid())
  key       String   @unique
  value     Json
  updatedBy String
  updatedAt DateTime @updatedAt
}

model ApiUsage {
  id          String   @id @default(cuid())
  userId      String?
  provider    String   // groq, openrouter, deepseek, etc.
  model       String
  requests    Int      @default(1)
  tokens      Int
  cost        Float    @default(0)
  latency     Int      // milliseconds
  status      String   // success, error, rate_limited
  date        DateTime @db.Date
  createdAt   DateTime @default(now())
  
  @@index([userId])
  @@index([provider])
  @@index([date])
}
```

---

## ROUTES SETUP

```typescript
// routes/admin.routes.ts
import { Router } from 'express';
import { requireAdmin } from '../middleware/admin-auth.middleware';
import { auditLog } from '../middleware/audit-log.middleware';

const router = Router();

// All admin routes require admin authentication
router.use(requireAdmin);

// Dashboard
router.get('/dashboard', dashboardController.getDashboard);

// Users
router.get('/users', usersController.listUsers);
router.get('/users/:userId', usersController.getUserDetails);
router.put('/users/:userId', auditLog('USER_UPDATED'), usersController.updateUser);
router.post('/users/:userId/suspend', auditLog('USER_SUSPENDED'), usersController.suspendUser);
router.post('/users/:userId/unsuspend', auditLog('USER_UNSUSPENDED'), usersController.unsuspendUser);
router.delete('/users/:userId', auditLog('USER_DELETED'), usersController.deleteUser);

// API Usage
router.get('/api-usage', apiUsageController.getApiUsage);
router.get('/api-usage/providers/:provider', apiUsageController.getProviderUsage);
router.get('/api-usage/users/:userId', apiUsageController.getUserUsage);

// Content Moderation
router.get('/conversations', moderationController.listConversations);
router.get('/conversations/:conversationId', moderationController.getConversation);
router.post('/conversations/:conversationId/flag', auditLog('CONVERSATION_FLAGGED'), moderationController.flagConversation);
router.delete('/conversations/:conversationId', auditLog('CONVERSATION_DELETED'), moderationController.deleteConversation);
router.get('/flagged-content', moderationController.listFlaggedContent);
router.post('/flagged-content/:flagId/review', auditLog('FLAG_REVIEWED'), moderationController.reviewFlag);

// System Settings
router.get('/settings', settingsController.getSettings);
router.put('/settings', auditLog('SETTINGS_UPDATED'), settingsController.updateSettings);
router.get('/settings/ai-providers', settingsController.getProviders);
router.put('/settings/ai-providers/:provider', auditLog('PROVIDER_UPDATED'), settingsController.updateProvider);

// Audit Logs
router.get('/audit-logs', auditLogsController.listLogs);
router.get('/audit-logs/export', auditLogsController.exportLogs);

// Reports
router.get('/reports/users', reportsController.getUsersReport);
router.get('/reports/usage', reportsController.getUsageReport);
router.get('/reports/revenue', reportsController.getRevenueReport);
router.post('/reports/generate', reportsController.generateCustomReport);

export default router;
```

---

## FRONTEND ADMIN DASHBOARD (BONUS)

If building admin UI (React):

### Components Structure:
```
src/components/admin/
├── Dashboard/
│   ├── StatsCards.tsx
│   ├── SystemHealth.tsx
│   ├── RecentActivity.tsx
│   └── TopUsers.tsx
├── Users/
│   ├── UserList.tsx
│   ├── UserDetails.tsx
│   ├── UserActions.tsx
│   └── UserFilters.tsx
├── Analytics/
│   ├── UsageCharts.tsx
│   ├── ApiUsageTable.tsx
│   └── CostBreakdown.tsx
├── Moderation/
│   ├── ConversationList.tsx
│   ├── FlaggedContent.tsx
│   └── ModerationActions.tsx
├── Settings/
│   ├── SystemSettings.tsx
│   ├── ProviderSettings.tsx
│   └── LimitsSettings.tsx
└── AuditLog/
    ├── LogViewer.tsx
    └── LogFilters.tsx
```

---

## SECURITY CONSIDERATIONS

### 1. Admin Authentication
- Require multi-factor authentication (MFA) for all admin users
- Use separate admin sessions (shorter timeout: 1 hour)
- Log all admin logins
- IP whitelisting for admin panel (optional)
- Monitor for suspicious admin activity

### 2. Audit Trail
- Log EVERY admin action (immutable audit log)
- Include: who, what, when, where (IP), why (reason field)
- Retain audit logs for 7 years (compliance)
- Regular audit log reviews
- Alert on suspicious patterns (mass deletions, etc.)

### 3. Data Privacy
- Mask sensitive user data (emails, IPs) unless needed
- GDPR compliance: right to access, right to erasure
- Encrypt audit logs at rest
- Limit admin data access based on role:
  - Super Admin: Full access
  - Admin: User management, moderation
  - Moderator: Content moderation only

### 4. Rate Limiting
- Strict rate limits on admin endpoints
- Prevent bulk actions without confirmation
- Implement admin action cooldowns
- Require confirmation for destructive actions

---

## REAL-TIME FEATURES

### WebSocket Updates for Admin Dashboard
```typescript
// services/admin-websocket.service.ts
import { Server as SocketServer } from 'socket.io';

export function setupAdminWebSocket(io: SocketServer) {
  const adminNamespace = io.of('/admin');
  
  adminNamespace.use(async (socket, next) => {
    // Verify admin authentication
    const token = socket.handshake.auth.token;
    const userId = await verifyAdminToken(token);
    
    if (!userId) {
      return next(new Error('Unauthorized'));
    }
    
    socket.data.userId = userId;
    next();
  });
  
  adminNamespace.on('connection', (socket) => {
    console.log('Admin connected:', socket.data.userId);
    
    // Join admin room
    socket.join('admins');
    
    // Send real-time updates
    socket.on('subscribe', (channel) => {
      socket.join(channel); // users, api-usage, flags, etc.
    });
    
    socket.on('disconnect', () => {
      console.log('Admin disconnected:', socket.data.userId);
    });
  });
  
  // Emit events to admins
  return {
    notifyNewUser: (user) => {
      adminNamespace.to('users').emit('new_user', user);
    },
    notifyFlaggedContent: (content) => {
      adminNamespace.to('moderation').emit('flagged_content', content);
    },
    notifySystemAlert: (alert) => {
      adminNamespace.to('admins').emit('system_alert', alert);
    }
  };
}
```

---

## ADMIN ACTION PERMISSIONS

Define granular permissions:

```typescript
// types/admin.types.ts
export enum AdminPermission {
  // User Management
  VIEW_USERS = 'view_users',
  EDIT_USERS = 'edit_users',
  DELETE_USERS = 'delete_users',
  SUSPEND_USERS = 'suspend_users',
  
  // Content Moderation
  VIEW_CONVERSATIONS = 'view_conversations',
  DELETE_CONVERSATIONS = 'delete_conversations',
  FLAG_CONTENT = 'flag_content',
  REVIEW_FLAGS = 'review_flags',
  
  // System Settings
  VIEW_SETTINGS = 'view_settings',
  EDIT_SETTINGS = 'edit_settings',
  MANAGE_PROVIDERS = 'manage_providers',
  
  // Analytics
  VIEW_ANALYTICS = 'view_analytics',
  EXPORT_REPORTS = 'export_reports',
  
  // Audit
  VIEW_AUDIT_LOGS = 'view_audit_logs',
  EXPORT_AUDIT_LOGS = 'export_audit_logs'
}

export const ROLE_PERMISSIONS = {
  super_admin: Object.values(AdminPermission),
  admin: [
    AdminPermission.VIEW_USERS,
    AdminPermission.EDIT_USERS,
    AdminPermission.SUSPEND_USERS,
    AdminPermission.VIEW_CONVERSATIONS,
    AdminPermission.DELETE_CONVERSATIONS,
    AdminPermission.VIEW_ANALYTICS,
    AdminPermission.VIEW_SETTINGS
  ],
  moderator: [
    AdminPermission.VIEW_CONVERSATIONS,
    AdminPermission.FLAG_CONTENT,
    AdminPermission.REVIEW_FLAGS,
    AdminPermission.VIEW_USERS
  ]
};

// Middleware to check permissions
export function requirePermission(permission: AdminPermission) {
  return async (req, res, next) => {
    const user = await prisma.user.findUnique({
      where: { id: req.userId },
      select: { role: true }
    });
    
    const permissions = ROLE_PERMISSIONS[user.role] || [];
    
    if (!permissions.includes(permission)) {
      return res.status(403).json({ error: 'Insufficient permissions' });
    }
    
    next();
  };
}
```

---

## ADVANCED FEATURES

### 1. Automated Alerts
```typescript
// services/alert.service.ts
export async function checkAlerts() {
  const alerts = [];
  
  // Check Groq key usage
  const groqUsage = await getGroqKeyUsage();
  groqUsage.forEach((key, index) => {
    if (key.usage > 13000) { // 90% of 14,400
      alerts.push({
        level: 'warning',
        message: `Groq API key #${index + 1} at ${Math.round(key.usage/144)}% daily limit`,
        timestamp: new Date()
      });
    }
  });
  
  // Check error rate
  const errorRate = await getRecentErrorRate();
  if (errorRate > 5) {
    alerts.push({
      level: 'critical',
      message: `High error rate: ${errorRate.toFixed(2)}%`,
      timestamp: new Date()
    });
  }
  
  // Check database connections
  const dbConnections = await prisma.$queryRaw`SELECT count(*) FROM pg_stat_activity`;
  if (dbConnections > 80) { // 80% of max
    alerts.push({
      level: 'warning',
      message: `Database connections at ${dbConnections}/100`,
      timestamp: new Date()
    });
  }
  
  // Check Redis memory
  const redisInfo = await redis.info('memory');
  const memoryUsed = parseRedisMemory(redisInfo);
  if (memoryUsed > 1.6 * 1024 * 1024 * 1024) { // 1.6GB of 2GB
    alerts.push({
      level: 'warning',
      message: `Redis memory at ${(memoryUsed / 1024 / 1024 / 1024).toFixed(2)}GB`,
      timestamp: new Date()
    });
  }
  
  return alerts;
}
```

### 2. User Impersonation (for support)
```typescript
// POST /api/v1/admin/users/:userId/impersonate
export async function impersonateUser(req, res) {
  const { userId } = req.params;
  
  // Verify admin has permission
  if (req.adminRole !== 'super_admin') {
    return res.status(403).json({ error: 'Only super admins can impersonate' });
  }
  
  // Generate temporary impersonation token
  const impersonationToken = jwt.sign(
    { userId, impersonatedBy: req.userId, exp: Date.now() + 3600000 }, // 1 hour
    process.env.JWT_SECRET
  );
  
  // Log impersonation
  await logAdminAction(req.userId, 'USER_IMPERSONATED', { userId });
  
  res.json({ token: impersonationToken });
}
```

### 3. Bulk Actions
```typescript
// POST /api/v1/admin/users/bulk-action
export async function bulkUserAction(req, res) {
  const { userIds, action, data } = req.body;
  
  // Limit bulk actions to 100 users at a time
  if (userIds.length > 100) {
    return res.status(400).json({ error: 'Maximum 100 users per bulk action' });
  }
  
  // Confirm action
  if (!req.body.confirmed) {
    return res.status(400).json({ 
      error: 'Bulk action requires confirmation',
      affectedUsers: userIds.length
    });
  }
  
  const results = {
    success: [],
    failed: []
  };
  
  for (const userId of userIds) {
    try {
      switch (action) {
        case 'suspend':
          await prisma.user.update({
            where: { id: userId },
            data: { status: 'suspended', suspendedReason: data.reason }
          });
          results.success.push(userId);
          break;
        
        case 'change_tier':
          await prisma.user.update({
            where: { id: userId },
            data: { tier: data.tier }
          });
          results.success.push(userId);
          break;
        
        case 'delete':
          await prisma.user.update({
            where: { id: userId },
            data: { status: 'deleted', deletedAt: new Date() }
          });
          results.success.push(userId);
          break;
      }
    } catch (error) {
      results.failed.push({ userId, error: error.message });
    }
  }
  
  await logAdminAction(req.userId, 'BULK_ACTION', { action, results });
  
  res.json(results);
}
```

### 4. Export User Data (GDPR)
```typescript
// GET /api/v1/admin/users/:userId/export-data
export async function exportUserData(req, res) {
  const { userId } = req.params;
  
  // Gather all user data
  const [user, conversations, analytics, apiKeys, webhooks] = await Promise.all([
    prisma.user.findUnique({ where: { id: userId } }),
    prisma.conversation.findMany({ where: { userId }, include: { messages: true } }),
    prisma.analytics.findMany({ where: { userId } }),
    prisma.apiKey.findMany({ where: { userId } }),
    prisma.webhook.findMany({ where: { userId } })
  ]);
  
  const exportData = {
    user,
    conversations,
    analytics,
    apiKeys: apiKeys.map(k => ({ ...k, key: '[REDACTED]' })),
    webhooks,
    exportedAt: new Date(),
    exportedBy: req.userId
  };
  
  // Generate JSON file
  const filename = `user_${userId}_export_${Date.now()}.json`;
  res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
  res.setHeader('Content-Type', 'application/json');
  res.json(exportData);
  
  await logAdminAction(req.userId, 'USER_DATA_EXPORTED', { userId });
}
```

---

## PERFORMANCE OPTIMIZATION

### 1. Caching Admin Dashboard Stats
```typescript
// Cache expensive queries
export async function getDashboardCached() {
  const cacheKey = 'admin:dashboard:stats';
  
  // Check cache first
  const cached = await redis.get(cacheKey);
  if (cached) {
    return JSON.parse(cached);
  }
  
  // Compute stats
  const stats = await computeDashboardStats();
  
  // Cache for 5 minutes
  await redis.setex(cacheKey, 300, JSON.stringify(stats));
  
  return stats;
}
```

### 2. Pagination for Large Datasets
- Use cursor-based pagination for audit logs
- Limit results to 100 per page maximum
- Add loading indicators for slow queries

### 3. Background Report Generation
```typescript
// Queue report generation instead of blocking
export async function generateReport(req, res) {
  const { type, params } = req.body;
  
  // Create report job
  const job = await reportQueue.add({
    type,
    params,
    requestedBy: req.userId
  });
  
  // Return job ID immediately
  res.json({ 
    jobId: job.id,
    status: 'queued',
    estimatedTime: '2-5 minutes'
  });
  
  // Client can poll: GET /api/v1/admin/reports/jobs/:jobId
}
```

---

## TESTING ADMIN PANEL

### 1. Test Admin Authorization
```bash
# Try to access admin endpoint without admin role
curl -H "Authorization: Bearer USER_TOKEN" \
  http://localhost:5001/api/v1/admin/dashboard

# Should return 403 Forbidden
```

### 2. Test Audit Logging
```bash
# Suspend a user
curl -X POST \
  -H "Authorization: Bearer ADMIN_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"reason": "Testing audit log"}' \
  http://localhost:5001/api/v1/admin/users/user_123/suspend

# Check audit log
curl -H "Authorization: Bearer ADMIN_TOKEN" \
  "http://localhost:5001/api/v1/admin/audit-logs?action=USER_SUSPENDED"

# Should show the suspension action
```

### 3. Test Bulk Actions
```bash
# Bulk suspend users (without confirmation)
curl -X POST \
  -H "Authorization: Bearer ADMIN_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "userIds": ["user_1", "user_2", "user_3"],
    "action": "suspend",
    "data": {"reason": "Spam"}
  }' \
  http://localhost:5001/api/v1/admin/users/bulk-action

# Should return error asking for confirmation

# With confirmation
curl -X POST \
  -H "Authorization: Bearer ADMIN_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "userIds": ["user_1", "user_2", "user_3"],
    "action": "suspend",
    "data": {"reason": "Spam"},
    "confirmed": true
  }' \
  http://localhost:5001/api/v1/admin/users/bulk-action

# Should succeed and return results
```

---

## DEPLOYMENT NOTES

### Environment Variables
```env
# Admin Settings
ADMIN_PANEL_ENABLED=true
ADMIN_MFA_REQUIRED=true
ADMIN_SESSION_TIMEOUT=3600000
ADMIN_IP_WHITELIST=192.168.1.0/24,10.0.0.0/8

# Audit
AUDIT_LOG_RETENTION_DAYS=2555
AUDIT_LOG_ENCRYPTION_KEY=your-encryption-key-here

# Reports
REPORT_GENERATION_TIMEOUT=600000
```

### Security Checklist
- [ ] Admin routes protected with requireAdmin middleware
- [ ] All admin actions logged in audit log
- [ ] MFA enabled for admin users
- [ ] Admin session timeout set to 1 hour
- [ ] IP whitelisting configured (if required)
- [ ] Audit logs encrypted at rest
- [ ] Destructive actions require confirmation
- [ ] Bulk actions limited to 100 items
- [ ] Rate limiting on admin endpoints
- [ ] Admin panel only accessible over HTTPS

---

## DELIVERABLES

After implementing this admin panel, you should have:

✅ Complete admin dashboard with real-time stats
✅ User management (view, edit, suspend, delete)
✅ API usage tracking and cost analysis
✅ Content moderation system
✅ System settings management
✅ Comprehensive audit logging
✅ Report generation
✅ Role-based access control
✅ Real-time notifications (WebSocket)
✅ Bulk actions
✅ GDPR compliance (data export, right to erasure)
✅ Security measures (MFA, IP whitelisting, audit trail)

---

## NEXT STEPS AFTER ADMIN PANEL

1. **Test thoroughly** - All admin features
2. **Security audit** - Penetration testing
3. **Documentation** - Admin user guide
4. **Training** - For admin/moderator users
5. **Monitoring** - Set up alerts for admin actions

---

**This admin panel will give you complete control over your BaatCheet application and all users, making it production-ready for enterprise use.**