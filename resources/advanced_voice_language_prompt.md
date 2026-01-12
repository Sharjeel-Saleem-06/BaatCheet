# CURSOR PROMPT: BaatCheet - Advanced Voice & Language Handling

Based on extensive research of ChatGPT Advanced Voice Mode, Google Gemini Live, and professional Urdu AI systems, implement enterprise-grade voice input with Roman Urdu support and optional translation.

---

## 🎯 RESEARCH FINDINGS: HOW CHATGPT HANDLES VOICE & LANGUAGES

### ChatGPT Voice Mode Architecture (Researched):
1. **Direct Audio Processing:** GPT-4o processes audio natively without converting to text first
2. **Multimodal Understanding:** Captures tone, emotion, pauses, emphasis
3. **Real-Time Streaming:** Response times under 3 seconds
4. **Natural Pauses:** Detects when speaker has finished
5. **Language Flexibility:** Auto-detects language, supports 50+ languages
6. **Transcription Storage:** Voice is transcribed and added to chat history after conversation

### Roman Urdu Handling (Researched):
- Professional AI tools (ElevenLabs, Resemble AI, VEED) support **both native Urdu script AND Roman Urdu**
- Roman Urdu = Urdu language written in Latin/English alphabet (e.g., "Mujhe madad chahiye" instead of "مجھے مدد چاہیے")
- ChatGPT transcribes Urdu speech as **Roman Urdu by default** when speaking Urdu
- This matches user expectations in Pakistan where Roman Urdu is more commonly typed

---

## 🎙️ VOICE INPUT PROCESSING FLOW

```
┌─────────────────────────────────────────────────────────────┐
│                    USER SPEAKS (Urdu/English)                │
└─────────────────────────────────────────────────────────────┘
                            │
                            ▼
┌─────────────────────────────────────────────────────────────┐
│              FRONTEND: Audio Recording                       │
│  • MediaRecorder API (browser native)                       │
│  • Capture audio in chunks (100ms)                          │
│  • Stream to backend via WebSocket/HTTP                     │
│  • Show visual waveform                                      │
│  • Voice activity detection (VAD)                            │
└─────────────────────────────────────────────────────────────┘
                            │
                            ▼
┌─────────────────────────────────────────────────────────────┐
│           BACKEND: Audio Preprocessing                       │
│  • Validate audio format (WAV, MP3, OGG, WEBM)              │
│  • Noise reduction (optional)                                │
│  • Normalize volume                                          │
│  • Compress if needed                                        │
└─────────────────────────────────────────────────────────────┘
                            │
                            ▼
┌─────────────────────────────────────────────────────────────┐
│        TRANSCRIPTION ENGINE (OpenAI Whisper)                 │
│  • Language: AUTO-DETECT (supports Urdu + English)          │
│  • Output format: Roman Urdu (transliterated)               │
│  • Word-level timestamps                                     │
│  • Confidence scores                                         │
│  • Processing time: < 10 seconds                             │
└─────────────────────────────────────────────────────────────┘
                            │
                            ▼
┌─────────────────────────────────────────────────────────────┐
│           LANGUAGE DETECTION & ENHANCEMENT                   │
│  • Detect: Urdu, English, Mixed (Urd-Eng)                   │
│  • If Urdu detected:                                         │
│    → Transcribe as Roman Urdu (default)                     │
│    → Optionally translate to English (user choice)          │
│  • If English: Keep as-is                                    │
│  • If Mixed: Preserve both languages                         │
└─────────────────────────────────────────────────────────────┘
                            │
                            ▼
┌─────────────────────────────────────────────────────────────┐
│              DISPLAY IN CHAT (Frontend)                      │
│  ┌────────────────────────────────────────────┐            │
│  │  [User Message - Roman Urdu]               │            │
│  │  "Mujhe ek poem likhna hai"                │            │
│  │                                              │            │
│  │  [Translation Button] 🌐                    │            │
│  │  If clicked → "I want to write a poem"      │            │
│  └────────────────────────────────────────────┘            │
└─────────────────────────────────────────────────────────────┘
                            │
                            ▼
┌─────────────────────────────────────────────────────────────┐
│           AI PROCESSING (LLM understands Roman Urdu)         │
│  • AI models (GPT, Llama, Gemini) understand Roman Urdu     │
│  • No need to convert to Urdu script                        │
│  • Response can be in Roman Urdu or English                 │
│  • User preference remembered                                │
└─────────────────────────────────────────────────────────────┘
```

