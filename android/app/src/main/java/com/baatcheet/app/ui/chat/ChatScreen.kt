package com.baatcheet.app.ui.chat

import android.content.Context
import android.content.Intent
import android.net.Uri
import android.provider.OpenableColumns
import androidx.compose.animation.AnimatedVisibility
import androidx.compose.animation.core.LinearEasing
import androidx.compose.animation.core.RepeatMode
import androidx.compose.animation.core.StartOffset
import androidx.compose.animation.core.animateFloat
import androidx.compose.animation.core.infiniteRepeatable
import androidx.compose.animation.core.rememberInfiniteTransition
import androidx.compose.animation.core.tween
import androidx.compose.animation.fadeIn
import androidx.compose.animation.fadeOut
import androidx.compose.animation.slideInVertically
import androidx.compose.animation.slideOutVertically
import androidx.compose.foundation.Image
import androidx.compose.foundation.background
import androidx.compose.foundation.border
import androidx.compose.foundation.clickable
import androidx.compose.foundation.horizontalScroll
import androidx.compose.foundation.rememberScrollState
import androidx.compose.foundation.interaction.MutableInteractionSource
import androidx.compose.foundation.layout.*
import androidx.compose.foundation.lazy.LazyColumn
import androidx.compose.foundation.lazy.items
import androidx.compose.foundation.lazy.rememberLazyListState
import androidx.compose.foundation.shape.CircleShape
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.foundation.text.BasicTextField
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.filled.*
import androidx.compose.material.icons.outlined.*
import androidx.compose.material3.*
import androidx.compose.runtime.*
import androidx.compose.runtime.mutableIntStateOf
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.platform.LocalLayoutDirection
import androidx.compose.ui.unit.LayoutDirection
import androidx.compose.ui.draw.alpha
import androidx.compose.ui.draw.clip
import androidx.compose.ui.geometry.Offset
import androidx.compose.ui.graphics.Brush
import androidx.compose.ui.layout.ContentScale
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.graphics.SolidColor
import androidx.compose.ui.graphics.asImageBitmap
import androidx.compose.ui.graphics.vector.ImageVector
import androidx.compose.ui.platform.LocalContext
import androidx.compose.ui.res.painterResource
import androidx.compose.ui.text.TextStyle
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.text.style.TextAlign
import androidx.compose.ui.text.SpanStyle
import androidx.compose.ui.text.buildAnnotatedString
import androidx.compose.ui.text.style.TextOverflow
import androidx.compose.ui.text.withStyle
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import androidx.hilt.navigation.compose.hiltViewModel
import coil.compose.AsyncImage
import coil.compose.rememberAsyncImagePainter
import com.baatcheet.app.R
import com.baatcheet.app.ui.voice.VoiceChatScreen
import com.baatcheet.app.ui.components.shareText
import com.baatcheet.app.ui.collaborations.CollaborationsScreen
import com.baatcheet.app.domain.model.ChatMessage
import com.baatcheet.app.domain.model.MessageRole
import com.baatcheet.app.domain.model.Project
import kotlinx.coroutines.launch
import androidx.activity.compose.BackHandler

// Light mode color palette - Pure white background
private val WhiteBackground = Color(0xFFFFFFFF)
private val InputBorder = Color(0xFFE5E5EA)
private val GreenAccent = Color(0xFF34C759)
private val DarkText = Color(0xFF1C1C1E)
private val GrayText = Color(0xFF8E8E93)
private val LightGrayText = Color(0xFF3C3C43).copy(alpha = 0.6f)
private val ChipBackground = Color(0xFFF2F2F7)
private val ChipBorder = Color(0xFFE5E5EA)
private val MessageBubbleUser = Color(0xFFF2F2F7)
private val MessageBubbleAssistant = Color(0xFFFFFFFF)
private val DrawerBackground = Color(0xFFF8F8F8)

/**
 * Format ISO timestamp to local time for display
 */
private fun formatNextAvailableTime(isoTimestamp: String?): String? {
    if (isoTimestamp == null) return null
    
    return try {
        val instant = java.time.Instant.parse(isoTimestamp)
        val localDateTime = java.time.LocalDateTime.ofInstant(instant, java.time.ZoneId.systemDefault())
        val formatter = java.time.format.DateTimeFormatter.ofPattern("MMM d, h:mm a")
        localDateTime.format(formatter)
    } catch (e: Exception) {
        null
    }
}

@OptIn(ExperimentalMaterial3Api::class)
@Composable
fun ChatScreen(
    viewModel: ChatViewModel = hiltViewModel(),
    onMenuClick: () -> Unit = {},
    onLogout: () -> Unit = {}
) {
    val state by viewModel.state.collectAsState()
    val context = androidx.compose.ui.platform.LocalContext.current
    var messageText by remember { mutableStateOf("") }
    val listState = rememberLazyListState()
    val coroutineScope = rememberCoroutineScope()
    val drawerState = rememberDrawerState(initialValue = DrawerValue.Closed)
    
    // Initialize TTS engine
    LaunchedEffect(Unit) {
        viewModel.initTTS(context)
    }
    
    // Media picker for camera, gallery, and file picking
    val mediaPicker = rememberMediaPicker(
        onImageSelected = { uri ->
            // Check upload limit first
            if (!viewModel.canUploadFile()) {
                android.widget.Toast.makeText(
                    context, 
                    "Daily upload limit reached (${state.uploadDailyLimit}/day). Try again in 24 hours.", 
                    android.widget.Toast.LENGTH_LONG
                ).show()
                return@rememberMediaPicker
            }
            // Get file info from URI
            val mimeType = context.contentResolver.getType(uri) ?: "image/jpeg"
            val filename = getFileNameFromUri(context, uri) ?: "image_${System.currentTimeMillis()}.jpg"
            val uploaded = viewModel.addFileToUpload(uri, filename, mimeType, context)
            if (uploaded) {
                android.widget.Toast.makeText(context, "Uploading image: $filename", android.widget.Toast.LENGTH_SHORT).show()
            }
        },
        onFileSelected = { uri ->
            // Check upload limit first
            if (!viewModel.canUploadFile()) {
                android.widget.Toast.makeText(
                    context, 
                    "Daily upload limit reached (${state.uploadDailyLimit}/day). Try again in 24 hours.", 
                    android.widget.Toast.LENGTH_LONG
                ).show()
                return@rememberMediaPicker
            }
            // Get file info from URI
            val mimeType = context.contentResolver.getType(uri) ?: "application/octet-stream"
            val filename = getFileNameFromUri(context, uri) ?: "document_${System.currentTimeMillis()}"
            val uploaded = viewModel.addFileToUpload(uri, filename, mimeType, context)
            if (uploaded) {
                android.widget.Toast.makeText(context, "Uploading document: $filename", android.widget.Toast.LENGTH_SHORT).show()
            }
        }
    )
    
    // Voice service for speech-to-text
    val (voiceState, voiceActions) = rememberVoiceService(
        onTranscription = { text ->
            messageText = text
        },
        onError = { error ->
            android.widget.Toast.makeText(context, error, android.widget.Toast.LENGTH_SHORT).show()
        }
    )
    
    // Voice chat overlay state
    var showVoiceChat by remember { mutableStateOf(false) }
    
    // Full voice mode screen state
    var showVoiceModeScreen by remember { mutableStateOf(false) }
    
    // Selected mode from plus menu (to show indicator)
    var selectedPlusMode by remember { mutableStateOf<String?>(null) }
    
    // Settings screen state
    var showSettingsScreen by remember { mutableStateOf(false) }
    
    // Analytics screen state
    var showAnalyticsScreen by remember { mutableStateOf(false) }
    
    // Collaborations screen state
    var showCollaborationsScreen by remember { mutableStateOf(false) }
    
    // Handle back navigation properly - close overlays before exiting app
    BackHandler(
        enabled = showSettingsScreen || showAnalyticsScreen || showCollaborationsScreen || 
                  showVoiceModeScreen || drawerState.isOpen
    ) {
        when {
            showSettingsScreen -> showSettingsScreen = false
            showAnalyticsScreen -> showAnalyticsScreen = false
            showCollaborationsScreen -> showCollaborationsScreen = false
            showVoiceModeScreen -> showVoiceModeScreen = false
            drawerState.isOpen -> coroutineScope.launch { drawerState.close() }
        }
    }
    
    // Get clipboard manager for sharing
    val clipboardManager = androidx.compose.ui.platform.LocalClipboardManager.current
    
    // Handle share link when created
    LaunchedEffect(state.shareUrl) {
        state.shareUrl?.let { url ->
            // Copy to clipboard
            clipboardManager.setText(androidx.compose.ui.text.AnnotatedString(url))
            
            // Show share intent
            val shareIntent = Intent(Intent.ACTION_SEND).apply {
                type = "text/plain"
                putExtra(Intent.EXTRA_TEXT, "Check out this BaatCheet conversation: $url")
            }
            context.startActivity(Intent.createChooser(shareIntent, "Share conversation"))
            
            // Clear the share URL after sharing
            viewModel.clearShareUrl()
        }
    }
    
    // Auto-scroll to bottom when new messages arrive
    LaunchedEffect(state.messages.size) {
        if (state.messages.isNotEmpty()) {
            coroutineScope.launch {
                listState.animateScrollToItem(state.messages.size - 1)
            }
        }
    }
    
    ModalNavigationDrawer(
        drawerState = drawerState,
        drawerContent = {
            ChatDrawerContent(
                state = state,
                onNewChat = {
                    viewModel.startNewChat()
                    coroutineScope.launch { drawerState.close() }
                },
                onConversationClick = { conversationId ->
                    viewModel.loadConversation(conversationId)
                    coroutineScope.launch { drawerState.close() }
                },
                onProjectClick = { projectId ->
                    viewModel.loadProjectConversations(projectId)
                    coroutineScope.launch { drawerState.close() }
                },
                onCreateProject = { name, description ->
                    viewModel.createProject(name, description)
                },
                onSearchChange = { query ->
                    viewModel.searchConversations(query)
                },
                onLogout = onLogout,
                onClose = { coroutineScope.launch { drawerState.close() } },
                onSettingsClick = {
                    showSettingsScreen = true
                    coroutineScope.launch { drawerState.close() }
                },
                onAnalyticsClick = {
                    showAnalyticsScreen = true
                    coroutineScope.launch { drawerState.close() }
                },
                onCollaborationsClick = {
                    showCollaborationsScreen = true
                    viewModel.loadPendingInvitations()
                    coroutineScope.launch { drawerState.close() }
                }
            )
        }
    ) {
        Box(
            modifier = Modifier
                .fillMaxSize()
                .background(WhiteBackground)
        ) {
            // Use when to ensure one screen is always shown
            when {
                showSettingsScreen -> {
                    // Settings Screen (Full screen)
                    com.baatcheet.app.ui.settings.SettingsScreen(
                        userSettings = com.baatcheet.app.ui.settings.UserSettings(
                            displayName = state.userProfile?.displayName ?: "",
                            email = state.userProfile?.email ?: "",
                            tier = "free",
                            totalMessages = state.analyticsDashboard?.totalMessages ?: 0,
                            totalConversations = state.conversations.size,
                            imageGenerationsToday = 0,
                            imageGenerationsLimit = 2
                        ),
                        onBack = { showSettingsScreen = false },
                        onLogout = {
                            showSettingsScreen = false
                            onLogout()
                        },
                        onDeleteAccount = { /* TODO: Implement */ },
                        onThemeChange = { /* TODO: Implement */ },
                        onLanguageChange = { /* TODO: Implement */ },
                        onVoiceEnabledChange = { /* TODO: Implement */ },
                        onAutoPlayVoiceChange = { /* TODO: Implement */ },
                        onStreamingEnabledChange = { /* TODO: Implement */ },
                        onHapticFeedbackChange = { /* TODO: Implement */ },
                        onNotificationsChange = { /* TODO: Implement */ },
                        onSaveHistoryChange = { /* TODO: Implement */ },
                        onShareAnalyticsChange = { /* TODO: Implement */ },
                        onClearHistory = { viewModel.clearAllConversations() },
                        onExportData = { /* TODO: Implement */ },
                        onPrivacyPolicy = { /* TODO: Open URL */ },
                        onTermsOfService = { /* TODO: Open URL */ },
                        onHelpCenter = { /* TODO: Open URL */ },
                        onContactSupport = { /* TODO: Open email */ },
                        onUpgrade = { /* TODO: Implement */ }
                    )
                }
                
                showAnalyticsScreen -> {
                    // Analytics Screen (Full screen)
                    com.baatcheet.app.ui.analytics.AnalyticsScreen(
                        analyticsData = com.baatcheet.app.ui.analytics.AnalyticsData(
                            totalMessages = state.usageInfo.messagesUsed,
                            totalConversations = state.conversations.size,
                            totalProjects = state.projects.size,
                            totalCollaborations = state.collaborations.size,
                            imageGenerations = state.usageInfo.imagesUsed,
                            voiceMinutes = 0,
                            tokensUsed = state.usageInfo.messagesUsed.toLong() * 100,
                            tokensLimit = state.usageInfo.messagesLimit.toLong() * 100,
                            topModes = emptyList(),
                            weeklyActivity = emptyList(),
                            topTopics = emptyList(),
                            streak = 1,
                            lastActive = "Today"
                        ),
                        isLoading = state.isLoadingUsage,
                        onBack = { showAnalyticsScreen = false },
                        onRefresh = { viewModel.loadUsage() }
                    )
                }
                
                showCollaborationsScreen -> {
                    // Collaborations Screen (Full screen)
                    CollaborationsScreen(
                        collaborations = state.collaborations,
                        pendingInvitations = state.pendingInvitations,
                        isLoading = state.isLoadingProjects,
                        isLoadingInvitations = state.isLoadingInvitations,
                        onBack = { showCollaborationsScreen = false },
                        onProjectClick = { projectId ->
                            viewModel.loadProjectConversations(projectId)
                            showCollaborationsScreen = false
                        },
                        onAcceptInvitation = { invitationId ->
                            viewModel.respondToInvitation(invitationId, true) { success, message ->
                                if (success) {
                                    android.widget.Toast.makeText(context, message, android.widget.Toast.LENGTH_SHORT).show()
                                } else {
                                    android.widget.Toast.makeText(context, "Error: $message", android.widget.Toast.LENGTH_SHORT).show()
                                }
                            }
                        },
                        onDeclineInvitation = { invitationId ->
                            viewModel.respondToInvitation(invitationId, false) { success, message ->
                                if (success) {
                                    android.widget.Toast.makeText(context, message, android.widget.Toast.LENGTH_SHORT).show()
                                } else {
                                    android.widget.Toast.makeText(context, "Error: $message", android.widget.Toast.LENGTH_SHORT).show()
                                }
                            }
                        },
                        onRefresh = {
                            viewModel.loadProjects()
                            viewModel.loadPendingInvitations()
                        }
                    )
                }
                
                else -> {
                    // Main chat interface with proper keyboard handling
                    Column(
                        modifier = Modifier
                            .fillMaxSize()
                            .imePadding() // Handle keyboard padding properly
                    ) {
                    // Header with share option
                    ChatHeader(
                        onMenuClick = { coroutineScope.launch { drawerState.open() } },
                        onNewChat = { viewModel.startNewChat() },
                        onShareChat = { viewModel.shareChat() },
                        onAddPeople = { email ->
                            state.currentProjectId?.let { projectId ->
                                viewModel.inviteCollaborator(projectId, email)
                            }
                        },
                        hasMessages = state.messages.isNotEmpty(),
                        isProjectChat = state.currentProjectId != null // Only show "Add People" for project chats
                    )
                
                // Content
                if (state.messages.isEmpty()) {
                    // Empty state - ChatGPT style
                    EmptyStateContent(
                        onSuggestionClick = { suggestion ->
                            // Fill in the text box with the suggestion (don't send immediately)
                            messageText = suggestion
                        },
                        onModeSelect = { mode ->
                            selectedPlusMode = mode
                        },
                        modifier = Modifier.weight(1f)
                    )
                } else {
                    // Messages list with proper keyboard handling
                    val clipboardManager = androidx.compose.ui.platform.LocalClipboardManager.current
                    
                    LazyColumn(
                        state = listState,
                        modifier = Modifier
                            .weight(1f)
                            .fillMaxWidth(),
                        contentPadding = PaddingValues(vertical = 16.dp),
                        reverseLayout = false
                    ) {
                        items(state.messages, key = { it.id }) { message ->
                            val isLastAssistantMessage = message.role == MessageRole.ASSISTANT && 
                                state.messages.lastOrNull { it.role == MessageRole.ASSISTANT } == message
                            
                            MessageBubble(
                                message = message,
                                onCopy = { text ->
                                    clipboardManager.setText(androidx.compose.ui.text.AnnotatedString(text))
                                },
                                onRegenerate = if (isLastAssistantMessage && state.currentConversationId != null) {
                                    { viewModel.regenerateResponse() }
                                } else null,
                                onSpeak = { text ->
                                    viewModel.speakText(text)
                                },
                                onLike = { messageId, isLike ->
                                    viewModel.submitFeedback(messageId, isLike)
                                }
                            )
                        }
                        
                        // Image Generation Progress Placeholder - INSIDE LazyColumn as last item
                        if (state.isGeneratingImage) {
                            item(key = "image_generation_placeholder") {
                                ImageGenerationPlaceholder()
                            }
                        }
                        
                        // Mode-specific loading indicator (Thinking, Research, Web Search, Code) - INSIDE LazyColumn
                        val loadingMode = state.currentLoadingMode
                        if (loadingMode != null && !state.isGeneratingImage) {
                            item(key = "mode_loading_indicator") {
                                ModeLoadingIndicator(mode = loadingMode)
                            }
                        }
                    }
                }
                
                // Follow-up suggestions
                if (state.suggestions.isNotEmpty() && state.messages.isNotEmpty() && !state.isLoading) {
                    SuggestionsRow(
                        suggestions = state.suggestions,
                        onSuggestionClick = { suggestion ->
                            messageText = suggestion
                        }
                    )
                }
                
                // Usage quota indicator (shown when approaching limit)
                if (state.usageInfo.messagesPercentage >= 80 || state.usageInfo.isMessageLimitReached) {
                    UsageIndicator(
                        usageInfo = state.usageInfo,
                        onUpgradeClick = {
                            android.widget.Toast.makeText(context, "Pro upgrade coming soon!", android.widget.Toast.LENGTH_SHORT).show()
                        }
                    )
                }
                
                // Input bar with mode selector
                ChatInputBar(
                    value = messageText,
                    onValueChange = { 
                        messageText = it
                        // Analyze prompt when user types (debounced would be better)
                        if (it.length > 10 && it.length % 10 == 0) {
                            viewModel.analyzePrompt(it)
                        }
                    },
                    onSend = {
                        if (messageText.isNotBlank()) {
                            viewModel.sendMessage(messageText, selectedPlusMode)
                            messageText = ""
                            selectedPlusMode = null // Clear the selected mode after sending
                            viewModel.clearUploadedFiles()
                        }
                    },
                    isLoading = state.isLoading,
                    uploadedFiles = state.uploadedFiles,
                    onRemoveFile = { fileId ->
                        viewModel.removeFile(fileId)
                    },
                    onCameraClick = {
                        if (viewModel.canUploadFile()) {
                            mediaPicker.onCameraClick()
                        } else {
                            android.widget.Toast.makeText(
                                context,
                                "Daily upload limit reached (${state.uploadDailyLimit}/day). Try again in 24 hours.",
                                android.widget.Toast.LENGTH_LONG
                            ).show()
                        }
                    },
                    onImageClick = {
                        if (viewModel.canUploadFile()) {
                            mediaPicker.onGalleryClick()
                        } else {
                            android.widget.Toast.makeText(
                                context,
                                "Daily upload limit reached (${state.uploadDailyLimit}/day). Try again in 24 hours.",
                                android.widget.Toast.LENGTH_LONG
                            ).show()
                        }
                    },
                    onFolderClick = {
                        if (viewModel.canUploadFile()) {
                            mediaPicker.onFileClick()
                        } else {
                            android.widget.Toast.makeText(
                                context,
                                "Daily upload limit reached (${state.uploadDailyLimit}/day). Try again in 24 hours.",
                                android.widget.Toast.LENGTH_LONG
                            ).show()
                        }
                    },
                    isListening = voiceState.isListening,
                    audioLevel = voiceState.audioLevel,
                    onMicClick = {
                        if (voiceState.isListening) {
                            voiceActions.stopListening()
                        } else {
                            voiceActions.startListening()
                        }
                    },
                    onHeadphoneClick = {
                        showVoiceModeScreen = true
                    },
                    currentMode = state.currentAIMode,
                    promptAnalysis = state.promptAnalysis,
                    onModeClick = { viewModel.toggleModeSelector() },
                    selectedPlusMode = selectedPlusMode,
                    onPlusModeSelect = { mode ->
                        selectedPlusMode = if (mode.isEmpty()) null else mode
                    },
                    uploadLimitReached = state.uploadLimitReached,
                    imageGenLimitReached = state.imageGenLimitReached,
                    uploadsUsedToday = state.uploadsUsedToday,
                    uploadDailyLimit = state.uploadDailyLimit,
                    uploadNextAvailableAt = state.uploadNextAvailableAt,
                    imageGenUsedToday = state.imageGenStatus?.usedToday ?: 0,
                    imageGenDailyLimit = state.imageGenStatus?.dailyLimit ?: 6,
                    imageGenNextAvailableAt = state.imageGenStatus?.nextAvailableAt
                )
                
                // Mode Selector Bottom Sheet
                if (state.showModeSelector) {
                    ModeSelector(
                        modes = state.aiModes,
                        currentMode = state.currentAIMode,
                        onModeSelect = { mode ->
                            viewModel.selectAIMode(mode)
                        },
                        onDismiss = { viewModel.hideModeSelector() }
                    )
                }
                
                // Voice Chat Overlay (simple)
                if (showVoiceChat) {
                    VoiceChatOverlay(
                        isListening = voiceState.isListening,
                        audioLevel = voiceState.audioLevel,
                        transcribedText = voiceState.transcribedText,
                        onStartListening = voiceActions.startListening,
                        onStopListening = voiceActions.stopListening,
                        onSendMessage = { text ->
                            if (text.isNotBlank()) {
                                viewModel.sendMessage(text)
                                showVoiceChat = false
                            }
                        },
                        onDismiss = {
                            voiceActions.stopListening()
                            showVoiceChat = false
                        }
                    )
                }
                
                // Full Voice Mode Screen (ChatGPT-style)
                if (showVoiceModeScreen) {
                    VoiceChatScreen(
                        onDismiss = { showVoiceModeScreen = false },
                        onConversationCreated = { conversationId ->
                            // Load the new conversation
                            viewModel.loadConversation(conversationId)
                        }
                    )
                }
            }
                } // Close else block of when statement
            } // Close when statement
        } // Close Box
    } // Close ModalNavigationDrawer
    
    // Show error snackbar if there's an error
    if (state.error != null) {
        LaunchedEffect(state.error) {
            // Error is shown in the message, clear it
            kotlinx.coroutines.delay(3000)
            viewModel.clearError()
        }
    }
}

