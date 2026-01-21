package com.baatcheet.app.data.repository

import com.baatcheet.app.data.remote.api.BaatCheetApi
import com.baatcheet.app.data.remote.dto.*
import com.baatcheet.app.domain.model.ChatMessage
import com.baatcheet.app.domain.model.Collaborator
import com.baatcheet.app.domain.model.Conversation
import com.baatcheet.app.domain.model.ImageResult
import com.baatcheet.app.domain.model.MessageRole
import com.baatcheet.app.domain.model.PendingInvitation
import com.baatcheet.app.domain.model.Project
import com.baatcheet.app.domain.model.PromptAnalysisResult
import com.baatcheet.app.domain.model.AIMode
import com.baatcheet.app.domain.model.UsageInfo
import com.baatcheet.app.domain.model.UserSummary
import okhttp3.MultipartBody
import okhttp3.RequestBody
import okhttp3.RequestBody.Companion.toRequestBody
import okhttp3.MediaType.Companion.toMediaTypeOrNull
import javax.inject.Inject
import javax.inject.Singleton

/**
 * Result wrapper for API operations
 */
sealed class ApiResult<out T> {
    data class Success<T>(val data: T) : ApiResult<T>()
    data class Error(val message: String, val code: Int? = null) : ApiResult<Nothing>()
    object Loading : ApiResult<Nothing>()
}

/**
 * Chat Repository - Handles all chat, conversation, and project operations
 */
