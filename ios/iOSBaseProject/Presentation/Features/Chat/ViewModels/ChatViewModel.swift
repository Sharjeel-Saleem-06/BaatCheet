//
//  ChatViewModel.swift
//  BaatCheet
//
//  ViewModel for Chat - MVVM Pattern
//

import Foundation
import Combine

/// Chat UI State
struct ChatState: Equatable {
    var messages: [ChatMessage] = []
    var isLoading: Bool = false
    var currentConversationId: String? = nil
    var error: String? = nil
}

/// Chat ViewModel
@MainActor
final class ChatViewModel: ObservableObject {
    
    // MARK: - Published State
    @Published private(set) var messages: [ChatMessage] = []
    @Published private(set) var isLoading: Bool = false
    @Published private(set) var currentConversationId: String? = nil
    @Published var error: String? = nil
    
    // MARK: - Private Properties
    private var cancellables = Set<AnyCancellable>()
    
    // MARK: - Initialization
    init() {
        // Initialize with empty state
    }
    
    // MARK: - Public Methods
    
    func sendMessage(_ content: String) {
        guard !content.trimmingCharacters(in: .whitespacesAndNewlines).isEmpty else { return }
        
        // Add user message
        let userMessage = ChatMessage(
            content: content,
            role: .user
        )
        messages.append(userMessage)
        
        // Simulate AI response
        isLoading = true
        
        // Add streaming placeholder
        let assistantMessage = ChatMessage(
            content: "",
            role: .assistant,
            isStreaming: true
        )
        messages.append(assistantMessage)
        
        // Simulate API call with delay
        Task {
            try? await Task.sleep(nanoseconds: 1_500_000_000) // 1.5 seconds
            
            // Replace streaming message with actual response
            if let lastIndex = messages.indices.last, messages[lastIndex].role == .assistant {
                let response = generateMockResponse(for: content)
                messages[lastIndex] = ChatMessage(
                    id: messages[lastIndex].id,
                    content: response,
                    role: .assistant,
                    isStreaming: false
                )
            }
            
            isLoading = false
        }
    }
    
    func startNewChat() {
        messages.removeAll()
        currentConversationId = UUID().uuidString
        error = nil
    }
    
    func loadConversation(id: String) {
        currentConversationId = id
        // TODO: Load messages from repository
    }
    
    // MARK: - Private Methods
    
    private func generateMockResponse(for input: String) -> String {
        let responses = [
            "That's an interesting question! Let me help you with that. Based on my understanding, I can provide some insights that might be useful for your query.",
            "I'd be happy to assist you with that. Here's what I think could be helpful in this situation.",
            "Great question! There are several ways to approach this. Let me share some thoughts that might help you.",
            "Thanks for asking! I can certainly help you explore this topic further. Here are some key points to consider.",
            "I understand what you're looking for. Let me provide a thoughtful response that addresses your needs."
        ]
        return responses.randomElement() ?? "I'm here to help! How can I assist you further?"
    }
}