@Composable
private fun ChatDrawerContent(
    state: ChatState,
    onNewChat: () -> Unit,
    onConversationClick: (String) -> Unit,
    onProjectClick: (String) -> Unit,
    onCreateProject: (String, String?) -> Unit,
    onSearchChange: (String) -> Unit,
    onLogout: () -> Unit,
    onClose: () -> Unit,
    onSettingsClick: () -> Unit = {},
    onAnalyticsClick: () -> Unit = {},
    onCollaborationsClick: () -> Unit = {}
) {
    var searchQuery by remember { mutableStateOf("") }
    var showNewProjectDialog by remember { mutableStateOf(false) }
    
    // New Project Dialog
    if (showNewProjectDialog) {
        CreateProjectDialog(
            onDismiss = { showNewProjectDialog = false },
            onConfirm = { name, description ->
                onCreateProject(name, description)
                showNewProjectDialog = false
            }
        )
    }
    
    ModalDrawerSheet(
        modifier = Modifier.width(300.dp),
        drawerContainerColor = WhiteBackground
    ) {
        Column(
            modifier = Modifier
                .fillMaxHeight()
                .padding(top = 16.dp)
        ) {
            // Search bar
            OutlinedTextField(
                value = searchQuery,
                onValueChange = { 
                    searchQuery = it
                    onSearchChange(it)
                },
                modifier = Modifier
                    .fillMaxWidth()
                    .padding(horizontal = 16.dp),
                placeholder = { Text("Search", color = GrayText) },
                leadingIcon = {
                    Icon(
                        Icons.Default.Search,
                        contentDescription = null,
                        tint = GrayText
                    )
                },
                trailingIcon = {
                    Image(
                        painter = painterResource(id = R.drawable.chat),
                        contentDescription = "New Chat",
                        modifier = Modifier
                            .size(24.dp)
                            .clickable(onClick = onNewChat)
                    )
                },
                colors = OutlinedTextFieldDefaults.colors(
                    unfocusedBorderColor = InputBorder,
                    focusedBorderColor = GreenAccent,
                    unfocusedContainerColor = WhiteBackground,
                    focusedContainerColor = WhiteBackground
                ),
                shape = RoundedCornerShape(24.dp),
                singleLine = true
            )
            
            Spacer(modifier = Modifier.height(16.dp))
            
            // Menu items
            DrawerMenuItem(
                icon = Icons.Outlined.Edit,
                text = "New chat",
                onClick = onNewChat
            )
            
            DrawerMenuItem(
                icon = Icons.Outlined.Analytics,
                text = "Analytics",
                onClick = onAnalyticsClick
            )
            
            Spacer(modifier = Modifier.height(8.dp))
            HorizontalDivider(color = InputBorder)
            Spacer(modifier = Modifier.height(8.dp))
            
            // Projects Section Header
            Text(
                text = "PROJECTS",
                fontSize = 11.sp,
                fontWeight = FontWeight.SemiBold,
                color = GrayText,
                letterSpacing = 1.sp,
                modifier = Modifier.padding(horizontal = 16.dp, vertical = 8.dp)
            )
            
            DrawerMenuItem(
                icon = Icons.Outlined.AddBox,
                text = "New project",
                onClick = { showNewProjectDialog = true }
            )
            
            // Real Projects section
            if (state.projects.isNotEmpty()) {
                state.projects.take(3).forEach { project ->
                    DrawerMenuItem(
                        icon = Icons.Outlined.Folder,
                        text = project.name,
                        onClick = { onProjectClick(project.id) }
                    )
                }
                
                if (state.projects.size > 3) {
                    DrawerMenuItem(
                        icon = Icons.Default.MoreHoriz,
                        text = "All projects (${state.projects.size})",
                        onClick = { }
                    )
                }
            } else if (state.isLoadingProjects) {
                Row(
                    modifier = Modifier.padding(horizontal = 16.dp, vertical = 12.dp),
                    verticalAlignment = Alignment.CenterVertically
                ) {
                    CircularProgressIndicator(
                        modifier = Modifier.size(18.dp),
                        strokeWidth = 2.dp,
                        color = GreenAccent
                    )
                    Spacer(modifier = Modifier.width(12.dp))
                    Text("Loading projects...", fontSize = 14.sp, color = GrayText)
                }
            }
            
            // Collaborations section - More prominent like ChatGPT Teams
            Spacer(modifier = Modifier.height(8.dp))
            HorizontalDivider(color = InputBorder)
            Spacer(modifier = Modifier.height(8.dp))
            
            // Collaborations Section Header
            Text(
                text = "COLLABORATIONS",
                fontSize = 11.sp,
                fontWeight = FontWeight.SemiBold,
                color = GrayText,
                letterSpacing = 1.sp,
                modifier = Modifier.padding(horizontal = 16.dp, vertical = 8.dp)
            )
            
            // Collaborations header with badge
            DrawerMenuItemWithBadge(
                icon = Icons.Outlined.Group,
                text = "View All",
                badge = state.collaborations.size + state.pendingInvitationsCount,
                onClick = onCollaborationsClick
            )
            
            // Show pending invitations alert if any
            if (state.pendingInvitationsCount > 0) {
                Row(
                    modifier = Modifier
                        .fillMaxWidth()
                        .clickable(onClick = onCollaborationsClick)
                        .padding(horizontal = 16.dp, vertical = 8.dp)
                        .background(GreenAccent.copy(alpha = 0.1f), RoundedCornerShape(8.dp))
                        .padding(horizontal = 12.dp, vertical = 8.dp),
                    verticalAlignment = Alignment.CenterVertically
                ) {
                    Icon(
                        Icons.Outlined.Mail,
                        contentDescription = null,
                        tint = GreenAccent,
                        modifier = Modifier.size(18.dp)
                    )
                    Spacer(modifier = Modifier.width(10.dp))
                    Text(
                        text = "${state.pendingInvitationsCount} pending invitation${if (state.pendingInvitationsCount > 1) "s" else ""}",
                        fontSize = 13.sp,
                        fontWeight = FontWeight.Medium,
                        color = GreenAccent,
                        modifier = Modifier.weight(1f)
                    )
                    Icon(
                        Icons.Default.ChevronRight,
                        contentDescription = null,
                        tint = GreenAccent,
                        modifier = Modifier.size(18.dp)
                    )
                }
            }
            
            // Quick access to recent collaborations
            if (state.collaborations.isNotEmpty()) {
                state.collaborations.take(2).forEach { collab ->
                    Row(
                        modifier = Modifier
                            .fillMaxWidth()
                            .clickable { onProjectClick(collab.id) }
                            .padding(horizontal = 16.dp, vertical = 10.dp),
                        verticalAlignment = Alignment.CenterVertically
                    ) {
                        Box(
                            modifier = Modifier
                                .size(28.dp)
                                .background(ChipBackground, RoundedCornerShape(6.dp)),
                            contentAlignment = Alignment.Center
                        ) {
                            Icon(
                                Icons.Outlined.Folder,
                                contentDescription = null,
                                tint = GrayText,
                                modifier = Modifier.size(16.dp)
                            )
                        }
                        Spacer(modifier = Modifier.width(12.dp))
                        Column(modifier = Modifier.weight(1f)) {
                            Text(
                                text = collab.name,
                                fontSize = 14.sp,
                                color = DarkText,
                                maxLines = 1,
                                overflow = TextOverflow.Ellipsis
                            )
                            if (collab.owner != null) {
                                Text(
                                    text = "by ${collab.owner.displayName}",
                                    fontSize = 11.sp,
                                    color = GrayText,
                                    maxLines = 1,
                                    overflow = TextOverflow.Ellipsis
                                )
                            }
                        }
                        // Role badge
                        Surface(
                            shape = RoundedCornerShape(4.dp),
                            color = when (collab.myRole?.lowercase()) {
                                "editor" -> Color(0xFF007AFF).copy(alpha = 0.1f)
                                else -> GrayText.copy(alpha = 0.1f)
                            }
                        ) {
                            Text(
                                text = (collab.myRole ?: "viewer").replaceFirstChar { it.uppercase() },
                                fontSize = 10.sp,
                                fontWeight = FontWeight.Medium,
                                color = when (collab.myRole?.lowercase()) {
                                    "editor" -> Color(0xFF007AFF)
                                    else -> GrayText
                                },
                                modifier = Modifier.padding(horizontal = 6.dp, vertical = 2.dp)
                            )
                        }
                    }
                }
                
                if (state.collaborations.size > 2) {
                    Text(
                        text = "View all ${state.collaborations.size} collaborations",
                        fontSize = 13.sp,
                        fontWeight = FontWeight.Medium,
                        color = GreenAccent,
                        modifier = Modifier
                            .fillMaxWidth()
                            .clickable(onClick = onCollaborationsClick)
                            .padding(horizontal = 16.dp, vertical = 8.dp)
                    )
                }
            }
            
            Spacer(modifier = Modifier.height(8.dp))
            HorizontalDivider(color = InputBorder)
            Spacer(modifier = Modifier.height(8.dp))
            
            // Real Chat history
            Text(
                text = "Recent Chats",
                fontSize = 12.sp,
                fontWeight = FontWeight.Medium,
                color = GrayText,
                modifier = Modifier.padding(horizontal = 16.dp, vertical = 8.dp)
            )
            
            if (state.isLoadingConversations) {
                Row(
                    modifier = Modifier.padding(horizontal = 16.dp, vertical = 12.dp),
                    verticalAlignment = Alignment.CenterVertically
                ) {
                    CircularProgressIndicator(
                        modifier = Modifier.size(18.dp),
                        strokeWidth = 2.dp,
                        color = GreenAccent
                    )
                    Spacer(modifier = Modifier.width(12.dp))
                    Text("Loading chats...", fontSize = 14.sp, color = GrayText)
                }
            } else if (state.conversations.isEmpty()) {
                Text(
                    text = "No conversations yet",
                    fontSize = 14.sp,
                    color = GrayText,
                    modifier = Modifier.padding(horizontal = 16.dp, vertical = 8.dp)
                )
            } else {
                // Show conversations in a scrollable area
                LazyColumn(
                    modifier = Modifier.weight(1f)
                ) {
                    items(state.conversations.take(10)) { conversation ->
                        ChatHistoryItem(
                            text = conversation.title,
                            isPinned = conversation.isPinned,
                            isSelected = conversation.id == state.currentConversationId,
                            onClick = { onConversationClick(conversation.id) }
                        )
                    }
                    
                    if (state.conversations.size > 10) {
                        item {
                            Text(
                                text = "View all (${state.conversations.size})",
                                fontSize = 14.sp,
                                fontWeight = FontWeight.Medium,
                                color = GreenAccent,
                                modifier = Modifier
                                    .fillMaxWidth()
                                    .clickable { }
                                    .padding(horizontal = 16.dp, vertical = 10.dp)
                            )
                        }
                    }
                }
            }
            
            if (state.conversations.isEmpty() && !state.isLoadingConversations) {
                Spacer(modifier = Modifier.weight(1f))
            }
            
            // Account section - Click to open Settings
            HorizontalDivider(color = InputBorder)
            Row(
                modifier = Modifier
                    .fillMaxWidth()
                    .clickable(onClick = onSettingsClick)
                    .padding(16.dp),
                verticalAlignment = Alignment.CenterVertically
            ) {
                Box(
                    modifier = Modifier
                        .size(36.dp)
                        .background(Color(0xFF7C4DFF), CircleShape),
                    contentAlignment = Alignment.Center
                ) {
                    Text(
                        text = state.userProfile?.initials ?: "U",
                        color = Color.White,
                        fontSize = 14.sp,
                        fontWeight = FontWeight.Medium
                    )
                }
                Spacer(modifier = Modifier.width(12.dp))
                Column(modifier = Modifier.weight(1f)) {
                    Text(
                        text = state.userProfile?.displayName ?: "User",
                        fontSize = 15.sp,
                        fontWeight = FontWeight.Medium,
                        color = DarkText,
                        maxLines = 1,
                        overflow = TextOverflow.Ellipsis
                    )
                    if (state.userProfile?.email != null) {
                        Text(
                            text = state.userProfile.email,
                            fontSize = 12.sp,
                            color = GrayText,
                            maxLines = 1,
                            overflow = TextOverflow.Ellipsis
                        )
                    }
                }
                Icon(
                    Icons.Outlined.Settings,
                    contentDescription = "Settings",
                    tint = GrayText,
                    modifier = Modifier.size(20.dp)
                )
            }
        }
    }
}

