package com.baatcheet.app.ui.voice

import android.Manifest
import android.content.pm.PackageManager
import androidx.activity.compose.rememberLauncherForActivityResult
import androidx.activity.result.contract.ActivityResultContracts
import androidx.compose.animation.core.*
import androidx.compose.foundation.Canvas
import androidx.compose.foundation.background
import androidx.compose.foundation.layout.*
import androidx.compose.foundation.lazy.LazyColumn
import androidx.compose.foundation.lazy.items
import androidx.compose.foundation.shape.CircleShape
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.filled.*
import androidx.compose.material.icons.outlined.*
import androidx.compose.material3.*
import androidx.compose.runtime.*
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.scale
import androidx.compose.ui.geometry.Offset
import androidx.compose.ui.graphics.Brush
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.platform.LocalContext
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.text.style.TextAlign
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import androidx.compose.ui.window.Dialog
import androidx.compose.ui.window.DialogProperties
import androidx.core.content.ContextCompat
import androidx.hilt.navigation.compose.hiltViewModel

// Color palette
private val VoiceDarkBg = Color(0xFF000000)
private val VoiceAccent = Color(0xFF34C759)  // Our app green
private val VoiceBlue = Color(0xFF007AFF)
private val VoicePurple = Color(0xFF5856D6)
private val VoiceRed = Color(0xFFEB5446)
private val VoiceGray = Color(0xFF8E8E93)
private val VoiceLightGray = Color(0xFF2C2C2E)
private val VoiceCardBg = Color(0xFF1C1C1E)
private val CloudWhite = Color(0xFFFFFFFF)

enum class VoiceModeStep {
    INTRO,
    VOICE_SELECT,
    ACTIVE_CALL
}

data class AIVoice(
    val id: String,
    val name: String,
    val description: String,
    val previewUrl: String? = null,
    val color: Color = VoiceAccent,
    val icon: String = "🎙️"
)

/**
 * Voice Chat Screen - Full Screen Dialog
 * 
 * FIXED: Added proper RECORD_AUDIO permission handling to prevent Activity flickering
 */
