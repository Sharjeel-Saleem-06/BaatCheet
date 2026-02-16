package com.baatcheet.app.di

import android.content.Context
import android.content.SharedPreferences
import dagger.hilt.android.qualifiers.ApplicationContext
import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.flow.StateFlow
import kotlinx.coroutines.flow.asStateFlow
import javax.inject.Inject
import javax.inject.Singleton

/**
 * Session Manager
 * Handles session state and expiration events
 */
@Singleton
class SessionManager @Inject constructor(
    @ApplicationContext private val context: Context,
    private val prefs: SharedPreferences
) {
    private val _sessionExpired = MutableStateFlow(false)
    val sessionExpired: StateFlow<Boolean> = _sessionExpired.asStateFlow()
    
    private val _showSessionExpiredDialog = MutableStateFlow(false)
    val showSessionExpiredDialog: StateFlow<Boolean> = _showSessionExpiredDialog.asStateFlow()
    
    companion object {
        private const val TOKEN_KEY = "auth_token"
        private const val TOKEN_EXPIRY_KEY = "token_expiry"
    }
    
    /**
     * Called when a 401 Unauthorized response is received
     */
    fun onSessionExpired() {
        _sessionExpired.value = true
        _showSessionExpiredDialog.value = true
    }
    
    /**
     * User acknowledged the session expired dialog
     */
    fun acknowledgeSessionExpired() {
        _showSessionExpiredDialog.value = false
        clearSession()
    }
    
    /**
     * Reset session state after successful login
     */
    fun onSessionRestored() {
        _sessionExpired.value = false
        _showSessionExpiredDialog.value = false
    }
    
    /**
     * Check if there's a valid token
     */
    fun hasValidToken(): Boolean {
        val token = prefs.getString(TOKEN_KEY, null)
        return !token.isNullOrBlank()
    }
    
    /**
     * Clear the session data
     */
    fun clearSession() {
        prefs.edit()
            .remove(TOKEN_KEY)
            .remove(TOKEN_EXPIRY_KEY)
            .apply()
    }
    
    /**
     * Get current token
     */
    fun getToken(): String? {
        return prefs.getString(TOKEN_KEY, null)
    }
}