@Composable
private fun DrawerMenuItemWithBadge(
    icon: ImageVector,
    text: String,
    badge: Int,
    onClick: () -> Unit
) {
    Row(
        modifier = Modifier
            .fillMaxWidth()
            .clickable(onClick = onClick)
            .padding(horizontal = 16.dp, vertical = 12.dp),
        verticalAlignment = Alignment.CenterVertically
    ) {
        Icon(
            icon,
            contentDescription = null,
            tint = DarkText,
            modifier = Modifier.size(22.dp)
        )
        Spacer(modifier = Modifier.width(14.dp))
        Text(
            text = text,
            fontSize = 15.sp,
            color = DarkText,
            modifier = Modifier.weight(1f)
        )
        if (badge > 0) {
            Box(
                modifier = Modifier
                    .size(22.dp)
                    .background(GreenAccent, CircleShape),
                contentAlignment = Alignment.Center
            ) {
                Text(
                    text = if (badge > 99) "99+" else "$badge",
                    fontSize = 10.sp,
                    fontWeight = FontWeight.Bold,
                    color = Color.White
                )
            }
        }
    }
}

/**
 * Collaborations Bottom Sheet - Shows all collaborations and pending invitations
 */
@OptIn(ExperimentalMaterial3Api::class)
@Composable
private fun CollaborationsBottomSheet(
    collaborations: List<Project>,
    pendingInvitations: Int,
    onDismiss: () -> Unit,
    onProjectClick: (String) -> Unit,
    onViewInvitations: () -> Unit
) {
    ModalBottomSheet(
        onDismissRequest = onDismiss,
        containerColor = WhiteBackground,
        shape = RoundedCornerShape(topStart = 20.dp, topEnd = 20.dp)
    ) {
        Column(
            modifier = Modifier
                .fillMaxWidth()
                .padding(horizontal = 20.dp)
                .padding(bottom = 32.dp)
        ) {
            // Header
            Row(
                modifier = Modifier.fillMaxWidth(),
                horizontalArrangement = Arrangement.SpaceBetween,
                verticalAlignment = Alignment.CenterVertically
            ) {
                Text(
                    text = "Collaborations",
                    fontSize = 20.sp,
                    fontWeight = FontWeight.Bold,
                    color = DarkText
                )
                
                if (pendingInvitations > 0) {
                    Surface(
                        onClick = onViewInvitations,
                        shape = RoundedCornerShape(20.dp),
                        color = GreenAccent.copy(alpha = 0.1f)
                    ) {
                        Row(
                            modifier = Modifier.padding(horizontal = 12.dp, vertical = 6.dp),
                            verticalAlignment = Alignment.CenterVertically
                        ) {
                            Icon(
                                Icons.Outlined.Mail,
                                contentDescription = null,
                                tint = GreenAccent,
                                modifier = Modifier.size(16.dp)
                            )
                            Spacer(modifier = Modifier.width(6.dp))
                            Text(
                                text = "$pendingInvitations pending",
                                fontSize = 13.sp,
                                fontWeight = FontWeight.Medium,
                                color = GreenAccent
                            )
                        }
                    }
                }
            }
            
            Spacer(modifier = Modifier.height(16.dp))
            
            if (collaborations.isEmpty() && pendingInvitations == 0) {
                // Empty state
                Column(
                    modifier = Modifier
                        .fillMaxWidth()
                        .padding(vertical = 32.dp),
                    horizontalAlignment = Alignment.CenterHorizontally
                ) {
                    Icon(
                        Icons.Outlined.Group,
                        contentDescription = null,
                        tint = GrayText,
                        modifier = Modifier.size(48.dp)
                    )
                    Spacer(modifier = Modifier.height(16.dp))
                    Text(
                        text = "No Collaborations Yet",
                        fontSize = 16.sp,
                        fontWeight = FontWeight.Medium,
                        color = DarkText
                    )
                    Spacer(modifier = Modifier.height(8.dp))
                    Text(
                        text = "When someone invites you to collaborate on a project, it will appear here.",
                        fontSize = 14.sp,
                        color = GrayText,
                        textAlign = TextAlign.Center,
                        modifier = Modifier.padding(horizontal = 24.dp)
                    )
                }
            } else {
                // Collaboration list
                LazyColumn(
                    modifier = Modifier.heightIn(max = 400.dp),
                    verticalArrangement = Arrangement.spacedBy(8.dp)
                ) {
                    items(collaborations) { project ->
                        CollaborationItem(
                            project = project,
                            onClick = { onProjectClick(project.id) }
                        )
                    }
                }
            }
        }
    }
}

@Composable
private fun CollaborationItem(
    project: Project,
    onClick: () -> Unit
) {
    Surface(
        onClick = onClick,
        shape = RoundedCornerShape(12.dp),
        color = ChipBackground
    ) {
        Row(
            modifier = Modifier
                .fillMaxWidth()
                .padding(12.dp),
            verticalAlignment = Alignment.CenterVertically
        ) {
            // Project icon
            Box(
                modifier = Modifier
                    .size(40.dp)
                    .background(GreenAccent.copy(alpha = 0.1f), RoundedCornerShape(10.dp)),
                contentAlignment = Alignment.Center
            ) {
                Icon(
                    Icons.Outlined.Folder,
                    contentDescription = null,
                    tint = GreenAccent,
                    modifier = Modifier.size(20.dp)
                )
            }
            
            Spacer(modifier = Modifier.width(12.dp))
            
            Column(modifier = Modifier.weight(1f)) {
                Text(
                    text = project.name,
                    fontSize = 15.sp,
                    fontWeight = FontWeight.Medium,
                    color = DarkText,
                    maxLines = 1,
                    overflow = TextOverflow.Ellipsis
                )
                if (!project.description.isNullOrEmpty()) {
                    Text(
                        text = project.description,
                        fontSize = 12.sp,
                        color = GrayText,
                        maxLines = 1,
                        overflow = TextOverflow.Ellipsis
                    )
                }
            }
            
            // More options
            IconButton(
                onClick = { /* TODO: Show options */ },
                modifier = Modifier.size(32.dp)
            ) {
                Icon(
                    Icons.Default.MoreVert,
                    contentDescription = "Options",
                    tint = GrayText,
                    modifier = Modifier.size(18.dp)
                )
            }
        }
    }
}

@Composable
private fun DrawerMenuItem(
    icon: ImageVector,
    text: String,
    onClick: () -> Unit
) {
    Row(
        modifier = Modifier
            .fillMaxWidth()
            .clickable(onClick = onClick)
            .padding(horizontal = 16.dp, vertical = 12.dp),
        verticalAlignment = Alignment.CenterVertically
    ) {
        Icon(
            icon,
            contentDescription = null,
            tint = DarkText,
            modifier = Modifier.size(22.dp)
        )
        Spacer(modifier = Modifier.width(14.dp))
        Text(
            text = text,
            fontSize = 15.sp,
            color = DarkText
        )
    }
}

/**
 * Dialog for creating a new project
 */
@OptIn(ExperimentalMaterial3Api::class)
@Composable
private fun CreateProjectDialog(
    onDismiss: () -> Unit,
    onConfirm: (String, String?) -> Unit
) {
    var projectName by remember { mutableStateOf("") }
    var projectDescription by remember { mutableStateOf("") }
    var isError by remember { mutableStateOf(false) }
    
    AlertDialog(
        onDismissRequest = onDismiss,
        containerColor = WhiteBackground,
        shape = RoundedCornerShape(16.dp),
        title = {
            Text(
                text = "Create New Project",
                fontWeight = FontWeight.SemiBold,
                color = DarkText
            )
        },
        text = {
            Column(
                modifier = Modifier.fillMaxWidth(),
                verticalArrangement = Arrangement.spacedBy(16.dp)
            ) {
                Text(
                    text = "Projects help you organize related chats. The AI will understand context across all chats in a project.",
                    fontSize = 14.sp,
                    color = GrayText,
                    lineHeight = 20.sp
                )
                
                OutlinedTextField(
                    value = projectName,
                    onValueChange = { 
                        projectName = it
                        isError = false
                    },
                    label = { Text("Project name") },
                    placeholder = { Text("e.g., Mobile App Development") },
                    isError = isError,
                    supportingText = if (isError) {
                        { Text("Project name is required", color = Color(0xFFDC3545)) }
                    } else null,
                    modifier = Modifier.fillMaxWidth(),
                    colors = OutlinedTextFieldDefaults.colors(
                        focusedBorderColor = GreenAccent,
                        unfocusedBorderColor = InputBorder,
                        cursorColor = GreenAccent
                    ),
                    shape = RoundedCornerShape(12.dp),
                    singleLine = true
                )
                
                OutlinedTextField(
                    value = projectDescription,
                    onValueChange = { projectDescription = it },
                    label = { Text("Description (optional)") },
                    placeholder = { Text("What is this project about?") },
                    modifier = Modifier.fillMaxWidth(),
                    colors = OutlinedTextFieldDefaults.colors(
                        focusedBorderColor = GreenAccent,
                        unfocusedBorderColor = InputBorder,
                        cursorColor = GreenAccent
                    ),
                    shape = RoundedCornerShape(12.dp),
                    minLines = 2,
                    maxLines = 4
                )
            }
        },
        confirmButton = {
            Button(
                onClick = {
                    if (projectName.isBlank()) {
                        isError = true
                    } else {
                        onConfirm(
                            projectName.trim(),
                            projectDescription.ifBlank { null }
                        )
                    }
                },
                colors = ButtonDefaults.buttonColors(
                    containerColor = GreenAccent
                ),
                shape = RoundedCornerShape(24.dp)
            ) {
                Text("Create Project", color = Color.White)
            }
        },
        dismissButton = {
            TextButton(onClick = onDismiss) {
                Text("Cancel", color = GrayText)
            }
        }
    )
}