@Composable
fun VoiceChatScreen(
    viewModel: VoiceChatViewModel = hiltViewModel(),
    onDismiss: () -> Unit,
    onConversationCreated: (String) -> Unit = {}
) {
    val state by viewModel.state.collectAsState()
    val context = LocalContext.current
    
    // Permission state
    var hasRecordPermission by remember {
        mutableStateOf(
            ContextCompat.checkSelfPermission(
                context,
                Manifest.permission.RECORD_AUDIO
            ) == PackageManager.PERMISSION_GRANTED
        )
    }
    
    var showPermissionDeniedDialog by remember { mutableStateOf(false) }
    var pendingAction by remember { mutableStateOf<(() -> Unit)?>(null) }
    
    // Permission launcher - handles permission request without Activity recreation
    val permissionLauncher = rememberLauncherForActivityResult(
        contract = ActivityResultContracts.RequestPermission()
    ) { isGranted ->
        hasRecordPermission = isGranted
        if (isGranted) {
            // Execute the pending action after permission is granted
            pendingAction?.invoke()
            pendingAction = null
        } else {
            showPermissionDeniedDialog = true
        }
    }
    
    // Helper function to check permission before action
    fun withPermission(action: () -> Unit) {
        if (hasRecordPermission) {
            action()
        } else {
            pendingAction = action
            permissionLauncher.launch(Manifest.permission.RECORD_AUDIO)
        }
    }
    
    // Permission denied dialog
    if (showPermissionDeniedDialog) {
        AlertDialog(
            onDismissRequest = { showPermissionDeniedDialog = false },
            title = { Text("Microphone Permission Required", color = Color.White) },
            text = { 
                Text(
                    "Voice mode requires microphone access to hear your voice. Please grant permission in Settings.",
                    color = Color.White.copy(alpha = 0.8f)
                )
            },
            confirmButton = {
                TextButton(onClick = { showPermissionDeniedDialog = false }) {
                    Text("OK", color = VoiceAccent)
                }
            },
            containerColor = VoiceCardBg
        )
    }
    
    Dialog(
        onDismissRequest = onDismiss,
        properties = DialogProperties(
            dismissOnBackPress = true,
            dismissOnClickOutside = false,
            usePlatformDefaultWidth = false
        )
    ) {
        Box(
            modifier = Modifier
                .fillMaxSize()
                .background(VoiceDarkBg)
        ) {
            when (state.currentStep) {
                VoiceModeStep.INTRO -> {
                    VoiceIntroScreen(
                        onContinue = { viewModel.moveToVoiceSelection() },
                        onDismiss = onDismiss
                    )
                }
                VoiceModeStep.VOICE_SELECT -> {
                    VoiceSelectionScreen(
                        voices = state.availableVoices,
                        selectedVoice = state.selectedVoice,
                        isLoadingVoices = state.isLoadingVoices,
                        isPlayingPreview = state.isPlayingPreview,
                        playingVoiceId = state.playingVoiceId,
                        onVoiceSelect = { voice -> viewModel.selectVoice(voice) },
                        onPlayPreview = { voice -> viewModel.playVoicePreview(voice) },
                        onStartCall = { 
                            // Request permission before starting call
                            withPermission {
                                viewModel.startVoiceCall()
                            }
                        },
                        onBack = { viewModel.moveToIntro() },
                        onDismiss = onDismiss
                    )
                }
                VoiceModeStep.ACTIVE_CALL -> {
                    ActiveVoiceCallScreen(
                        isRecording = state.isRecording,
                        isProcessing = state.isProcessing,
                        isAISpeaking = state.isAISpeaking,
                        selectedVoice = state.selectedVoice,
                        hasPermission = hasRecordPermission,
                        onToggleRecording = { 
                            if (state.isRecording) {
                                viewModel.stopRecordingAndSend()
                            } else {
                                // Check permission before recording
                                withPermission {
                                    viewModel.startRecording()
                                }
                            }
                        },
                        onEndCall = { 
                            viewModel.endCall()
                            state.conversationId?.let { onConversationCreated(it) }
                            onDismiss()
                        },
                        onRequestPermission = {
                            permissionLauncher.launch(Manifest.permission.RECORD_AUDIO)
                        }
                    )
                }
            }
        }
    }
}

/**
 * Screen 1: Voice Mode Introduction
 */
