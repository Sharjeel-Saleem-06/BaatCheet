package com.baatcheet.app.ui.voice

import android.content.Context
import android.media.MediaPlayer
import android.media.MediaRecorder
import android.os.Build
import android.speech.RecognitionListener
import android.speech.RecognizerIntent
import android.speech.SpeechRecognizer
import android.content.Intent
import android.os.Bundle
import androidx.compose.ui.graphics.Color
import androidx.lifecycle.ViewModel
import androidx.lifecycle.viewModelScope
import com.baatcheet.app.data.repository.ChatRepository
import dagger.hilt.android.lifecycle.HiltViewModel
import dagger.hilt.android.qualifiers.ApplicationContext
import kotlinx.coroutines.Job
import kotlinx.coroutines.delay
import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.flow.StateFlow
import kotlinx.coroutines.flow.asStateFlow
import kotlinx.coroutines.flow.update
import kotlinx.coroutines.launch
import java.io.File
import java.util.Locale
import javax.inject.Inject

// Color definitions for voices
private val VoiceAccent = Color(0xFF34C759)
private val VoiceBlue = Color(0xFF007AFF)
private val VoicePurple = Color(0xFF5856D6)
private val VoiceOrange = Color(0xFFFF9500)
private val VoicePink = Color(0xFFFF2D55)

/**
 * Voice Chat State
 */
data class VoiceChatState(
    val currentStep: VoiceModeStep = VoiceModeStep.INTRO,
    val availableVoices: List<AIVoice> = emptyList(),
    val selectedVoice: AIVoice? = null,
    val isLoadingVoices: Boolean = false,
    val isPlayingPreview: Boolean = false,
    val playingVoiceId: String? = null,
    
    // Call state
    val isRecording: Boolean = false,
    val isProcessing: Boolean = false,
    val isAISpeaking: Boolean = false,
    val isMuted: Boolean = false,
    val currentTranscript: String = "",
    val aiResponse: String = "",
    val callDuration: Long = 0L,
    val audioLevel: Float = 0f,
    val conversationId: String? = null,
    
    // Error handling
    val error: String? = null
)

