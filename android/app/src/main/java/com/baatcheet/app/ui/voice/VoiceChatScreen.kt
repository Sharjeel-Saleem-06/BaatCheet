package com.baatcheet.app.ui.voice

import android.app.Activity
import android.view.WindowManager
import androidx.compose.animation.core.*
import androidx.compose.foundation.background
import androidx.compose.foundation.border
import androidx.compose.foundation.clickable
import androidx.compose.foundation.interaction.MutableInteractionSource
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
import androidx.compose.ui.draw.blur
import androidx.compose.ui.draw.clip
import androidx.compose.ui.draw.scale
import androidx.compose.ui.graphics.Brush
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.platform.LocalContext
import androidx.compose.ui.platform.LocalView
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.text.style.TextAlign
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import androidx.compose.ui.window.Dialog
import androidx.compose.ui.window.DialogProperties
import androidx.hilt.navigation.compose.hiltViewModel
import kotlinx.coroutines.delay

// Color palette for voice chat
private val VoiceDarkBg = Color(0xFF000000)
private val VoiceAccent = Color(0xFF34C759)
private val VoiceBlue = Color(0xFF007AFF)
private val VoicePurple = Color(0xFF5856D6)
private val VoiceOrange = Color(0xFFFF9500)
private val VoicePink = Color(0xFFFF2D55)
private val VoiceGray = Color(0xFF8E8E93)
private val VoiceLightGray = Color(0xFF2C2C2E)
private val VoiceCardBg = Color(0xFF1C1C1E)

/**
 * Voice Mode State
 */
enum class VoiceModeStep {
    INTRO,
    VOICE_SELECT,
    ACTIVE_CALL
}

/**
 * AI Voice data class
 */
data class AIVoice(
    val id: String,
    val name: String,
    val description: String,
    val previewUrl: String? = null,
    val color: Color = VoiceAccent,
    val icon: String = "🎙️"
)

/**
 * Voice Chat Screen - FULL SCREEN DIALOG
 * This ensures it covers the entire screen including status bar
 */
