/**
 * Language Handler Service
 * Handles language detection, Roman Urdu processing, and translation
 * 
 * @module LanguageHandler
 */

import { logger } from '../utils/logger.js';
import { aiRouter } from './AIRouter.js';

// ============================================
// Types
// ============================================

export interface LanguageDetectionResult {
  primaryLanguage: 'urdu' | 'english' | 'mixed' | 'other';
  confidence: number;
  isRomanUrdu: boolean;
  originalText: string;
  englishTranslation?: string;
  metadata: {
    urduWordCount: number;
    englishWordCount: number;
    totalWordCount: number;
    detectedPatterns: string[];
  };
}

export interface TranslationResult {
  success: boolean;
  originalText: string;
  translatedText?: string;
  sourceLanguage: string;
  targetLanguage: string;
  error?: string;
}

// ============================================
// Language Patterns
// ============================================

// Comprehensive Roman Urdu word list
const ROMAN_URDU_WORDS = new Set([
  // Pronouns
  'main', 'mein', 'hum', 'tum', 'aap', 'wo', 'woh', 'ye', 'yeh', 'is', 'us',
  'mujhe', 'mujhko', 'tumhe', 'tumko', 'humein', 'humko', 'unhe', 'unko', 'apko', 'aapko',
  'mera', 'meri', 'mere', 'tera', 'teri', 'tere', 'hamara', 'hamari', 'hamare',
  'tumhara', 'tumhari', 'tumhare', 'unka', 'unki', 'unke', 'apna', 'apni', 'apne',
  
  // Verbs (common forms)
  'hai', 'hain', 'tha', 'thi', 'the', 'ho', 'hoon', 'hoga', 'hogi', 'honge',
  'karna', 'karo', 'kiya', 'karein', 'karenge', 'karti', 'karta',
  'jana', 'jao', 'gaya', 'gayi', 'gaye', 'jayein', 'jayenge', 'jaati', 'jaata',
  'aana', 'aao', 'aaya', 'aayi', 'aaye', 'aayein', 'aayenge', 'aati', 'aata',
  'lena', 'lo', 'liya', 'liye', 'lein', 'lenge', 'leti', 'leta',
  'dena', 'do', 'diya', 'diye', 'dein', 'denge', 'deti', 'deta',
  'bolna', 'bolo', 'bola', 'boli', 'bole', 'bolein', 'bolenge', 'bolti', 'bolta',
  'sunna', 'suno', 'suna', 'suni', 'sune', 'sunein', 'sunenge', 'sunti', 'sunta',
  'dekhna', 'dekho', 'dekha', 'dekhi', 'dekhe', 'dekhein', 'dekhenge', 'dekhti', 'dekhta',
  'likhna', 'likho', 'likha', 'likhi', 'likhe', 'likhein', 'likhenge', 'likhti', 'likhta',
  'padhna', 'padho', 'padha', 'padhi', 'padhe', 'padhein', 'padhenge', 'padhti', 'padhta',
  'batana', 'batao', 'bataya', 'batayi', 'bataye', 'bataein', 'batayenge', 'batati', 'batata',
  'samajhna', 'samjho', 'samjha', 'samjhi', 'samjhe', 'samjhein', 'samjhenge',
  'sochna', 'socho', 'socha', 'sochi', 'soche', 'sochein', 'sochenge',
  'chahna', 'chaho', 'chaha', 'chahi', 'chahe', 'chahein', 'chahenge', 'chahiye', 'chahte', 'chahti',
  'milna', 'milo', 'mila', 'mili', 'mile', 'milein', 'milenge',
  'rakhna', 'rakho', 'rakha', 'rakhi', 'rakhe', 'rakhein', 'rakhenge',
  'banana', 'banao', 'banaya', 'banayi', 'banaye', 'banaein', 'banayenge',
  'khana', 'khao', 'khaya', 'khayi', 'khaye', 'khayein', 'khayenge',
  'peena', 'piyo', 'piya', 'piyi', 'piye', 'piyein', 'piyenge',
  'sona', 'so', 'soya', 'soyi', 'soye', 'soyein', 'soyenge',
  'uthna', 'utho', 'utha', 'uthi', 'uthe', 'uthein', 'uthenge',
  'baithna', 'baitho', 'baitha', 'baithi', 'baithe', 'baithein', 'baithenge',
  
  // Postpositions
  'ka', 'ki', 'ke', 'ko', 'se', 'ne', 'par', 'pe', 'tak', 'liye', 'wala', 'wali', 'wale',
  
  // Conjunctions
  'aur', 'ya', 'lekin', 'magar', 'kyunke', 'kyonke', 'isliye', 'phir', 'to', 'bhi',
  
  // Question words
  'kya', 'kaise', 'kyun', 'kyon', 'kahan', 'kahaan', 'kab', 'kaun', 'kitna', 'kitni', 'kitne',
  'konsa', 'konsi', 'kiska', 'kiski', 'kisko',
  
  // Adjectives
  'acha', 'achha', 'bura', 'bara', 'bada', 'chota', 'naya', 'purana', 'lamba', 'choda',
  'theek', 'thik', 'sahi', 'galat', 'mushkil', 'asaan', 'zaruri', 'lazmi',
  'bahut', 'bohat', 'zyada', 'kam', 'thoda', 'thodi', 'thode',
  'pura', 'puri', 'pure', 'adha', 'adhi', 'sara', 'sari', 'sare',
  
  // Adverbs
  'abhi', 'pehle', 'baad', 'kal', 'aaj', 'parso', 'hamesha', 'kabhi', 'kabhi',
  'yahan', 'yahaan', 'wahan', 'wahaan', 'idhar', 'udhar',
  'jaldi', 'dheere', 'aise', 'waise', 'kaise',
  
  // Numbers
  'ek', 'do', 'teen', 'char', 'paanch', 'cheh', 'saat', 'aath', 'nau', 'das',
  'gyarah', 'barah', 'terah', 'chaudah', 'pandrah', 'solah', 'satrah', 'athara', 'unees', 'bees',
  'sau', 'hazaar', 'lakh', 'crore',
  
  // Common nouns
  'log', 'aadmi', 'aurat', 'bacha', 'bache', 'ghar', 'kaam', 'baat', 'din', 'raat',
  'waqt', 'jagah', 'taraf', 'cheez', 'sawaal', 'jawab', 'madad', 'zaroorat',
  
  // Greetings & expressions
  'salam', 'assalam', 'walaikum', 'khuda', 'allah', 'mashallah', 'inshallah', 'alhamdulillah',
  'shukriya', 'meherbani', 'maaf', 'sorry', 'please', 'zaroor',
  'ji', 'haan', 'nahi', 'nahin', 'bilkul', 'shayad', 'zaroor',
  
  // Fillers
  'yaar', 'bhai', 'arre', 'accha', 'haan', 'matlab', 'basically', 'actually',
]);

