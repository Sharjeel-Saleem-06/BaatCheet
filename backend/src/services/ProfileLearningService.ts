/**
 * Profile Learning Service
 * Implements an intelligent memory system that learns from conversations
 * and provides personalized responses - going BEYOND ChatGPT's capabilities.
 * 
 * Features:
 * - Automatic fact extraction from conversations
 * - Long-term user profile storage
 * - Conversation summaries for continuity
 * - Skill level tracking
 * - Interest decay over time
 * - Goal monitoring
 * - Relationship mapping
 * - Temporal context awareness
 * 
 * @module ProfileLearningService
 */

import { prisma } from '../config/database.js';
import { logger } from '../utils/logger.js';
import { aiRouter, Message } from './AIRouter.js';
import { cacheService, CACHE_PREFIXES, CACHE_TTL } from './CacheService.js';

// ============================================
// Types
// ============================================

export interface ExtractedFact {
  category: 'personal' | 'professional' | 'preference' | 'interest' | 'goal' | 'skill' | 'relationship';
  factType: string;
  factKey: string;
  factValue: string;
  confidence: number;
  source: 'explicit' | 'inferred';
  skillLevel?: string;
  goalStatus?: string;
  expiresAt?: Date;
}

export interface UserProfileContext {
  profile: string;
  recentConversations: string;
  factCount: number;
}

export interface ConversationSummaryData {
  title: string;
  summary: string;
  keyTopics: string[];
  mainIntent: string;
}

interface SkillTracking {
  topic: string;
  level: 'beginner' | 'intermediate' | 'advanced' | 'expert';
  confidence: number;
  questionsAsked: number;
  complexity: 'basic' | 'moderate' | 'advanced';
}

// ============================================
// Profile Learning Service Class
// ============================================

class ProfileLearningServiceClass {
  // Maximum facts to inject into prompt
  private readonly MAX_FACTS_IN_PROMPT = 50;
  // Maximum conversation summaries to include
  private readonly MAX_SUMMARIES_IN_PROMPT = 10;
  // Minimum confidence to include a fact
  private readonly MIN_CONFIDENCE_THRESHOLD = 0.5;

  /**
   * Analyze user message and extract learnable facts
   * Uses AI to detect information worth remembering
   */
  public async extractFactsFromMessage(
    userId: string,
    conversationId: string,
    userMessage: string,
    conversationHistory: Message[]
  ): Promise<ExtractedFact[]> {
    try {
      // Skip very short messages
      if (userMessage.length < 10) {
        return [];
      }

      const factExtractionPrompt = `You are a fact extraction AI. Analyze this user message and identify facts worth remembering long-term.

Extract facts in these categories:
- personal: name, location, age, family members, nationality, etc.
- professional: occupation, company, role, expertise, experience
- preference: likes, dislikes, communication style, formatting preferences
- interest: hobbies, topics of interest, areas they want to learn about
- goal: what user wants to achieve, projects they're working on
- skill: technical skills, languages, abilities, proficiency levels
- relationship: mentions of family, friends, colleagues (e.g., "my wife likes gardening")

User message: "${userMessage}"

Recent conversation context:
${this.formatRecentContext(conversationHistory)}

Return ONLY a valid JSON array of facts (or empty array [] if none found):
[
  {
    "category": "personal",
    "factType": "name",
    "factKey": "preferred_name",
    "factValue": "Ahmed",
    "confidence": 0.95,
    "source": "explicit"
  }
]

IMPORTANT RULES:
- Only extract facts that are clearly stated or strongly implied
- confidence: 1.0 = explicitly stated, 0.5-0.9 = inferred from context
- source: "explicit" if user directly stated it, "inferred" if detected from context
- Ignore temporary or situational information (like "I'm tired today")
- Focus on stable, long-term facts that would be useful in future conversations
- For skills, include a "skillLevel" field if determinable: "beginner", "intermediate", "advanced", "expert"
- For goals, include a "goalStatus" field: "active", "completed", "abandoned"
- Return ONLY the JSON array, no additional text`;

      const response = await aiRouter.chat({
        messages: [{ role: 'user', content: factExtractionPrompt }],
        temperature: 0.2, // Low temperature for consistent extraction
        maxTokens: 800,
      });

      if (!response.success || !response.content) {
        return [];
      }

      // Parse JSON (handle potential markdown fences)
      let content = response.content.trim();
      content = content.replace(/```json\n?|\n?```/g, '').trim();
      
      // Find JSON array in response
      const jsonMatch = content.match(/\[[\s\S]*\]/);
      if (!jsonMatch) {
        return [];
      }

      const facts = JSON.parse(jsonMatch[0]) as ExtractedFact[];
      
      // Validate and filter facts
      return facts.filter(fact => 
        fact.category && 
        fact.factKey && 
        fact.factValue && 
        fact.confidence >= this.MIN_CONFIDENCE_THRESHOLD
      );

    } catch (error) {
      logger.error('Fact extraction failed:', error);
      return [];
    }
  }

