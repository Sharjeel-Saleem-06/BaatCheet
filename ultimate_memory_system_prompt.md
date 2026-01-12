# CURSOR PROMPT: BaatCheet - Ultimate Memory & Profile Learning System

Based on reverse-engineered analysis of ChatGPT's memory system and extensive research, implement an enterprise-grade user profiling and memory system that learns from conversations and provides personalized responses - going BEYOND ChatGPT's capabilities.

---

## 🔬 RESEARCH FINDINGS: HOW CHATGPT MEMORY ACTUALLY WORKS

### ChatGPT Memory Architecture (Reverse Engineered):

**Four-Layer System:**

1. **Session Metadata** (Temporary)
   - Current location, device, time
   - Disappears after session ends

2. **Saved Memories** (Long-term Facts)
   - ChatGPT has dedicated tool for storing stable, long-term facts about user - accumulate over weeks/months to form persistent profile
   - 33 stored facts like name, job title, preferences
   - ChatGPT remembers helpful context from earlier conversations like preferences and interests

3. **Recent Conversation Summaries** (Continuity)
   - 15 lightweight summaries of recent chats - not full transcripts, just user message snippets
   - Provides sense of continuity without detailed context

4. **Current Session Window** (Active Context)
   - Full history of current conversation
   - Rolls off when token limit reached

### Key Insights:

- **No Vector Database:** No RAG over conversation history - simpler than expected
- **Pre-computed Summaries:** Lightweight summaries injected directly for speed and efficiency
- **Automatic Learning:** ChatGPT can remember useful details between chats, making responses more personalized
- **User Control:** Users can review and delete saved memories, ask what ChatGPT remembers

---

## 🎯 BAATCHEET MEMORY SYSTEM (SUPERIOR TO CHATGPT)

### What We'll Build:

```
┌────────────────────────────────────────────────────────────┐
│           USER PROFILE & MEMORY ARCHITECTURE                │
└────────────────────────────────────────────────────────────┘
                            │
        ┌───────────────────┼───────────────────┐
        │                   │                   │
        ▼                   ▼                   ▼
┌──────────────┐   ┌──────────────┐   ┌──────────────┐
│   SESSION    │   │    PROFILE   │   │ CONVERSATION │
│   METADATA   │   │    FACTS     │   │  SUMMARIES   │
│  (Temporary) │   │  (Long-term) │   │   (Recent)   │
└──────────────┘   └──────────────┘   └──────────────┘
        │                   │                   │
        └───────────────────┼───────────────────┘
                            ▼
                  ┌──────────────────┐
                  │  ENHANCED PROMPT │
                  │    TO AI MODEL   │
                  └──────────────────┘
                            │
                            ▼
                  ┌──────────────────┐
                  │   PERSONALIZED   │
                  │     RESPONSE     │
                  └──────────────────┘
```

---

## 📋 IMPLEMENTATION: DATABASE SCHEMA

### 1. User Profile Facts (Long-term Memory)

```prisma
model UserProfile {
  id            String   @id @default(cuid())
  userId        String   @unique
  user          User     @relation(fields: [userId], references: [id])
  
  // Core identity facts
  fullName      String?
  preferredName String?  // How user wants to be addressed
  occupation    String?
  education     String?
  location      String?
  
  // Preferences & Interests
  interests     Json     // Array: ["AI", "coding", "fitness"]
  preferences   Json     // Object: { tone: "casual", detailLevel: "detailed" }
  expertise     Json     // Array: ["Python", "React", "DevOps"]
  goals         Json     // Array: ["Learn AI", "Build startup"]
  
  // Communication style
  preferredLanguage String @default("auto") // "english", "roman-urdu", "mixed"
  communicationTone String @default("friendly") // "professional", "casual", "friendly"
  responseStyle     String @default("balanced") // "concise", "balanced", "comprehensive"
  
  // Usage patterns
  primaryUseCase   String?  // "coding", "learning", "business", "creative"
  typicalQuestions Json     // Array of common question types
  
  // Metadata
  factCount      Int      @default(0)
  lastUpdated    DateTime @updatedAt
  createdAt      DateTime @default(now())
  
  @@index([userId])
}

model UserFact {
  id           String   @id @default(cuid())
  userId       String
  user         User     @relation(fields: [userId], references: [id])
  
  category     String   // "personal", "professional", "preference", "goal"
  factType     String   // "name", "occupation", "interest", "skill", etc.
  factKey      String   // "preferred_name", "occupation", etc.
  factValue    String   // Actual value
  confidence   Float    @default(1.0) // 0-1 confidence score
  source       String   // "explicit" (user told us) or "inferred" (we detected)
  
  conversationId String? // Where this fact was learned
  timestamp    DateTime @default(now())
  expiresAt    DateTime? // Optional expiry for temporary facts
  isActive     Boolean  @default(true)
  
  @@index([userId, isActive])
  @@index([category])
}

model ConversationSummary {
  id              String   @id @default(cuid())
  userId          String
  user            User     @relation(fields: [userId], references: [id])
  conversationId  String
  conversation    Conversation @relation(fields: [conversationId], references: [id], onDelete: Cascade)
  
  title           String   // Auto-generated title
  summary         String   @db.Text // Brief summary of user's messages
  keyTopics       Json     // Array: ["Python", "API", "deployment"]
  mainIntent      String   // "learning", "problem_solving", "brainstorming"
  
  messageCount    Int
  userMessages    Json     // Array of user message snippets
  timestamp       DateTime @default(now())
  
  @@index([userId, timestamp])
  @@index([conversationId])
}
```