@Singleton
class ChatRepository @Inject constructor(
    private val api: BaatCheetApi
) {
    
    // ============================================
    // Auth / User Operations
    // ============================================
    
    /**
     * Get current user profile from server
     * Syncs avatar and other profile data with the backend
     */
    suspend fun getCurrentUser(): ApiResult<CurrentUserData> {
        return try {
            val response = api.getCurrentUser()
            if (response.isSuccessful && response.body()?.success == true) {
                val userData = response.body()?.data
                if (userData != null) {
                    ApiResult.Success(userData)
                } else {
                    ApiResult.Error("No user data returned")
                }
            } else {
                ApiResult.Error(response.body()?.error ?: "Failed to get user", response.code())
            }
        } catch (e: Exception) {
            ApiResult.Error(e.message ?: "Network error")
        }
    }
    
    // ============================================
    // Chat Operations
    // ============================================
    
    /**
     * Send a message and get AI response
     * @param mode Explicit mode selection: "image-generation", "code", "web-search", "research", etc.
     * @param imageIds List of attachment IDs (documents/images) for context
     * @param projectId Project ID to associate conversation with and use project context
     */
    suspend fun sendMessage(
        message: String,
        conversationId: String? = null,
        model: String? = null,
        mode: String? = null,
        imageIds: List<String>? = null,
        projectId: String? = null
    ): ApiResult<ChatMessage> {
        return try {
            val request = ChatRequest(
                message = message,
                conversationId = conversationId,
                model = model,
                stream = false,
                mode = mode,
                imageIds = imageIds,
                projectId = projectId
            )
            
            val response = api.sendMessage(request)
            
            if (response.isSuccessful && response.body()?.success == true) {
                val data = response.body()?.data
                if (data != null && data.message?.content != null) {
                    // Convert image result if present (for image generation mode)
                    val imageResult = data.imageResult?.let { img ->
                        ImageResult(
                            success = img.success ?: false,
                            imageUrl = img.imageUrl,
                            imageBase64 = img.imageBase64,
                            model = img.model,
                            originalPrompt = img.originalPrompt,
                            enhancedPrompt = img.enhancedPrompt,
                            seed = img.seed,
                            generationTime = img.generationTime,
                            style = img.style,
                            error = img.error
                        )
                    }
                    
                    ApiResult.Success(
                        ChatMessage(
                            id = System.currentTimeMillis().toString(),
                            content = data.message.content,
                            role = MessageRole.ASSISTANT,
                            conversationId = data.conversationId,
                            imageResult = imageResult
                        )
                    )
                } else {
                    ApiResult.Error("No response data")
                }
            } else {
                ApiResult.Error(response.body()?.error ?: "Failed to send message", response.code())
            }
        } catch (e: Exception) {
            ApiResult.Error(e.message ?: "Network error")
        }
    }
    
    /**
     * Send voice message with optimized settings for voice chat
     * - Shorter maxTokens for concise responses (saves tokens & TTS costs)
     * - Voice-optimized system prompt for natural conversation
     * - isVoiceChat=true tells AI to respond in Urdu script (not Roman Urdu) for better TTS pronunciation
     */
    suspend fun sendVoiceMessage(
        message: String,
        conversationId: String? = null,
        maxTokens: Int = 150 // Voice responses should be short & conversational
    ): ApiResult<ChatMessage> {
        return try {
            val request = ChatRequest(
                message = message,
                conversationId = conversationId,
                model = null, // Use default model
                stream = false,
                maxTokens = maxTokens,
                // Don't override systemPrompt - let backend use the enhanced Urdu voice prompt
                // The backend will automatically use VOICE_CHAT_URDU_ENHANCEMENT when isVoiceChat=true
                // This makes AI respond in real Urdu script (اردو) for proper TTS pronunciation
                systemPrompt = null,
                isVoiceChat = true // CRITICAL: AI will respond in Urdu script (not Roman Urdu) for proper TTS
            )
            
            val response = api.sendMessage(request)
            
            if (response.isSuccessful && response.body()?.success == true) {
                val data = response.body()?.data
                if (data != null && data.message?.content != null) {
                    ApiResult.Success(
                        ChatMessage(
                            id = System.currentTimeMillis().toString(),
                            content = data.message.content,
                            role = MessageRole.ASSISTANT,
                            conversationId = data.conversationId
                        )
                    )
                } else {
                    ApiResult.Error("No response data")
                }
            } else {
                ApiResult.Error(response.body()?.error ?: "Failed to send message", response.code())
            }
        } catch (e: Exception) {
            ApiResult.Error(e.message ?: "Network error")
        }
    }
    
    /**
     * Regenerate last AI response
     */
    suspend fun regenerateResponse(conversationId: String): ApiResult<ChatMessage> {
        return try {
            val request = RegenerateRequest(conversationId = conversationId)
            val response = api.regenerateResponse(request)
            
            if (response.isSuccessful && response.body()?.success == true) {
                val data = response.body()?.data
                if (data != null && data.message?.content != null) {
                    ApiResult.Success(
                        ChatMessage(
                            id = System.currentTimeMillis().toString(),
                            content = data.message.content,
                            role = MessageRole.ASSISTANT,
                            conversationId = data.conversationId
                        )
                    )
                } else {
                    ApiResult.Error("No response data")
                }
            } else {
                ApiResult.Error(response.body()?.error ?: "Failed to regenerate", response.code())
            }
        } catch (e: Exception) {
            ApiResult.Error(e.message ?: "Network error")
        }
    }
    
    // ============================================
    // Feedback & Learning
    // ============================================
    
    /**
     * Submit feedback for a message (like/dislike)
     * Used for auto-learning to improve AI responses
     */
    suspend fun submitFeedback(
        conversationId: String,
        messageId: String,
        isPositive: Boolean
    ): ApiResult<Boolean> {
        return try {
            val request = FeedbackRequest(
                conversationId = conversationId,
                messageId = messageId,
                isPositive = isPositive,
                feedbackType = if (isPositive) "like" else "dislike"
            )
            val response = api.submitFeedback(request)
            
            if (response.isSuccessful && response.body()?.success == true) {
                ApiResult.Success(true)
            } else {
                ApiResult.Error(response.body()?.error ?: "Failed to submit feedback", response.code())
            }
        } catch (e: Exception) {
            ApiResult.Error(e.message ?: "Network error")
        }
    }
    
    // ============================================
    // Conversation Operations
    // ============================================
    
    /**
     * Get all conversations
     */
    suspend fun getConversations(
        limit: Int = 50,
        offset: Int = 0,
        projectId: String? = null
    ): ApiResult<List<Conversation>> {
        return try {
            val response = api.getConversations(limit, offset, projectId)
            
            if (response.isSuccessful && response.body()?.success == true) {
                val items = response.body()?.data?.items?.map { it.toConversation() } ?: emptyList()
                ApiResult.Success(items)
            } else {
                ApiResult.Error("Failed to load conversations", response.code())
            }
        } catch (e: Exception) {
            ApiResult.Error(e.message ?: "Network error")
        }
    }
    
    /**
     * Search conversations
     */
    suspend fun searchConversations(query: String): ApiResult<List<Conversation>> {
        return try {
            val response = api.searchConversations(query)
            
            if (response.isSuccessful && response.body()?.success == true) {
                val items = response.body()?.data?.map { it.toConversation() } ?: emptyList()
                ApiResult.Success(items)
            } else {
                ApiResult.Error("Search failed", response.code())
            }
        } catch (e: Exception) {
            ApiResult.Error(e.message ?: "Network error")
        }
    }
    
    /**
     * Get conversation with messages
     */
    suspend fun getConversation(conversationId: String): ApiResult<ConversationWithMessages> {
        return try {
            val response = api.getConversation(conversationId)
            
            if (response.isSuccessful && response.body()?.success == true) {
                val data = response.body()?.data
                if (data != null) {
                    val messages = data.messages?.map { it.toChatMessage(conversationId) } ?: emptyList()
                    ApiResult.Success(
                        ConversationWithMessages(
                            conversation = data.toConversation(),
                            messages = messages
                        )
                    )
                } else {
                    ApiResult.Error("Conversation not found")
                }
            } else {
                ApiResult.Error("Failed to load conversation", response.code())
            }
        } catch (e: Exception) {
            ApiResult.Error(e.message ?: "Network error")
        }
    }
    
    /**
     * Create a new conversation
     */
    suspend fun createConversation(
        title: String? = null,
        projectId: String? = null
    ): ApiResult<Conversation> {
        return try {
            val request = CreateConversationRequest(
                title = title ?: "New Chat",
                projectId = projectId
            )
            val response = api.createConversation(request)
            
            if (response.isSuccessful && response.body()?.success == true) {
                val data = response.body()?.data
                if (data != null) {
                    ApiResult.Success(data.toConversation())
                } else {
                    ApiResult.Error("Failed to create conversation")
                }
            } else {
                ApiResult.Error("Failed to create conversation", response.code())
            }
        } catch (e: Exception) {
            ApiResult.Error(e.message ?: "Network error")
        }
    }
    
    /**
     * Update a conversation
     */
    suspend fun updateConversation(
        conversationId: String,
        title: String? = null,
        isPinned: Boolean? = null,
        isArchived: Boolean? = null
    ): ApiResult<Conversation> {
        return try {
            val request = UpdateConversationRequest(
                title = title,
                isPinned = isPinned,
                isArchived = isArchived
            )
            val response = api.updateConversation(conversationId, request)
            
            if (response.isSuccessful && response.body()?.success == true) {
                val data = response.body()?.data
                if (data != null) {
                    ApiResult.Success(data.toConversation())
                } else {
                    ApiResult.Error("Failed to update conversation")
                }
            } else {
                ApiResult.Error("Failed to update conversation", response.code())
            }
        } catch (e: Exception) {
            ApiResult.Error(e.message ?: "Network error")
        }
    }
    
    /**
     * Delete a conversation
     */
    suspend fun deleteConversation(conversationId: String): ApiResult<Boolean> {
        return try {
            val response = api.deleteConversation(conversationId)
            
            if (response.isSuccessful && response.body()?.success == true) {
                ApiResult.Success(true)
            } else {
                ApiResult.Error("Failed to delete conversation", response.code())
            }
        } catch (e: Exception) {
            ApiResult.Error(e.message ?: "Network error")
        }
    }
    
    /**
     * Save custom instructions for personalized AI responses
     */
    suspend fun saveCustomInstructions(instructions: String): ApiResult<Boolean> {
        return try {
            val request = UpdateProfileRequest(customInstructions = instructions)
            val response = api.updateProfileSettings(request)
            
            if (response.isSuccessful && response.body()?.success == true) {
                ApiResult.Success(true)
            } else {
                ApiResult.Error("Failed to save custom instructions", response.code())
            }
        } catch (e: Exception) {
            ApiResult.Error(e.message ?: "Network error")
        }
    }
    
    /**
     * Update user's display name
     */
    suspend fun updateDisplayName(newName: String): ApiResult<Boolean> {
        return try {
            val request = UpdateProfileRequest(displayName = newName)
            val response = api.updateProfileSettings(request)
            
            if (response.isSuccessful && response.body()?.success == true) {
                ApiResult.Success(true)
            } else {
                ApiResult.Error("Failed to update display name", response.code())
            }
        } catch (e: Exception) {
            ApiResult.Error(e.message ?: "Network error")
        }
    }
    
    /**
     * Delete user account
     */
    suspend fun deleteAccount(): ApiResult<Boolean> {
        return try {
            val response = api.deleteAccount()
            
            if (response.isSuccessful && response.body()?.success == true) {
                ApiResult.Success(true)
            } else {
                val errorBody = response.errorBody()?.string()
                ApiResult.Error(errorBody ?: "Failed to delete account", response.code())
            }
        } catch (e: Exception) {
            ApiResult.Error(e.message ?: "Network error")
        }
    }
    
    /**
     * Upload profile avatar
     */
    suspend fun uploadAvatar(imageUri: android.net.Uri, context: android.content.Context): ApiResult<String> {
        return try {
            val contentResolver = context.contentResolver
            val inputStream = contentResolver.openInputStream(imageUri)
                ?: return ApiResult.Error("Cannot read image file")
            
            val mimeType = contentResolver.getType(imageUri) ?: "image/jpeg"
            val extension = when {
                mimeType.contains("png") -> "png"
                mimeType.contains("gif") -> "gif"
                else -> "jpg"
            }
            val fileName = "avatar_${System.currentTimeMillis()}.$extension"
            
            val bytes = inputStream.readBytes()
            inputStream.close()
            
            val mediaType = mimeType.toMediaTypeOrNull()
            val requestBody = bytes.toRequestBody(mediaType)
            val part = okhttp3.MultipartBody.Part.createFormData("avatar", fileName, requestBody)
            
            val response = api.uploadAvatar(part)
            
            if (response.isSuccessful && response.body()?.success == true) {
                val avatarUrl = response.body()?.data?.avatarUrl
                if (avatarUrl != null) {
                    ApiResult.Success(avatarUrl)
                } else {
                    ApiResult.Error("No avatar URL returned")
                }
            } else {
                ApiResult.Error(response.body()?.error ?: "Failed to upload avatar", response.code())
            }
        } catch (e: Exception) {
            ApiResult.Error(e.message ?: "Network error")
        }
    }
    
    // ============================================
    // Project Operations
    // ============================================
    
    /**
     * Get all projects
     */
    suspend fun getProjects(): ApiResult<List<Project>> {
        return try {
            val response = api.getProjects()
            
            if (response.isSuccessful && response.body()?.success == true) {
                val items = response.body()?.data?.map { it.toProject() } ?: emptyList()
                ApiResult.Success(items)
            } else {
                ApiResult.Error("Failed to load projects", response.code())
            }
        } catch (e: Exception) {
            ApiResult.Error(e.message ?: "Network error")
        }
    }
    
    /**
     * Get a single project with full details
     */
    suspend fun getProject(projectId: String): ApiResult<Project> {
        return try {
            val response = api.getProject(projectId)
            
            if (response.isSuccessful && response.body()?.success == true) {
                val data = response.body()?.data
                if (data != null) {
                    ApiResult.Success(data.toProject())
                } else {
                    ApiResult.Error("Project not found")
                }
            } else {
                ApiResult.Error("Failed to load project", response.code())
            }
        } catch (e: Exception) {
            ApiResult.Error(e.message ?: "Network error")
        }
    }
    
    /**
     * Create a new project
     */
    suspend fun createProject(
        name: String,
        description: String? = null,
        color: String? = null
    ): ApiResult<Project> {
        return try {
            val request = CreateProjectRequest(
                name = name,
                description = description,
                color = color
            )
            val response = api.createProject(request)
            
            if (response.isSuccessful && response.body()?.success == true) {
                val data = response.body()?.data
                if (data != null) {
                    ApiResult.Success(data.toProject())
                } else {
                    ApiResult.Error("Failed to create project")
                }
            } else {
                ApiResult.Error("Failed to create project", response.code())
            }
        } catch (e: Exception) {
            ApiResult.Error(e.message ?: "Network error")
        }
    }
    
    /**
     * Update a project
     */
    suspend fun updateProject(
        projectId: String,
        name: String? = null,
        description: String? = null,
        color: String? = null,
        emoji: String? = null,
        instructions: String? = null
    ): ApiResult<Project> {
        return try {
            val request = UpdateProjectRequest(
                name = name,
                description = description,
                color = color,
                emoji = emoji,
                instructions = instructions
            )
            val response = api.updateProject(projectId, request)
            
            if (response.isSuccessful && response.body()?.success == true) {
                val data = response.body()?.data
                if (data != null) {
                    ApiResult.Success(data.toProject())
                } else {
                    ApiResult.Error("Failed to update project")
                }
            } else {
                ApiResult.Error("Failed to update project", response.code())
            }
        } catch (e: Exception) {
            ApiResult.Error(e.message ?: "Network error")
        }
    }
    
    /**
     * Delete a project
     */
    suspend fun deleteProject(projectId: String): ApiResult<Boolean> {
        return try {
            val response = api.deleteProject(projectId)
            
            if (response.isSuccessful && response.body()?.success == true) {
                ApiResult.Success(true)
            } else {
                ApiResult.Error("Failed to delete project", response.code())
            }
        } catch (e: Exception) {
            ApiResult.Error(e.message ?: "Network error")
        }
    }
    
    /**
     * Get project conversations
     */
    suspend fun getProjectConversations(projectId: String): ApiResult<List<Conversation>> {
        return try {
            val response = api.getProjectConversations(projectId)
            
            if (response.isSuccessful && response.body()?.success == true) {
                // Project conversations returns data as direct array, not wrapped in items
                val items = response.body()?.data?.map { it.toConversation() } ?: emptyList()
                ApiResult.Success(items)
            } else {
                ApiResult.Error("Failed to load project conversations", response.code())
            }
        } catch (e: Exception) {
            ApiResult.Error(e.message ?: "Network error")
        }
    }
    
    // ============================================
    // Image Upload Operations
    // ============================================
    
    /**
     * Upload images for chat
     */
    suspend fun uploadImages(images: List<okhttp3.MultipartBody.Part>): ApiResult<List<UploadedImage>> {
        return try {
            val response = api.uploadImages(images)
            
            if (response.isSuccessful && response.body()?.success == true) {
                val uploadedImages = response.body()?.data?.images?.map { it.toUploadedImage() } ?: emptyList()
                ApiResult.Success(uploadedImages)
            } else {
                ApiResult.Error(response.body()?.error ?: "Failed to upload images", response.code())
            }
        } catch (e: Exception) {
            ApiResult.Error(e.message ?: "Network error")
        }
    }
    
    /**
     * Get image processing status
     */
    suspend fun getImageStatus(imageId: String): ApiResult<ImageProcessingStatus> {
        return try {
            val response = api.getImageStatus(imageId)
            
            if (response.isSuccessful && response.body()?.success == true) {
                val data = response.body()?.data
                ApiResult.Success(
                    ImageProcessingStatus(
                        status = data?.status ?: "unknown",
                        extractedText = data?.extractedText,
                        error = data?.error
                    )
                )
            } else {
                ApiResult.Error("Failed to get image status", response.code())
            }
        } catch (e: Exception) {
            ApiResult.Error(e.message ?: "Network error")
        }
    }
    
    /**
     * Analyze image with AI
     */
    suspend fun analyzeImage(image: okhttp3.MultipartBody.Part, prompt: okhttp3.RequestBody?): ApiResult<String> {
        return try {
            val response = api.analyzeImage(image, prompt)
            
            if (response.isSuccessful && response.body()?.success == true) {
                ApiResult.Success(response.body()?.data?.description ?: "")
            } else {
                ApiResult.Error(response.body()?.error ?: "Failed to analyze image", response.code())
            }
        } catch (e: Exception) {
            ApiResult.Error(e.message ?: "Network error")
        }
    }
    
    // ============================================
    // Document Upload Operations
    // ============================================
    
    /**
     * Get upload status (daily limits)
     */
    suspend fun getUploadStatus(): ApiResult<UploadStatus> {
        return try {
            val response = api.getUploadStatus()
            
            if (response.isSuccessful && response.body()?.success == true) {
                val data = response.body()?.data
                if (data != null) {
                    ApiResult.Success(
                        UploadStatus(
                            usedToday = data.getUsedToday(),
                            dailyLimit = data.dailyLimit,
                            remaining = data.remaining,
                            canUpload = data.canUpload,
                            nextAvailableAt = data.nextAvailableAt
                        )
                    )
                } else {
                    // Default values if no data
                    ApiResult.Success(UploadStatus(0, 10, 10, true))
                }
            } else {
                // Return default on error
                ApiResult.Success(UploadStatus(0, 10, 10, true))
            }
        } catch (e: Exception) {
            // Return default on exception
            ApiResult.Success(UploadStatus(0, 10, 10, true))
        }
    }
    
    /**
     * Upload a document file (PDF, TXT, DOC, etc.)
     * Returns the attachment ID and status
     */
    suspend fun uploadDocument(file: okhttp3.MultipartBody.Part): ApiResult<UploadedDocument> {
        return try {
            val response = api.uploadFile(file)
            
            if (response.isSuccessful && response.body()?.success == true) {
                val data = response.body()?.data
                if (data != null) {
                    ApiResult.Success(
                        UploadedDocument(
                            id = data.id,
                            filename = data.originalName ?: data.filename ?: "document",
                            mimeType = data.mimeType ?: "application/octet-stream",
                            size = data.size ?: 0L,
                            status = data.status ?: "processing",
                            extractedText = data.extractedText
                        )
                    )
                } else {
                    ApiResult.Error("No upload data returned")
                }
            } else {
                ApiResult.Error(response.body()?.error ?: "Failed to upload document", response.code())
            }
        } catch (e: Exception) {
            ApiResult.Error(e.message ?: "Network error")
        }
    }
    
    /**
     * Get document processing status
     */
    suspend fun getDocumentStatus(documentId: String): ApiResult<DocumentStatus> {
        return try {
            val response = api.getFileStatus(documentId)
            
            if (response.isSuccessful && response.body()?.success == true) {
                val data = response.body()?.data
                ApiResult.Success(
                    DocumentStatus(
                        status = data?.status ?: "unknown",
                        extractedText = data?.extractedText,
                        error = data?.error
                    )
                )
            } else {
                ApiResult.Error("Failed to get document status", response.code())
            }
        } catch (e: Exception) {
            ApiResult.Error(e.message ?: "Network error")
        }
    }
    
    // ============================================
    // Image Generation Operations
    // ============================================
    
    /**
     * Generate image from prompt
     */
    suspend fun generateImage(
        prompt: String,
        style: String? = null,
        aspectRatio: String? = null,
        model: String? = null,
        enhancePrompt: Boolean = true
    ): ApiResult<GeneratedImage> {
        return try {
            val request = ImageGenerationRequest(
                prompt = prompt,
                style = style,
                aspectRatio = aspectRatio,
                model = model,
                enhancePrompt = enhancePrompt
            )
            val response = api.generateImage(request)
            
            if (response.isSuccessful && response.body()?.success == true) {
                val data = response.body()?.data
                if (data?.imageUrl != null) {
                    ApiResult.Success(data.toGeneratedImage())
                } else {
                    ApiResult.Error("No image generated")
                }
            } else {
                ApiResult.Error(response.body()?.error ?: "Failed to generate image", response.code())
            }
        } catch (e: Exception) {
            ApiResult.Error(e.message ?: "Network error")
        }
    }
    
    /**
     * Get image generation status/limits
     */
    suspend fun getImageGenStatus(): ApiResult<ImageGenStatus> {
        return try {
            val response = api.getImageGenStatus()
            
            if (response.isSuccessful && response.body()?.success == true) {
                val data = response.body()?.data
                ApiResult.Success(
                    ImageGenStatus(
                        canGenerate = data?.canGenerate ?: false,
                        remainingToday = data?.getRemainingToday() ?: 0,
                        dailyLimit = data?.dailyLimit ?: 2,
                        usedToday = data?.usedToday ?: 0,
                        tier = data?.tier ?: "free",
                        nextAvailableAt = data?.nextAvailableAt
                    )
                )
            } else {
                ApiResult.Error("Failed to get status", response.code())
            }
        } catch (e: Exception) {
            ApiResult.Error(e.message ?: "Network error")
        }
    }
    
    /**
     * Get available image generation styles
     */
    suspend fun getImageGenStyles(): ApiResult<List<ImageStyle>> {
        return try {
            val response = api.getImageGenStyles()
            
            if (response.isSuccessful && response.body()?.success == true) {
                val styles = response.body()?.data?.map { 
                    ImageStyle(it.id, it.name, it.description ?: "") 
                } ?: emptyList()
                ApiResult.Success(styles)
            } else {
                ApiResult.Error("Failed to get styles", response.code())
            }
        } catch (e: Exception) {
            ApiResult.Error(e.message ?: "Network error")
        }
    }
    
    // ============================================
    // Web Search Operations
    // ============================================
    
    /**
     * Perform web search
     */
    suspend fun webSearch(query: String, numResults: Int = 5): ApiResult<List<SearchResultItem>> {
        return try {
            val request = WebSearchRequest(query = query, numResults = numResults)
            val response = api.webSearch(request)
            
            if (response.isSuccessful && response.body()?.success == true) {
                val results = response.body()?.data?.results?.map { it.toSearchResultItem() } ?: emptyList()
                ApiResult.Success(results)
            } else {
                ApiResult.Error(response.body()?.error ?: "Search failed", response.code())
            }
        } catch (e: Exception) {
            ApiResult.Error(e.message ?: "Network error")
        }
    }
    
    // ============================================
    // Tags & Modes Operations
    // ============================================
    
    /**
     * Get available chat tags
     */
    suspend fun getTags(): ApiResult<List<Tag>> {
        return try {
            val response = api.getTags()
            
            if (response.isSuccessful && response.body()?.success == true) {
                val tags = response.body()?.data?.map { it.toTag() } ?: emptyList()
                ApiResult.Success(tags)
            } else {
                ApiResult.Error("Failed to get tags", response.code())
            }
        } catch (e: Exception) {
            ApiResult.Error(e.message ?: "Network error")
        }
    }
    
    /**
     * Get available AI modes
     */
    suspend fun getModes(): ApiResult<List<Mode>> {
        return try {
            val response = api.getModes()
            
            if (response.isSuccessful && response.body()?.success == true) {
                val modes = response.body()?.data?.map { it.toMode() } ?: emptyList()
                ApiResult.Success(modes)
            } else {
                ApiResult.Error("Failed to get modes", response.code())
            }
        } catch (e: Exception) {
            ApiResult.Error(e.message ?: "Network error")
        }
    }
    
    /**
     * Detect mode from message
     */
    suspend fun detectMode(message: String): ApiResult<String?> {
        return try {
            val request = DetectModeRequest(message = message)
            val response = api.detectMode(request)
            
            if (response.isSuccessful && response.body()?.success == true) {
                ApiResult.Success(response.body()?.data?.detectedMode)
            } else {
                ApiResult.Error("Failed to detect mode", response.code())
            }
        } catch (e: Exception) {
            ApiResult.Error(e.message ?: "Network error")
        }
    }
    
    /**
     * Analyze a prompt before sending to get AI recommendations
     */
    suspend fun analyzePrompt(message: String): ApiResult<PromptAnalysisResult> {
        return try {
            val request = AnalyzePromptRequest(message = message)
            val response = api.analyzePrompt(request)
            
            if (response.isSuccessful && response.body()?.success == true) {
                val data = response.body()?.data
                ApiResult.Success(
                    PromptAnalysisResult(
                        detectedMode = data?.mode?.detected ?: "chat",
                        modeDisplayName = data?.mode?.config?.displayName ?: "Chat",
                        modeIcon = data?.mode?.config?.icon ?: "💬",
                        modeConfidence = data?.mode?.confidence ?: 0.5,
                        alternatives = data?.mode?.alternatives ?: emptyList(),
                        intent = data?.intent ?: "general_query",
                        format = data?.format ?: "plain",
                        complexity = data?.complexity ?: "simple",
                        language = data?.language ?: "english",
                        suggestedTemperature = data?.suggestedSettings?.temperature ?: 0.7,
                        suggestedMaxTokens = data?.suggestedSettings?.maxTokens ?: 2000,
                        formattingHints = data?.formattingHints ?: "",
                        shouldMakeTable = data?.specialInstructions?.makeTable ?: false,
                        shouldUseCode = data?.specialInstructions?.useCodeBlock ?: false,
                        codeLanguage = data?.specialInstructions?.codeLanguage
                    )
                )
            } else {
                ApiResult.Error("Failed to analyze prompt", response.code())
            }
        } catch (e: Exception) {
            ApiResult.Error(e.message ?: "Network error")
        }
    }
    
    /**
     * Get all available AI modes
     */
    suspend fun getAIModes(): ApiResult<List<AIMode>> {
        return try {
            val response = api.getAIModes()
            
            if (response.isSuccessful && response.body()?.success == true) {
                val modes = response.body()?.data?.modes?.map { dto ->
                    AIMode(
                        id = dto.id,
                        displayName = dto.displayName ?: dto.id,
                        icon = dto.icon ?: "💬",
                        description = dto.description ?: "",
                        capabilities = dto.capabilities ?: emptyList(),
                        requiresSpecialAPI = dto.requiresSpecialAPI ?: false,
                        freeDailyLimit = dto.dailyLimits?.free ?: 50,
                        proDailyLimit = dto.dailyLimits?.pro ?: 500
                    )
                } ?: emptyList()
                ApiResult.Success(modes)
            } else {
                ApiResult.Error("Failed to get AI modes", response.code())
            }
        } catch (e: Exception) {
            ApiResult.Error(e.message ?: "Network error")
        }
    }
    
    /**
     * Get current usage and quotas
     */
    suspend fun getUsage(): ApiResult<UsageInfo> {
        return try {
            val response = api.getUsage()
            
            if (response.isSuccessful && response.body()?.success == true) {
                val data = response.body()?.data
                ApiResult.Success(
                    UsageInfo(
                        tier = data?.tier ?: "free",
                        messagesUsed = data?.usage?.messages?.used ?: 0,
                        messagesLimit = data?.usage?.messages?.limit ?: 50,
                        messagesRemaining = data?.usage?.messages?.remaining ?: 50,
                        messagesPercentage = data?.usage?.messages?.percentage ?: 0,
                        imagesUsed = data?.usage?.images?.used ?: 0,
                        imagesLimit = data?.usage?.images?.limit ?: 1,
                        imagesRemaining = data?.usage?.images?.remaining ?: 1,
                        imagesPercentage = data?.usage?.images?.percentage ?: 0,
                        resetAt = data?.resetAt ?: ""
                    )
                )
            } else {
                ApiResult.Error("Failed to get usage", response.code())
            }
        } catch (e: Exception) {
            ApiResult.Error(e.message ?: "Network error")
        }
    }
    
    /**
     * Get follow-up question suggestions
     */
    suspend fun getSuggestions(conversationId: String? = null, lastResponse: String? = null): ApiResult<List<String>> {
        return try {
            val request = SuggestionsRequest(
                conversationId = conversationId,
                lastResponse = lastResponse
            )
            val response = api.getSuggestions(request)
            
            if (response.isSuccessful && response.body()?.success == true) {
                ApiResult.Success(response.body()?.data?.suggestions ?: emptyList())
            } else {
                ApiResult.Error("Failed to get suggestions", response.code())
            }
        } catch (e: Exception) {
            ApiResult.Error(e.message ?: "Network error")
        }
    }
    
    // ============================================
    // Memory/Facts Operations
    // ============================================
    
    /**
     * Get learned facts about user
     */
    suspend fun getLearnedFacts(): ApiResult<List<Fact>> {
        return try {
            val response = api.getLearnedFacts()
            
            if (response.isSuccessful && response.body()?.success == true) {
                val facts = response.body()?.data?.facts?.map { it.toFact() } ?: emptyList()
                ApiResult.Success(facts)
            } else {
                ApiResult.Error("Failed to get facts", response.code())
            }
        } catch (e: Exception) {
            ApiResult.Error(e.message ?: "Network error")
        }
    }
    
    /**
     * Teach the AI a fact
     */
    suspend fun teachFact(fact: String): ApiResult<Fact?> {
        return try {
            val request = TeachFactRequest(fact = fact)
            val response = api.teachFact(request)
            
            if (response.isSuccessful && response.body()?.success == true) {
                ApiResult.Success(response.body()?.data?.toFact())
            } else {
                ApiResult.Error("Failed to teach fact", response.code())
            }
        } catch (e: Exception) {
            ApiResult.Error(e.message ?: "Network error")
        }
    }
    
    /**
     * Delete a learned fact
     */
    suspend fun deleteFact(factId: String): ApiResult<Boolean> {
        return try {
            val response = api.deleteFact(factId)
            
            if (response.isSuccessful && response.body()?.success == true) {
                ApiResult.Success(true)
            } else {
                ApiResult.Error("Failed to delete fact", response.code())
            }
        } catch (e: Exception) {
            ApiResult.Error(e.message ?: "Network error")
        }
    }
    
    /**
     * Get profile summary
     */
    suspend fun getProfileSummary(): ApiResult<ProfileSummary> {
        return try {
            val response = api.getProfileSummary()
            
            if (response.isSuccessful && response.body()?.success == true) {
                val data = response.body()?.data
                ApiResult.Success(
                    ProfileSummary(
                        summary = data?.summary ?: "",
                        factCount = data?.factCount ?: 0,
                        topInterests = data?.topInterests ?: emptyList(),
                        skills = data?.skills ?: emptyList()
                    )
                )
            } else {
                ApiResult.Error("Failed to get profile summary", response.code())
            }
        } catch (e: Exception) {
            ApiResult.Error(e.message ?: "Network error")
        }
    }
    
    // ============================================
    // Templates Operations
    // ============================================
    
    /**
     * Get templates list
     */
    suspend fun getTemplates(category: String? = null): ApiResult<List<Template>> {
        return try {
            val response = api.getTemplates(category)
            
            if (response.isSuccessful && response.body()?.success == true) {
                val templates = response.body()?.data?.map { it.toTemplate() } ?: emptyList()
                ApiResult.Success(templates)
            } else {
                ApiResult.Error("Failed to get templates", response.code())
            }
        } catch (e: Exception) {
            ApiResult.Error(e.message ?: "Network error")
        }
    }
    
    /**
     * Use a template to create conversation
     */
    suspend fun useTemplate(templateId: String, title: String? = null): ApiResult<Conversation?> {
        return try {
            val request = UseTemplateRequest(title = title)
            val response = api.useTemplate(templateId, request)
            
            if (response.isSuccessful && response.body()?.success == true) {
                ApiResult.Success(response.body()?.data?.toConversation())
            } else {
                ApiResult.Error("Failed to use template", response.code())
            }
        } catch (e: Exception) {
            ApiResult.Error(e.message ?: "Network error")
        }
    }
    
    // ============================================
    // Export/Share Operations
    // ============================================
    
    /**
     * Create share link for conversation
     */
    suspend fun createShareLink(conversationId: String, expiresInDays: Int? = null): ApiResult<ShareLink> {
        return try {
            val request = CreateShareRequest(
                conversationId = conversationId,
                expiresInDays = expiresInDays
            )
            val response = api.createShareLink(request)
            
            if (response.isSuccessful && response.body()?.success == true) {
                val data = response.body()?.data
                val shareUrl = data?.shareLink ?: "https://baatcheet.app/share/${data?.shareId}"
                if (data?.shareId != null) {
                    ApiResult.Success(
                        ShareLink(
                            shareId = data.shareId,
                            url = shareUrl,
                            expiresAt = data.expiresAt,
                            viewCount = data.accessCount ?: 0
                        )
                    )
                } else {
                    ApiResult.Error("Failed to create share link")
                }
            } else {
                ApiResult.Error("Failed to create share link", response.code())
            }
        } catch (e: Exception) {
            ApiResult.Error(e.message ?: "Network error")
        }
    }
    
    /**
     * Get shared conversation (public access)
     */
    suspend fun getSharedConversation(shareId: String): ApiResult<SharedConversation> {
        return try {
            val response = api.getSharedConversation(shareId)
            
            if (response.isSuccessful && response.body()?.success == true) {
                val data = response.body()?.data
                if (data != null) {
                    ApiResult.Success(
                        SharedConversation(
                            title = data.title ?: "Shared Chat",
                            messages = data.messages ?: emptyList(),
                            sharedBy = data.sharedBy ?: "Anonymous",
                            sharedByAvatar = data.sharedByAvatar,
                            createdAt = data.createdAt,
                            messageCount = data.messageCount ?: 0,
                            originalConversationId = data.originalConversationId
                        )
                    )
                } else {
                    ApiResult.Error("Shared conversation not found")
                }
            } else {
                val error = response.body()?.error ?: "Failed to get shared conversation"
                ApiResult.Error(error, response.code())
            }
        } catch (e: Exception) {
            ApiResult.Error(e.message ?: "Network error")
        }
    }
    
    /**
     * Revoke share link
     */
    suspend fun revokeShareLink(shareId: String): ApiResult<Boolean> {
        return try {
            val response = api.revokeShareLink(shareId)
            
            if (response.isSuccessful && response.body()?.success == true) {
                ApiResult.Success(true)
            } else {
                ApiResult.Error("Failed to revoke share link", response.code())
            }
        } catch (e: Exception) {
            ApiResult.Error(e.message ?: "Network error")
        }
    }
    
    // ============================================
    // Collaboration Operations
    // ============================================
    
    /**
     * Get projects where user is a collaborator
     */
    suspend fun getCollaborations(): ApiResult<List<Project>> {
        return try {
            val response = api.getCollaborations()
            
            if (response.isSuccessful && response.body()?.success == true) {
                val projects = response.body()?.data?.map { dto ->
                    Project(
                        id = dto.id,
                        name = dto.name,
                        description = dto.description,
                        conversationCount = dto.conversationCount ?: 0,
                        myRole = dto.myRole,
                        owner = dto.owner?.let { owner ->
                            UserSummary(
                                id = owner.id,
                                username = owner.username,
                                firstName = owner.firstName,
                                lastName = owner.lastName,
                                email = owner.email
                            )
                        }
                    )
                } ?: emptyList()
                ApiResult.Success(projects)
            } else {
                ApiResult.Error("Failed to load collaborations", response.code())
            }
        } catch (e: Exception) {
            ApiResult.Error(e.message ?: "Network error")
        }
    }
    
    /**
     * Get pending invitations count
     */
    suspend fun getPendingInvitationsCount(): ApiResult<Int> {
        return try {
            val response = api.getPendingInvitations()
            
            if (response.isSuccessful && response.body()?.success == true) {
                val count = response.body()?.data?.size ?: 0
                ApiResult.Success(count)
            } else {
                ApiResult.Success(0)
            }
        } catch (e: Exception) {
            ApiResult.Success(0)
        }
    }
    
    /**
     * Get pending invitations list
     */
    suspend fun getPendingInvitations(): ApiResult<List<PendingInvitation>> {
        return try {
            val response = api.getPendingInvitations()
            
            if (response.isSuccessful && response.body()?.success == true) {
                val invitations = response.body()?.data?.map { dto ->
                    PendingInvitation(
                        id = dto.id,
                        projectId = dto.projectId,
                        projectName = dto.project?.name ?: "Unknown Project",
                        projectDescription = dto.project?.description,
                        role = dto.role,
                        inviterName = dto.inviter?.let { 
                            when {
                                it.firstName != null && it.lastName != null -> "${it.firstName} ${it.lastName}"
                                it.firstName != null -> it.firstName
                                it.username != null -> it.username
                                else -> it.email ?: "Unknown"
                            }
                        } ?: "Unknown",
                        inviterEmail = dto.inviter?.email,
                        message = dto.message,
                        expiresAt = dto.expiresAt,
                        createdAt = dto.createdAt
                    )
                } ?: emptyList()
                ApiResult.Success(invitations)
            } else {
                ApiResult.Success(emptyList())
            }
        } catch (e: Exception) {
            ApiResult.Error(e.message ?: "Network error")
        }
    }
    
    /**
     * Get project collaborators
     */
    suspend fun getProjectCollaborators(projectId: String): ApiResult<ProjectCollaborators> {
        return try {
            val response = api.getProjectCollaborators(projectId)
            
            if (response.isSuccessful && response.body()?.success == true) {
                val data = response.body()?.data
                val owner = data?.owner?.let { 
                    UserSummary(
                        id = it.id,
                        username = it.username,
                        firstName = it.firstName,
                        lastName = it.lastName,
                        email = it.email
                    )
                }
                val collaborators = data?.collaborators?.map { dto ->
                    Collaborator(
                        id = dto.id,
                        userId = dto.userId ?: "",
                        role = dto.role ?: "viewer",
                        user = dto.user?.let { 
                            UserSummary(
                                id = it.id ?: "",
                                username = it.username,
                                firstName = it.firstName,
                                lastName = it.lastName,
                                email = it.email
                            )
                        } ?: UserSummary(id = dto.userId ?: ""),
                        addedAt = dto.addedAt,
                        lastAccessedAt = dto.lastAccessedAt,
                        accessCount = dto.accessCount ?: 0,
                        canEdit = dto.canEdit ?: false,
                        canDelete = dto.canDelete ?: false,
                        canInvite = dto.canInvite ?: false,
                        canManageRoles = dto.canManageRoles ?: false
                    )
                } ?: emptyList()
                
                ApiResult.Success(ProjectCollaborators(owner = owner, collaborators = collaborators))
            } else {
                ApiResult.Error("Failed to get collaborators", response.code())
            }
        } catch (e: Exception) {
            ApiResult.Error(e.message ?: "Network error")
        }
    }
    
    /**
     * Check if email exists in the system (for invite validation)
     */
    suspend fun checkEmailExists(email: String): ApiResult<CheckEmailData> {
        return try {
            val response = api.checkEmailExists(email)
            
            if (response.isSuccessful && response.body()?.success == true) {
                val data = response.body()?.data
                if (data != null) {
                    ApiResult.Success(data)
                } else {
                    ApiResult.Error("Failed to check email")
                }
            } else {
                ApiResult.Error("Failed to check email", response.code())
            }
        } catch (e: Exception) {
            ApiResult.Error(e.message ?: "Network error")
        }
    }
    
    /**
     * Invite collaborator to project
     */
    suspend fun inviteCollaborator(projectId: String, email: String, role: String = "viewer"): ApiResult<Boolean> {
        return try {
            val request = InviteCollaboratorRequest(email = email, role = role)
            val response = api.inviteCollaborator(projectId, request)
            
            if (response.isSuccessful && response.body()?.success == true) {
                ApiResult.Success(true)
            } else {
                val error = response.body()?.error ?: "Failed to send invitation"
                ApiResult.Error(error, response.code())
            }
        } catch (e: Exception) {
            ApiResult.Error(e.message ?: "Network error")
        }
    }
    
    /**
     * Remove a collaborator from project
     */
    suspend fun removeCollaborator(projectId: String, collaboratorId: String): ApiResult<Boolean> {
        return try {
            val response = api.removeCollaborator(projectId, collaboratorId)
            
            if (response.isSuccessful && response.body()?.success == true) {
                ApiResult.Success(true)
            } else {
                val error = response.body()?.error ?: "Failed to remove collaborator"
                ApiResult.Error(error, response.code())
            }
        } catch (e: Exception) {
            ApiResult.Error(e.message ?: "Network error")
        }
    }
    
    /**
     * Change a collaborator's role
     */
    suspend fun changeCollaboratorRole(projectId: String, collaboratorId: String, newRole: String): ApiResult<Boolean> {
        return try {
            val request = ChangeRoleRequest(role = newRole)
            val response = api.changeCollaboratorRole(projectId, collaboratorId, request)
            
            if (response.isSuccessful && response.body()?.success == true) {
                ApiResult.Success(true)
            } else {
                val error = response.body()?.error ?: "Failed to change role"
                ApiResult.Error(error, response.code())
            }
        } catch (e: Exception) {
            ApiResult.Error(e.message ?: "Network error")
        }
    }
    
    /**
     * Respond to project invitation
     */
    suspend fun respondToInvitation(invitationId: String, accept: Boolean): ApiResult<Boolean> {
        return try {
            val request = InvitationResponseRequest(accept = accept)
            val response = api.respondToInvitation(invitationId, request)
            
            if (response.isSuccessful && response.body()?.success == true) {
                ApiResult.Success(true)
            } else {
                ApiResult.Error("Failed to respond to invitation", response.code())
            }
        } catch (e: Exception) {
            ApiResult.Error(e.message ?: "Network error")
        }
    }
    
    // ============================================
    // Analytics Operations
    // ============================================
    
    /**
     * Get analytics dashboard
     */
    suspend fun getAnalyticsDashboard(): ApiResult<AnalyticsDashboard> {
        return try {
            val response = api.getAnalyticsDashboard()
            
            if (response.isSuccessful && response.body()?.success == true) {
                val data = response.body()?.data
                ApiResult.Success(
                    AnalyticsDashboard(
                        totalMessages = data?.totalMessages ?: 0,
                        totalTokens = data?.totalTokens ?: 0,
                        totalConversations = data?.totalConversations ?: 0,
                        totalProjects = data?.totalProjects ?: 0,
                        modelUsage = data?.modelUsage ?: emptyMap()
                    )
                )
            } else {
                ApiResult.Error("Failed to get analytics", response.code())
            }
        } catch (e: Exception) {
            ApiResult.Error(e.message ?: "Network error")
        }
    }
    
    // ============================================
    // Translation Operations
    // ============================================
    
    /**
     * Translate text
     */
    suspend fun translateText(text: String, from: String? = null, to: String? = null): ApiResult<String> {
        return try {
            val request = TranslateRequest(text = text, from = from, to = to)
            val response = api.translateText(request)
            
            if (response.isSuccessful && response.body()?.success == true) {
                ApiResult.Success(response.body()?.data?.translatedText ?: "")
            } else {
                ApiResult.Error(response.body()?.error ?: "Translation failed", response.code())
            }
        } catch (e: Exception) {
            ApiResult.Error(e.message ?: "Network error")
        }
    }
    
    /**
     * Detect language
     */
    suspend fun detectLanguage(text: String): ApiResult<DetectedLanguage> {
        return try {
            val request = DetectLanguageRequest(text = text)
            val response = api.detectLanguage(request)
            
            if (response.isSuccessful && response.body()?.success == true) {
                val data = response.body()?.data
                ApiResult.Success(
                    DetectedLanguage(
                        primaryLanguage = data?.primaryLanguage ?: "unknown",
                        isRomanUrdu = data?.isRomanUrdu ?: false,
                        confidence = data?.confidence ?: 0.0
                    )
                )
            } else {
                ApiResult.Error(response.body()?.error ?: "Detection failed", response.code())
            }
        } catch (e: Exception) {
            ApiResult.Error(e.message ?: "Network error")
        }
    }
    
    // ============================================
    // Audio/Voice Operations
    // ============================================
    
    /**
     * Transcribe audio file
     */
    suspend fun transcribeAudio(audio: okhttp3.MultipartBody.Part, language: okhttp3.RequestBody?): ApiResult<TranscriptionResult> {
        return try {
            val response = api.transcribeUpload(audio, language)
            
            if (response.isSuccessful && response.body()?.success == true) {
                val data = response.body()?.data
                ApiResult.Success(
                    TranscriptionResult(
                        text = data?.text ?: "",
                        language = data?.language,
                        confidence = data?.confidence
                    )
                )
            } else {
                ApiResult.Error(response.body()?.error ?: "Transcription failed", response.code())
            }
        } catch (e: Exception) {
            ApiResult.Error(e.message ?: "Network error")
        }
    }
    
    /**
     * Voice chat - transcribe and get AI response
     */
    suspend fun voiceChat(audio: okhttp3.MultipartBody.Part, conversationId: okhttp3.RequestBody?): ApiResult<VoiceChatResult> {
        return try {
            val response = api.voiceChat(audio, conversationId)
            
            if (response.isSuccessful && response.body()?.success == true) {
                val data = response.body()?.data
                ApiResult.Success(
                    VoiceChatResult(
                        transcription = data?.transcription ?: "",
                        response = data?.response ?: "",
                        conversationId = data?.conversationId,
                        audioUrl = data?.audioUrl
                    )
                )
            } else {
                ApiResult.Error(response.body()?.error ?: "Voice chat failed", response.code())
            }
        } catch (e: Exception) {
            ApiResult.Error(e.message ?: "Network error")
        }
    }
    
    /**
     * Generate speech from text (TTS)
     */
    suspend fun generateSpeech(text: String, voice: String = "alloy", speed: Float = 1.0f): ApiResult<ByteArray> {
        return try {
            val request = TTSRequest(text = text, voice = voice, speed = speed)
            val response = api.generateSpeech(request)
            
            if (response.isSuccessful) {
                val audioBytes = response.body()?.bytes()
                if (audioBytes != null) {
                    ApiResult.Success(audioBytes)
                } else {
                    ApiResult.Error("No audio data received")
                }
            } else {
                ApiResult.Error("TTS failed", response.code())
            }
        } catch (e: Exception) {
            ApiResult.Error(e.message ?: "Network error")
        }
    }
    
    /**
     * Get available TTS voices with descriptions and friendly names
     */
    suspend fun getTTSVoices(): ApiResult<List<Voice>> {
        return try {
            val response = api.getTTSVoices()
            
            if (response.isSuccessful && response.body()?.success == true) {
                val voices = response.body()?.data?.voices?.map { voiceInfo ->
                    Voice(
                        id = voiceInfo.id,
                        // Use friendly name mapping for better display
                        name = getFriendlyVoiceName(voiceInfo.id, voiceInfo.name),
                        provider = voiceInfo.provider,
                        gender = voiceInfo.gender,
                        // Generate description based on voice info
                        description = getVoiceDescription(voiceInfo.id, voiceInfo.name, voiceInfo.language, voiceInfo.gender)
                    )
                } ?: emptyList()
                ApiResult.Success(voices)
            } else {
                ApiResult.Error("Failed to get voices", response.code())
            }
        } catch (e: Exception) {
            ApiResult.Error(e.message ?: "Network error")
        }
    }
    
    /**
     * Map voice IDs to friendly display names
     * Especially for Urdu voices to show appropriate names
     */
    private fun getFriendlyVoiceName(id: String, originalName: String): String {
        return when (id) {
            // Urdu / Multilingual voices - Use Pakistani/Hindi names
            "pqHfZKP75CvOlQylNhV4" -> "Bilal (اردو)"  // Bill -> Bilal
            "XB0fDUnXU5powFXDhCwa" -> "Arooj"          // Charlotte -> Arooj
            "piTKgcLEGmPE4e6mEKli" -> "Nadia"          // Nicole -> Nadia
            
            // Keep English names as-is (they're already good)
            else -> originalName
        }
    }
    
    /**
     * Generate human-readable description for voices
     * Maps ElevenLabs voice IDs to friendly descriptions
     */
    private fun getVoiceDescription(id: String, name: String, language: String?, gender: String?): String {
        // Known ElevenLabs voices with custom descriptions
        return when (id) {
            // Urdu / Multilingual voices
            "pqHfZKP75CvOlQylNhV4" -> "Natural Urdu speaker • Perfect for Urdu conversations"
            "XB0fDUnXU5powFXDhCwa" -> "Roman Urdu & English mix • Conversational"
            "piTKgcLEGmPE4e6mEKli" -> "Warm feminine voice • Hindi/Urdu friendly"
            
            // English voices
            "EXAVITQu4vr4xnSDxMaL" -> "Natural & warm • Best for English"
            "21m00Tcm4TlvDq8ikWAM" -> "Friendly & clear • American English"
            "TxGEqnHWrfWFTfGW9XjX" -> "Deep & confident • Male voice"
            "onwK4e9ZLuTAKqWW03F9" -> "British narrator • Clear pronunciation"
            "N2lVS1w4EtoT3dr4eOWO" -> "Storyteller • Warm & engaging"
            "VR6AewLTigWG4xSOukaG" -> "Deep & authoritative • Arnold"
            "pNInz6obpgDQGcFmaJgB" -> "Natural male • Adam"
            "yoZ06aMxZJJ28mfd3POQ" -> "Versatile • Sam"
            "AZnzlk1XvdvUeBnXmlld" -> "Expressive feminine • Domi"
            "MF3mGyEYCl7XYWbV9V6O" -> "Clear feminine • Elli"
            
            // Legacy OpenAI voices
            "alloy" -> "Versatile and balanced"
            "echo" -> "Warm and conversational"
            "fable" -> "Expressive and dynamic"
            "onyx" -> "Deep and authoritative"
            "nova" -> "Friendly and upbeat"
            "shimmer" -> "Clear and professional"
            
            // Default: generate from available info
            else -> {
                val langInfo = when (language?.lowercase()) {
                    "ur" -> "Urdu"
                    "hi" -> "Hindi"
                    "en" -> "English"
                    "multilingual" -> "Multilingual"
                    else -> language ?: ""
                }
                val genderInfo = when (gender?.lowercase()) {
                    "male" -> "Male"
                    "female" -> "Female"
                    else -> ""
                }
                listOfNotNull(langInfo.takeIf { it.isNotBlank() }, genderInfo.takeIf { it.isNotBlank() })
                    .joinToString(" • ")
                    .ifEmpty { "AI voice assistant" }
            }
        }
    }
    
    // ============================================
    // Project Team Chat Operations
    // ============================================
    
    /**
     * Get project team chat messages
     */
    suspend fun getProjectChatMessages(projectId: String, limit: Int = 50, offset: Int = 0): ApiResult<ProjectChatData> {
        return try {
            val response = api.getProjectChatMessages(projectId, limit, offset)
            
            if (response.isSuccessful && response.body()?.success == true) {
                val data = response.body()?.data
                if (data != null) {
                    ApiResult.Success(data)
                } else {
                    ApiResult.Error("No chat data found")
                }
            } else {
                ApiResult.Error("Failed to get chat messages", response.code())
            }
        } catch (e: Exception) {
            ApiResult.Error(e.message ?: "Network error")
        }
    }
    
    /**
     * Send a team chat message
     */
    suspend fun sendProjectChatMessage(
        projectId: String, 
        content: String, 
        messageType: String = "text",
        imageUrl: String? = null,
        replyToId: String? = null
    ): ApiResult<ProjectChatMessageDto> {
        return try {
            val request = SendProjectChatMessageRequest(
                content = content,
                messageType = messageType,
                imageUrl = imageUrl,
                replyToId = replyToId
            )
            val response = api.sendProjectChatMessage(projectId, request)
            
            if (response.isSuccessful && response.body()?.success == true) {
                val data = response.body()?.data
                if (data != null) {
                    ApiResult.Success(data)
                } else {
                    ApiResult.Error("Failed to send message")
                }
            } else {
                val error = response.body()?.message ?: "Failed to send message"
                ApiResult.Error(error, response.code())
            }
        } catch (e: Exception) {
            ApiResult.Error(e.message ?: "Network error")
        }
    }
    
    /**
     * Edit a team chat message
     */
    suspend fun editProjectChatMessage(projectId: String, messageId: String, content: String): ApiResult<ProjectChatMessageDto> {
        return try {
            val request = EditProjectChatMessageRequest(content = content)
            val response = api.editProjectChatMessage(projectId, messageId, request)
            
            if (response.isSuccessful && response.body()?.success == true) {
                val data = response.body()?.data
                if (data != null) {
                    ApiResult.Success(data)
                } else {
                    ApiResult.Error("Failed to edit message")
                }
            } else {
                val error = response.body()?.message ?: "Failed to edit message"
                ApiResult.Error(error, response.code())
            }
        } catch (e: Exception) {
            ApiResult.Error(e.message ?: "Network error")
        }
    }
    
    /**
     * Delete a team chat message
     */
    suspend fun deleteProjectChatMessage(projectId: String, messageId: String, deleteForEveryone: Boolean = false): ApiResult<Boolean> {
        return try {
            val response = api.deleteProjectChatMessage(projectId, messageId, deleteForEveryone)
            
            if (response.isSuccessful && response.body()?.success == true) {
                ApiResult.Success(true)
            } else {
                val errorMsg = response.body()?.message ?: "Failed to delete message"
                ApiResult.Error(errorMsg, response.code())
            }
        } catch (e: Exception) {
            ApiResult.Error(e.message ?: "Network error")
        }
    }
    
    /**
     * Get project chat settings
     */
    suspend fun getProjectChatSettings(projectId: String): ApiResult<ProjectChatSettingsWithPermissions> {
        return try {
            val response = api.getProjectChatSettings(projectId)
            
            if (response.isSuccessful && response.body()?.success == true) {
                val data = response.body()?.data
                if (data != null) {
                    ApiResult.Success(data)
                } else {
                    ApiResult.Error("No settings found")
                }
            } else {
                val errorMsg = "Failed to get chat settings"
                ApiResult.Error(errorMsg, response.code())
            }
        } catch (e: Exception) {
            ApiResult.Error(e.message ?: "Network error")
        }
    }
    
    /**
     * Update project chat settings (admin only)
     */
    suspend fun updateProjectChatSettings(
        projectId: String, 
        chatAccess: String? = null,
        allowImages: Boolean? = null,
        allowEmojis: Boolean? = null,
        allowEditing: Boolean? = null,
        allowDeleting: Boolean? = null
    ): ApiResult<ProjectChatSettingsWithPermissions> {
        return try {
            val request = UpdateProjectChatSettingsRequest(
                chatAccess = chatAccess,
                allowImages = allowImages,
                allowEmojis = allowEmojis,
                allowEditing = allowEditing,
                allowDeleting = allowDeleting
            )
            val response = api.updateProjectChatSettings(projectId, request)
            
            if (response.isSuccessful && response.body()?.success == true) {
                val data = response.body()?.data
                if (data != null) {
                    ApiResult.Success(data)
                } else {
                    ApiResult.Error("Failed to update settings")
                }
            } else {
                val error = "Failed to update chat settings"
                ApiResult.Error(error, response.code())
            }
        } catch (e: Exception) {
            ApiResult.Error(e.message ?: "Network error")
        }
    }
}

