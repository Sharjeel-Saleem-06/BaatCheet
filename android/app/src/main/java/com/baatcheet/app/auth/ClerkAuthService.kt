package com.baatcheet.app.auth

import android.content.Context
import android.content.SharedPreferences
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.withContext
import org.json.JSONObject
import java.io.OutputStreamWriter
import java.net.HttpURLConnection
import java.net.URL
import java.util.Base64
import javax.inject.Inject
import javax.inject.Singleton

/**
 * Clerk Authentication Service for Android
 * Handles email/password authentication via Clerk REST API
 */

// Configuration
object ClerkConfig {
    // BaatCheet Clerk credentials
    const val PUBLISHABLE_KEY = "pk_test_YnVyc3Rpbmcta2F0eWRpZC01LmNsZXJrLmFjY291bnRzLmRldiQ"
    const val FRONTEND_API = "https://bursting-katydid-5.clerk.accounts.dev"
}

// Auth Result
sealed class ClerkAuthResult {
    data class Success(val token: String, val userId: String) : ClerkAuthResult()
    data class NeedsVerification(val signUpId: String) : ClerkAuthResult()
    data class Failure(val error: String) : ClerkAuthResult()
}

@Singleton
class ClerkAuthService @Inject constructor(
    private val context: Context
) {
    private val prefs: SharedPreferences = context.getSharedPreferences("clerk_auth", Context.MODE_PRIVATE)
    
    var sessionToken: String?
        get() = prefs.getString("session_token", null)
        private set(value) {
            prefs.edit().putString("session_token", value).apply()
        }
    
    var userId: String?
        get() = prefs.getString("user_id", null)
        private set(value) {
            prefs.edit().putString("user_id", value).apply()
        }
    
    val isAuthenticated: Boolean
        get() = sessionToken != null
    
    /**
     * Sign up with email and password
     */
    suspend fun signUp(email: String, password: String): ClerkAuthResult = withContext(Dispatchers.IO) {
        try {
            val url = URL("${ClerkConfig.FRONTEND_API}/sign_ups")
            val connection = url.openConnection() as HttpURLConnection
            
            connection.apply {
                requestMethod = "POST"
                setRequestProperty("Content-Type", "application/json")
                doOutput = true
            }
            
            val body = JSONObject().apply {
                put("email_address", email)
                put("password", password)
            }
            
            OutputStreamWriter(connection.outputStream).use { writer ->
                writer.write(body.toString())
            }
            
            val responseCode = connection.responseCode
            val response = if (responseCode in 200..299) {
                connection.inputStream.bufferedReader().readText()
            } else {
                connection.errorStream?.bufferedReader()?.readText() ?: "Unknown error"
            }
            
            if (responseCode in 200..299) {
                val json = JSONObject(response)
                val status = json.optString("status")
                
                when (status) {
                    "complete" -> {
                        // Sign up complete, now sign in
                        signIn(email, password)
                    }
                    "missing_requirements" -> {
                        ClerkAuthResult.NeedsVerification(json.optString("id"))
                    }
                    else -> {
                        ClerkAuthResult.Failure("Sign up status: $status")
                    }
                }
            } else {
                val errorJson = JSONObject(response)
                val errors = errorJson.optJSONArray("errors")
                val errorMessage = errors?.optJSONObject(0)?.optString("long_message")
                    ?: errors?.optJSONObject(0)?.optString("message")
                    ?: "Sign up failed"
                ClerkAuthResult.Failure(errorMessage)
            }
        } catch (e: Exception) {
            ClerkAuthResult.Failure(e.message ?: "Sign up failed")
        }
    }
    
    /**
     * Sign in with email and password
     */
    suspend fun signIn(email: String, password: String): ClerkAuthResult = withContext(Dispatchers.IO) {
        try {
            val url = URL("${ClerkConfig.FRONTEND_API}/sign_ins")
            val connection = url.openConnection() as HttpURLConnection
            
            connection.apply {
                requestMethod = "POST"
                setRequestProperty("Content-Type", "application/json")
                doOutput = true
            }
            
            val body = JSONObject().apply {
                put("identifier", email)
                put("password", password)
                put("strategy", "password")
            }
            
            OutputStreamWriter(connection.outputStream).use { writer ->
                writer.write(body.toString())
            }
            
            val responseCode = connection.responseCode
            val response = if (responseCode in 200..299) {
                connection.inputStream.bufferedReader().readText()
            } else {
                connection.errorStream?.bufferedReader()?.readText() ?: "Unknown error"
            }
            
            if (responseCode in 200..299) {
                val json = JSONObject(response)
                val status = json.optString("status")
                val sessionId = json.optString("created_session_id")
                
                if (status == "complete" && sessionId.isNotEmpty()) {
                    getSessionToken(sessionId)
                } else {
                    ClerkAuthResult.Failure("Sign in incomplete. Status: $status")
                }
            } else {
                val errorJson = JSONObject(response)
                val errors = errorJson.optJSONArray("errors")
                val errorMessage = errors?.optJSONObject(0)?.optString("long_message")
                    ?: errors?.optJSONObject(0)?.optString("message")
                    ?: "Sign in failed"
                ClerkAuthResult.Failure(errorMessage)
            }
        } catch (e: Exception) {
            ClerkAuthResult.Failure(e.message ?: "Sign in failed")
        }
    }
    
    /**
     * Get session token from session ID
     */
    private suspend fun getSessionToken(sessionId: String): ClerkAuthResult = withContext(Dispatchers.IO) {
        try {
            val url = URL("${ClerkConfig.FRONTEND_API}/sessions/$sessionId/tokens")
            val connection = url.openConnection() as HttpURLConnection
            
            connection.apply {
                requestMethod = "POST"
                setRequestProperty("Content-Type", "application/json")
            }
            
            val responseCode = connection.responseCode
            val response = if (responseCode in 200..299) {
                connection.inputStream.bufferedReader().readText()
            } else {
                connection.errorStream?.bufferedReader()?.readText() ?: "Unknown error"
            }
            
            if (responseCode in 200..299) {
                val json = JSONObject(response)
                val token = json.optString("jwt")
                
                if (token.isNotEmpty()) {
                    sessionToken = token
                    val extractedUserId = extractUserIdFromToken(token)
                    userId = extractedUserId
                    ClerkAuthResult.Success(token, extractedUserId ?: "")
                } else {
                    ClerkAuthResult.Failure("No token received")
                }
            } else {
                ClerkAuthResult.Failure("Failed to get session token")
            }
        } catch (e: Exception) {
            ClerkAuthResult.Failure(e.message ?: "Failed to get session token")
        }
    }
    
    /**
     * Sign out and clear session
     */
    fun signOut() {
        sessionToken = null
        userId = null
        prefs.edit().clear().apply()
    }
    
    /**
     * Extract user ID from JWT token
     */
    private fun extractUserIdFromToken(token: String): String? {
        return try {
            val parts = token.split(".")
            if (parts.size >= 2) {
                var base64 = parts[1]
                // Add padding if needed
                while (base64.length % 4 != 0) {
                    base64 += "="
                }
                val decoded = Base64.getDecoder().decode(base64)
                val json = JSONObject(String(decoded))
                json.optString("sub")
            } else null
        } catch (e: Exception) {
            null
        }
    }
}
