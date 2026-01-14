package com.baatcheet.app.ui.chat

import android.Manifest
import android.content.Context
import android.content.Intent
import android.media.AudioAttributes
import android.media.AudioFormat
import android.media.AudioRecord
import android.media.AudioTrack
import android.media.MediaPlayer
import android.media.MediaRecorder
import android.os.Build
import android.os.Bundle
import android.speech.RecognitionListener
import android.speech.RecognizerIntent
import android.speech.SpeechRecognizer
import android.util.Base64
import android.util.Log
import android.widget.Toast
import androidx.activity.compose.rememberLauncherForActivityResult
import androidx.activity.result.contract.ActivityResultContracts
import androidx.compose.runtime.*
import androidx.compose.ui.platform.LocalContext
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.delay
import kotlinx.coroutines.withContext
import java.io.File
import java.io.FileOutputStream
import java.util.Locale

/**
 * Voice Service State
 */
data class VoiceState(
    val isRecording: Boolean = false,
    val isPlaying: Boolean = false,
    val isListening: Boolean = false,
    val transcribedText: String = "",
    val error: String? = null,
    val audioLevel: Float = 0f
)

/**
 * Voice Actions
 */
data class VoiceActions(
    val startListening: () -> Unit,
    val stopListening: () -> Unit,
    val startRecording: () -> Unit,
    val stopRecording: suspend () -> ByteArray?,
    val playAudio: (ByteArray) -> Unit,
    val stopAudio: () -> Unit,
    val requestPermission: () -> Unit
)

/**
 * Voice Service Hook
 * Provides speech-to-text and text-to-speech functionality
 */
