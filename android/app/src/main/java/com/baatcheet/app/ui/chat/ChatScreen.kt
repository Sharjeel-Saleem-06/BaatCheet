package com.baatcheet.app.ui.chat

import androidx.compose.animation.core.LinearEasing
import androidx.compose.animation.core.RepeatMode
import androidx.compose.animation.core.StartOffset
import androidx.compose.animation.core.animateFloat
import androidx.compose.animation.core.infiniteRepeatable
import androidx.compose.animation.core.rememberInfiniteTransition
import androidx.compose.animation.core.tween
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
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.clip
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.graphics.SolidColor
import androidx.compose.ui.graphics.vector.ImageVector
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
import coil.compose.rememberAsyncImagePainter
import com.baatcheet.app.R
import com.baatcheet.app.domain.model.ChatMessage
import com.baatcheet.app.domain.model.MessageRole
import kotlinx.coroutines.launch

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
    
    // Media picker for camera, gallery, and file picking
    val mediaPicker = rememberMediaPicker(
        onImageSelected = { uri ->
            // Get file info and add to upload queue
            val filename = "image_${System.currentTimeMillis()}.jpg"
            viewModel.addFileToUpload(uri, filename, "image/jpeg")
        },
        onFileSelected = { uri ->
            // Get file info and add to upload queue
            val filename = "document_${System.currentTimeMillis()}"
            viewModel.addFileToUpload(uri, filename, "application/octet-stream")
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
                    // TODO: Navigate to project view
                    coroutineScope.launch { drawerState.close() }
                },
                onSearchChange = { query ->
                    viewModel.searchConversations(query)
                },
                onLogout = onLogout,
                onClose = { coroutineScope.launch { drawerState.close() } }
            )
        }
    ) {
        Box(
            modifier = Modifier
                .fillMaxSize()
                .background(WhiteBackground)
                .imePadding() // Handle keyboard padding
        ) {
            Column(
                modifier = Modifier.fillMaxSize()
            ) {
                // Header
                ChatHeader(
                    onMenuClick = { coroutineScope.launch { drawerState.open() } },
                    onNewChat = { viewModel.startNewChat() }
                )
                
                // Content
                if (state.messages.isEmpty()) {
                    // Empty state - ChatGPT style
                    EmptyStateContent(
                        onSuggestionClick = { suggestion ->
                            viewModel.sendMessage(suggestion)
                        },
                        onModeSelect = { mode ->
                            viewModel.selectAIMode(mode)
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
                                }
                            )
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
                            viewModel.sendMessage(messageText)
                            messageText = ""
                            viewModel.clearUploadedFiles()
                        }
                    },
                    isLoading = state.isLoading,
                    uploadedFiles = state.uploadedFiles,
                    onRemoveFile = { fileId ->
                        viewModel.removeFile(fileId)
                    },
                    onCameraClick = mediaPicker.onCameraClick,
                    onImageClick = mediaPicker.onGalleryClick,
                    onFolderClick = mediaPicker.onFileClick,
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
                        showVoiceChat = true
                    },
                    currentMode = state.currentAIMode,
                    promptAnalysis = state.promptAnalysis,
                    onModeClick = { viewModel.toggleModeSelector() }
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
                
                // Voice Chat Overlay
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
            }
            
            // Show error snackbar if there's an error
            if (state.error != null) {
                LaunchedEffect(state.error) {
                    // Error is shown in the message, clear it
                    kotlinx.coroutines.delay(3000)
                    viewModel.clearError()
                }
            }
        }
    }
}

