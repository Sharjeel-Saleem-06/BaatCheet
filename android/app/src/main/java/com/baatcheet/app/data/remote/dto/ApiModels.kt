package com.baatcheet.app.data.remote.dto

import com.google.gson.annotations.SerializedName

// ============================================
// Base Response
// ============================================

data class BaseResponse<T>(
    val success: Boolean,
    val data: T?,
    val error: String?,
    val message: String?
)

data class DeleteResponse(
    val success: Boolean,
    val message: String?
)

// ============================================
// Auth / User Models
// ============================================

data class CurrentUserResponse(
    val success: Boolean,
    val data: CurrentUserData?,
    val error: String?
)

data class CurrentUserData(
    val id: String,
    @SerializedName("clerkId") val clerkId: String?,
    val email: String,
    val username: String?,
    @SerializedName("firstName") val firstName: String?,
    @SerializedName("lastName") val lastName: String?,
    val avatar: String?,
    val role: String?,
    val tier: String?,
    @SerializedName("createdAt") val createdAt: String?,
    @SerializedName("updatedAt") val updatedAt: String?
)

// ============================================
// Chat Models
// ============================================

data class ChatRequest(
    val message: String,
    val conversationId: String? = null,
    val model: String? = null,
    val systemPrompt: String? = null,
    val stream: Boolean = false,
    val imageIds: List<String>? = null,
    val maxTokens: Int? = null, // Limit response length (useful for voice chat)
    val temperature: Float? = null,
    val mode: String? = null, // Explicit mode selection: "image-generation", "code", "web-search", "research", etc.
    val projectId: String? = null, // Project ID to associate conversation with and use project context
    val isVoiceChat: Boolean = false // If true, AI responds in Urdu script (not Roman Urdu) for better TTS
)

data class ChatResponse(
    val success: Boolean,
    val data: ChatData?,
    val error: String?
)

data class ChatData(
    val message: ChatMessageDto?,
    val conversationId: String?,
    val model: String?,
    val provider: String?,
    val tokens: TokenInfo?,
    val imageResult: ImageResultDto?,  // For image generation responses
    val modeDetected: String?,
    val tagDetected: String?
)

/**
 * Image result from image generation mode
 */
