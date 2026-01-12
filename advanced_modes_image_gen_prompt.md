# FINAL CURSOR PROMPT: BaatCheet - Advanced AI Modes, Smart Tags & Image Generation

Based on comprehensive research of ChatGPT's DALL-E 3, GPT-4o Image Generation, and advanced mode systems, implement an intelligent multi-mode AI system with smart tags, image generation, and advanced capabilities that SURPASS ChatGPT.

---

## 🔬 RESEARCH FINDINGS: CHATGPT MODES & IMAGE GENERATION

### ChatGPT Image Generation (Discovered):

1. **DALL·E 3 can reliably render intricate details including text, hands, and faces - particularly good at responding to extensive, detailed prompts**

2. **When prompted with an idea, ChatGPT automatically generates tailored, detailed prompts for DALL·E 3 that bring your idea to life**

3. **If you like particular image but not quite right, you can ask ChatGPT to make tweaks with just few words**

4. **DALL-E 3 can produce variations of images as individual outputs, and edit images to modify or expand upon them**

5. **Inpainting and outpainting abilities use context from image to fill missing areas - takes into account existing visual elements like shadows, reflections, textures**

6. **GPT-4o image generation is default in ChatGPT - simple as chatting, describe what you need including aspect ratio, exact colors using hex codes, or transparent background**

### ChatGPT Modes (Observed):
- Default Mode (General chat)
- DALL-E Mode (Image generation)
- Browse Mode (Web search)
- Code Interpreter Mode (Data analysis)
- Vision Mode (Image analysis)

---

## 🎯 BAATCHEET ADVANCED MODES SYSTEM

### Implementation Strategy:

```
┌──────────────────────────────────────────────────────┐
│         BAATCHEET INTELLIGENT MODE SYSTEM            │
└──────────────────────────────────────────────────────┘
                        │
        ┌───────────────┼───────────────┐
        │               │               │
        ▼               ▼               ▼
┌──────────────┐ ┌──────────────┐ ┌──────────────┐
│   AUTOMATIC  │ │     USER     │ │   CONTEXT    │
│    MODE      │ │   SELECTION  │ │   AWARE      │
│  DETECTION   │ │    (Tags)    │ │  SWITCHING   │
└──────────────┘ └──────────────┘ └──────────────┘
        │               │               │
        └───────────────┼───────────────┘
                        ▼
        ┌───────────────────────────────┐
        │    MODE EXECUTION ENGINE      │
        │  - Chat Mode                  │
        │  - Image Generation Mode      │
        │  - Vision Mode               │
        │  - Web Search Mode           │
        │  - Code Mode                 │
        │  - Data Analysis Mode        │
        │  - Creative Writing Mode     │
        │  - Translation Mode          │
        │  - Math Mode                 │
        └───────────────────────────────┘
```

---

## 📋 PART 1: SMART TAGS SYSTEM (LIKE CHATGPT)

### Available Tags/Modes:

```typescript
// types/modes.types.ts

export enum AIMode {
  // Core modes
  CHAT = 'chat',                      // Default conversation
  IMAGE_GEN = 'image-generation',     // Create images
  VISION = 'vision',                  // Analyze images
  WEB_SEARCH = 'web-search',          // Search web for info
  
  // Specialized modes
  CODE = 'code',                      // Programming assistance
  DATA_ANALYSIS = 'data-analysis',    // Analyze CSVs, create charts
  MATH = 'math',                      // Mathematical problem solving
  CREATIVE = 'creative',              // Stories, poems, scripts
  TRANSLATE = 'translate',            // Translation
  SUMMARIZE = 'summarize',            // Summarize long content
  EXPLAIN = 'explain',                // Educational explanations
  
  // Advanced modes
  BRAINSTORM = 'brainstorm',          // Ideation and creativity
  DEBUG = 'debug',                    // Code debugging
  RESEARCH = 'research',              // Deep research with sources
  TUTOR = 'tutor',                    // Teaching mode
  BUSINESS = 'business',              // Business analysis
}

export interface ModeConfig {
  mode: AIMode;
  displayName: string;
  icon: string;
  description: string;
  systemPrompt: string;
  capabilities: string[];
  requiresSpecialAPI: boolean;
  dailyLimit?: number; // Per tier
  tagKeywords: string[]; // Auto-detection keywords
}
```

### Smart Tag Detection:

