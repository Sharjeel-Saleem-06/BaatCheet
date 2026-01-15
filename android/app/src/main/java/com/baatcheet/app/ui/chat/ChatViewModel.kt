package com.baatcheet.app.ui.chat

import android.content.SharedPreferences
import android.net.Uri
import androidx.lifecycle.ViewModel
import androidx.lifecycle.viewModelScope
import com.baatcheet.app.data.repository.*
import com.baatcheet.app.domain.model.ChatMessage
import com.baatcheet.app.domain.model.Conversation
import com.baatcheet.app.domain.model.MessageRole
import com.baatcheet.app.domain.model.Project
import com.baatcheet.app.domain.model.UserProfile
import com.baatcheet.app.ui.login.UserData
import com.google.gson.Gson
import dagger.hilt.android.lifecycle.HiltViewModel
import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.flow.StateFlow
import kotlinx.coroutines.flow.asStateFlow
import kotlinx.coroutines.flow.update
import kotlinx.coroutines.launch
import okhttp3.MediaType.Companion.toMediaTypeOrNull
import okhttp3.MultipartBody
import okhttp3.RequestBody.Companion.asRequestBody
import okhttp3.RequestBody.Companion.toRequestBody
import java.io.File
import javax.inject.Inject

/**
 * Uploaded file state for attachments
 */
data class UploadedFileState(
    val id: String,
    val uri: Uri,
    val filename: String,
    val mimeType: String,
    val status: FileUploadStatus = FileUploadStatus.PENDING,
    val remoteId: String? = null,
    val previewUrl: String? = null,
    val extractedText: String? = null
)

enum class FileUploadStatus {
    PENDING,
    UPLOADING,
    PROCESSING,
    READY,
    FAILED
}

/**
 * Chat UI State
 */
data class ChatState(
    val messages: List<ChatMessage> = emptyList(),
    val isLoading: Boolean = false,
    val currentConversationId: String? = null,
    val error: String? = null,
    
    // Conversations
    val conversations: List<Conversation> = emptyList(),
    val isLoadingConversations: Boolean = false,
    
    // Projects
    val projects: List<Project> = emptyList(),
    val isLoadingProjects: Boolean = false,
    
    // User
    val userProfile: UserProfile? = null,
    
    // Uploaded files (images, documents)
    val uploadedFiles: List<UploadedFileState> = emptyList(),
    val isUploading: Boolean = false,
    
    // Tags & Modes
    val availableTags: List<Tag> = emptyList(),
    val availableModes: List<Mode> = emptyList(),
    val selectedMode: Mode? = null,
    val detectedMode: String? = null,
    
    // Advanced AI Modes (from new API)
    val aiModes: List<com.baatcheet.app.domain.model.AIMode> = com.baatcheet.app.domain.model.AIMode.DEFAULT_MODES,
    val currentAIMode: com.baatcheet.app.domain.model.AIMode? = null,
    
    // Prompt Analysis
    val isAnalyzingPrompt: Boolean = false,
    val promptAnalysis: com.baatcheet.app.domain.model.PromptAnalysisResult? = null,
    
    // Usage & Quotas
    val usageInfo: com.baatcheet.app.domain.model.UsageInfo = com.baatcheet.app.domain.model.UsageInfo.DEFAULT,
    val isLoadingUsage: Boolean = false,
    
    // Follow-up Suggestions
    val suggestions: List<String> = emptyList(),
    val isLoadingSuggestions: Boolean = false,
    
    // Language Detection
    val detectedLanguage: String = "english",
    val isRomanUrdu: Boolean = false,
    
    // Share
    val shareableText: String? = null,
    val shareUrl: String? = null,
    val isSharing: Boolean = false,
    
    // Current Project Context
    val currentProjectId: String? = null,
    
    // Collaborations (shared projects)
    val collaborations: List<Project> = emptyList(),
    val pendingInvitationsCount: Int = 0,
    val pendingInvitations: List<com.baatcheet.app.domain.model.PendingInvitation> = emptyList(),
    val isLoadingInvitations: Boolean = false,
    val projectCollaborators: com.baatcheet.app.data.repository.ProjectCollaborators? = null,
    val isLoadingCollaborators: Boolean = false,
    
    // Templates
    val templates: List<Template> = emptyList(),
    val isLoadingTemplates: Boolean = false,
    
    // Image Generation
    val imageGenStatus: ImageGenStatus? = null,
    val availableStyles: List<ImageStyle> = emptyList(),
    val generatedImage: GeneratedImage? = null,
    val isGeneratingImage: Boolean = false,
    
    // File Upload Limits (combined for files, images, camera)
    val uploadLimitReached: Boolean = false,
    val uploadsUsedToday: Int = 0,
    val uploadDailyLimit: Int = 2,
    val uploadNextAvailableAt: String? = null,  // ISO timestamp
    
    // Image Generation Limits
    val imageGenLimitReached: Boolean = false,
    
    // Voice
    val isRecording: Boolean = false,
    val isTranscribing: Boolean = false,
    val transcribedText: String? = null,
    val isSpeaking: Boolean = false,
    
    // Analytics
    val analyticsDashboard: AnalyticsDashboard? = null,
    
    // Learned Facts
    val learnedFacts: List<Fact> = emptyList(),
    val profileSummary: ProfileSummary? = null,
    
    // Mode Selector
    val showModeSelector: Boolean = false
)

/**
 * Chat ViewModel - MVVM Pattern with real API calls
 */