data class ImageResultDto(
    val success: Boolean?,
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
 * Chat message DTO - matches backend response structure
 */
data class ChatMessageDto(
    val role: String?,
    val content: String?
)

data class TokenInfo(
    val prompt: Int?,
    val completion: Int?,
    val total: Int?
)

data class RegenerateRequest(
    val conversationId: String,
    val model: String? = null,
    val temperature: Double? = null
)

/**
 * Feedback request for like/dislike
 */
data class FeedbackRequest(
    val conversationId: String,
    val messageId: String,
    val isPositive: Boolean,
    val feedbackType: String // "like" or "dislike"
)

data class ModelsResponse(
    val success: Boolean,
    val data: ModelsData?
)

data class ModelsData(
    val models: Map<String, List<ModelInfo>>?,
    val total: Int?,
    val available: Int?
)

data class ModelInfo(
    val id: String,
    val name: String,
    val provider: String,
    val available: Boolean,
    val contextWindow: Int?,
    val maxTokens: Int?
)

// ============================================
// Conversation Models
// ============================================

data class ConversationsResponse(
    val success: Boolean,
    val data: ConversationsData?
)

data class ConversationsData(
    val items: List<ConversationDto>,
    val pagination: Pagination?
)

data class Pagination(
    val total: Int,
    val limit: Int,
    val offset: Int,
    val hasMore: Boolean
)

data class ConversationDto(
    val id: String,
    val title: String?,
    val model: String?,
    val tags: List<String>?,
    val isPinned: Boolean?,
    val isArchived: Boolean?,
    val totalTokens: Int?,
    val createdAt: String?,
    val updatedAt: String?,
    val messageCount: Int?
)

data class SearchConversationsResponse(
    val success: Boolean,
    val data: List<ConversationDto>?
)

// Project conversations response - data is a direct array, not wrapped in items
data class ProjectConversationsResponse(
    val success: Boolean,
    val data: List<ConversationDto>?
)

data class ConversationDetailResponse(
    val success: Boolean,
    val data: ConversationDetailDto?
)

data class ConversationDetailDto(
    val id: String,
    val title: String?,
    val model: String?,
    val tags: List<String>?,
    val isPinned: Boolean?,
    val isArchived: Boolean?,
    val systemPrompt: String?,
    val totalTokens: Int?,
    val createdAt: String?,
    val updatedAt: String?,
    val messages: List<MessageDto>?,
    val project: ProjectDto?
)

data class MessageDto(
    val id: String,
    val role: String,
    val content: String,
    val model: String?,
    val provider: String?,
    val tokens: Int?,
    val createdAt: String?,
    val attachments: List<AttachmentDto>?
)

data class AttachmentDto(
    val id: String,
    val filename: String?,
    val mimeType: String?,
    val url: String?,
    val size: Int?
)

data class CreateConversationRequest(
    val title: String? = null,
    val model: String? = null,
    val systemPrompt: String? = null,
    val projectId: String? = null,
    val tags: List<String>? = null
)

data class CreateConversationResponse(
    val success: Boolean,
    val data: ConversationDto?,
    val message: String?
)

data class UpdateConversationRequest(
    val title: String? = null,
    val model: String? = null,
    val systemPrompt: String? = null,
    val projectId: String? = null,
    val tags: List<String>? = null,
    val isPinned: Boolean? = null,
    val isArchived: Boolean? = null
)

data class ConversationResponse(
    val success: Boolean,
    val data: ConversationDto?,
    val message: String?
)

// ============================================
// Project Models
// ============================================

data class ProjectsResponse(
    val success: Boolean,
    val data: List<ProjectDto>?
)

data class ProjectDto(
    val id: String,
    val name: String,
    val description: String?,
    val color: String?,
    val icon: String?,
    val emoji: String? = null, // Project emoji (e.g., "🤖", "📱")
    val conversationCount: Int?,
    val createdAt: String?,
    val updatedAt: String?,
    // Project context fields (AI-learned)
    val context: String? = null,
    val keyTopics: List<String>? = null,
    val techStack: List<String>? = null,
    val goals: List<String>? = null,
    val lastContextUpdate: String? = null,
    val instructions: String? = null, // User-defined instructions
    val customInstructions: String? = null, // Advanced custom instructions
    // Collaboration fields
    val myRole: String? = null, // "admin", "moderator", "viewer", or null if owner
    val isOwner: Boolean? = null,
    val canEdit: Boolean? = null,
    val canDelete: Boolean? = null,
    val canInvite: Boolean? = null,
    val canManageRoles: Boolean? = null,
    val collaboratorCount: Int? = null,
    val owner: ProjectOwnerDto? = null,
    val collaborators: List<CollaboratorDto>? = null
)

data class ProjectDetailResponse(
    val success: Boolean,
    val data: ProjectDto?
)

data class ProjectOwnerDto(
    val id: String?,
    val username: String?,
    val firstName: String?,
    val lastName: String?,
    val email: String?,
    val avatar: String?
)

data class CollaboratorDto(
    val id: String,
    val userId: String?,
    val role: String?,
    val canEdit: Boolean?,
    val canDelete: Boolean?,
    val canInvite: Boolean?,
    val canManageRoles: Boolean?,
    val addedAt: String?,
    val lastAccessedAt: String?,
    val accessCount: Int?,
    val user: ProjectOwnerDto?
)

data class CreateProjectRequest(
    val name: String,
    val description: String? = null,
    val color: String? = null,
    val icon: String? = null,
    val emoji: String? = null,
    val instructions: String? = null
)

data class UpdateProjectRequest(
    val name: String? = null,
    val description: String? = null,
    val color: String? = null,
    val icon: String? = null,
    val emoji: String? = null,
    val instructions: String? = null
)

data class ProjectResponse(
    val success: Boolean,
    val data: ProjectDto?,
    val message: String?
)

// ============================================
// Profile Models
// ============================================

data class ProfileResponse(
    val success: Boolean,
    val data: ProfileData?
)

data class ProfileData(
    val profile: UserProfileDto?,
    val facts: Map<String, List<FactDto>>?,
    val totalFacts: Int?,
    val stats: ProfileStats?
)

data class UserProfileDto(
    val id: String?,
    val userId: String?,
    val preferredLanguage: String?,
    val communicationTone: String?,
    val responseStyle: String?,
    val primaryUseCase: String?,
    val factCount: Int?
)

data class FactDto(
    val id: String,
    val category: String,
    val type: String,
    val key: String,
    val value: String,
    val confidence: Double?,
    val source: String?
)

data class ProfileStats(
    val totalConversations: Int?,
    val totalMessages: Int?,
    val totalTokens: Int?,
    val averageMessagesPerConversation: Double?
)

data class UpdateProfileRequest(
    val displayName: String? = null,
    val preferredLanguage: String? = null,
    val communicationTone: String? = null,
    val responseStyle: String? = null,
    val primaryUseCase: String? = null,
    val customInstructions: String? = null
)

data class ProfileSettingsResponse(
    val success: Boolean,
    val data: UserProfileDto?
)

// ============================================
// Audio/Voice Models
// ============================================

data class AudioUploadResponse(
    val success: Boolean,
    val data: AudioData?,
    val error: String?
)

data class AudioData(
    val id: String?,
    val filename: String?,
    val mimeType: String?,
    val size: Long?,
    val duration: Double?,
    val transcription: String?
)

data class TranscribeRequest(
    val audioId: String,
    val language: String? = null
)

data class TranscriptionResponse(
    val success: Boolean,
    val data: TranscriptionData?,
    val error: String?
)

data class TranscriptionData(
    val text: String?,
    val language: String?,
    val confidence: Double?,
    val duration: Double?
)

data class VoiceChatResponse(
    val success: Boolean,
    val data: VoiceChatData?,
    val error: String?
)

data class VoiceChatData(
    val transcription: String?,
    val response: String?,
    val conversationId: String?,
    val audioUrl: String?
)

data class TTSRequest(
    val text: String,
    val voice: String = "alloy",
    val speed: Float = 1.0f
)

data class TTSVoicesResponse(
    val success: Boolean,
    val data: VoicesData?
)

data class VoicesData(
    val voices: List<VoiceInfo>?
)

data class VoiceInfo(
    val id: String,
    val name: String,
    val provider: String?,
    val language: String?,
    val gender: String?
)

data class TTSStatusResponse(
    val success: Boolean,
    val data: TTSStatus?
)

data class TTSStatus(
    val available: Boolean,
    val providers: List<String>?
)

// ============================================
// Image Upload Models
// ============================================

data class ImagesUploadResponse(
    val success: Boolean,
    val data: ImagesUploadData?,
    val error: String?
)

data class ImagesUploadData(
    val images: List<UploadedImageDto>?
)

data class AvatarUploadResponse(
    val success: Boolean,
    val data: AvatarUploadData?,
    val error: String?,
    val message: String?
)

data class AvatarUploadData(
    val avatarUrl: String?,
    val user: AvatarUserDto?
)

data class AvatarUserDto(
    val id: String,
    val email: String?,
    val firstName: String?,
    val lastName: String?,
    val avatar: String?
)

data class UploadedImageDto(
    val id: String,
    val url: String?,
    val filename: String?,
    val mimeType: String?,
    val size: Long?,
    val ocrText: String?,
    val status: String? // uploading, processing, completed, failed
)

data class ImageDetailResponse(
    val success: Boolean,
    val data: UploadedImageDto?
)

data class ImageStatusResponse(
    val success: Boolean,
    val data: ImageStatus?
)

data class ImageStatus(
    val status: String?,
    val extractedText: String?,
    val error: String?
)

data class OCRResponse(
    val success: Boolean,
    val data: OCRData?,
    val error: String?
)

data class OCRData(
    val text: String?,
    val language: String?,
    val confidence: Double?
)

data class ImageAnalysisResponse(
    val success: Boolean,
    val data: ImageAnalysisData?,
    val error: String?
)

data class ImageAnalysisData(
    val description: String?,
    val labels: List<String>?,
    val confidence: Double?
)

// ============================================
// Image Generation Models
// ============================================

data class ImageGenerationRequest(
    val prompt: String,
    val style: String? = null,
    val aspectRatio: String? = null,
    val model: String? = null,
    val enhancePrompt: Boolean = true,
    val negativePrompt: String? = null,
    val seed: Long? = null
)

data class ImageGenerationResponse(
    val success: Boolean,
    val data: GeneratedImageData?,
    val error: String?
)

data class GeneratedImageData(
    val imageUrl: String?,
    val model: String?,
    val originalPrompt: String?,
    val enhancedPrompt: String?,
    val seed: Long?,
    val generationTime: Long?,
    val style: String?,
    val aspectRatio: String?
)

data class VariationRequest(
    val count: Int = 1,
    val strength: Float = 0.7f
)

data class EnhancePromptRequest(
    val prompt: String,
    val style: String? = null
)

data class EnhancedPromptResponse(
    val success: Boolean,
    val data: EnhancedPromptData?
)

data class EnhancedPromptData(
    val originalPrompt: String?,
    val enhancedPrompt: String?,
    val suggestions: List<String>?
)

data class ImageGenModelsResponse(
    val success: Boolean,
    val data: List<ImageGenModel>?
)

data class ImageGenModel(
    val id: String,
    val name: String,
    val quality: String?,
    val speed: String?,
    val maxResolution: String?
)

data class ImageGenStylesResponse(
    val success: Boolean,
    val data: List<ImageGenStyle>?
)

data class ImageGenStyle(
    val id: String,
    val name: String,
    val description: String?,
    val previewUrl: String?
)

data class AspectRatiosResponse(
    val success: Boolean,
    val data: List<AspectRatioInfo>?
)

data class AspectRatioInfo(
    val id: String,
    val ratio: String,
    val dimensions: String?,
    val useCase: String?
)

data class ImageGenStatusResponse(
    val success: Boolean,
    val data: ImageGenStatusData?
)

data class ImageGenStatusData(
    val canGenerate: Boolean?,
    val remainingToday: Int?,
    val remainingGenerations: Int?,  // Alternative field name
    val dailyLimit: Int?,
    val usedToday: Int?,
    val tier: String?,
    val nextAvailableAt: String?     // ISO timestamp
) {
    fun getRemainingToday(): Int = remainingToday ?: remainingGenerations ?: 0
}

data class ImageGenHistoryResponse(
    val success: Boolean,
    val data: ImageGenHistoryData?
)

data class ImageGenHistoryData(
    val items: List<GeneratedImageData>?,
    val total: Int?
)

// ============================================
// Web Search Models
// ============================================

data class WebSearchRequest(
    val query: String,
    val numResults: Int = 5,
    val dateFilter: String? = null // day, week, month, year
)

data class WebSearchResponse(
    val success: Boolean,
    val data: WebSearchData?,
    val error: String?
)

data class WebSearchData(
    val results: List<SearchResult>?,
    val query: String?,
    val totalResults: Int?
)

data class SearchResult(
    val title: String?,
    val url: String?,
    val snippet: String?,
    val publishedDate: String?
)

data class SearchCheckRequest(
    val query: String
)

data class SearchCheckResponse(
    val success: Boolean,
    val data: SearchCheckData?
)

data class SearchCheckData(
    val needsSearch: Boolean?,
    val reason: String?,
    val suggestedQuery: String?
)

data class SearchStatusResponse(
    val success: Boolean,
    val data: SearchStatus?
)

data class SearchStatus(
    val available: Boolean?,
    val provider: String?
)

// ============================================
// Tags & Modes Models
// ============================================

data class TagsResponse(
    val success: Boolean,
    val data: List<ChatTag>?
)

data class ChatTag(
    val id: String,
    val name: String,
    val description: String?,
    val example: String?,
    val icon: String?
)

data class TagsHelpResponse(
    val success: Boolean,
    val data: TagsHelpData?
)

data class TagsHelpData(
    val tags: List<ChatTag>?,
    val usage: String?
)

data class ModesResponse(
    val success: Boolean,
    val data: List<ChatMode>?
)

data class ChatMode(
    val id: String,
    val name: String,
    val icon: String?,
    val description: String?,
    val temperature: Double?,
    val category: String?
)

data class ModeDetailResponse(
    val success: Boolean,
    val data: ChatMode?
)

data class DetectModeRequest(
    val message: String
)

data class DetectedModeResponse(
    val success: Boolean,
    val data: DetectedModeData?
)

data class DetectedModeData(
    val detectedMode: String?,
    val confidence: Double?,
    val suggestedModes: List<String>?
)

// ============================================
// Memory/Facts Models
// ============================================

data class FactsResponse(
    val success: Boolean,
    val data: FactsData?
)

data class FactsData(
    val facts: List<LearnedFact>?,
    val totalFacts: Int?,
    val categories: Map<String, Int>?
)

data class LearnedFact(
    val id: String,
    val category: String,
    val key: String,
    val value: String,
    val confidence: Double?,
    val source: String?,
    val createdAt: String?
)

data class TeachFactRequest(
    val fact: String
)

data class TeachFactResponse(
    val success: Boolean,
    val data: LearnedFact?,
    val message: String?
)

data class AskProfileRequest(
    val question: String
)

data class AskProfileResponse(
    val success: Boolean,
    val data: AskProfileData?
)

data class AskProfileData(
    val answer: String?,
    val relatedFacts: List<LearnedFact>?
)

data class ProfileSummaryResponse(
    val success: Boolean,
    val data: ProfileSummaryData?
)

data class ProfileSummaryData(
    val summary: String?,
    val factCount: Int?,
    val topInterests: List<String>?,
    val skills: List<String>?
)

// ============================================
// Templates Models
// ============================================

data class TemplatesResponse(
    val success: Boolean,
    val data: List<TemplateDto>?
)

data class TemplateDto(
    val id: String,
    val name: String,
    val description: String?,
    val category: String?,
    val systemPrompt: String?,
    val icon: String?,
    val isDefault: Boolean?,
    val usageCount: Int?
)

data class TemplateDetailResponse(
    val success: Boolean,
    val data: TemplateDto?
)

data class CreateTemplateRequest(
    val name: String,
    val systemPrompt: String,
    val description: String? = null,
    val category: String? = null
)

data class TemplateResponse(
    val success: Boolean,
    val data: TemplateDto?,
    val message: String?
)

data class UseTemplateRequest(
    val title: String? = null
)

data class UseTemplateResponse(
    val success: Boolean,
    val data: ConversationDto?,
    val message: String?
)

data class TemplateCategoriesResponse(
    val success: Boolean,
    val data: List<TemplateCategory>?
)

data class TemplateCategory(
    val id: String,
    val name: String,
    val count: Int?
)

// ============================================
// Export/Share Models
// ============================================

data class ExportPreviewResponse(
    val success: Boolean,
    val data: ExportPreviewData?
)

data class ExportPreviewData(
    val content: String?,
    val format: String?,
    val messageCount: Int?
)

data class CreateShareRequest(
    val conversationId: String,
    val expiresInDays: Int? = null
)

data class ShareLinkResponse(
    val success: Boolean,
    val data: ShareLinkData?,
    val message: String?,
    val error: String?
)

data class ShareLinkData(
    val shareLink: String?,      // Full URL to share
    val shareId: String?,
    val expiresAt: String?,
    val accessCount: Int?
)

data class SharedConversationResponse(
    val success: Boolean,
    val data: SharedConversationData?,
    val error: String?
)

data class SharedConversationData(
    val title: String?,
    val messages: List<MessageDto>?,
    val sharedBy: String?,
    val sharedByAvatar: String?,
    val createdAt: String?,
    val messageCount: Int?,
    val originalConversationId: String? = null
)

// ============================================
// Collaboration Models
// ============================================

data class ProjectContextResponse(
    val success: Boolean,
    val data: ProjectContextData?,
    val error: String?
)

data class ProjectContextData(
    val summary: String?,
    val keyTopics: List<String>?,
    val techStack: List<String>?,
    val goals: List<String>?
)

data class InviteCollaboratorRequest(
    val email: String,
    val role: String = "viewer",  // admin, moderator, viewer
    val message: String? = null
)

data class ChangeRoleRequest(
    val role: String  // admin, moderator, viewer
)

data class InviteResponse(
    val success: Boolean,
    val data: InvitationDto?,
    val message: String?,
    val error: String?
)

// Check email response for invite validation
data class CheckEmailResponse(
    val success: Boolean,
    val data: CheckEmailData?
)

data class CheckEmailData(
    val exists: Boolean,
    val isSelf: Boolean? = null,
    val message: String? = null,
    val user: CheckEmailUserData? = null
)

data class CheckEmailUserData(
    val firstName: String?,
    val lastName: String?,
    val username: String?,
    val avatar: String?
)

data class InvitationDto(
    val id: String,
    val projectId: String,
    val inviteeEmail: String,
    val role: String,
    val status: String,
    val expiresAt: String?
)

data class PendingInvitationsResponse(
    val success: Boolean,
    val data: List<PendingInvitationDto>?
)

data class PendingInvitationDto(
    val id: String,
    val projectId: String,
    val role: String,
    val message: String?,
    val expiresAt: String?,
    val createdAt: String?,
    val project: ProjectSummaryDto?,
    val inviter: UserSummaryDto?
)

data class ProjectSummaryDto(
    val id: String,
    val name: String,
    val description: String?
)

data class UserSummaryDto(
    val id: String,
    val username: String?,
    val firstName: String?,
    val lastName: String?,
    val email: String?
)

data class InvitationResponseRequest(
    val accept: Boolean
)

data class CollaborationsResponse(
    val success: Boolean,
    val data: List<CollaborationProjectDto>?
)

data class CollaborationProjectDto(
    val id: String,
    val name: String,
    val description: String?,
    val myRole: String,
    val conversationCount: Int?,
    val owner: UserSummaryDto?
)

data class CollaboratorsResponse(
    val success: Boolean,
    val data: CollaboratorsData?
)

data class CollaboratorsData(
    val owner: UserSummaryDto?,
    val collaborators: List<CollaboratorDto>?
)
// Note: CollaboratorDto is defined near ProjectDto with all permission fields

// ============================================
// Project Chat Models
// ============================================

data class ProjectChatMessagesResponse(
    val success: Boolean,
    val data: ProjectChatData?
)

data class ProjectChatData(
    val messages: List<ProjectChatMessageDto>?,
    val canSendMessage: Boolean?,
    val settings: ProjectChatSettingsWithPermissions?,
    val myRole: String?,
    val isOwner: Boolean?
)

data class ProjectChatMessageDto(
    val id: String,
    val projectId: String,
    val senderId: String,
    val content: String,
    val messageType: String?, // text, image, system
    val imageUrl: String?,
    val isEdited: Boolean?,
    val editedAt: String?,
    val replyTo: ProjectChatReplyDto?,
    val sender: ProjectChatSenderDto?,
    val senderRole: String?, // admin, moderator, viewer
    val isOwner: Boolean?,
    val canEdit: Boolean?,
    val canDeleteForMe: Boolean?,
    val canDeleteForEveryone: Boolean?,
    val createdAt: String?,
    val updatedAt: String?
)

data class ProjectChatReplyDto(
    val id: String,
    val content: String?,
    val senderId: String?
)

data class ProjectChatSenderDto(
    val id: String,
    val firstName: String?,
    val lastName: String?,
    val username: String?,
    val avatar: String?,
    val email: String?
)

data class ProjectChatSettingsDto(
    val chatAccess: String?, // all, admin_moderator, admin_only
    val allowImages: Boolean?,
    val allowEmojis: Boolean?,
    val allowEditing: Boolean?,
    val allowDeleting: Boolean?
)

data class ProjectChatSettingsResponse(
    val success: Boolean,
    val data: ProjectChatSettingsWithPermissions?
)

data class ProjectChatSettingsWithPermissions(
    val id: String?,
    val projectId: String?,
    val chatAccess: String?,
    val allowImages: Boolean?,
    val allowEmojis: Boolean?,
    val allowEditing: Boolean?,
    val allowDeleting: Boolean?,
    val canSendMessage: Boolean?,
    val myRole: String?,
    val isOwner: Boolean?
)

data class SendProjectChatMessageRequest(
    val content: String,
    val messageType: String = "text",
    val imageUrl: String? = null,
    val replyToId: String? = null
)

data class EditProjectChatMessageRequest(
    val content: String
)

data class SendProjectChatMessageResponse(
    val success: Boolean,
    val data: ProjectChatMessageDto?,
    val message: String?
)

data class UpdateProjectChatSettingsRequest(
    val chatAccess: String? = null,
    val allowImages: Boolean? = null,
    val allowEmojis: Boolean? = null,
    val allowEditing: Boolean? = null,
    val allowDeleting: Boolean? = null
)

data class ProjectChatUnreadCountResponse(
    val success: Boolean,
    val data: ProjectChatUnreadData?
)

data class ProjectChatUnreadData(
    val unreadCount: Int?
)

data class DeleteMessageResponse(
    val success: Boolean,
    val message: String?,
    val deleteType: String? // "everyone" or "me"
)

// ============================================
// Analytics Models
// ============================================

data class AnalyticsDashboardResponse(
    val success: Boolean,
    val data: AnalyticsDashboardData?
)

data class AnalyticsDashboardData(
    val totalMessages: Int?,
    val totalTokens: Long?,
    val totalConversations: Int?,
    val totalProjects: Int?,
    val modelUsage: Map<String, Int>?,
    val dailyUsage: List<DailyUsage>?
)

data class DailyUsage(
    val date: String?,
    val messages: Int?,
    val tokens: Long?
)

data class UsageStatsResponse(
    val success: Boolean,
    val data: UsageStatsData?
)

data class UsageStatsData(
    val period: String?,
    val messages: Int?,
    val tokens: Long?,
    val conversations: Int?
)

data class TokenStatsResponse(
    val success: Boolean,
    val data: TokenStatsData?
)

data class TokenStatsData(
    val totalTokens: Long?,
    val promptTokens: Long?,
    val completionTokens: Long?,
    val dailyBreakdown: List<DailyUsage>?
)

// ============================================
// File Upload Models
// ============================================

data class FileUploadResponse(
    val success: Boolean,
    val data: UploadedFileDto?,
    val error: String?
)

/**
 * Upload status response (daily limits)
 */
data class UploadStatusResponse(
    val success: Boolean,
    val data: UploadStatusData?,
    val error: String?
)

data class UploadStatusData(
    val uploadsUsedToday: Int? = null,       // New field name
    val documentsUsedToday: Int? = null,     // Old field name (backward compat)
    val dailyLimit: Int,
    val remaining: Int,
    val canUpload: Boolean,
    val nextAvailableAt: String? = null      // ISO timestamp for next available
) {
    // Get used count from either field
    fun getUsedToday(): Int = uploadsUsedToday ?: documentsUsedToday ?: 0
}

data class UploadedFileDto(
    val id: String,
    val originalName: String?, // Backend uses originalName
    val filename: String?,     // Also accept filename
    val storedName: String?,   // Backend also sends storedName
    val mimeType: String?,
    val size: Long?,
    val status: String?,
    val extractedText: String?,
    val url: String?
)

data class FileDetailResponse(
    val success: Boolean,
    val data: UploadedFileDto?
)

data class FileStatusResponse(
    val success: Boolean,
    val data: FileStatus?
)

data class FileStatus(
    val id: String?,
    val status: String?,
    val extractedText: String?,
    val analysisResult: String?,
    val url: String?,
    val name: String?,
    val error: String?
)

data class FileContentResponse(
    val success: Boolean,
    val data: FileContentData?
)

data class FileContentData(
    val content: String?,
    val wordCount: Int?,
    val characterCount: Int?
)

// ============================================
// Translation Models
// ============================================

data class TranslateRequest(
    val text: String,
    val from: String? = null,
    val to: String? = null
)

data class TranslateResponse(
    val success: Boolean,
    val data: TranslateData?,
    val error: String?
)

data class TranslateData(
    val originalText: String?,
    val translatedText: String?,
    val sourceLanguage: String?,
    val targetLanguage: String?
)

data class DetectLanguageRequest(
    val text: String
)

data class DetectLanguageResponse(
    val success: Boolean,
    val data: DetectedLanguageData?,
    val error: String?
)

data class DetectedLanguageData(
    val primaryLanguage: String?,
    val isRomanUrdu: Boolean?,
    val confidence: Double?,
    val detectedLanguages: List<String>?
)

data class SupportedLanguagesResponse(
    val success: Boolean,
    val data: List<LanguageInfo>?
)

data class LanguageInfo(
    val code: String,
    val name: String,
    val nativeName: String?
)

// ============================================
// Provider Health Models
// ============================================

data class ProvidersHealthResponse(
    val success: Boolean,
    val data: ProvidersHealth?
)

data class ProvidersHealth(
    val providers: Map<String, ProviderStatus>?,
    val overall: String?
)

data class ProviderStatus(
    val available: Boolean,
    val latency: Long?,
    val lastChecked: String?
)

// ============================================
// Prompt Analysis & AI Mode Models
// ============================================

/**
 * Request to analyze a prompt before sending
 */
data class AnalyzePromptRequest(
    val message: String,
    val attachments: List<AttachmentInfo>? = null
)

data class AttachmentInfo(
    val type: String, // "image", "csv", "pdf", "document"
    val id: String? = null,
    val mimeType: String? = null
)

/**
 * Response from prompt analysis
 */
data class AnalyzePromptResponse(
    val success: Boolean,
    val data: AnalyzePromptData?
)

data class AnalyzePromptData(
    val mode: DetectedModeInfo?,
    val intent: String?,
    val format: String?,
    val complexity: String?,
    val language: String?,
    val specialInstructions: SpecialInstructions?,
    val suggestedSettings: SuggestedSettings?,
    val formattingHints: String?
)

data class DetectedModeInfo(
    val detected: String?,
    val confidence: Double?,
    val keywords: List<String>?,
    val alternatives: List<String>?,
    val config: ModeConfigInfo?
)

data class ModeConfigInfo(
    val displayName: String?,
    val icon: String?,
    val description: String?,
    val requiresSpecialAPI: Boolean?
)

data class SpecialInstructions(
    val useHeadings: Boolean?,
    val useBulletPoints: Boolean?,
    val useNumberedList: Boolean?,
    val makeTable: Boolean?,
    val highlightImportant: Boolean?,
    val addExamples: Boolean?,
    val useCodeBlock: Boolean?,
    val codeLanguage: String?
)

data class SuggestedSettings(
    val temperature: Double?,
    val maxTokens: Int?
)

/**
 * Response for available AI modes
 */
data class AIModesResponse(
    val success: Boolean,
    val data: AIModesData?
)

data class AIModesData(
    val modes: List<AIModeDto>?,
    val total: Int?
)

data class AIModeDto(
    val id: String,
    val displayName: String?,
    val icon: String?,
    val description: String?,
    val capabilities: List<String>?,
    val requiresSpecialAPI: Boolean?,
    val dailyLimits: DailyLimitsDto?
)

data class DailyLimitsDto(
    val free: Int?,
    val pro: Int?,
    val enterprise: Int?
)

/**
 * Response for user usage and quotas
 */
data class UsageResponse(
    val success: Boolean,
    val data: UsageData?
)

data class UsageData(
    val tier: String?,
    val usage: UsageBreakdown?,
    val resetAt: String?,
    val limits: UserLimits?
)

data class UsageBreakdown(
    val messages: UsageItem?,
    val images: UsageItem?
)

data class UsageItem(
    val used: Int?,
    val limit: Int?,
    val remaining: Int?,
    val percentage: Int?
)

data class UserLimits(
    val messages: Int?,
    val images: Int?,
    val voice: Int?,
    val search: Int?
)

/**
 * Request for follow-up suggestions
 */
data class SuggestionsRequest(
    val conversationId: String? = null,
    val lastResponse: String? = null
)

/**
 * Response for follow-up suggestions
 */
data class SuggestionsResponse(
    val success: Boolean,
    val data: SuggestionsData?
)

data class SuggestionsData(
    val suggestions: List<String>?
)

// ============================================
// Webhook Models
// ============================================

data class WebhooksResponse(
    val success: Boolean,
    val data: List<WebhookDto>?
)

data class WebhookDto(
    val id: String,
    val url: String?,
    val events: List<String>?,
    val isActive: Boolean?,
    val createdAt: String?,
    val lastDelivery: String?,
    val deliverySuccessRate: Double?
)

data class WebhookEventsResponse(
    val success: Boolean,
    val data: List<WebhookEventInfo>?
)

data class WebhookEventInfo(
    val event: String,
    val description: String?
)

data class CreateWebhookRequest(
    val url: String,
    val events: List<String>
)

data class CreateWebhookResponse(
    val success: Boolean,
    val data: CreatedWebhookData?,
    val message: String?
)

data class CreatedWebhookData(
    val id: String?,
    val url: String?,
    val events: List<String>?,
    val secret: String?, // Only shown once!
    val isActive: Boolean?,
    val createdAt: String?
)

data class WebhookDetailResponse(
    val success: Boolean,
    val data: WebhookDto?
)

data class UpdateWebhookRequest(
    val url: String? = null,
    val events: List<String>? = null,
    val isActive: Boolean? = null
)

data class UpdateWebhookResponse(
    val success: Boolean,
    val message: String?
)

data class TestWebhookResponse(
    val success: Boolean,
    val message: String?
)

data class WebhookDeliveriesResponse(
    val success: Boolean,
    val data: List<WebhookDelivery>?
)

data class WebhookDelivery(
    val id: String,
    val event: String?,
    val status: String?,
    val responseCode: Int?,
    val duration: Long?,
    val createdAt: String?,
    val error: String?
)

// ============================================
// API Key Models
// ============================================

data class ApiKeysResponse(
    val success: Boolean,
    val data: List<ApiKeyDto>?
)

data class ApiKeyDto(
    val id: String,
    val name: String?,
    @SerializedName("key_preview")
    val keyPreview: String?, // Last 4 chars only
    val permissions: List<String>?,
    val rateLimit: Int?,
    val isActive: Boolean?,
    val expiresAt: String?,
    val createdAt: String?,
    val lastUsed: String?,
    val usageCount: Int?
)

data class CreateApiKeyRequest(
    val name: String,
    val permissions: List<String>? = null,
    val rateLimit: Int? = null,
    val expiresInDays: Int? = null
)

data class CreateApiKeyResponse(
    val success: Boolean,
    val data: CreatedApiKeyData?,
    val message: String?
)

data class CreatedApiKeyData(
    val key: String?, // Only shown once!
    val id: String?,
    val name: String?,
    val permissions: List<String>?,
    val expiresAt: String?
)

data class ApiKeyDetailResponse(
    val success: Boolean,
    val data: ApiKeyDto?
)

data class UpdateApiKeyRequest(
    val name: String? = null,
    val permissions: List<String>? = null,
    val rateLimit: Int? = null,
    val isActive: Boolean? = null
)

data class UpdateApiKeyResponse(
    val success: Boolean,
    val message: String?
)

data class RotateApiKeyResponse(
    val success: Boolean,
    val data: RotatedKeyData?,
    val message: String?
)

data class RotatedKeyData(
    val newKey: String? // Only shown once!
)

data class ApiKeyUsageResponse(
    val success: Boolean,
    val data: ApiKeyUsageData?
)

data class ApiKeyUsageData(
    val totalRequests: Int?,
    val requestsToday: Int?,
    val lastRequest: String?,
    val dailyBreakdown: List<DailyUsage>?
)

// ============================================
// GDPR Models
// ============================================

data class GDPRExportResponse(
    val success: Boolean,
    val data: GDPRExportData?,
    val message: String?
)

data class GDPRExportData(
    val exportId: String?,
    val status: String?,
    val downloadUrl: String?,
    val expiresAt: String?
)

data class GDPRDeleteResponse(
    val success: Boolean,
    val message: String?
)