// ============================================
// Extension Functions for DTO Mapping
// ============================================

fun ConversationDto.toConversation() = Conversation(
    id = id,
    title = title ?: "Untitled",
    messageCount = messageCount ?: 0,
    isPinned = isPinned ?: false,
    isArchived = isArchived ?: false,
    createdAt = createdAt,
    updatedAt = updatedAt
)

fun ConversationDetailDto.toConversation() = Conversation(
    id = id,
    title = title ?: "Untitled",
    messageCount = messages?.size ?: 0,
    isPinned = isPinned ?: false,
    isArchived = isArchived ?: false,
    createdAt = createdAt,
    updatedAt = updatedAt
)

fun MessageDto.toChatMessage(conversationId: String) = ChatMessage(
    id = id,
    content = content,
    role = when (role.lowercase()) {
        "user" -> MessageRole.USER
        "assistant" -> MessageRole.ASSISTANT
        else -> MessageRole.SYSTEM
    },
    conversationId = conversationId
)

fun ProjectDto.toProject() = Project(
    id = id,
    name = name,
    description = description,
    color = color,
    icon = icon,
    emoji = emoji,
    conversationCount = conversationCount ?: 0,
    instructions = instructions,
    customInstructions = customInstructions,
    // Collaboration fields
    myRole = myRole,
    isOwner = isOwner ?: (myRole == null), // If no role specified, user is owner
    canEdit = canEdit ?: (isOwner ?: true),
    canDelete = canDelete ?: (isOwner ?: true),
    canInvite = canInvite ?: (isOwner ?: true),
    canManageRoles = canManageRoles ?: (isOwner ?: true),
    collaboratorCount = collaboratorCount ?: 0,
    owner = owner?.toUserSummary(),
    collaborators = collaborators?.map { it.toCollaborator() } ?: emptyList(),
    // Project context
    context = context,
    keyTopics = keyTopics ?: emptyList(),
    techStack = techStack ?: emptyList(),
    goals = goals ?: emptyList(),
    lastContextUpdate = lastContextUpdate
)

