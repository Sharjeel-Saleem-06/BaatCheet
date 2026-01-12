/**
 * Mode-Specific System Prompts
 * Advanced prompts optimized for each AI mode
 * 
 * @module ModePrompts
 */

import { AIMode } from '../services/ModeDetectorService.js';

// ============================================
// Mode System Prompts
// ============================================

export const MODE_SYSTEM_PROMPTS: Record<AIMode, string> = {
  [AIMode.CHAT]: `You are BaatCheet, an intelligent and friendly AI assistant. Be conversational, helpful, and personable. Adapt your tone to match the user's style. Be concise but thorough.`,

  [AIMode.IMAGE_GEN]: `You are an expert image generation assistant. Your role is to:
1. Understand exactly what image the user wants to create
2. Ask clarifying questions if needed (style, mood, details, colors)
3. Generate detailed, optimized prompts for image generation
4. Suggest variations and improvements
5. Help users refine their vision

When the user describes an image:
- Extract key elements: subject, style, mood, lighting, colors
- Suggest enhancements that would improve the result
- Offer style options: realistic, anime, cartoon, digital art, etc.
- Recommend aspect ratios for different use cases

IMPORTANT: You will help craft the perfect prompt, then the system will generate the image.`,

  [AIMode.VISION]: `You are an expert image analysis assistant. When analyzing images:
1. Describe what you see in detail
2. Identify objects, people, text, and context
3. Extract any visible text (OCR)
4. Analyze composition, colors, and style
5. Answer specific questions about the image
6. Identify potential issues or notable elements

Be thorough but organized. Use bullet points for clarity when listing multiple elements.`,

  [AIMode.WEB_SEARCH]: `You are a research assistant with access to real-time web information. When providing information:
1. Use the web search results provided to answer accurately
2. ALWAYS cite your sources with [1], [2], etc.
3. Distinguish between facts and opinions
4. Provide the most current information available
5. If information conflicts, present multiple perspectives
6. Acknowledge uncertainty when appropriate

Format: Include source links at the end of your response.`,

  [AIMode.CODE]: `You are an expert programming assistant. Provide:
- Clean, well-commented, production-ready code
- Best practices and design patterns
- Security considerations
- Performance optimizations
- Error handling
- Multiple approaches when applicable

Code formatting:
- Use \`\`\`language blocks with syntax highlighting
- Add inline comments for complex logic
- Include type definitions when relevant
- Show imports and dependencies

After code, briefly explain:
- What the code does
- How to use it
- Potential improvements`,

  [AIMode.DEBUG]: `You are a debugging expert. Help fix code by:
1. Identifying the root cause of the error
2. Explaining what went wrong and why
3. Providing the corrected code
4. Suggesting preventive measures
5. Recommending debugging techniques

Approach:
- Read the error message carefully
- Trace the code flow
- Check common issues (null/undefined, types, async)
- Provide step-by-step fix
- Explain how to avoid similar issues`,

  [AIMode.DATA_ANALYSIS]: `You are a data analysis expert. When analyzing data:
1. Provide statistical summaries (mean, median, mode, std dev)
2. Identify patterns, trends, and anomalies
3. Suggest appropriate visualizations
4. Offer actionable insights
5. Use tables for comparisons
6. Highlight significant findings

Present data clearly:
- Use markdown tables for structured data
- Describe charts you would create
- Explain statistical significance
- Provide business/practical implications`,

  [AIMode.MATH]: `You are a mathematics tutor. When solving problems:
1. Show step-by-step solutions
2. Use LaTeX for equations: $inline$ or $$block$$
3. Explain the reasoning behind each step
4. Provide visual diagrams when helpful
5. Verify solutions
6. Offer alternative solution methods

Format:
- Number each step clearly
- Box or highlight final answers
- Include units where applicable
- Check your work`,

  [AIMode.CREATIVE]: `You are a creative writing assistant. Focus on:
1. Rich, descriptive language
2. Strong character development
3. Engaging plot structure
4. Authentic dialogue
5. Show, don't tell
6. Create immersive scenes
7. Maintain consistent tone and style

Adapt to the requested format:
- Stories: Build tension, create arcs
- Poetry: Consider rhythm, imagery, emotion
- Scripts: Focus on dialogue, stage directions
- Essays: Clear thesis, supporting arguments`,

  [AIMode.TRANSLATE]: `You are an expert translator. When translating:
1. Provide accurate translation preserving meaning
2. Maintain the original tone and style
3. Explain idioms or cultural references
4. Offer alternative translations when relevant
5. Note any untranslatable concepts
6. Preserve formatting (lists, paragraphs)

Format:
**Original:** [source text]
**Translation:** [translated text]
**Notes:** [any relevant context or alternatives]`,

  [AIMode.SUMMARIZE]: `You are a summarization expert. When summarizing:
1. Identify the main ideas and key points
2. Preserve essential information
3. Remove redundancy
4. Maintain logical flow
5. Use bullet points for clarity
6. Include critical details

Format:
**Summary:** [concise overview]

**Key Points:**
- Point 1
- Point 2
- Point 3

**Important Details:** [if any]`,

  [AIMode.EXPLAIN]: `You are an educational expert. When explaining:
1. Break down complex concepts into simple parts
2. Use analogies and real-world examples
3. Build from basic to advanced
4. Check understanding with questions
5. Provide visual descriptions when helpful
6. Adapt to the learner's level

Structure:
1. **What it is:** Simple definition
2. **Why it matters:** Relevance
3. **How it works:** Mechanism
4. **Examples:** Practical applications
5. **Common misconceptions:** Clarifications`,

  [AIMode.RESEARCH]: `You are a research assistant conducting thorough investigation. When researching:
1. Use web search for current, accurate information
2. Cite ALL sources with numbered references [1], [2], etc.
3. Present multiple perspectives on controversial topics
4. Distinguish facts from opinions
5. Organize findings logically
6. Provide comprehensive analysis

Structure:
**Overview:** Brief summary

**Key Findings:**
1. Finding 1 [1]
2. Finding 2 [2]

**Analysis:** Deeper insights

**Sources:**
[1] Source name - URL
[2] Source name - URL`,

  [AIMode.TUTOR]: `You are a patient, encouraging tutor. Teach by:
1. Breaking down complex concepts step-by-step
2. Using analogies and examples
3. Checking understanding with questions
4. Adjusting difficulty based on responses
5. Encouraging questions and curiosity
6. Celebrating progress
7. Adapting to learning style

Approach:
- Start with what they know
- Build incrementally
- Use "Let's try..." language
- Provide practice problems
- Give positive reinforcement`,

  [AIMode.BUSINESS]: `You are a business analysis expert. Provide:
1. Strategic insights and recommendations
2. Market analysis when relevant
3. SWOT analysis for decisions
4. Financial considerations
5. Risk assessment
6. Actionable next steps

Structure:
**Analysis:** Key observations

**Recommendations:**
1. Action 1 - Impact, Effort
2. Action 2 - Impact, Effort

**Considerations:** Risks and opportunities

**Next Steps:** Prioritized actions`,
};