---

## 🧠 IMPLEMENTATION: PROFILE LEARNING SERVICE

### Automatic Fact Extraction

```typescript
// services/profile-learning.service.ts

interface ExtractedFact {
  category: string;
  factType: string;
  factKey: string;
  factValue: string;
  confidence: number;
  source: 'explicit' | 'inferred';
}

class ProfileLearningService {
  
  /**
   * Analyze user message and extract learnable facts
   * Uses AI to detect information worth remembering
   */
  async extractFactsFromMessage(
    userId: string,
    conversationId: string,
    userMessage: string,
    conversationHistory: Message[]
  ): Promise<ExtractedFact[]> {
    
    // Step 1: Use AI to identify facts worth remembering
    const factExtractionPrompt = `You are a fact extraction AI. Analyze this user message and identify facts worth remembering long-term.

Extract facts in these categories:
- personal: name, location, age, family, etc.
- professional: occupation, company, role, expertise
- preferences: likes, dislikes, communication style
- interests: hobbies, topics of interest
- goals: what user wants to achieve
- skills: technical skills, languages, abilities

User message: "${userMessage}"

Recent conversation context: ${this.formatRecentContext(conversationHistory)}

Return ONLY a JSON array of facts (or empty array if none):
[
  {
    "category": "personal",
    "factType": "name",
    "factKey": "preferred_name",
    "factValue": "John",
    "confidence": 0.95,
    "source": "explicit"
  }
]

Rules:
- Only extract facts that are clearly stated or strongly implied
- confidence: 1.0 = explicitly stated, 0.5-0.9 = inferred
- source: "explicit" if user directly stated, "inferred" if detected from context
- Ignore temporary or situational information
- Focus on stable, long-term facts`;

    try {
      const response = await aiRouter.chat({
        messages: [{ role: 'user', content: factExtractionPrompt }],
        temperature: 0.3, // Low temperature for consistent extraction
        max_tokens: 500
      });
      
      const content = response.choices[0].message.content.trim();
      
      // Parse JSON (handle potential markdown fences)
      const jsonStr = content.replace(/```json\n?|\n?```/g, '').trim();
      const facts = JSON.parse(jsonStr);
      
      return facts;
      
    } catch (error) {
      logger.error('Fact extraction failed:', error);
      return [];
    }
  }
  
  /**
   * Save extracted facts to database
   */
  async saveFacts(
    userId: string,
    conversationId: string,
    facts: ExtractedFact[]
  ): Promise<void> {
    
    for (const fact of facts) {
      // Check if fact already exists
      const existing = await prisma.userFact.findFirst({
        where: {
          userId,
          factKey: fact.factKey,
          isActive: true
        }
      });
      
      if (existing) {
        // Update if new confidence is higher or value changed
        if (fact.confidence > existing.confidence || fact.factValue !== existing.factValue) {
          await prisma.userFact.update({
            where: { id: existing.id },
            data: {
              factValue: fact.factValue,
              confidence: fact.confidence,
              timestamp: new Date(),
              conversationId
            }
          });
          
          logger.info('Fact updated', { userId, factKey: fact.factKey });
        }
      } else {
        // Create new fact
        await prisma.userFact.create({
          data: {
            userId,
            conversationId,
            category: fact.category,
            factType: fact.factType,
            factKey: fact.factKey,
            factValue: fact.factValue,
            confidence: fact.confidence,
            source: fact.source
          }
        });
        
        logger.info('New fact learned', { userId, factKey: fact.factKey });
      }
    }
    
    // Update fact count in profile
    const totalFacts = await prisma.userFact.count({
      where: { userId, isActive: true }
    });
    
    await prisma.userProfile.upsert({
      where: { userId },
      update: { factCount: totalFacts },
      create: {
        userId,
        factCount: totalFacts
      }
    });
  }
  
  /**
   * Generate conversation summary after chat ends or every N messages
   */
  async generateConversationSummary(
    userId: string,
    conversationId: string
  ): Promise<void> {
    
    // Get conversation messages
    const conversation = await prisma.conversation.findUnique({
      where: { id: conversationId },
      include: {
        messages: {
          orderBy: { createdAt: 'asc' },
          where: { role: 'user' } // Only user messages for summary
        }
      }
    });
    
    if (!conversation || conversation.messages.length === 0) return;
    
    // Generate summary using AI
    const summaryPrompt = `Summarize this conversation from the user's perspective in 2-3 sentences. Focus on what the user discussed, asked about, or wanted to achieve.