```typescript
// services/mode-detector.service.ts

class ModeDetectorService {
  
  /**
   * Automatically detect which mode user needs based on their message
   */
  detectMode(userMessage: string, attachments?: any[]): AIMode {
    const lowerMessage = userMessage.toLowerCase();
    
    // IMAGE GENERATION: Most obvious indicators
    if (this.isImageGenerationRequest(lowerMessage)) {
      return AIMode.IMAGE_GEN;
    }
    
    // VISION: Image attached + question
    if (attachments?.some(a => a.type === 'image') && this.isQuestionAboutImage(lowerMessage)) {
      return AIMode.VISION;
    }
    
    // WEB SEARCH: Current events, news, recent info
    if (this.needsWebSearch(lowerMessage)) {
      return AIMode.WEB_SEARCH;
    }
    
    // CODE: Programming keywords
    if (this.isCodeRequest(lowerMessage)) {
      return AIMode.CODE;
    }
    
    // DATA ANALYSIS: CSV/data keywords
    if (attachments?.some(a => a.type === 'csv') || this.isDataAnalysisRequest(lowerMessage)) {
      return AIMode.DATA_ANALYSIS;
    }
    
    // MATH: Mathematical symbols and keywords
    if (this.isMathRequest(lowerMessage)) {
      return AIMode.MATH;
    }
    
    // CREATIVE: Story/poem/script keywords
    if (this.isCreativeRequest(lowerMessage)) {
      return AIMode.CREATIVE;
    }
    
    // TRANSLATE: Translation keywords
    if (this.isTranslationRequest(lowerMessage)) {
      return AIMode.TRANSLATE;
    }
    
    // SUMMARIZE: Long text + summarize keyword
    if (this.isSummarizeRequest(lowerMessage)) {
      return AIMode.SUMMARIZE;
    }
    
    // RESEARCH: Deep dive keywords
    if (this.isResearchRequest(lowerMessage)) {
      return AIMode.RESEARCH;
    }
    
    // Default: Chat mode
    return AIMode.CHAT;
  }
  
  private isImageGenerationRequest(message: string): boolean {
    const imageGenKeywords = [
      // Direct requests
      'generate image', 'create image', 'make image', 'draw', 'paint',
      'generate picture', 'create picture', 'make picture',
      'visualize', 'design', 'illustrate',
      
      // Specific styles
      'photorealistic', 'cartoon', 'anime', 'sketch', 'watercolor',
      'digital art', '3d render', 'pixel art',
      
      // Common phrases
      'show me', 'i want to see', 'can you show',
      'picture of', 'image of', 'illustration of'
    ];
    
    return imageGenKeywords.some(kw => message.includes(kw));
  }
  
  private isQuestionAboutImage(message: string): boolean {
    const visionKeywords = [
      'what is in this', 'what do you see', 'describe this',
      'what\'s in the', 'analyze this', 'read this',
      'what does this say', 'transcribe', 'extract text'
    ];
    
    return visionKeywords.some(kw => message.includes(kw));
  }
  
  private needsWebSearch(message: string): boolean {
    const searchIndicators = [
      'today', 'yesterday', 'this week', 'latest', 'recent', 'current',
      'breaking news', 'what happened', 'search for', 'look up',
      'weather', 'stock price', 'score', 'results'
    ];
    
    return searchIndicators.some(kw => message.includes(kw));
  }
  
  private isCodeRequest(message: string): boolean {
    const codeKeywords = [
      'code', 'function', 'program', 'script', 'algorithm',
      'python', 'javascript', 'java', 'c++', 'react', 'node',
      'debug', 'error', 'bug', 'fix', 'optimize',
      'api', 'database', 'query', 'class', 'method'
    ];
    
    return codeKeywords.some(kw => message.includes(kw));
  }
  
  private isDataAnalysisRequest(message: string): boolean {
    const dataKeywords = [
      'analyze data', 'data analysis', 'chart', 'graph', 'plot',
      'statistics', 'average', 'mean', 'median', 'trend',
      'csv', 'spreadsheet', 'table', 'correlation', 'regression'
    ];
    
    return dataKeywords.some(kw => message.includes(kw));
  }
  
  private isMathRequest(message: string): boolean {
    const mathKeywords = [
      'calculate', 'solve', 'equation', 'formula', 'derivative',
      'integral', 'algebra', 'calculus', 'geometry', 'trigonometry',
      'matrix', 'vector', 'probability', 'statistics'
    ];
    
    // Also check for math symbols
    const hasMathSymbols = /[\+\-\*\/\=\^\∫\∑\√]/.test(message);
    
    return mathKeywords.some(kw => message.includes(kw)) || hasMathSymbols;
  }
  
  private isCreativeRequest(message: string): boolean {
    const creativeKeywords = [
      'write a story', 'write a poem', 'write a script',
      'create a character', 'brainstorm ideas', 'creative',
      'fiction', 'narrative', 'dialogue', 'scene',
      'novel', 'short story', 'essay', 'article'
    ];
    
    return creativeKeywords.some(kw => message.includes(kw));
  }
  
  private isTranslationRequest(message: string): boolean {
    const translateKeywords = [
      'translate', 'translation', 'convert to', 'in urdu',
      'in english', 'in hindi', 'in arabic', 'how do you say'
    ];
    
    return translateKeywords.some(kw => message.includes(kw));
  }
  
  private isSummarizeRequest(message: string): boolean {
    const summarizeKeywords = [
      'summarize', 'summary', 'tldr', 'brief', 'key points',
      'main ideas', 'overview', 'condense', 'shorten'
    ];
    
    return summarizeKeywords.some(kw => message.includes(kw));
  }
  
  private isResearchRequest(message: string): boolean {
    const researchKeywords = [
      'research', 'deep dive', 'comprehensive analysis',
      'detailed report', 'thorough investigation',
      'explore in depth', 'full breakdown'
    ];
    
    return researchKeywords.some(kw => message.includes(kw));
  }
}

export const modeDetector = new ModeDetectorService();
```

