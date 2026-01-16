package com.baatcheet.app.ui.voice

import android.content.Context
import android.media.MediaPlayer
import android.media.MediaRecorder
import android.os.Build
import android.speech.RecognitionListener
import android.speech.RecognizerIntent
import android.speech.SpeechRecognizer
import android.speech.tts.TextToSpeech
import android.speech.tts.UtteranceProgressListener
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
    
    // Android native TTS as fallback (free, offline)
    private var nativeTTS: TextToSpeech? = null
    private var nativeTTSReady = false
    
    init {
        loadAvailableVoices()
        setupSpeechRecognizer()
        setupNativeTTS()
    }
    
    /**
     * Setup Android's native TextToSpeech as fallback
     * This is FREE and works OFFLINE - no API costs!
     */
    private fun setupNativeTTS() {
        nativeTTS = TextToSpeech(context) { status ->
            nativeTTSReady = status == TextToSpeech.SUCCESS
            if (nativeTTSReady) {
                nativeTTS?.language = Locale.US
                nativeTTS?.setSpeechRate(1.0f)
                nativeTTS?.setPitch(1.0f)
                
                // Set up utterance listener
                nativeTTS?.setOnUtteranceProgressListener(object : UtteranceProgressListener() {
                    override fun onStart(utteranceId: String?) {
                        _state.update { it.copy(isAISpeaking = true) }
                    }
                    
                    override fun onDone(utteranceId: String?) {
                        _state.update { it.copy(isAISpeaking = false) }
                    }
                    
                    @Deprecated("Deprecated in Java")
                    override fun onError(utteranceId: String?) {
                        _state.update { it.copy(isAISpeaking = false) }
                    }
                })
            }
        }
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
    
    /**
     * Default voices - Microsoft Edge TTS (FREE!) + ElevenLabs
     * Edge TTS has excellent Urdu voices with natural pronunciation
     */
    private fun getDefaultVoices(): List<AIVoice> = listOf(
        // ============================================
        // 🥇 EDGE TTS - URDU VOICES (FREE, Best Quality!)
        // ============================================
        AIVoice(
            id = "ur-PK-AsadNeural",
            name = "Asad (اردو)",
            description = "Pakistani Urdu • Clear & natural male voice",
            color = VoiceAccent,
            icon = "🇵🇰"
        ),
        AIVoice(
            id = "ur-PK-UzmaNeural",
            name = "Uzma (اردو)",
            description = "Pakistani Urdu • Warm feminine voice",
            color = VoicePink,
            icon = "🇵🇰"
        ),
        AIVoice(
            id = "ur-IN-SalmanNeural",
            name = "Salman (اردو)",
            description = "Indian Urdu • Natural male voice",
            color = VoicePurple,
            icon = "🇮🇳"
        ),
        AIVoice(
            id = "ur-IN-GulNeural",
            name = "Gul (اردو)",
            description = "Indian Urdu • Soft feminine voice",
            color = Color(0xFFEC4899),
            icon = "🇮🇳"
        ),
        
        // ============================================
        // 🥇 EDGE TTS - HINDI VOICES (Great for Roman Urdu)
        // ============================================
        AIVoice(
            id = "hi-IN-MadhurNeural",
            name = "Madhur (हिंदी)",
            description = "Hindi • Perfect for Roman Urdu text",
            color = VoiceOrange,
            icon = "🇮🇳"
        ),
        AIVoice(
            id = "hi-IN-SwaraNeural",
            name = "Swara (हिंदी)",
            description = "Hindi • Natural feminine voice",
            color = Color(0xFF00C7BE),
            icon = "🇮🇳"
        ),
        
        // ============================================
        // 🥇 EDGE TTS - ENGLISH VOICES
        // ============================================
        AIVoice(
            id = "en-US-GuyNeural",
            name = "Guy",
            description = "American English • Clear male voice",
            color = VoiceBlue,
            icon = "🇺🇸"
        ),
        AIVoice(
            id = "en-US-JennyNeural",
            name = "Jenny",
            description = "American English • Friendly female voice",
            color = Color(0xFF6366F1),
            icon = "🇺🇸"
        ),
        AIVoice(
            id = "en-GB-SoniaNeural",
            name = "Sonia",
            description = "British English • Professional female voice",
            color = VoicePurple,
            icon = "🇬🇧"
        ),
        AIVoice(
            id = "en-GB-RyanNeural",
            name = "Ryan",
            description = "British English • Natural male voice",
            color = VoiceOrange,
            icon = "🇬🇧"
        )
    )
    
    /**
     * Get voice color based on voice ID
     * Supports Edge TTS, ElevenLabs IDs and legacy OpenAI voice names
     */
    private fun getVoiceColor(voiceId: String): Color = when (voiceId) {
        // ============================================
        // Edge TTS Voice IDs (PRIMARY - FREE!)
        // ============================================
        // Urdu voices
        "ur-PK-AsadNeural" -> VoiceAccent           // Pakistani Urdu Male
        "ur-PK-UzmaNeural" -> VoicePink             // Pakistani Urdu Female
        "ur-IN-SalmanNeural" -> VoicePurple         // Indian Urdu Male
        "ur-IN-GulNeural" -> Color(0xFFEC4899)      // Indian Urdu Female
        // Hindi voices
        "hi-IN-MadhurNeural" -> VoiceOrange         // Hindi Male
        "hi-IN-SwaraNeural" -> Color(0xFF00C7BE)    // Hindi Female
        // English voices
        "en-US-GuyNeural" -> VoiceBlue              // American Male
        "en-US-JennyNeural" -> Color(0xFF6366F1)    // American Female
        "en-GB-SoniaNeural" -> VoicePurple          // British Female
        "en-GB-RyanNeural" -> VoiceOrange           // British Male
        
        // ============================================
        // ElevenLabs Voice IDs (Backup)
        // ============================================
        "pqHfZKP75CvOlQylNhV4" -> VoiceAccent        // Bilal - Urdu
        "XB0fDUnXU5powFXDhCwa" -> VoicePink          // Arooj - Roman Urdu
        "piTKgcLEGmPE4e6mEKli" -> VoicePurple        // Nadia - Hindi/Urdu
        "EXAVITQu4vr4xnSDxMaL" -> VoiceBlue          // Sarah
        "21m00Tcm4TlvDq8ikWAM" -> Color(0xFF00C7BE)  // Rachel
        "TxGEqnHWrfWFTfGW9XjX" -> VoiceOrange        // Josh
        
        // ============================================
        // Legacy OpenAI Voice Names (Fallback)
        // ============================================
        "alloy" -> VoiceAccent
        "echo" -> VoiceBlue
        "fable" -> VoicePurple
        "onyx" -> VoiceOrange
        "nova" -> VoicePink
        "shimmer" -> Color(0xFF00C7BE)
        
        else -> VoiceAccent
    }
    
    /**
     * Get voice icon based on voice ID
     * Supports Edge TTS, ElevenLabs IDs and legacy OpenAI voice names
     */
    private fun getVoiceIcon(voiceId: String): String = when (voiceId) {
        // ============================================
        // Edge TTS Voice IDs (PRIMARY - FREE!)
        // ============================================
        // Urdu voices
        "ur-PK-AsadNeural" -> "🇵🇰"      // Pakistani Urdu Male
        "ur-PK-UzmaNeural" -> "🇵🇰"      // Pakistani Urdu Female
        "ur-IN-SalmanNeural" -> "🇮🇳"    // Indian Urdu Male
        "ur-IN-GulNeural" -> "🇮🇳"       // Indian Urdu Female
        // Hindi voices
        "hi-IN-MadhurNeural" -> "🇮🇳"    // Hindi Male
        "hi-IN-SwaraNeural" -> "🇮🇳"     // Hindi Female
        // English voices
        "en-US-GuyNeural" -> "🇺🇸"       // American Male
        "en-US-JennyNeural" -> "🇺🇸"     // American Female
        "en-GB-SoniaNeural" -> "🇬🇧"     // British Female
        "en-GB-RyanNeural" -> "🇬🇧"      // British Male
        
        // ============================================
        // ElevenLabs Voice IDs (Backup)
        // ============================================
        "pqHfZKP75CvOlQylNhV4" -> "🇵🇰"  // Bilal - Urdu flag
        "XB0fDUnXU5powFXDhCwa" -> "💬"    // Arooj - Speech bubble
        "piTKgcLEGmPE4e6mEKli" -> "🌸"    // Nadia - Flower
        "EXAVITQu4vr4xnSDxMaL" -> "🎙️"    // Sarah
        "21m00Tcm4TlvDq8ikWAM" -> "✨"     // Rachel
        "TxGEqnHWrfWFTfGW9XjX" -> "🔊"    // Josh
        
        // ============================================
        // Legacy OpenAI Voice Names (Fallback)
        // ============================================
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
    
    // Cache for voice previews to avoid regenerating TTS
    private val voicePreviewCache = mutableMapOf<String, ByteArray>()
    
    /**
     * Play voice preview - Uses cached audio when available to save API calls
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
                // Check cache first to avoid unnecessary API calls
                val cachedAudio = voicePreviewCache[voice.id]
                if (cachedAudio != null) {
                    playAudio(cachedAudio)
                    return@launch
                }
                
                // Generate sample speech - keep it SHORT to minimize tokens/costs
                val sampleText = "Hi, I'm ${voice.name}!"
                val result = chatRepository.generateSpeech(sampleText, voice.id)
                
                when (result) {
                    is com.baatcheet.app.data.repository.ApiResult.Success -> {
                        // Cache the audio for future plays
                        voicePreviewCache[voice.id] = result.data
                        playAudio(result.data)
                    }
                    is com.baatcheet.app.data.repository.ApiResult.Error -> {
                        // Fallback to native TTS preview (FREE!)
                        previewVoiceNative(voice)
                    }
                    is com.baatcheet.app.data.repository.ApiResult.Loading -> {}
                }
            } catch (e: Exception) {
                // Fallback to native TTS preview
                previewVoiceNative(voice)
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
     * Uses optimized settings for voice chat:
     * - Shorter max tokens (voice responses should be concise)
     * - Voice-specific system prompt
     */
    private fun sendVoiceMessage(text: String) {
        viewModelScope.launch {
            _state.update { it.copy(isProcessing = true) }
            
            try {
                // Send message with voice-optimized settings
                // Voice responses should be SHORT and CONVERSATIONAL to:
                // 1. Reduce token usage
                // 2. Make TTS faster
                // 3. Feel more natural in conversation
                val result = chatRepository.sendVoiceMessage(
                    message = text,
                    conversationId = _state.value.conversationId,
                    maxTokens = 150 // Limit response to ~100-150 words for natural conversation
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
     * Uses backend TTS if available, falls back to native Android TTS (FREE)
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
                        // Fallback to native Android TTS (FREE, no API costs!)
                        speakWithNativeTTS(text)
                    }
                    is com.baatcheet.app.data.repository.ApiResult.Loading -> {}
                }
            } catch (e: Exception) {
                // Fallback to native Android TTS
                speakWithNativeTTS(text)
            }
        }
    }
    
    /**
     * Speak using Android's native TTS (FREE fallback)
     * Maps selected voice to native TTS pitch/speed settings
     */
    private fun speakWithNativeTTS(text: String) {
        if (!nativeTTSReady || nativeTTS == null) {
            _state.update { it.copy(isAISpeaking = false, error = "TTS not available") }
            return
        }
        
        // Map voice selection to pitch/speed for variety
        val selectedVoice = _state.value.selectedVoice
        when (selectedVoice?.id) {
            "21m00Tcm4TlvDq8ikWAM" -> { // Rachel - female
                nativeTTS?.setPitch(1.1f)
                nativeTTS?.setSpeechRate(1.0f)
            }
            "TxGEqnHWrfWFTfGW9XjX" -> { // Josh - male
                nativeTTS?.setPitch(0.9f)
                nativeTTS?.setSpeechRate(1.0f)
            }
            "VR6AewLTigWG4xSOukaG" -> { // Arnold - deep male
                nativeTTS?.setPitch(0.7f)
                nativeTTS?.setSpeechRate(0.9f)
            }
            "pNInz6obpgDQGcFmaJgB" -> { // Adam - male
                nativeTTS?.setPitch(0.85f)
                nativeTTS?.setSpeechRate(1.0f)
            }
            "yoZ06aMxZJJ28mfd3POQ" -> { // Sam - male
                nativeTTS?.setPitch(0.95f)
                nativeTTS?.setSpeechRate(1.1f)
            }
            "MF3mGyEYCl7XYWbV9V6O" -> { // Elli - female
                nativeTTS?.setPitch(1.2f)
                nativeTTS?.setSpeechRate(1.0f)
            }
            else -> {
                nativeTTS?.setPitch(1.0f)
                nativeTTS?.setSpeechRate(1.0f)
            }
        }
        
        // Speak the text
        val utteranceId = "voice_response_${System.currentTimeMillis()}"
        nativeTTS?.speak(text, TextToSpeech.QUEUE_FLUSH, null, utteranceId)
    }
    
    /**
     * Play audio data
     * FIXED: Now properly resets isAISpeaking on completion and errors
     */
    private fun playAudio(audioData: ByteArray, onComplete: (() -> Unit)? = null) {
        try {
            // Release any previous player
            mediaPlayer?.release()
            mediaPlayer = null
            
            // Save to temp file
            val tempFile = File(context.cacheDir, "tts_${System.currentTimeMillis()}.mp3")
            tempFile.writeBytes(audioData)
            
            mediaPlayer = MediaPlayer().apply {
                setDataSource(tempFile.absolutePath)
                
                // CRITICAL: Handle completion to reset speaking state
                setOnCompletionListener { mp ->
                    _state.update { 
                        it.copy(
                            isPlayingPreview = false, 
                            playingVoiceId = null,
                            isAISpeaking = false  // FIXED: Reset speaking state
                        )
                    }
                    tempFile.delete()
                    mp.release()
                    mediaPlayer = null
                    onComplete?.invoke()
                }
                
                // CRITICAL: Handle errors to reset speaking state
                setOnErrorListener { mp, what, extra ->
                    _state.update { 
                        it.copy(
                            isPlayingPreview = false, 
                            playingVoiceId = null,
                            isAISpeaking = false  // FIXED: Reset speaking state on error
                        )
                    }
                    tempFile.delete()
                    mp.release()
                    mediaPlayer = null
                    onComplete?.invoke()
                    true  // Return true to indicate we handled the error
                }
                
                prepare()
                start()
            }
        } catch (e: Exception) {
            // FIXED: Always reset speaking state on exception
            _state.update { 
                it.copy(
                    isPlayingPreview = false,
                    playingVoiceId = null,
                    isAISpeaking = false,  // FIXED: Reset speaking state
                    error = e.message
                )
            }
            mediaPlayer?.release()
            mediaPlayer = null
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
        nativeTTS?.stop()
        nativeTTS?.shutdown()
        callTimerJob?.cancel()
    }
    
    /**
     * Preview voice using native TTS (for when backend TTS is unavailable)
     */
    fun previewVoiceNative(voice: AIVoice) {
        if (!nativeTTSReady || nativeTTS == null) return
        
        // Stop any current preview
        nativeTTS?.stop()
        _state.update { it.copy(isPlayingPreview = true, playingVoiceId = voice.id) }
        
        // Map voice to pitch for variety
        when (voice.id) {
            "21m00Tcm4TlvDq8ikWAM" -> nativeTTS?.setPitch(1.1f) // Rachel
            "TxGEqnHWrfWFTfGW9XjX" -> nativeTTS?.setPitch(0.9f) // Josh
            "VR6AewLTigWG4xSOukaG" -> nativeTTS?.setPitch(0.7f) // Arnold
            "pNInz6obpgDQGcFmaJgB" -> nativeTTS?.setPitch(0.85f) // Adam
            "yoZ06aMxZJJ28mfd3POQ" -> nativeTTS?.setPitch(0.95f) // Sam
            "MF3mGyEYCl7XYWbV9V6O" -> nativeTTS?.setPitch(1.2f) // Elli
            else -> nativeTTS?.setPitch(1.0f)
        }
        
        val previewText = "Hi! I'm ${voice.name}. Nice to meet you!"
        val utteranceId = "preview_${voice.id}"
        
        nativeTTS?.setOnUtteranceProgressListener(object : UtteranceProgressListener() {
            override fun onStart(id: String?) {}
            override fun onDone(id: String?) {
                _state.update { it.copy(isPlayingPreview = false, playingVoiceId = null) }
            }
            @Deprecated("Deprecated in Java")
            override fun onError(id: String?) {
                _state.update { it.copy(isPlayingPreview = false, playingVoiceId = null) }
            }
        })
        
        nativeTTS?.speak(previewText, TextToSpeech.QUEUE_FLUSH, null, utteranceId)
    }
    
    /**
     * Stop voice preview
     */
    fun stopPreview() {
        nativeTTS?.stop()
        mediaPlayer?.stop()
        _state.update { it.copy(isPlayingPreview = false, playingVoiceId = null) }
    }
}
