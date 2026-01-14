package com.baatcheet.app.ui.imagegen

import androidx.lifecycle.ViewModel
import androidx.lifecycle.viewModelScope
import com.baatcheet.app.data.repository.*
import dagger.hilt.android.lifecycle.HiltViewModel
import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.flow.StateFlow
import kotlinx.coroutines.flow.asStateFlow
import kotlinx.coroutines.flow.update
import kotlinx.coroutines.launch
import javax.inject.Inject

data class ImageGenUiState(
    val status: ImageGenStatus? = null,
    val styles: List<ImageStyle> = emptyList(),
    val generatedImage: GeneratedImage? = null,
    val history: List<GeneratedImage> = emptyList(),
    val isGenerating: Boolean = false,
    val isLoading: Boolean = false,
    val error: String? = null
)

@HiltViewModel
class ImageGenViewModel @Inject constructor(
    private val chatRepository: ChatRepository
) : ViewModel() {
    
    private val _uiState = MutableStateFlow(ImageGenUiState())
    val uiState: StateFlow<ImageGenUiState> = _uiState.asStateFlow()
    
    init {
        loadStatus()
        loadStyles()
        loadHistory()
    }
    
    private fun loadStatus() {
        viewModelScope.launch {
            when (val result = chatRepository.getImageGenStatus()) {
                is ApiResult.Success -> {
                    _uiState.update { it.copy(status = result.data) }
                }
                is ApiResult.Error -> {
                    _uiState.update { it.copy(error = result.message) }
                }
                is ApiResult.Loading -> { /* Ignore */ }
            }
        }
    }
    
    private fun loadStyles() {
        viewModelScope.launch {
            when (val result = chatRepository.getImageGenStyles()) {
                is ApiResult.Success -> {
                    _uiState.update { it.copy(styles = result.data) }
                }
                is ApiResult.Error -> {
                    // Non-critical, styles are optional
                }
                is ApiResult.Loading -> { /* Ignore */ }
            }
        }
    }
    
    private fun loadHistory() {
        viewModelScope.launch {
            // This would call a history API if available
            // For now, we skip this
        }
    }
    
    fun generateImage(
        prompt: String,
        style: String?,
        aspectRatio: String,
        enhancePrompt: Boolean
    ) {
        viewModelScope.launch {
            _uiState.update { 
                it.copy(
                    isGenerating = true,
                    error = null,
                    generatedImage = null
                )
            }
            
            when (val result = chatRepository.generateImage(
                prompt = prompt,
                style = style,
                aspectRatio = aspectRatio,
                enhancePrompt = enhancePrompt
            )) {
                is ApiResult.Success -> {
                    _uiState.update { 
                        it.copy(
                            isGenerating = false,
                            generatedImage = result.data,
                            // Add to history
                            history = listOf(result.data) + it.history.take(9)
                        )
                    }
                    // Refresh status to update remaining count
                    loadStatus()
                }
                is ApiResult.Error -> {
                    _uiState.update { 
                        it.copy(
                            isGenerating = false,
                            error = result.message
                        )
                    }
                }
                is ApiResult.Loading -> { /* Ignore */ }
            }
        }
    }
    
    fun clearError() {
        _uiState.update { it.copy(error = null) }
    }
}