---

## 📋 IMPLEMENTATION REQUIREMENTS

### 1. VOICE INPUT CONFIGURATION

**Whisper API Settings (OpenAI):**
```typescript
// services/whisper.service.ts

interface TranscriptionOptions {
  language?: string; // 'auto', 'ur', 'en', or null for auto-detect
  romanize?: boolean; // Output Roman Urdu for Urdu speech
  responseFormat?: 'json' | 'text' | 'srt' | 'verbose_json' | 'vtt';
  temperature?: number; // 0-1, lower = more deterministic
  timestampGranularities?: ('word' | 'segment')[];
}

class WhisperService {
  async transcribe(audioBuffer: Buffer, options: TranscriptionOptions = {}): Promise<TranscriptionResult> {
    const formData = new FormData();
    formData.append('file', audioBuffer, 'audio.mp3');
    formData.append('model', 'whisper-1');
    
    // CRITICAL: Set language to auto-detect
    // Whisper will detect Urdu and auto-transcribe as Roman Urdu
    formData.append('language', options.language || 'auto');
    
    // Use verbose_json to get metadata
    formData.append('response_format', 'verbose_json');
    
    // Get word-level timestamps for better UX
    formData.append('timestamp_granularities[]', 'word');
    formData.append('timestamp_granularities[]', 'segment');
    
    const response = await axios.post('https://api.openai.com/v1/audio/transcriptions', formData, {
      headers: {
        'Authorization': `Bearer ${process.env.OPENAI_API_KEY}`,
        ...formData.getHeaders()
      },
      timeout: 30000 // 30 second timeout
    });
    
    const result = response.data;
    
    // Post-process for Roman Urdu
    const processed = await this.processTranscription(result);
    
    return processed;
  }
  
  private async processTranscription(rawResult: any): Promise<TranscriptionResult> {
    const detectedLanguage = rawResult.language; // 'ur' for Urdu, 'en' for English
    
    let transcriptionText = rawResult.text;
    let isRomanUrdu = false;
    
    // If Urdu detected, ensure it's Roman Urdu (not Urdu script)
    if (detectedLanguage === 'ur') {
      // Whisper already outputs Roman Urdu by default!
      // Example: "Aap kaise hain" instead of "آپ کیسے ہیں"
      isRomanUrdu = true;
      
      // Clean up common Roman Urdu transcription issues
      transcriptionText = this.cleanRomanUrdu(transcriptionText);
    }
    
    return {
      text: transcriptionText,
      language: detectedLanguage,
      isRomanUrdu,
      duration: rawResult.duration,
      segments: rawResult.segments,
      words: rawResult.words,
      confidence: this.calculateConfidence(rawResult)
    };
  }
  
  private cleanRomanUrdu(text: string): string {
    // Common Whisper Roman Urdu cleanup
    return text
      .replace(/\s+/g, ' ') // Normalize spaces
      .trim()
      // Fix common mistakes
      .replace(/\bk\b/g, 'ka') // 'k' → 'ka'
      .replace(/\bhai\b/g, 'hain') // 'hai' → 'hain' (plural)
      // Add more patterns as needed
  }
  
  private calculateConfidence(result: any): number {
    if (!result.words || result.words.length === 0) return 0.8;
    
    // Average word-level confidence
    const totalConfidence = result.words.reduce((sum, word) => 
      sum + (word.confidence || 0.8), 0
    );
    
    return totalConfidence / result.words.length;
  }
}
```

---

### 2. ROMAN URDU HANDLING SYSTEM

**Key Principles:**
1. **Always transcribe Urdu as Roman Urdu** (matches user expectations)
2. **Never show Urdu script from voice** (users expect Roman)
3. **Provide optional translation to English** (user choice)
4. **AI understands Roman Urdu natively** (no conversion needed)

**Implementation:**