// Common English words (for mixed language detection)
const ENGLISH_COMMON_WORDS = new Set([
  'the', 'a', 'an', 'is', 'are', 'was', 'were', 'be', 'been', 'being',
  'have', 'has', 'had', 'do', 'does', 'did', 'will', 'would', 'could', 'should',
  'can', 'may', 'might', 'must', 'shall',
  'i', 'you', 'he', 'she', 'it', 'we', 'they', 'me', 'him', 'her', 'us', 'them',
  'my', 'your', 'his', 'its', 'our', 'their',
  'this', 'that', 'these', 'those',
  'what', 'which', 'who', 'whom', 'whose', 'where', 'when', 'why', 'how',
  'and', 'or', 'but', 'if', 'because', 'so', 'then', 'than',
  'in', 'on', 'at', 'to', 'for', 'with', 'by', 'from', 'of', 'about',
  'yes', 'no', 'not', 'very', 'just', 'also', 'only', 'even', 'still',
  'hello', 'hi', 'hey', 'thanks', 'thank', 'please', 'sorry', 'okay', 'ok',
  'want', 'need', 'like', 'love', 'hate', 'think', 'know', 'feel', 'see',
  'help', 'code', 'write', 'create', 'make', 'build', 'fix', 'explain', 'tell',
]);

// ============================================
// Language Handler Class
// ============================================

class LanguageHandlerClass {
  /**
   * Detect language and analyze text
   */
  public detectLanguage(text: string): LanguageDetectionResult {
    const words = this.tokenize(text);
    const totalWordCount = words.length;
    
    let urduWordCount = 0;
    let englishWordCount = 0;
    const detectedPatterns: string[] = [];
    
    for (const word of words) {
      const lowerWord = word.toLowerCase();
      
      if (ROMAN_URDU_WORDS.has(lowerWord)) {
        urduWordCount++;
        if (detectedPatterns.length < 10) {
          detectedPatterns.push(word);
        }
      } else if (ENGLISH_COMMON_WORDS.has(lowerWord)) {
        englishWordCount++;
      }
    }
    
    // Calculate ratios
    const urduRatio = totalWordCount > 0 ? urduWordCount / totalWordCount : 0;
    const englishRatio = totalWordCount > 0 ? englishWordCount / totalWordCount : 0;
    
    // Determine primary language
    let primaryLanguage: 'urdu' | 'english' | 'mixed' | 'other';
    let isRomanUrdu = false;
    let confidence = 0.5;
    
    if (urduRatio > 0.3 && englishRatio > 0.15) {
      // Mixed language (code-mixing)
      primaryLanguage = 'mixed';
      isRomanUrdu = true;
      confidence = Math.min(urduRatio + englishRatio, 0.95);
    } else if (urduRatio > 0.2) {
      // Primarily Urdu
      primaryLanguage = 'urdu';
      isRomanUrdu = true;
      confidence = Math.min(0.5 + urduRatio, 0.95);
    } else if (englishRatio > 0.2) {
      // Primarily English
      primaryLanguage = 'english';
      isRomanUrdu = false;
      confidence = Math.min(0.5 + englishRatio, 0.95);
    } else {
      // Unknown/Other
      primaryLanguage = 'other';
      isRomanUrdu = false;
      confidence = 0.3;
    }
    
    return {
      primaryLanguage,
      confidence,
      isRomanUrdu,
      originalText: text,
      metadata: {
        urduWordCount,
        englishWordCount,
        totalWordCount,
        detectedPatterns,
      },
    };
  }
  
