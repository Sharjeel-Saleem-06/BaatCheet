# CURSOR PROMPT: BaatCheet Android - Complete ChatGPT-Level Features

Build a production-grade Android app with ALL web features plus mobile-exclusive capabilities that SURPASS ChatGPT mobile app.

---

## 🎯 CORE OBJECTIVE

Create Android app with complete feature parity to web version plus advanced mobile features:
- Multi-provider AI (Groq, OpenRouter, DeepSeek, Gemini, Hugging Face)
- Intelligent prompt understanding with context awareness
- Native Roman Urdu support with auto-detection
- Image generation (1/day free, 50/day pro)
- Voice input/output with Urdu support
- Advanced AI modes (10+ modes with auto-detection)
- Offline-first architecture with sync
- Real-time streaming responses
- Memory system (learns from conversations)
- Web search integration
- LaTeX math rendering
- PDF & document analysis
- Complete feature parity with web + mobile exclusives

---

## 📋 FEATURE CHECKLIST (MUST IMPLEMENT ALL)

### 1️⃣ INTELLIGENT CHAT SYSTEM

**Prompt Understanding & Processing:**
- Automatic intent detection (table, list, code, image, etc.)
- Context-aware responses based on conversation history
- Multi-turn conversations with perfect context retention
- Smart follow-up question suggestions
- Auto-completion for common queries
- Typing indicators with "AI is thinking..." states

**Response Intelligence:**
- Markdown rendering with syntax highlighting (CodeView library)
- LaTeX math equations (MathView or KaTeX Android)
- Beautiful table formatting (responsive tables)
- Automatic list formatting (bullets, numbered)
- Code blocks with language detection and copy button
- Collapsible long responses for readability

**Streaming & Real-Time:**
- Word-by-word streaming (SSE or WebSocket)
- Smooth animation as text appears
- Progress indicators during generation
- Cancel generation mid-stream
- Regenerate last response option
- Edit user message and continue conversation

### 2️⃣ ROMAN URDU & MULTI-LANGUAGE

**Language Intelligence:**
- Auto-detect Roman Urdu vs English vs Mixed
- Transcribe Urdu voice as Roman Urdu (NOT Urdu script)
- AI responds in same language style as user
- Optional translation button on Roman Urdu messages
- Language switching mid-conversation
- Smart keyboard suggestions for Roman Urdu

**Implementation:**
- Urdu voice → Roman Urdu text (Whisper API)
- "Aap kaise hain" → AI responds "Main theek hoon"
- Translation overlay: Click icon → Shows English
- Mixed language: "Yaar, code likhna hai" → AI understands
- RTL support for Urdu script (if user explicitly requests)

### 3️⃣ ADVANCED AI MODES (10+ MODES)

**Auto-Detection System:**
Automatically detect mode from user message without asking:

```
"Generate sunset image" → IMAGE_GEN mode
"What's in this photo?" → VISION mode  
"What happened today?" → WEB_SEARCH mode
"Write Python function" → CODE mode
"Solve equation" → MATH mode
"Analyze this CSV" → DATA_ANALYSIS mode
"Write a story" → CREATIVE mode
"Translate to Urdu" → TRANSLATE mode
```

**Available Modes:**
1. **💬 Chat** - General conversation (default)
2. **🎨 Image Generation** - Create images (SDXL, FLUX, Playground)
3. **👁️ Vision** - Analyze images with AI
4. **🌐 Web Search** - Real-time information (Brave/SerpAPI)
5. **💻 Code** - Programming assistance with syntax highlighting
6. **📊 Data Analysis** - CSV analysis, chart generation
7. **🔢 Math** - Mathematical problem solving with LaTeX
8. **✍️ Creative** - Stories, poems, scripts
9. **🌍 Translate** - Multi-language translation
10. **📝 Summarize** - Condense long content
11. **🔬 Research** - Deep research with citations
12. **🎓 Tutor** - Teaching mode with examples

**Mode Selector UI:**
- Beautiful bottom sheet with mode icons
- Auto-selected mode highlighted
- Badge showing "Limited" for image gen
- Pro badge (👑) for premium modes
- Swipeable mode cards

### 4️⃣ IMAGE GENERATION & VISION