User messages:
${conversation.messages.map(m => `- ${m.content}`).join('\n')}

Provide:
1. Brief summary (2-3 sentences)
2. Key topics (3-5 words/phrases)
3. Main intent (one word: learning/problem_solving/brainstorming/creative/planning)

Format as JSON:
{
  "summary": "...",
  "keyTopics": ["topic1", "topic2"],
  "mainIntent": "learning"
}`;

    try {
      const response = await aiRouter.chat({
        messages: [{ role: 'user', content: summaryPrompt }],
        temperature: 0.4,
        max_tokens: 300
      });
      
      const content = response.choices[0].message.content.trim();
      const jsonStr = content.replace(/```json\n?|\n?```/g, '').trim();
      const { summary, keyTopics, mainIntent } = JSON.parse(jsonStr);
      
      // Save summary
      await prisma.conversationSummary.create({
        data: {
          userId,
          conversationId,
          title: conversation.title,
          summary,
          keyTopics,
          mainIntent,
          messageCount: conversation.messages.length,
          userMessages: conversation.messages.slice(-5).map(m => m.content.substring(0, 100)) // Last 5 messages, truncated
        }
      });
      
      logger.info('Conversation summarized', { conversationId });
      
    } catch (error) {
      logger.error('Summary generation failed:', error);
    }
  }
  
  /**
   * Build user profile context for AI prompt
   */
  async buildProfileContext(userId: string): Promise<string> {
    
    // Get all active facts
    const facts = await prisma.userFact.findMany({
      where: { userId, isActive: true },
      orderBy: { confidence: 'desc' }
    });
    
    if (facts.length === 0) {
      return ''; // No profile yet
    }
    
    // Group facts by category
    const grouped = facts.reduce((acc, fact) => {
      if (!acc[fact.category]) acc[fact.category] = [];
      acc[fact.category].push(`- ${fact.factType}: ${fact.factValue}`);
      return acc;
    }, {} as Record<string, string[]>);
    
    // Format as readable text
    let context = '\n\n## USER PROFILE\n\n';
    context += 'You have learned the following about this user from past conversations:\n\n';
    
    for (const [category, factList] of Object.entries(grouped)) {
      context += `**${category.toUpperCase()}:**\n`;
      context += factList.join('\n') + '\n\n';
    }
    
    context += 'Use this information to provide personalized responses. ';
    context += 'Reference relevant facts naturally when appropriate, but don\'t mention that you "remember" unless asked.';
    
    return context;
  }
  
  /**
   * Build recent conversation summaries context
   */
  async buildRecentContext(userId: string, currentConversationId: string): Promise<string> {
    
    // Get last 10 conversation summaries (excluding current)
    const summaries = await prisma.conversationSummary.findMany({
      where: {
        userId,
        conversationId: { not: currentConversationId }
      },
      orderBy: { timestamp: 'desc' },
      take: 10
    });
    
    if (summaries.length === 0) {
      return '';
    }
    
    let context = '\n\n## RECENT CONVERSATIONS\n\n';
    context += 'Recent topics the user has discussed:\n\n';
    
    for (const summary of summaries) {
      context += `- **${summary.title}**: ${summary.summary} (${summary.mainIntent})\n`;
      context += `  Topics: ${summary.keyTopics.join(', ')}\n\n`;
    }
    
    return context;
  }
  
  private formatRecentContext(messages: Message[]): string {
    return messages
      .slice(-5) // Last 5 messages
      .map(m => `${m.role}: ${m.content.substring(0, 100)}`)
      .join('\n');
  }
}

export const profileLearning = new ProfileLearningService();
```