fun ProjectOwnerDto.toUserSummary() = UserSummary(
    id = id ?: "",
    username = username,
    firstName = firstName,
    lastName = lastName,
    email = email
)

fun CollaboratorDto.toCollaborator() = Collaborator(
    id = id,
    userId = userId ?: "",
    role = role ?: "viewer",
    user = user?.toUserSummary() ?: UserSummary(id = userId ?: ""),
    addedAt = addedAt,
    lastAccessedAt = lastAccessedAt,
    accessCount = accessCount ?: 0,
    canEdit = canEdit ?: false,
    canDelete = canDelete ?: false,
    canInvite = canInvite ?: false,
    canManageRoles = canManageRoles ?: false
)

// ============================================
// Data Classes
// ============================================

data class ConversationWithMessages(
    val conversation: Conversation,
    val messages: List<ChatMessage>
)

// Document Models
data class UploadedDocument(
    val id: String,
    val filename: String,
    val mimeType: String,
    val size: Long,
    val status: String,
    val extractedText: String?
)

data class DocumentStatus(
    val status: String,
    val extractedText: String?,
    val error: String?
)

data class UploadStatus(
    val usedToday: Int,
    val dailyLimit: Int,
    val remaining: Int,
    val canUpload: Boolean,
    val nextAvailableAt: String? = null  // ISO timestamp for client-side formatting
)