**Image Generation (Like DALL-E 3):**
- Multiple models: Stable Diffusion XL, FLUX Schnell, Playground v2.5
- Load balancing across 5 Hugging Face API keys per model
- Auto-enhance prompts using AI (user says "sunset" → AI enhances to "beautiful sunset, golden hour, cinematic lighting, 8k")
- Style presets: Realistic, Anime, Cartoon, Sketch, Watercolor, Digital Art, Cyberpunk, Fantasy, Minimalist, Vintage
- Aspect ratio selection: 1:1, 16:9, 9:16, 4:3
- Negative prompts: "no watermark, no text, no blurry"
- Generation progress: "Generating... 45%"
- Image variations: Generate 3-4 versions
- Strict rate limiting: 1/day free, 50/day pro
- Gallery view of all generated images
- Save to device gallery option
- Share generated images

**Vision Analysis:**
- Upload image from gallery or camera
- OCR text extraction (6 OCR.space keys + Gemini fallback)
- Image description and analysis
- Question answering about images
- Multi-image comparison
- Detect objects, text, scenes
- Extract text from screenshots
- Analyze charts and graphs

### 5️⃣ VOICE INPUT & OUTPUT

**Voice Input (Speech-to-Text):**
- Tap-and-hold microphone button
- Real-time waveform visualization
- Voice activity detection (auto-stop on silence)
- Transcription using Whisper API
- Auto-detect language (Urdu → Roman Urdu, English → English)
- Mixed language support ("Yaar, kya scene hai")
- Show transcription before sending
- Edit transcription option
- Voice commands: "New chat", "Search for..."

**Voice Output (Text-to-Speech):**
- "Read Aloud" button on AI messages
- Multiple voice options (Alloy, Echo, Fable, Nova, Shimmer)
- Speed control (0.5x to 2x)
- Background playback (continue reading while browsing)
- Pause/Resume/Stop controls
- Auto-read mode (automatically read all AI responses)
- Urdu TTS support (Google Cloud TTS)

### 6️⃣ CONVERSATION MANAGEMENT

**Multiple Conversations:**
- Create unlimited conversations
- Auto-generated titles or custom names
- Sidebar/drawer with conversation list
- Search conversations by content
- Star/Pin important conversations
- Archive old conversations
- Delete conversations with confirmation
- Conversation export (PDF, TXT, JSON, Markdown)

**Projects & Organization:**
- Create projects/folders
- Organize conversations by project
- Color-coded projects
- Project icons (emoji or icon picker)
- Move conversations between projects
- Project statistics (message count, tokens used)
- Drag-and-drop to organize

**Context Management:**
- Each conversation maintains independent context
- Last 50 messages or 8000 tokens
- Context preserved when switching conversations
- "Clear context" option
- Context visualization: "Using 15/50 messages"
- Smart context pruning (keeps important messages)

### 7️⃣ MEMORY & PROFILE LEARNING

**Automatic Learning:**
- Learn user's name, occupation, interests, skills, goals
- Extract facts from conversations automatically
- Store 50-100 facts per user
- Confidence scores (1.0 = explicit, 0.5-0.9 = inferred)
- Categories: Personal, Professional, Preferences, Interests, Goals

**User Profile:**
- "What do you know about me?" command
- View all stored facts in settings
- Delete individual facts
- Manually teach facts: "Remember I'm vegetarian"
- Export profile data (GDPR compliance)

**Conversation Summaries:**
- Auto-generate summary every 10 messages
- Track recent discussion topics
- Reference past conversations: "Last time we discussed..."
- Smart continuity between sessions

**Skill Progression:**
- Track expertise level in topics (Beginner → Expert)
- Adjust explanations based on skill level
- Monitor stated goals over time
- Celebrate learning milestones

### 8️⃣ WEB SEARCH & REAL-TIME INFO

**Web Search Integration:**
- Auto-detect queries needing web search
- Keywords: "today", "latest", "current", "news", "weather", "stock price"
- Multiple search APIs: Brave Search (2000/month), SerpAPI (100/month), DuckDuckGo
- Display search results with sources
- Cite sources in responses [1], [2], [3]
- Click citation to open source in browser
- Image search results
- News articles with thumbnails

### 9️⃣ DOCUMENT ANALYSIS