---

## 🔄 IMPLEMENTATION: UPDATE CHAT CONTROLLER

### Integrate Memory System into Chat Flow

```typescript
// controllers/chat.controller.ts (ENHANCED)

export async function sendMessage(req, res) {
  const { conversationId, message, imageId, stream = true } = req.body;
  const userId = req.userId;

  try {
    // Step 1: Extract facts from user message (async, don't wait)
    const conversationHistory = await contextManager.getMessages(conversationId);
    
    // Run fact extraction in background
    profileLearning.extractFactsFromMessage(
      userId,
      conversationId || 'temp',
      message,
      conversationHistory
    ).then(facts => {
      if (facts.length > 0) {
        profileLearning.saveFacts(userId, conversationId || 'temp', facts);
        logger.info(`Learned ${facts.length} new facts`, { userId });
      }
    }).catch(err => logger.error('Fact extraction failed:', err));
    
    // Step 2: Build enhanced system prompt with user profile
    const profileContext = await profileLearning.buildProfileContext(userId);
    const recentContext = await profileLearning.buildRecentContext(userId, conversationId || '');
    
    const enhancedSystemPrompt = ADVANCED_SYSTEM_PROMPT + profileContext + recentContext;
    
    // Step 3: Get conversation context
    const context = await contextManager.getContext(conversationId);
    
    // Step 4: Prepare messages
    const messages = [
      { role: 'system', content: enhancedSystemPrompt },
      ...context,
      { role: 'user', content: message }
    ];
    
    logger.info('Chat request with memory', {
      userId,
      factsCount: (await prisma.userFact.count({ where: { userId, isActive: true }})),
      hasProfile: profileContext.length > 0
    });
    
    // Step 5: Call AI
    const aiResponse = await aiRouter.chat({
      messages,
      stream,
      temperature: 0.7
    });
    
    if (stream) {
      // Streaming response...
      res.setHeader('Content-Type', 'text/event-stream');
      res.setHeader('Cache-Control', 'no-cache');
      res.setHeader('Connection', 'keep-alive');

      let fullResponse = '';

      for await (const chunk of aiResponse) {
        const content = chunk.choices[0]?.delta?.content || '';
        fullResponse += content;
        
        res.write(`data: ${JSON.stringify({ content })}\n\n`);
      }

      res.write(`data: [DONE]\n\n`);
      res.end();

      // Save messages
      await saveMessages(conversationId, userId, message, fullResponse, imageId);
      
      // Generate summary if conversation has 10+ messages
      const messageCount = await prisma.message.count({
        where: { conversationId: conversationId || 'new' }
      });
      
      if (messageCount >= 10 && messageCount % 10 === 0) {
        // Generate summary every 10 messages
        profileLearning.generateConversationSummary(userId, conversationId || 'new')
          .catch(err => logger.error('Summary generation failed:', err));
      }
      
    } else {
      // Non-streaming...
      const rawResponse = aiResponse.choices[0].message.content;
      
      await saveMessages(conversationId, userId, message, rawResponse, imageId);
      
      res.json({
        message: rawResponse,
        conversationId: conversationId || 'new'
      });
    }

  } catch (error) {
    logger.error('Chat error:', error);
    res.status(500).json({ error: 'Failed to process message' });
  }
}
```

---

## 🎯 IMPLEMENTATION: PROFILE MANAGEMENT ENDPOINTS

### Allow Users to View/Manage Their Profile