---

## 📋 PART 2: IMAGE GENERATION MODE

### Implementation with Hugging Face + Load Balancing:

```typescript
// services/image-generation.service.ts

interface ImageGenRequest {
  prompt: string;
  style?: 'realistic' | 'anime' | 'cartoon' | 'sketch' | 'watercolor' | 'digital-art';
  aspectRatio?: '1:1' | '16:9' | '9:16' | '4:3';
  quality?: 'standard' | 'hd';
  negativePrompt?: string; // What NOT to include
  numImages?: number; // 1-4
}

interface ImageGenResult {
  images: Array<{
    url: string;
    prompt: string; // Enhanced prompt used
    seed: number; // For reproducibility
  }>;
  model: string;
  generationTime: number;
}

class ImageGenerationService {
  
  private readonly MODELS = {
    // Hugging Face models (FREE)
    'stable-diffusion-xl': {
      endpoint: 'https://api-inference.huggingface.co/models/stabilityai/stable-diffusion-xl-base-1.0',
      keys: [ // Multiple API keys for load balancing
        process.env.HF_TOKEN_1,
        process.env.HF_TOKEN_2,
        process.env.HF_TOKEN_3,
        process.env.HF_TOKEN_4,
        process.env.HF_TOKEN_5
      ],
      quality: 'high',
      speed: 'medium',
      dailyLimit: 1000 // per key
    },
    'flux-schnell': {
      endpoint: 'https://api-inference.huggingface.co/models/black-forest-labs/FLUX.1-schnell',
      keys: [process.env.HF_TOKEN_1, /* ... */],
      quality: 'excellent',
      speed: 'fast'
    },
    'playground-v2.5': {
      endpoint: 'https://api-inference.huggingface.co/models/playgroundai/playground-v2.5-1024px-aesthetic',
      keys: [process.env.HF_TOKEN_1, /* ... */],
      quality: 'excellent',
      speed: 'fast'
    }
  };
  
  private keyUsage: Map<string, number> = new Map();
  private lastKeyResetDate: Date = new Date();
  
  /**
   * Generate image with automatic model selection and load balancing
   */
  async generateImage(request: ImageGenRequest, userId: string): Promise<ImageGenResult> {
    // Step 1: Check user's daily limit
    await this.checkUserLimit(userId);
    
    // Step 2: Enhance prompt (like ChatGPT does automatically)
    const enhancedPrompt = await this.enhancePrompt(request.prompt, request.style);
    
    // Step 3: Select best available model & key
    const { model, apiKey } = await this.selectModelAndKey();
    
    // Step 4: Generate image
    const startTime = Date.now();
    
    try {
      const response = await axios.post(
        model.endpoint,
        {
          inputs: enhancedPrompt,
          parameters: {
            num_inference_steps: 50,
            guidance_scale: 7.5,
            width: this.getWidth(request.aspectRatio),
            height: this.getHeight(request.aspectRatio),
            negative_prompt: request.negativePrompt || this.getDefaultNegativePrompt()
          }
        },
        {
          headers: {
            'Authorization': `Bearer ${apiKey}`,
            'Content-Type': 'application/json'
          },
          responseType: 'arraybuffer',
          timeout: 120000 // 2 minutes
        }
      );
      
      // Step 5: Upload generated image to storage
      const imageBuffer = Buffer.from(response.data);
      const imageUrl = await this.uploadToStorage(imageBuffer, userId);
      
      // Step 6: Track usage
      await this.trackUsage(userId, apiKey, model.endpoint);
      
      const generationTime = Date.now() - startTime;
      
      return {
        images: [{
          url: imageUrl,
          prompt: enhancedPrompt,
          seed: Math.floor(Math.random() * 1000000)
        }],
        model: model.endpoint.split('/').pop(),
        generationTime
      };
      
    } catch (error) {
      logger.error('Image generation failed:', error);
      
      // Fallback to next available key/model
      return await this.generateImageWithFallback(request, userId);
    }
  }
  
  /**
   * Enhance user's prompt like ChatGPT does
   */
  private async enhancePrompt(userPrompt: string, style?: string): Promise<string> {
    // Use AI to enhance prompt for better results
    const enhancementPrompt = `You are a prompt engineer for image generation. Enhance this user prompt to produce the best possible image. Add specific details about lighting, composition, style, quality, but keep the core idea intact.

User prompt: "${userPrompt}"
Desired style: ${style || 'none specified'}

