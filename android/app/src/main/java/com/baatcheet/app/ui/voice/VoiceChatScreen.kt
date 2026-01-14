package com.baatcheet.app.ui.voice

import android.media.MediaPlayer
import android.media.MediaRecorder
import android.os.Build
import androidx.compose.animation.AnimatedVisibility
import androidx.compose.animation.core.*
import androidx.compose.animation.fadeIn
import androidx.compose.animation.fadeOut
import androidx.compose.animation.slideInVertically
import androidx.compose.animation.slideOutVertically
import androidx.compose.foundation.Image
import androidx.compose.foundation.background
import androidx.compose.foundation.border
import androidx.compose.foundation.clickable
import androidx.compose.foundation.interaction.MutableInteractionSource
import androidx.compose.foundation.layout.*
import androidx.compose.foundation.lazy.LazyColumn
import androidx.compose.foundation.lazy.LazyRow
import androidx.compose.foundation.lazy.items
import androidx.compose.foundation.shape.CircleShape
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.automirrored.filled.Send
import androidx.compose.material.icons.filled.*
import androidx.compose.material.icons.outlined.*
import androidx.compose.material3.*
import androidx.compose.runtime.*
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.clip
import androidx.compose.ui.draw.scale
import androidx.compose.ui.graphics.Brush
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.platform.LocalContext
import androidx.compose.ui.res.painterResource
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.text.style.TextAlign
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import androidx.hilt.navigation.compose.hiltViewModel
import com.baatcheet.app.R
import kotlinx.coroutines.delay
import kotlinx.coroutines.launch
import java.io.File

// Color palette for voice chat
private val VoiceDarkBg = Color(0xFF1A1A1A)
private val VoiceAccent = Color(0xFF34C759)
private val VoiceBlue = Color(0xFF007AFF)
private val VoicePurple = Color(0xFF5856D6)
private val VoiceOrange = Color(0xFFFF9500)
private val VoicePink = Color(0xFFFF2D55)
private val VoiceGray = Color(0xFF8E8E93)
private val VoiceLightGray = Color(0xFF3A3A3C)

/**
 * Voice Mode State
 */