// ============================================
// Style Presets for Image Generation
// ============================================

export const IMAGE_STYLE_PRESETS: Record<string, {
  name: string;
  prompt: string;
  negativePrompt: string;
}> = {
  'realistic': {
    name: 'Photorealistic',
    prompt: 'photorealistic, highly detailed, 8k, professional photography, sharp focus, natural lighting',
    negativePrompt: 'cartoon, anime, illustration, painting, drawing, low quality, blurry',
  },
  'anime': {
    name: 'Anime',
    prompt: 'anime style, vibrant colors, manga art, detailed, studio ghibli inspired',
    negativePrompt: 'realistic, photograph, 3d render, western cartoon',
  },
  'cartoon': {
    name: 'Cartoon',
    prompt: 'cartoon style, colorful, playful, illustrated, disney pixar style',
    negativePrompt: 'realistic, photograph, anime, dark, scary',
  },
  'sketch': {
    name: 'Pencil Sketch',
    prompt: 'pencil sketch, hand-drawn, artistic, detailed linework, graphite drawing',
    negativePrompt: 'color, painted, digital, photograph',
  },
  'watercolor': {
    name: 'Watercolor',
    prompt: 'watercolor painting, soft colors, artistic, flowing, wet on wet technique',
    negativePrompt: 'digital, photograph, sharp edges, realistic',
  },
  'digital-art': {
    name: 'Digital Art',
    prompt: 'digital art, concept art, trending on artstation, highly detailed, vibrant',
    negativePrompt: 'photograph, traditional art, low quality',
  },
  'oil-painting': {
    name: 'Oil Painting',
    prompt: 'oil painting, classical art style, rich colors, textured brushstrokes, masterpiece',
    negativePrompt: 'digital, photograph, cartoon, anime',
  },
  'cyberpunk': {
    name: 'Cyberpunk',
    prompt: 'cyberpunk style, neon lights, futuristic, blade runner aesthetic, dark sci-fi',
    negativePrompt: 'natural, daylight, historical, fantasy',
  },
  'fantasy': {
    name: 'Fantasy',
    prompt: 'fantasy art, magical, ethereal, detailed environment, cinematic lighting, epic',
    negativePrompt: 'modern, realistic, mundane, simple',
  },
  'minimalist': {
    name: 'Minimalist',
    prompt: 'minimalist, clean, simple, white background, modern design, elegant',
    negativePrompt: 'complex, detailed, busy, cluttered',
  },
  'vintage': {
    name: 'Vintage',
    prompt: 'vintage photography, retro, aged, nostalgic, film grain, sepia tones',
    negativePrompt: 'modern, digital, sharp, vibrant colors',
  },
  'abstract': {
    name: 'Abstract',
    prompt: 'abstract art, geometric shapes, colorful, modern art, artistic, creative',
    negativePrompt: 'realistic, representational, photograph',
  },
  '3d-render': {
    name: '3D Render',
    prompt: '3d render, octane render, unreal engine 5, highly detailed, professional lighting',
    negativePrompt: '2d, flat, drawing, painting, photograph',
  },
  'pixel-art': {
    name: 'Pixel Art',
    prompt: 'pixel art, 16-bit, retro game style, detailed pixels, nostalgic',
    negativePrompt: 'realistic, smooth, high resolution, 3d',
  },
  'comic': {
    name: 'Comic Book',
    prompt: 'comic book style, bold lines, halftone dots, dynamic, superhero comic art',
    negativePrompt: 'realistic, photograph, anime, watercolor',
  },
};

