package com.baatcheet.app.data.remote.api

import com.baatcheet.app.data.remote.dto.*
import okhttp3.MultipartBody
import okhttp3.RequestBody
import okhttp3.ResponseBody
import retrofit2.Response
import retrofit2.http.*

/**
 * BaatCheet API Interface
 * All backend API endpoints for chat, conversations, and projects
 * Matches the web frontend API services
 */
interface BaatCheetApi {
    
    companion object {
        const val BASE_URL = "https://sharry121-baatcheet.hf.space/api/v1/"
    }
    
    // ============================================
    // Chat Endpoints
    // ============================================
    
    /**
     * Send a chat message (non-streaming)
     */
    @POST("chat/completions")
    suspend fun sendMessage(
        @Body request: ChatRequest
    ): Response<ChatResponse>
    
    /**
     * Regenerate last response
     */
    @POST("chat/regenerate")
    suspend fun regenerateResponse(
        @Body request: RegenerateRequest
    ): Response<ChatResponse>
    
    /**
     * Submit feedback for a message (like/dislike)
     */
    @POST("chat/feedback")
    suspend fun submitFeedback(
        @Body request: FeedbackRequest
    ): Response<BaseResponse<Any>>
    
    /**
     * Get available models
     */
    @GET("chat/models")
    suspend fun getModels(): Response<ModelsResponse>
    
    /**
     * Get chat provider health status
     */
    @GET("chat/providers/health")
    suspend fun getChatProvidersHealth(): Response<ProvidersHealthResponse>
    
    /**
     * Analyze a prompt before sending (get mode, intent, format suggestions)
     */
    @POST("chat/analyze")
    suspend fun analyzePrompt(
        @Body request: AnalyzePromptRequest
    ): Response<AnalyzePromptResponse>
    
    /**
     * Get all available AI modes
     */
    @GET("chat/modes")
    suspend fun getAIModes(): Response<AIModesResponse>
    
    /**
     * Get current usage and remaining quotas
     */
    @GET("chat/usage")
    suspend fun getUsage(): Response<UsageResponse>
    
    /**
     * Get follow-up question suggestions
     */
    @POST("chat/suggest")
    suspend fun getSuggestions(
        @Body request: SuggestionsRequest
    ): Response<SuggestionsResponse>
    
    // ============================================
    // Conversation Endpoints
    // ============================================
    
    /**
     * Get all conversations
     */
    @GET("conversations")
    suspend fun getConversations(
        @Query("limit") limit: Int = 50,
        @Query("offset") offset: Int = 0,
        @Query("projectId") projectId: String? = null,
        @Query("archived") archived: Boolean? = null,
        @Query("pinned") pinned: Boolean? = null
    ): Response<ConversationsResponse>
    
    /**
     * Search conversations
     */
    @GET("conversations/search")
    suspend fun searchConversations(
        @Query("q") query: String,
        @Query("limit") limit: Int = 20
    ): Response<SearchConversationsResponse>
    
    /**
     * Get single conversation with messages
     */
    @GET("conversations/{id}")
    suspend fun getConversation(
        @Path("id") conversationId: String
    ): Response<ConversationDetailResponse>
    
    /**
     * Create a new conversation
     */
    @POST("conversations")
    suspend fun createConversation(
        @Body request: CreateConversationRequest
    ): Response<CreateConversationResponse>
    
    /**
     * Update a conversation
     */
    @PUT("conversations/{id}")
    suspend fun updateConversation(
        @Path("id") conversationId: String,
        @Body request: UpdateConversationRequest
    ): Response<ConversationResponse>
    
    /**
     * Delete a conversation
     */
    @DELETE("conversations/{id}")
    suspend fun deleteConversation(
        @Path("id") conversationId: String
    ): Response<DeleteResponse>
    
    // ============================================
    // Project Endpoints
    // ============================================
    
    /**
     * Get all projects
     */
    @GET("projects")
    suspend fun getProjects(): Response<ProjectsResponse>
    
    /**
     * Get single project
     */
    @GET("projects/{id}")
    suspend fun getProject(
        @Path("id") projectId: String
    ): Response<ProjectDetailResponse>
    