// Image Models
data class UploadedImage(
    val id: String,
    val url: String?,
    val filename: String?,
    val mimeType: String?,
    val status: String,
    val ocrText: String?
)

data class ImageProcessingStatus(
    val status: String,
    val extractedText: String?,
    val error: String?
)

data class GeneratedImage(
    val imageUrl: String,
    val model: String?,
    val originalPrompt: String?,
    val enhancedPrompt: String?,
    val seed: Long?,
    val generationTime: Long?,
    val style: String?,
    val aspectRatio: String?
)

data class ImageGenStatus(
    val canGenerate: Boolean,
    val remainingToday: Int,
    val dailyLimit: Int,
    val usedToday: Int = 0,
    val tier: String,
    val nextAvailableAt: String? = null  // ISO timestamp for client-side formatting
)

data class ImageStyle(
    val id: String,
    val name: String,
    val description: String
)

// Search Models
data class SearchResultItem(
    val title: String,
    val url: String,
    val snippet: String,
    val publishedDate: String?
)

// Tags & Modes Models
data class Tag(
    val id: String,
    val name: String,
    val description: String,
    val example: String?,
    val icon: String?
)

data class Mode(
    val id: String,
    val name: String,
    val icon: String?,
    val description: String?,
    val temperature: Double?,
    val category: String?
)