Enhanced prompt (return ONLY the enhanced prompt, nothing else):`;

    const response = await aiRouter.chat({
      messages: [{ role: 'user', content: enhancementPrompt }],
      temperature: 0.7,
      max_tokens: 200
    });
    
    let enhanced = response.choices[0].message.content.trim();
    
    // Add style modifiers
    if (style) {
      const styleModifiers = {
        'realistic': ', photorealistic, highly detailed, 8k, professional photography',
        'anime': ', anime style, vibrant colors, manga art, detailed',
        'cartoon': ', cartoon style, colorful, playful, illustrated',
        'sketch': ', pencil sketch, hand-drawn, artistic, detailed linework',
        'watercolor': ', watercolor painting, soft colors, artistic, flowing',
        'digital-art': ', digital art, concept art, trending on artstation, highly detailed'
      };
      
      enhanced += styleModifiers[style] || '';
    }
    
    return enhanced;
  }
  
  /**
   * Check user's daily image generation limit
   */
  private async checkUserLimit(userId: string): Promise<void> {
    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: { tier: true }
    });
    
    const dailyLimits = {
      free: 1,        // 1 image per day
      pro: 50,        // 50 images per day
      enterprise: 500 // 500 images per day
    };
    
    const limit = dailyLimits[user.tier];
    
    // Check today's usage
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    
    const usage = await prisma.imageGeneration.count({
      where: {
        userId,
        createdAt: { gte: today }
      }
    });
    
    if (usage >= limit) {
      throw new Error(`Daily image generation limit reached (${limit} images per day for ${user.tier} tier)`);
    }
  }
  
  /**
   * Select model and API key with load balancing
   */
  private async selectModelAndKey(): Promise<{ model: any, apiKey: string }> {
    // Reset daily counters if new day
    this.resetDailyCountersIfNeeded();
    
    // Try FLUX first (fastest and best quality)
    const fluxModel = this.MODELS['flux-schnell'];
    const availableKey = this.getNextAvailableKey(fluxModel.keys);
    
    if (availableKey) {
      return { model: fluxModel, apiKey: availableKey };
    }
    
    // Fallback to Stable Diffusion XL
    const sdxlModel = this.MODELS['stable-diffusion-xl'];
    const sdxlKey = this.getNextAvailableKey(sdxlModel.keys);
    
    if (sdxlKey) {
      return { model: sdxlModel, apiKey: sdxlKey };
    }
    
    throw new Error('All image generation API keys exhausted for today');
  }
  
  /**
   * Get next available API key (round-robin with usage tracking)
   */
  private getNextAvailableKey(keys: string[]): string | null {
    for (const key of keys) {
      const usage = this.keyUsage.get(key) || 0;
      
      if (usage < 1000) { // Daily limit per key
        return key;
      }
    }
    
    return null;
  }
  
  /**
   * Track API key usage
   */
  private async trackUsage(userId: string, apiKey: string, model: string): Promise<void> {
    // Increment key usage
    const current = this.keyUsage.get(apiKey) || 0;
    this.keyUsage.set(apiKey, current + 1);
    
    // Save to database
    await prisma.imageGeneration.create({
      data: {
        userId,
        model,
        apiKeyUsed: apiKey.substring(0, 8) + '...',
        createdAt: new Date()
      }
    });
  }
  
  private resetDailyCountersIfNeeded(): void {
    const now = new Date();
    
    if (now.getDate() !== this.lastKeyResetDate.getDate()) {
      this.keyUsage.clear();
      this.lastKeyResetDate = now;
      logger.info('Image generation key usage reset');
    }
  }
  
  private getDefaultNegativePrompt(): string {
    return 'low quality, blurry, distorted, deformed, ugly, bad anatomy, watermark, text, signature';
  }
  
  private getWidth(aspectRatio?: string): number {
    const dimensions = {
      '1:1': 1024,
      '16:9': 1344,
      '9:16': 768,
      '4:3': 1152
    };
    
    return dimensions[aspectRatio] || 1024;
  }
  
  private getHeight(aspectRatio?: string): number {
    const dimensions = {
      '1:1': 1024,
      '16:9': 768,
      '9:16': 1344,
      '4:3': 896
    };
    
    return dimensions[aspectRatio] || 1024;
  }
}

export const imageGen = new ImageGenerationService();
```

---

## 📋 PART 3: MODE-SPECIFIC SYSTEM PROMPTS

### Enhanced System Prompts Per Mode:

```typescript
// config/mode-prompts.config.ts

export const MODE_SYSTEM_PROMPTS = {
  [AIMode.IMAGE_GEN]: `You are an expert image generation assistant. Your role is to:
1. Understand what image the user wants to create
2. Ask clarifying questions if needed (style, mood, details)
3. Generate detailed, optimized prompts for image generation
4. Suggest variations and improvements
5. Help users refine their vision