@Composable
private fun ChatHistoryItem(
    text: String,
    isPinned: Boolean = false,
    isSelected: Boolean = false,
    onClick: () -> Unit = {}
) {
    Row(
        modifier = Modifier
            .fillMaxWidth()
            .background(if (isSelected) ChipBackground else Color.Transparent)
            .clickable(onClick = onClick)
            .padding(horizontal = 16.dp, vertical = 10.dp),
        verticalAlignment = Alignment.CenterVertically
    ) {
        if (isPinned) {
            Icon(
                Icons.Default.PushPin,
                contentDescription = "Pinned",
                tint = GreenAccent,
                modifier = Modifier.size(14.dp)
            )
            Spacer(modifier = Modifier.width(6.dp))
        }
        Text(
            text = text,
            fontSize = 14.sp,
            color = DarkText,
            maxLines = 1,
            overflow = TextOverflow.Ellipsis,
            modifier = Modifier.weight(1f)
        )
    }
}

@Composable
private fun ChatHeader(
    onMenuClick: () -> Unit,
    onNewChat: () -> Unit,
    onShareChat: () -> Unit = {},
    onAddPeople: (String) -> Unit = {},
    hasMessages: Boolean = false,
    isProjectChat: Boolean = false // Collaboration only available for project chats
) {
    var showShareMenu by remember { mutableStateOf(false) }
    
    Surface(
        modifier = Modifier.fillMaxWidth(),
        color = WhiteBackground,
        shadowElevation = 1.dp
    ) {
        Row(
            modifier = Modifier
                .fillMaxWidth()
                .statusBarsPadding()
                .padding(horizontal = 16.dp, vertical = 12.dp),
            verticalAlignment = Alignment.CenterVertically
        ) {
            // Menu button
            IconButton(
                onClick = onMenuClick,
                modifier = Modifier.size(40.dp)
            ) {
                Image(
                    painter = painterResource(id = R.drawable.menu),
                    contentDescription = "Menu",
                    modifier = Modifier.size(24.dp)
                )
            }
            
            Spacer(modifier = Modifier.weight(1f))
            
            // Title - "BaatCheet 1.0" in BLACK
            Text(
                text = "BaatCheet 1.0",
                fontSize = 17.sp,
                fontWeight = FontWeight.SemiBold,
                color = DarkText
            )
            
            Spacer(modifier = Modifier.weight(1f))
            
            // Share chat button (only when there are messages) - like ChatGPT
            if (hasMessages) {
                IconButton(
                    onClick = { showShareMenu = true },
                    modifier = Modifier.size(40.dp)
                ) {
                    Icon(
                        imageVector = Icons.Outlined.PersonAdd,
                        contentDescription = "Share Chat",
                        tint = DarkText,
                        modifier = Modifier.size(22.dp)
                    )
                }
            }
            
            // New chat button
            IconButton(
                onClick = onNewChat,
                modifier = Modifier.size(40.dp)
            ) {
                Image(
                    painter = painterResource(id = R.drawable.chat),
                    contentDescription = "New Chat",
                    modifier = Modifier.size(24.dp)
                )
            }
        }
    }
    
    // Share menu dropdown
    if (showShareMenu) {
        ShareChatBottomSheet(
            onDismiss = { showShareMenu = false },
            onShareLink = { onShareChat() },
            onCopyLink = { 
                // Copy link action handled in LaunchedEffect
                onShareChat()
                showShareMenu = false
            },
            onAddPeople = { email ->
                onAddPeople(email)
            },
            isProjectChat = isProjectChat // Only show "Add People" for project chats
        )
    }
}

@Composable
private fun EmptyStateContent(
    onSuggestionClick: (String) -> Unit,
    onModeSelect: (String) -> Unit = {},
    modifier: Modifier = Modifier
) {
    Column(
        modifier = modifier
            .fillMaxWidth()
            .padding(horizontal = 16.dp),
        horizontalAlignment = Alignment.CenterHorizontally,
        verticalArrangement = Arrangement.Center
    ) {
        Spacer(modifier = Modifier.weight(1f))
        
        // "What can I help with?" title - ChatGPT style
        Text(
            text = "What can I help with?",
            fontSize = 24.sp,
            fontWeight = FontWeight.SemiBold,
            color = DarkText,
            textAlign = TextAlign.Center
        )
        
        Spacer(modifier = Modifier.height(24.dp))
        
        // Mode suggestion chips - First row (clickable suggestions)
        Row(
            modifier = Modifier.fillMaxWidth(),
            horizontalArrangement = Arrangement.Center,
            verticalAlignment = Alignment.CenterVertically
        ) {
            HomeModeChip(
                icon = "🎨",
                label = "Create image",
                onClick = { onSuggestionClick("Create an image of ") }
            )
            Spacer(modifier = Modifier.width(8.dp))
            HomeModeChip(
                icon = "💡",
                label = "Make a plan",
                onClick = { onSuggestionClick("Help me make a plan for ") }
            )
        }
        
        Spacer(modifier = Modifier.height(8.dp))
        
        // Mode suggestion chips - Second row
        Row(
            modifier = Modifier.fillMaxWidth(),
            horizontalArrangement = Arrangement.Center,
            verticalAlignment = Alignment.CenterVertically
        ) {
            HomeModeChip(
                icon = "📊",
                label = "Analyze data",
                onClick = { onSuggestionClick("Analyze this data: ") }
            )
            Spacer(modifier = Modifier.width(8.dp))
            HomeModeChip(
                icon = "💻",
                label = "Code",
                onClick = { onSuggestionClick("Write code to ") }
            )
            Spacer(modifier = Modifier.width(8.dp))
            HomeModeChip(
                icon = "🔍",
                label = "Research",
                onClick = { onSuggestionClick("Research about ") }
            )
        }
        
        Spacer(modifier = Modifier.weight(1f))
    }
}

@Composable
private fun HomeModeChip(
    icon: String,
    label: String,
    onClick: () -> Unit
) {
    Surface(
        modifier = Modifier
            .clip(RoundedCornerShape(20.dp))
            .clickable(
                interactionSource = remember { MutableInteractionSource() },
                indication = null,
                onClick = onClick
            ),
        color = ChipBackground,
        shape = RoundedCornerShape(20.dp),
        border = androidx.compose.foundation.BorderStroke(1.dp, ChipBorder)
    ) {
        Row(
            modifier = Modifier.padding(horizontal = 14.dp, vertical = 10.dp),
            verticalAlignment = Alignment.CenterVertically
        ) {
            Text(
                text = icon,
                fontSize = 16.sp
            )
            Spacer(modifier = Modifier.width(6.dp))
            Text(
                text = label,
                fontSize = 14.sp,
                color = DarkText,
                fontWeight = FontWeight.Medium
            )
        }
    }
}

/**
 * User message text that renders @tags in bold
 */
@Composable
private fun UserMessageText(text: String) {
    // Regex to find @tags (words starting with @)
    val tagPattern = Regex("@\\w+")
    
    val annotatedString = buildAnnotatedString {
        var lastIndex = 0
        tagPattern.findAll(text).forEach { matchResult ->
            // Append text before the tag
            append(text.substring(lastIndex, matchResult.range.first))
            
            // Append the tag in bold with accent color
            withStyle(SpanStyle(
                fontWeight = FontWeight.Bold,
                color = GreenAccent
            )) {
                append(matchResult.value)
            }
            
            lastIndex = matchResult.range.last + 1
        }
        // Append remaining text
        if (lastIndex < text.length) {
            append(text.substring(lastIndex))
        }
    }
    
    Text(
        text = annotatedString,
        fontSize = 15.sp,
        color = DarkText,
        lineHeight = 22.sp
    )
}

@Composable
private fun SuggestionChip(
    title: String,
    subtitle: String,
    onClick: () -> Unit
) {
    Surface(
        modifier = Modifier
            .fillMaxWidth(0.7f)
            .clip(RoundedCornerShape(16.dp))
            .clickable(
                interactionSource = remember { MutableInteractionSource() },
                indication = null,
                onClick = onClick
            ),
        color = ChipBackground,
        shape = RoundedCornerShape(16.dp),
        border = androidx.compose.foundation.BorderStroke(1.dp, ChipBorder)
    ) {
        Column(
            modifier = Modifier.padding(horizontal = 16.dp, vertical = 14.dp)
        ) {
            Text(
                text = title,
                fontSize = 15.sp,
                fontWeight = FontWeight.SemiBold,
                color = DarkText
            )
            Text(
                text = subtitle,
                fontSize = 14.sp,
                color = GrayText
            )
        }
    }
}

/**
 * ChatGPT-style message bubble with all action buttons:
 * - Copy: Copy message to clipboard
 * - Rewrite: Regenerate the response
 * - Share: Share the message via system share sheet
 * - Like/Dislike: Feedback for auto-learning
 */
@Composable
private fun MessageBubble(
    message: ChatMessage,
    onCopy: (String) -> Unit = {},
    onRegenerate: (() -> Unit)? = null,
    onSpeak: ((String) -> Unit)? = null,
    onLike: ((String, Boolean) -> Unit)? = null
) {
    var showActions by remember { mutableStateOf(false) }
    var feedbackState by remember { mutableStateOf<Boolean?>(null) } // null=none, true=liked, false=disliked
    val context = androidx.compose.ui.platform.LocalContext.current
    
    Column(
        modifier = Modifier
            .fillMaxWidth()
            .padding(horizontal = 16.dp, vertical = 6.dp)
    ) {
        Row(
            modifier = Modifier.fillMaxWidth(),
            horizontalArrangement = if (message.role == MessageRole.USER) 
                Arrangement.End else Arrangement.Start,
            verticalAlignment = Alignment.Top
        ) {
            if (message.role == MessageRole.ASSISTANT) {
                Image(
                    painter = painterResource(id = R.drawable.logo),
                    contentDescription = "AI",
                    modifier = Modifier
                        .size(28.dp)
                        .clip(RoundedCornerShape(6.dp))
                )
                Spacer(modifier = Modifier.width(8.dp))
            }
            
            Surface(
                color = if (message.role == MessageRole.USER) MessageBubbleUser else MessageBubbleAssistant,
                shape = RoundedCornerShape(16.dp),
                shadowElevation = if (message.role == MessageRole.ASSISTANT) 1.dp else 0.dp,
                modifier = Modifier
                    .widthIn(max = 340.dp) // Wide enough for tables
                    .clickable(
                        interactionSource = remember { MutableInteractionSource() },
                        indication = null
                    ) { 
                        if (message.role == MessageRole.ASSISTANT && !message.isStreaming) {
                            showActions = !showActions 
                        }
                    }
            ) {
                Column(
                    modifier = Modifier.padding(horizontal = 14.dp, vertical = 10.dp)
                ) {
                    // Show attachments if present (for user messages)
                    if (message.attachments.isNotEmpty() && message.role == MessageRole.USER) {
                        Row(
                            modifier = Modifier
                                .fillMaxWidth()
                                .padding(bottom = 8.dp),
                            horizontalArrangement = Arrangement.spacedBy(6.dp)
                        ) {
                            message.attachments.forEach { attachment ->
                                MessageAttachmentThumbnail(attachment = attachment)
                            }
                        }
                    }
                    
                    // Show generated image if present (for image generation responses)
                    if (message.imageResult?.success == true && message.imageResult.imageUrl != null) {
                        GeneratedImageDisplay(
                            imageUrl = message.imageResult.imageUrl,
                            imageBase64 = message.imageResult.imageBase64,
                            model = message.imageResult.model,
                            originalPrompt = message.imageResult.originalPrompt
                        )
                        Spacer(modifier = Modifier.height(8.dp))
                    }
                    
                    if (message.isStreaming && message.content.isEmpty()) {
                        TypingIndicator()
                    } else if (message.isStreaming) {
                        Column {
                            com.baatcheet.app.ui.components.MarkdownText(
                                text = message.content,
                                color = DarkText,
                                fontSize = 15f,
                                lineHeight = 22f
                            )
                            StreamingCursor()
                        }
                    } else {
                        if (message.role == MessageRole.ASSISTANT) {
                            com.baatcheet.app.ui.components.MarkdownText(
                                text = message.content,
                                color = DarkText,
                                fontSize = 15f,
                                lineHeight = 22f
                            )
                        } else {
                            UserMessageText(text = message.content)
                        }
                    }
                }
            }
            
            if (message.role == MessageRole.USER) {
                Spacer(modifier = Modifier.width(8.dp))
            }
        }
        
        // ChatGPT-style action buttons for assistant messages (always visible, small icons)
        if (message.role == MessageRole.ASSISTANT && !message.isStreaming) {
            AnimatedVisibility(
                visible = true, // Always show for assistant messages
                enter = fadeIn(),
                exit = fadeOut()
            ) {
                Row(
                    modifier = Modifier
                        .padding(start = 36.dp, top = 4.dp),
                    horizontalArrangement = Arrangement.spacedBy(0.dp),
                    verticalAlignment = Alignment.CenterVertically
                ) {
                    // Copy button
                    SmallActionButton(
                        icon = Icons.Outlined.ContentCopy,
                        contentDescription = "Copy",
                        onClick = {
                            onCopy(message.content)
                            android.widget.Toast.makeText(context, "Copied!", android.widget.Toast.LENGTH_SHORT).show()
                        }
                    )
                    
                    // Rewrite/Regenerate button
                    onRegenerate?.let { regenerate ->
                        SmallActionButton(
                            icon = Icons.Outlined.Refresh,
                            contentDescription = "Rewrite",
                            onClick = regenerate
                        )
                    }
                    
                    // Speak button
                    onSpeak?.let { speak ->
                        SmallActionButton(
                            icon = Icons.Outlined.VolumeUp,
                            contentDescription = "Speak",
                            onClick = { speak(message.content) }
                        )
                    }
                    
                    // Share button - opens system share sheet
                    SmallActionButton(
                        icon = Icons.Outlined.Share,
                        contentDescription = "Share",
                        onClick = {
                            shareText(context, message.content)
                        }
                    )
                    
                    Spacer(modifier = Modifier.width(8.dp))
                    
                    // Divider
                    Box(
                        modifier = Modifier
                            .width(1.dp)
                            .height(16.dp)
                            .background(ChipBorder)
                    )
                    
                    Spacer(modifier = Modifier.width(8.dp))
                    
                    // Like button
                    SmallActionButton(
                        icon = if (feedbackState == true) Icons.Filled.ThumbUp else Icons.Outlined.ThumbUp,
                        contentDescription = "Good response",
                        tint = if (feedbackState == true) GreenAccent else GrayText,
                        onClick = {
                            feedbackState = if (feedbackState == true) null else true
                            onLike?.invoke(message.id, true)
                        }
                    )
                    
                    // Dislike button
                    SmallActionButton(
                        icon = if (feedbackState == false) Icons.Filled.ThumbDown else Icons.Outlined.ThumbDown,
                        contentDescription = "Bad response",
                        tint = if (feedbackState == false) Color(0xFFE53935) else GrayText,
                        onClick = {
                            feedbackState = if (feedbackState == false) null else false
                            onLike?.invoke(message.id, false)
                        }
                    )
                }
            }
        }
    }
}

/**
 * Small action button for message actions (ChatGPT style)
 */
@Composable
private fun SmallActionButton(
    icon: ImageVector,
    contentDescription: String,
    tint: Color = GrayText,
    onClick: () -> Unit
) {
    IconButton(
        onClick = onClick,
        modifier = Modifier.size(28.dp)
    ) {
        Icon(
            imageVector = icon,
            contentDescription = contentDescription,
            tint = tint,
            modifier = Modifier.size(16.dp)
        )
    }
}

/**
 * Animated typing indicator with bouncing dots
 */