    /**
     * Create a new project
     */
    @POST("projects")
    suspend fun createProject(
        @Body request: CreateProjectRequest
    ): Response<ProjectResponse>
    
    /**
     * Update a project
     */
    @PUT("projects/{id}")
    suspend fun updateProject(
        @Path("id") projectId: String,
        @Body request: UpdateProjectRequest
    ): Response<ProjectResponse>
    
    /**
     * Delete a project
     */
    @DELETE("projects/{id}")
    suspend fun deleteProject(
        @Path("id") projectId: String
    ): Response<DeleteResponse>
    
    /**
     * Get project conversations
     */
    @GET("projects/{id}/conversations")
    suspend fun getProjectConversations(
        @Path("id") projectId: String
    ): Response<ConversationsResponse>
    
    // ============================================
    // Profile Endpoints
    // ============================================
    
    /**
     * Get user profile
     */
    @GET("profile/me")
    suspend fun getProfile(): Response<ProfileResponse>
    
    /**
     * Update profile settings
     */
    @PATCH("profile/settings")
    suspend fun updateProfileSettings(
        @Body request: UpdateProfileRequest
    ): Response<ProfileSettingsResponse>
    
    // ============================================
    // Audio/Voice Endpoints
    // ============================================
    
    /**
     * Upload audio file for transcription
     */
    @Multipart
    @POST("audio/upload")
    suspend fun uploadAudio(
        @Part audio: okhttp3.MultipartBody.Part,
        @Part("conversationId") conversationId: okhttp3.RequestBody?
    ): Response<AudioUploadResponse>
    
    /**
     * Transcribe audio
     */
    @POST("audio/transcribe")
    suspend fun transcribeAudio(
        @Body request: TranscribeRequest
    ): Response<TranscriptionResponse>
    
    /**
     * Upload and transcribe audio in one step
     */
    @Multipart
    @POST("audio/transcribe-upload")
    suspend fun transcribeUpload(
        @Part audio: okhttp3.MultipartBody.Part,
        @Part("language") language: okhttp3.RequestBody?
    ): Response<TranscriptionResponse>
    
    /**
     * Voice chat - transcribe and get AI response
     */
    @Multipart
    @POST("audio/voice-chat")
    suspend fun voiceChat(
        @Part audio: okhttp3.MultipartBody.Part,
        @Part("conversationId") conversationId: okhttp3.RequestBody?
    ): Response<VoiceChatResponse>
    
    /**
     * Generate speech from text (TTS)
     */
    @POST("tts/generate")
    suspend fun generateSpeech(
        @Body request: TTSRequest
    ): Response<okhttp3.ResponseBody>
    
    /**
     * Get available TTS voices
     */
    @GET("tts/voices")
    suspend fun getTTSVoices(): Response<TTSVoicesResponse>
    
    /**
     * Get TTS service status
     */
    @GET("tts/status")
    suspend fun getTTSStatus(): Response<TTSStatusResponse>
    
    // ============================================
    // Image Endpoints
    // ============================================
    
    /**
     * Upload images for vision/OCR
     */
    @Multipart
    @POST("images/upload")
    suspend fun uploadImages(
        @Part images: List<MultipartBody.Part>,
        @Part("messageId") messageId: RequestBody? = null
    ): Response<ImagesUploadResponse>
    
    /**
     * Get image by ID
     */
    @GET("images/{id}")
    suspend fun getImage(
        @Path("id") imageId: String
    ): Response<ImageDetailResponse>
    
    /**
     * Get image processing status
     */
    @GET("images/{id}/status")
    suspend fun getImageStatus(
        @Path("id") imageId: String
    ): Response<ImageStatusResponse>
    
    /**
     * Perform OCR on image
     */
    @Multipart
    @POST("images/ocr")
    suspend fun performOCR(
        @Part image: MultipartBody.Part,
        @Part("language") language: RequestBody? = null
    ): Response<OCRResponse>
    
    /**
     * Analyze image with AI
     */
    @Multipart
    @POST("images/analyze")
    suspend fun analyzeImage(
        @Part image: MultipartBody.Part,
        @Part("prompt") prompt: RequestBody? = null
    ): Response<ImageAnalysisResponse>
    