```typescript
// services/language-handler.service.ts

interface LanguageDetectionResult {
  primaryLanguage: 'urdu' | 'english' | 'mixed';
  confidence: number;
  isRomanUrdu: boolean;
  originalText: string;
  englishTranslation?: string;
}

class LanguageHandler {
  async processVoiceInput(transcription: TranscriptionResult): Promise<LanguageDetectionResult> {
    const { text, language, isRomanUrdu } = transcription;
    
    // Determine primary language
    const primaryLanguage = this.determinePrimaryLanguage(language, text);
    
    // For chat display, keep as Roman Urdu
    const result: LanguageDetectionResult = {
      primaryLanguage,
      confidence: transcription.confidence,
      isRomanUrdu,
      originalText: text,
      englishTranslation: undefined // Will be generated on demand
    };
    
    return result;
  }
  
  private determinePrimaryLanguage(whisperLang: string, text: string): 'urdu' | 'english' | 'mixed' {
    if (whisperLang === 'ur') return 'urdu';
    if (whisperLang === 'en') return 'english';
    
    // Check for code-mixing (common in Pakistan)
    const hasUrduWords = this.containsUrduWords(text);
    const hasEnglishWords = this.containsEnglishWords(text);
    
    if (hasUrduWords && hasEnglishWords) return 'mixed';
    if (hasUrduWords) return 'urdu';
    return 'english';
  }
  
  private containsUrduWords(text: string): boolean {
    // Common Urdu words in Roman script
    const urduPatterns = [
      /\b(hai|hain|ka|ki|ko|se|ne|mein|aur|kya|kaise|kyun)\b/i,
      /\b(aap|mujhe|tumhe|humein|unko)\b/i,
      /\b(chahiye|chahta|chahte)\b/i,
      /\b(likh|padh|dekh|sun|bol)/i
    ];
    
    return urduPatterns.some(pattern => pattern.test(text));
  }
  
  private containsEnglishWords(text: string): boolean {
    // Common English words
    const englishPatterns = [
      /\b(the|is|are|was|were|have|has|will|would|can|could)\b/i,
      /\b(hello|hi|thanks|please|sorry|okay)\b/i
    ];
    
    return englishPatterns.some(pattern => pattern.test(text));
  }
  
  async translateToEnglish(romanUrduText: string): Promise<string> {
    // Use AI to translate Roman Urdu → English
    const prompt = `Translate this Roman Urdu text to English. Keep it natural and conversational.

Roman Urdu: ${romanUrduText}

English:`;
    
    const translation = await aiRouter.chat({
      messages: [{ role: 'user', content: prompt }],
      temperature: 0.3, // Low temperature for accurate translation
      max_tokens: 200
    });
    
    return translation.choices[0].message.content.trim();
  }
}
```

---

### 3. FRONTEND: VOICE INPUT COMPONENT

**Requirements:**
- Visual voice recording indicator
- Real-time waveform display
- Auto-stop on silence detection
- Show transcription as it's processed
- Translation button for Roman Urdu messages

**Implementation:**

