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
    
    // Templates
    val templates: List<Template> = emptyList(),
    val isLoadingTemplates: Boolean = false,
    
    // Image Generation
    val imageGenStatus: ImageGenStatus? = null,
    val availableStyles: List<ImageStyle> = emptyList(),
    val generatedImage: GeneratedImage? = null,
    val isGeneratingImage: Boolean = false,
    
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
     * Send a message
     */
    fun sendMessage(content: String) {
        if (content.isBlank()) return
        
        // Add user message immediately
        val userMessage = ChatMessage(
            content = content.trim(),
            role = MessageRole.USER,
            conversationId = _state.value.currentConversationId
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
        
        // Send to API
        viewModelScope.launch {
            when (val result = chatRepository.sendMessage(
                message = content,
                conversationId = _state.value.currentConversationId
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
        }
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
     * Add file to upload queue
     */
    fun addFileToUpload(uri: Uri, filename: String, mimeType: String) {
        val fileState = UploadedFileState(
            id = "local-${System.currentTimeMillis()}",
            uri = uri,
            filename = filename,
            mimeType = mimeType,
            status = FileUploadStatus.PENDING
        )
        
        _state.update { 
            it.copy(uploadedFiles = it.uploadedFiles + fileState)
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
                    _state.update { it.copy(imageGenStatus = result.data) }
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
    fun speakText(text: String, voice: String = "alloy", onAudioReady: ((ByteArray) -> Unit)? = null) {
        viewModelScope.launch {
            _state.update { it.copy(isSpeaking = true) }
            
            when (val result = chatRepository.generateSpeech(text, voice)) {
                is ApiResult.Success -> {
                    onAudioReady?.invoke(result.data)
                    _state.update { it.copy(isSpeaking = false) }
                    // TODO: Play the audio bytes using MediaPlayer
                }
                is ApiResult.Error -> {
                    _state.update { 
                        it.copy(
                            isSpeaking = false,
                            error = result.message
                        )
                    }
                }
                is ApiResult.Loading -> { /* Ignore */ }
            }
        }
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
     * Refresh all data
     */
    fun refreshAll() {
        loadConversations()
        loadProjects()
        loadTags()
        loadModes()
        loadImageGenStatus()
    }
}
