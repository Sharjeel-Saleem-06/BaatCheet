package com.baatcheet.app.data.local

import android.content.Context
import android.content.SharedPreferences
import com.baatcheet.app.data.remote.dto.UserDto
import com.baatcheet.app.domain.model.User
import com.google.gson.Gson
import dagger.hilt.android.qualifiers.ApplicationContext
import javax.inject.Inject
import javax.inject.Singleton

/**
 * Auth Preferences
 * 
 * Handles local storage of authentication tokens and user data.
 * Uses SharedPreferences for persistence.
 */
@Singleton
class AuthPreferences @Inject constructor(
    @ApplicationContext context: Context
) {
    private val prefs: SharedPreferences = 
        context.getSharedPreferences(PREFS_NAME, Context.MODE_PRIVATE)
    private val gson = Gson()
    
    companion object {
        private const val PREFS_NAME = "baatcheet_auth"
        private const val KEY_AUTH_TOKEN = "auth_token"
        private const val KEY_USER_DATA = "user_data"
        private const val KEY_PENDING_EMAIL = "pending_email"
    }
    
    /**
     * Save authentication token
     */
    fun saveAuthToken(token: String) {
        prefs.edit().putString(KEY_AUTH_TOKEN, token).apply()
    }
    
    /**
     * Get authentication token
     */
    fun getAuthToken(): String? {
        return prefs.getString(KEY_AUTH_TOKEN, null)
    }
    
    /**
     * Save user data
     */
    fun saveUser(user: User) {
        val userJson = gson.toJson(user)
        prefs.edit().putString(KEY_USER_DATA, userJson).apply()
    }
    
    /**
     * Get current user
     */
    fun getUser(): User? {
        val userJson = prefs.getString(KEY_USER_DATA, null) ?: return null
        return try {
            gson.fromJson(userJson, User::class.java)
        } catch (e: Exception) {
            null
        }
    }
    
    /**
     * Save pending email for verification
     */
    fun savePendingEmail(email: String) {
        prefs.edit().putString(KEY_PENDING_EMAIL, email).apply()
    }
    
    /**
     * Get pending email for verification
     */
    fun getPendingEmail(): String? {
        return prefs.getString(KEY_PENDING_EMAIL, null)
    }
    
    /**
     * Clear pending email
     */
    fun clearPendingEmail() {
        prefs.edit().remove(KEY_PENDING_EMAIL).apply()
    }
    
    /**
     * Check if user is authenticated
     */
    fun isAuthenticated(): Boolean {
        return getAuthToken() != null
    }
    
    /**
     * Get user email
     */
    fun getEmail(): String? {
        return getUser()?.email
    }
    
    /**
     * Clear all auth data
     */
    fun clearSession() {
        prefs.edit().clear().apply()
    }
    
    /**
     * Clear all auth data (alias for clearSession)
     */
    fun clearAuth() {
        clearSession()
    }
}