    // ============================================
    // Image Generation Endpoints
    // ============================================
    
    /**
     * Generate image from prompt
     */
    @POST("image-gen/generate")
    suspend fun generateImage(
        @Body request: ImageGenerationRequest
    ): Response<ImageGenerationResponse>
    
    /**
     * Generate image variations
     */
    @POST("image-gen/variations/{id}")
    suspend fun generateVariations(
        @Path("id") imageId: String,
        @Body request: VariationRequest
    ): Response<ImageGenerationResponse>
    
    /**
     * Enhance prompt with AI
     */
    @POST("image-gen/enhance-prompt")
    suspend fun enhancePrompt(
        @Body request: EnhancePromptRequest
    ): Response<EnhancedPromptResponse>
    
    /**
     * Get available image generation models
     */
    @GET("image-gen/models")
    suspend fun getImageGenModels(): Response<ImageGenModelsResponse>
    
    /**
     * Get style presets
     */
    @GET("image-gen/styles")
    suspend fun getImageGenStyles(): Response<ImageGenStylesResponse>
    
    /**
     * Get aspect ratios
     */
    @GET("image-gen/aspect-ratios")
    suspend fun getAspectRatios(): Response<AspectRatiosResponse>
    
    /**
     * Get user's image generation status (limits, remaining)
     */
    @GET("image-gen/status")
    suspend fun getImageGenStatus(): Response<ImageGenStatusResponse>
    
    /**
     * Get image generation history
     */
    @GET("image-gen/history")
    suspend fun getImageGenHistory(
        @Query("limit") limit: Int = 20,
        @Query("offset") offset: Int = 0
    ): Response<ImageGenHistoryResponse>
    
    // ============================================
    // Web Search Endpoints
    // ============================================
    
    /**
     * Perform web search
     */
    @POST("search")
    suspend fun webSearch(
        @Body request: WebSearchRequest
    ): Response<WebSearchResponse>
    
    /**
     * Check if query needs web search
     */
    @POST("search/check")
    suspend fun checkSearchNeed(
        @Body request: SearchCheckRequest
    ): Response<SearchCheckResponse>
    
    /**
     * Get search service status
     */
    @GET("search/status")
    suspend fun getSearchStatus(): Response<SearchStatusResponse>
    
    // ============================================
    // Tags & Modes Endpoints
    // ============================================
    
    /**
     * Get available chat tags
     */
    @GET("tags")
    suspend fun getTags(): Response<TagsResponse>
    
    /**
     * Get tag help/usage
     */
    @GET("tags/help")
    suspend fun getTagsHelp(): Response<TagsHelpResponse>
    
    /**
     * Get available AI modes
     */
    @GET("modes")
    suspend fun getModes(): Response<ModesResponse>
    
    /**
     * Get mode details
     */
    @GET("modes/{modeId}")
    suspend fun getModeDetails(
        @Path("modeId") modeId: String
    ): Response<ModeDetailResponse>
    
    /**
     * Detect mode from message
     */
    @POST("modes/detect")
    suspend fun detectMode(
        @Body request: DetectModeRequest
    ): Response<DetectedModeResponse>
    
    // ============================================
    // Memory/Profile Learning Endpoints
    // ============================================
    
    /**
     * Get learned facts about user
     */
    @GET("profile/facts")
    suspend fun getLearnedFacts(): Response<FactsResponse>
    
    /**
     * Teach the AI a fact
     */
    @POST("profile/teach")
    suspend fun teachFact(
        @Body request: TeachFactRequest
    ): Response<TeachFactResponse>
    
    /**
     * Delete a learned fact
     */
    @DELETE("profile/facts/{id}")
    suspend fun deleteFact(
        @Path("id") factId: String
    ): Response<DeleteResponse>
    
    /**
     * Ask about profile/memory
     */
    @POST("profile/ask")
    suspend fun askProfile(
        @Body request: AskProfileRequest
    ): Response<AskProfileResponse>
    
    /**
     * Get profile summary
     */
    @GET("profile/summary")
    suspend fun getProfileSummary(): Response<ProfileSummaryResponse>
    