IMPORTANT: Never generate the image yourself. Explain that you'll create it using image generation AI.`,

  [AIMode.CODE]: `You are an expert programming assistant. Provide:
- Clean, well-commented code
- Best practices and patterns
- Security considerations
- Performance optimizations
- Multiple approaches when applicable
- Code in \\`\\`\\`language blocks with syntax highlighting
- Explain complex parts clearly`,

  [AIMode.DATA_ANALYSIS]: `You are a data analysis expert. When analyzing data:
- Provide statistical summaries
- Identify patterns and trends
- Create visualizations (describe chart types)
- Offer actionable insights
- Use tables for comparisons
- Highlight anomalies or interesting findings`,

  [AIMode.MATH]: `You are a mathematics tutor. When solving problems:
- Show step-by-step solutions
- Use LaTeX for equations: $inline$ or $$block$$
- Explain the reasoning behind each step
- Provide visual diagrams when helpful
- Verify solutions
- Offer alternative solution methods`,

  [AIMode.CREATIVE]: `You are a creative writing assistant. Focus on:
- Rich, descriptive language
- Character development
- Plot structure
- Engaging dialogue
- Show, don't tell
- Create immersive scenes
- Maintain consistent tone and style`,

  [AIMode.RESEARCH]: `You are a research assistant. Conduct thorough research by:
- Using web search for current information
- Citing all sources with [1], [2], etc.
- Presenting multiple perspectives
- Fact-checking claims
- Organizing findings clearly
- Providing comprehensive analysis
- Including relevant statistics and data`,

  [AIMode.TUTOR]: `You are a patient, encouraging tutor. Teach by:
- Breaking down complex concepts
- Using analogies and examples
- Checking understanding with questions
- Adjusting difficulty based on responses
- Encouraging questions
- Celebrating progress
- Adapting to learning style`,

  [AIMode.DEBUG]: `You are a debugging expert. Help fix code by:
- Identifying the root cause
- Explaining what went wrong
- Providing corrected code
- Suggesting preventive measures
- Recommending debugging techniques
- Teaching best practices`
};
```

---

## 📋 PART 4: FRONTEND TAG SYSTEM

### User-Facing Mode Selector:

```typescript
// components/Chat/ModeSelector.tsx

interface ModeButton {
  mode: AIMode;
  label: string;
  icon: React.ReactNode;
  description: string;
  badge?: string; // "New", "Pro", "Beta"
  requiresPro?: boolean;
}

const AVAILABLE_MODES: ModeButton[] = [
  {
    mode: AIMode.CHAT,
    label: 'Chat',
    icon: <MessageSquare />,
    description: 'General conversation'
  },
  {
    mode: AIMode.IMAGE_GEN,
    label: 'Create Image',
    icon: <Image />,
    description: 'Generate images from text',
    badge: 'Limited'
  },
  {
    mode: AIMode.WEB_SEARCH,
    label: 'Browse',
    icon: <Globe />,
    description: 'Search the web'
  },
  {
    mode: AIMode.CODE,
    label: 'Code',
    icon: <Code />,
    description: 'Programming help'
  },
  {
    mode: AIMode.DATA_ANALYSIS,
    label: 'Analyze Data',
    icon: <BarChart />,
    description: 'Data analysis & charts'
  },
  {
    mode: AIMode.MATH,
    label: 'Math',
    icon: <Calculator />,
    description: 'Mathematical problems'
  },
  {
    mode: AIMode.CREATIVE,
    label: 'Write',
    icon: <Pen />,
    description: 'Creative writing'
  },
  {
    mode: AIMode.RESEARCH,
    label: 'Research',
    icon: <Search />,
    description: 'Deep research with sources',
    requiresPro: true
  }
];

export const ModeSelector: React.FC = () => {
  const [selectedMode, setSelectedMode] = useState<AIMode>(AIMode.CHAT);
  const [isOpen, setIsOpen] = useState(false);
  
  return (
    <div className="mode-selector">
      {/* Current mode indicator */}
      <button 
        onClick={() => setIsOpen(!isOpen)}
        className="mode-indicator"
      >
        {AVAILABLE_MODES.find(m => m.mode === selectedMode)?.icon}
        <span>{AVAILABLE_MODES.find(m => m.mode === selectedMode)?.label}</span>
        <ChevronDown className={`transition-transform ${isOpen ? 'rotate-180' : ''}`} />
      </button>
      
      {/* Mode dropdown */}
      {isOpen && (
        <div className="mode-dropdown">
          <div className="mode-grid">
            {AVAILABLE_MODES.map(mode => (
              <button
                key={mode.mode}
                onClick={() => {
                  setSelectedMode(mode.mode);
                  setIsOpen(false);
                }}
                className={`mode-button ${selectedMode === mode.mode ? 'active' : ''}`}
                disabled={mode.requiresPro && userTier !== 'pro'}
              >
                <div className="mode-icon">{mode.icon}</div>
                <div className="mode-info">
                  <div className="mode-label">
                    {mode.label}
                    {mode.badge && <span className="badge">{mode.badge}</span>}
                    {mode.requiresPro && <Crown className="w-3 h-3 text-yellow-500" />}
                  </div>
                  <div className="mode-description">{mode.description}</div>
                </div>
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};
```