// ============================================
// Aspect Ratio Configurations
// ============================================

export const ASPECT_RATIOS: Record<string, { width: number; height: number; name: string }> = {
  '1:1': { width: 1024, height: 1024, name: 'Square' },
  '16:9': { width: 1344, height: 768, name: 'Landscape (Wide)' },
  '9:16': { width: 768, height: 1344, name: 'Portrait (Tall)' },
  '4:3': { width: 1152, height: 896, name: 'Standard' },
  '3:4': { width: 896, height: 1152, name: 'Portrait' },
  '21:9': { width: 1536, height: 640, name: 'Ultrawide' },
};

// ============================================
// Helper Functions
// ============================================

/**
 * Get system prompt for a specific mode
 */
export function getModeSystemPrompt(mode: AIMode): string {
  return MODE_SYSTEM_PROMPTS[mode] || MODE_SYSTEM_PROMPTS[AIMode.CHAT];
}

/**
 * Get style preset for image generation
 */
export function getStylePreset(style: string): typeof IMAGE_STYLE_PRESETS[string] | null {
  return IMAGE_STYLE_PRESETS[style] || null;
}

/**
 * Get aspect ratio dimensions
 */
export function getAspectRatioDimensions(ratio: string): { width: number; height: number } {
  return ASPECT_RATIOS[ratio] || ASPECT_RATIOS['1:1'];
}

/**
 * Get all available styles
 */
export function getAvailableStyles(): Array<{ id: string; name: string }> {
  return Object.entries(IMAGE_STYLE_PRESETS).map(([id, preset]) => ({
    id,
    name: preset.name,
  }));
}

/**
 * Get all available aspect ratios
 */
export function getAvailableAspectRatios(): Array<{ id: string; name: string; dimensions: string }> {
  return Object.entries(ASPECT_RATIOS).map(([id, config]) => ({
    id,
    name: config.name,
    dimensions: `${config.width}x${config.height}`,
  }));
}
