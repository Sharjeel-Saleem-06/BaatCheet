//
//  ChatMessage.swift
//  BaatCheet
//
//  Domain model for Chat Messages
//

import Foundation

/// Represents a chat message in a conversation
struct ChatMessage: Identifiable, Equatable {
    let id: String
    let content: String
    let role: MessageRole
    let timestamp: Date
    let isStreaming: Bool
    
    init(
        id: String = UUID().uuidString,
        content: String,
        role: MessageRole,
        timestamp: Date = Date(),
        isStreaming: Bool = false
    ) {
        self.id = id
        self.content = content
        self.role = role
        self.timestamp = timestamp
        self.isStreaming = isStreaming
    }
}

/// Message sender role
enum MessageRole: String, Codable {
    case user
    case assistant
    case system
}

/// Represents a conversation
struct Conversation: Identifiable, Equatable {
    let id: String
    var title: String
    var messages: [ChatMessage]
    let createdAt: Date
    var updatedAt: Date
    
    init(
        id: String = UUID().uuidString,
        title: String = "New Chat",
        messages: [ChatMessage] = [],
        createdAt: Date = Date(),
        updatedAt: Date = Date()
    ) {
        self.id = id
        self.title = title
        self.messages = messages
        self.createdAt = createdAt
        self.updatedAt = updatedAt
    }
}