    // ============================================
    // Templates Endpoints
    // ============================================
    
    /**
     * Get templates list
     */
    @GET("templates")
    suspend fun getTemplates(
        @Query("category") category: String? = null
    ): Response<TemplatesResponse>
    
    /**
     * Get template details
     */
    @GET("templates/{id}")
    suspend fun getTemplate(
        @Path("id") templateId: String
    ): Response<TemplateDetailResponse>
    
    /**
     * Create a custom template
     */
    @POST("templates")
    suspend fun createTemplate(
        @Body request: CreateTemplateRequest
    ): Response<TemplateResponse>
    
    /**
     * Use a template (creates conversation)
     */
    @POST("templates/{id}/use")
    suspend fun useTemplate(
        @Path("id") templateId: String,
        @Body request: UseTemplateRequest
    ): Response<UseTemplateResponse>
    
    /**
     * Get template categories
     */
    @GET("templates/categories")
    suspend fun getTemplateCategories(): Response<TemplateCategoriesResponse>
    
    // ============================================
    // Export/Share Endpoints
    // ============================================
    
    /**
     * Export conversation
     */
    @GET("export/{conversationId}")
    suspend fun exportConversation(
        @Path("conversationId") conversationId: String,
        @Query("format") format: String = "md"
    ): Response<ResponseBody>
    
    /**
     * Export preview
     */
    @GET("export/{conversationId}/preview")
    suspend fun exportPreview(
        @Path("conversationId") conversationId: String,
        @Query("format") format: String = "md"
    ): Response<ExportPreviewResponse>
    
    /**
     * Create share link
     */
    @POST("share/{conversationId}")
    suspend fun createShareLink(
        @Path("conversationId") conversationId: String,
        @Body request: CreateShareRequest
    ): Response<ShareLinkResponse>
    
    /**
     * Get user's share links
     */
    @GET("share")
    suspend fun getShareLinks(): Response<ShareLinksResponse>
    
    /**
     * Get shared conversation (public)
     */
    @GET("share/{shareId}")
    suspend fun getSharedConversation(
        @Path("shareId") shareId: String
    ): Response<SharedConversationResponse>
    
    /**
     * Revoke share link
     */
    @DELETE("share/{shareId}")
    suspend fun revokeShareLink(
        @Path("shareId") shareId: String
    ): Response<DeleteResponse>
    
    // ============================================
    // Analytics Endpoints
    // ============================================
    
    /**
     * Get analytics dashboard
     */
    @GET("analytics/dashboard")
    suspend fun getAnalyticsDashboard(): Response<AnalyticsDashboardResponse>
    
    /**
     * Get usage statistics
     */
    @GET("analytics/usage")
    suspend fun getUsageStats(
        @Query("period") period: String? = null
    ): Response<UsageStatsResponse>
    
    /**
     * Get token consumption
     */
    @GET("analytics/tokens")
    suspend fun getTokenStats(
        @Query("days") days: Int = 30
    ): Response<TokenStatsResponse>
    
    // ============================================
    // File Upload Endpoints
    // ============================================
    
    /**
     * Upload document (PDF, TXT, DOC, etc.)
     */
    @Multipart
    @POST("files/upload")
    suspend fun uploadFile(
        @Part file: MultipartBody.Part
    ): Response<FileUploadResponse>
    
    /**
     * Get file by ID
     */
    @GET("files/{id}")
    suspend fun getFile(
        @Path("id") fileId: String
    ): Response<FileDetailResponse>
    
    /**
     * Get file processing status
     */
    @GET("files/{id}/status")
    suspend fun getFileStatus(
        @Path("id") fileId: String
    ): Response<FileStatusResponse>
    
    /**
     * Get file content (extracted text)
     */
    @GET("files/{id}/content")
    suspend fun getFileContent(
        @Path("id") fileId: String
    ): Response<FileContentResponse>
    
    // ============================================
    // Translation Endpoints
    // ============================================
    
    /**
     * Translate text
     */
    @POST("audio/translate")
    suspend fun translateText(
        @Body request: TranslateRequest
    ): Response<TranslateResponse>
    