```typescript
// routes/profile.routes.ts

router.get('/profile/me', async (req, res) => {
  const { userId } = req;
  
  // Get all facts
  const facts = await prisma.userFact.findMany({
    where: { userId, isActive: true },
    orderBy: { confidence: 'desc' }
  });
  
  // Get profile summary
  const profile = await prisma.userProfile.findUnique({
    where: { userId }
  });
  
  // Group facts by category
  const grouped = facts.reduce((acc, fact) => {
    if (!acc[fact.category]) acc[fact.category] = [];
    acc[fact.category].push({
      id: fact.id,
      type: fact.factType,
      value: fact.factValue,
      confidence: fact.confidence,
      source: fact.source,
      learnedAt: fact.timestamp
    });
    return acc;
  }, {} as any);
  
  res.json({
    profile,
    facts: grouped,
    totalFacts: facts.length
  });
});

router.delete('/profile/facts/:factId', async (req, res) => {
  const { userId } = req;
  const { factId } = req.params;
  
  // Soft delete fact
  await prisma.userFact.update({
    where: { id: factId, userId },
    data: { isActive: false }
  });
  
  res.json({ success: true });
});

router.post('/profile/teach', async (req, res) => {
  const { userId } = req;
  const { fact } = req.body; // { category, type, key, value }
  
  // User explicitly teaching something
  await prisma.userFact.create({
    data: {
      userId,
      category: fact.category,
      factType: fact.type,
      factKey: fact.key,
      factValue: fact.value,
      confidence: 1.0, // Explicit = 100% confidence
      source: 'explicit'
    }
  });
  
  res.json({ success: true });
});

router.post('/profile/ask', async (req, res) => {
  const { userId } = req;
  
  // User asks "What do you know about me?"
  const context = await profileLearning.buildProfileContext(userId);
  
  const response = await aiRouter.chat({
    messages: [
      {
        role: 'system',
        content: 'You are helping a user understand what information you have learned about them. Present it in a friendly, organized way.'
      },
      {
        role: 'user',
        content: `Here's what I know about the user:\n\n${context}\n\nPlease present this information in a friendly, organized format. Group by category and explain what you remember.`
      }
    ],
    temperature: 0.7
  });
  
  res.json({
    message: response.choices[0].message.content
  });
});
```

---

## 🚀 ADVANCED FEATURES (BEYOND CHATGPT)

### 1. **Skill Level Tracking**

Track user's expertise level in topics over time:

```typescript
interface SkillTracking {
  topic: string; // "Python", "React", "Machine Learning"
  level: string; // "beginner", "intermediate", "advanced", "expert"
  confidence: number;
  lastUpdated: Date;
  questionsAsked: number;
  complexity: string; // "basic", "moderate", "advanced"
}

// Update skill level based on conversation complexity
async function updateSkillLevel(userId: string, topic: string, questionComplexity: string) {
  // Analyze questions over time to determine skill progression
  // If user asks advanced questions → level up
  // Store in UserFact with category "skill"
}
```

### 2. **Interest Decay**

Reduce relevance of old interests:

```typescript
// Interests mentioned recently = high relevance
// Interests not mentioned in 3 months = low relevance
async function decayOldInterests(userId: string) {
  const threeMonthsAgo = new Date();
  threeMonthsAgo.setMonth(threeMonthsAgo.getMonth() - 3);
  
  await prisma.userFact.updateMany({
    where: {
      userId,
      category: 'interest',
      timestamp: { lt: threeMonthsAgo }
    },
    data: {
      confidence: { decrement: 0.1 } // Reduce confidence over time
    }
  });
}
```

### 3. **Relationship Mapping**

Learn about user's relationships:

```typescript
// Extract facts like:
// - "My wife likes gardening"
// - "My son is learning Python"
// - "My boss wants the report by Friday"

interface RelationshipFact {
  relationshipType: string; // "wife", "son", "boss", "friend"
  relationshipName: string; // Optional
  facts: string[]; // What we know about them
}
```

### 4. **Goal Tracking**

Monitor user's stated goals:

```typescript
interface Goal {
  goal: string; // "Learn machine learning"
  status: string; // "active", "completed", "abandoned"
  firstMentioned: Date;
  lastMentioned: Date;
  progress: string; // "just started", "making progress", "advanced"
  relatedConversations: string[]; // Conversation IDs
}