@Composable
private fun VoiceIntroScreen(
    onContinue: () -> Unit,
    onDismiss: () -> Unit
) {
    val infiniteTransition = rememberInfiniteTransition(label = "pulse")
    val pulseScale by infiniteTransition.animateFloat(
        initialValue = 1f,
        targetValue = 1.15f,
        animationSpec = infiniteRepeatable(
            animation = tween(1500, easing = FastOutSlowInEasing),
            repeatMode = RepeatMode.Reverse
        ),
        label = "pulse"
    )
    
    Box(
        modifier = Modifier
            .fillMaxSize()
            .background(VoiceDarkBg)
            .systemBarsPadding()
    ) {
        IconButton(
            onClick = onDismiss,
            modifier = Modifier.align(Alignment.TopEnd).padding(8.dp)
        ) {
            Icon(Icons.Default.Close, "Close", tint = Color.White.copy(alpha = 0.7f), modifier = Modifier.size(28.dp))
        }
        
        Column(
            modifier = Modifier.fillMaxSize().padding(horizontal = 32.dp),
            horizontalAlignment = Alignment.CenterHorizontally,
            verticalArrangement = Arrangement.Center
        ) {
            Box(
                modifier = Modifier.size(160.dp).scale(pulseScale),
                contentAlignment = Alignment.Center
            ) {
                Box(
                    modifier = Modifier
                        .size(160.dp)
                        .background(
                            Brush.radialGradient(
                                colors = listOf(VoiceAccent.copy(alpha = 0.3f), VoiceAccent.copy(alpha = 0.1f), Color.Transparent)
                            ),
                            CircleShape
                        )
                )
                Box(
                    modifier = Modifier.size(100.dp).background(VoiceAccent, CircleShape),
                    contentAlignment = Alignment.Center
                ) {
                    Icon(Icons.Default.Mic, null, tint = Color.White, modifier = Modifier.size(48.dp))
                }
            }
            
            Spacer(modifier = Modifier.height(48.dp))
            Text("Voice Mode", fontSize = 32.sp, fontWeight = FontWeight.Bold, color = Color.White)
            Spacer(modifier = Modifier.height(12.dp))
            Text("Have a natural conversation\nwith AI using your voice", fontSize = 16.sp, color = VoiceGray, textAlign = TextAlign.Center, lineHeight = 24.sp)
            
            Spacer(modifier = Modifier.height(56.dp))
            
            Column(verticalArrangement = Arrangement.spacedBy(16.dp)) {
                FeatureItem(icon = Icons.Outlined.RecordVoiceOver, text = "Natural voice conversation")
                FeatureItem(icon = Icons.Outlined.Speed, text = "Real-time AI responses")
                FeatureItem(icon = Icons.Outlined.Tune, text = "Choose your AI voice")
            }
            
            Spacer(modifier = Modifier.height(56.dp))
            
            Button(
                onClick = onContinue,
                modifier = Modifier.fillMaxWidth().height(56.dp),
                colors = ButtonDefaults.buttonColors(containerColor = VoiceAccent),
                shape = RoundedCornerShape(28.dp)
            ) {
                Text("Choose Voice", fontSize = 18.sp, fontWeight = FontWeight.SemiBold)
                Spacer(modifier = Modifier.width(8.dp))
                Icon(Icons.Default.ArrowForward, null)
            }
        }
    }
}

@Composable
private fun FeatureItem(icon: androidx.compose.ui.graphics.vector.ImageVector, text: String) {
    Row(verticalAlignment = Alignment.CenterVertically) {
        Icon(icon, null, tint = VoiceAccent, modifier = Modifier.size(24.dp))
        Spacer(modifier = Modifier.width(16.dp))
        Text(text, fontSize = 15.sp, color = Color.White.copy(alpha = 0.9f))
    }
}

/**
 * Screen 2: Voice Selection
 */
