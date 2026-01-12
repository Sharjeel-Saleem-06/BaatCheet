package com.baatcheet.app.ui.splash

import androidx.lifecycle.ViewModel
import androidx.lifecycle.viewModelScope
import dagger.hilt.android.lifecycle.HiltViewModel
import kotlinx.coroutines.delay
import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.flow.StateFlow
import kotlinx.coroutines.flow.asStateFlow
import kotlinx.coroutines.launch
import javax.inject.Inject

/**
 * SplashViewModel - Manages splash screen state
 * 
 * Controls how long the splash screen is displayed and handles
 * any initialization tasks that need to complete before showing the main UI.
 */
@HiltViewModel
class SplashViewModel @Inject constructor() : ViewModel() {
    
    companion object {
        private const val SPLASH_DURATION_MS = 2000L // 2 seconds
    }
    
    private val _isLoading = MutableStateFlow(true)
    val isLoading: StateFlow<Boolean> = _isLoading.asStateFlow()
    
    private val _startDestination = MutableStateFlow<String?>(null)
    val startDestination: StateFlow<String?> = _startDestination.asStateFlow()
    
    init {
        initializeApp()
    }
    
    /**
     * Initialize app and determine start destination
     */
    private fun initializeApp() {
        viewModelScope.launch {
            // Simulate initialization tasks
            // In production, this would:
            // - Check authentication state
            // - Load user preferences
            // - Pre-fetch essential data
            
            delay(SPLASH_DURATION_MS)
            
            // TODO: Check if user is authenticated
            // For now, always go to login
            _startDestination.value = "login"
            
            _isLoading.value = false
        }
    }
    
    /**
     * Check if user is authenticated
     * Returns the appropriate start destination
     */
    suspend fun checkAuthState(): String {
        // TODO: Implement actual auth check
        // This would check Clerk session or stored tokens
        return "login"
    }
}
