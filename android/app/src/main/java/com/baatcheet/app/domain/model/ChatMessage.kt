package com.baatcheet.app.domain.model

import java.util.UUID

/**
 * Domain model for Chat Messages
 */
data class ChatMessage(
    val id: String = UUID.randomUUID().toString(),
    val content: String,
    val role: MessageRole,
    val timestamp: Long = System.currentTimeMillis(),
    val isStreaming: Boolean = false,
    val conversationId: String? = null
)

/**
 * Message sender role
 */
enum class MessageRole {
    USER,
    ASSISTANT,
    SYSTEM
}

/**
 * Represents a conversation
 */
data class Conversation(
    val id: String = UUID.randomUUID().toString(),
    val title: String = "New Chat",
    val messageCount: Int = 0,
    val isPinned: Boolean = false,
    val isArchived: Boolean = false,
    val projectId: String? = null,
    val createdAt: String? = null,
    val updatedAt: String? = null
)

/**
 * Represents a project
 */
data class Project(
    val id: String = UUID.randomUUID().toString(),
    val name: String,
    val description: String? = null,
    val color: String? = null,
    val icon: String? = null,
    val conversationCount: Int = 0
)

/**
 * User profile information
 */
data class UserProfile(
    val id: String,
    val email: String,
    val firstName: String? = null,
    val lastName: String? = null,
    val avatar: String? = null
) {
    val displayName: String
        get() = when {
            firstName != null && lastName != null -> "$firstName $lastName"
            firstName != null -> firstName
            else -> email.substringBefore("@")
        }
    
    val initials: String
        get() = when {
            firstName != null && lastName != null -> "${firstName.first()}${lastName.first()}"
            firstName != null -> firstName.take(2)
            else -> email.take(2)
        }.uppercase()
}