@Composable
fun VoiceChatScreen(
    viewModel: VoiceChatViewModel = hiltViewModel(),
    onDismiss: () -> Unit,
    onConversationCreated: (String) -> Unit = {}
) {
    val state by viewModel.state.collectAsState()
    
    // Use Dialog with full screen properties
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
                        onStartCall = { viewModel.startVoiceCall() },
                        onBack = { viewModel.moveToIntro() },
                        onDismiss = onDismiss
                    )
                }
                VoiceModeStep.ACTIVE_CALL -> {
                    ActiveVoiceCallScreen(
                        isRecording = state.isRecording,
                        isProcessing = state.isProcessing,
                        isAISpeaking = state.isAISpeaking,
                        currentTranscript = state.currentTranscript,
                        aiResponse = state.aiResponse,
                        selectedVoice = state.selectedVoice,
                        callDuration = state.callDuration,
                        audioLevel = state.audioLevel,
                        onStartRecording = { viewModel.startRecording() },
                        onStopRecording = { viewModel.stopRecordingAndSend() },
                        onEndCall = { 
                            viewModel.endCall()
                            state.conversationId?.let { onConversationCreated(it) }
                            onDismiss()
                        },
                        onMute = { viewModel.toggleMute() },
                        isMuted = state.isMuted
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
    val infiniteTransition = rememberInfiniteTransition(label = "gradient")
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
        // Close button
        IconButton(
            onClick = onDismiss,
            modifier = Modifier
                .align(Alignment.TopEnd)
                .padding(8.dp)
        ) {
            Icon(
                Icons.Default.Close,
                contentDescription = "Close",
                tint = Color.White.copy(alpha = 0.7f),
                modifier = Modifier.size(28.dp)
            )
        }
        
        Column(
            modifier = Modifier
                .fillMaxSize()
                .padding(horizontal = 32.dp),
            horizontalAlignment = Alignment.CenterHorizontally,
            verticalArrangement = Arrangement.Center
        ) {
            // Animated pulsing orb
            Box(
                modifier = Modifier
                    .size(160.dp)
                    .scale(pulseScale),
                contentAlignment = Alignment.Center
            ) {
                // Outer glow
                Box(
                    modifier = Modifier
                        .size(160.dp)
                        .background(
                            Brush.radialGradient(
                                colors = listOf(
                                    VoiceAccent.copy(alpha = 0.3f),
                                    VoiceAccent.copy(alpha = 0.1f),
                                    Color.Transparent
                                )
                            ),
                            CircleShape
                        )
                )
                // Inner circle
                Box(
                    modifier = Modifier
                        .size(100.dp)
                        .background(VoiceAccent, CircleShape),
                    contentAlignment = Alignment.Center
                ) {
                    Icon(
                        Icons.Default.Mic,
                        contentDescription = null,
                        tint = Color.White,
                        modifier = Modifier.size(48.dp)
                    )
                }
            }
            
            Spacer(modifier = Modifier.height(48.dp))
            
            Text(
                text = "Voice Mode",
                fontSize = 32.sp,
                fontWeight = FontWeight.Bold,
                color = Color.White
            )
            
            Spacer(modifier = Modifier.height(12.dp))
            
            Text(
                text = "Have a natural conversation\nwith AI using your voice",
                fontSize = 16.sp,
                color = VoiceGray,
                textAlign = TextAlign.Center,
                lineHeight = 24.sp
            )
            
            Spacer(modifier = Modifier.height(56.dp))
            
            // Features
            Column(verticalArrangement = Arrangement.spacedBy(16.dp)) {
                FeatureItem(icon = Icons.Outlined.RecordVoiceOver, text = "Natural voice conversation")
                FeatureItem(icon = Icons.Outlined.Speed, text = "Real-time AI responses")
                FeatureItem(icon = Icons.Outlined.Tune, text = "Choose your AI voice")
            }
            
            Spacer(modifier = Modifier.height(56.dp))
            
            // Continue button
            Button(
                onClick = onContinue,
                modifier = Modifier
                    .fillMaxWidth()
                    .height(56.dp),
                colors = ButtonDefaults.buttonColors(containerColor = VoiceAccent),
                shape = RoundedCornerShape(28.dp)
            ) {
                Text("Choose Voice", fontSize = 18.sp, fontWeight = FontWeight.SemiBold)
                Spacer(modifier = Modifier.width(8.dp))
                Icon(Icons.Default.ArrowForward, contentDescription = null)
            }
        }
    }
}

@Composable
private fun FeatureItem(
    icon: androidx.compose.ui.graphics.vector.ImageVector,
    text: String
) {
    Row(verticalAlignment = Alignment.CenterVertically) {
        Icon(icon, contentDescription = null, tint = VoiceAccent, modifier = Modifier.size(24.dp))
        Spacer(modifier = Modifier.width(16.dp))
        Text(text = text, fontSize = 15.sp, color = Color.White.copy(alpha = 0.9f))
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
        modifier = Modifier
            .fillMaxSize()
            .background(VoiceDarkBg)
            .systemBarsPadding()
    ) {
        Column(modifier = Modifier.fillMaxSize()) {
            // Header
            Row(
                modifier = Modifier
                    .fillMaxWidth()
                    .padding(horizontal = 8.dp, vertical = 8.dp),
                horizontalArrangement = Arrangement.SpaceBetween,
                verticalAlignment = Alignment.CenterVertically
            ) {
                IconButton(onClick = onBack) {
                    Icon(Icons.Default.ArrowBack, "Back", tint = Color.White)
                }
                Text("Choose Voice", fontSize = 18.sp, fontWeight = FontWeight.SemiBold, color = Color.White)
                IconButton(onClick = onDismiss) {
                    Icon(Icons.Default.Close, "Close", tint = Color.White.copy(alpha = 0.7f))
                }
            }
            
            Text(
                "Select a voice for your AI assistant",
                fontSize = 14.sp,
                color = VoiceGray,
                modifier = Modifier.padding(horizontal = 16.dp, vertical = 8.dp)
            )
            
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
                        VoiceCard(
                            voice = voice,
                            isSelected = voice.id == selectedVoice?.id,
                            isPlaying = playingVoiceId == voice.id,
                            onSelect = { onVoiceSelect(voice) },
                            onPlayPreview = { onPlayPreview(voice) }
                        )
                    }
                }
            }
            
            // Start call button
            Box(modifier = Modifier.padding(16.dp)) {
                Button(
                    onClick = onStartCall,
                    enabled = selectedVoice != null,
                    modifier = Modifier.fillMaxWidth().height(56.dp),
                    colors = ButtonDefaults.buttonColors(
                        containerColor = VoiceAccent,
                        disabledContainerColor = VoiceLightGray
                    ),
                    shape = RoundedCornerShape(28.dp)
                ) {
                    Icon(Icons.Default.Call, contentDescription = null)
                    Spacer(modifier = Modifier.width(8.dp))
                    Text("Start Voice Call", fontSize = 18.sp, fontWeight = FontWeight.SemiBold)
                }
            }
        }
    }
}