  /**
   * Save extracted facts to database with deduplication
   */
  public async saveFacts(
    userId: string,
    conversationId: string,
    facts: ExtractedFact[]
  ): Promise<number> {
    let savedCount = 0;

    for (const fact of facts) {
      try {
        // Check if fact already exists
        const existing = await prisma.userFact.findFirst({
          where: {
            userId,
            factKey: fact.factKey,
            isActive: true,
          },
        });

        if (existing) {
          // Update if new confidence is higher or value changed significantly
          const shouldUpdate = 
            fact.confidence > existing.confidence || 
            (fact.factValue !== existing.factValue && fact.confidence >= 0.8);

          if (shouldUpdate) {
            await prisma.userFact.update({
              where: { id: existing.id },
              data: {
                factValue: fact.factValue,
                confidence: Math.max(fact.confidence, existing.confidence),
                timestamp: new Date(),
                conversationId,
                skillLevel: fact.skillLevel || existing.skillLevel,
                goalStatus: fact.goalStatus || existing.goalStatus,
              },
            });

            logger.info('Fact updated', { userId, factKey: fact.factKey, newValue: fact.factValue });
            savedCount++;
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
              source: fact.source,
              skillLevel: fact.skillLevel,
              goalStatus: fact.goalStatus,
              expiresAt: fact.expiresAt,
            },
          });

          logger.info('New fact learned', { userId, factKey: fact.factKey, value: fact.factValue });
          savedCount++;
        }
      } catch (error) {
        logger.error('Failed to save fact:', { error, fact });
      }
    }

    // Update fact count in profile
    if (savedCount > 0) {
      const totalFacts = await prisma.userFact.count({
        where: { userId, isActive: true },
      });

      await prisma.userProfile.upsert({
        where: { userId },
        update: { factCount: totalFacts },
        create: {
          userId,
          factCount: totalFacts,
        },
      });

      // Invalidate cached profile context
      await cacheService.delete(`${CACHE_PREFIXES.SESSION}profile:${userId}`);
    }

    return savedCount;
  }

  /**
   * Generate conversation summary after chat ends or every N messages
   */
  public async generateConversationSummary(
    userId: string,
    conversationId: string
  ): Promise<ConversationSummaryData | null> {
    try {
      // Check if summary already exists
      const existingSummary = await prisma.conversationSummary.findUnique({
        where: { conversationId },
      });

      // Get conversation messages
      const conversation = await prisma.conversation.findUnique({
        where: { id: conversationId },
        include: {
          messages: {
            orderBy: { createdAt: 'asc' },
            where: { role: 'user' },
          },
        },
      });

      if (!conversation || conversation.messages.length === 0) {
        return null;
      }

      // Generate summary using AI
      const summaryPrompt = `Summarize this conversation from the user's perspective in 2-3 sentences. Focus on what the user discussed, asked about, or wanted to achieve.

User messages:
${conversation.messages.map(m => `- ${m.content.substring(0, 200)}`).join('\n')}

Provide:
1. Brief summary (2-3 sentences max)
2. Key topics (3-5 important words/phrases)
3. Main intent (ONE word: learning, problem_solving, brainstorming, creative, planning, coding, general)

Format as JSON:
{
  "summary": "...",
  "keyTopics": ["topic1", "topic2"],
  "mainIntent": "learning"
}`;

      const response = await aiRouter.chat({
        messages: [{ role: 'user', content: summaryPrompt }],
        temperature: 0.3,
        maxTokens: 400,
      });

      if (!response.success || !response.content) {
        return null;
      }

      let content = response.content.trim();
      content = content.replace(/```json\n?|\n?```/g, '').trim();

      const jsonMatch = content.match(/\{[\s\S]*\}/);
      if (!jsonMatch) {
        return null;
      }

      const { summary, keyTopics, mainIntent } = JSON.parse(jsonMatch[0]);

      const summaryData: ConversationSummaryData = {
        title: conversation.title,
        summary,
        keyTopics: Array.isArray(keyTopics) ? keyTopics : [],
        mainIntent: mainIntent || 'general',
      };

      // Save or update summary
      if (existingSummary) {
        await prisma.conversationSummary.update({
          where: { id: existingSummary.id },
          data: {
            summary: summaryData.summary,
            keyTopics: summaryData.keyTopics,
            mainIntent: summaryData.mainIntent,
            messageCount: conversation.messages.length,
            userMessages: conversation.messages.slice(-5).map(m => m.content.substring(0, 100)),
            timestamp: new Date(),
          },
        });
      } else {
        await prisma.conversationSummary.create({
          data: {
            userId,
            conversationId,
            title: summaryData.title,
            summary: summaryData.summary,
            keyTopics: summaryData.keyTopics,
            mainIntent: summaryData.mainIntent,
            messageCount: conversation.messages.length,
            userMessages: conversation.messages.slice(-5).map(m => m.content.substring(0, 100)),
          },
        });
      }

      logger.info('Conversation summarized', { conversationId, intent: summaryData.mainIntent });
      return summaryData;

    } catch (error) {
      logger.error('Summary generation failed:', error);
      return null;
    }
  }

  /**
   * Build user profile context for AI prompt (cached)
   */
  public async buildProfileContext(userId: string): Promise<string> {
    // Check cache first
    const cacheKey = `${CACHE_PREFIXES.SESSION}profile:${userId}`;
    const cached = await cacheService.get<string>(cacheKey);
    
    if (cached) {
      return cached;
    }

    // Get all active facts, ordered by confidence
    const facts = await prisma.userFact.findMany({
      where: { 
        userId, 
        isActive: true,
        confidence: { gte: this.MIN_CONFIDENCE_THRESHOLD },
      },
      orderBy: [
        { confidence: 'desc' },
        { timestamp: 'desc' },
      ],
      take: this.MAX_FACTS_IN_PROMPT,
    });

    if (facts.length === 0) {
      return '';
    }

    // Group facts by category
    const grouped = facts.reduce((acc, fact) => {
      if (!acc[fact.category]) acc[fact.category] = [];
      
      let factText = `- ${fact.factType}: ${fact.factValue}`;
      
      // Add skill level if applicable
      if (fact.skillLevel) {
        factText += ` (${fact.skillLevel})`;
      }
      
      // Add goal status if applicable
      if (fact.goalStatus) {
        factText += ` [${fact.goalStatus}]`;
      }
      
      acc[fact.category].push(factText);
      return acc;
    }, {} as Record<string, string[]>);

    // Format as readable text
    let context = '\n\n## 📝 USER PROFILE (Learned from past conversations)\n\n';

    // Define category display order and labels
    const categoryOrder: Record<string, string> = {
      personal: '👤 Personal',
      professional: '💼 Professional',
      skill: '🛠️ Skills & Expertise',
      interest: '🎯 Interests',
      goal: '🎯 Goals',
      preference: '⚙️ Preferences',
      relationship: '👥 Relationships',
    };

    for (const [category, label] of Object.entries(categoryOrder)) {
      if (grouped[category] && grouped[category].length > 0) {
        context += `**${label}:**\n`;
        context += grouped[category].join('\n') + '\n\n';
      }
    }

    context += `_Use this information to provide personalized responses. Reference relevant facts naturally when appropriate, but don't explicitly mention that you "remember" unless the user asks._\n`;

    // Cache for 1 hour
    await cacheService.set(cacheKey, context, CACHE_TTL.USER_SESSION);

    return context;
  }

  /**
   * Build recent conversation summaries context
   */
  public async buildRecentContext(
    userId: string, 
    currentConversationId?: string
  ): Promise<string> {
    // Get last N conversation summaries (excluding current)
    const summaries = await prisma.conversationSummary.findMany({
      where: {
        userId,
        conversationId: currentConversationId 
          ? { not: currentConversationId }
          : undefined,
      },
      orderBy: { timestamp: 'desc' },
      take: this.MAX_SUMMARIES_IN_PROMPT,
    });

    if (summaries.length === 0) {
      return '';
    }

    let context = '\n\n## 📚 RECENT CONVERSATIONS\n\n';
    context += 'Topics the user has discussed recently:\n\n';

    for (const summary of summaries) {
      const keyTopics = Array.isArray(summary.keyTopics) 
        ? (summary.keyTopics as string[]).join(', ')
        : '';
      
      context += `- **${summary.title}**: ${summary.summary}\n`;
      if (keyTopics) {
        context += `  _Topics: ${keyTopics}_\n`;
      }
      context += '\n';
    }

    return context;
  }

  /**
   * Get complete user context for AI prompt
   */
  public async getUserContext(
    userId: string,
    currentConversationId?: string
  ): Promise<UserProfileContext> {
    const [profile, recentConversations] = await Promise.all([
      this.buildProfileContext(userId),
      this.buildRecentContext(userId, currentConversationId),
    ]);

    const factCount = await prisma.userFact.count({
      where: { userId, isActive: true },
    });

    return {
      profile,
      recentConversations,
      factCount,
    };
  }

  /**
   * Update skill level based on conversation complexity
   */
  public async updateSkillLevel(
    userId: string,
    topic: string,
    questionComplexity: 'basic' | 'moderate' | 'advanced'
  ): Promise<void> {
    try {
      // Find existing skill fact
      const existingSkill = await prisma.userFact.findFirst({
        where: {
          userId,
          category: 'skill',
          factKey: `skill_${topic.toLowerCase().replace(/\s+/g, '_')}`,
          isActive: true,
        },
      });

      // Determine new skill level based on question complexity
      let newLevel: string;
      if (questionComplexity === 'advanced') {
        newLevel = existingSkill?.skillLevel === 'expert' ? 'expert' : 'advanced';
      } else if (questionComplexity === 'moderate') {
        newLevel = existingSkill?.skillLevel === 'advanced' || existingSkill?.skillLevel === 'expert'
          ? existingSkill.skillLevel
          : 'intermediate';
      } else {
        newLevel = existingSkill?.skillLevel || 'beginner';
      }

      if (existingSkill) {
        // Update existing skill
        await prisma.userFact.update({
          where: { id: existingSkill.id },
          data: {
            skillLevel: newLevel,
            confidence: Math.min(1.0, existingSkill.confidence + 0.05),
            timestamp: new Date(),
          },
        });
      } else {
        // Create new skill fact
        await prisma.userFact.create({
          data: {
            userId,
            category: 'skill',
            factType: 'technical_skill',
            factKey: `skill_${topic.toLowerCase().replace(/\s+/g, '_')}`,
            factValue: topic,
            confidence: 0.7,
            source: 'inferred',
            skillLevel: newLevel,
          },
        });
      }

      logger.info('Skill level updated', { userId, topic, level: newLevel });
    } catch (error) {
      logger.error('Failed to update skill level:', error);
    }
  }

  /**
   * Decay old interests (reduce confidence over time)
   */
  public async decayOldInterests(userId: string): Promise<number> {
    try {
      const threeMonthsAgo = new Date();
      threeMonthsAgo.setMonth(threeMonthsAgo.getMonth() - 3);

      // Get old interest facts
      const oldInterests = await prisma.userFact.findMany({
        where: {
          userId,
          category: 'interest',
          timestamp: { lt: threeMonthsAgo },
          isActive: true,
          confidence: { gt: 0.3 }, // Don't decay already low confidence
        },
      });

      // Decay confidence
      let decayedCount = 0;
      for (const interest of oldInterests) {
        const newConfidence = Math.max(0.3, interest.confidence - 0.1);
        
        await prisma.userFact.update({
          where: { id: interest.id },
          data: { 
            confidence: newConfidence,
            // Deactivate if confidence too low
            isActive: newConfidence > 0.3,
          },
        });
        decayedCount++;
      }

      if (decayedCount > 0) {
        logger.info('Interest decay applied', { userId, count: decayedCount });
      }

      return decayedCount;
    } catch (error) {
      logger.error('Interest decay failed:', error);
      return 0;
    }
  }

  /**
   * Update goal status and progress
   */
  public async updateGoalStatus(
    userId: string,
    goalKey: string,
    status: 'active' | 'completed' | 'abandoned',
    progress?: string
  ): Promise<void> {
    try {
      const existingGoal = await prisma.userFact.findFirst({
        where: {
          userId,
          category: 'goal',
          factKey: goalKey,
          isActive: true,
        },
      });

      if (existingGoal) {
        await prisma.userFact.update({
          where: { id: existingGoal.id },
          data: {
            goalStatus: status,
            goalProgress: progress || existingGoal.goalProgress,
            timestamp: new Date(),
          },
        });

        logger.info('Goal status updated', { userId, goalKey, status });
      }
    } catch (error) {
      logger.error('Failed to update goal status:', error);
    }
  }

  /**
   * Get all facts for a user (for profile management)
   */
  public async getUserFacts(userId: string): Promise<{
    facts: Record<string, Array<{
      id: string;
      type: string;
      value: string;
      confidence: number;
      source: string;
      learnedAt: Date;
      skillLevel?: string | null;
      goalStatus?: string | null;
    }>>;
    totalFacts: number;
  }> {
    const facts = await prisma.userFact.findMany({
      where: { userId, isActive: true },
      orderBy: [
        { category: 'asc' },
        { confidence: 'desc' },
      ],
    });

    const grouped = facts.reduce((acc, fact) => {
      if (!acc[fact.category]) acc[fact.category] = [];
      acc[fact.category].push({
        id: fact.id,
        type: fact.factType,
        value: fact.factValue,
        confidence: fact.confidence,
        source: fact.source,
        learnedAt: fact.timestamp,
        skillLevel: fact.skillLevel,
        goalStatus: fact.goalStatus,
      });
      return acc;
    }, {} as Record<string, Array<{
      id: string;
      type: string;
      value: string;
      confidence: number;
      source: string;
      learnedAt: Date;
      skillLevel?: string | null;
      goalStatus?: string | null;
    }>>);

    return {
      facts: grouped,
      totalFacts: facts.length,
    };
  }

  /**
   * Delete a specific fact
   */
  public async deleteFact(userId: string, factId: string): Promise<boolean> {
    try {
      const fact = await prisma.userFact.findFirst({
        where: { id: factId, userId },
      });

      if (!fact) {
        return false;
      }

      // Soft delete
      await prisma.userFact.update({
        where: { id: factId },
        data: { isActive: false },
      });

      // Update fact count
      const totalFacts = await prisma.userFact.count({
        where: { userId, isActive: true },
      });

      await prisma.userProfile.update({
        where: { userId },
        data: { factCount: totalFacts },
      });

      // Invalidate cache
      await cacheService.delete(`${CACHE_PREFIXES.SESSION}profile:${userId}`);

      logger.info('Fact deleted', { userId, factId });
      return true;
    } catch (error) {
      logger.error('Failed to delete fact:', error);
      return false;
    }
  }

  /**
   * Explicitly teach a fact (user-initiated)
   */
  public async teachFact(
    userId: string,
    category: string,
    factType: string,
    factKey: string,
    factValue: string
  ): Promise<boolean> {
    try {
      // Check for existing fact with same key
      const existing = await prisma.userFact.findFirst({
        where: {
          userId,
          factKey,
          isActive: true,
        },
      });

      if (existing) {
        // Update existing
        await prisma.userFact.update({
          where: { id: existing.id },
          data: {
            factValue,
            confidence: 1.0, // Explicit = 100% confidence
            source: 'explicit',
            timestamp: new Date(),
          },
        });
      } else {
        // Create new
        await prisma.userFact.create({
          data: {
            userId,
            category,
            factType,
            factKey,
            factValue,
            confidence: 1.0,
            source: 'explicit',
          },
        });

        // Update fact count
        const totalFacts = await prisma.userFact.count({
          where: { userId, isActive: true },
        });

        await prisma.userProfile.upsert({
          where: { userId },
          update: { factCount: totalFacts },
          create: { userId, factCount: totalFacts },
        });
      }

      // Invalidate cache
      await cacheService.delete(`${CACHE_PREFIXES.SESSION}profile:${userId}`);

      logger.info('Fact taught', { userId, factKey, factValue });
      return true;
    } catch (error) {
      logger.error('Failed to teach fact:', error);
      return false;
    }
  }

  /**
   * Generate AI response about what is known about user
   */
  public async askAboutProfile(userId: string): Promise<string> {
    try {
      const context = await this.buildProfileContext(userId);

      if (!context || context.length < 50) {
        return "I haven't learned much about you yet! As we chat more, I'll remember things like your name, interests, skills, and preferences to provide more personalized assistance.";
      }

      const response = await aiRouter.chat({
        messages: [
          {
            role: 'system',
            content: 'You are helping a user understand what information you have learned about them. Present it in a friendly, organized way. Be warm and conversational.',
          },
          {
            role: 'user',
            content: `Here's what I know about the user:\n\n${context}\n\nPlease present this information in a friendly, organized format. Group by category and explain what you remember. Make it feel personal, not like a data dump.`,
          },
        ],
        temperature: 0.7,
        maxTokens: 600,
      });

      return response.content || "I couldn't retrieve your profile information right now. Please try again.";
    } catch (error) {
      logger.error('Failed to ask about profile:', error);
      return "Sorry, I couldn't retrieve your profile information. Please try again later.";
    }
  }

  /**
   * Format recent conversation context for fact extraction
   */
  private formatRecentContext(messages: Message[]): string {
    return messages
      .slice(-5)
      .map(m => `${m.role}: ${m.content.substring(0, 150)}`)
      .join('\n');
  }

  /**
   * Check if conversation should generate summary (every N messages)
   */
  public async shouldGenerateSummary(conversationId: string): Promise<boolean> {
    const messageCount = await prisma.message.count({
      where: { conversationId },
    });

    // Generate summary every 10 messages
    return messageCount >= 10 && messageCount % 10 === 0;
  }

  /**
   * Get user's profile stats
   */
  public async getProfileStats(userId: string): Promise<{
    totalFacts: number;
    factsByCategory: Record<string, number>;
    conversationsSummarized: number;
    topInterests: string[];
    topSkills: string[];
    activeGoals: string[];
  }> {
    const [facts, summaryCount] = await Promise.all([
      prisma.userFact.findMany({
        where: { userId, isActive: true },
      }),
      prisma.conversationSummary.count({
        where: { userId },
      }),
    ]);

    const factsByCategory = facts.reduce((acc, fact) => {
      acc[fact.category] = (acc[fact.category] || 0) + 1;
      return acc;
    }, {} as Record<string, number>);

    const interests = facts
      .filter(f => f.category === 'interest')
      .sort((a, b) => b.confidence - a.confidence)
      .slice(0, 5)
      .map(f => f.factValue);

    const skills = facts
      .filter(f => f.category === 'skill')
      .sort((a, b) => b.confidence - a.confidence)
      .slice(0, 5)
      .map(f => `${f.factValue}${f.skillLevel ? ` (${f.skillLevel})` : ''}`);

    const goals = facts
      .filter(f => f.category === 'goal' && f.goalStatus === 'active')
      .map(f => f.factValue);

    return {
      totalFacts: facts.length,
      factsByCategory,
      conversationsSummarized: summaryCount,
      topInterests: interests,
      topSkills: skills,
      activeGoals: goals,
    };
  }
}

// Export singleton instance
export const profileLearning = new ProfileLearningServiceClass();
export default profileLearning;