@HiltViewModel
class ChatViewModel @Inject constructor(
    private val chatRepository: ChatRepository,
    private val prefs: SharedPreferences
) : ViewModel() {
    
    private val _state = MutableStateFlow(ChatState())
    val state: StateFlow<ChatState> = _state.asStateFlow()
    
    private val gson = Gson()
    
    init {
        loadUserProfile()
        loadConversations()
        loadProjects()
        loadAIModes()
        loadUsage()
        loadUploadStatus()
    }
    
    // ============================================
    // User Profile
    // ============================================
    
    private fun loadUserProfile() {
        val userJson = prefs.getString("user_data", null)
        if (userJson != null) {
            try {
                val userData = gson.fromJson(userJson, UserData::class.java)
                _state.update {
                    it.copy(
                        userProfile = UserProfile(
                            id = userData.id,
                            email = userData.email,
                            firstName = userData.firstName,
                            lastName = userData.lastName,
                            avatar = userData.avatar
                        )
                    )
                }
            } catch (e: Exception) {
                // Ignore parsing errors
            }
        }
    }
    
    // ============================================
    // Chat Operations
    // ============================================
    
    /**
     * Send a message with optional explicit mode
     * @param selectedMode Explicit mode like "image-generation", "code", "web-search", "research"
     */
    fun sendMessage(content: String, selectedMode: String? = null) {
        if (content.isBlank()) return
        
        // Store the selected mode for the API call
        val modeToSend = selectedMode
        
        // Check if this is an image generation request
        val isImageRequest = selectedMode == "image-generation" || 
                            content.lowercase().let { 
                                it.contains("create image") || 
                                it.contains("generate image") || 
                                it.contains("draw") ||
                                it.contains("make image") ||
                                it.contains("image of")
                            }
        
        // Set image generating state if applicable
        if (isImageRequest) {
            _state.update { it.copy(isGeneratingImage = true) }
        }
        
        // Convert uploaded files to message attachments
        val messageAttachments = _state.value.uploadedFiles.filter { 
            it.status == FileUploadStatus.READY || it.status == FileUploadStatus.PROCESSING 
        }.map { file ->
            com.baatcheet.app.domain.model.MessageAttachment(
                id = file.remoteId ?: file.id,
                filename = file.filename,
                mimeType = file.mimeType,
                thumbnailUri = file.uri.toString(),
                status = file.status.name.lowercase()
            )
        }
        
        // Add user message immediately with attachments
        val userMessage = ChatMessage(
            content = content.trim(),
            role = MessageRole.USER,
            conversationId = _state.value.currentConversationId,
            attachments = messageAttachments
        )
        
        _state.update { 
            it.copy(
                messages = it.messages + userMessage,
                isLoading = true,
                error = null
            )
        }
        
        // Add streaming placeholder
        val streamingMessage = ChatMessage(
            content = "",
            role = MessageRole.ASSISTANT,
            isStreaming = true
        )
        
        _state.update { 
            it.copy(messages = it.messages + streamingMessage)
        }
        
        // Get uploaded file IDs for context
        val uploadedFileIds = getUploadedFileIds()
        
        // Send to API
        viewModelScope.launch {
            when (val result = chatRepository.sendMessage(
                message = content,
                conversationId = _state.value.currentConversationId,
                mode = modeToSend,
                imageIds = uploadedFileIds.ifEmpty { null }
            )) {
                is ApiResult.Success -> {
                    val response = result.data
                    
                    _state.update { state ->
                        val updatedMessages = state.messages.toMutableList()
                        val lastIndex = updatedMessages.lastIndex
                        
                        if (lastIndex >= 0 && updatedMessages[lastIndex].isStreaming) {
                            updatedMessages[lastIndex] = response.copy(isStreaming = false)
                        }
                        
                        state.copy(
                            messages = updatedMessages,
                            isLoading = false,
                            isGeneratingImage = false, // Clear image generation state
                            currentConversationId = response.conversationId ?: state.currentConversationId,
                            promptAnalysis = null // Clear analysis after sending
                        )
                    }
                    
                    // Refresh conversations list
                    loadConversations()
                    
                    // Load follow-up suggestions based on the response
                    loadSuggestions(response.content)
                    
                    // Refresh usage (message count increased)
                    loadUsage()
                }
                
                is ApiResult.Error -> {
                    _state.update { state ->
                        val updatedMessages = state.messages.toMutableList()
                        val lastIndex = updatedMessages.lastIndex
                        
                        if (lastIndex >= 0 && updatedMessages[lastIndex].isStreaming) {
                            updatedMessages[lastIndex] = ChatMessage(
                                content = "Sorry, I couldn't process your request. Please try again.",
                                role = MessageRole.ASSISTANT,
                                isStreaming = false
                            )
                        }
                        
                        state.copy(
                            messages = updatedMessages,
                            isLoading = false,
                            isGeneratingImage = false, // Clear image generation state on error
                            error = result.message
                        )
                    }
                }
                
                is ApiResult.Loading -> { /* Already handled */ }
            }
        }
    }
    
    /**
     * Start a new chat
     */
    fun startNewChat() {
        _state.update { 
            it.copy(
                messages = emptyList(),
                currentConversationId = null,
                error = null
            )
        }
    }
    
    /**
     * Load a specific conversation
     */
    fun loadConversation(conversationId: String) {
        viewModelScope.launch {
            _state.update { it.copy(isLoading = true) }
            
            when (val result = chatRepository.getConversation(conversationId)) {
                is ApiResult.Success -> {
                    _state.update {
                        it.copy(
                            messages = result.data.messages,
                            currentConversationId = conversationId,
                            isLoading = false
                        )
                    }
                }
                
                is ApiResult.Error -> {
                    _state.update {
                        it.copy(
                            isLoading = false,
                            error = result.message
                        )
                    }
                }
                
                is ApiResult.Loading -> { /* Already handled */ }
            }
        }
    }
    
    /**
     * Delete a conversation
     */
    fun deleteConversation(conversationId: String) {
        viewModelScope.launch {
            when (val result = chatRepository.deleteConversation(conversationId)) {
                is ApiResult.Success -> {
                    // If current conversation was deleted, start new chat
                    if (_state.value.currentConversationId == conversationId) {
                        startNewChat()
                    }
                    loadConversations()
                }
                
                is ApiResult.Error -> {
                    _state.update { it.copy(error = result.message) }
                }
                
                is ApiResult.Loading -> { /* Ignore */ }
            }
        }
    }
    
    /**
     * Pin/unpin a conversation
     */
    fun togglePinConversation(conversationId: String) {
        viewModelScope.launch {
            val conversation = _state.value.conversations.find { it.id == conversationId }
            val newPinnedState = !(conversation?.isPinned ?: false)
            
            when (val result = chatRepository.updateConversation(
                conversationId = conversationId,
                isPinned = newPinnedState
            )) {
                is ApiResult.Success -> {
                    loadConversations()
                }
                is ApiResult.Error -> {
                    _state.update { it.copy(error = result.message) }
                }
                is ApiResult.Loading -> { /* Ignore */ }
            }
        }
    }
    
    /**
     * Archive/unarchive a conversation
     */
    fun toggleArchiveConversation(conversationId: String) {
        viewModelScope.launch {
            val conversation = _state.value.conversations.find { it.id == conversationId }
            val newArchivedState = !(conversation?.isArchived ?: false)
            
            when (val result = chatRepository.updateConversation(
                conversationId = conversationId,
                isArchived = newArchivedState
            )) {
                is ApiResult.Success -> {
                    // If current conversation was archived, start new chat
                    if (_state.value.currentConversationId == conversationId && newArchivedState) {
                        startNewChat()
                    }
                    loadConversations()
                }
                is ApiResult.Error -> {
                    _state.update { it.copy(error = result.message) }
                }
                is ApiResult.Loading -> { /* Ignore */ }
            }
        }
    }
    
    /**
     * Rename a conversation
     */
    fun renameConversation(conversationId: String, newTitle: String) {
        viewModelScope.launch {
            when (val result = chatRepository.updateConversation(
                conversationId = conversationId,
                title = newTitle
            )) {
                is ApiResult.Success -> {
                    loadConversations()
                }
                is ApiResult.Error -> {
                    _state.update { it.copy(error = result.message) }
                }
                is ApiResult.Loading -> { /* Ignore */ }
            }
        }
    }
    
    /**
     * Pin/Unpin a conversation
     */
    fun togglePinConversation(conversationId: String, isPinned: Boolean) {
        viewModelScope.launch {
            chatRepository.updateConversation(conversationId, isPinned = !isPinned)
            loadConversations()
        }
    }
    
    // ============================================
    // Conversations
    // ============================================
    
    /**
     * Load all conversations
     */
    fun loadConversations() {
        viewModelScope.launch {
            _state.update { it.copy(isLoadingConversations = true) }
            
            when (val result = chatRepository.getConversations()) {
                is ApiResult.Success -> {
                    _state.update {
                        it.copy(
                            conversations = result.data,
                            isLoadingConversations = false
                        )
                    }
                }
                
                is ApiResult.Error -> {
                    _state.update {
                        it.copy(isLoadingConversations = false)
                    }
                }
                
                is ApiResult.Loading -> { /* Already handled */ }
            }
        }
    }
    
    /**
     * Search conversations
     */
    fun searchConversations(query: String) {
        if (query.isBlank()) {
            loadConversations()
            return
        }
        
        viewModelScope.launch {
            _state.update { it.copy(isLoadingConversations = true) }
            
            when (val result = chatRepository.searchConversations(query)) {
                is ApiResult.Success -> {
                    _state.update {
                        it.copy(
                            conversations = result.data,
                            isLoadingConversations = false
                        )
                    }
                }
                
                is ApiResult.Error -> {
                    _state.update {
                        it.copy(isLoadingConversations = false)
                    }
                }
                
                is ApiResult.Loading -> { /* Already handled */ }
            }
        }
    }
    
    // ============================================
    // Projects
    // ============================================
    
    /**
     * Load all projects
     */
    fun loadProjects() {
        viewModelScope.launch {
            _state.update { it.copy(isLoadingProjects = true) }
            
            when (val result = chatRepository.getProjects()) {
                is ApiResult.Success -> {
                    _state.update {
                        it.copy(
                            projects = result.data,
                            isLoadingProjects = false
                        )
                    }
                }
                
                is ApiResult.Error -> {
                    _state.update {
                        it.copy(isLoadingProjects = false)
                    }
                }
                
                is ApiResult.Loading -> { /* Already handled */ }
            }
            
            // Also load collaborations and pending invitations
            loadCollaborations()
            loadPendingInvitationsCount()
        }
    }
    
    /**
     * Load projects where user is a collaborator
     */
    private fun loadCollaborations() {
        viewModelScope.launch {
            when (val result = chatRepository.getCollaborations()) {
                is ApiResult.Success -> {
                    _state.update { it.copy(collaborations = result.data) }
                }
                is ApiResult.Error -> { /* Silently fail */ }
                is ApiResult.Loading -> { }
            }
        }
    }
    
    /**
     * Load count of pending invitations
     */
    private fun loadPendingInvitationsCount() {
        viewModelScope.launch {
            when (val result = chatRepository.getPendingInvitationsCount()) {
                is ApiResult.Success -> {
                    _state.update { it.copy(pendingInvitationsCount = result.data) }
                }
                is ApiResult.Error -> { /* Silently fail */ }
                is ApiResult.Loading -> { }
            }
        }
    }
    
    /**
     * Load pending invitations list
     */
    fun loadPendingInvitations() {
        viewModelScope.launch {
            _state.update { it.copy(isLoadingInvitations = true) }
            
            when (val result = chatRepository.getPendingInvitations()) {
                is ApiResult.Success -> {
                    _state.update { 
                        it.copy(
                            pendingInvitations = result.data,
                            pendingInvitationsCount = result.data.size,
                            isLoadingInvitations = false
                        )
                    }
                }
                is ApiResult.Error -> {
                    _state.update { it.copy(isLoadingInvitations = false) }
                }
                is ApiResult.Loading -> { }
            }
        }
    }
    
    /**
     * Accept or reject a project invitation
     */
    fun respondToInvitation(invitationId: String, accept: Boolean, onResult: (Boolean, String) -> Unit) {
        viewModelScope.launch {
            when (val result = chatRepository.respondToInvitation(invitationId, accept)) {
                is ApiResult.Success -> {
                    // Refresh invitations and collaborations
                    loadPendingInvitations()
                    loadCollaborations()
                    loadProjects()
                    onResult(true, if (accept) "You are now a collaborator!" else "Invitation declined")
                }
                is ApiResult.Error -> {
                    onResult(false, result.message)
                }
                is ApiResult.Loading -> { }
            }
        }
    }
    
    /**
     * Load collaborators for a project
     */
    fun loadProjectCollaborators(projectId: String) {
        viewModelScope.launch {
            _state.update { it.copy(isLoadingCollaborators = true) }
            
            when (val result = chatRepository.getProjectCollaborators(projectId)) {
                is ApiResult.Success -> {
                    _state.update { 
                        it.copy(
                            projectCollaborators = result.data,
                            isLoadingCollaborators = false
                        )
                    }
                }
                is ApiResult.Error -> {
                    _state.update { it.copy(isLoadingCollaborators = false) }
                }
                is ApiResult.Loading -> { }
            }
        }
    }
    
    /**
     * Remove a collaborator from a project
     */
    fun removeCollaborator(projectId: String, userId: String, onResult: (Boolean, String) -> Unit) {
        viewModelScope.launch {
            when (val result = chatRepository.removeCollaborator(projectId, userId)) {
                is ApiResult.Success -> {
                    loadProjectCollaborators(projectId)
                    onResult(true, "Collaborator removed")
                }
                is ApiResult.Error -> {
                    onResult(false, result.message)
                }
                is ApiResult.Loading -> { }
            }
        }
    }
    
    /**
     * Clear project collaborators state
     */
    fun clearProjectCollaborators() {
        _state.update { it.copy(projectCollaborators = null) }
    }
    
    /**
     * Create a new project
     */
    fun createProject(name: String, description: String? = null, color: String? = null) {
        viewModelScope.launch {
            when (val result = chatRepository.createProject(name, description, color)) {
                is ApiResult.Success -> {
                    loadProjects()
                }
                
                is ApiResult.Error -> {
                    _state.update { it.copy(error = result.message) }
                }
                
                is ApiResult.Loading -> { /* Ignore */ }
            }
        }
    }
    
    /**
     * Delete a project
     */
    fun deleteProject(projectId: String) {
        viewModelScope.launch {
            when (val result = chatRepository.deleteProject(projectId)) {
                is ApiResult.Success -> {
                    loadProjects()
                }
                
                is ApiResult.Error -> {
                    _state.update { it.copy(error = result.message) }
                }
                
                is ApiResult.Loading -> { /* Ignore */ }
            }
        }
    }
    
    /**
     * Load conversations for a specific project
     */
    fun loadProjectConversations(projectId: String) {
        viewModelScope.launch {
            _state.update { it.copy(
                isLoadingConversations = true,
                currentProjectId = projectId
            ) }
            
            when (val result = chatRepository.getProjectConversations(projectId)) {
                is ApiResult.Success -> {
                    _state.update { it.copy(
                        conversations = result.data,
                        isLoadingConversations = false
                    ) }
                }
                
                is ApiResult.Error -> {
                    _state.update { it.copy(
                        error = result.message,
                        isLoadingConversations = false
                    ) }
                }
                
                is ApiResult.Loading -> { /* Ignore */ }
            }
        }
    }
    
    // ============================================
    // Advanced AI Features
    // ============================================
    
    /**
     * Load all available AI modes from backend
     */
    fun loadAIModes() {
        viewModelScope.launch {
            when (val result = chatRepository.getAIModes()) {
                is ApiResult.Success -> {
                    _state.update {
                        it.copy(
                            aiModes = result.data,
                            currentAIMode = result.data.firstOrNull()
                        )
                    }
                }
                is ApiResult.Error -> {
                    // Use default modes if API fails
                    _state.update {
                        it.copy(aiModes = com.baatcheet.app.domain.model.AIMode.DEFAULT_MODES)
                    }
                }
                is ApiResult.Loading -> { /* Ignore */ }
            }
        }
    }
    
    /**
     * Load current usage and quotas
     */
    fun loadUsage() {
        viewModelScope.launch {
            _state.update { it.copy(isLoadingUsage = true) }
            
            when (val result = chatRepository.getUsage()) {
                is ApiResult.Success -> {
                    _state.update {
                        it.copy(
                            usageInfo = result.data,
                            isLoadingUsage = false
                        )
                    }
                }
                is ApiResult.Error -> {
                    _state.update { it.copy(isLoadingUsage = false) }
                }
                is ApiResult.Loading -> { /* Ignore */ }
            }
        }
    }
    
    /**
     * Analyze a prompt before sending to get AI recommendations
     */
    fun analyzePrompt(message: String) {
        if (message.isBlank()) return
        
        viewModelScope.launch {
            _state.update { it.copy(isAnalyzingPrompt = true) }
            
            when (val result = chatRepository.analyzePrompt(message)) {
                is ApiResult.Success -> {
                    val analysis = result.data
                    
                    // Find the detected mode from our list
                    val detectedAIMode = _state.value.aiModes.find { 
                        it.id == analysis.detectedMode 
                    }
                    
                    _state.update {
                        it.copy(
                            promptAnalysis = analysis,
                            currentAIMode = detectedAIMode ?: it.currentAIMode,
                            detectedLanguage = analysis.language,
                            isRomanUrdu = analysis.language == "urdu" || analysis.language == "mixed",
                            isAnalyzingPrompt = false
                        )
                    }
                }
                is ApiResult.Error -> {
                    _state.update { it.copy(isAnalyzingPrompt = false) }
                }
                is ApiResult.Loading -> { /* Ignore */ }
            }
        }
    }
    
    /**
     * Load follow-up suggestions based on conversation
     */
    fun loadSuggestions(lastResponse: String? = null) {
        viewModelScope.launch {
            _state.update { it.copy(isLoadingSuggestions = true) }
            
            val conversationId = _state.value.currentConversationId
            
            when (val result = chatRepository.getSuggestions(conversationId, lastResponse)) {
                is ApiResult.Success -> {
                    _state.update {
                        it.copy(
                            suggestions = result.data,
                            isLoadingSuggestions = false
                        )
                    }
                }
                is ApiResult.Error -> {
                    _state.update { 
                        it.copy(
                            suggestions = getDefaultSuggestions(),
                            isLoadingSuggestions = false
                        )
                    }
                }
                is ApiResult.Loading -> { /* Ignore */ }
            }
        }
    }
    
    /**
     * Get default suggestions when API fails
     */
    private fun getDefaultSuggestions(): List<String> {
        return listOf(
            "Tell me more about this",
            "Can you explain in simpler terms?",
            "What are some examples?",
            "What are the alternatives?"
        )
    }
    
    /**
     * Select a specific AI mode manually
     */
    fun selectAIMode(mode: com.baatcheet.app.domain.model.AIMode) {
        _state.update { 
            it.copy(
                currentAIMode = mode,
                showModeSelector = false
            )
        }
    }
    
    /**
     * Select AI mode by ID string
     */
    fun selectAIMode(modeId: String) {
        val mode = _state.value.aiModes.find { it.id == modeId }
        if (mode != null) {
            selectAIMode(mode)
        }
    }
    
    /**
     * Toggle mode selector visibility
     */
    fun toggleModeSelector() {
        _state.update { it.copy(showModeSelector = !it.showModeSelector) }
    }
    
    /**
     * Hide mode selector
     */
    fun hideModeSelector() {
        _state.update { it.copy(showModeSelector = false) }
    }
    
    /**
     * Use a suggestion as the message
     */
    fun useSuggestion(suggestion: String, onMessage: (String) -> Unit) {
        onMessage(suggestion)
    }
    
    /**
     * Clear prompt analysis
     */
    fun clearPromptAnalysis() {
        _state.update { it.copy(promptAnalysis = null) }
    }
    
    // ============================================
    // File Upload Operations
    // ============================================
    
    /**
     * Load upload status from backend
     */
    fun loadUploadStatus() {
        viewModelScope.launch {
            when (val result = chatRepository.getUploadStatus()) {
                is ApiResult.Success -> {
                    val status = result.data
                    _state.update { it.copy(
                        uploadsUsedToday = status.usedToday,
                        uploadDailyLimit = status.dailyLimit,
                        uploadLimitReached = !status.canUpload,
                        uploadNextAvailableAt = status.nextAvailableAt
                    )}
                }
                is ApiResult.Error -> {
                    // Keep defaults on error
                }
                is ApiResult.Loading -> { /* Ignore */ }
            }
        }
    }
    
    /**
     * Check if user can upload more files
     */
    fun canUploadFile(): Boolean {
        return _state.value.uploadsUsedToday < _state.value.uploadDailyLimit && !_state.value.uploadLimitReached
    }
    
    /**
     * Get remaining uploads message with next available time
     */
    fun getRemainingUploadsMessage(): String {
        val remaining = _state.value.uploadDailyLimit - _state.value.uploadsUsedToday
        return if (remaining > 0) {
            "$remaining uploads remaining today"
        } else {
            val nextTime = formatNextAvailableTime(_state.value.uploadNextAvailableAt)
            "Daily upload limit reached. Next available: $nextTime"
        }
    }
    
    /**
     * Format ISO timestamp to local time for display
     */
    private fun formatNextAvailableTime(isoTimestamp: String?): String {
        if (isoTimestamp == null) return "in 24 hours"
        
        return try {
            val instant = java.time.Instant.parse(isoTimestamp)
            val localDateTime = java.time.LocalDateTime.ofInstant(instant, java.time.ZoneId.systemDefault())
            val formatter = java.time.format.DateTimeFormatter.ofPattern("MMM d, h:mm a")
            localDateTime.format(formatter)
        } catch (e: Exception) {
            "in 24 hours"
        }
    }
    
    /**
     * Get formatted next available time for uploads
     */
    fun getUploadNextAvailableFormatted(): String {
        return formatNextAvailableTime(_state.value.uploadNextAvailableAt)
    }
    
    /**
     * Get formatted next available time for image generation
     */
    fun getImageGenNextAvailableFormatted(): String {
        // Image gen status should have its own nextAvailableAt
        val nextTime = _state.value.imageGenStatus?.nextAvailableAt
        return formatNextAvailableTime(nextTime)
    }
    
    /**
     * Add file to upload queue and start uploading to backend
     */
    fun addFileToUpload(uri: Uri, filename: String, mimeType: String, context: android.content.Context): Boolean {
        // Check upload limit first
        if (!canUploadFile()) {
            _state.update { it.copy(
                error = "Daily upload limit reached (${_state.value.uploadDailyLimit}/day). Try again in 24 hours.",
                uploadLimitReached = true
            )}
            return false
        }
        
        val localId = "local-${System.currentTimeMillis()}"
        val fileState = UploadedFileState(
            id = localId,
            uri = uri,
            filename = filename,
            mimeType = mimeType,
            status = FileUploadStatus.UPLOADING
        )
        
        _state.update { 
            it.copy(
                uploadedFiles = it.uploadedFiles + fileState,
                isUploading = true
            )
        }
        
        // Upload to backend
        viewModelScope.launch {
            try {
                // Read file from URI
                val inputStream = context.contentResolver.openInputStream(uri)
                if (inputStream == null) {
                    updateFileStatus(localId, FileUploadStatus.FAILED)
                    _state.update { it.copy(isUploading = false, error = "Could not read file") }
                    return@launch
                }
                
                val bytes = inputStream.readBytes()
                inputStream.close()
                
                // Create multipart request
                val requestBody = bytes.toRequestBody(mimeType.toMediaTypeOrNull())
                val part = MultipartBody.Part.createFormData("file", filename, requestBody)
                
                // Upload to backend
                when (val result = chatRepository.uploadDocument(part)) {
                    is ApiResult.Success -> {
                        val uploadedDoc = result.data
                        _state.update { state ->
                            val updatedFiles = state.uploadedFiles.map { f ->
                                if (f.id == localId) {
                                    f.copy(
                                        remoteId = uploadedDoc.id,
                                        status = if (uploadedDoc.status == "ready" || uploadedDoc.status == "completed") FileUploadStatus.READY else FileUploadStatus.PROCESSING,
                                        extractedText = uploadedDoc.extractedText
                                    )
                                } else f
                            }
                            state.copy(
                                uploadedFiles = updatedFiles,
                                isUploading = false,
                                uploadsUsedToday = state.uploadsUsedToday + 1 // Increment local counter
                            )
                        }
                        
                        // Poll for processing status if still processing
                        if (uploadedDoc.status != "ready" && uploadedDoc.status != "completed") {
                            pollDocumentStatus(localId, uploadedDoc.id)
                        }
                    }
                    is ApiResult.Error -> {
                        // Check if it's a rate limit error
                        val isLimitError = result.message.contains("limit", ignoreCase = true) || result.code == 429
                        
                        updateFileStatus(localId, FileUploadStatus.FAILED)
                        _state.update { it.copy(
                            uploadedFiles = it.uploadedFiles.filter { f -> f.id != localId }, // Remove failed file
                            isUploading = false,
                            uploadLimitReached = isLimitError,
                            error = result.message
                        )}
                    }
                    is ApiResult.Loading -> { /* Already handled */ }
                }
            } catch (e: Exception) {
                updateFileStatus(localId, FileUploadStatus.FAILED)
                _state.update { it.copy(
                    uploadedFiles = it.uploadedFiles.filter { f -> f.id != localId }, // Remove failed file
                    isUploading = false,
                    error = "Upload error: ${e.message}"
                )}
            }
        }
        return true
    }
    
    /**
     * Poll document processing status until ready
     */
    private fun pollDocumentStatus(localId: String, remoteId: String) {
        viewModelScope.launch {
            var attempts = 0
            val maxAttempts = 30 // 30 seconds max
            
            while (attempts < maxAttempts) {
                kotlinx.coroutines.delay(1000) // Wait 1 second between polls
                
                when (val result = chatRepository.getDocumentStatus(remoteId)) {
                    is ApiResult.Success -> {
                        val status = result.data
                        if (status.status == "ready" || status.status == "completed") {
                            _state.update { state ->
                                val updatedFiles = state.uploadedFiles.map { f ->
                                    if (f.id == localId) {
                                        f.copy(
                                            status = FileUploadStatus.READY,
                                            extractedText = status.extractedText
                                        )
                                    } else f
                                }
                                state.copy(uploadedFiles = updatedFiles)
                            }
                            return@launch
                        } else if (status.status == "error" || status.status == "failed") {
                            updateFileStatus(localId, FileUploadStatus.FAILED)
                            return@launch
                        }
                    }
                    is ApiResult.Error -> {
                        // Continue polling on error
                    }
                    is ApiResult.Loading -> { /* Ignore */ }
                }
                attempts++
            }
            
            // Timeout - mark as ready anyway to allow sending
            _state.update { state ->
                val updatedFiles = state.uploadedFiles.map { f ->
                    if (f.id == localId && f.status == FileUploadStatus.PROCESSING) {
                        f.copy(status = FileUploadStatus.READY)
                    } else f
                }
                state.copy(uploadedFiles = updatedFiles)
            }
        }
    }
    
    /**
     * Update file status
     */
    private fun updateFileStatus(fileId: String, status: FileUploadStatus) {
        _state.update { state ->
            val updatedFiles = state.uploadedFiles.map { f ->
                if (f.id == fileId) f.copy(status = status) else f
            }
            state.copy(uploadedFiles = updatedFiles)
        }
    }
    
    /**
     * Remove file from upload queue
     */
    fun removeFile(fileId: String) {
        _state.update { 
            it.copy(uploadedFiles = it.uploadedFiles.filter { f -> f.id != fileId })
        }
    }
    
    /**
     * Clear all uploaded files
     */
    fun clearUploadedFiles() {
        _state.update { it.copy(uploadedFiles = emptyList()) }
    }
    
    /**
     * Check if all files are ready
     */
    fun areAllFilesReady(): Boolean {
        return _state.value.uploadedFiles.all { it.status == FileUploadStatus.READY }
    }
    
    /**
     * Get list of remote IDs for uploaded files
     */
    fun getUploadedFileIds(): List<String> {
        return _state.value.uploadedFiles
            .filter { it.status == FileUploadStatus.READY && it.remoteId != null }
            .mapNotNull { it.remoteId }
    }
    
    // ============================================
    // Tags & Modes Operations
    // ============================================
    
    /**
     * Load available tags
     */
    fun loadTags() {
        viewModelScope.launch {
            when (val result = chatRepository.getTags()) {
                is ApiResult.Success -> {
                    _state.update { it.copy(availableTags = result.data) }
                }
                is ApiResult.Error -> { /* Ignore */ }
                is ApiResult.Loading -> { /* Ignore */ }
            }
        }
    }
    
    /**
     * Load available modes
     */
    fun loadModes() {
        viewModelScope.launch {
            when (val result = chatRepository.getModes()) {
                is ApiResult.Success -> {
                    _state.update { it.copy(availableModes = result.data) }
                }
                is ApiResult.Error -> { /* Ignore */ }
                is ApiResult.Loading -> { /* Ignore */ }
            }
        }
    }
    
    /**
     * Select a mode
     */
    fun selectMode(mode: Mode?) {
        _state.update { it.copy(selectedMode = mode) }
    }
    
    /**
     * Auto-detect mode from message
     */
    fun detectModeFromMessage(message: String) {
        if (message.length < 10) return // Too short to detect
        
        viewModelScope.launch {
            when (val result = chatRepository.detectMode(message)) {
                is ApiResult.Success -> {
                    _state.update { it.copy(detectedMode = result.data) }
                }
                is ApiResult.Error -> { /* Ignore */ }
                is ApiResult.Loading -> { /* Ignore */ }
            }
        }
    }
    
    // ============================================
    // Template Operations
    // ============================================
    
    /**
     * Load templates
     */
    fun loadTemplates(category: String? = null) {
        viewModelScope.launch {
            _state.update { it.copy(isLoadingTemplates = true) }
            
            when (val result = chatRepository.getTemplates(category)) {
                is ApiResult.Success -> {
                    _state.update { 
                        it.copy(
                            templates = result.data,
                            isLoadingTemplates = false
                        )
                    }
                }
                is ApiResult.Error -> {
                    _state.update { it.copy(isLoadingTemplates = false) }
                }
                is ApiResult.Loading -> { /* Already handled */ }
            }
        }
    }
    
    /**
     * Use a template
     */
    fun useTemplate(templateId: String, title: String? = null) {
        viewModelScope.launch {
            _state.update { it.copy(isLoading = true) }
            
            when (val result = chatRepository.useTemplate(templateId, title)) {
                is ApiResult.Success -> {
                    result.data?.let { conversation ->
                        loadConversation(conversation.id)
                    }
                    loadConversations()
                }
                is ApiResult.Error -> {
                    _state.update { 
                        it.copy(
                            isLoading = false,
                            error = result.message
                        )
                    }
                }
                is ApiResult.Loading -> { /* Already handled */ }
            }
        }
    }
    
    // ============================================
    // Image Generation Operations
    // ============================================
    
    /**
     * Load image generation status
     */
    fun loadImageGenStatus() {
        viewModelScope.launch {
            when (val result = chatRepository.getImageGenStatus()) {
                is ApiResult.Success -> {
                    _state.update { 
                        it.copy(
                            imageGenStatus = result.data,
                            imageGenLimitReached = !result.data.canGenerate
                        ) 
                    }
                }
                is ApiResult.Error -> { /* Ignore */ }
                is ApiResult.Loading -> { /* Ignore */ }
            }
        }
    }
    
    /**
     * Load available image styles
     */
    fun loadImageStyles() {
        viewModelScope.launch {
            when (val result = chatRepository.getImageGenStyles()) {
                is ApiResult.Success -> {
                    _state.update { it.copy(availableStyles = result.data) }
                }
                is ApiResult.Error -> { /* Ignore */ }
                is ApiResult.Loading -> { /* Ignore */ }
            }
        }
    }
    
    /**
     * Generate image from prompt
     */
    fun generateImage(prompt: String, style: String? = null, aspectRatio: String? = null) {
        viewModelScope.launch {
            _state.update { 
                it.copy(
                    isGeneratingImage = true,
                    generatedImage = null,
                    error = null
                )
            }
            
            when (val result = chatRepository.generateImage(
                prompt = prompt,
                style = style,
                aspectRatio = aspectRatio
            )) {
                is ApiResult.Success -> {
                    _state.update { 
                        it.copy(
                            generatedImage = result.data,
                            isGeneratingImage = false
                        )
                    }
                    // Refresh status to update remaining count
                    loadImageGenStatus()
                }
                is ApiResult.Error -> {
                    _state.update { 
                        it.copy(
                            isGeneratingImage = false,
                            error = result.message
                        )
                    }
                }
                is ApiResult.Loading -> { /* Already handled */ }
            }
        }
    }
    
    /**
     * Clear generated image
     */
    fun clearGeneratedImage() {
        _state.update { it.copy(generatedImage = null) }
    }
    
    // ============================================
    // Memory/Facts Operations
    // ============================================
    
    /**
     * Load learned facts
     */
    fun loadLearnedFacts() {
        viewModelScope.launch {
            when (val result = chatRepository.getLearnedFacts()) {
                is ApiResult.Success -> {
                    _state.update { it.copy(learnedFacts = result.data) }
                }
                is ApiResult.Error -> { /* Ignore */ }
                is ApiResult.Loading -> { /* Ignore */ }
            }
        }
    }
    
    /**
     * Teach the AI a fact
     */
    fun teachFact(fact: String) {
        viewModelScope.launch {
            when (val result = chatRepository.teachFact(fact)) {
                is ApiResult.Success -> {
                    loadLearnedFacts() // Refresh facts
                }
                is ApiResult.Error -> {
                    _state.update { it.copy(error = result.message) }
                }
                is ApiResult.Loading -> { /* Ignore */ }
            }
        }
    }
    
    /**
     * Delete a fact
     */
    fun deleteFact(factId: String) {
        viewModelScope.launch {
            when (val result = chatRepository.deleteFact(factId)) {
                is ApiResult.Success -> {
                    loadLearnedFacts() // Refresh facts
                }
                is ApiResult.Error -> {
                    _state.update { it.copy(error = result.message) }
                }
                is ApiResult.Loading -> { /* Ignore */ }
            }
        }
    }
    
    /**
     * Load profile summary
     */
    fun loadProfileSummary() {
        viewModelScope.launch {
            when (val result = chatRepository.getProfileSummary()) {
                is ApiResult.Success -> {
                    _state.update { it.copy(profileSummary = result.data) }
                }
                is ApiResult.Error -> { /* Ignore */ }
                is ApiResult.Loading -> { /* Ignore */ }
            }
        }
    }
    
    // ============================================
    // Analytics Operations
    // ============================================
    
    /**
     * Load analytics dashboard
     */
    fun loadAnalytics() {
        viewModelScope.launch {
            when (val result = chatRepository.getAnalyticsDashboard()) {
                is ApiResult.Success -> {
                    _state.update { it.copy(analyticsDashboard = result.data) }
                }
                is ApiResult.Error -> { /* Ignore */ }
                is ApiResult.Loading -> { /* Ignore */ }
            }
        }
    }
    
    // ============================================
    // Share Operations
    // ============================================
    
    /**
     * Create share link for current conversation
     */
    fun createShareLink(onSuccess: (String) -> Unit) {
        val conversationId = _state.value.currentConversationId ?: return
        
        viewModelScope.launch {
            when (val result = chatRepository.createShareLink(conversationId)) {
                is ApiResult.Success -> {
                    onSuccess(result.data.url)
                }
                is ApiResult.Error -> {
                    _state.update { it.copy(error = result.message) }
                }
                is ApiResult.Loading -> { /* Ignore */ }
            }
        }
    }
    
    // ============================================
    // Voice Operations
    // ============================================
    
    /**
     * Set recording state
     */
    fun setRecording(isRecording: Boolean) {
        _state.update { it.copy(isRecording = isRecording) }
    }
    
    /**
     * Set transcribing state
     */
    fun setTranscribing(isTranscribing: Boolean) {
        _state.update { it.copy(isTranscribing = isTranscribing) }
    }
    
    /**
     * Set transcribed text
     */
    fun setTranscribedText(text: String?) {
        _state.update { it.copy(transcribedText = text) }
    }
    
    /**
     * Set speaking state
     */
    fun setSpeaking(isSpeaking: Boolean) {
        _state.update { it.copy(isSpeaking = isSpeaking) }
    }
    
    /**
     * Speak text using TTS
     */
    // Text-to-speech engine (initialized lazily in ChatScreen)
    private var tts: android.speech.tts.TextToSpeech? = null
    private var ttsInitialized = false
    
    fun initTTS(context: android.content.Context) {
        if (tts == null) {
            tts = android.speech.tts.TextToSpeech(context) { status ->
                ttsInitialized = status == android.speech.tts.TextToSpeech.SUCCESS
                if (ttsInitialized) {
                    tts?.language = java.util.Locale.US
                    tts?.setSpeechRate(1.0f)
                }
            }
        }
    }
    
    fun speakText(text: String, voice: String = "alloy", onAudioReady: ((ByteArray) -> Unit)? = null) {
        // Use Android's built-in TTS for immediate response
        if (ttsInitialized && tts != null) {
            _state.update { it.copy(isSpeaking = true) }
            
            // Set utterance listener to know when speech is done
            tts?.setOnUtteranceProgressListener(object : android.speech.tts.UtteranceProgressListener() {
                override fun onStart(utteranceId: String?) {}
                override fun onDone(utteranceId: String?) {
                    viewModelScope.launch {
                        _state.update { it.copy(isSpeaking = false) }
                    }
                }
                override fun onError(utteranceId: String?) {
                    viewModelScope.launch {
                        _state.update { it.copy(isSpeaking = false, error = "Speech failed") }
                    }
                }
            })
            
            // Clean text for TTS (remove markdown, code blocks, etc.)
            val cleanText = text
                .replace(Regex("```[\\s\\S]*?```"), " code block ")
                .replace(Regex("`[^`]+`"), "")
                .replace(Regex("\\*\\*([^*]+)\\*\\*"), "$1")
                .replace(Regex("\\*([^*]+)\\*"), "$1")
                .replace(Regex("#+ "), "")
                .replace(Regex("\\[([^\\]]+)\\]\\([^)]+\\)"), "$1")
                .replace(Regex("\\|[^|]+\\|"), " ")
                .trim()
            
            val params = android.os.Bundle()
            tts?.speak(cleanText, android.speech.tts.TextToSpeech.QUEUE_FLUSH, params, "msg_${System.currentTimeMillis()}")
        } else {
            _state.update { it.copy(error = "Text-to-speech not available") }
        }
    }
    
    fun stopSpeaking() {
        tts?.stop()
        _state.update { it.copy(isSpeaking = false) }
    }
    
    override fun onCleared() {
        super.onCleared()
        tts?.shutdown()
        tts = null
    }
    
    /**
     * Regenerate the last AI response
     */
    fun regenerateResponse() {
        val conversationId = _state.value.currentConversationId ?: return
        
        viewModelScope.launch {
            // Remove the last assistant message
            val messages = _state.value.messages.toMutableList()
            if (messages.isNotEmpty() && messages.last().role == MessageRole.ASSISTANT) {
                messages.removeAt(messages.lastIndex)
            }
            
            // Add streaming placeholder
            val streamingMessage = ChatMessage(
                content = "",
                role = MessageRole.ASSISTANT,
                isStreaming = true
            )
            
            _state.update { 
                it.copy(
                    messages = messages + streamingMessage,
                    isLoading = true,
                    error = null
                )
            }
            
            // Call regenerate API
            when (val result = chatRepository.regenerateResponse(conversationId)) {
                is ApiResult.Success -> {
                    val updatedMessages = _state.value.messages.toMutableList()
                    // Replace streaming message with actual response
                    if (updatedMessages.isNotEmpty() && updatedMessages.last().isStreaming) {
                        updatedMessages.removeAt(updatedMessages.lastIndex)
                    }
                    updatedMessages.add(result.data)
                    
                    _state.update { 
                        it.copy(
                            messages = updatedMessages,
                            isLoading = false
                        )
                    }
                }
                is ApiResult.Error -> {
                    // Remove streaming placeholder
                    val updatedMessages = _state.value.messages.filter { !it.isStreaming }
                    _state.update { 
                        it.copy(
                            messages = updatedMessages,
                            isLoading = false,
                            error = result.message
                        )
                    }
                }
                is ApiResult.Loading -> { /* Ignore */ }
            }
        }
    }
    
    // ============================================
    // Share & Feedback
    // ============================================
    
    /**
     * Share the current chat - generates a shareable link via API
     */
    fun shareChat() {
        val conversationId = _state.value.currentConversationId ?: return
        
        viewModelScope.launch {
            _state.update { it.copy(isSharing = true, error = null) }
            
            when (val result = chatRepository.createShareLink(conversationId)) {
                is ApiResult.Success -> {
                    val shareUrl = result.data.url
                    val shareText = "Check out this BaatCheet conversation: $shareUrl"
                    _state.update { it.copy(
                        isSharing = false,
                        shareableText = shareText,
                        shareUrl = shareUrl
                    ) }
                }
                is ApiResult.Error -> {
                    // Fallback to text-based sharing if API fails
                    val messages = _state.value.messages
                    val chatSummary = buildString {
                        append("BaatCheet Conversation\n")
                        append("━━━━━━━━━━━━━━━━━━━━\n\n")
                        messages.takeLast(10).forEach { message ->
                            val role = if (message.role == MessageRole.USER) "You" else "AI"
                            append("$role: ${message.content.take(200)}")
                            if (message.content.length > 200) append("...")
                            append("\n\n")
                        }
                        append("━━━━━━━━━━━━━━━━━━━━\n")
                        append("Shared via BaatCheet")
                    }
                    _state.update { it.copy(
                        isSharing = false,
                        shareableText = chatSummary,
                        error = "Could not create share link: ${result.message}"
                    ) }
                }
                is ApiResult.Loading -> { /* Ignore */ }
            }
        }
    }
    
    /**
     * Submit feedback for a message (like/dislike)
     * Used for auto-learning to improve responses
     */
    fun submitFeedback(messageId: String, isPositive: Boolean) {
        viewModelScope.launch {
            val conversationId = _state.value.currentConversationId ?: return@launch
            
            try {
                // Call feedback API (we'll create this endpoint)
                when (val result = chatRepository.submitFeedback(
                    conversationId = conversationId,
                    messageId = messageId,
                    isPositive = isPositive
                )) {
                    is ApiResult.Success -> {
                        // Feedback submitted successfully
                        // Could show a subtle animation or toast
                    }
                    is ApiResult.Error -> {
                        // Silently fail - don't interrupt user
                    }
                    is ApiResult.Loading -> { /* Ignore */ }
                }
            } catch (e: Exception) {
                // Silently fail
            }
        }
    }
    
    // ============================================
    // Utility
    // ============================================
    
    /**
     * Clear error
     */
    fun clearError() {
        _state.update { it.copy(error = null) }
    }
    
    /**
     * Clear share URL after sharing is complete
     */
    fun clearShareUrl() {
        _state.update { it.copy(shareUrl = null, shareableText = null) }
    }
    
    /**
     * Invite a collaborator to a project
     */
    fun inviteCollaborator(projectId: String, email: String) {
        viewModelScope.launch {
            when (val result = chatRepository.inviteCollaborator(projectId, email)) {
                is ApiResult.Success -> {
                    // Invitation sent successfully
                    _state.update { it.copy(error = null) }
                }
                is ApiResult.Error -> {
                    _state.update { it.copy(error = "Failed to invite: ${result.message}") }
                }
                is ApiResult.Loading -> { /* Ignore */ }
            }
        }
    }
    
    /**
     * Refresh all data
     */
    fun refreshAll() {
        loadConversations()
        loadProjects()
        loadTags()
        loadModes()
        loadImageGenStatus()
    }
    
    /**
     * Clear all conversations (for Settings)
     */
    fun clearAllConversations() {
        viewModelScope.launch {
            // Delete all conversations one by one
            _state.value.conversations.forEach { conversation ->
                chatRepository.deleteConversation(conversation.id)
            }
            // Refresh the list
            loadConversations()
            // Clear current chat
            startNewChat()
        }
    }
}
