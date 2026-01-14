package com.baatcheet.app.data.repository

import com.baatcheet.app.data.remote.api.BaatCheetApi
import com.baatcheet.app.data.remote.dto.*
import com.baatcheet.app.domain.model.ChatMessage
import com.baatcheet.app.domain.model.Conversation
import com.baatcheet.app.domain.model.MessageRole
import com.baatcheet.app.domain.model.Project
import com.baatcheet.app.domain.model.PromptAnalysisResult
import com.baatcheet.app.domain.model.AIMode
import com.baatcheet.app.domain.model.UsageInfo
import okhttp3.MultipartBody
import okhttp3.RequestBody
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
    // Chat Operations
    // ============================================
    
    /**
     * Send a message and get AI response
     */
    suspend fun sendMessage(
        message: String,
        conversationId: String? = null,
        model: String? = null
    ): ApiResult<ChatMessage> {
        return try {
            val request = ChatRequest(
                message = message,
                conversationId = conversationId,
                model = model,
                stream = false
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
     * Send voice message with optimized settings for voice chat
     * - Shorter maxTokens for concise responses (saves tokens & TTS costs)
     * - Voice-optimized system prompt for natural conversation
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
                // Add voice-specific system prompt instruction
                systemPrompt = "You are in a voice conversation. Keep responses SHORT, NATURAL, and CONVERSATIONAL. Limit to 1-2 sentences when possible. Avoid lists, code, and long explanations - this is a spoken chat."
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
        color: String? = null
    ): ApiResult<Project> {
        return try {
            val request = UpdateProjectRequest(
                name = name,
                description = description,
                color = color
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
                val items = response.body()?.data?.items?.map { it.toConversation() } ?: emptyList()
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
                        remainingToday = data?.remainingToday ?: 0,
                        dailyLimit = data?.dailyLimit ?: 0,
                        tier = data?.tier ?: "free"
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
            val request = CreateShareRequest(expiresInDays = expiresInDays)
            val response = api.createShareLink(conversationId, request)
            
            if (response.isSuccessful && response.body()?.success == true) {
                val data = response.body()?.data
                if (data?.shareId != null && data.url != null) {
                    ApiResult.Success(
                        ShareLink(
                            shareId = data.shareId,
                            url = data.url,
                            expiresAt = data.expiresAt,
                            viewCount = data.viewCount ?: 0
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
     * Get user's share links
     */
    suspend fun getShareLinks(): ApiResult<List<ShareLink>> {
        return try {
            val response = api.getShareLinks()
            
            if (response.isSuccessful && response.body()?.success == true) {
                val links = response.body()?.data?.mapNotNull { 
                    if (it.shareId != null && it.url != null) {
                        ShareLink(
                            shareId = it.shareId,
                            url = it.url,
                            expiresAt = it.expiresAt,
                            viewCount = it.viewCount ?: 0
                        )
                    } else null
                } ?: emptyList()
                ApiResult.Success(links)
            } else {
                ApiResult.Error("Failed to get share links", response.code())
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
     * Get available TTS voices
     */
    suspend fun getTTSVoices(): ApiResult<List<Voice>> {
        return try {
            val response = api.getTTSVoices()
            
            if (response.isSuccessful && response.body()?.success == true) {
                val voices = response.body()?.data?.voices?.map { 
                    Voice(
                        id = it.id,
                        name = it.name,
                        provider = it.provider,
                        gender = it.gender
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
    conversationCount = conversationCount ?: 0
)

// ============================================
// Data Classes
// ============================================

data class ConversationWithMessages(
    val conversation: Conversation,
    val messages: List<ChatMessage>
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
    val tier: String
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

// Analytics Models
data class AnalyticsDashboard(
    val totalMessages: Int,
    val totalTokens: Long,
    val totalConversations: Int,
    val totalProjects: Int,
    val modelUsage: Map<String, Int>
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