@Composable
private fun VoiceSelectionScreen(
    voices: List<AIVoice>,
    selectedVoice: AIVoice?,
    isLoadingVoices: Boolean,
    isPlayingPreview: Boolean,
    playingVoiceId: String?,
    onVoiceSelect: (AIVoice) -> Unit,
    onPlayPreview: (AIVoice) -> Unit,
    onStartCall: () -> Unit,
    onBack: () -> Unit,
    onDismiss: () -> Unit
) {
    Box(
        modifier = Modifier.fillMaxSize().background(VoiceDarkBg).systemBarsPadding()
    ) {
        Column(modifier = Modifier.fillMaxSize()) {
            Row(
                modifier = Modifier.fillMaxWidth().padding(horizontal = 8.dp, vertical = 8.dp),
                horizontalArrangement = Arrangement.SpaceBetween,
                verticalAlignment = Alignment.CenterVertically
            ) {
                IconButton(onClick = onBack) { Icon(Icons.Default.ArrowBack, "Back", tint = Color.White) }
                Text("Choose Voice", fontSize = 18.sp, fontWeight = FontWeight.SemiBold, color = Color.White)
                IconButton(onClick = onDismiss) { Icon(Icons.Default.Close, "Close", tint = Color.White.copy(alpha = 0.7f)) }
            }
            
            Text("Select a voice for your AI assistant", fontSize = 14.sp, color = VoiceGray, modifier = Modifier.padding(horizontal = 16.dp, vertical = 8.dp))
            
            if (isLoadingVoices) {
                Box(Modifier.fillMaxWidth().weight(1f), contentAlignment = Alignment.Center) {
                    CircularProgressIndicator(color = VoiceAccent)
                }
            } else {
                LazyColumn(
                    modifier = Modifier.weight(1f),
                    contentPadding = PaddingValues(16.dp),
                    verticalArrangement = Arrangement.spacedBy(12.dp)
                ) {
                    items(voices) { voice ->
                        VoiceCard(voice, voice.id == selectedVoice?.id, playingVoiceId == voice.id, { onVoiceSelect(voice) }, { onPlayPreview(voice) })
                    }
                }
            }
            
            Box(modifier = Modifier.padding(16.dp)) {
                Button(
                    onClick = onStartCall,
                    enabled = selectedVoice != null,
                    modifier = Modifier.fillMaxWidth().height(56.dp),
                    colors = ButtonDefaults.buttonColors(containerColor = VoiceAccent, disabledContainerColor = VoiceLightGray),
                    shape = RoundedCornerShape(28.dp)
                ) {
                    Icon(Icons.Default.Call, null)
                    Spacer(modifier = Modifier.width(8.dp))
                    Text("Start Voice Call", fontSize = 18.sp, fontWeight = FontWeight.SemiBold)
                }
            }
        }
    }
}

@Composable
private fun VoiceCard(voice: AIVoice, isSelected: Boolean, isPlaying: Boolean, onSelect: () -> Unit, onPlayPreview: () -> Unit) {
    Surface(
        onClick = onSelect,
        shape = RoundedCornerShape(16.dp),
        color = if (isSelected) voice.color.copy(alpha = 0.12f) else VoiceCardBg,
        border = if (isSelected) androidx.compose.foundation.BorderStroke(2.dp, voice.color) else null,
        modifier = Modifier.fillMaxWidth()
    ) {
        Row(modifier = Modifier.padding(16.dp), verticalAlignment = Alignment.CenterVertically) {
            Box(modifier = Modifier.size(52.dp).background(voice.color.copy(alpha = 0.2f), CircleShape), contentAlignment = Alignment.Center) {
                Text(voice.icon, fontSize = 26.sp)
            }
            Spacer(modifier = Modifier.width(16.dp))
            Column(modifier = Modifier.weight(1f)) {
                Text(voice.name, fontSize = 17.sp, fontWeight = FontWeight.SemiBold, color = Color.White)
                Text(voice.description, fontSize = 13.sp, color = VoiceGray)
            }
            IconButton(
                onClick = onPlayPreview,
                modifier = Modifier.size(44.dp).background(if (isPlaying) voice.color else Color.White.copy(alpha = 0.1f), CircleShape)
            ) {
                if (isPlaying) CircularProgressIndicator(Modifier.size(20.dp), Color.White, strokeWidth = 2.dp)
                else Icon(Icons.Default.PlayArrow, "Play", tint = Color.White, modifier = Modifier.size(24.dp))
            }
        }
    }
}

/**
 * Screen 3: ACTIVE VOICE CALL
 * Design based on Figma with animated cloud bubble
 * Tap to start speaking, tap again to stop and analyze
 * Fixed button positions at bottom
 * 
 * FIXED: Added permission state and request callback
 */