@Composable
private fun TypingIndicator() {
    val infiniteTransition = rememberInfiniteTransition(label = "typing")
    
    Row(
        horizontalArrangement = Arrangement.spacedBy(4.dp),
        verticalAlignment = Alignment.CenterVertically
    ) {
        repeat(3) { index ->
            val animatedAlpha by infiniteTransition.animateFloat(
                initialValue = 0.3f,
                targetValue = 1f,
                animationSpec = infiniteRepeatable(
                    animation = tween(
                        durationMillis = 600,
                        easing = LinearEasing
                    ),
                    repeatMode = RepeatMode.Reverse,
                    initialStartOffset = StartOffset(index * 200)
                ),
                label = "dot_$index"
            )
            
            Box(
                modifier = Modifier
                    .size(8.dp)
                    .background(
                        GreenAccent.copy(alpha = animatedAlpha),
                        CircleShape
                    )
            )
        }
    }
}

/**
 * Blinking cursor for streaming effect
 */
@Composable
private fun StreamingCursor() {
    val infiniteTransition = rememberInfiniteTransition(label = "cursor")
    
    val cursorAlpha by infiniteTransition.animateFloat(
        initialValue = 0f,
        targetValue = 1f,
        animationSpec = infiniteRepeatable(
            animation = tween(
                durationMillis = 500,
                easing = LinearEasing
            ),
            repeatMode = RepeatMode.Reverse
        ),
        label = "cursor_blink"
    )
    
    Box(
        modifier = Modifier
            .width(2.dp)
            .height(16.dp)
            .background(GreenAccent.copy(alpha = cursorAlpha))
    )
}

/**
 * Available chat tags for quick actions
 */
private val CHAT_TAGS = listOf(
    "@image" to "Generate an image",
    "@browse" to "Search the web",
    "@code" to "Code assistance",
    "@explain" to "Detailed explanation",
    "@summarize" to "Summarize content",
    "@translate" to "Translate text",
    "@math" to "Mathematical problems",
    "@creative" to "Creative writing"
)

@Composable
private fun TagSuggestions(
    input: String,
    onTagSelect: (String) -> Unit
) {
    if (input.startsWith("@") && input.length < 12) {
        val filtered = CHAT_TAGS.filter { it.first.startsWith(input.lowercase()) }
        
        if (filtered.isNotEmpty()) {
            Surface(
                modifier = Modifier
                    .fillMaxWidth()
                    .padding(horizontal = 12.dp),
                color = WhiteBackground,
                shadowElevation = 2.dp,
                shape = RoundedCornerShape(12.dp)
            ) {
                Column(
                    modifier = Modifier.padding(8.dp)
                ) {
                    Text(
                        text = "Chat Tags",
                        fontSize = 12.sp,
                        fontWeight = FontWeight.Medium,
                        color = GrayText,
                        modifier = Modifier.padding(horizontal = 8.dp, vertical = 4.dp)
                    )
                    
                    filtered.forEach { (tag, description) ->
                        Row(
                            modifier = Modifier
                                .fillMaxWidth()
                                .clip(RoundedCornerShape(8.dp))
                                .clickable { onTagSelect(tag) }
                                .padding(horizontal = 8.dp, vertical = 8.dp),
                            verticalAlignment = Alignment.CenterVertically
                        ) {
                            Text(
                                text = tag,
                                fontSize = 14.sp,
                                fontWeight = FontWeight.SemiBold,
                                color = GreenAccent
                            )
                            Spacer(modifier = Modifier.width(8.dp))
                            Text(
                                text = description,
                                fontSize = 13.sp,
                                color = GrayText
                            )
                        }
                    }
                }
            }
        }
    }
}

@Composable
private fun FilePreviewRow(
    files: List<UploadedFileState>,
    onRemove: (String) -> Unit
) {
    if (files.isNotEmpty()) {
        Row(
            modifier = Modifier
                .fillMaxWidth()
                .padding(horizontal = 12.dp, vertical = 8.dp),
            horizontalArrangement = Arrangement.spacedBy(8.dp)
        ) {
            files.forEach { file ->
                FilePreviewItem(
                    file = file,
                    onRemove = { onRemove(file.id) }
                )
            }
        }
    }
}

@Composable
private fun FilePreviewItem(
    file: UploadedFileState,
    onRemove: () -> Unit
) {
    Box(
        modifier = Modifier
            .size(72.dp)
            .clip(RoundedCornerShape(12.dp))
            .border(
                width = 2.dp,
                color = when (file.status) {
                    FileUploadStatus.READY -> GreenAccent
                    FileUploadStatus.FAILED -> Color.Red
                    FileUploadStatus.UPLOADING, FileUploadStatus.PROCESSING -> Color(0xFF2196F3)
                    else -> GrayText
                },
                shape = RoundedCornerShape(12.dp)
            )
            .background(ChipBackground)
    ) {
        // File icon/preview
        if (file.mimeType.startsWith("image/")) {
            // Show actual image thumbnail for images
            AsyncImage(
                model = file.uri,
                contentDescription = "Image preview",
                modifier = Modifier.fillMaxSize(),
                contentScale = ContentScale.Crop
            )
        } else {
            // Document preview with icon and filename
            Column(
                modifier = Modifier
                    .fillMaxSize()
                    .background(
                        brush = Brush.verticalGradient(
                            colors = listOf(
                                Color(0xFF4CAF50).copy(alpha = 0.1f),
                                Color(0xFF2196F3).copy(alpha = 0.1f)
                            )
                        )
                    )
                    .padding(6.dp),
                horizontalAlignment = Alignment.CenterHorizontally,
                verticalArrangement = Arrangement.Center
            ) {
                // Document type icon
                val icon = when {
                    file.mimeType.contains("pdf") -> Icons.Default.PictureAsPdf
                    file.mimeType.contains("word") || file.mimeType.contains("doc") -> Icons.Default.Article
                    file.mimeType.contains("text") -> Icons.Default.TextSnippet
                    else -> Icons.Default.Description
                }
                
                Icon(
                    imageVector = icon,
                    contentDescription = "Document",
                    tint = GreenAccent,
                    modifier = Modifier.size(28.dp)
                )
                
                Spacer(modifier = Modifier.height(4.dp))
                
                // Filename
                Text(
                    text = file.filename.take(10) + if (file.filename.length > 10) "..." else "",
                    fontSize = 8.sp,
                    color = DarkText,
                    maxLines = 1,
                    textAlign = TextAlign.Center
                )
                
                // File extension badge
                val extension = file.filename.substringAfterLast('.', "").uppercase()
                if (extension.isNotEmpty() && extension.length <= 4) {
                    Text(
                        text = extension,
                        fontSize = 7.sp,
                        color = Color.White,
                        modifier = Modifier
                            .background(GreenAccent, RoundedCornerShape(2.dp))
                            .padding(horizontal = 4.dp, vertical = 1.dp)
                    )
                }
            }
        }
        
        // Status indicator
        when (file.status) {
            FileUploadStatus.UPLOADING, FileUploadStatus.PROCESSING -> {
                Box(
                    modifier = Modifier
                        .fillMaxSize()
                        .background(Color.Black.copy(alpha = 0.5f)),
                    contentAlignment = Alignment.Center
                ) {
                    CircularProgressIndicator(
                        modifier = Modifier.size(20.dp),
                        color = Color.White,
                        strokeWidth = 2.dp
                    )
                }
            }
            FileUploadStatus.READY -> {
                Box(
                    modifier = Modifier
                        .align(Alignment.BottomEnd)
                        .size(16.dp)
                        .background(GreenAccent, CircleShape),
                    contentAlignment = Alignment.Center
                ) {
                    Icon(
                        imageVector = Icons.Default.Check,
                        contentDescription = "Ready",
                        tint = Color.White,
                        modifier = Modifier.size(10.dp)
                    )
                }
            }
            FileUploadStatus.FAILED -> {
                Box(
                    modifier = Modifier
                        .align(Alignment.BottomEnd)
                        .size(16.dp)
                        .background(Color.Red, CircleShape),
                    contentAlignment = Alignment.Center
                ) {
                    Icon(
                        imageVector = Icons.Default.Close,
                        contentDescription = "Failed",
                        tint = Color.White,
                        modifier = Modifier.size(10.dp)
                    )
                }
            }
            else -> {}
        }
        
        // Remove button
        IconButton(
            onClick = onRemove,
            modifier = Modifier
                .align(Alignment.TopEnd)
                .size(20.dp)
                .background(Color.Black.copy(alpha = 0.5f), CircleShape)
        ) {
            Icon(
                imageVector = Icons.Default.Close,
                contentDescription = "Remove",
                tint = Color.White,
                modifier = Modifier.size(12.dp)
            )
        }
    }
}

@Composable
private fun ChatInputBar(
    value: String,
    onValueChange: (String) -> Unit,
    onSend: () -> Unit,
    isLoading: Boolean,
    uploadedFiles: List<UploadedFileState> = emptyList(),
    onRemoveFile: (String) -> Unit = {},
    onCameraClick: () -> Unit = {},
    onImageClick: () -> Unit = {},
    onFolderClick: () -> Unit = {},
    isListening: Boolean = false,
    audioLevel: Float = 0f,
    onMicClick: () -> Unit = {},
    onHeadphoneClick: () -> Unit = {},
    currentMode: com.baatcheet.app.domain.model.AIMode? = null,
    promptAnalysis: com.baatcheet.app.domain.model.PromptAnalysisResult? = null,
    onModeClick: () -> Unit = {},
    selectedPlusMode: String? = null,
    onPlusModeSelect: (String) -> Unit = {},
    uploadLimitReached: Boolean = false,
    imageGenLimitReached: Boolean = false,
    uploadsUsedToday: Int = 0,
    uploadDailyLimit: Int = 6,
    uploadNextAvailableAt: String? = null,
    imageGenUsedToday: Int = 0,
    imageGenDailyLimit: Int = 6,
    imageGenNextAvailableAt: String? = null
) {
    var showPlusMenu by remember { mutableStateOf(false) }
    
    Surface(
        modifier = Modifier.fillMaxWidth(),
        color = WhiteBackground,
        shadowElevation = 4.dp
    ) {
        Column {
            // Tag suggestions
            TagSuggestions(
                input = value,
                onTagSelect = { tag ->
                    onValueChange(tag + " ")
                }
            )
            
            // Image preview row with thumbnails
            ImagePreviewRow(
                files = uploadedFiles,
                onRemove = onRemoveFile
            )
            
            // Selected mode indicator chip
            if (selectedPlusMode != null) {
                Row(
                    modifier = Modifier
                        .fillMaxWidth()
                        .padding(horizontal = 16.dp, vertical = 4.dp),
                    verticalAlignment = Alignment.CenterVertically
                ) {
                    val (icon, label) = when (selectedPlusMode) {
                        "image-generation" -> "🎨" to "Create image"
                        "research" -> "💡" to "Deep research"
                        "web-search" -> "🌐" to "Web search"
                        "tutor" -> "📚" to "Study & learn"
                        "code" -> "💻" to "Code"
                        else -> "✨" to selectedPlusMode
                    }
                    
                    Surface(
                        shape = RoundedCornerShape(16.dp),
                        color = GreenAccent.copy(alpha = 0.15f),
                        modifier = Modifier.clickable { onPlusModeSelect("") }
                    ) {
                        Row(
                            modifier = Modifier.padding(horizontal = 12.dp, vertical = 6.dp),
                            verticalAlignment = Alignment.CenterVertically,
                            horizontalArrangement = Arrangement.spacedBy(6.dp)
                        ) {
                            Text(text = icon, fontSize = 14.sp)
                            Text(
                                text = label,
                                fontSize = 13.sp,
                                fontWeight = FontWeight.SemiBold,
                                color = GreenAccent
                            )
                            Icon(
                                imageVector = Icons.Default.Close,
                                contentDescription = "Remove mode",
                                tint = GreenAccent,
                                modifier = Modifier.size(14.dp)
                            )
                        }
                    }
                }
            }
            
            // Main input row - ChatGPT style
            Row(
                modifier = Modifier
                    .fillMaxWidth()
                    .navigationBarsPadding()
                    .padding(horizontal = 12.dp, vertical = 10.dp),
                verticalAlignment = Alignment.CenterVertically,
                horizontalArrangement = Arrangement.spacedBy(8.dp)
            ) {
                // Plus button - opens action sheet
                IconButton(
                    onClick = { showPlusMenu = true },
                    modifier = Modifier.size(36.dp)
                ) {
                    Box(
                        modifier = Modifier
                            .size(32.dp)
                            .background(ChipBackground, CircleShape),
                        contentAlignment = Alignment.Center
                    ) {
                        Icon(
                            imageVector = Icons.Default.Add,
                            contentDescription = "More options",
                            tint = DarkText,
                            modifier = Modifier.size(20.dp)
                        )
                    }
                }
                
                // Text input - rounded pill style
                Box(
                    modifier = Modifier
                        .weight(1f)
                        .height(40.dp)
                        .border(
                            width = 1.dp,
                            color = InputBorder,
                            shape = RoundedCornerShape(20.dp)
                        )
                        .background(WhiteBackground, RoundedCornerShape(20.dp))
                        .padding(horizontal = 16.dp),
                    contentAlignment = Alignment.CenterStart
                ) {
                    if (value.isEmpty()) {
                        Text(
                            text = "Ask BaatCheet",
                            color = LightGrayText,
                            fontSize = 15.sp
                        )
                    }
                    BasicTextField(
                        value = value,
                        onValueChange = onValueChange,
                        modifier = Modifier.fillMaxWidth(),
                        textStyle = TextStyle(
                            color = DarkText,
                            fontSize = 15.sp
                        ),
                        cursorBrush = SolidColor(GreenAccent),
                        maxLines = 1,
                        singleLine = true
                    )
                }
                
                // Mic button
                IconButton(
                    onClick = onMicClick,
                    modifier = Modifier.size(36.dp)
                ) {
                    if (isListening) {
                        // Animated listening indicator with waveform
                        Box(
                            modifier = Modifier
                                .size(32.dp)
                                .background(
                                    color = GreenAccent.copy(alpha = 0.2f + audioLevel * 0.8f),
                                    shape = CircleShape
                                ),
                            contentAlignment = Alignment.Center
                        ) {
                            // Waveform bars animation
                            Row(
                                horizontalArrangement = Arrangement.spacedBy(2.dp),
                                verticalAlignment = Alignment.CenterVertically
                            ) {
                                repeat(3) { i ->
                                    Box(
                                        modifier = Modifier
                                            .width(3.dp)
                                            .height((8.dp + (audioLevel * 12 * (i + 1) / 3).dp))
                                            .background(GreenAccent, RoundedCornerShape(1.5.dp))
                                    )
                                }
                            }
                        }
                    } else {
                        Icon(
                            imageVector = Icons.Outlined.Mic,
                            contentDescription = "Voice input",
                            tint = GrayText,
                            modifier = Modifier.size(24.dp)
                        )
                    }
                }
                
                // Send or Voice chat button
                if (value.isNotBlank()) {
                    IconButton(
                        onClick = onSend,
                        enabled = !isLoading,
                        modifier = Modifier.size(36.dp)
                    ) {
                        Box(
                            modifier = Modifier
                                .size(32.dp)
                                .background(
                                    if (isLoading) GrayText else GreenAccent,
                                    CircleShape
                                ),
                            contentAlignment = Alignment.Center
                        ) {
                            if (isLoading) {
                                CircularProgressIndicator(
                                    modifier = Modifier.size(16.dp),
                                    color = Color.White,
                                    strokeWidth = 2.dp
                                )
                            } else {
                                Icon(
                                    imageVector = Icons.Default.ArrowUpward,
                                    contentDescription = "Send",
                                    tint = Color.White,
                                    modifier = Modifier.size(18.dp)
                                )
                            }
                        }
                    }
                } else {
                    // Voice chat button with waveform icon
                    IconButton(
                        onClick = onHeadphoneClick,
                        modifier = Modifier.size(36.dp)
                    ) {
                        Box(
                            modifier = Modifier
                                .size(32.dp)
                                .background(DarkText, CircleShape),
                            contentAlignment = Alignment.Center
                        ) {
                            // Waveform icon
                            Row(
                                horizontalArrangement = Arrangement.spacedBy(2.dp),
                                verticalAlignment = Alignment.CenterVertically
                            ) {
                                listOf(6, 12, 8, 14, 6).forEach { height ->
                                    Box(
                                        modifier = Modifier
                                            .width(2.dp)
                                            .height(height.dp)
                                            .background(Color.White, RoundedCornerShape(1.dp))
                                    )
                                }
                            }
                        }
                    }
                }
            }
        }
    }
    
    // ChatGPT-style Plus menu bottom sheet
    if (showPlusMenu) {
        PlusMenuBottomSheet(
            onDismiss = { showPlusMenu = false },
            onCameraClick = {
                showPlusMenu = false
                onCameraClick()
            },
            onPhotosClick = {
                showPlusMenu = false
                onImageClick()
            },
            onFilesClick = {
                showPlusMenu = false
                onFolderClick()
            },
            onModeSelect = { mode ->
                showPlusMenu = false
                onPlusModeSelect(mode)
            },
            uploadLimitReached = uploadLimitReached,
            imageGenLimitReached = imageGenLimitReached,
            uploadsUsedToday = uploadsUsedToday,
            uploadDailyLimit = uploadDailyLimit,
            uploadNextAvailableAt = uploadNextAvailableAt,
            imageGenUsedToday = imageGenUsedToday,
            imageGenDailyLimit = imageGenDailyLimit,
            imageGenNextAvailableAt = imageGenNextAvailableAt
        )
    }
}

