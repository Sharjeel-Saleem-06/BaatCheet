package com.baatcheet.app.ui.projects

import androidx.lifecycle.ViewModel
import androidx.lifecycle.viewModelScope
import com.baatcheet.app.data.repository.ApiResult
import com.baatcheet.app.data.repository.ChatRepository
import com.baatcheet.app.domain.model.Conversation
import com.baatcheet.app.domain.model.Project
import dagger.hilt.android.lifecycle.HiltViewModel
import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.flow.StateFlow
import kotlinx.coroutines.flow.asStateFlow
import kotlinx.coroutines.flow.update
import kotlinx.coroutines.launch
import javax.inject.Inject

data class ProjectsUiState(
    val projects: List<Project> = emptyList(),
    val selectedProject: Project? = null,
    val projectConversations: List<Conversation> = emptyList(),
    val isLoading: Boolean = false,
    val error: String? = null
)

@HiltViewModel
class ProjectsViewModel @Inject constructor(
    private val chatRepository: ChatRepository
) : ViewModel() {
    
    private val _uiState = MutableStateFlow(ProjectsUiState())
    val uiState: StateFlow<ProjectsUiState> = _uiState.asStateFlow()
    
    init {
        loadProjects()
    }
    
    fun loadProjects() {
        viewModelScope.launch {
            _uiState.update { it.copy(isLoading = true, error = null) }
            
            when (val result = chatRepository.getProjects()) {
                is ApiResult.Success -> {
                    _uiState.update { 
                        it.copy(
                            projects = result.data,
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
    
    fun selectProject(project: Project) {
        _uiState.update { it.copy(selectedProject = project) }
        loadProjectConversations(project.id)
    }
    
    private fun loadProjectConversations(projectId: String) {
        viewModelScope.launch {
            when (val result = chatRepository.getProjectConversations(projectId)) {
                is ApiResult.Success -> {
                    _uiState.update { 
                        it.copy(projectConversations = result.data)
                    }
                }
                is ApiResult.Error -> {
                    _uiState.update { 
                        it.copy(
                            projectConversations = emptyList(),
                            error = result.message
                        )
                    }
                }
                ApiResult.Loading -> { /* Ignore */ }
            }
        }
    }
    
    fun createProject(name: String, description: String?, color: String) {
        viewModelScope.launch {
            when (val result = chatRepository.createProject(name, description, color)) {
                is ApiResult.Success -> {
                    loadProjects()
                }
                is ApiResult.Error -> {
                    _uiState.update { it.copy(error = result.message) }
                }
                ApiResult.Loading -> { /* Ignore */ }
            }
        }
    }
    
    fun updateProject(projectId: String, name: String, description: String?, color: String) {
        viewModelScope.launch {
            when (val result = chatRepository.updateProject(projectId, name, description, color)) {
                is ApiResult.Success -> {
                    loadProjects()
                    // Also update selected project if it's the one being edited
                    if (_uiState.value.selectedProject?.id == projectId) {
                        selectProject(result.data)
                    }
                }
                is ApiResult.Error -> {
                    _uiState.update { it.copy(error = result.message) }
                }
                ApiResult.Loading -> { /* Ignore */ }
            }
        }
    }
    
    fun deleteProject(projectId: String) {
        viewModelScope.launch {
            when (val result = chatRepository.deleteProject(projectId)) {
                is ApiResult.Success -> {
                    // Clear selected project if it was deleted
                    if (_uiState.value.selectedProject?.id == projectId) {
                        _uiState.update { 
                            it.copy(
                                selectedProject = null,
                                projectConversations = emptyList()
                            )
                        }
                    }
                    loadProjects()
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