---

## 📋 PART 5: RATE LIMITING FOR IMAGE GENERATION

### Strict Limits to Prevent API Abuse:

```typescript
// middleware/image-gen-rate-limit.middleware.ts

export const imageGenerationRateLimit = async (req, res, next) => {
  const { userId } = req;
  
  try {
    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: { tier: true }
    });
    
    // Daily limits
    const limits = {
      free: 1,        // 1 image per 24 hours
      pro: 50,        // 50 images per 24 hours
      enterprise: 500 // 500 images per 24 hours
    };
    
    const userLimit = limits[user.tier];
    
    // Check usage in last 24 hours
    const oneDayAgo = new Date(Date.now() - 24 * 60 * 60 * 1000);
    
    const usage = await prisma.imageGeneration.count({
      where: {
        userId,
        createdAt: { gte: oneDayAgo }
      }
    });
    
    if (usage >= userLimit) {
      // Calculate when limit resets
      const oldestImage = await prisma.imageGeneration.findFirst({
        where: { userId },
        orderBy: { createdAt: 'asc' }
      });
      
      const resetTime = new Date(oldestImage.createdAt.getTime() + 24 * 60 * 60 * 1000);
      const hoursUntilReset = Math.ceil((resetTime.getTime() - Date.now()) / (60 * 60 * 1000));
      
      return res.status(429).json({
        error: 'Image generation limit reached',
        limit: userLimit,
        remaining: 0,
        resetIn: `${hoursUntilReset} hours`,
        tier: user.tier,
        upgradeMessage: user.tier === 'free' ? 'Upgrade to Pro for 50 images per day' : null
      });
    }
    
    // Add usage info to response headers
    res.setHeader('X-Image-Gen-Limit', userLimit.toString());
    res.setHeader('X-Image-Gen-Remaining', (userLimit - usage).toString());
    res.setHeader('X-Image-Gen-Reset', resetTime.toISOString());
    
    next();
    
  } catch (error) {
    logger.error('Rate limit check failed:', error);
    res.status(500).json({ error: 'Rate limit check failed' });
  }
};
```

---

## 📋 PART 6: INTELLIGENT MODE ROUTING IN CHAT

### Update Chat Controller with Mode System:

```typescript
// controllers/chat.controller.ts (MODE INTEGRATION)

export async function sendMessage(req, res) {
  const { conversationId, message, imageId, stream = true, mode } = req.body;
  const userId = req.userId;

  try {
    // Step 1: Detect mode if not explicitly provided
    const detectedMode = mode || modeDetector.detectMode(message, imageId ? [{ type: 'image' }] : []);
    
    logger.info('Mode detected', { mode: detectedMode, userId });
    
    // Step 2: Handle IMAGE GENERATION mode specially
    if (detectedMode === AIMode.IMAGE_GEN) {
      // Extract image parameters from message
      const imageRequest = await extractImageParameters(message);
      
      // Generate image
      const result = await imageGen.generateImage(imageRequest, userId);
      
      // Save to database
      await saveImageGeneration(conversationId, userId, message, result);
      
      // Return image
      return res.json({
        mode: AIMode.IMAGE_GEN,
        images: result.images,
        prompt: message,
        enhancedPrompt: result.images[0].prompt,
        generationTime: result.generationTime,
        conversationId: conversationId || 'new'
      });
    }
    
    // Step 3: Build mode-specific system prompt
    const modeSystemPrompt = MODE_SYSTEM_PROMPTS[detectedMode] || '';
    
    // Step 4: Add web search if needed
    let webSearchContext = '';
    if (detectedMode === AIMode.WEB_SEARCH || webSearch.needsWebSearch(message)) {
      const searchResults = await webSearch.search(message);
      webSearchContext = webSearch.formatForAI(searchResults);
    }
    
    // Step 5: Build complete system prompt
    const profileContext = await profileLearning.buildProfileContext(userId);
    const recentContext = await profileLearning.buildRecentContext(userId, conversationId || '');
    
    const completeSystemPrompt = 
      ADVANCED_SYSTEM_PROMPT + 
      '\n\n' + modeSystemPrompt +
      profileContext + 
      recentContext +
      webSearchContext;
    
    // Step 6: Get conversation context
    const context = await contextManager.getContext(conversationId);
    
    // Step 7: Prepare messages
    const messages = [
      { role: 'system', content: completeSystemPrompt },
      ...context,
      { role: 'user', content: message }
    ];
    
    // Step 8: Call AI
    const aiResponse = await aiRouter.chat({
      messages,
      stream,
      temperature: this.getModeTemperature(detectedMode),
      max_tokens: this.getModeMaxTokens(detectedMode)
    });
    
    // ... rest of streaming/non-streaming logic
    
  } catch (error) {
    logger.error('Chat error:', error);
    res.status(500).json({ error: 'Failed to process message' });
  }
}

function getModeTemperature(mode: AIMode): number {
  const temperatures = {
    [AIMode.CREATIVE]: 0.9,      // High creativity
    [AIMode.CODE]: 0.2,          // Very deterministic
    [AIMode.MATH]: 0.1,          // Precise calculations
    [AIMode.DATA_ANALYSIS]: 0.3, // Factual
    [AIMode.CHAT]: 0.7,          // Balanced
    [AIMode.RESEARCH]: 0.4,      // Factual but thorough
    [AIMode.TRANSLATE]: 0.3      // Accurate translation
  };
  
  return temperatures[mode] || 0.7;
}

async function extractImageParameters(message: string): Promise<ImageGenRequest> {
  // Use AI to parse user's natural language into structured parameters
  const parsePrompt = `Extract image generation parameters from this user message.