// Memory/Facts Models
data class Fact(
    val id: String,
    val category: String,
    val key: String,
    val value: String,
    val confidence: Double?,
    val source: String?
)

data class ProfileSummary(
    val summary: String,
    val factCount: Int,
    val topInterests: List<String>,
    val skills: List<String>
)

// Template Models
data class Template(
    val id: String,
    val name: String,
    val description: String?,
    val category: String?,
    val systemPrompt: String?,
    val icon: String?,
    val isDefault: Boolean
)

// Share Models
data class ShareLink(
    val shareId: String,
    val url: String,
    val expiresAt: String?,
    val viewCount: Int
)

data class SharedConversation(
    val title: String,
    val messages: List<MessageDto>,
    val sharedBy: String,
    val sharedByAvatar: String?,
    val createdAt: String?,
    val messageCount: Int,
    val originalConversationId: String? = null
)

// Analytics Models
data class AnalyticsDashboard(
    val totalMessages: Int,
    val totalTokens: Long,
    val totalConversations: Int,
    val totalProjects: Int,
    val modelUsage: Map<String, Int>
)

// Collaboration Models
data class ProjectCollaborators(
    val owner: UserSummary?,
    val collaborators: List<Collaborator>
)

// Translation Models
data class DetectedLanguage(
    val primaryLanguage: String,
    val isRomanUrdu: Boolean,
    val confidence: Double
)