@Composable
private fun VoiceCard(
    voice: AIVoice,
    isSelected: Boolean,
    isPlaying: Boolean,
    onSelect: () -> Unit,
    onPlayPreview: () -> Unit
) {
    Surface(
        onClick = onSelect,
        shape = RoundedCornerShape(16.dp),
        color = if (isSelected) voice.color.copy(alpha = 0.12f) else VoiceCardBg,
        border = if (isSelected) androidx.compose.foundation.BorderStroke(2.dp, voice.color) else null,
        modifier = Modifier.fillMaxWidth()
    ) {
        Row(
            modifier = Modifier.padding(16.dp),
            verticalAlignment = Alignment.CenterVertically
        ) {
            Box(
                modifier = Modifier
                    .size(52.dp)
                    .background(voice.color.copy(alpha = 0.2f), CircleShape),
                contentAlignment = Alignment.Center
            ) {
                Text(voice.icon, fontSize = 26.sp)
            }
            
            Spacer(modifier = Modifier.width(16.dp))
            
            Column(modifier = Modifier.weight(1f)) {
                Text(voice.name, fontSize = 17.sp, fontWeight = FontWeight.SemiBold, color = Color.White)
                Text(voice.description, fontSize = 13.sp, color = VoiceGray)
            }
            
            IconButton(
                onClick = onPlayPreview,
                modifier = Modifier
                    .size(44.dp)
                    .background(
                        if (isPlaying) voice.color else Color.White.copy(alpha = 0.1f),
                        CircleShape
                    )
            ) {
                if (isPlaying) {
                    CircularProgressIndicator(Modifier.size(20.dp), Color.White, strokeWidth = 2.dp)
                } else {
                    Icon(Icons.Default.PlayArrow, "Play", tint = Color.White, modifier = Modifier.size(24.dp))
                }
            }
        }
    }
}

/**
 * Screen 3: ACTIVE VOICE CALL - Full Screen with Animated Cloud/Orb
 * Based on Figma design: https://www.figma.com/design/W2psS1UHgN7olY6N6t2Unt
 */