User message: "${message}"

Return ONLY a JSON object with these fields:
{
  "prompt": "the main description",
  "style": "realistic|anime|cartoon|sketch|watercolor|digital-art",
  "aspectRatio": "1:1|16:9|9:16|4:3",
  "negativePrompt": "what to avoid"
}`;

  const response = await aiRouter.chat({
    messages: [{ role: 'user', content: parsePrompt }],
    temperature: 0.3,
    max_tokens: 300
  });
  
  const content = response.choices[0].message.content.trim();
  const jsonStr = content.replace(/```json\n?|\n?```/g, '').trim();
  
  return JSON.parse(jsonStr);
}
```

---

## 📋 PART 7: ADVANCED FEATURES (BEYOND CHATGPT)

### 1. **Image Variations** (Like DALL-E 3)

```typescript
// Generate variations of existing image
router.post('/images/:imageId/variations', async (req, res) => {
  const { imageId } = req.params;
  const { numVariations = 3 } = req.body;
  const { userId } = req;
  
  // Get original image
  const original = await prisma.imageGeneration.findUnique({
    where: { id: imageId, userId }
  });
  
  // Generate variations with slightly different seeds
  const variations = [];
  
  for (let i = 0; i < numVariations; i++) {
    const result = await imageGen.generateImage({
      prompt: original.enhancedPrompt,
      style: original.style,
      aspectRatio: original.aspectRatio
    }, userId);
    
    variations.push(result.images[0]);
  }
  
  res.json({ variations });
});
```

### 2. **Style Presets** (Custom Styles)

```typescript
const STYLE_PRESETS = {
  'cyberpunk': 'cyberpunk city, neon lights, futuristic, blade runner style, highly detailed',
  'fantasy': 'fantasy art, magical, ethereal, detailed environment, cinematic lighting',
  'minimalist': 'minimalist, clean, simple, white background, modern design',
  'vintage': 'vintage photography, retro, aged, nostalgic, film grain',
  'abstract': 'abstract art, geometric shapes, colorful, modern art, artistic'
};

// User can select preset
router.post('/images/generate-with-preset', async (req, res) => {
  const { prompt, preset } = req.body;
  const { userId } = req;
  
  const enhancedPrompt = `${prompt}, ${STYLE_PRESETS[preset]}`;
  
  const result = await imageGen.generateImage({
    prompt: enhancedPrompt
  }, userId);
  
  res.json(result);
});
```

### 3. **Image Remix** (Upload + Modify)

```typescript
// User uploads image and asks for modifications
router.post('/images/remix', async (req, res) => {
  const { imageId, modifications } = req.body;
  const { userId } = req;
  
  // Get original image description using Vision API
  const description = await visionService.describe(imageId);
  
  // Create new prompt based on description + modifications
  const remixPrompt = `${description}, ${modifications}`;
  
  // Generate new image
  const result = await imageGen.generateImage({
    prompt: remixPrompt
  }, userId);
  
  res.json(result);
});
```

### 4. **Batch Generation** (Pro Users)

```typescript
// Generate multiple images from list of prompts
router.post('/images/batch-generate', requirePro, async (req, res) => {
  const { prompts } = req.body; // Array of prompts
  const { userId } = req;
  
  const results = [];
  
  for (const prompt of prompts) {
    try {
      const result = await imageGen.generateImage({ prompt }, userId);
      results.push({ success: true, ...result });
    } catch (error) {
      results.push({ success: false, prompt, error: error.message });
    }
  }
  
  res.json({ results });
});
```

### 5. **Smart Suggestions** (AI-Powered Ideas)

```typescript
// Suggest improvements to user's prompt
router.post('/images/suggest-improvements', async (req, res) => {
  const { prompt } = req.body;
  
  const suggestionPrompt = `Given this image generation prompt, suggest 3 improvements that would make the image more interesting, detailed, or beautiful.

Original prompt: "${prompt}"