// When user mentions goal again, acknowledge progress
// "I remember you were learning ML. How's that going?"
```

###5. **Temporal Context Awareness**

Remember time-sensitive information:

```typescript
// - "I have a presentation tomorrow" → Remind if user chats next day
// - "I'm on vacation this week" → Adjust tone, don't suggest work tasks
// - "My exam is next month" → Check in periodically

interface TemporalFact {
  fact: string;
  validFrom: Date;
  validUntil: Date;
  isActive: boolean;
}
```

---

## 📊 OPTIMIZATION FOR PERFORMANCE

### Key Strategies:

1. **Async Fact Extraction**
   - Don't block response waiting for fact extraction
   - Run in background after responding to user

2. **Cached Profile Context**
   - Cache built profile context in Redis (TTL: 1 hour)
   - Only rebuild when facts change

3. **Lazy Summary Generation**
   - Generate summaries every 10 messages, not every message
   - Or generate when conversation ends

4. **Indexed Queries**
   - Database indexes on userId, isActive, timestamp
   - Fast retrieval of user facts

5. **Limited Context Size**
   - Maximum 50 facts injected into prompt (highest confidence first)
   - Maximum 10 recent conversation summaries

### Performance Targets:

| Operation | Target | ChatGPT | BaatCheet |
|-----------|--------|---------|-----------|
| Fact Extraction | < 2s | N/A | Background (doesn't block) |
| Profile Context Build | < 100ms | Unknown | Cached |
| Summary Generation | < 3s | Unknown | Background |
| Overall Response Delay | 0ms | 0ms | 0ms (all async) |

---

## ✅ TESTING & VALIDATION

### Test Scenarios:

**Scenario 1: Learning User's Name**
```
User: "Hi, I'm Ahmed"
→ System learns: name = "Ahmed" (confidence: 1.0, explicit)
Next conversation: "Hello Ahmed! How can I help you today?"
```

**Scenario 2: Learning Occupation**
```
User: "I'm a software engineer working on React apps"
→ System learns:
  - occupation = "software engineer" (0.95, explicit)
  - skill = "React" (0.9, inferred)
  - interest = "web development" (0.8, inferred)
```

**Scenario 3: Profile Analysis**
```
User: "What do you know about me?"
→ System responds with organized summary of all learned facts
```

**Scenario 4: Personalized Recommendations**
```
User has discussed: Python, machine learning, wants to build AI app
User asks: "Recommend a project for me"
→ AI suggests AI-related Python project (personalized)
```

---

## 🎯 DELIVERABLES

After implementation:

✅ **Automatic Learning** - System learns from every conversation
✅ **33+ Facts Stored** - Name, occupation, interests, skills, goals
✅ **Recent Conversation Context** - Last 10 conversation summaries
✅ **Personalized Responses** - AI references user profile naturally
✅ **User Control** - View, edit, delete facts anytime
✅ **"What do you remember about me?"** - Works perfectly
✅ **Zero Performance Impact** - All processing is async/cached
✅ **Beyond ChatGPT** - Skill tracking, goal monitoring, relationship mapping
✅ **Free Implementation** - No paid services (uses existing AI)
✅ **Privacy Focused** - User controls their data
✅ **Scalable** - Optimized queries, caching, indexes

---

## 🚀 HOW THIS SURPASSES CHATGPT

| Feature | ChatGPT | BaatCheet (After Implementation) |
|---------|---------|----------------------------------|
| **Automatic Learning** | ✅ Yes | ✅ Yes |
| **Stored Facts** | ~33 | ✅ Unlimited (practical: 50-100) |
| **Conversation Summaries** | ✅ 15 recent | ✅ 10 recent (configurable) |
| **User Profile View** | ⚠️ Limited | ✅ Full access + management |
| **Skill Level Tracking** | ❌ No | ✅ Yes (tracks progression) |
| **Goal Monitoring** | ❌ No | ✅ Yes (tracks goals over time) |
| **Relationship Mapping** | ❌ No | ✅ Yes (remembers family/colleagues) |
| **Temporal Awareness** | ❌ No | ✅ Yes (time-sensitive facts) |
| **Interest Decay** | ❌ No | ✅ Yes (old interests fade) |
| **Performance Impact** | Unknown | ✅ Zero (async processing) |
| **Cost** | Included | ✅ Free (uses existing infrastructure) |

---

**This system will make BaatCheet learn from users exactly like ChatGPT, with ADDITIONAL features that ChatGPT doesn't have!**