/**
 * ChatGPT-style Plus menu bottom sheet
 */
@OptIn(ExperimentalMaterial3Api::class)
@Composable
private fun PlusMenuBottomSheet(
    onDismiss: () -> Unit,
    onCameraClick: () -> Unit,
    onPhotosClick: () -> Unit,
    onFilesClick: () -> Unit,
    onModeSelect: (String) -> Unit,
    uploadLimitReached: Boolean = false,
    imageGenLimitReached: Boolean = false,
    uploadsUsedToday: Int = 0,
    uploadDailyLimit: Int = 6,
    uploadNextAvailableAt: String? = null,
    imageGenUsedToday: Int = 0,
    imageGenDailyLimit: Int = 6,
    imageGenNextAvailableAt: String? = null
) {
    val sheetState = rememberModalBottomSheetState()
    val context = androidx.compose.ui.platform.LocalContext.current
    
    // Format next available time for uploads
    val uploadNextTimeFormatted = remember(uploadNextAvailableAt) {
        formatNextAvailableTime(uploadNextAvailableAt)
    }
    
    // Format next available time for image gen
    val imageGenNextTimeFormatted = remember(imageGenNextAvailableAt) {
        formatNextAvailableTime(imageGenNextAvailableAt)
    }
    
    ModalBottomSheet(
        onDismissRequest = onDismiss,
        sheetState = sheetState,
        containerColor = WhiteBackground
    ) {
        Column(
            modifier = Modifier
                .fillMaxWidth()
                .padding(bottom = 32.dp)
        ) {
            // Upload limit status bar
            if (uploadLimitReached || uploadsUsedToday > 0) {
                Row(
                    modifier = Modifier
                        .fillMaxWidth()
                        .padding(horizontal = 16.dp, vertical = 8.dp)
                        .background(
                            if (uploadLimitReached) Color(0xFFFFF3E0) else Color(0xFFE3F2FD),
                            RoundedCornerShape(8.dp)
                        )
                        .padding(12.dp),
                    verticalAlignment = Alignment.CenterVertically
                ) {
                    Icon(
                        imageVector = if (uploadLimitReached) Icons.Outlined.Warning else Icons.Outlined.Info,
                        contentDescription = null,
                        tint = if (uploadLimitReached) Color(0xFFFF9800) else Color(0xFF2196F3),
                        modifier = Modifier.size(20.dp)
                    )
                    Spacer(modifier = Modifier.width(8.dp))
                    Column(modifier = Modifier.weight(1f)) {
                        Text(
                            text = if (uploadLimitReached) 
                                "Upload limit reached" 
                            else 
                                "Uploads: $uploadsUsedToday/$uploadDailyLimit used today",
                            style = MaterialTheme.typography.bodySmall,
                            fontWeight = FontWeight.Medium,
                            color = if (uploadLimitReached) Color(0xFFE65100) else Color(0xFF1565C0)
                        )
                        if (uploadLimitReached && uploadNextTimeFormatted != null) {
                            Text(
                                text = "⏰ Next available: $uploadNextTimeFormatted",
                                style = MaterialTheme.typography.bodySmall,
                                color = Color(0xFFE65100)
                            )
                        }
                    }
                }
            }
            
            // Media options - Camera, Photos, Files
            Row(
                modifier = Modifier
                    .fillMaxWidth()
                    .padding(horizontal = 16.dp, vertical = 12.dp),
                horizontalArrangement = Arrangement.SpaceEvenly
            ) {
                MediaOptionButton(
                    icon = Icons.Outlined.CameraAlt,
                    label = "Camera",
                    onClick = {
                        if (uploadLimitReached) {
                            android.widget.Toast.makeText(context, "Daily upload limit reached. Next available: $uploadNextTimeFormatted", android.widget.Toast.LENGTH_LONG).show()
                        } else {
                            onCameraClick()
                        }
                    },
                    enabled = !uploadLimitReached
                )
                MediaOptionButton(
                    icon = Icons.Outlined.Image,
                    label = "Photos",
                    onClick = {
                        if (uploadLimitReached) {
                            android.widget.Toast.makeText(context, "Daily upload limit reached. Next available: $uploadNextTimeFormatted", android.widget.Toast.LENGTH_LONG).show()
                        } else {
                            onPhotosClick()
                        }
                    },
                    enabled = !uploadLimitReached
                )
                MediaOptionButton(
                    icon = Icons.Outlined.AttachFile,
                    label = "Files",
                    onClick = {
                        if (uploadLimitReached) {
                            android.widget.Toast.makeText(context, "Daily upload limit reached. Next available: $uploadNextTimeFormatted", android.widget.Toast.LENGTH_LONG).show()
                        } else {
                            onFilesClick()
                        }
                    },
                    enabled = !uploadLimitReached
                )
            }
            
            HorizontalDivider(
                modifier = Modifier.padding(vertical = 8.dp),
                color = ChipBorder
            )
            
            // AI Mode options
            Column(
                modifier = Modifier.padding(horizontal = 16.dp)
            ) {
                ModeMenuItem(
                    icon = "🎨",
                    title = if (imageGenLimitReached) "Create image (limit reached)" else "Create image",
                    subtitle = if (imageGenLimitReached) 
                        "⏰ Next: ${imageGenNextTimeFormatted ?: "24 hours"}" 
                    else 
                        "Visualize anything ($imageGenUsedToday/$imageGenDailyLimit used)",
                    onClick = {
                        if (imageGenLimitReached) {
                            android.widget.Toast.makeText(context, "Daily image limit reached. Next available: $imageGenNextTimeFormatted", android.widget.Toast.LENGTH_LONG).show()
                        } else {
                            onModeSelect("image-generation")
                        }
                    },
                    enabled = !imageGenLimitReached
                )
                ModeMenuItem(
                    icon = "💡",
                    title = "Thinking",
                    subtitle = "Think longer for better answers",
                    onClick = { onModeSelect("research") }
                )
                ModeMenuItem(
                    icon = "🔍",
                    title = "Deep research",
                    subtitle = "Get a detailed report",
                    onClick = { onModeSelect("research") }
                )
                ModeMenuItem(
                    icon = "🌐",
                    title = "Web search",
                    subtitle = "Find real-time news and info",
                    onClick = { onModeSelect("web-search") }
                )
                ModeMenuItem(
                    icon = "📚",
                    title = "Study and learn",
                    subtitle = "Learn a new concept",
                    onClick = { onModeSelect("tutor") }
                )
                ModeMenuItem(
                    icon = "📎",
                    title = "Add files",
                    subtitle = "Analyze or summarize",
                    onClick = onFilesClick
                )
                ModeMenuItem(
                    icon = "💻",
                    title = "Code",
                    subtitle = "Write and debug code",
                    onClick = { onModeSelect("code") }
                )
            }
        }
    }
}

@Composable
private fun MediaOptionButton(
    icon: ImageVector,
    label: String,
    onClick: () -> Unit,
    enabled: Boolean = true
) {
    val alpha = if (enabled) 1f else 0.4f
    Column(
        horizontalAlignment = Alignment.CenterHorizontally,
        modifier = Modifier
            .clip(RoundedCornerShape(12.dp))
            .clickable(enabled = enabled, onClick = onClick)
            .padding(16.dp)
            .alpha(alpha)
    ) {
        Box(
            modifier = Modifier
                .size(56.dp)
                .background(ChipBackground, RoundedCornerShape(12.dp)),
            contentAlignment = Alignment.Center
        ) {
            Icon(
                imageVector = icon,
                contentDescription = label,
                tint = if (enabled) DarkText else GrayText,
                modifier = Modifier.size(28.dp)
            )
        }
        Spacer(modifier = Modifier.height(8.dp))
        Text(
            text = label,
            fontSize = 13.sp,
            color = if (enabled) DarkText else GrayText
        )
    }
}

@Composable
private fun ModeMenuItem(
    icon: String,
    title: String,
    subtitle: String,
    onClick: () -> Unit,
    enabled: Boolean = true
) {
    val alpha = if (enabled) 1f else 0.4f
    Row(
        modifier = Modifier
            .fillMaxWidth()
            .clip(RoundedCornerShape(8.dp))
            .clickable(enabled = enabled, onClick = onClick)
            .padding(vertical = 12.dp, horizontal = 8.dp)
            .alpha(alpha),
        verticalAlignment = Alignment.CenterVertically
    ) {
        Text(
            text = icon,
            fontSize = 24.sp,
            modifier = Modifier.padding(end = 16.dp)
        )
        Column(modifier = Modifier.weight(1f)) {
            Text(
                text = title,
                fontSize = 15.sp,
                fontWeight = FontWeight.Medium,
                color = if (enabled) DarkText else GrayText
            )
            Text(
                text = subtitle,
                fontSize = 13.sp,
                color = GrayText
            )
        }
    }
}

/**
 * Attachment thumbnail in a message bubble
 */
@Composable
private fun MessageAttachmentThumbnail(
    attachment: com.baatcheet.app.domain.model.MessageAttachment
) {
    Box(
        modifier = Modifier
            .size(56.dp)
            .clip(RoundedCornerShape(8.dp))
            .background(ChipBackground)
    ) {
        if (attachment.mimeType.startsWith("image/")) {
            // Show image thumbnail
            val imageUri = attachment.thumbnailUri ?: attachment.url
            if (imageUri != null) {
                androidx.compose.foundation.Image(
                    painter = rememberAsyncImagePainter(imageUri),
                    contentDescription = attachment.filename,
                    modifier = Modifier.fillMaxSize(),
                    contentScale = androidx.compose.ui.layout.ContentScale.Crop
                )
            } else {
                Icon(
                    imageVector = Icons.Outlined.Image,
                    contentDescription = attachment.filename,
                    tint = GrayText,
                    modifier = Modifier
                        .size(24.dp)
                        .align(Alignment.Center)
                )
            }
        } else {
            // Show document icon based on type
            val icon = when {
                attachment.mimeType.contains("pdf") -> Icons.Outlined.Description
                attachment.mimeType.contains("word") || attachment.mimeType.contains("doc") -> Icons.Outlined.Description
                attachment.mimeType.contains("text") -> Icons.Outlined.Description
                else -> Icons.Outlined.Folder
            }
            
            Column(
                modifier = Modifier.fillMaxSize(),
                horizontalAlignment = Alignment.CenterHorizontally,
                verticalArrangement = Arrangement.Center
            ) {
                Icon(
                    imageVector = icon,
                    contentDescription = attachment.filename,
                    tint = GreenAccent,
                    modifier = Modifier.size(24.dp)
                )
                Text(
                    text = attachment.filename.takeLast(8),
                    fontSize = 8.sp,
                    color = GrayText,
                    maxLines = 1,
                    overflow = TextOverflow.Ellipsis
                )
            }
        }
    }
}

/**
 * Image preview row with actual thumbnails
 */
@Composable
private fun ImagePreviewRow(
    files: List<UploadedFileState>,
    onRemove: (String) -> Unit
) {
    if (files.isEmpty()) return
    
    Row(
        modifier = Modifier
            .fillMaxWidth()
            .horizontalScroll(rememberScrollState())
            .padding(horizontal = 12.dp, vertical = 8.dp),
        horizontalArrangement = Arrangement.spacedBy(8.dp)
    ) {
        files.forEach { file ->
            Box(
                modifier = Modifier.size(72.dp)
            ) {
                // Image thumbnail
                if (file.mimeType.startsWith("image/")) {
                    androidx.compose.foundation.Image(
                        painter = rememberAsyncImagePainter(file.uri),
                        contentDescription = file.filename,
                        modifier = Modifier
                            .fillMaxSize()
                            .clip(RoundedCornerShape(12.dp))
                            .background(ChipBackground),
                        contentScale = androidx.compose.ui.layout.ContentScale.Crop
                    )
                } else {
                    // File icon for non-images
                    Box(
                        modifier = Modifier
                            .fillMaxSize()
                            .clip(RoundedCornerShape(12.dp))
                            .background(ChipBackground),
                        contentAlignment = Alignment.Center
                    ) {
                        Icon(
                            imageVector = Icons.Outlined.Description,
                            contentDescription = file.filename,
                            tint = GrayText,
                            modifier = Modifier.size(32.dp)
                        )
                    }
                }
                
                // Processing indicator
                if (file.status == FileUploadStatus.UPLOADING || file.status == FileUploadStatus.PROCESSING) {
                    Box(
                        modifier = Modifier
                            .fillMaxSize()
                            .background(Color.Black.copy(alpha = 0.4f), RoundedCornerShape(12.dp)),
                        contentAlignment = Alignment.Center
                    ) {
                        CircularProgressIndicator(
                            modifier = Modifier.size(24.dp),
                            color = Color.White,
                            strokeWidth = 2.dp
                        )
                    }
                }
                
                // Remove button
                IconButton(
                    onClick = { onRemove(file.id) },
                    modifier = Modifier
                        .align(Alignment.TopEnd)
                        .size(24.dp)
                        .offset(x = 4.dp, y = (-4).dp)
                ) {
                    Box(
                        modifier = Modifier
                            .size(20.dp)
                            .background(Color.Black.copy(alpha = 0.6f), CircleShape),
                        contentAlignment = Alignment.Center
                    ) {
                        Icon(
                            imageVector = Icons.Default.Close,
                            contentDescription = "Remove",
                            tint = Color.White,
                            modifier = Modifier.size(12.dp)
                        )
                    }
                }
            }
        }
    }
}