Return as JSON array:
[
  {"improvement": "...", "reason": "..."},
  {"improvement": "...", "reason": "..."},
  {"improvement": "...", "reason": "..."}
]`;

  const response = await aiRouter.chat({
    messages: [{ role: 'user', content: suggestionPrompt }],
    temperature: 0.7
  });
  
  const content = response.choices[0].message.content.trim();
  const suggestions = JSON.parse(content.replace(/```json\n?|\n?```/g, ''));
  
  res.json({ suggestions });
});
```

---

## 📋 PART 8: DATABASE SCHEMA FOR IMAGE GENERATION

```prisma
model ImageGeneration {
  id              String   @id @default(cuid())
  userId          String
  user            User     @relation(fields: [userId], references: [id])
  conversationId  String?
  
  // Request details
  originalPrompt  String   @db.Text
  enhancedPrompt  String   @db.Text
  style           String?
  aspectRatio     String   @default("1:1")
  negativePrompt  String?  @db.Text
  
  // Generated image
  imageUrl        String
  thumbnailUrl    String?
  seed            Int?
  
  // Metadata
  model           String
  apiKeyUsed      String
  generationTime  Int      // milliseconds
  
  createdAt       DateTime @default(now())
  
  @@index([userId, createdAt])
  @@index([conversationId])
}

model ImageGenerationQuota {
  id              String   @id @default(cuid())
  userId          String   @unique
  user            User     @relation(fields: [userId], references: [id])
  
  dailyLimit      Int      // Based on tier
  dailyUsed       Int      @default(0)
  lastResetDate   DateTime @default(now())
  
  monthlyLimit    Int
  monthlyUsed     Int      @default(0)
  
  @@index([userId])
}
```

---

## ✅ FEATURES COMPARISON

| Feature | ChatGPT | BaatCheet (After Implementation) |
|---------|---------|----------------------------------|
| **MODES** | | |
| Auto mode detection | ✅ Yes | ✅ Yes + Better keywords |
| Manual mode selection | ✅ Yes | ✅ Yes (dropdown tags) |
| Mode-specific prompts | ✅ Yes | ✅ Yes + Customizable |
| **IMAGE GENERATION** | | |
| Text-to-image | ✅ DALL-E 3 | ✅ Multiple models (SDXL, FLUX, Playground) |
| Prompt enhancement | ✅ Automatic | ✅ AI-enhanced prompts |
| Style presets | ⚠️ Limited | ✅ 10+ presets |
| Variations | ✅ Yes | ✅ Yes |
| Remix/Edit | ✅ Inpainting | ✅ Description-based remix |
| Batch generation | ❌ No | ✅ Yes (Pro) |
| Image suggestions | ❌ No | ✅ AI-powered suggestions |
| **LIMITS** | | |
| Free tier | ⚠️ No free images | ✅ 1 per day |
| Pro tier | ~50/day (limit unclear) | ✅ 50/day (clear) |
| Load balancing | N/A (single provider) | ✅ 5 HF keys per model |
| **COST** | | |
| For users | $20/month | ✅ FREE (with limits) |
| For us | N/A | ✅ FREE (Hugging Face) |

---

## 🎯 DELIVERABLES

After implementing this prompt:

✅ **Smart Mode Detection** - AI automatically detects what user needs
✅ **10+ AI Modes** - Chat, Image Gen, Code, Math, Creative, Research, etc.
✅ **Tag System** - Visual mode selector like ChatGPT
✅ **Image Generation** - Multiple models (SDXL, FLUX, Playground)
✅ **Load Balancing** - 5 API keys per model for high availability
✅ **Prompt Enhancement** - AI improves prompts automatically
✅ **Style Presets** - 10+ artistic styles
✅ **Image Variations** - Generate multiple versions
✅ **Smart Suggestions** - AI suggests prompt improvements
✅ **Strict Rate Limiting** - 1/day free, 50/day pro
✅ **Batch Generation** - Multiple images at once (Pro)
✅ **Better than ChatGPT** - More models, more control, FREE

---

## 🚀 ADVANCED FEATURES (UNIQUE TO BAATCHEET)

### 1. **Model Selection**
User can choose: SDXL (quality) vs FLUX (speed) vs Playground (artistic)

### 2. **Negative Prompts**
Explicitly tell AI what NOT to include (ChatGPT doesn't expose this)

### 3. **Seed Control**
Save seed number to regenerate exact same image

### 4. **Style Mixing**
Combine multiple styles: "cyberpunk + watercolor + anime"

### 5. **Smart Quota**
Clear visual indicator: "2/50 images used today"

### 6. **Generation History**
Gallery of all generated images with prompts

### 7. **Prompt Library**
Save favorite prompts for reuse

### 8. **Collaborative Generation**
Share image + prompt with others to remix

---

**This makes BaatCheet's mode system and image generation SUPERIOR to ChatGPT while remaining completely FREE!** 🎨🚀