# BaatCheet Android - Complete Architecture & Implementation Guide

> **Version:** 1.0.0  
> **Last Updated:** January 15, 2026  
> **Purpose:** Comprehensive documentation for iOS/Web development and future maintenance

---

## Table of Contents

1. [Project Overview](#1-project-overview)
2. [Architecture Pattern](#2-architecture-pattern)
3. [Project Structure](#3-project-structure)
4. [Authentication System](#4-authentication-system)
5. [API Layer](#5-api-layer)
6. [Chat System](#6-chat-system)
7. [AI Modes & Tags](#7-ai-modes--tags)
8. [File Upload System](#8-file-upload-system)
9. [Image Generation](#9-image-generation)
10. [Voice Features](#10-voice-features)
11. [Collaboration System](#11-collaboration-system)
12. [Analytics Dashboard](#12-analytics-dashboard)
13. [Settings Screen](#13-settings-screen)
14. [UI Components](#14-ui-components)
15. [State Management](#15-state-management)
16. [Error Handling](#16-error-handling)
17. [Daily Limits System](#17-daily-limits-system)
18. [Backend API Reference](#18-backend-api-reference)
19. [Database Schema](#19-database-schema)
20. [Deployment](#20-deployment)

---

## 1. Project Overview

**BaatCheet** is a ChatGPT-style AI assistant app with:
- Multi-modal AI chat (text, images, documents)
- Image generation (FLUX Schnell via HuggingFace)
- Voice input/output (Speech-to-Text, TTS)
- Document OCR and analysis
- Project collaboration
- Analytics dashboard

### Tech Stack
- **Android:** Kotlin, Jetpack Compose, Hilt DI, Retrofit, Coil
- **Backend:** Node.js, Express, TypeScript, Prisma ORM
- **Database:** PostgreSQL (Neon)
- **AI Providers:** Groq, OpenRouter, Gemini, DeepSeek
- **Image Gen:** HuggingFace Spaces (FLUX Schnell)
- **OCR:** ocr.space (primary), Gemini (fallback)
- **TTS:** ElevenLabs (primary), Android TTS (fallback)
- **Auth:** Clerk

---

## 2. Architecture Pattern

### MVVM + Repository Pattern

```
┌─────────────────┐
│   UI Layer      │  Jetpack Compose Screens
│  (ChatScreen)   │
└────────┬────────┘
         │
         ▼
┌─────────────────┐
│   ViewModel     │  ChatViewModel - State Management
│  (ChatViewModel)│
└────────┬────────┘
         │
         ▼
┌─────────────────┐
│   Repository    │  ChatRepository - Data Operations
│ (ChatRepository)│
└────────┬────────┘
         │
         ▼
┌─────────────────┐
│   Data Sources  │  ApiService (Retrofit) + Local Cache
│   (ApiService)  │
└─────────────────┘
```

---

## 3. Project Structure

```
android/app/src/main/java/com/baatcheet/app/
├── BaatCheetApp.kt              # Application class with Hilt
├── BaatCheetNavHost.kt          # Navigation graph
├── MainActivity.kt              # Entry point
│
├── data/
│   ├── remote/
│   │   ├── ApiService.kt        # Retrofit API interface
│   │   └── dto/
│   │       └── ApiModels.kt     # Request/Response DTOs
│   └── repository/
│       └── ChatRepository.kt    # Data operations
│
├── di/
│   └── AppModule.kt             # Hilt dependency injection
│
├── domain/
│   └── model/
│       └── ChatMessage.kt       # Domain models
│
└── ui/
    ├── auth/
    │   └── LoginScreen.kt       # Authentication UI
    ├── chat/
    │   ├── ChatScreen.kt        # Main chat UI (3800+ lines)
    │   ├── ChatViewModel.kt     # Chat state management
    │   └── MediaPicker.kt       # Camera/Gallery/File picker
    ├── analytics/
    │   └── AnalyticsScreen.kt   # Usage analytics
    ├── collaborations/
    │   ├── CollaborationsScreen.kt
    │   └── ProjectDetailsSheet.kt
    ├── settings/
    │   ├── SettingsScreen.kt
    │   └── SettingsViewModel.kt
    ├── voice/
    │   └── VoiceChatScreen.kt   # Voice mode UI
    └── components/
        └── MarkdownText.kt      # Markdown renderer
```

---

## 4. Authentication System

### Clerk Integration

**Flow:**
1. User opens app → SplashScreen checks stored token
2. If no token → Navigate to LoginScreen
3. LoginScreen uses Clerk WebView for OAuth
4. On success → Store JWT token in SharedPreferences
5. All API calls include `Authorization: Bearer <token>`

**Key Files:**
- `LoginScreen.kt` - Clerk OAuth WebView
- `SessionManager.kt` - Token storage
- `ApiService.kt` - Auth header interceptor

**Token Storage:**
```kotlin
object SessionManager {
    private const val PREFS_NAME = "baatcheet_prefs"
    private const val KEY_TOKEN = "auth_token"
    
    fun saveToken(context: Context, token: String) {
        context.getSharedPreferences(PREFS_NAME, Context.MODE_PRIVATE)
            .edit().putString(KEY_TOKEN, token).apply()
    }
    
    fun getToken(context: Context): String? {
        return context.getSharedPreferences(PREFS_NAME, Context.MODE_PRIVATE)
            .getString(KEY_TOKEN, null)
    }
    
    fun clearSession(context: Context) {
        context.getSharedPreferences(PREFS_NAME, Context.MODE_PRIVATE)
            .edit().clear().apply()
    }
}
```

**API Interceptor:**
```kotlin
class AuthInterceptor @Inject constructor(
    @ApplicationContext private val context: Context
) : Interceptor {
    override fun intercept(chain: Interceptor.Chain): Response {
        val token = SessionManager.getToken(context)
        val request = chain.request().newBuilder()
            .apply {
                if (token != null) {
                    addHeader("Authorization", "Bearer $token")
                }
                addHeader("Content-Type", "application/json")
            }
            .build()
        return chain.proceed(request)
    }
}
```

---

## 5. API Layer

### Retrofit Configuration

**Base URL:** `https://sharry121-baatcheet.hf.space`

**ApiService.kt Interface:**
```kotlin
interface ApiService {
    // Chat
    @POST("api/v1/chat/completions")
    suspend fun sendMessage(@Body request: ChatRequest): Response<ChatResponse>
    
    @POST("api/v1/chat/analyze")
    suspend fun analyzePrompt(@Body request: AnalyzeRequest): Response<AnalyzeResponse>
    
    @POST("api/v1/chat/suggest")
    suspend fun getSuggestions(@Body request: SuggestRequest): Response<SuggestResponse>
    
    @GET("api/v1/chat/usage")
    suspend fun getUsage(): Response<UsageResponse>
    
    // Conversations
    @GET("api/v1/conversations")
    suspend fun getConversations(
        @Query("limit") limit: Int = 50,
        @Query("offset") offset: Int = 0
    ): Response<ConversationsResponse>
    
    @GET("api/v1/conversations/{id}")
    suspend fun getConversation(@Path("id") id: String): Response<ConversationDetailResponse>
    
    @DELETE("api/v1/conversations/{id}")
    suspend fun deleteConversation(@Path("id") id: String): Response<ApiResponse<Unit>>
    
    // Files
    @Multipart
    @POST("api/v1/files/upload")
    suspend fun uploadFile(@Part file: MultipartBody.Part): Response<FileUploadResponse>
    
    @GET("api/v1/files/{id}/status")
    suspend fun getFileStatus(@Path("id") id: String): Response<FileStatusResponse>
    
    @GET("api/v1/files/upload-status")
    suspend fun getUploadStatus(): Response<UploadStatusResponse>
    
    // Image Generation
    @POST("api/v1/image-gen/generate")
    suspend fun generateImage(@Body request: ImageGenRequest): Response<ImageGenResponse>
    
    @GET("api/v1/image-gen/status")
    suspend fun getImageGenStatus(): Response<ImageGenStatusResponse>
    
    // Projects
    @GET("api/v1/projects")
    suspend fun getProjects(): Response<ProjectsResponse>
    
    @POST("api/v1/projects")
    suspend fun createProject(@Body request: CreateProjectRequest): Response<ProjectResponse>
    
    @GET("api/v1/projects/collaborations")
    suspend fun getCollaborations(): Response<CollaborationsResponse>
    
    @GET("api/v1/projects/invitations/pending")
    suspend fun getPendingInvitations(): Response<InvitationsResponse>
    
    @POST("api/v1/projects/{id}/invite")
    suspend fun inviteCollaborator(
        @Path("id") projectId: String,
        @Body request: InviteRequest
    ): Response<ApiResponse<Unit>>
    
    @POST("api/v1/projects/invitations/{id}/respond")
    suspend fun respondToInvitation(
        @Path("id") invitationId: String,
        @Body request: InvitationResponseRequest
    ): Response<ApiResponse<Unit>>
    
    // TTS
    @POST("api/v1/tts/generate")
    suspend fun generateSpeech(@Body request: TTSRequest): Response<ResponseBody>
    
    // User
    @GET("api/v1/users/me")
    suspend fun getUserProfile(): Response<UserProfileResponse>
}
```

### Request/Response DTOs

**ChatRequest:**
```kotlin
data class ChatRequest(
    val message: String,
    val conversationId: String? = null,
    val model: String? = null,
    val systemPrompt: String? = null,
    val stream: Boolean = false,
    val imageIds: List<String>? = null,  // For file attachments
    val maxTokens: Int? = null,
    val temperature: Float? = null,
    val mode: String? = null  // thinking, research, web-search, code, etc.
)
```

**ChatResponse:**
```kotlin
data class ChatResponse(
    val success: Boolean,
    val data: ChatResponseData?,
    val error: String?
)

data class ChatResponseData(
    val message: MessageDto?,
    val conversationId: String?,
    val model: String?,
    val provider: String?,
    val tokens: TokenUsage?
)

data class MessageDto(
    val role: String,
    val content: String
)
```

---

## 6. Chat System

### ChatViewModel State

```kotlin
data class ChatState(
    // Core
    val messages: List<ChatMessage> = emptyList(),
    val isLoading: Boolean = false,
    val currentConversationId: String? = null,
    val error: String? = null,
    
    // Loading Mode (for progress indicators)
    val currentLoadingMode: String? = null,  // thinking, research, web-search, code
    
    // Conversations
    val conversations: List<Conversation> = emptyList(),
    val isLoadingConversations: Boolean = false,
    
    // Projects
    val projects: List<Project> = emptyList(),
    val isLoadingProjects: Boolean = false,
    
    // User
    val userProfile: UserProfile? = null,
    
    // File Uploads
    val uploadedFiles: List<UploadedFileState> = emptyList(),
    val isUploading: Boolean = false,
    
    // AI Modes
    val aiModes: List<AIMode> = AIMode.DEFAULT_MODES,
    val currentAIMode: AIMode? = null,
    
    // Prompt Analysis
    val isAnalyzingPrompt: Boolean = false,
    val promptAnalysis: PromptAnalysisResult? = null,
    
    // Usage & Quotas
    val usageInfo: UsageInfo = UsageInfo.DEFAULT,
    val isLoadingUsage: Boolean = false,
    
    // Follow-up Suggestions
    val suggestions: List<String> = emptyList(),
    
    // Image Generation
    val imageGenStatus: ImageGenStatus? = null,
    val generatedImage: GeneratedImage? = null,
    val isGeneratingImage: Boolean = false,
    
    // File Upload Limits
    val uploadLimitReached: Boolean = false,
    val uploadsUsedToday: Int = 0,
    val uploadDailyLimit: Int = 6,
    val uploadNextAvailableAt: String? = null,
    
    // Image Generation Limits
    val imageGenLimitReached: Boolean = false,
    
    // Voice
    val isRecording: Boolean = false,
    val isSpeaking: Boolean = false,
    
    // Collaborations
    val collaborations: List<Project> = emptyList(),
    val pendingInvitations: List<PendingInvitation> = emptyList(),
    
    // Mode Selector
    val showModeSelector: Boolean = false
)
```

### Message Flow

```
User types message
        │
        ▼
┌───────────────────┐
│ Detect Mode       │  Check for keywords: research, code, search, etc.
│ (if not explicit) │
└────────┬──────────┘
         │
         ▼
┌───────────────────┐
│ Set Loading State │  currentLoadingMode = detected mode
│ Show Indicator    │  ModeLoadingIndicator displayed
└────────┬──────────┘
         │
         ▼
┌───────────────────┐
│ Add User Message  │  With attachments if any
│ to UI immediately │
└────────┬──────────┘
         │
         ▼
┌───────────────────┐
│ Add Streaming     │  Empty message with isStreaming = true
│ Placeholder       │
└────────┬──────────┘
         │
         ▼
┌───────────────────┐
│ API Call          │  chatRepository.sendMessage()
│ POST /completions │
└────────┬──────────┘
         │
         ▼
┌───────────────────┐
│ On Success        │  Replace placeholder with response
│ Clear Loading     │  currentLoadingMode = null
└────────┬──────────┘
         │
         ▼
┌───────────────────┐
│ Load Suggestions  │  Follow-up questions
│ Refresh Usage     │  Update quotas
└───────────────────┘
```

### Mode Detection Logic

```kotlin
val loadingMode = when {
    isImageRequest -> "image-generation"
    selectedMode == "research" || content.lowercase().contains("research") -> "research"
    selectedMode == "web-search" || content.lowercase().let { 
        it.contains("search") || it.contains("latest") || it.contains("news")
    } -> "web-search"
    selectedMode == "code" || content.lowercase().let {
        it.contains("code") || it.contains("function") || it.contains("program")
    } -> "code"
    selectedMode == "thinking" || content.lowercase().let {
        it.contains("think") || it.contains("analyze")
    } -> "thinking"
    else -> null
}
```

---

## 7. AI Modes & Tags

### Available Modes

| Mode | Emoji | Description | Backend Model |
|------|-------|-------------|---------------|
| chat | 💬 | General conversation | llama-3.3-70b |
| code | 💻 | Code generation/debugging | deepseek-coder |
| research | 🔬 | Deep research with citations | gemini-2.5-flash |
| web-search | 🌐 | Real-time web search | gemini + Tavily |
| thinking | 🧠 | Deep analysis | gemini-2.5-flash |
| image-generation | 🎨 | Create images | FLUX Schnell |
| vision | 👁️ | Image analysis/OCR | gemini-2.5-flash |
| creative | ✨ | Creative writing | llama-3.3-70b |
| translate | 🌍 | Translation | llama-3.3-70b |
| summarize | 📝 | Summarization | llama-3.3-70b |
| math | 🔢 | Math problems | deepseek-coder |
| tutor | 📚 | Educational | gemini-2.5-flash |

### Mode Loading Indicators

Each mode shows a unique animated indicator:

```kotlin
@Composable
private fun ModeLoadingIndicator(mode: String) {
    val (emoji, text, color, helpText) = when (mode) {
        "thinking" -> listOf("🧠", "Thinking", Purple, "Analyzing deeply")
        "research" -> listOf("🔬", "Researching", Blue, "Gathering information")
        "web-search" -> listOf("🌐", "Searching", Green, "Finding real-time info")
        "code" -> listOf("💻", "Writing code", Orange, "Crafting solution")
        else -> listOf("✨", "Processing", Green, "Working on request")
    }
    
    // Animated row with pulse emoji, dots animation, progress bar
}
```

---

## 8. File Upload System

### Supported File Types

**Documents:**
- PDF (`application/pdf`)
- Word (`.doc`, `.docx`)
- Text (`.txt`)

**Images:**
- JPEG/JPG
- PNG
- GIF
- WebP

### Upload Flow

```
User selects file
        │
        ▼
┌───────────────────┐
│ Check Limits      │  uploadsUsedToday < uploadDailyLimit?
└────────┬──────────┘
         │
    ┌────┴────┐
    │         │
   Yes        No
    │         │
    ▼         ▼
┌─────────┐ ┌─────────────┐
│ Upload  │ │ Show Toast  │
│ File    │ │ "Limit      │
└────┬────┘ │ Reached"    │
     │      └─────────────┘
     ▼
┌───────────────────┐
│ Create Multipart  │  MultipartBody.Part.createFormData()
│ Request           │
└────────┬──────────┘
         │
         ▼
┌───────────────────┐
│ POST /files/upload│  Backend stores & starts OCR
└────────┬──────────┘
         │
         ▼
┌───────────────────┐
│ Poll Status       │  GET /files/{id}/status
│ Until Ready       │  Status: processing → completed
└────────┬──────────┘
         │
         ▼
┌───────────────────┐
│ Update UI         │  Show preview, enable send
│ Store remoteId    │
└───────────────────┘
```

### UploadedFileState

```kotlin
data class UploadedFileState(
    val id: String,           // Local ID
    val remoteId: String?,    // Server ID after upload
    val filename: String,
    val mimeType: String,
    val uri: Uri,
    val status: FileUploadStatus,
    val extractedText: String? = null,
    val previewUrl: String? = null
)

enum class FileUploadStatus {
    PENDING,
    UPLOADING,
    PROCESSING,
    READY,
    FAILED
}
```

### MediaPicker Implementation

```kotlin
@Composable
fun rememberMediaPicker(
    onImageSelected: (Uri) -> Unit,
    onFileSelected: (Uri) -> Unit
): MediaPickerActions {
    val context = LocalContext.current
    
    // Camera launcher
    val cameraUri = remember { mutableStateOf<Uri?>(null) }
    val cameraLauncher = rememberLauncherForActivityResult(
        contract = ActivityResultContracts.TakePicture()
    ) { success ->
        if (success) cameraUri.value?.let { onImageSelected(it) }
    }
    
    // Photo picker (Android 13+)
    val photoPickerLauncher = rememberLauncherForActivityResult(
        contract = ActivityResultContracts.PickVisualMedia()
    ) { uri -> uri?.let { onImageSelected(it) } }
    
    // Document picker
    val filePickerLauncher = rememberLauncherForActivityResult(
        contract = ActivityResultContracts.OpenDocument()
    ) { uri -> uri?.let { onFileSelected(it) } }
    
    return MediaPickerActions(
        onCameraClick = {
            val uri = createImageUri(context)
            cameraUri.value = uri
            cameraLauncher.launch(uri)
        },
        onGalleryClick = {
            photoPickerLauncher.launch(
                PickVisualMediaRequest(ActivityResultContracts.PickVisualMedia.ImageOnly)
            )
        },
        onFileClick = {
            filePickerLauncher.launch(arrayOf(
                "application/pdf",
                "text/plain",
                "application/msword",
                "application/vnd.openxmlformats-officedocument.wordprocessingml.document"
            ))
        }
    )
}
```

---

## 9. Image Generation

### Flow

```
User requests image
        │
        ▼
┌───────────────────┐
│ Check Limits      │  imageGenStatus.canGenerate?
└────────┬──────────┘
         │
    ┌────┴────┐
    │         │
   Yes        No
    │         │
    ▼         ▼
┌─────────┐ ┌─────────────┐
│ Show    │ │ Show Toast  │
│ Progress│ │ "Limit      │
│ UI      │ │ Reached"    │
└────┬────┘ └─────────────┘
     │
     ▼
┌───────────────────┐
│ POST /image-gen/  │  Backend uses FLUX Schnell
│ generate          │  via HuggingFace Space
└────────┬──────────┘
         │
         ▼
┌───────────────────┐
│ Return Base64     │  Or URL to generated image
│ Image             │
└────────┬──────────┘
         │
         ▼
┌───────────────────┐
│ Display in Chat   │  As message with image
└───────────────────┘
```

### ImageGenerationPlaceholder

Animated gradient box shown while generating:

```kotlin
@Composable
private fun ImageGenerationPlaceholder() {
    val shimmerOffset by animateFloat(...)  // Gradient animation
    val dotsOffset by animateFloat(...)     // "Creating image..." dots
    
    Box(
        modifier = Modifier
            .size(256.dp)
            .clip(RoundedCornerShape(16.dp))
            .background(
                brush = Brush.linearGradient(
                    colors = listOf(Purple, Pink, Orange, Blue),
                    start = Offset(shimmerOffset * 500f, ...),
                    end = Offset(...)
                )
            )
    ) {
        Column {
            Icon(Icons.Outlined.Image)
            Text("Creating image$dots")
            LinearProgressIndicator()
            Text("This may take 30-60 seconds")
        }
    }
}
```

---

## 10. Voice Features

### Speech-to-Text

Uses Android's built-in `SpeechRecognizer`:

```kotlin
class VoiceRecognitionHelper(
    private val context: Context,
    private val onResult: (String) -> Unit,
    private val onError: (String) -> Unit
) {
    private var speechRecognizer: SpeechRecognizer? = null
    
    fun startListening() {
        speechRecognizer = SpeechRecognizer.createSpeechRecognizer(context)
        speechRecognizer?.setRecognitionListener(object : RecognitionListener {
            override fun onResults(results: Bundle?) {
                val matches = results?.getStringArrayList(SpeechRecognizer.RESULTS_RECOGNITION)
                matches?.firstOrNull()?.let { onResult(it) }
            }
            // ... other callbacks
        })
        
        val intent = Intent(RecognizerIntent.ACTION_RECOGNIZE_SPEECH).apply {
            putExtra(RecognizerIntent.EXTRA_LANGUAGE_MODEL, RecognizerIntent.LANGUAGE_MODEL_FREE_FORM)
            putExtra(RecognizerIntent.EXTRA_LANGUAGE, "en-US")
        }
        speechRecognizer?.startListening(intent)
    }
}
```

### Text-to-Speech

Primary: ElevenLabs API (6 keys with rotation)
Fallback: Android's built-in TTS

```kotlin
fun speakText(text: String) {
    if (ttsInitialized && tts != null) {
        _state.update { it.copy(isSpeaking = true) }
        
        tts?.setOnUtteranceProgressListener(object : UtteranceProgressListener() {
            override fun onDone(utteranceId: String?) {
                viewModelScope.launch {
                    _state.update { it.copy(isSpeaking = false) }
                }
            }
            // ... other callbacks
        })
        
        // Clean markdown from text
        val cleanText = text
            .replace(Regex("```[\\s\\S]*?```"), " code block ")
            .replace(Regex("`[^`]+`"), "")
            .replace(Regex("\\*\\*([^*]+)\\*\\*"), "$1")
            // ... more cleaning
        
        tts?.speak(cleanText, TextToSpeech.QUEUE_FLUSH, null, "msg_${System.currentTimeMillis()}")
    }
}
```

---

## 11. Collaboration System

### Project Model

```kotlin
data class Project(
    val id: String,
    val name: String,
    val description: String?,
    val ownerId: String,
    val ownerName: String?,
    val ownerAvatar: String?,
    val collaboratorCount: Int = 0,
    val createdAt: String,
    val updatedAt: String
)

data class PendingInvitation(
    val id: String,
    val projectId: String,
    val projectName: String,
    val projectDescription: String?,
    val role: String,
    val inviterId: String,
    val inviterName: String,
    val inviterAvatar: String?,
    val message: String?,
    val expiresAt: String?
)

data class Collaborator(
    val id: String,
    val userId: String,
    val role: String,  // owner, editor, viewer
    val user: UserSummary?,
    val addedAt: String?
)
```

### Collaboration Flow

```
Owner creates project
        │
        ▼
┌───────────────────┐
│ POST /projects    │  Creates project in DB
└────────┬──────────┘
         │
         ▼
┌───────────────────┐
│ Invite User       │  POST /projects/{id}/invite
│ by Email          │  Creates ProjectInvitation
└────────┬──────────┘
         │
         ▼
┌───────────────────┐
│ Invitee sees      │  GET /projects/invitations/pending
│ pending invite    │
└────────┬──────────┘
         │
    ┌────┴────┐
    │         │
  Accept    Decline
    │         │
    ▼         ▼
┌─────────┐ ┌─────────┐
│ Create  │ │ Delete  │
│ Collab- │ │ Invite  │
│ orator  │ │         │
└─────────┘ └─────────┘
```

### CollaborationsScreen

Two tabs:
1. **Collaborations** - Projects where user is a collaborator
2. **Invitations** - Pending invitations to accept/decline

```kotlin
@Composable
fun CollaborationsScreen(
    collaborations: List<Project>,
    pendingInvitations: List<PendingInvitation>,
    isLoading: Boolean,
    isLoadingInvitations: Boolean,
    onBack: () -> Unit,
    onProjectClick: (String) -> Unit,
    onAcceptInvitation: (String) -> Unit,
    onDeclineInvitation: (String) -> Unit,
    onRefresh: () -> Unit
) {
    var selectedTab by remember { mutableStateOf(0) }
    
    Column {
        // Header with back button
        TopAppBar(title = "Collaborations", onBack = onBack)
        
        // Tab row
        TabRow(selectedTabIndex = selectedTab) {
            Tab(text = "Collaborations (${collaborations.size})")
            Tab(text = "Invitations (${pendingInvitations.size})")
        }
        
        // Content based on tab
        when (selectedTab) {
            0 -> CollaborationsList(collaborations, onProjectClick)
            1 -> InvitationsList(pendingInvitations, onAccept, onDecline)
        }
    }
}
```

---

## 12. Analytics Dashboard

### AnalyticsData Model

```kotlin
data class AnalyticsData(
    val totalMessages: Int = 0,
    val totalConversations: Int = 0,
    val totalProjects: Int = 0,
    val totalCollaborations: Int = 0,
    val imageGenerations: Int = 0,
    val voiceMinutes: Int = 0,
    val tokensUsed: Long = 0,
    val tokensLimit: Long = 100000,
    val topModes: List<ModeUsage> = emptyList(),
    val weeklyActivity: List<DayActivity> = emptyList(),
    val topTopics: List<TopicUsage> = emptyList(),
    val streak: Int = 0,
    val lastActive: String = "Today"
)

data class ModeUsage(
    val mode: String,
    val count: Int,
    val percentage: Float
)

data class DayActivity(
    val day: String,
    val messages: Int
)
```

### AnalyticsScreen Layout

```
┌─────────────────────────────────┐
│ 🔥 Streak: 5 days               │
│ Last active: Today              │
├─────────────────────────────────┤
│ ┌─────────┐ ┌─────────┐         │
│ │ 📝 1,234│ │ 💬 56   │         │
│ │ Messages│ │ Chats   │         │
│ └─────────┘ └─────────┘         │
│ ┌─────────┐ ┌─────────┐         │
│ │ 📁 12   │ │ 👥 8    │         │
│ │ Projects│ │ Collabs │         │
│ └─────────┘ └─────────┘         │
├─────────────────────────────────┤
│ Token Usage                     │
│ ████████░░░░░░░ 45%             │
│ 45,000 / 100,000                │
├─────────────────────────────────┤
│ Weekly Activity                 │
│ █ ██ ███ ██ █ ██ ███           │
│ M T  W   Th F  S  Su            │
├─────────────────────────────────┤
│ Most Used Modes                 │
│ 💬 Chat        45%              │
│ 💻 Code        25%              │
│ 🔬 Research    15%              │
└─────────────────────────────────┘
```

---

## 13. Settings Screen

### UserSettings Model

```kotlin
data class UserSettings(
    val displayName: String = "",
    val email: String = "",
    val avatar: String? = null,
    val tier: String = "free",
    val totalMessages: Int = 0,
    val totalConversations: Int = 0,
    val imageGenerationsToday: Int = 0,
    val imageGenerationsLimit: Int = 6,
    val memberSince: String = ""
)
```

### Settings Sections

1. **Profile** - Avatar, name, email, tier badge
2. **Usage** - Messages, conversations, image gens
3. **General** - Theme, language, haptic feedback
4. **Chat** - Streaming, auto-suggestions
5. **Voice** - TTS enabled, auto-play
6. **Privacy** - Save history, share analytics
7. **Help** - Privacy policy, terms, contact
8. **Account** - Clear history, export data, logout, delete

---

## 14. UI Components

### ChatInputBar

```kotlin
@Composable
private fun ChatInputBar(
    value: String,
    onValueChange: (String) -> Unit,
    onSend: () -> Unit,
    isLoading: Boolean,
    uploadedFiles: List<UploadedFileState>,
    onRemoveFile: (String) -> Unit,
    onCameraClick: () -> Unit,
    onImageClick: () -> Unit,
    onFolderClick: () -> Unit,
    isListening: Boolean,
    audioLevel: Float,
    onMicClick: () -> Unit,
    onHeadphoneClick: () -> Unit,
    selectedPlusMode: String?,
    onPlusModeSelect: (String) -> Unit,
    uploadLimitReached: Boolean,
    imageGenLimitReached: Boolean,
    uploadsUsedToday: Int,
    uploadDailyLimit: Int,
    uploadNextAvailableAt: String?,
    imageGenUsedToday: Int,
    imageGenDailyLimit: Int,
    imageGenNextAvailableAt: String?
)
```

### PlusMenuBottomSheet

Shows when user taps "+" button:

```
┌─────────────────────────────────┐
│ ℹ️ Uploads: 2/6 used today      │
├─────────────────────────────────┤
│  📷        🖼️        📎         │
│ Camera   Photos    Files        │
├─────────────────────────────────┤
│ 🎨 Create image                 │
│    Visualize anything (2/6)     │
│ 💡 Thinking                     │
│    Think longer for better      │
│ 🔬 Deep research                │
│    Get a detailed report        │
│ 🌐 Web search                   │
│    Find real-time info          │
│ 💻 Code                         │
│    Write and debug code         │
└─────────────────────────────────┘
```

### MessageBubble

```kotlin
@Composable
private fun MessageBubble(
    message: ChatMessage,
    onCopy: (String) -> Unit,
    onRegenerate: (() -> Unit)?,
    onSpeak: ((String) -> Unit)?,
    onLike: ((String, Boolean) -> Unit)?
) {
    val isUser = message.role == MessageRole.USER
    
    Column(
        modifier = Modifier
            .fillMaxWidth()
            .padding(horizontal = 16.dp, vertical = 4.dp),
        horizontalAlignment = if (isUser) Alignment.End else Alignment.Start
    ) {
        Surface(
            shape = RoundedCornerShape(
                topStart = 16.dp,
                topEnd = 16.dp,
                bottomStart = if (isUser) 16.dp else 4.dp,
                bottomEnd = if (isUser) 4.dp else 16.dp
            ),
            color = if (isUser) MessageBubbleUser else MessageBubbleAssistant
        ) {
            Column(modifier = Modifier.padding(14.dp)) {
                // Attachments if any
                if (message.attachments.isNotEmpty()) {
                    FlowRow { message.attachments.forEach { AttachmentThumbnail(it) } }
                }
                
                // Message content (Markdown for assistant)
                if (isUser) {
                    Text(message.content)
                } else {
                    MarkdownText(message.content)
                }
            }
        }
        
        // Action buttons for assistant messages
        if (!isUser) {
            Row {
                IconButton(onClick = { onCopy(message.content) }) { Icon(Icons.Copy) }
                IconButton(onClick = { onRegenerate?.invoke() }) { Icon(Icons.Refresh) }
                IconButton(onClick = { onSpeak?.invoke(message.content) }) { Icon(Icons.VolumeUp) }
            }
        }
    }
}
```

---

## 15. State Management

### StateFlow Pattern

```kotlin
class ChatViewModel @Inject constructor(
    private val chatRepository: ChatRepository
) : ViewModel() {
    
    private val _state = MutableStateFlow(ChatState())
    val state: StateFlow<ChatState> = _state.asStateFlow()
    
    fun updateState(update: (ChatState) -> ChatState) {
        _state.update(update)
    }
    
    // Example: Loading conversations
    fun loadConversations() {
        _state.update { it.copy(isLoadingConversations = true) }
        
        viewModelScope.launch {
            when (val result = chatRepository.getConversations()) {
                is ApiResult.Success -> {
                    _state.update { 
                        it.copy(
                            conversations = result.data,
                            isLoadingConversations = false
                        )
                    }
                }
                is ApiResult.Error -> {
                    _state.update { 
                        it.copy(
                            error = result.message,
                            isLoadingConversations = false
                        )
                    }
                }
            }
        }
    }
}
```

### Collecting State in Compose

```kotlin
@Composable
fun ChatScreen(viewModel: ChatViewModel = hiltViewModel()) {
    val state by viewModel.state.collectAsState()
    
    // React to state changes
    LaunchedEffect(state.error) {
        state.error?.let { error ->
            // Show snackbar
            delay(3000)
            viewModel.clearError()
        }
    }
    
    // UI based on state
    when {
        state.isLoading -> LoadingIndicator()
        state.error != null -> ErrorMessage(state.error)
        else -> ChatContent(state)
    }
}
```

---

## 16. Error Handling

### ApiResult Sealed Class

```kotlin
sealed class ApiResult<out T> {
    data class Success<T>(val data: T) : ApiResult<T>()
    data class Error(val message: String, val code: Int = 0) : ApiResult<Nothing>()
    object Loading : ApiResult<Nothing>()
}
```

### Repository Error Handling

```kotlin
suspend fun sendMessage(message: String, ...): ApiResult<ChatMessage> {
    return try {
        val response = api.sendMessage(ChatRequest(message, ...))
        
        if (response.isSuccessful && response.body()?.success == true) {
            val data = response.body()?.data
            ApiResult.Success(ChatMessage(
                content = data?.message?.content ?: "",
                role = MessageRole.ASSISTANT,
                conversationId = data?.conversationId
            ))
        } else {
            ApiResult.Error(
                response.body()?.error ?: "Request failed",
                response.code()
            )
        }
    } catch (e: SocketTimeoutException) {
        ApiResult.Error("Request timed out. Please try again.")
    } catch (e: UnknownHostException) {
        ApiResult.Error("No internet connection")
    } catch (e: Exception) {
        ApiResult.Error(e.message ?: "Unknown error")
    }
}
```

### UI Error Display

```kotlin
// Snackbar for temporary errors
if (state.error != null) {
    Snackbar(
        action = {
            TextButton(onClick = { viewModel.clearError() }) {
                Text("Dismiss")
            }
        }
    ) {
        Text(state.error)
    }
}

// Toast for quick notifications
Toast.makeText(context, "Message sent!", Toast.LENGTH_SHORT).show()
```

---

## 17. Daily Limits System

### Limits Configuration

| Feature | Free Tier | Pro Tier |
|---------|-----------|----------|
| Messages | 50/day | Unlimited |
| File Uploads | 6/day | 100/day |
| Image Generation | 6/day | 50/day |
| Voice Minutes | 10/day | 60/day |
| Web Searches | 5/day | Unlimited |

### Limit Check Flow

```kotlin
// Before upload
fun canUploadFile(): Boolean {
    return _state.value.uploadsUsedToday < _state.value.uploadDailyLimit
}

// Before image generation
fun canGenerateImage(): Boolean {
    return _state.value.imageGenStatus?.canGenerate ?: false
}

// Get remaining message
fun getRemainingUploadsMessage(): String {
    val remaining = _state.value.uploadDailyLimit - _state.value.uploadsUsedToday
    return if (remaining > 0) {
        "$remaining uploads remaining today"
    } else {
        val nextTime = formatNextAvailableTime(_state.value.uploadNextAvailableAt)
        "Limit reached. Next available: $nextTime"
    }
}
```

### Time Formatting

Backend sends ISO timestamps, client formats to local time:

```kotlin
private fun formatNextAvailableTime(isoTimestamp: String?): String? {
    if (isoTimestamp == null) return null
    
    return try {
        val instant = Instant.parse(isoTimestamp)
        val localDateTime = LocalDateTime.ofInstant(instant, ZoneId.systemDefault())
        val formatter = DateTimeFormatter.ofPattern("MMM d, h:mm a")
        localDateTime.format(formatter)
    } catch (e: Exception) {
        null
    }
}
```

---

## 18. Backend API Reference

### Base URL
`https://sharry121-baatcheet.hf.space`

### Authentication
All endpoints require `Authorization: Bearer <jwt_token>` header.

### Endpoints

#### Chat
| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/api/v1/chat/completions` | Send message |
| POST | `/api/v1/chat/analyze` | Analyze prompt |
| POST | `/api/v1/chat/suggest` | Get follow-ups |
| GET | `/api/v1/chat/usage` | Get usage stats |

#### Conversations
| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/v1/conversations` | List conversations |
| GET | `/api/v1/conversations/:id` | Get conversation |
| DELETE | `/api/v1/conversations/:id` | Delete conversation |

#### Files
| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/api/v1/files/upload` | Upload file |
| GET | `/api/v1/files/:id/status` | Get file status |
| GET | `/api/v1/files/upload-status` | Get upload limits |

#### Image Generation
| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/api/v1/image-gen/generate` | Generate image |
| GET | `/api/v1/image-gen/status` | Get gen limits |

#### Projects
| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/v1/projects` | List projects |
| POST | `/api/v1/projects` | Create project |
| GET | `/api/v1/projects/collaborations` | Get collaborations |
| GET | `/api/v1/projects/invitations/pending` | Get invitations |
| POST | `/api/v1/projects/:id/invite` | Invite user |
| POST | `/api/v1/projects/invitations/:id/respond` | Accept/decline |

#### TTS
| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/api/v1/tts/generate` | Generate speech |

---

## 19. Database Schema

### Prisma Models

```prisma
model User {
  id            String   @id @default(uuid())
  clerkId       String   @unique
  email         String   @unique
  displayName   String?
  avatar        String?
  tier          String   @default("free")
  createdAt     DateTime @default(now())
  updatedAt     DateTime @updatedAt
  
  conversations Conversation[]
  projects      Project[]
  attachments   Attachment[]
  imageGens     ImageGeneration[]
}

model Conversation {
  id        String   @id @default(uuid())
  userId    String
  title     String?
  model     String   @default("llama-3.3-70b-versatile")
  tags      String[]
  isPinned  Boolean  @default(false)
  isArchived Boolean @default(false)
  totalTokens Int    @default(0)
  createdAt DateTime @default(now())
  updatedAt DateTime @updatedAt
  
  user      User     @relation(fields: [userId], references: [id])
  messages  Message[]
}

model Message {
  id             String   @id @default(uuid())
  conversationId String
  role           String   // user, assistant, system
  content        String
  tokens         Int      @default(0)
  createdAt      DateTime @default(now())
  
  conversation   Conversation @relation(fields: [conversationId], references: [id])
}

model Attachment {
  id            String   @id @default(uuid())
  userId        String
  conversationId String?
  type          String   // document, image
  originalName  String
  storedName    String
  fileSize      Int
  mimeType      String
  url           String?
  status        String   @default("processing")
  extractedText String?
  analysisResult String?
  createdAt     DateTime @default(now())
  
  user          User     @relation(fields: [userId], references: [id])
}

model Project {
  id          String   @id @default(uuid())
  name        String
  description String?
  ownerId     String
  createdAt   DateTime @default(now())
  updatedAt   DateTime @updatedAt
  
  owner       User     @relation(fields: [ownerId], references: [id])
  collaborators ProjectCollaborator[]
  invitations ProjectInvitation[]
}

model ProjectCollaborator {
  id        String   @id @default(uuid())
  projectId String
  userId    String
  role      String   @default("editor")
  addedAt   DateTime @default(now())
  
  project   Project  @relation(fields: [projectId], references: [id])
  
  @@unique([projectId, userId])
}

model ProjectInvitation {
  id        String   @id @default(uuid())
  projectId String
  email     String
  role      String   @default("editor")
  inviterId String
  message   String?
  status    String   @default("pending")
  expiresAt DateTime?
  createdAt DateTime @default(now())
  
  project   Project  @relation(fields: [projectId], references: [id])
}

model ImageGeneration {
  id        String   @id @default(uuid())
  userId    String
  prompt    String
  style     String?
  imageUrl  String?
  status    String   @default("pending")
  createdAt DateTime @default(now())
  
  user      User     @relation(fields: [userId], references: [id])
}
```

---

## 20. Deployment

### Backend (HuggingFace Spaces)

**URL:** `https://huggingface.co/spaces/sharry121/BaatCheet`

**Dockerfile:**
```dockerfile
FROM node:18-slim
WORKDIR /app
COPY package*.json ./
RUN npm ci --only=production
COPY . .
RUN npx prisma generate
RUN npm run build
EXPOSE 7860
CMD ["npm", "start"]
```

### Environment Variables

```env
# Database
DATABASE_URL=postgresql://...@neon.tech/baatcheet

# Clerk Auth
CLERK_SECRET_KEY=sk_live_...
CLERK_PUBLISHABLE_KEY=pk_live_...
JWT_SECRET=...

# AI Providers
GROQ_API_KEY_1=gsk_...
GROQ_API_KEY_2=gsk_...
OPENROUTER_API_KEY=sk-or-...
GEMINI_API_KEY_1=...
DEEPSEEK_API_KEY=...

# HuggingFace (Image Gen)
HUGGINGFACE_API_KEY_1=hf_...
HUGGINGFACE_API_KEY_2=hf_...

# OCR
OCR_SPACE_API_KEY_1=...
OCR_SPACE_API_KEY_2=...

# TTS
ELEVENLABS_API_KEY_1=...
ELEVENLABS_API_KEY_2=...

# Web Search
TAVILY_API_KEY=...
```

### Android Build

```bash
cd android
./gradlew assembleRelease
```

APK location: `android/app/build/outputs/apk/release/app-release.apk`

---

## Summary

This document covers the complete BaatCheet Android implementation including:

- ✅ Authentication with Clerk
- ✅ Chat system with mode detection
- ✅ File uploads with OCR
- ✅ Image generation with FLUX
- ✅ Voice input/output
- ✅ Project collaboration
- ✅ Analytics dashboard
- ✅ Settings management
- ✅ Daily limits tracking
- ✅ Error handling
- ✅ State management

Use this as a reference for:
1. **iOS Development** - Replicate all features in Swift/SwiftUI
2. **Web Development** - Update React/Next.js frontend
3. **Maintenance** - Understand existing codebase

---

*Document generated: January 15, 2026*
