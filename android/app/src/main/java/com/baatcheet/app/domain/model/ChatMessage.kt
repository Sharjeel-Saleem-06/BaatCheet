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
    val conversationId: String? = null,
    val attachments: List<MessageAttachment> = emptyList(),
    val imageResult: ImageResult? = null  // For image generation responses
)

/**
 * Image result for generated images
 */
data class ImageResult(
    val success: Boolean,
    val imageUrl: String?,
    val imageBase64: String?,
    val model: String?,
    val originalPrompt: String?,
    val enhancedPrompt: String?,
    val seed: Long?,
    val generationTime: Long?,
    val style: String?,
    val error: String?
)

/**
 * Attachment in a message (image, document, etc.)
 */
data class MessageAttachment(
    val id: String,
    val filename: String,
    val mimeType: String,
    val url: String? = null,
    val thumbnailUri: String? = null, // Local URI for thumbnail preview
    val status: String = "ready"
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
    val conversationCount: Int = 0,
    // Collaboration fields
    val myRole: String? = null, // "owner", "editor", "viewer" - null means user is owner
    val owner: UserSummary? = null // Only set for collaborations
)

/**
 * User summary for displaying collaborators
 */
data class UserSummary(
    val id: String,
    val username: String? = null,
    val firstName: String? = null,
    val lastName: String? = null,
    val email: String? = null
) {
    val displayName: String
        get() = when {
            firstName != null && lastName != null -> "$firstName $lastName"
            firstName != null -> firstName
            username != null -> username
            email != null -> email.substringBefore("@")
            else -> "Unknown"
        }
    
    val initials: String
        get() = when {
            firstName != null && lastName != null -> "${firstName.first()}${lastName.first()}"
            firstName != null -> firstName.take(2)
            username != null -> username.take(2)
            else -> "??"
        }.uppercase()
}

/**
 * Represents a pending invitation to collaborate on a project
 */
data class PendingInvitation(
    val id: String,
    val projectId: String,
    val projectName: String,
    val projectDescription: String? = null,
    val role: String, // "editor" or "viewer"
    val inviterName: String,
    val inviterEmail: String? = null,
    val message: String? = null,
    val expiresAt: String? = null,
    val createdAt: String? = null
)

/**
 * Represents a collaborator on a project
 */
data class Collaborator(
    val id: String,
    val userId: String,
    val role: String, // "owner", "editor", "viewer"
    val user: UserSummary,
    val addedAt: String? = null
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