/**
 * Follow-up suggestions row
 */
@Composable
private fun SuggestionsRow(
    suggestions: List<String>,
    onSuggestionClick: (String) -> Unit
) {
    Row(
        modifier = Modifier
            .fillMaxWidth()
            .horizontalScroll(rememberScrollState())
            .padding(horizontal = 12.dp, vertical = 8.dp),
        horizontalArrangement = Arrangement.spacedBy(8.dp)
    ) {
        suggestions.take(4).forEach { suggestion ->
            Surface(
                onClick = { onSuggestionClick(suggestion) },
                shape = RoundedCornerShape(16.dp),
                color = ChipBackground,
                border = androidx.compose.foundation.BorderStroke(1.dp, ChipBorder)
            ) {
                Text(
                    text = suggestion,
                    fontSize = 12.sp,
                    color = DarkText,
                    maxLines = 1,
                    overflow = TextOverflow.Ellipsis,
                    modifier = Modifier.padding(horizontal = 12.dp, vertical = 8.dp)
                )
            }
        }
    }
}

/**
 * Usage/quota indicator
 */
@Composable
private fun UsageIndicator(
    usageInfo: com.baatcheet.app.domain.model.UsageInfo,
    onUpgradeClick: () -> Unit
) {
    Surface(
        modifier = Modifier
            .fillMaxWidth()
            .padding(horizontal = 12.dp, vertical = 4.dp),
        shape = RoundedCornerShape(8.dp),
        color = if (usageInfo.isMessageLimitReached) Color(0xFFFFF3E0) else ChipBackground
    ) {
        Row(
            modifier = Modifier.padding(horizontal = 12.dp, vertical = 8.dp),
            verticalAlignment = Alignment.CenterVertically,
            horizontalArrangement = Arrangement.SpaceBetween
        ) {
            Row(
                horizontalArrangement = Arrangement.spacedBy(8.dp),
                verticalAlignment = Alignment.CenterVertically
            ) {
                Icon(
                    imageVector = if (usageInfo.isMessageLimitReached) 
                        Icons.Outlined.Warning else Icons.Outlined.Info,
                    contentDescription = null,
                    tint = if (usageInfo.isMessageLimitReached) Color(0xFFE65100) else GrayText,
                    modifier = Modifier.size(16.dp)
                )
                Text(
                    text = usageInfo.quotaDescription,
                    fontSize = 12.sp,
                    color = if (usageInfo.isMessageLimitReached) Color(0xFFE65100) else GrayText
                )
            }
            
            if (usageInfo.isFreeTier) {
                Text(
                    text = "Upgrade",
                    fontSize = 12.sp,
                    color = GreenAccent,
                    fontWeight = FontWeight.Medium,
                    modifier = Modifier.clickable(
                        interactionSource = remember { MutableInteractionSource() },
                        indication = null,
                        onClick = onUpgradeClick
                    )
                )
            }
        }
    }
}

/**
 * Mode indicator chip in input bar
 */
@Composable
private fun ModeIndicatorChip(
    currentMode: com.baatcheet.app.domain.model.AIMode?,
    promptAnalysis: com.baatcheet.app.domain.model.PromptAnalysisResult?,
    onClick: () -> Unit
) {
    val displayMode = promptAnalysis?.let {
        "${it.modeIcon} ${it.modeDisplayName}"
    } ?: currentMode?.let {
        "${it.icon} ${it.displayName}"
    } ?: return
    
    val isAutoDetected = promptAnalysis != null && promptAnalysis.isHighConfidence
    
    Surface(
        onClick = onClick,
        shape = RoundedCornerShape(12.dp),
        color = if (isAutoDetected) GreenAccent.copy(alpha = 0.1f) else ChipBackground,
        border = androidx.compose.foundation.BorderStroke(
            1.dp,
            if (isAutoDetected) GreenAccent.copy(alpha = 0.3f) else ChipBorder
        ),
        modifier = Modifier.padding(horizontal = 12.dp, vertical = 4.dp)
    ) {
        Row(
            modifier = Modifier.padding(horizontal = 10.dp, vertical = 6.dp),
            verticalAlignment = Alignment.CenterVertically,
            horizontalArrangement = Arrangement.spacedBy(4.dp)
        ) {
            Text(
                text = displayMode,
                fontSize = 12.sp,
                color = if (isAutoDetected) GreenAccent else GrayText
            )
            if (isAutoDetected) {
                Text(
                    text = "✓ auto",
                    fontSize = 10.sp,
                    color = GreenAccent.copy(alpha = 0.7f)
                )
            }
            Icon(
                imageVector = Icons.Filled.KeyboardArrowDown,
                contentDescription = "Change mode",
                tint = GrayText,
                modifier = Modifier.size(14.dp)
            )
        }
    }
}

/**
 * Mode selector bottom sheet
 */
@OptIn(ExperimentalMaterial3Api::class)
@Composable
private fun ModeSelector(
    modes: List<com.baatcheet.app.domain.model.AIMode>,
    currentMode: com.baatcheet.app.domain.model.AIMode?,
    onModeSelect: (com.baatcheet.app.domain.model.AIMode) -> Unit,
    onDismiss: () -> Unit
) {
    val sheetState = rememberModalBottomSheetState()
    
    ModalBottomSheet(
        onDismissRequest = onDismiss,
        sheetState = sheetState,
        containerColor = WhiteBackground
    ) {
        Column(
            modifier = Modifier
                .fillMaxWidth()
                .padding(horizontal = 16.dp)
                .padding(bottom = 32.dp)
        ) {
            Text(
                text = "Select AI Mode",
                fontSize = 18.sp,
                fontWeight = FontWeight.Bold,
                color = DarkText,
                modifier = Modifier.padding(bottom = 16.dp)
            )
            
            modes.chunked(2).forEach { rowModes ->
                Row(
                    modifier = Modifier.fillMaxWidth(),
                    horizontalArrangement = Arrangement.spacedBy(12.dp)
                ) {
                    rowModes.forEach { mode ->
                        val isSelected = mode.id == currentMode?.id
                        
                        Surface(
                            onClick = { onModeSelect(mode) },
                            shape = RoundedCornerShape(12.dp),
                            color = if (isSelected) GreenAccent.copy(alpha = 0.1f) else ChipBackground,
                            border = if (isSelected) 
                                androidx.compose.foundation.BorderStroke(2.dp, GreenAccent) 
                            else 
                                androidx.compose.foundation.BorderStroke(1.dp, ChipBorder),
                            modifier = Modifier
                                .weight(1f)
                                .padding(vertical = 6.dp)
                        ) {
                            Column(
                                modifier = Modifier.padding(12.dp),
                                horizontalAlignment = Alignment.CenterHorizontally
                            ) {
                                Text(
                                    text = mode.icon,
                                    fontSize = 24.sp
                                )
                                Spacer(modifier = Modifier.height(4.dp))
                                Text(
                                    text = mode.displayName,
                                    fontSize = 13.sp,
                                    fontWeight = FontWeight.Medium,
                                    color = DarkText,
                                    textAlign = TextAlign.Center
                                )
                                if (mode.isLimited) {
                                    Text(
                                        text = "${mode.freeDailyLimit}/day",
                                        fontSize = 10.sp,
                                        color = GrayText
                                    )
                                }
                            }
                        }
                    }
                    
                    // Fill empty space if odd number
                    if (rowModes.size == 1) {
                        Spacer(modifier = Modifier.weight(1f))
                    }
                }
            }
        }
    }
}

/**
 * Share Chat Bottom Sheet - ChatGPT style
 */
@OptIn(ExperimentalMaterial3Api::class)
@Composable
private fun ShareChatBottomSheet(
    onDismiss: () -> Unit,
    onShareLink: () -> Unit,
    onCopyLink: () -> Unit,
    onAddPeople: (String) -> Unit = {},
    isProjectChat: Boolean = false // Only show "Add People" for project chats
) {
    val sheetState = rememberModalBottomSheetState()
    val context = androidx.compose.ui.platform.LocalContext.current
    var showAddPeopleDialog by remember { mutableStateOf(false) }
    var inviteEmail by remember { mutableStateOf("") }
    
    ModalBottomSheet(
        onDismissRequest = onDismiss,
        sheetState = sheetState,
        containerColor = WhiteBackground
    ) {
        Column(
            modifier = Modifier
                .fillMaxWidth()
                .padding(horizontal = 20.dp)
                .padding(bottom = 32.dp)
        ) {
            // Header
            Row(
                modifier = Modifier.fillMaxWidth(),
                horizontalArrangement = Arrangement.SpaceBetween,
                verticalAlignment = Alignment.CenterVertically
            ) {
                Text(
                    text = "Share Chat",
                    fontSize = 20.sp,
                    fontWeight = FontWeight.Bold,
                    color = DarkText
                )
                IconButton(onClick = onDismiss) {
                    Icon(
                        Icons.Default.Close,
                        contentDescription = "Close",
                        tint = GrayText
                    )
                }
            }
            
            Spacer(modifier = Modifier.height(16.dp))
            
            // Description
            Text(
                text = "Anyone with the link can view this chat. Messages you send after sharing won't be visible.",
                fontSize = 14.sp,
                color = GrayText,
                lineHeight = 20.sp
            )
            
            Spacer(modifier = Modifier.height(24.dp))
            
            // Share Link Button
            Button(
                onClick = {
                    onShareLink()
                    onDismiss()
                },
                modifier = Modifier
                    .fillMaxWidth()
                    .height(48.dp),
                colors = ButtonDefaults.buttonColors(containerColor = GreenAccent),
                shape = RoundedCornerShape(24.dp)
            ) {
                Icon(
                    Icons.Outlined.Share,
                    contentDescription = null,
                    modifier = Modifier.size(20.dp)
                )
                Spacer(modifier = Modifier.width(8.dp))
                Text("Share Link", fontSize = 16.sp, fontWeight = FontWeight.Medium)
            }
            
            Spacer(modifier = Modifier.height(12.dp))
            
            // Copy Link Button
            OutlinedButton(
                onClick = {
                    android.widget.Toast.makeText(context, "Link copied to clipboard!", android.widget.Toast.LENGTH_SHORT).show()
                    onCopyLink()
                    onDismiss()
                },
                modifier = Modifier
                    .fillMaxWidth()
                    .height(48.dp),
                colors = ButtonDefaults.outlinedButtonColors(contentColor = DarkText),
                shape = RoundedCornerShape(24.dp),
                border = androidx.compose.foundation.BorderStroke(1.dp, ChipBorder)
            ) {
                Icon(
                    Icons.Outlined.ContentCopy,
                    contentDescription = null,
                    modifier = Modifier.size(20.dp)
                )
                Spacer(modifier = Modifier.width(8.dp))
                Text("Copy Link", fontSize = 16.sp, fontWeight = FontWeight.Medium)
            }
            
            // Add people option - Only show for project chats
            if (isProjectChat) {
                Spacer(modifier = Modifier.height(20.dp))
                
                Surface(
                    onClick = { showAddPeopleDialog = true },
                    shape = RoundedCornerShape(12.dp),
                    color = ChipBackground
                ) {
                    Row(
                        modifier = Modifier
                            .fillMaxWidth()
                            .padding(16.dp),
                        verticalAlignment = Alignment.CenterVertically
                    ) {
                        Icon(
                            Icons.Outlined.PersonAdd,
                            contentDescription = "Add people",
                            tint = GreenAccent,
                            modifier = Modifier.size(24.dp)
                        )
                        Spacer(modifier = Modifier.width(12.dp))
                        Column(modifier = Modifier.weight(1f)) {
                            Text(
                                text = "Add people",
                                fontSize = 15.sp,
                                fontWeight = FontWeight.Medium,
                                color = DarkText
                            )
                            Text(
                                text = "Invite by email to collaborate on this project",
                                fontSize = 13.sp,
                                color = GrayText
                            )
                        }
                        Icon(
                            Icons.Default.ChevronRight,
                            contentDescription = null,
                            tint = GrayText,
                            modifier = Modifier.size(20.dp)
                        )
                    }
                }
            }
        }
    }
    
    // Add People Dialog - Only accessible for project chats
    if (showAddPeopleDialog) {
        AlertDialog(
            onDismissRequest = { showAddPeopleDialog = false },
            title = { 
                Text(
                    "Invite Collaborator",
                    fontWeight = FontWeight.Bold
                ) 
            },
            text = {
                Column {
                    Text(
                        "Enter the email address of the person you want to invite:",
                        fontSize = 14.sp,
                        color = GrayText
                    )
                    Spacer(modifier = Modifier.height(16.dp))
                    OutlinedTextField(
                        value = inviteEmail,
                        onValueChange = { inviteEmail = it },
                        label = { Text("Email address") },
                        placeholder = { Text("example@email.com") },
                        singleLine = true,
                        modifier = Modifier.fillMaxWidth(),
                        colors = OutlinedTextFieldDefaults.colors(
                            focusedBorderColor = GreenAccent,
                            focusedLabelColor = GreenAccent,
                            cursorColor = GreenAccent
                        )
                    )
                }
            },
            confirmButton = {
                Button(
                    onClick = {
                        if (inviteEmail.isNotBlank() && inviteEmail.contains("@")) {
                            onAddPeople(inviteEmail)
                            android.widget.Toast.makeText(
                                context, 
                                "Invitation sent to $inviteEmail", 
                                android.widget.Toast.LENGTH_SHORT
                            ).show()
                            inviteEmail = ""
                            showAddPeopleDialog = false
                            onDismiss()
                        } else {
                            android.widget.Toast.makeText(
                                context, 
                                "Please enter a valid email", 
                                android.widget.Toast.LENGTH_SHORT
                            ).show()
                        }
                    },
                    colors = ButtonDefaults.buttonColors(containerColor = GreenAccent)
                ) {
                    Text("Send Invite")
                }
            },
            dismissButton = {
                TextButton(onClick = { showAddPeopleDialog = false }) {
                    Text("Cancel", color = GrayText)
                }
            },
            containerColor = WhiteBackground
        )
    }
}

/**
 * Voice Chat Overlay - Full screen voice input like ChatGPT
 */