@HiltViewModel
class VoiceChatViewModel @Inject constructor(
    @ApplicationContext private val context: Context,
    private val chatRepository: ChatRepository
) : ViewModel() {
    
    private val _state = MutableStateFlow(VoiceChatState())
    val state: StateFlow<VoiceChatState> = _state.asStateFlow()
    
    // Media components
    private var mediaPlayer: MediaPlayer? = null
    private var mediaRecorder: MediaRecorder? = null
    private var recordingFile: File? = null
    private var speechRecognizer: SpeechRecognizer? = null
    private var callTimerJob: Job? = null
    
    init {
        loadAvailableVoices()
        setupSpeechRecognizer()
    }
    
    /**
     * Load available voices from backend
     */
    private fun loadAvailableVoices() {
        viewModelScope.launch {
            _state.update { it.copy(isLoadingVoices = true) }
            
            try {
                val result = chatRepository.getTTSVoices()
                when (result) {
                    is com.baatcheet.app.data.repository.ApiResult.Success -> {
                        val aiVoices = result.data.map { voice ->
                            AIVoice(
                                id = voice.id,
                                name = voice.name,
                                description = voice.description ?: "AI voice assistant",
                                previewUrl = voice.previewUrl,
                                color = getVoiceColor(voice.id),
                                icon = getVoiceIcon(voice.id)
                            )
                        }.ifEmpty { getDefaultVoices() }
                        
                        _state.update { 
                            it.copy(
                                availableVoices = aiVoices,
                                isLoadingVoices = false,
                                selectedVoice = aiVoices.firstOrNull()
                            )
                        }
                    }
                    is com.baatcheet.app.data.repository.ApiResult.Error -> {
                        // Use default voices if API fails
                        _state.update { 
                            it.copy(
                                availableVoices = getDefaultVoices(),
                                isLoadingVoices = false,
                                selectedVoice = getDefaultVoices().firstOrNull()
                            )
                        }
                    }
                    is com.baatcheet.app.data.repository.ApiResult.Loading -> {}
                }
            } catch (e: Exception) {
                _state.update { 
                    it.copy(
                        availableVoices = getDefaultVoices(),
                        isLoadingVoices = false,
                        selectedVoice = getDefaultVoices().firstOrNull()
                    )
                }
            }
        }
    }
    
    private fun getDefaultVoices(): List<AIVoice> = listOf(
        AIVoice(
            id = "alloy",
            name = "Alloy",
            description = "Versatile and balanced",
            color = VoiceAccent,
            icon = "🎙️"
        ),
        AIVoice(
            id = "echo",
            name = "Echo",
            description = "Warm and conversational",
            color = VoiceBlue,
            icon = "🔊"
        ),
        AIVoice(
            id = "fable",
            name = "Fable",
            description = "Expressive and dynamic",
            color = VoicePurple,
            icon = "📖"
        ),
        AIVoice(
            id = "onyx",
            name = "Onyx",
            description = "Deep and authoritative",
            color = VoiceOrange,
            icon = "💎"
        ),
        AIVoice(
            id = "nova",
            name = "Nova",
            description = "Friendly and upbeat",
            color = VoicePink,
            icon = "✨"
        ),
        AIVoice(
            id = "shimmer",
            name = "Shimmer",
            description = "Clear and professional",
            color = Color(0xFF00C7BE),
            icon = "💫"
        )
    )
    
    private fun getVoiceColor(voiceId: String): Color = when (voiceId.lowercase()) {
        "alloy" -> VoiceAccent
        "echo" -> VoiceBlue
        "fable" -> VoicePurple
        "onyx" -> VoiceOrange
        "nova" -> VoicePink
        "shimmer" -> Color(0xFF00C7BE)
        else -> VoiceAccent
    }
    
    private fun getVoiceIcon(voiceId: String): String = when (voiceId.lowercase()) {
        "alloy" -> "🎙️"
        "echo" -> "🔊"
        "fable" -> "📖"
        "onyx" -> "💎"
        "nova" -> "✨"
        "shimmer" -> "💫"
        else -> "🎙️"
    }
    
    /**
     * Setup speech recognizer
     */
    private fun setupSpeechRecognizer() {
        if (SpeechRecognizer.isRecognitionAvailable(context)) {
            speechRecognizer = SpeechRecognizer.createSpeechRecognizer(context).apply {
                setRecognitionListener(object : RecognitionListener {
                    override fun onReadyForSpeech(params: Bundle?) {
                        _state.update { it.copy(isRecording = true) }
                    }
                    
                    override fun onBeginningOfSpeech() {}
                    
                    override fun onRmsChanged(rmsdB: Float) {
                        val normalized = ((rmsdB + 2) / 12).coerceIn(0f, 1f)
                        _state.update { it.copy(audioLevel = normalized) }
                    }
                    
                    override fun onBufferReceived(buffer: ByteArray?) {}
                    
                    override fun onEndOfSpeech() {
                        _state.update { it.copy(isRecording = false, audioLevel = 0f) }
                    }
                    
                    override fun onError(error: Int) {
                        _state.update { 
                            it.copy(
                                isRecording = false,
                                audioLevel = 0f,
                                error = "Speech recognition error: $error"
                            )
                        }
                    }
                    
                    override fun onResults(results: Bundle?) {
                        val matches = results?.getStringArrayList(SpeechRecognizer.RESULTS_RECOGNITION)
                        val text = matches?.firstOrNull() ?: ""
                        
                        if (text.isNotEmpty()) {
                            _state.update { it.copy(currentTranscript = text) }
                            sendVoiceMessage(text)
                        }
                    }
                    
                    override fun onPartialResults(partialResults: Bundle?) {
                        val matches = partialResults?.getStringArrayList(SpeechRecognizer.RESULTS_RECOGNITION)
                        val text = matches?.firstOrNull() ?: ""
                        _state.update { it.copy(currentTranscript = text) }
                    }
                    
                    override fun onEvent(eventType: Int, params: Bundle?) {}
                })
            }
        }
    }
    
    // Navigation
    fun moveToIntro() {
        _state.update { it.copy(currentStep = VoiceModeStep.INTRO) }
    }
    
    fun moveToVoiceSelection() {
        _state.update { it.copy(currentStep = VoiceModeStep.VOICE_SELECT) }
    }
    
    fun selectVoice(voice: AIVoice) {
        _state.update { it.copy(selectedVoice = voice) }
    }
    
    /**
     * Play voice preview
     */
    fun playVoicePreview(voice: AIVoice) {
        viewModelScope.launch {
            if (_state.value.playingVoiceId == voice.id) {
                // Stop playing
                mediaPlayer?.stop()
                mediaPlayer?.release()
                mediaPlayer = null
                _state.update { it.copy(isPlayingPreview = false, playingVoiceId = null) }
                return@launch
            }
            
            _state.update { it.copy(isPlayingPreview = true, playingVoiceId = voice.id) }
            
            try {
                // Generate sample speech
                val sampleText = "Hello! I'm ${voice.name}. How can I help you today?"
                val result = chatRepository.generateSpeech(sampleText, voice.id)
                
                when (result) {
                    is com.baatcheet.app.data.repository.ApiResult.Success -> {
                        playAudio(result.data)
                    }
                    is com.baatcheet.app.data.repository.ApiResult.Error -> {
                        _state.update { 
                            it.copy(
                                isPlayingPreview = false,
                                playingVoiceId = null,
                                error = "Failed to play preview"
                            )
                        }
                    }
                    is com.baatcheet.app.data.repository.ApiResult.Loading -> {}
                }
            } catch (e: Exception) {
                _state.update { 
                    it.copy(
                        isPlayingPreview = false,
                        playingVoiceId = null,
                        error = e.message
                    )
                }
            }
        }
    }
    
    /**
     * Start voice call
     */
    fun startVoiceCall() {
        _state.update { 
            it.copy(
                currentStep = VoiceModeStep.ACTIVE_CALL,
                callDuration = 0L,
                currentTranscript = "",
                aiResponse = ""
            )
        }
        
        // Start call timer
        callTimerJob = viewModelScope.launch {
            while (true) {
                delay(1000)
                _state.update { it.copy(callDuration = it.callDuration + 1) }
            }
        }
    }
    
    /**
     * Start recording user's voice
     */
    fun startRecording() {
        val intent = Intent(RecognizerIntent.ACTION_RECOGNIZE_SPEECH).apply {
            putExtra(RecognizerIntent.EXTRA_LANGUAGE_MODEL, RecognizerIntent.LANGUAGE_MODEL_FREE_FORM)
            putExtra(RecognizerIntent.EXTRA_LANGUAGE, Locale.getDefault())
            putExtra(RecognizerIntent.EXTRA_PARTIAL_RESULTS, true)
            putExtra(RecognizerIntent.EXTRA_MAX_RESULTS, 1)
        }
        
        speechRecognizer?.startListening(intent)
        _state.update { it.copy(isRecording = true, currentTranscript = "") }
    }
    
    /**
     * Stop recording and send to AI
     */
    fun stopRecordingAndSend() {
        speechRecognizer?.stopListening()
        _state.update { it.copy(isRecording = false, audioLevel = 0f) }
        
        // If we have a transcript, the onResults callback will handle sending
    }
    
    /**
     * Send voice message to AI and get response
     */
    private fun sendVoiceMessage(text: String) {
        viewModelScope.launch {
            _state.update { it.copy(isProcessing = true) }
            
            try {
                // Send message to chat API
                val result = chatRepository.sendMessage(
                    message = text,
                    conversationId = _state.value.conversationId
                )
                
                when (result) {
                    is com.baatcheet.app.data.repository.ApiResult.Success -> {
                        val aiText = result.data.content
                        _state.update { 
                            it.copy(
                                aiResponse = aiText,
                                conversationId = result.data.conversationId,
                                isProcessing = false
                            )
                        }
                        
                        // Convert response to speech and play
                        speakResponse(aiText)
                    }
                    is com.baatcheet.app.data.repository.ApiResult.Error -> {
                        _state.update { 
                            it.copy(
                                isProcessing = false,
                                error = result.message
                            )
                        }
                    }
                    is com.baatcheet.app.data.repository.ApiResult.Loading -> {
                        // Loading state already set
                    }
                }
            } catch (e: Exception) {
                _state.update { 
                    it.copy(
                        isProcessing = false,
                        error = e.message
                    )
                }
            }
        }
    }
    
    /**
     * Convert AI response to speech and play
     */
    private fun speakResponse(text: String) {
        viewModelScope.launch {
            _state.update { it.copy(isAISpeaking = true) }
            
            try {
                val voice = _state.value.selectedVoice?.id ?: "alloy"
                val result = chatRepository.generateSpeech(text, voice)
                
                when (result) {
                    is com.baatcheet.app.data.repository.ApiResult.Success -> {
                        playAudio(result.data) {
                            _state.update { it.copy(isAISpeaking = false) }
                        }
                    }
                    is com.baatcheet.app.data.repository.ApiResult.Error -> {
                        _state.update { it.copy(isAISpeaking = false) }
                    }
                    is com.baatcheet.app.data.repository.ApiResult.Loading -> {}
                }
            } catch (e: Exception) {
                _state.update { it.copy(isAISpeaking = false) }
            }
        }
    }
    
    /**
     * Play audio data
     */
    private fun playAudio(audioData: ByteArray, onComplete: (() -> Unit)? = null) {
        try {
            mediaPlayer?.release()
            
            // Save to temp file
            val tempFile = File(context.cacheDir, "tts_${System.currentTimeMillis()}.mp3")
            tempFile.writeBytes(audioData)
            
            mediaPlayer = MediaPlayer().apply {
                setDataSource(tempFile.absolutePath)
                setOnCompletionListener {
                    _state.update { it.copy(isPlayingPreview = false, playingVoiceId = null) }
                    tempFile.delete()
                    onComplete?.invoke()
                }
                setOnErrorListener { _, _, _ ->
                    _state.update { it.copy(isPlayingPreview = false, playingVoiceId = null) }
                    false
                }
                prepare()
                start()
            }
        } catch (e: Exception) {
            _state.update { 
                it.copy(
                    isPlayingPreview = false,
                    playingVoiceId = null,
                    error = e.message
                )
            }
        }
    }
    
    fun toggleMute() {
        _state.update { it.copy(isMuted = !it.isMuted) }
    }
    
    /**
     * End the voice call
     */
    fun endCall() {
        callTimerJob?.cancel()
        mediaPlayer?.release()
        mediaPlayer = null
        speechRecognizer?.stopListening()
        
        _state.update { 
            it.copy(
                currentStep = VoiceModeStep.INTRO,
                isRecording = false,
                isProcessing = false,
                isAISpeaking = false
            )
        }
    }
    
    override fun onCleared() {
        super.onCleared()
        mediaPlayer?.release()
        mediaRecorder?.release()
        speechRecognizer?.destroy()
        callTimerJob?.cancel()
    }
}
