package com.baatcheet.app.ui.settings

import androidx.lifecycle.ViewModel
import androidx.lifecycle.viewModelScope
import com.baatcheet.app.data.local.AuthPreferences
import com.baatcheet.app.data.remote.api.BaatCheetApi
import com.baatcheet.app.data.remote.dto.CreateApiKeyRequest
import com.baatcheet.app.data.remote.dto.CreateWebhookRequest
import dagger.hilt.android.lifecycle.HiltViewModel
import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.flow.StateFlow
import kotlinx.coroutines.flow.asStateFlow
import kotlinx.coroutines.flow.update
import kotlinx.coroutines.launch
import javax.inject.Inject

data class SettingsUiState(
    val userEmail: String? = null,
    val darkModeEnabled: Boolean = false,
    val notificationsEnabled: Boolean = true,
    val voiceInputEnabled: Boolean = true,
    val apiKeys: List<ApiKeyItem> = emptyList(),
    val webhooks: List<WebhookItem> = emptyList(),
    val isLoadingApiKeys: Boolean = false,
    val isLoadingWebhooks: Boolean = false,
    val error: String? = null
)

@HiltViewModel
class SettingsViewModel @Inject constructor(
    private val api: BaatCheetApi,
    private val authPreferences: AuthPreferences
) : ViewModel() {
    
    private val _uiState = MutableStateFlow(SettingsUiState())
    val uiState: StateFlow<SettingsUiState> = _uiState.asStateFlow()
    
    init {
        loadUserInfo()
        loadApiKeys()
        loadWebhooks()
    }
    
    private fun loadUserInfo() {
        _uiState.update { 
            it.copy(userEmail = authPreferences.getEmail())
        }
    }
    
    fun loadApiKeys() {
        viewModelScope.launch {
            _uiState.update { it.copy(isLoadingApiKeys = true) }
            
            try {
                val response = api.getApiKeys()
                if (response.isSuccessful && response.body()?.success == true) {
                    val keys = response.body()?.data?.map { dto ->
                        ApiKeyItem(
                            id = dto.id,
                            name = dto.name,
                            keyPreview = dto.keyPreview,
                            isActive = dto.isActive ?: true
                        )
                    } ?: emptyList()
                    _uiState.update { it.copy(apiKeys = keys, isLoadingApiKeys = false) }
                } else {
                    _uiState.update { it.copy(isLoadingApiKeys = false) }
                }
            } catch (e: Exception) {
                _uiState.update { 
                    it.copy(
                        isLoadingApiKeys = false,
                        error = e.message
                    )
                }
            }
        }
    }
    
    fun loadWebhooks() {
        viewModelScope.launch {
            _uiState.update { it.copy(isLoadingWebhooks = true) }
            
            try {
                val response = api.getWebhooks()
                if (response.isSuccessful && response.body()?.success == true) {
                    val webhooks = response.body()?.data?.map { dto ->
                        WebhookItem(
                            id = dto.id,
                            url = dto.url,
                            events = dto.events,
                            isActive = dto.isActive ?: true
                        )
                    } ?: emptyList()
                    _uiState.update { it.copy(webhooks = webhooks, isLoadingWebhooks = false) }
                } else {
                    _uiState.update { it.copy(isLoadingWebhooks = false) }
                }
            } catch (e: Exception) {
                _uiState.update { 
                    it.copy(
                        isLoadingWebhooks = false,
                        error = e.message
                    )
                }
            }
        }
    }
    
    fun createApiKey(name: String) {
        viewModelScope.launch {
            try {
                val request = CreateApiKeyRequest(name = name)
                val response = api.createApiKey(request)
                if (response.isSuccessful && response.body()?.success == true) {
                    loadApiKeys()
                }
            } catch (e: Exception) {
                _uiState.update { it.copy(error = e.message) }
            }
        }
    }
    
    fun deleteApiKey(id: String) {
        viewModelScope.launch {
            try {
                val response = api.deleteApiKey(id)
                if (response.isSuccessful && response.body()?.success == true) {
                    loadApiKeys()
                }
            } catch (e: Exception) {
                _uiState.update { it.copy(error = e.message) }
            }
        }
    }
    
    fun createWebhook(url: String, events: List<String>) {
        viewModelScope.launch {
            try {
                val request = CreateWebhookRequest(url = url, events = events)
                val response = api.createWebhook(request)
                if (response.isSuccessful && response.body()?.success == true) {
                    loadWebhooks()
                }
            } catch (e: Exception) {
                _uiState.update { it.copy(error = e.message) }
            }
        }
    }
    
    fun deleteWebhook(id: String) {
        viewModelScope.launch {
            try {
                val response = api.deleteWebhook(id)
                if (response.isSuccessful && response.body()?.success == true) {
                    loadWebhooks()
                }
            } catch (e: Exception) {
                _uiState.update { it.copy(error = e.message) }
            }
        }
    }
    
    fun testWebhook(id: String) {
        viewModelScope.launch {
            try {
                api.testWebhook(id)
                // Show toast or snackbar on success
            } catch (e: Exception) {
                _uiState.update { it.copy(error = e.message) }
            }
        }
    }
    
    fun toggleDarkMode() {
        _uiState.update { it.copy(darkModeEnabled = !it.darkModeEnabled) }
        // TODO: Save to preferences and apply theme
    }
    
    fun toggleNotifications() {
        _uiState.update { it.copy(notificationsEnabled = !it.notificationsEnabled) }
        // TODO: Save to preferences
    }
    
    fun toggleVoiceInput() {
        _uiState.update { it.copy(voiceInputEnabled = !it.voiceInputEnabled) }
        // TODO: Save to preferences
    }
    
    fun exportData() {
        viewModelScope.launch {
            try {
                val response = api.exportUserData()
                if (response.isSuccessful && response.body()?.success == true) {
                    // Handle export download URL
                }
            } catch (e: Exception) {
                _uiState.update { it.copy(error = e.message) }
            }
        }
    }
    
    fun deleteAccount() {
        viewModelScope.launch {
            try {
                val response = api.deleteUserData()
                if (response.isSuccessful && response.body()?.success == true) {
                    // Clear local data and log out
                    authPreferences.clearAuth()
                }
            } catch (e: Exception) {
                _uiState.update { it.copy(error = e.message) }
            }
        }
    }
    
    fun clearError() {
        _uiState.update { it.copy(error = null) }
    }
}