@Composable
private fun VoiceChatOverlay(
    isListening: Boolean,
    audioLevel: Float,
    transcribedText: String,
    onStartListening: () -> Unit,
    onStopListening: () -> Unit,
    onSendMessage: (String) -> Unit,
    onDismiss: () -> Unit
) {
    // Auto-start listening when overlay opens
    LaunchedEffect(Unit) {
        onStartListening()
    }
    
    // Animated waveform
    val infiniteTransition = rememberInfiniteTransition(label = "waveform")
    val waveHeights = List(7) { index ->
        infiniteTransition.animateFloat(
            initialValue = 0.3f,
            targetValue = 1f,
            animationSpec = infiniteRepeatable(
                animation = tween(
                    durationMillis = 400 + (index * 100),
                    easing = LinearEasing
                ),
                repeatMode = RepeatMode.Reverse,
                initialStartOffset = StartOffset(index * 50)
            ),
            label = "wave$index"
        )
    }
    
    Box(
        modifier = Modifier
            .fillMaxSize()
            .background(Color.Black.copy(alpha = 0.95f))
            .clickable(
                interactionSource = remember { MutableInteractionSource() },
                indication = null
            ) { /* Prevent clicks from passing through */ }
    ) {
        // Close button
        IconButton(
            onClick = onDismiss,
            modifier = Modifier
                .align(Alignment.TopEnd)
                .padding(16.dp)
                .statusBarsPadding()
        ) {
            Icon(
                Icons.Default.Close,
                contentDescription = "Close",
                tint = Color.White,
                modifier = Modifier.size(28.dp)
            )
        }
        
        Column(
            modifier = Modifier
                .fillMaxSize()
                .padding(32.dp),
            horizontalAlignment = Alignment.CenterHorizontally,
            verticalArrangement = Arrangement.Center
        ) {
            // Waveform animation
            Row(
                modifier = Modifier.height(80.dp),
                verticalAlignment = Alignment.CenterVertically,
                horizontalArrangement = Arrangement.spacedBy(6.dp)
            ) {
                waveHeights.forEachIndexed { index, heightAnim ->
                    val height = if (isListening) {
                        (20 + (audioLevel * 60 * heightAnim.value)).dp
                    } else {
                        20.dp
                    }
                    Box(
                        modifier = Modifier
                            .width(6.dp)
                            .height(height)
                            .background(
                                color = if (isListening) GreenAccent else GrayText,
                                shape = RoundedCornerShape(3.dp)
                            )
                    )
                }
            }
            
            Spacer(modifier = Modifier.height(32.dp))
            
            // Status text
            Text(
                text = if (isListening) "Listening..." else "Tap to speak",
                fontSize = 20.sp,
                fontWeight = FontWeight.Medium,
                color = Color.White
            )
            
            Spacer(modifier = Modifier.height(16.dp))
            
            // Transcribed text
            if (transcribedText.isNotEmpty()) {
                Text(
                    text = transcribedText,
                    fontSize = 24.sp,
                    fontWeight = FontWeight.SemiBold,
                    color = Color.White,
                    textAlign = TextAlign.Center,
                    modifier = Modifier.padding(horizontal = 32.dp)
                )
            }
            
            Spacer(modifier = Modifier.height(48.dp))
            
            // Action buttons
            Row(
                horizontalArrangement = Arrangement.spacedBy(32.dp)
            ) {
                // Cancel button
                Surface(
                    onClick = onDismiss,
                    shape = CircleShape,
                    color = Color.White.copy(alpha = 0.1f),
                    modifier = Modifier.size(64.dp)
                ) {
                    Box(
                        contentAlignment = Alignment.Center
                    ) {
                        Icon(
                            Icons.Default.Close,
                            contentDescription = "Cancel",
                            tint = Color.White,
                            modifier = Modifier.size(28.dp)
                        )
                    }
                }
                
                // Mic button
                Surface(
                    onClick = {
                        if (isListening) {
                            onStopListening()
                        } else {
                            onStartListening()
                        }
                    },
                    shape = CircleShape,
                    color = if (isListening) GreenAccent else Color.White,
                    modifier = Modifier.size(80.dp)
                ) {
                    Box(
                        contentAlignment = Alignment.Center
                    ) {
                        Icon(
                            if (isListening) Icons.Filled.Stop else Icons.Filled.Mic,
                            contentDescription = if (isListening) "Stop" else "Speak",
                            tint = if (isListening) Color.White else DarkText,
                            modifier = Modifier.size(36.dp)
                        )
                    }
                }
                
                // Send button
                Surface(
                    onClick = { onSendMessage(transcribedText) },
                    shape = CircleShape,
                    color = if (transcribedText.isNotEmpty()) GreenAccent else Color.White.copy(alpha = 0.1f),
                    modifier = Modifier.size(64.dp)
                ) {
                    Box(
                        contentAlignment = Alignment.Center
                    ) {
                        Icon(
                            Icons.Default.Send,
                            contentDescription = "Send",
                            tint = if (transcribedText.isNotEmpty()) Color.White else GrayText,
                            modifier = Modifier.size(28.dp)
                        )
                    }
                }
            }
        }
    }
}

// ============================================
// Image Generation Placeholder (ChatGPT-style)
// ============================================

/**
 * A loading placeholder shown while an image is being generated.
 * Displays a gradient animated box with "Creating image..." text.
 */
@Composable
private fun ImageGenerationPlaceholder() {
    val infiniteTransition = rememberInfiniteTransition(label = "image_gen_animation")
    
    // Shimmer animation
    val shimmerOffset by infiniteTransition.animateFloat(
        initialValue = 0f,
        targetValue = 1f,
        animationSpec = infiniteRepeatable(
            animation = tween(1500, easing = LinearEasing),
            repeatMode = RepeatMode.Restart
        ),
        label = "shimmer"
    )
    
    // Progress dots animation
    val dotsOffset by infiniteTransition.animateFloat(
        initialValue = 0f,
        targetValue = 3f,
        animationSpec = infiniteRepeatable(
            animation = tween(1000, easing = LinearEasing),
            repeatMode = RepeatMode.Restart
        ),
        label = "dots"
    )
    
    val dots = when (dotsOffset.toInt()) {
        0 -> "."
        1 -> ".."
        else -> "..."
    }
    
    Column(
        modifier = Modifier
            .fillMaxWidth()
            .padding(horizontal = 16.dp, vertical = 8.dp),
        horizontalAlignment = Alignment.Start
    ) {
        // Image placeholder with gradient
        Box(
            modifier = Modifier
                .size(256.dp)
                .clip(RoundedCornerShape(16.dp))
                .background(
                    brush = Brush.linearGradient(
                        colors = listOf(
                            Color(0xFFF8E8FF), // Light purple
                            Color(0xFFFFE8F0), // Light pink
                            Color(0xFFFFF0E8), // Light orange
                            Color(0xFFE8F4FF), // Light blue
                        ),
                        start = Offset(shimmerOffset * 500f, shimmerOffset * 500f),
                        end = Offset((shimmerOffset + 0.5f) * 500f, (shimmerOffset + 0.5f) * 500f)
                    )
                ),
            contentAlignment = Alignment.Center
        ) {
            Column(
                horizontalAlignment = Alignment.CenterHorizontally
            ) {
                // Image icon
                Icon(
                    imageVector = Icons.Outlined.Image,
                    contentDescription = null,
                    tint = Color(0xFF9B59B6).copy(alpha = 0.6f),
                    modifier = Modifier.size(48.dp)
                )
                
                Spacer(modifier = Modifier.height(12.dp))
                
                // Creating image text
                Text(
                    text = "Creating image$dots",
                    fontSize = 16.sp,
                    fontWeight = FontWeight.Medium,
                    color = Color(0xFF9B59B6)
                )
                
                Spacer(modifier = Modifier.height(8.dp))
                
                // Progress indicator
                LinearProgressIndicator(
                    modifier = Modifier
                        .width(120.dp)
                        .height(4.dp)
                        .clip(RoundedCornerShape(2.dp)),
                    color = GreenAccent,
                    trackColor = Color.White.copy(alpha = 0.5f)
                )
                
                Spacer(modifier = Modifier.height(8.dp))
                
                // Helpful text
                Text(
                    text = "This may take 30-60 seconds",
                    fontSize = 12.sp,
                    color = Color(0xFF9B59B6).copy(alpha = 0.7f)
                )
            }
        }
    }
}

/**
 * Mode-specific loading indicator (Thinking, Research, Web Search, Code)
 * Shows animated progress with mode-specific emoji and text like ChatGPT
 * OPTIMIZED: Uses simple animations to prevent excessive recomposition and ANR
 */
@Composable
private fun ModeLoadingIndicator(mode: String) {
    // Use a simple state-based dots animation instead of infinite transition
    var dotsCount by remember { mutableIntStateOf(1) }
    
    // Simple timer-based dots animation - lightweight
    LaunchedEffect(Unit) {
        while (true) {
            kotlinx.coroutines.delay(400)
            dotsCount = (dotsCount % 3) + 1
        }
    }
    
    val dots = ".".repeat(dotsCount)
    
    // Mode-specific configuration - computed once
    val modeConfig = remember(mode) {
        when (mode) {
            "thinking" -> ModeConfig("🧠", "Thinking", Color(0xFF9B59B6), "Analyzing your request deeply")
            "research" -> ModeConfig("🔬", "Researching", Color(0xFF3498DB), "Gathering comprehensive information")
            "web-search" -> ModeConfig("🌐", "Searching the web", Color(0xFF27AE60), "Finding real-time information")
            "code" -> ModeConfig("💻", "Writing code", Color(0xFFE67E22), "Crafting your solution")
            else -> ModeConfig("✨", "Processing", Color(0xFF34C759), "Working on your request")
        }
    }
    
    Row(
        modifier = Modifier
            .fillMaxWidth()
            .padding(horizontal = 16.dp, vertical = 12.dp)
            .background(
                color = modeConfig.color.copy(alpha = 0.1f),
                shape = RoundedCornerShape(12.dp)
            )
            .padding(16.dp),
        verticalAlignment = Alignment.CenterVertically
    ) {
        // Static emoji (no animation to reduce recomposition)
        Text(
            text = modeConfig.emoji,
            fontSize = 24.sp,
            modifier = Modifier.padding(end = 12.dp)
        )
        
        Column(modifier = Modifier.weight(1f)) {
            // Main status text with dots
            Text(
                text = "${modeConfig.text}$dots",
                fontSize = 16.sp,
                fontWeight = FontWeight.SemiBold,
                color = modeConfig.color
            )
            
            Spacer(modifier = Modifier.height(4.dp))
            
            // Help text
            Text(
                text = modeConfig.helpText,
                fontSize = 12.sp,
                color = GrayText
            )
            
            Spacer(modifier = Modifier.height(8.dp))
            
            // Progress bar (explicitly LTR direction)
            CompositionLocalProvider(LocalLayoutDirection provides LayoutDirection.Ltr) {
                LinearProgressIndicator(
                    modifier = Modifier
                        .fillMaxWidth()
                        .height(3.dp)
                        .clip(RoundedCornerShape(2.dp)),
                    color = modeConfig.color,
                    trackColor = modeConfig.color.copy(alpha = 0.2f)
                )
            }
        }
    }
}

// Data class for mode configuration to avoid List casting
private data class ModeConfig(
    val emoji: String,
    val text: String,
    val color: Color,
    val helpText: String
)

/**
 * Display generated image in chat message
 * Handles both base64 and URL images with download option
 */
@Composable
private fun GeneratedImageDisplay(
    imageUrl: String,
    imageBase64: String?,
    model: String?,
    originalPrompt: String?
) {
    val context = LocalContext.current
    var showFullScreen by remember { mutableStateOf(false) }
    
    Column(
        modifier = Modifier
            .fillMaxWidth()
            .clip(RoundedCornerShape(12.dp))
            .background(Color(0xFFF8F8F8))
            .padding(8.dp)
    ) {
        // Image container
        Box(
            modifier = Modifier
                .fillMaxWidth()
                .aspectRatio(1f)
                .clip(RoundedCornerShape(8.dp))
                .background(Color.White)
                .clickable { showFullScreen = true }
        ) {
            // Load image from base64 or URL
            if (imageBase64 != null) {
                val bitmap = remember(imageBase64) {
                    try {
                        val decodedBytes = android.util.Base64.decode(imageBase64, android.util.Base64.DEFAULT)
                        android.graphics.BitmapFactory.decodeByteArray(decodedBytes, 0, decodedBytes.size)
                    } catch (e: Exception) {
                        null
                    }
                }
                
                if (bitmap != null) {
                    Image(
                        bitmap = bitmap.asImageBitmap(),
                        contentDescription = "Generated Image",
                        modifier = Modifier.fillMaxSize(),
                        contentScale = ContentScale.Fit
                    )
                } else {
                    // Fallback loading indicator
                    Box(
                        modifier = Modifier.fillMaxSize(),
                        contentAlignment = Alignment.Center
                    ) {
                        Text("Failed to load image", color = Color.Gray)
                    }
                }
            } else if (imageUrl.startsWith("http")) {
                // Load from URL using Coil
                AsyncImage(
                    model = imageUrl,
                    contentDescription = "Generated Image",
                    modifier = Modifier.fillMaxSize(),
                    contentScale = ContentScale.Fit
                )
            }
            
            // Download button overlay
            IconButton(
                onClick = {
                    // Download image
                    if (imageBase64 != null) {
                        try {
                            val decodedBytes = android.util.Base64.decode(imageBase64, android.util.Base64.DEFAULT)
                            val filename = "baatcheet_${System.currentTimeMillis()}.png"
                            val values = android.content.ContentValues().apply {
                                put(android.provider.MediaStore.Images.Media.DISPLAY_NAME, filename)
                                put(android.provider.MediaStore.Images.Media.MIME_TYPE, "image/png")
                                put(android.provider.MediaStore.Images.Media.RELATIVE_PATH, "Pictures/BaatCheet")
                            }
                            val uri = context.contentResolver.insert(
                                android.provider.MediaStore.Images.Media.EXTERNAL_CONTENT_URI,
                                values
                            )
                            uri?.let {
                                context.contentResolver.openOutputStream(it)?.use { out ->
                                    out.write(decodedBytes)
                                }
                                android.widget.Toast.makeText(context, "Image saved!", android.widget.Toast.LENGTH_SHORT).show()
                            }
                        } catch (e: Exception) {
                            android.widget.Toast.makeText(context, "Failed to save image", android.widget.Toast.LENGTH_SHORT).show()
                        }
                    }
                },
                modifier = Modifier
                    .align(Alignment.TopEnd)
                    .padding(8.dp)
                    .size(36.dp)
                    .background(Color.Black.copy(alpha = 0.5f), RoundedCornerShape(8.dp))
            ) {
                Icon(
                    imageVector = Icons.Default.Download,
                    contentDescription = "Download",
                    tint = Color.White,
                    modifier = Modifier.size(20.dp)
                )
            }
        }
        
        // Model info
        if (model != null) {
            Spacer(modifier = Modifier.height(6.dp))
            Row(
                modifier = Modifier.fillMaxWidth(),
                horizontalArrangement = Arrangement.SpaceBetween,
                verticalAlignment = Alignment.CenterVertically
            ) {
                Text(
                    text = "🎨 $model",
                    fontSize = 11.sp,
                    color = Color.Gray
                )
            }
        }
    }
}

/**
 * Helper function to get filename from URI
 */
private fun getFileNameFromUri(context: Context, uri: Uri): String? {
    var name: String? = null
    
    try {
        context.contentResolver.query(uri, null, null, null, null)?.use { cursor ->
            val nameIndex = cursor.getColumnIndex(OpenableColumns.DISPLAY_NAME)
            if (nameIndex >= 0 && cursor.moveToFirst()) {
                name = cursor.getString(nameIndex)
            }
        }
    } catch (e: Exception) {
        // Fallback to URI last path segment
        name = uri.lastPathSegment
    }
    
    return name
}