    /**
     * Detect language
     */
    @POST("audio/detect-language")
    suspend fun detectLanguage(
        @Body request: DetectLanguageRequest
    ): Response<DetectLanguageResponse>
    
    /**
     * Get supported languages
     */
    @GET("audio/config/languages")
    suspend fun getSupportedLanguages(): Response<SupportedLanguagesResponse>
    
    // ============================================
    // Webhook Endpoints
    // ============================================
    
    /**
     * Get user's webhooks
     */
    @GET("webhooks")
    suspend fun getWebhooks(): Response<WebhooksResponse>
    
    /**
     * Get available webhook events
     */
    @GET("webhooks/events")
    suspend fun getWebhookEvents(): Response<WebhookEventsResponse>
    
    /**
     * Create a webhook
     */
    @POST("webhooks")
    suspend fun createWebhook(
        @Body request: CreateWebhookRequest
    ): Response<CreateWebhookResponse>
    
    /**
     * Get webhook details
     */
    @GET("webhooks/{id}")
    suspend fun getWebhook(
        @Path("id") webhookId: String
    ): Response<WebhookDetailResponse>
    
    /**
     * Update webhook
     */
    @PUT("webhooks/{id}")
    suspend fun updateWebhook(
        @Path("id") webhookId: String,
        @Body request: UpdateWebhookRequest
    ): Response<UpdateWebhookResponse>
    
    /**
     * Delete webhook
     */
    @DELETE("webhooks/{id}")
    suspend fun deleteWebhook(
        @Path("id") webhookId: String
    ): Response<DeleteResponse>
    
    /**
     * Send test webhook
     */
    @POST("webhooks/{id}/test")
    suspend fun testWebhook(
        @Path("id") webhookId: String
    ): Response<TestWebhookResponse>
    
    /**
     * Get webhook delivery history
     */
    @GET("webhooks/{id}/deliveries")
    suspend fun getWebhookDeliveries(
        @Path("id") webhookId: String,
        @Query("limit") limit: Int = 50
    ): Response<WebhookDeliveriesResponse>
    
    // ============================================
    // API Key Endpoints
    // ============================================
    
    /**
     * Get user's API keys
     */
    @GET("api-keys")
    suspend fun getApiKeys(): Response<ApiKeysResponse>
    
    /**
     * Create API key
     */
    @POST("api-keys")
    suspend fun createApiKey(
        @Body request: CreateApiKeyRequest
    ): Response<CreateApiKeyResponse>
    
    /**
     * Get API key details
     */
    @GET("api-keys/{id}")
    suspend fun getApiKey(
        @Path("id") keyId: String
    ): Response<ApiKeyDetailResponse>
    
    /**
     * Update API key
     */
    @PUT("api-keys/{id}")
    suspend fun updateApiKey(
        @Path("id") keyId: String,
        @Body request: UpdateApiKeyRequest
    ): Response<UpdateApiKeyResponse>
    
    /**
     * Delete/Revoke API key
     */
    @DELETE("api-keys/{id}")
    suspend fun deleteApiKey(
        @Path("id") keyId: String
    ): Response<DeleteResponse>
    
    /**
     * Rotate API key
     */
    @POST("api-keys/{id}/rotate")
    suspend fun rotateApiKey(
        @Path("id") keyId: String
    ): Response<RotateApiKeyResponse>
    
    /**
     * Get API key usage
     */
    @GET("api-keys/{id}/usage")
    suspend fun getApiKeyUsage(
        @Path("id") keyId: String
    ): Response<ApiKeyUsageResponse>
    
    // ============================================
    // GDPR Endpoints
    // ============================================
    
    /**
     * Export all user data (GDPR)
     */
    @GET("gdpr/export")
    suspend fun exportUserData(): Response<GDPRExportResponse>
    
    /**
     * Delete all user data (GDPR)
     */
    @DELETE("gdpr/delete")
    suspend fun deleteUserData(): Response<GDPRDeleteResponse>
    
    /**
     * Download exported data
     */
    @GET("gdpr/download/{exportId}")
    suspend fun downloadExportedData(
        @Path("exportId") exportId: String
    ): Response<ResponseBody>
}