@Composable
private fun ChatDrawerContent(
    state: ChatState,
    onNewChat: () -> Unit,
    onConversationClick: (String) -> Unit,
    onProjectClick: (String) -> Unit,
    onSearchChange: (String) -> Unit,
    onLogout: () -> Unit,
    onClose: () -> Unit
) {
    var searchQuery by remember { mutableStateOf("") }
    
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
                icon = Icons.Outlined.Image,
                text = "Images",
                onClick = { }
            )
            
            DrawerMenuItem(
                icon = Icons.Default.Apps,
                text = "Apps",
                onClick = { }
            )
            
            Spacer(modifier = Modifier.height(8.dp))
            HorizontalDivider(color = InputBorder)
            Spacer(modifier = Modifier.height(8.dp))
            
            DrawerMenuItem(
                icon = Icons.Outlined.AddBox,
                text = "New project",
                onClick = { }
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
            
            // Account section
            HorizontalDivider(color = InputBorder)
            Row(
                modifier = Modifier
                    .fillMaxWidth()
                    .clickable(onClick = onLogout)
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
                    Icons.Default.KeyboardArrowDown,
                    contentDescription = null,
                    tint = GrayText,
                    modifier = Modifier.size(20.dp)
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
    onNewChat: () -> Unit
) {
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
        
        // Mode suggestion chips - First row
        Row(
            modifier = Modifier.fillMaxWidth(),
            horizontalArrangement = Arrangement.Center,
            verticalAlignment = Alignment.CenterVertically
        ) {
            HomeModeChip(
                icon = "🎨",
                label = "Create image",
                onClick = { onModeSelect("image-generation") }
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
                onClick = { onModeSelect("data-analysis") }
            )
            Spacer(modifier = Modifier.width(8.dp))
            HomeModeChip(
                icon = "💻",
                label = "Code",
                onClick = { onModeSelect("code") }
            )
            Spacer(modifier = Modifier.width(8.dp))
            HomeModeChip(
                icon = "⋯",
                label = "More",
                onClick = { /* Show more options */ }
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

@Composable
private fun MessageBubble(
    message: ChatMessage,
    onCopy: (String) -> Unit = {},
    onRegenerate: (() -> Unit)? = null,
    onSpeak: ((String) -> Unit)? = null
) {
    var showActions by remember { mutableStateOf(false) }
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
                        .size(32.dp)
                        .clip(RoundedCornerShape(8.dp))
                )
                Spacer(modifier = Modifier.width(10.dp))
            }
            
            Surface(
                color = if (message.role == MessageRole.USER) MessageBubbleUser else MessageBubbleAssistant,
                shape = RoundedCornerShape(16.dp),
                shadowElevation = if (message.role == MessageRole.ASSISTANT) 1.dp else 0.dp,
                modifier = Modifier
                    .widthIn(max = 320.dp) // Increased max width for better table/code display
                    .clickable(
                        interactionSource = remember { MutableInteractionSource() },
                        indication = null
                    ) { showActions = !showActions }
            ) {
                Column(
                    modifier = Modifier.padding(horizontal = 14.dp, vertical = 10.dp)
                ) {
                    if (message.isStreaming && message.content.isEmpty()) {
                        // Animated typing indicator
                        TypingIndicator()
                    } else if (message.isStreaming) {
                        // Show content with streaming cursor
                        Column {
                            com.baatcheet.app.ui.components.MarkdownText(
                                text = message.content,
                                color = DarkText,
                                fontSize = 15f,
                                lineHeight = 22f
                            )
                            // Blinking cursor
                            StreamingCursor()
                        }
                    } else {
                        // Use MarkdownText for assistant messages
                        if (message.role == MessageRole.ASSISTANT) {
                            com.baatcheet.app.ui.components.MarkdownText(
                                text = message.content,
                                color = DarkText,
                                fontSize = 15f,
                                lineHeight = 22f
                            )
                        } else {
                            // User message with bold tags
                            UserMessageText(
                                text = message.content
                            )
                        }
                    }
                }
            }
            
            if (message.role == MessageRole.USER) {
                Spacer(modifier = Modifier.width(8.dp))
            }
        }
        
        // Action buttons for assistant messages
        if (showActions && message.role == MessageRole.ASSISTANT && !message.isStreaming) {
            Row(
                modifier = Modifier
                    .padding(start = 42.dp, top = 4.dp),
                horizontalArrangement = Arrangement.spacedBy(2.dp)
            ) {
                // Copy button
                IconButton(
                    onClick = {
                        onCopy(message.content)
                        android.widget.Toast.makeText(context, "Copied to clipboard", android.widget.Toast.LENGTH_SHORT).show()
                    },
                    modifier = Modifier.size(32.dp)
                ) {
                    Icon(
                        Icons.Outlined.ContentCopy,
                        contentDescription = "Copy",
                        tint = GrayText,
                        modifier = Modifier.size(18.dp)
                    )
                }
                
                // Speak button
                onSpeak?.let { speak ->
                    IconButton(
                        onClick = { speak(message.content) },
                        modifier = Modifier.size(32.dp)
                    ) {
                        Icon(
                            Icons.Outlined.VolumeUp,
                            contentDescription = "Speak",
                            tint = GrayText,
                            modifier = Modifier.size(18.dp)
                        )
                    }
                }
                
                // Regenerate button
                onRegenerate?.let { regenerate ->
                    IconButton(
                        onClick = regenerate,
                        modifier = Modifier.size(32.dp)
                    ) {
                        Icon(
                            Icons.Outlined.Refresh,
                            contentDescription = "Regenerate",
                            tint = GrayText,
                            modifier = Modifier.size(18.dp)
                        )
                    }
                }
            }
        }
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
            .size(64.dp)
            .clip(RoundedCornerShape(8.dp))
            .border(
                width = 2.dp,
                color = when (file.status) {
                    FileUploadStatus.READY -> GreenAccent
                    FileUploadStatus.FAILED -> Color.Red
                    else -> GrayText
                },
                shape = RoundedCornerShape(8.dp)
            )
            .background(ChipBackground)
    ) {
        // File icon/preview
        Column(
            modifier = Modifier
                .fillMaxSize()
                .padding(4.dp),
            horizontalAlignment = Alignment.CenterHorizontally,
            verticalArrangement = Arrangement.Center
        ) {
            if (file.mimeType.startsWith("image/")) {
                Icon(
                    imageVector = Icons.Default.Image,
                    contentDescription = "Image",
                    tint = GrayText,
                    modifier = Modifier.size(24.dp)
                )
            } else {
                Icon(
                    imageVector = Icons.Default.Description,
                    contentDescription = "Document",
                    tint = GrayText,
                    modifier = Modifier.size(24.dp)
                )
            }
            
            Text(
                text = file.filename.take(8) + if (file.filename.length > 8) "..." else "",
                fontSize = 9.sp,
                color = GrayText,
                maxLines = 1
            )
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
    onModeClick: () -> Unit = {}
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
                // Handle mode selection
            }
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
    onModeSelect: (String) -> Unit
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
                .padding(bottom = 32.dp)
        ) {
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
                    onClick = onCameraClick
                )
                MediaOptionButton(
                    icon = Icons.Outlined.Image,
                    label = "Photos",
                    onClick = onPhotosClick
                )
                MediaOptionButton(
                    icon = Icons.Outlined.AttachFile,
                    label = "Files",
                    onClick = onFilesClick
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
                    title = "Create image",
                    subtitle = "Visualize anything",
                    onClick = { onModeSelect("image-generation") }
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
    onClick: () -> Unit
) {
    Column(
        horizontalAlignment = Alignment.CenterHorizontally,
        modifier = Modifier
            .clip(RoundedCornerShape(12.dp))
            .clickable(onClick = onClick)
            .padding(16.dp)
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
                tint = DarkText,
                modifier = Modifier.size(28.dp)
            )
        }
        Spacer(modifier = Modifier.height(8.dp))
        Text(
            text = label,
            fontSize = 13.sp,
            color = DarkText
        )
    }
}

@Composable
private fun ModeMenuItem(
    icon: String,
    title: String,
    subtitle: String,
    onClick: () -> Unit
) {
    Row(
        modifier = Modifier
            .fillMaxWidth()
            .clip(RoundedCornerShape(8.dp))
            .clickable(onClick = onClick)
            .padding(vertical = 12.dp, horizontal = 8.dp),
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
                color = DarkText
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
            label = "wave\$index"
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