// Audio Models
data class TranscriptionResult(
    val text: String,
    val language: String?,
    val confidence: Double?
)

data class VoiceChatResult(
    val transcription: String,
    val response: String,
    val conversationId: String?,
    val audioUrl: String?
)

data class Voice(
    val id: String,
    val name: String,
    val provider: String? = null,
    val gender: String? = null,
    val description: String? = null,
    val previewUrl: String? = null
)

// ============================================
// Additional Extension Functions
// ============================================

fun UploadedImageDto.toUploadedImage() = UploadedImage(
    id = id,
    url = url,
    filename = filename,
    mimeType = mimeType,
    status = status ?: "unknown",
    ocrText = ocrText
)

fun GeneratedImageData.toGeneratedImage() = GeneratedImage(
    imageUrl = imageUrl ?: "",
    model = model,
    originalPrompt = originalPrompt,
    enhancedPrompt = enhancedPrompt,
    seed = seed,
    generationTime = generationTime,
    style = style,
    aspectRatio = aspectRatio
)

fun SearchResult.toSearchResultItem() = SearchResultItem(
    title = title ?: "",
    url = url ?: "",
    snippet = snippet ?: "",
    publishedDate = publishedDate
)

fun ChatTag.toTag() = Tag(
    id = id,
    name = name,
    description = description ?: "",
    example = example,
    icon = icon
)

fun ChatMode.toMode() = Mode(
    id = id,
    name = name,
    icon = icon,
    description = description,
    temperature = temperature,
    category = category
)

fun LearnedFact.toFact() = Fact(
    id = id,
    category = category,
    key = key,
    value = value,
    confidence = confidence,
    source = source
)

fun TemplateDto.toTemplate() = Template(
    id = id,
    name = name,
    description = description,
    category = category,
    systemPrompt = systemPrompt,
    icon = icon,
    isDefault = isDefault ?: false
)