**PDF Documents:**
- Upload PDFs from device
- Parse and extract text (pdf-parse equivalent)
- Ask questions about PDF content
- Page-by-page navigation
- Highlight key information
- Summarize long documents

**CSV & Data Files:**
- Upload CSV files
- Parse and analyze data
- Generate statistics (mean, median, mode)
- Create charts (bar, line, pie) using MPAndroidChart
- Filter and sort data
- Export analyzed results

**Images & Screenshots:**
- Upload images from gallery or camera
- OCR text extraction
- Ask questions about images
- Multi-image analysis
- Compare images side-by-side

### 🔟 OFFLINE CAPABILITIES

**Offline-First Architecture:**
- All conversations cached in Room database
- Read conversations without internet
- Compose messages offline (queue for sending)
- Auto-sync when connection restored
- Offline indicator with queue count
- Conflict resolution for sync issues

**Local Storage:**
- Encrypted database (SQLCipher)
- Image caching (Coil with disk cache)
- Conversation backup to device
- Auto-backup every 24 hours
- Restore from backup option

### 1️⃣1️⃣ MOBILE-EXCLUSIVE FEATURES

**Android-Specific:**
- Share to BaatCheet (share from any app)
- Quick reply from notifications
- Widget for quick access
- Split-screen multi-tasking
- Picture-in-Picture for voice playback
- Adaptive icons
- Material You dynamic theming
- Shortcuts (long-press app icon)
- App shortcuts: "New Chat", "Voice Chat", "Generate Image"

**Notifications:**
- Push notifications for new AI responses (if enabled)
- Smart notification grouping
- Quick actions in notifications (Reply, Mark as read)
- Notification channels for customization
- Do Not Disturb integration

**Camera Integration:**
- Take photo and analyze instantly
- Document scanning (auto crop, enhance)
- QR code scanning for sharing conversations
- Live text detection (point camera at text)

**Biometric Security:**
- Fingerprint/Face unlock for app
- Lock specific conversations
- Secure mode (hide content in recents)
- Auto-lock after inactivity

**Performance Optimizations:**
- Lazy loading for long conversations
- Image compression before upload
- Background sync with WorkManager
- Battery optimization (Doze mode compatible)
- Reduced data mode (compress API requests)

### 1️⃣2️⃣ ADVANCED SETTINGS & CUSTOMIZATION

**Appearance:**
- Light/Dark/Auto theme
- Material You dynamic colors (Android 12+)
- Custom accent colors
- Font size adjustment (Small, Medium, Large, Extra Large)
- Message bubble styles (iOS-like, Material, Minimal)
- Chat background (solid color, gradient, image)
- Compact/Comfortable message spacing

**Behavior:**
- Default AI model selection
- Temperature control (Creativity: Low → High)
- Response length preference (Brief, Balanced, Detailed)
- Auto-send on Enter or Shift+Enter
- Typing indicators on/off
- Read receipts on/off
- Auto-save drafts

**Privacy:**
- Incognito mode (no history saved)
- Auto-delete old conversations
- Clear all data option
- Export data (GDPR)
- Delete account permanently
- Analytics opt-out

**Notifications:**
- Enable/disable notifications
- Notification sound customization
- Vibration pattern
- LED color (if supported)
- Priority notifications

### 1️⃣3️⃣ RATE LIMITING & QUOTA MANAGEMENT

**Visual Quota Display:**
- Top bar showing: "15/50 messages today"
- Image generation: "0/1 images today (Free)" or "12/50 images (Pro)"
- Progress bar for daily limits
- Countdown to reset: "Resets in 6 hours"
- Upgrade prompt when limit reached

**Tier-Based Limits:**
```
FREE:
- 50 messages/day
- 1 image/day  
- 10 voice transcriptions/day
- 5 web searches/day

PRO:
- 500 messages/day
- 50 images/day
- 100 voice transcriptions/day
- 100 web searches/day

ENTERPRISE:
- Unlimited messages
- 500 images/day
- Unlimited voice
- Unlimited web search
```

**Smart Rate Limiting:**
- Load balance across 38+ API keys (14 Groq, 12 OpenRouter, 4 DeepSeek, 3 Gemini, 5 HF)
- Automatic failover to backup providers
- Queue requests when rate limited
- Notify user of rate limits gracefully