@Composable
private fun ActiveVoiceCallScreen(
    isRecording: Boolean,
    isProcessing: Boolean,
    isAISpeaking: Boolean,
    currentTranscript: String,
    aiResponse: String,
    selectedVoice: AIVoice?,
    callDuration: Long,
    audioLevel: Float,
    onStartRecording: () -> Unit,
    onStopRecording: () -> Unit,
    onEndCall: () -> Unit,
    onMute: () -> Unit,
    isMuted: Boolean
) {
    val infiniteTransition = rememberInfiniteTransition(label = "cloudAnim")
    
    // Dynamic animation speed based on state
    val animationSpeed = when {
        isAISpeaking -> 600
        isRecording -> 800
        isProcessing -> 1000
        else -> 2000
    }
    
    // Cloud pulse animation - Layer 1 (outermost)
    val pulse1 by infiniteTransition.animateFloat(
        initialValue = 0.85f,
        targetValue = 1.0f,
        animationSpec = infiniteRepeatable(
            animation = tween(animationSpeed, easing = FastOutSlowInEasing),
            repeatMode = RepeatMode.Reverse
        ),
        label = "pulse1"
    )
    
    // Cloud pulse animation - Layer 2
    val pulse2 by infiniteTransition.animateFloat(
        initialValue = 0.9f,
        targetValue = 1.1f,
        animationSpec = infiniteRepeatable(
            animation = tween((animationSpeed * 0.8f).toInt(), easing = FastOutSlowInEasing),
            repeatMode = RepeatMode.Reverse
        ),
        label = "pulse2"
    )
    
    // Cloud pulse animation - Layer 3 (innermost)
    val pulse3 by infiniteTransition.animateFloat(
        initialValue = 0.95f,
        targetValue = 1.15f,
        animationSpec = infiniteRepeatable(
            animation = tween((animationSpeed * 0.6f).toInt(), easing = FastOutSlowInEasing),
            repeatMode = RepeatMode.Reverse
        ),
        label = "pulse3"
    )
    
    // Glow intensity flicker
    val glowAlpha by infiniteTransition.animateFloat(
        initialValue = 0.4f,
        targetValue = 0.8f,
        animationSpec = infiniteRepeatable(
            animation = tween((animationSpeed * 0.5f).toInt(), easing = LinearEasing),
            repeatMode = RepeatMode.Reverse
        ),
        label = "glow"
    )
    
    // Color based on state
    val orbColor = when {
        isAISpeaking -> VoiceAccent
        isRecording -> Color(0xFF4CD964)
        isProcessing -> VoicePurple
        else -> VoiceAccent
    }
    
    // Format duration
    val minutes = (callDuration / 60).toInt()
    val seconds = (callDuration % 60).toInt()
    val durationText = String.format("%02d:%02d", minutes, seconds)
    
    Box(
        modifier = Modifier
            .fillMaxSize()
            .background(Color.Black)
    ) {
        Column(
            modifier = Modifier
                .fillMaxSize()
                .systemBarsPadding(),
            horizontalAlignment = Alignment.CenterHorizontally
        ) {
            Spacer(modifier = Modifier.height(48.dp))
            
            // Duration timer at top
            Text(
                text = durationText,
                fontSize = 20.sp,
                fontWeight = FontWeight.Medium,
                color = Color.White.copy(alpha = 0.7f)
            )
            
            Spacer(modifier = Modifier.weight(0.3f))
            
            // =============================================
            // ANIMATED CLOUD/ORB - Main Visual Element
            // Multiple layered circles with different pulse speeds
            // Creates a "breathing" cloud effect
            // =============================================
            Box(
                modifier = Modifier.size(320.dp),
                contentAlignment = Alignment.Center
            ) {
                // Layer 1: Outermost glow ring
                Box(
                    modifier = Modifier
                        .size(320.dp)
                        .scale(pulse1)
                        .background(
                            Brush.radialGradient(
                                colors = listOf(
                                    orbColor.copy(alpha = glowAlpha * 0.15f),
                                    orbColor.copy(alpha = glowAlpha * 0.05f),
                                    Color.Transparent
                                )
                            ),
                            CircleShape
                        )
                )
                
                // Layer 2: Middle glow ring
                Box(
                    modifier = Modifier
                        .size(240.dp)
                        .scale(pulse2)
                        .background(
                            Brush.radialGradient(
                                colors = listOf(
                                    orbColor.copy(alpha = glowAlpha * 0.25f),
                                    orbColor.copy(alpha = glowAlpha * 0.1f),
                                    Color.Transparent
                                )
                            ),
                            CircleShape
                        )
                )
                
                // Layer 3: Inner bright core
                Box(
                    modifier = Modifier
                        .size(160.dp)
                        .scale(pulse3)
                        .background(
                            Brush.radialGradient(
                                colors = listOf(
                                    orbColor.copy(alpha = glowAlpha),
                                    orbColor.copy(alpha = glowAlpha * 0.6f),
                                    orbColor.copy(alpha = glowAlpha * 0.2f)
                                )
                            ),
                            CircleShape
                        )
                )
                
                // Layer 4: Center bright spot with blur effect
                Box(
                    modifier = Modifier
                        .size(80.dp)
                        .background(
                            Brush.radialGradient(
                                colors = listOf(
                                    Color.White.copy(alpha = glowAlpha * 0.9f),
                                    orbColor.copy(alpha = 0.5f),
                                    Color.Transparent
                                )
                            ),
                            CircleShape
                        )
                )
                
                // Processing spinner overlay
                if (isProcessing) {
                    CircularProgressIndicator(
                        modifier = Modifier.size(48.dp),
                        color = Color.White.copy(alpha = 0.9f),
                        strokeWidth = 3.dp
                    )
                }
            }
            
            Spacer(modifier = Modifier.height(48.dp))
            
            // Voice name
            Text(
                text = selectedVoice?.name ?: "AI",
                fontSize = 32.sp,
                fontWeight = FontWeight.Bold,
                color = Color.White
            )
            
            Spacer(modifier = Modifier.height(8.dp))
            
            // Status text
            Text(
                text = when {
                    isAISpeaking -> "Speaking..."
                    isProcessing -> "Thinking..."
                    isRecording -> "Listening..."
                    else -> "Tap to speak"
                },
                fontSize = 17.sp,
                color = Color.White.copy(alpha = 0.5f)
            )
            
            Spacer(modifier = Modifier.weight(0.4f))
            
            // =============================================
            // CONTROL BUTTONS - Bottom
            // =============================================
            Row(
                modifier = Modifier
                    .fillMaxWidth()
                    .padding(horizontal = 40.dp)
                    .padding(bottom = 48.dp),
                horizontalArrangement = Arrangement.SpaceEvenly,
                verticalAlignment = Alignment.CenterVertically
            ) {
                // Mute button
                Surface(
                    onClick = onMute,
                    shape = CircleShape,
                    color = if (isMuted) VoicePink.copy(alpha = 0.25f) else Color.White.copy(alpha = 0.1f),
                    modifier = Modifier.size(64.dp)
                ) {
                    Box(contentAlignment = Alignment.Center, modifier = Modifier.fillMaxSize()) {
                        Icon(
                            if (isMuted) Icons.Default.MicOff else Icons.Default.Mic,
                            contentDescription = "Mute",
                            tint = if (isMuted) VoicePink else Color.White.copy(alpha = 0.6f),
                            modifier = Modifier.size(26.dp)
                        )
                    }
                }
                
                // Main record/stop button - Large green button
                Surface(
                    onClick = { if (isRecording) onStopRecording() else onStartRecording() },
                    shape = CircleShape,
                    color = VoiceAccent,
                    modifier = Modifier.size(80.dp)
                ) {
                    Box(contentAlignment = Alignment.Center, modifier = Modifier.fillMaxSize()) {
                        Icon(
                            Icons.Default.Mic,
                            contentDescription = "Record",
                            tint = Color.White,
                            modifier = Modifier.size(36.dp)
                        )
                    }
                }
                
                // End call button
                Surface(
                    onClick = onEndCall,
                    shape = CircleShape,
                    color = VoicePink.copy(alpha = 0.25f),
                    modifier = Modifier.size(64.dp)
                ) {
                    Box(contentAlignment = Alignment.Center, modifier = Modifier.fillMaxSize()) {
                        Icon(
                            Icons.Default.CallEnd,
                            contentDescription = "End call",
                            tint = VoicePink,
                            modifier = Modifier.size(26.dp)
                        )
                    }
                }
            }
        }
    }
}
