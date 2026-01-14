# CURSOR PROMPT: BaatCheet iOS - MVVM Clean Architecture

Build production-grade iOS app using MVVM + Clean Architecture with SwiftUI.

## 🏗️ ARCHITECTURE LAYERS

```
View ← ViewModel ← UseCase ← Repository ← Data Source
```

### **Project Structure**

```
BaatCheet/
├── App/
│   ├── BaatCheetApp.swift
│   └── DependencyContainer.swift
├── Data/
│   ├── Network/
│   │   ├── APIClient.swift
│   │   └── Endpoints.swift
│   ├── Local/
│   │   ├── CoreDataManager.swift
│   │   └── KeychainManager.swift
│   ├── Repository/
│   │   └── ChatRepositoryImpl.swift
│   └── Models/
│       └── DTOs/
├── Domain/
│   ├── Models/               # Clean domain models
│   ├── Repositories/         # Protocol definitions
│   └── UseCases/
│       ├── SendMessageUseCase.swift
│       └── GetConversationsUseCase.swift
├── Presentation/
│   ├── Theme/
│   │   ├── Colors.swift
│   │   └── Typography.swift
│   ├── Common/
│   │   └── Components/
│   └── Features/
│       ├── Auth/
│       │   ├── LoginView.swift
│       │   ├── LoginViewModel.swift
│       │   └── LoginState.swift
│       ├── Chat/
│       │   ├── ChatView.swift
│       │   ├── ChatViewModel.swift
│       │   ├── Components/
│       │   └── ChatState.swift
│       └── Profile/
└── Utils/
```

## 📦 DEPENDENCIES (Package.swift / SPM)

```swift
dependencies: [
    // Networking
    .package(url: "https://github.com/Alamofire/Alamofire", from: "5.8.0"),
    
    // Dependency Injection
    .package(url: "https://github.com/hmlongco/Factory", from: "2.3.0"),
    
    // Combine Extensions
    .package(url: "https://github.com/CombineCommunity/CombineExt", from: "1.8.0")
]
```

## 🎯 CORE IMPLEMENTATIONS

### **1. Data Layer - API Client**

```swift
// Data/Network/APIClient.swift
protocol APIClient {
    func request<T: Decodable>(_ endpoint: Endpoint) async throws -> T
}

final class APIClientImpl: APIClient {
    private let baseURL = "http://your-backend:5001/api/v1"
    
    func request<T: Decodable>(_ endpoint: Endpoint) async throws -> T {
        guard let url = URL(string: baseURL + endpoint.path) else {
            throw APIError.invalidURL
        }
        
        var request = URLRequest(url: url)
        request.httpMethod = endpoint.method
        request.allHTTPHeaderFields = endpoint.headers
        request.httpBody = endpoint.body
        
        let (data, response) = try await URLSession.shared.data(for: request)
        
        guard let httpResponse = response as? HTTPURLResponse,
              (200...299).contains(httpResponse.statusCode) else {
            throw APIError.invalidResponse
        }
        
        return try JSONDecoder().decode(T.self, from: data)
    }
}

// Data/Network/Endpoints.swift
enum Endpoint {
    case login(email: String, password: String)
    case sendMessage(conversationId: String?, message: String)
    case getConversations
    
    var path: String {
        switch self {
        case .login: return "/auth/login"
        case .sendMessage: return "/chat/completions"
        case .getConversations: return "/conversations"
        }
    }
    
    var method: String {
        switch self {
        case .login, .sendMessage: return "POST"
        case .getConversations: return "GET"
        }
    }
}
```

### **2. Domain Layer - UseCase**

```swift
// Domain/UseCases/SendMessageUseCase.swift
protocol SendMessageUseCase {
    func execute(conversationId: String?, message: String) async throws -> ChatMessage
}

final class SendMessageUseCaseImpl: SendMessageUseCase {
    private let repository: ChatRepository
    
    init(repository: ChatRepository) {
        self.repository = repository
    }
    
    func execute(conversationId: String?, message: String) async throws -> ChatMessage {
        return try await repository.sendMessage(conversationId: conversationId, message: message)
    }
}
```