### 1️⃣4️⃣ SHARING & COLLABORATION

**Share Conversations:**
- Generate shareable link with expiry
- QR code for easy sharing
- Export as PDF with formatting
- Copy as plain text
- Share specific messages
- Share images/files from conversation

**Collaborative Features:**
- Share conversation with edit access (future)
- Comment on shared conversations (future)
- Conversation templates library
- Import/export conversation templates

### 1️⃣5️⃣ PERFORMANCE & RELIABILITY

**Speed Optimizations:**
- Instant app launch (< 1 second)
- Message send < 200ms (excluding AI generation)
- Smooth 60fps scrolling
- Lazy loading for images
- Pagination for old messages (load 50 at a time)
- Memory efficient (< 100MB RAM usage)

**Reliability:**
- Automatic retry on network failure
- Offline queue for unsent messages
- Error recovery without data loss
- Crash reporting (Firebase Crashlytics)
- Analytics for feature usage (Firebase Analytics)

**Battery Optimization:**
- Doze mode compatible
- Background restrictions compliant
- Efficient WorkManager scheduling
- Minimal wake locks
- Battery saver mode detection

---

## 🎨 UI/UX REQUIREMENTS (BETTER THAN CHATGPT)

### **Modern Material Design 3:**
- Dynamic color theming (Android 12+)
- Smooth animations and transitions
- Bottom sheet for mode selection
- FAB for new conversation
- Collapsing toolbar
- Swipe actions (delete, archive)
- Pull-to-refresh

### **Chat Interface:**
- Bubble-style messages (user: right, AI: left)
- Typing indicator animation
- Message timestamps (grouped by day)
- Avatar images
- Message status icons (sending, sent, failed)
- Long-press context menu (copy, delete, regenerate)
- Markdown preview in real-time
- Code syntax highlighting with theme
- Collapsible code blocks for long code

### **Beautiful Components:**
- Shimmer loading states
- Skeleton screens while loading
- Empty states with illustrations
- Error states with retry buttons
- Success animations (Lottie)
- Smooth page transitions
- Parallax effects (where appropriate)

### **Accessibility:**
- TalkBack support (screen reader)
- Content descriptions for images
- Minimum touch target size (48dp)
- High contrast mode support
- Text scaling support
- Keyboard navigation

---

## 🔐 SECURITY & PRIVACY

**Data Protection:**
- Encrypted database (SQLCipher)
- Secure token storage (Keystore)
- HTTPS for all API calls
- Certificate pinning
- No logging of sensitive data
- Biometric authentication option

**Privacy Features:**
- Incognito mode (no history)
- Auto-delete conversations after N days
- Clear all data option
- Export user data (GDPR Article 15)
- Delete all data (GDPR Article 17)
- Privacy policy in-app

---

## 📊 ANALYTICS & MONITORING

**Track User Behavior:**
- Feature usage statistics
- Popular AI modes
- Average conversation length
- Error rates per API
- Performance metrics
- Crash reports

**User Insights:**
- Most used features
- Peak usage hours
- Retention metrics
- Conversion to Pro
- Feature adoption rates

---

## ✅ TESTING REQUIREMENTS

**Unit Tests:**
- ViewModel logic
- UseCase business logic
- Repository implementations
- Data transformations

**UI Tests:**
- Chat flow (send message, receive response)
- Mode switching
- Image generation
- Voice input/output
- Settings changes

**Integration Tests:**
- API communication
- Database operations
- Background sync
- Offline queue

---

## 🚀 DELIVERABLES

After implementation, app must have:

✅ Complete feature parity with web
✅ All 10+ AI modes with auto-detection
✅ Roman Urdu native support
✅ Image generation (multi-model)
✅ Voice input/output (Urdu + English)
✅ Web search integration
✅ Memory system (profile learning)
✅ LaTeX math rendering
✅ PDF & document analysis
✅ Offline-first architecture
✅ Beautiful Material Design 3 UI
✅ 60fps performance
✅ < 100MB RAM usage
✅ Battery optimized
✅ Secure & private
✅ BETTER user experience than ChatGPT mobile

---

**This Android app will be the MOST ADVANCED AI chat app with features BEYOND ChatGPT!** 🚀📱