  /**
   * Translate Roman Urdu to English
   */
  public async translateToEnglish(romanUrduText: string): Promise<TranslationResult> {
    try {
      const prompt = `Translate this Roman Urdu text to English. Keep it natural and conversational. Only output the translation, nothing else.

Roman Urdu: ${romanUrduText}

English:`;
      
      const response = await aiRouter.chat({
        messages: [{ role: 'user', content: prompt }],
        temperature: 0.3, // Low temperature for accurate translation
        maxTokens: 500,
      });
      
      if (response.success && response.message) {
        return {
          success: true,
          originalText: romanUrduText,
          translatedText: response.message.trim(),
          sourceLanguage: 'roman-urdu',
          targetLanguage: 'english',
        };
      }
      
      return {
        success: false,
        originalText: romanUrduText,
        sourceLanguage: 'roman-urdu',
        targetLanguage: 'english',
        error: response.error || 'Translation failed',
      };
    } catch (error) {
      logger.error('Translation error:', error);
      return {
        success: false,
        originalText: romanUrduText,
        sourceLanguage: 'roman-urdu',
        targetLanguage: 'english',
        error: error instanceof Error ? error.message : 'Translation failed',
      };
    }
  }
  
  /**
   * Translate English to Roman Urdu
   */
  public async translateToRomanUrdu(englishText: string): Promise<TranslationResult> {
    try {
      const prompt = `Translate this English text to Roman Urdu (Urdu written in Latin script). Keep it natural and conversational. Only output the translation, nothing else.

English: ${englishText}

Roman Urdu:`;
      
      const response = await aiRouter.chat({
        messages: [{ role: 'user', content: prompt }],
        temperature: 0.3,
        maxTokens: 500,
      });
      
      if (response.success && response.message) {
        return {
          success: true,
          originalText: englishText,
          translatedText: response.message.trim(),
          sourceLanguage: 'english',
          targetLanguage: 'roman-urdu',
        };
      }
      
      return {
        success: false,
        originalText: englishText,
        sourceLanguage: 'english',
        targetLanguage: 'roman-urdu',
        error: response.error || 'Translation failed',
      };
    } catch (error) {
      logger.error('Translation error:', error);
      return {
        success: false,
        originalText: englishText,
        sourceLanguage: 'english',
        targetLanguage: 'roman-urdu',
        error: error instanceof Error ? error.message : 'Translation failed',
      };
    }
  }
  
  /**
   * Process voice input with language detection
   */
  public processVoiceInput(
    transcription: string,
    whisperLanguage?: string
  ): LanguageDetectionResult {
    const detection = this.detectLanguage(transcription);
    
    // If Whisper detected Urdu, trust it
    if (whisperLanguage === 'ur') {
      detection.primaryLanguage = 'urdu';
      detection.isRomanUrdu = true;
      detection.confidence = Math.max(detection.confidence, 0.8);
    }
    
    return detection;
  }
  
  /**
   * Check if translation is needed for AI understanding
   * (Modern LLMs understand Roman Urdu, so usually not needed)
   */
  public needsTranslation(text: string): boolean {
    // Modern LLMs (GPT-4, Llama 3, Gemini) understand Roman Urdu
    // Translation is only for user convenience, not AI understanding
    return false;
  }
  
  /**
   * Get system prompt enhancement for Roman Urdu support
   */
  public getLanguageSystemPrompt(): string {
    return `
You understand and respond fluently in multiple languages including:
- English
- Roman Urdu (Urdu written in Latin script, e.g., "Aap kaise hain?", "Mujhe madad chahiye")
- Mixed language (code-mixing between Urdu and English, common in Pakistan)

When the user speaks or types in Roman Urdu:
- Respond naturally in the same style (Roman Urdu)
- Keep responses conversational and culturally appropriate
- Use respectful forms (aap) unless the user uses casual forms (tum)

When the user uses mixed language (Urdu + English):
- Match their style - mix languages naturally
- This is common and acceptable in Pakistani communication

Examples:
User: "Mujhe ek achhi recipe batayen"
Assistant: "Bilkul! Aap konsi dish banana chahte hain? Main aapko step-by-step recipe bataunga."

User: "Yaar, mujhe coding mein help chahiye"
Assistant: "Sure! Kis programming language mein help chahiye? Python, JavaScript, ya kuch aur?"

User: "What's the capital of Pakistan?"
Assistant: "The capital of Pakistan is Islamabad."`;
  }
  
  /**
   * Simple tokenizer for word counting
   */
  private tokenize(text: string): string[] {
    return text
      .toLowerCase()
      .replace(/[^\w\s]/g, ' ')
      .split(/\s+/)
      .filter((word) => word.length > 0);
  }
}

// Export singleton
export const languageHandler = new LanguageHandlerClass();
export default languageHandler;
