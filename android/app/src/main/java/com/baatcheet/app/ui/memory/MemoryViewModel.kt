package com.baatcheet.app.ui.memory

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

data class MemoryUiState(
    val facts: List<Fact> = emptyList(),
    val profileSummary: ProfileSummary? = null,
    val isLoading: Boolean = false,
    val error: String? = null
)

@HiltViewModel
class MemoryViewModel @Inject constructor(
    private val chatRepository: ChatRepository
) : ViewModel() {
    
    private val _uiState = MutableStateFlow(MemoryUiState())
    val uiState: StateFlow<MemoryUiState> = _uiState.asStateFlow()
    
    init {
        loadFacts()
        loadProfileSummary()
    }
    
    fun loadFacts() {
        viewModelScope.launch {
            _uiState.update { it.copy(isLoading = true, error = null) }
            
            when (val result = chatRepository.getLearnedFacts()) {
                is ApiResult.Success -> {
                    _uiState.update {
                        it.copy(
                            facts = result.data,
                            isLoading = false
                        )
                    }
                }
                is ApiResult.Error -> {
                    _uiState.update {
                        it.copy(
                            isLoading = false,
                            error = result.message
                        )
                    }
                }
                ApiResult.Loading -> { /* Ignore */ }
            }
        }
    }
    
    private fun loadProfileSummary() {
        viewModelScope.launch {
            when (val result = chatRepository.getProfileSummary()) {
                is ApiResult.Success -> {
                    _uiState.update { it.copy(profileSummary = result.data) }
                }
                is ApiResult.Error -> {
                    // Non-critical, just don't show summary
                }
                ApiResult.Loading -> { /* Ignore */ }
            }
        }
    }
    
    fun teachFact(fact: String) {
        viewModelScope.launch {
            when (val result = chatRepository.teachFact(fact)) {
                is ApiResult.Success -> {
                    loadFacts()
                }
                is ApiResult.Error -> {
                    _uiState.update { it.copy(error = result.message) }
                }
                ApiResult.Loading -> { /* Ignore */ }
            }
        }
    }
    
    fun deleteFact(factId: String) {
        viewModelScope.launch {
            when (val result = chatRepository.deleteFact(factId)) {
                is ApiResult.Success -> {
                    // Remove from local list immediately
                    _uiState.update { state ->
                        state.copy(facts = state.facts.filter { it.id != factId })
                    }
                }
                is ApiResult.Error -> {
                    _uiState.update { it.copy(error = result.message) }
                }
                ApiResult.Loading -> { /* Ignore */ }
            }
        }
    }
    
    fun clearError() {
        _uiState.update { it.copy(error = null) }
    }
}
