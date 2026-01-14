# CURSOR PROMPT: BaatCheet Android - MVVM Clean Architecture

Build production-grade Android app using MVVM + Clean Architecture with Jetpack Compose.

## 🏗️ ARCHITECTURE LAYERS

```
Presentation (UI) ← ViewModel ← UseCase ← Repository ← Data Source
```

### **Package Structure**

```
com.baatcheet.android/
├── di/                          # Hilt Dependency Injection
├── data/
│   ├── remote/                  # API clients (Retrofit)
│   ├── local/                   # Room Database, DataStore
│   ├── repository/              # Repository implementations
│   └── model/                   # DTOs, Entities
├── domain/
│   ├── model/                   # Domain models (clean)
│   ├── repository/              # Repository interfaces
│   └── usecase/                 # Business logic
├── presentation/
│   ├── navigation/              # Compose Navigation
│   ├── theme/                   # Material3 theming
│   ├── common/                  # Shared composables
│   └── features/
│       ├── auth/
│       │   ├── LoginScreen.kt
│       │   ├── LoginViewModel.kt
│       │   └── LoginState.kt
│       ├── chat/
│       │   ├── ChatScreen.kt
│       │   ├── ChatViewModel.kt
│       │   ├── components/
│       │   └── ChatState.kt
│       └── profile/
└── utils/
```

## 📦 DEPENDENCIES (build.gradle.kts)

```kotlin
// Compose
implementation("androidx.compose.ui:ui:1.6.0")
implementation("androidx.compose.material3:material3:1.2.0")
implementation("androidx.lifecycle:lifecycle-viewmodel-compose:2.7.0")

// Hilt
implementation("com.google.dagger:hilt-android:2.50")
kapt("com.google.dagger:hilt-compiler:2.50")

// Retrofit + Moshi
implementation("com.squareup.retrofit2:retrofit:2.9.0")
implementation("com.squareup.moshi:moshi-kotlin:1.15.0")

// Room
implementation("androidx.room:room-runtime:2.6.1")
kapt("androidx.room:room-compiler:2.6.1")
implementation("androidx.room:room-ktx:2.6.1")

// Coroutines
implementation("org.jetbrains.kotlinx:kotlinx-coroutines-android:1.7.3")

// DataStore
implementation("androidx.datastore:datastore-preferences:1.0.0")

// Coil (images)
implementation("io.coil-kt:coil-compose:2.5.0")
```

## 🎯 CORE IMPLEMENTATIONS

### **1. Data Layer - API Service**

```kotlin
// data/remote/BaatCheetApi.kt
interface BaatCheetApi {
    @POST("auth/login")
    suspend fun login(@Body request: LoginRequest): Response<LoginResponse>
    
    @POST("chat/completions")
    suspend fun sendMessage(@Body request: ChatRequest): Response<ChatResponse>
    
    @GET("conversations")
    suspend fun getConversations(): Response<List<ConversationDto>>
}

// di/NetworkModule.kt
@Module
@InstallIn(SingletonComponent::class)
object NetworkModule {
    @Provides
    fun provideRetrofit(): Retrofit = Retrofit.Builder()
        .baseUrl("http://your-backend-url:5001/api/v1/")
        .addConverterFactory(MoshiConverterFactory.create())
        .build()
}
```

### **2. Domain Layer - UseCase**

```kotlin
// domain/usecase/SendMessageUseCase.kt
class SendMessageUseCase @Inject constructor(
    private val repository: ChatRepository
) {
    suspend operator fun invoke(
        conversationId: String?,
        message: String
    ): Result<ChatMessage> = repository.sendMessage(conversationId, message)
}
```

### **3. Presentation Layer - ViewModel**

```kotlin
// presentation/features/chat/ChatViewModel.kt
@HiltViewModel
class ChatViewModel @Inject constructor(
    private val sendMessageUseCase: SendMessageUseCase
) : ViewModel() {
    
    private val _state = MutableStateFlow(ChatState())
    val state = _state.asStateFlow()
    
    fun onEvent(event: ChatEvent) {
        when (event) {
            is ChatEvent.SendMessage -> sendMessage(event.message)
            is ChatEvent.LoadConversation -> loadConversation(event.id)
        }
    }
    
    private fun sendMessage(message: String) {
        viewModelScope.launch {
            _state.update { it.copy(isLoading = true) }
            
            sendMessageUseCase(state.value.conversationId, message)
                .onSuccess { response ->
                    _state.update { 
                        it.copy(
                            messages = it.messages + response,
                            isLoading = false
                        )
                    }
                }
                .onFailure { error ->
                    _state.update { 
                        it.copy(
                            error = error.message,
                            isLoading = false
                        )
                    }
                }
        }
    }
}

data class ChatState(
    val conversationId: String? = null,
    val messages: List<ChatMessage> = emptyList(),
    val isLoading: Boolean = false,
    val error: String? = null
)

sealed class ChatEvent {
    data class SendMessage(val message: String) : ChatEvent()
    data class LoadConversation(val id: String) : ChatEvent()
}
```

### **4. UI Layer - Composable**

```kotlin
// presentation/features/chat/ChatScreen.kt
@Composable
fun ChatScreen(
    viewModel: ChatViewModel = hiltViewModel()
) {
    val state by viewModel.state.collectAsState()
    
    Column(modifier = Modifier.fillMaxSize()) {
        // Messages List
        LazyColumn(
            modifier = Modifier.weight(1f),
            reverseLayout = true
        ) {
            items(state.messages) { message ->
                MessageBubble(message = message)
            }
        }
        
        // Input Field
        ChatInput(
            onSend = { viewModel.onEvent(ChatEvent.SendMessage(it)) },
            isEnabled = !state.isLoading
        )
    }
}
```

## 🔐 BEST PRACTICES

1. **Single Source of Truth** - Room DB as cache
2. **Unidirectional Data Flow** - State flows down, events up
3. **Separation of Concerns** - Each layer has one job
4. **Dependency Injection** - Hilt for all dependencies
5. **Error Handling** - Result wrapper for operations
6. **Offline-First** - Cache data locally
7. **Coroutines** - All async operations
8. **Type-Safe Navigation** - Sealed classes for routes
9. **Theme System** - Material3 dynamic colors
10. **Testing** - Unit tests for ViewModels, UseCases

## ✅ DELIVERABLES

- Clean Architecture (3 layers: Data, Domain, Presentation)
- MVVM pattern with StateFlow
- Jetpack Compose UI
- Hilt dependency injection
- Retrofit for API calls
- Room for local storage
- Coroutines for async
- Material3 design
- Type-safe navigation
- Production-ready code