@Composable
private fun ActiveVoiceCallScreen(
    isRecording: Boolean,
    isProcessing: Boolean,
    isAISpeaking: Boolean,
    selectedVoice: AIVoice?,
    hasPermission: Boolean,
    onToggleRecording: () -> Unit,
    onEndCall: () -> Unit,
    onRequestPermission: () -> Unit
) {
    val infiniteTransition = rememberInfiniteTransition(label = "cloud")
    
    // Animation speed based on state
    val animSpeed = when {
        isAISpeaking -> 400
        isRecording -> 600
        isProcessing -> 800
        else -> 1500
    }
    
    // Cloud pulse animations - multiple layers
    val pulse1 by infiniteTransition.animateFloat(
        initialValue = 0.95f, targetValue = 1.05f,
        animationSpec = infiniteRepeatable(tween(animSpeed, easing = FastOutSlowInEasing), RepeatMode.Reverse),
        label = "p1"
    )
    val pulse2 by infiniteTransition.animateFloat(
        initialValue = 0.92f, targetValue = 1.08f,
        animationSpec = infiniteRepeatable(tween((animSpeed * 0.7f).toInt(), easing = FastOutSlowInEasing), RepeatMode.Reverse),
        label = "p2"
    )
    val pulse3 by infiniteTransition.animateFloat(
        initialValue = 0.88f, targetValue = 1.12f,
        animationSpec = infiniteRepeatable(tween((animSpeed * 0.5f).toInt(), easing = FastOutSlowInEasing), RepeatMode.Reverse),
        label = "p3"
    )
    
    // Alpha flicker
    val alphaFlicker by infiniteTransition.animateFloat(
        initialValue = 0.85f, targetValue = 1f,
        animationSpec = infiniteRepeatable(tween((animSpeed * 0.3f).toInt()), RepeatMode.Reverse),
        label = "alpha"
    )
    
    // Cloud color - use our app's green accent or white
    val cloudColor = when {
        isAISpeaking -> VoiceAccent
        isRecording -> VoiceAccent.copy(alpha = 0.9f)
        isProcessing -> VoicePurple
        else -> CloudWhite
    }
    
    Box(
        modifier = Modifier
            .fillMaxSize()
            .background(Color.Black)
            .systemBarsPadding()
    ) {
        Column(
            modifier = Modifier.fillMaxSize(),
            horizontalAlignment = Alignment.CenterHorizontally
        ) {
            Spacer(modifier = Modifier.weight(0.15f))
            
            // =============================================
            // ANIMATED CLOUD BUBBLE - Like in talking.xml
            // Multiple overlapping circles forming a cloud shape
            // =============================================
            Box(
                modifier = Modifier
                    .size(350.dp)
                    .scale(pulse1),
                contentAlignment = Alignment.Center
            ) {
                // Draw cloud shape using Canvas
                Canvas(modifier = Modifier.fillMaxSize()) {
                    val centerX = size.width / 2
                    val centerY = size.height / 2
                    
                    // Main large circle
                    drawCircle(
                        color = cloudColor.copy(alpha = alphaFlicker),
                        radius = size.width * 0.38f * pulse2,
                        center = Offset(centerX, centerY)
                    )
                    
                    // Top-left bubble
                    drawCircle(
                        color = cloudColor.copy(alpha = alphaFlicker),
                        radius = size.width * 0.28f * pulse3,
                        center = Offset(centerX - size.width * 0.22f, centerY - size.height * 0.15f)
                    )
                    
                    // Top-right bubble
                    drawCircle(
                        color = cloudColor.copy(alpha = alphaFlicker),
                        radius = size.width * 0.25f * pulse2,
                        center = Offset(centerX + size.width * 0.2f, centerY - size.height * 0.12f)
                    )
                    
                    // Bottom-right small bubble
                    drawCircle(
                        color = cloudColor.copy(alpha = alphaFlicker),
                        radius = size.width * 0.18f * pulse3,
                        center = Offset(centerX + size.width * 0.28f, centerY + size.height * 0.08f)
                    )
                    
                    // Small thought bubble dots (bottom left)
                    drawCircle(
                        color = cloudColor.copy(alpha = alphaFlicker * 0.9f),
                        radius = size.width * 0.06f,
                        center = Offset(centerX - size.width * 0.35f, centerY + size.height * 0.25f)
                    )
                    
                    drawCircle(
                        color = cloudColor.copy(alpha = alphaFlicker * 0.8f),
                        radius = size.width * 0.03f,
                        center = Offset(centerX - size.width * 0.42f, centerY + size.height * 0.32f)
                    )
                }
            }
            
            Spacer(modifier = Modifier.height(32.dp))
            
            // Status text - shows current state
            Text(
                text = when {
                    !hasPermission -> "Tap mic to grant permission"
                    isAISpeaking -> "AI is speaking..."
                    isProcessing -> "Analyzing..."
                    isRecording -> "Listening to you..."
                    else -> "Tap to speak"
                },
                fontSize = 18.sp,
                fontWeight = FontWeight.Medium,
                color = Color.White.copy(alpha = 0.8f)
            )
            
            // Hint text
            if (!isRecording && !isProcessing && !isAISpeaking) {
                Spacer(modifier = Modifier.height(8.dp))
                Text(
                    text = if (!hasPermission) "Microphone access required" else "Tap the mic button to start",
                    fontSize = 14.sp,
                    color = if (!hasPermission) VoiceRed.copy(alpha = 0.7f) else Color.White.copy(alpha = 0.5f)
                )
            }
            
            Spacer(modifier = Modifier.weight(1f))
            
            // =============================================
            // CONTROL BUTTONS - Fixed at bottom
            // Stop/Record button centered, Close button on right
            // =============================================
            Box(
                modifier = Modifier
                    .fillMaxWidth()
                    .padding(horizontal = 32.dp)
                    .padding(bottom = 48.dp)
            ) {
                // Close/End call button (left side) - Always visible
                Surface(
                    onClick = onEndCall,
                    shape = CircleShape,
                    color = VoiceRed,
                    modifier = Modifier
                        .size(64.dp)
                        .align(Alignment.CenterStart)
                ) {
                    Box(contentAlignment = Alignment.Center, modifier = Modifier.fillMaxSize()) {
                        Icon(
                            Icons.Default.Close,
                            contentDescription = "End call",
                            tint = Color.White,
                            modifier = Modifier.size(28.dp)
                        )
                    }
                }
                
                // Main Mic/Stop button (center) - Large, prominent
                Surface(
                    onClick = {
                        if (!hasPermission) {
                            onRequestPermission()
                        } else {
                            onToggleRecording()
                        }
                    },
                    shape = CircleShape,
                    color = when {
                        !hasPermission -> VoiceGray // Gray when no permission
                        isRecording -> VoiceRed // Red when recording (tap to stop)
                        isProcessing -> VoicePurple.copy(alpha = 0.6f) // Disabled look when processing
                        isAISpeaking -> VoiceGray.copy(alpha = 0.4f) // Disabled when AI speaking
                        else -> VoiceAccent // Green when ready to record
                    },
                    modifier = Modifier
                        .size(88.dp)
                        .align(Alignment.Center),
                    enabled = !isProcessing && !isAISpeaking
                ) {
                    Box(contentAlignment = Alignment.Center, modifier = Modifier.fillMaxSize()) {
                        if (isRecording) {
                            // Stop icon (square) when recording
                            Box(
                                modifier = Modifier
                                    .size(28.dp)
                                    .background(Color.White, RoundedCornerShape(4.dp))
                            )
                        } else if (isProcessing) {
                            // Loading indicator when processing
                            CircularProgressIndicator(
                                modifier = Modifier.size(32.dp),
                                color = Color.White,
                                strokeWidth = 3.dp
                            )
                        } else {
                            // Mic icon when idle (or when no permission)
                            Icon(
                                if (!hasPermission) Icons.Default.MicOff else Icons.Default.Mic,
                                contentDescription = if (!hasPermission) "Grant microphone permission" else "Tap to speak",
                                tint = Color.White,
                                modifier = Modifier.size(36.dp)
                            )
                        }
                    }
                }
            }
        }
    }
}