```typescript
// components/Chat/VoiceInput.tsx

interface VoiceInputProps {
  onTranscriptionComplete: (text: string, metadata: any) => void;
  conversationId: string | null;
}

export const VoiceInput: React.FC<VoiceInputProps> = ({ onTranscriptionComplete, conversationId }) => {
  const [isRecording, setIsRecording] = useState(false);
  const [transcribing, setTranscribing] = useState(false);
  const [audioLevel, setAudioLevel] = useState(0);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const audioChunksRef = useRef<Blob[]>([]);
  
  const startRecording = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ 
        audio: {
          echoCancellation: true,
          noiseSuppression: true,
          autoGainControl: true,
          sampleRate: 16000 // Optimal for Whisper
        } 
      });
      
      // Setup audio level monitoring for visual feedback
      const audioContext = new AudioContext();
      const analyser = audioContext.createAnalyser();
      const source = audioContext.createMediaStreamSource(stream);
      source.connect(analyser);
      analyser.fftSize = 256;
      
      const dataArray = new Uint8Array(analyser.frequencyBinCount);
      
      const updateAudioLevel = () => {
        if (!isRecording) return;
        
        analyser.getByteFrequencyData(dataArray);
        const average = dataArray.reduce((sum, val) => sum + val, 0) / dataArray.length;
        setAudioLevel(average / 255); // Normalize to 0-1
        
        requestAnimationFrame(updateAudioLevel);
      };
      
      updateAudioLevel();
      
      // Setup MediaRecorder
      const mediaRecorder = new MediaRecorder(stream, {
        mimeType: 'audio/webm;codecs=opus' // Best for speech
      });
      
      mediaRecorder.ondataavailable = (event) => {
        if (event.data.size > 0) {
          audioChunksRef.current.push(event.data);
        }
      };
      
      mediaRecorder.onstop = async () => {
        const audioBlob = new Blob(audioChunksRef.current, { type: 'audio/webm' });
        audioChunksRef.current = [];
        
        // Send to backend for transcription
        await transcribeAudio(audioBlob);
      };
      
      mediaRecorder.start(100); // Collect data every 100ms
      mediaRecorderRef.current = mediaRecorder;
      setIsRecording(true);
      
    } catch (error) {
      console.error('Failed to start recording:', error);
      alert('Microphone access denied. Please allow microphone access.');
    }
  };
  
  const stopRecording = () => {
    if (mediaRecorderRef.current && isRecording) {
      mediaRecorderRef.current.stop();
      mediaRecorderRef.current.stream.getTracks().forEach(track => track.stop());
      setIsRecording(false);
      setAudioLevel(0);
    }
  };
  
  const transcribeAudio = async (audioBlob: Blob) => {
    setTranscribing(true);
    
    try {
      const formData = new FormData();
      formData.append('audio', audioBlob, 'recording.webm');
      formData.append('conversationId', conversationId || '');
      
      const response = await api.post('/api/v1/audio/transcribe', formData, {
        headers: { 'Content-Type': 'multipart/form-data' },
        timeout: 30000
      });
      
      const { text, language, isRomanUrdu, confidence } = response.data;
      
      // Call parent callback with transcription
      onTranscriptionComplete(text, {
        language,
        isRomanUrdu,
        confidence,
        method: 'voice'
      });
      
    } catch (error) {
      console.error('Transcription failed:', error);
      alert('Failed to transcribe audio. Please try again.');
    } finally {
      setTranscribing(false);
    }
  };
  
  return (
    <div className="voice-input-container">
      {/* Recording Button */}
      <button
        onMouseDown={startRecording}
        onMouseUp={stopRecording}
        onTouchStart={startRecording}
        onTouchEnd={stopRecording}
        className={`voice-button ${isRecording ? 'recording' : ''}`}
        disabled={transcribing}
      >
        {transcribing ? (
          <div className="spinner">⏳</div>
        ) : (
          <Mic className={`w-6 h-6 ${isRecording ? 'text-red-500' : 'text-gray-600'}`} />
        )}
      </button>
      
      {/* Waveform Visual Feedback */}
      {isRecording && (
        <div className="waveform">
          <div 
            className="waveform-bar" 
            style={{ height: `${audioLevel * 100}%` }}
          />
        </div>
      )}
      
      {/* Status Text */}
      {isRecording && <span className="status-text">Recording... (Hold to record)</span>}
      {transcribing && <span className="status-text">Transcribing...</span>}
    </div>
  );
};
```

---

### 4. TRANSLATION BUTTON FOR ROMAN URDU

**Implementation:**

```typescript
// components/Chat/TranslationButton.tsx

interface TranslationButtonProps {
  originalText: string;
  isRomanUrdu: boolean;
}

export const TranslationButton: React.FC<TranslationButtonProps> = ({ originalText, isRomanUrdu }) => {
  const [translated, setTranslated] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  
  if (!isRomanUrdu) return null; // Only show for Roman Urdu messages
  
  const handleTranslate = async () => {
    if (translated) {
      // Toggle: show/hide translation
      setTranslated(null);
      return;
    }
    
    setLoading(true);
    
    try {
      const response = await api.post('/api/v1/translate', {
        text: originalText,
        from: 'roman-urdu',
        to: 'english'
      });
      
      setTranslated(response.data.translatedText);
    } catch (error) {
      console.error('Translation failed:', error);
      alert('Translation failed');
    } finally {
      setLoading(false);
    }
  };
  
  return (
    <div className="translation-container">
      <button 
        onClick={handleTranslate}
        className="translation-button"
        disabled={loading}
      >
        <Globe className="w-4 h-4" />
        {loading ? 'Translating...' : (translated ? 'Hide Translation' : 'Translate to English')}
      </button>
      
      {translated && (
        <div className="translated-text">
          <span className="label">English:</span>
          <p>{translated}</p>
        </div>
      )}
    </div>
  );
};
```

---

### 5. AI PROMPT OPTIMIZATION FOR ROMAN URDU

**Key Insight:** Modern LLMs (GPT-4, Llama 3, Gemini) understand Roman Urdu natively. No need to convert to Urdu script.

**System Prompt Configuration:**

```typescript
// config/ai-prompts.config.ts

export const SYSTEM_PROMPTS = {
  default: `You are a helpful AI assistant for BaatCheet. You understand and respond in multiple languages including:
- English
- Roman Urdu (Urdu written in Latin script, e.g., "Aap kaise hain?")
- Mixed language (code-mixing between Urdu and English)