@Composable
fun rememberVoiceService(
    onTranscription: (String) -> Unit,
    onError: (String) -> Unit
): Pair<VoiceState, VoiceActions> {
    val context = LocalContext.current
    var state by remember { mutableStateOf(VoiceState()) }
    
    // Permission state
    var hasPermission by remember { mutableStateOf(false) }
    
    // Speech recognizer
    val speechRecognizer = remember {
        if (SpeechRecognizer.isRecognitionAvailable(context)) {
            SpeechRecognizer.createSpeechRecognizer(context)
        } else {
            null
        }
    }
    
    // Media player for TTS
    var mediaPlayer by remember { mutableStateOf<MediaPlayer?>(null) }
    
    // Audio recorder for custom recording
    var audioRecorder by remember { mutableStateOf<MediaRecorder?>(null) }
    var recordingFile by remember { mutableStateOf<File?>(null) }
    
    // Permission launcher
    val permissionLauncher = rememberLauncherForActivityResult(
        contract = ActivityResultContracts.RequestPermission()
    ) { isGranted ->
        hasPermission = isGranted
        if (!isGranted) {
            onError("Microphone permission is required for voice features")
        }
    }
    
    // Set up speech recognition listener
    LaunchedEffect(speechRecognizer) {
        speechRecognizer?.setRecognitionListener(object : RecognitionListener {
            override fun onReadyForSpeech(params: Bundle?) {
                state = state.copy(isListening = true, error = null)
            }
            
            override fun onBeginningOfSpeech() {
                state = state.copy(isListening = true)
            }
            
            override fun onRmsChanged(rmsdB: Float) {
                // Normalize audio level (0-1)
                val normalized = ((rmsdB + 2) / 12).coerceIn(0f, 1f)
                state = state.copy(audioLevel = normalized)
            }
            
            override fun onBufferReceived(buffer: ByteArray?) {}
            
            override fun onEndOfSpeech() {
                state = state.copy(isListening = false, audioLevel = 0f)
            }
            
            override fun onError(error: Int) {
                val errorMessage = when (error) {
                    SpeechRecognizer.ERROR_AUDIO -> "Audio recording error"
                    SpeechRecognizer.ERROR_CLIENT -> "Client error"
                    SpeechRecognizer.ERROR_INSUFFICIENT_PERMISSIONS -> "Permission denied"
                    SpeechRecognizer.ERROR_NETWORK -> "Network error"
                    SpeechRecognizer.ERROR_NETWORK_TIMEOUT -> "Network timeout"
                    SpeechRecognizer.ERROR_NO_MATCH -> "No speech detected"
                    SpeechRecognizer.ERROR_RECOGNIZER_BUSY -> "Recognizer busy"
                    SpeechRecognizer.ERROR_SERVER -> "Server error"
                    SpeechRecognizer.ERROR_SPEECH_TIMEOUT -> "No speech input"
                    else -> "Unknown error"
                }
                state = state.copy(isListening = false, error = errorMessage, audioLevel = 0f)
                if (error != SpeechRecognizer.ERROR_NO_MATCH && error != SpeechRecognizer.ERROR_SPEECH_TIMEOUT) {
                    onError(errorMessage)
                }
            }
            
            override fun onResults(results: Bundle?) {
                val matches = results?.getStringArrayList(SpeechRecognizer.RESULTS_RECOGNITION)
                val text = matches?.firstOrNull() ?: ""
                state = state.copy(
                    isListening = false,
                    transcribedText = text,
                    audioLevel = 0f
                )
                if (text.isNotEmpty()) {
                    onTranscription(text)
                }
            }
            
            override fun onPartialResults(partialResults: Bundle?) {
                val matches = partialResults?.getStringArrayList(SpeechRecognizer.RESULTS_RECOGNITION)
                val text = matches?.firstOrNull() ?: ""
                state = state.copy(transcribedText = text)
            }
            
            override fun onEvent(eventType: Int, params: Bundle?) {}
        })
    }
    
    // Clean up on dispose
    DisposableEffect(Unit) {
        onDispose {
            speechRecognizer?.destroy()
            mediaPlayer?.release()
            audioRecorder?.release()
        }
    }
    
    val actions = remember {
        VoiceActions(
            startListening = {
                if (!hasPermission) {
                    permissionLauncher.launch(Manifest.permission.RECORD_AUDIO)
                    return@VoiceActions
                }
                
                speechRecognizer?.let { recognizer ->
                    val intent = Intent(RecognizerIntent.ACTION_RECOGNIZE_SPEECH).apply {
                        putExtra(RecognizerIntent.EXTRA_LANGUAGE_MODEL, RecognizerIntent.LANGUAGE_MODEL_FREE_FORM)
                        putExtra(RecognizerIntent.EXTRA_LANGUAGE, Locale.getDefault())
                        putExtra(RecognizerIntent.EXTRA_PARTIAL_RESULTS, true)
                        putExtra(RecognizerIntent.EXTRA_MAX_RESULTS, 1)
                    }
                    recognizer.startListening(intent)
                    state = state.copy(isListening = true, transcribedText = "", error = null)
                } ?: run {
                    onError("Speech recognition not available")
                }
            },
            
            stopListening = {
                speechRecognizer?.stopListening()
                state = state.copy(isListening = false, audioLevel = 0f)
            },
            
            startRecording = {
                if (!hasPermission) {
                    permissionLauncher.launch(Manifest.permission.RECORD_AUDIO)
                    return@VoiceActions
                }
                
                try {
                    val file = File(context.cacheDir, "voice_${System.currentTimeMillis()}.m4a")
                    recordingFile = file
                    
                    audioRecorder = if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.S) {
                        MediaRecorder(context)
                    } else {
                        @Suppress("DEPRECATION")
                        MediaRecorder()
                    }.apply {
                        setAudioSource(MediaRecorder.AudioSource.MIC)
                        setOutputFormat(MediaRecorder.OutputFormat.MPEG_4)
                        setAudioEncoder(MediaRecorder.AudioEncoder.AAC)
                        setAudioSamplingRate(44100)
                        setAudioEncodingBitRate(128000)
                        setOutputFile(file.absolutePath)
                        prepare()
                        start()
                    }
                    state = state.copy(isRecording = true, error = null)
                } catch (e: Exception) {
                    onError("Failed to start recording: ${e.message}")
                }
            },
            
            stopRecording = suspend {
                withContext(Dispatchers.IO) {
                    try {
                        audioRecorder?.apply {
                            stop()
                            release()
                        }
                        audioRecorder = null
                        state = state.copy(isRecording = false)
                        
                        recordingFile?.let { file ->
                            if (file.exists()) {
                                file.readBytes()
                            } else null
                        }
                    } catch (e: Exception) {
                        state = state.copy(isRecording = false)
                        null
                    }
                }
            },
            
            playAudio = { audioData ->
                try {
                    mediaPlayer?.release()
                    
                    // Save to temp file
                    val tempFile = File(context.cacheDir, "tts_${System.currentTimeMillis()}.mp3")
                    FileOutputStream(tempFile).use { it.write(audioData) }
                    
                    mediaPlayer = MediaPlayer().apply {
                        setDataSource(tempFile.absolutePath)
                        setAudioAttributes(
                            AudioAttributes.Builder()
                                .setContentType(AudioAttributes.CONTENT_TYPE_SPEECH)
                                .setUsage(AudioAttributes.USAGE_MEDIA)
                                .build()
                        )
                        setOnCompletionListener {
                            state = state.copy(isPlaying = false)
                            tempFile.delete()
                        }
                        setOnErrorListener { _, _, _ ->
                            state = state.copy(isPlaying = false)
                            false
                        }
                        prepare()
                        start()
                    }
                    state = state.copy(isPlaying = true)
                } catch (e: Exception) {
                    onError("Failed to play audio: ${e.message}")
                }
            },
            
            stopAudio = {
                mediaPlayer?.apply {
                    if (isPlaying) {
                        stop()
                    }
                    release()
                }
                mediaPlayer = null
                state = state.copy(isPlaying = false)
            },
            
            requestPermission = {
                permissionLauncher.launch(Manifest.permission.RECORD_AUDIO)
            }
        )
    }
    
    return Pair(state, actions)
}