enum class VoiceModeStep {
    INTRO,           // Initial welcome screen
    VOICE_SELECT,    // Voice selection screen
    ACTIVE_CALL      // Active voice call with AI
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
 * Voice Chat Screen - Main entry point
 * Handles all three steps of voice chat flow
 */
@Composable
fun VoiceChatScreen(
    viewModel: VoiceChatViewModel = hiltViewModel(),
    onDismiss: () -> Unit,
    onConversationCreated: (String) -> Unit = {}
) {
    val state by viewModel.state.collectAsState()
    val context = LocalContext.current
    
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

/**
 * Screen 1: Voice Mode Introduction
 */
@Composable
private fun VoiceIntroScreen(
    onContinue: () -> Unit,
    onDismiss: () -> Unit
) {
    // Animated gradient background
    val infiniteTransition = rememberInfiniteTransition(label = "gradient")
    val gradientOffset by infiniteTransition.animateFloat(
        initialValue = 0f,
        targetValue = 1f,
        animationSpec = infiniteRepeatable(
            animation = tween(3000, easing = LinearEasing),
            repeatMode = RepeatMode.Reverse
        ),
        label = "gradient"
    )
    
    Box(
        modifier = Modifier
            .fillMaxSize()
            .background(
                Brush.verticalGradient(
                    colors = listOf(
                        VoiceDarkBg,
                        Color(0xFF2C2C2E),
                        VoiceDarkBg
                    ),
                    startY = gradientOffset * 500
                )
            )
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
            // Animated logo/icon
            val scale by infiniteTransition.animateFloat(
                initialValue = 1f,
                targetValue = 1.1f,
                animationSpec = infiniteRepeatable(
                    animation = tween(1500, easing = FastOutSlowInEasing),
                    repeatMode = RepeatMode.Reverse
                ),
                label = "scale"
            )
            
            Box(
                modifier = Modifier
                    .size(120.dp)
                    .scale(scale)
                    .background(
                        Brush.radialGradient(
                            colors = listOf(
                                VoiceAccent.copy(alpha = 0.3f),
                                VoiceAccent.copy(alpha = 0.1f),
                                Color.Transparent
                            )
                        ),
                        CircleShape
                    ),
                contentAlignment = Alignment.Center
            ) {
                Box(
                    modifier = Modifier
                        .size(80.dp)
                        .background(VoiceAccent, CircleShape),
                    contentAlignment = Alignment.Center
                ) {
                    Icon(
                        Icons.Default.Mic,
                        contentDescription = "Voice",
                        tint = Color.White,
                        modifier = Modifier.size(40.dp)
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
            
            Spacer(modifier = Modifier.height(16.dp))
            
            Text(
                text = "Have a natural conversation with AI using your voice. Just speak and listen.",
                fontSize = 16.sp,
                color = VoiceGray,
                textAlign = TextAlign.Center,
                lineHeight = 24.sp
            )
            
            Spacer(modifier = Modifier.height(48.dp))
            
            // Features list
            Column(
                verticalArrangement = Arrangement.spacedBy(16.dp)
            ) {
                FeatureItem(
                    icon = Icons.Outlined.RecordVoiceOver,
                    text = "Natural voice conversation"
                )
                FeatureItem(
                    icon = Icons.Outlined.Speed,
                    text = "Real-time responses"
                )
                FeatureItem(
                    icon = Icons.Outlined.Tune,
                    text = "Choose your AI voice"
                )
            }
            
            Spacer(modifier = Modifier.weight(1f))
            
            // Continue button
            Button(
                onClick = onContinue,
                modifier = Modifier
                    .fillMaxWidth()
                    .height(56.dp),
                colors = ButtonDefaults.buttonColors(
                    containerColor = VoiceAccent
                ),
                shape = RoundedCornerShape(28.dp)
            ) {
                Text(
                    text = "Choose Voice",
                    fontSize = 18.sp,
                    fontWeight = FontWeight.SemiBold
                )
                Spacer(modifier = Modifier.width(8.dp))
                Icon(
                    Icons.Default.ArrowForward,
                    contentDescription = null
                )
            }
            
            Spacer(modifier = Modifier.height(32.dp))
        }
    }
}

@Composable
private fun FeatureItem(
    icon: androidx.compose.ui.graphics.vector.ImageVector,
    text: String
) {
    Row(
        verticalAlignment = Alignment.CenterVertically,
        modifier = Modifier.fillMaxWidth()
    ) {
        Icon(
            icon,
            contentDescription = null,
            tint = VoiceAccent,
            modifier = Modifier.size(24.dp)
        )
        Spacer(modifier = Modifier.width(16.dp))
        Text(
            text = text,
            fontSize = 15.sp,
            color = Color.White
        )
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
    ) {
        Column(
            modifier = Modifier
                .fillMaxSize()
                .statusBarsPadding()
        ) {
            // Header
            Row(
                modifier = Modifier
                    .fillMaxWidth()
                    .padding(16.dp),
                horizontalArrangement = Arrangement.SpaceBetween,
                verticalAlignment = Alignment.CenterVertically
            ) {
                IconButton(onClick = onBack) {
                    Icon(
                        Icons.Default.ArrowBack,
                        contentDescription = "Back",
                        tint = Color.White
                    )
                }
                
                Text(
                    text = "Choose Voice",
                    fontSize = 20.sp,
                    fontWeight = FontWeight.Bold,
                    color = Color.White
                )
                
                IconButton(onClick = onDismiss) {
                    Icon(
                        Icons.Default.Close,
                        contentDescription = "Close",
                        tint = Color.White
                    )
                }
            }
            
            // Subtitle
            Text(
                text = "Select a voice for your AI assistant",
                fontSize = 14.sp,
                color = VoiceGray,
                modifier = Modifier.padding(horizontal = 16.dp)
            )
            
            Spacer(modifier = Modifier.height(24.dp))
            
            if (isLoadingVoices) {
                Box(
                    modifier = Modifier
                        .fillMaxWidth()
                        .weight(1f),
                    contentAlignment = Alignment.Center
                ) {
                    CircularProgressIndicator(color = VoiceAccent)
                }
            } else {
                // Voice list
                LazyColumn(
                    modifier = Modifier
                        .fillMaxWidth()
                        .weight(1f),
                    contentPadding = PaddingValues(horizontal = 16.dp),
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
            Surface(
                modifier = Modifier
                    .fillMaxWidth()
                    .navigationBarsPadding()
                    .padding(16.dp),
                color = VoiceDarkBg
            ) {
                Button(
                    onClick = onStartCall,
                    enabled = selectedVoice != null,
                    modifier = Modifier
                        .fillMaxWidth()
                        .height(56.dp),
                    colors = ButtonDefaults.buttonColors(
                        containerColor = VoiceAccent,
                        disabledContainerColor = VoiceLightGray
                    ),
                    shape = RoundedCornerShape(28.dp)
                ) {
                    Icon(
                        Icons.Default.Call,
                        contentDescription = null
                    )
                    Spacer(modifier = Modifier.width(8.dp))
                    Text(
                        text = "Start Voice Call",
                        fontSize = 18.sp,
                        fontWeight = FontWeight.SemiBold
                    )
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
        color = if (isSelected) voice.color.copy(alpha = 0.15f) else VoiceLightGray,
        border = if (isSelected) 
            androidx.compose.foundation.BorderStroke(2.dp, voice.color) 
        else null,
        modifier = Modifier.fillMaxWidth()
    ) {
        Row(
            modifier = Modifier
                .fillMaxWidth()
                .padding(16.dp),
            verticalAlignment = Alignment.CenterVertically
        ) {
            // Voice avatar
            Box(
                modifier = Modifier
                    .size(56.dp)
                    .background(voice.color.copy(alpha = 0.2f), CircleShape),
                contentAlignment = Alignment.Center
            ) {
                Text(
                    text = voice.icon,
                    fontSize = 28.sp
                )
            }
            
            Spacer(modifier = Modifier.width(16.dp))
            
            Column(modifier = Modifier.weight(1f)) {
                Text(
                    text = voice.name,
                    fontSize = 17.sp,
                    fontWeight = FontWeight.SemiBold,
                    color = Color.White
                )
                Text(
                    text = voice.description,
                    fontSize = 13.sp,
                    color = VoiceGray
                )
            }
            
            // Play preview button
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
                    CircularProgressIndicator(
                        modifier = Modifier.size(20.dp),
                        color = Color.White,
                        strokeWidth = 2.dp
                    )
                } else {
                    Icon(
                        Icons.Default.PlayArrow,
                        contentDescription = "Play preview",
                        tint = Color.White,
                        modifier = Modifier.size(24.dp)
                    )
                }
            }
        }
    }
}

/**
 * Screen 3: Active Voice Call - Figma Design
 * Clean design with animated orb/cloud, no messages shown during call
 * Messages are saved to chat when call ends
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
    // Multiple animated transitions for the orb effect
    val infiniteTransition = rememberInfiniteTransition(label = "orb")
    
    // Slow pulse for outer glow
    val outerPulse by infiniteTransition.animateFloat(
        initialValue = 1f,
        targetValue = 1.3f,
        animationSpec = infiniteRepeatable(
            animation = tween(2000, easing = FastOutSlowInEasing),
            repeatMode = RepeatMode.Reverse
        ),
        label = "outerPulse"
    )
    
    // Medium pulse for middle ring
    val middlePulse by infiniteTransition.animateFloat(
        initialValue = 1f,
        targetValue = 1.15f,
        animationSpec = infiniteRepeatable(
            animation = tween(1500, easing = FastOutSlowInEasing),
            repeatMode = RepeatMode.Reverse
        ),
        label = "middlePulse"
    )
    
    // Fast flicker for inner orb
    val innerFlicker by infiniteTransition.animateFloat(
        initialValue = 0.7f,
        targetValue = 1f,
        animationSpec = infiniteRepeatable(
            animation = tween(800, easing = FastOutSlowInEasing),
            repeatMode = RepeatMode.Reverse
        ),
        label = "innerFlicker"
    )
    
    // Rotation for shimmer effect
    val rotation by infiniteTransition.animateFloat(
        initialValue = 0f,
        targetValue = 360f,
        animationSpec = infiniteRepeatable(
            animation = tween(8000, easing = LinearEasing),
            repeatMode = RepeatMode.Restart
        ),
        label = "rotation"
    )
    
    // Color transitions based on state
    val orbColor = when {
        isAISpeaking -> VoiceAccent
        isProcessing -> VoicePurple
        isRecording -> VoiceBlue
        else -> selectedVoice?.color ?: VoiceAccent
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
                .statusBarsPadding(),
            horizontalAlignment = Alignment.CenterHorizontally
        ) {
            Spacer(modifier = Modifier.height(40.dp))
            
            // Duration at top
            Text(
                text = durationText,
                fontSize = 18.sp,
                fontWeight = FontWeight.Medium,
                color = Color.White.copy(alpha = 0.8f)
            )
            
            Spacer(modifier = Modifier.weight(0.4f))
            
            // ========================================
            // ANIMATED ORB/CLOUD - Main Visual
            // ========================================
            Box(
                modifier = Modifier.size(280.dp),
                contentAlignment = Alignment.Center
            ) {
                // Layer 1: Outer glow ring (slowest pulse)
                Box(
                    modifier = Modifier
                        .size(280.dp)
                        .scale(outerPulse)
                        .background(
                            Brush.radialGradient(
                                colors = listOf(
                                    orbColor.copy(alpha = 0.15f),
                                    orbColor.copy(alpha = 0.05f),
                                    Color.Transparent
                                )
                            ),
                            CircleShape
                        )
                )
                
                // Layer 2: Middle ring (medium pulse)
                Box(
                    modifier = Modifier
                        .size(200.dp)
                        .scale(middlePulse)
                        .background(
                            Brush.radialGradient(
                                colors = listOf(
                                    orbColor.copy(alpha = 0.25f),
                                    orbColor.copy(alpha = 0.1f),
                                    Color.Transparent
                                )
                            ),
                            CircleShape
                        )
                )
                
                // Layer 3: Inner orb with flicker
                Box(
                    modifier = Modifier
                        .size(140.dp)
                        .scale(innerFlicker)
                        .background(
                            Brush.radialGradient(
                                colors = listOf(
                                    orbColor.copy(alpha = 0.9f),
                                    orbColor.copy(alpha = 0.6f),
                                    orbColor.copy(alpha = 0.3f)
                                )
                            ),
                            CircleShape
                        ),
                    contentAlignment = Alignment.Center
                ) {
                    // Processing indicator or voice icon
                    if (isProcessing) {
                        CircularProgressIndicator(
                            modifier = Modifier.size(40.dp),
                            color = Color.White.copy(alpha = 0.9f),
                            strokeWidth = 3.dp
                        )
                    }
                }
                
                // Layer 4: Center bright spot
                Box(
                    modifier = Modifier
                        .size(60.dp)
                        .background(
                            Brush.radialGradient(
                                colors = listOf(
                                    Color.White.copy(alpha = innerFlicker * 0.8f),
                                    Color.White.copy(alpha = 0.3f),
                                    Color.Transparent
                                )
                            ),
                            CircleShape
                        )
                )
            }
            
            Spacer(modifier = Modifier.height(48.dp))
            
            // Voice name
            Text(
                text = selectedVoice?.name ?: "AI",
                fontSize = 28.sp,
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
                    else -> "Tap mic to speak"
                },
                fontSize = 16.sp,
                color = Color.White.copy(alpha = 0.6f)
            )
            
            Spacer(modifier = Modifier.weight(0.5f))
            
            // ========================================
            // CONTROL BUTTONS - Bottom area
            // ========================================
            Row(
                modifier = Modifier
                    .fillMaxWidth()
                    .padding(horizontal = 48.dp)
                    .navigationBarsPadding()
                    .padding(bottom = 40.dp),
                horizontalArrangement = Arrangement.SpaceEvenly,
                verticalAlignment = Alignment.CenterVertically
            ) {
                // Mute button
                Surface(
                    onClick = onMute,
                    shape = CircleShape,
                    color = if (isMuted) VoicePink.copy(alpha = 0.3f) else Color.White.copy(alpha = 0.1f),
                    modifier = Modifier.size(64.dp)
                ) {
                    Box(contentAlignment = Alignment.Center) {
                        Icon(
                            if (isMuted) Icons.Default.MicOff else Icons.Default.Mic,
                            contentDescription = "Mute",
                            tint = if (isMuted) VoicePink else Color.White.copy(alpha = 0.7f),
                            modifier = Modifier.size(28.dp)
                        )
                    }
                }
                
                // Main record button - Large and prominent
                Surface(
                    onClick = {
                        if (isRecording) onStopRecording() else onStartRecording()
                    },
                    shape = CircleShape,
                    color = if (isRecording) VoicePink else VoiceAccent,
                    modifier = Modifier.size(88.dp)
                ) {
                    Box(contentAlignment = Alignment.Center) {
                        if (isRecording) {
                            // Show stop icon when recording
                            Box(
                                modifier = Modifier
                                    .size(28.dp)
                                    .background(Color.White, RoundedCornerShape(6.dp))
                            )
                        } else {
                            Icon(
                                Icons.Default.Mic,
                                contentDescription = "Record",
                                tint = Color.White,
                                modifier = Modifier.size(40.dp)
                            )
                        }
                    }
                }
                
                // End call button
                Surface(
                    onClick = onEndCall,
                    shape = CircleShape,
                    color = VoicePink.copy(alpha = 0.3f),
                    modifier = Modifier.size(64.dp)
                ) {
                    Box(contentAlignment = Alignment.Center) {
                        Icon(
                            Icons.Default.CallEnd,
                            contentDescription = "End call",
                            tint = VoicePink,
                            modifier = Modifier.size(28.dp)
                        )
                    }
                }
            }
        }
    }
}