When the user speaks or types in Roman Urdu, respond naturally in the same style. Keep responses conversational and culturally appropriate for Pakistani users.

Examples:
User: "Mujhe ek achhi recipe batayen"
Assistant: "Bilkul! Aap konsi dish banana chahte hain? Main aapko step-by-step recipe bataunga."

User: "What's the weather today?"
Assistant: "I can help you with that! However, I don't have access to real-time weather data..."`,

  professional: `You are a professional AI assistant. Respond in formal Roman Urdu or English based on user's language. Use respectful forms (aap, janab).`,
  
  casual: `You are a friendly AI assistant. Use casual Roman Urdu (tum, yaar) when appropriate. Be warm and conversational.`
};
```

---

## 📊 PERFORMANCE & UX TARGETS

| Metric | Target | Based On |
|--------|--------|----------|
| Recording Start | < 500ms | Browser MediaRecorder |
| Voice Activity Detection | < 100ms | Real-time |
| Transcription Time | < 10 seconds | Whisper API (usually 3-5s) |
| Translation Time | < 2 seconds | LLM generation |
| Overall Voice→Text | < 12 seconds | ChatGPT: ~3 seconds (benchmark) |

---

## ✅ USER EXPERIENCE FLOW

### Scenario 1: Pure Urdu Voice Input
1. User clicks mic, speaks: *"Mujhe ek poem likhni hai"*
2. System transcribes to Roman Urdu: *"Mujhe ek poem likhni hai"*
3. Shows in chat as Roman Urdu (no Urdu script)
4. Translation button available: *"I want to write a poem"*
5. AI responds in Roman Urdu: *"Bilkul! Aap kis topic par poem likhna chahte hain?"*

### Scenario 2: Mixed Language (Common in Pakistan)
1. User: *"Yaar, mujhe coding mein help chahiye"*
2. Transcribed as-is (mixed)
3. AI responds: *"Sure! Kis programming language mein help chahiye?"*

### Scenario 3: English Voice Input
1. User: *"Write me a Python function"*
2. Transcribed as English
3. AI responds in English
4. No translation button (not needed)

---

## 🔐 PRIVACY & DATA HANDLING

**Critical Requirements:**
- Audio files deleted immediately after transcription
- Transcriptions stored in database (for chat history)
- User can delete voice messages (GDPR)
- No audio training (don't send to model training)
- Encrypted transmission (HTTPS/WSS)

**Implementation:**

```typescript
// After transcription complete
await fs.unlink(audioFilePath); // Delete audio file
logger.info('Audio file deleted after transcription', { fileId });

// Store only transcription
await prisma.message.create({
  data: {
    conversationId,
    role: 'user',
    content: transcriptionText,
    metadata: {
      inputMethod: 'voice',
      language: detectedLanguage,
      isRomanUrdu,
      confidence,
      audioDeleted: true
    }
  }
});
```

---

## 🎯 TESTING CHECKLIST

### Voice Input Testing:
- [ ] Microphone permission works
- [ ] Recording starts/stops correctly
- [ ] Audio level visualization works
- [ ] Transcription completes < 10 seconds
- [ ] Urdu speech → Roman Urdu text
- [ ] English speech → English text
- [ ] Mixed speech → Mixed text
- [ ] Low quality audio handled gracefully

### Roman Urdu Testing:
- [ ] "Aap kaise hain" recognized correctly
- [ ] "Mujhe help chahiye" recognized correctly
- [ ] Mixed: "Yaar, kya scene hai" recognized correctly
- [ ] Translation button appears for Urdu
- [ ] Translation accurate
- [ ] AI responds in same language style

### Error Handling:
- [ ] No microphone → clear error message
- [ ] Network failure during transcription → retry
- [ ] Whisper API timeout → fallback
- [ ] Unrecognized audio → "Could not transcribe"

---

## ✅ DELIVERABLES

After implementation:

✅ Voice input works like ChatGPT (< 10 seconds)
✅ Urdu speech → Roman Urdu text (not Urdu script)
✅ Optional English translation available
✅ AI understands Roman Urdu natively
✅ Mixed language support (Urdu + English)
✅ Visual feedback (waveform, status)
✅ Privacy-friendly (audio deleted immediately)
✅ Culturally appropriate (matches Pakistani expectations)

**This system will handle voice and Urdu exactly like professional AI systems, with Roman Urdu as default (matching user expectations).**