### **3. Presentation Layer - ViewModel**

```swift
// Presentation/Features/Chat/ChatViewModel.swift
@MainActor
final class ChatViewModel: ObservableObject {
    @Published private(set) var state = ChatState()
    
    private let sendMessageUseCase: SendMessageUseCase
    private let getConversationsUseCase: GetConversationsUseCase
    
    init(
        sendMessageUseCase: SendMessageUseCase,
        getConversationsUseCase: GetConversationsUseCase
    ) {
        self.sendMessageUseCase = sendMessageUseCase
        self.getConversationsUseCase = getConversationsUseCase
    }
    
    func handle(_ event: ChatEvent) {
        switch event {
        case .sendMessage(let message):
            Task { await sendMessage(message) }
        case .loadConversation(let id):
            Task { await loadConversation(id) }
        }
    }
    
    private func sendMessage(_ message: String) async {
        state.isLoading = true
        
        do {
            let response = try await sendMessageUseCase.execute(
                conversationId: state.conversationId,
                message: message
            )
            state.messages.append(response)
            state.isLoading = false
        } catch {
            state.error = error.localizedDescription
            state.isLoading = false
        }
    }
}

struct ChatState {
    var conversationId: String?
    var messages: [ChatMessage] = []
    var isLoading = false
    var error: String?
}

enum ChatEvent {
    case sendMessage(String)
    case loadConversation(String)
}
```

### **4. UI Layer - SwiftUI View**

```swift
// Presentation/Features/Chat/ChatView.swift
struct ChatView: View {
    @StateObject private var viewModel: ChatViewModel
    @State private var messageText = ""
    
    var body: some View {
        VStack {
            // Messages List
            ScrollView {
                LazyVStack {
                    ForEach(viewModel.state.messages) { message in
                        MessageBubble(message: message)
                    }
                }
            }
            
            // Input Field
            HStack {
                TextField("Type a message", text: $messageText)
                    .textFieldStyle(.roundedBorder)
                
                Button(action: sendMessage) {
                    Image(systemName: "paperplane.fill")
                }
                .disabled(messageText.isEmpty || viewModel.state.isLoading)
            }
            .padding()
        }
    }
    
    private func sendMessage() {
        viewModel.handle(.sendMessage(messageText))
        messageText = ""
    }
}
```

### **5. Dependency Injection - Factory**

```swift
// App/DependencyContainer.swift
import Factory

extension Container {
    // Data Layer
    var apiClient: Factory<APIClient> {
        Factory(self) { APIClientImpl() }
            .singleton
    }
    
    var chatRepository: Factory<ChatRepository> {
        Factory(self) { ChatRepositoryImpl(apiClient: self.apiClient()) }
    }
    
    // Domain Layer
    var sendMessageUseCase: Factory<SendMessageUseCase> {
        Factory(self) { SendMessageUseCaseImpl(repository: self.chatRepository()) }
    }
    
    // Presentation Layer
    var chatViewModel: Factory<ChatViewModel> {
        Factory(self) { 
            ChatViewModel(
                sendMessageUseCase: self.sendMessageUseCase(),
                getConversationsUseCase: self.getConversationsUseCase()
            )
        }
    }
}
```

## 🔐 BEST PRACTICES

1. **Protocol-Oriented** - Protocols for abstraction
2. **Dependency Injection** - Factory pattern
3. **Async/Await** - Modern concurrency
4. **Combine** - Reactive programming where needed
5. **SwiftUI** - Declarative UI
6. **MVVM Pattern** - Clear separation
7. **Error Handling** - Proper Result types
8. **Offline-First** - CoreData caching
9. **Keychain** - Secure token storage
10. **Type Safety** - Strong typing everywhere

## ✅ DELIVERABLES

- Clean Architecture (Data, Domain, Presentation)
- MVVM with @Published properties
- SwiftUI declarative UI
- Factory dependency injection
- URLSession/Alamofire networking
- CoreData for persistence
- Async/await for concurrency
- Human Interface Guidelines
- Type-safe navigation
- Production-ready code