package com.baatcheet.app.ui.login

import android.content.Context
import android.content.SharedPreferences
import androidx.lifecycle.ViewModel
import com.google.gson.Gson
import com.google.gson.annotations.SerializedName
import dagger.hilt.android.lifecycle.HiltViewModel
import dagger.hilt.android.qualifiers.ApplicationContext
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.withContext
import okhttp3.MediaType.Companion.toMediaType
import okhttp3.OkHttpClient
import okhttp3.Request
import okhttp3.RequestBody.Companion.toRequestBody
import java.io.IOException
import javax.inject.Inject

// MARK: - API Configuration
object APIConfig {
    // Backend API URL - HuggingFace Spaces deployment
    const val BASE_URL = "https://sharry121-baatcheet.hf.space/api/v1"
    const val MOBILE_AUTH_URL = "$BASE_URL/mobile/auth"
}

// MARK: - Response Models
data class AuthResponse(
    val success: Boolean,
    val data: AuthData?,
    val error: String?
)

data class AuthData(
    val user: UserData?,
    val token: String?,
    val status: String?,
    val message: String?,
    val email: String?
)

data class UserData(
    val id: String,
    val email: String,
    @SerializedName("firstName") val firstName: String?,
    @SerializedName("lastName") val lastName: String?,
    val avatar: String?,
    val role: String?,
    val tier: String?
)

// MARK: - Auth Result
sealed class ClerkAuthResult {
    data class Success(val token: String, val userId: String, val user: UserData? = null) : ClerkAuthResult()
    object NeedsVerification : ClerkAuthResult()
    data class Failure(val error: Throwable) : ClerkAuthResult()
}

// MARK: - ClerkAuthService
@HiltViewModel
class ClerkAuthService @Inject constructor(
    @ApplicationContext private val context: Context
) : ViewModel() {
    
    private val okHttpClient = OkHttpClient.Builder().build()
    private val gson = Gson()
    private val prefs: SharedPreferences = context.getSharedPreferences("baatcheet_auth", Context.MODE_PRIVATE)
    
    private var pendingEmail: String? = null
    
    companion object {
        private const val TOKEN_KEY = "auth_token"
        private const val USER_KEY = "user_data"
    }

    // MARK: - Sign Up with Email
    suspend fun signUp(email: String, password: String, firstName: String? = null, lastName: String? = null): ClerkAuthResult = withContext(Dispatchers.IO) {
        val url = "${APIConfig.MOBILE_AUTH_URL}/signup"
        
        val body = mutableMapOf(
            "email" to email,
            "password" to password
        )
        firstName?.let { body["firstName"] = it }
        lastName?.let { body["lastName"] = it }
        
        val requestBody = gson.toJson(body).toRequestBody("application/json".toMediaType())

        val request = Request.Builder()
            .url(url)
            .post(requestBody)
            .header("Content-Type", "application/json")
            .build()

        try {
            val response = okHttpClient.newCall(request).execute()
            val responseBody = response.body?.string()
            
            if (responseBody != null) {
                val authResponse = gson.fromJson(responseBody, AuthResponse::class.java)
                
                if (authResponse.success) {
                    authResponse.data?.let { data ->
                        // Check if verification is needed
                        if (data.status == "verification_required") {
                            pendingEmail = email
                            return@withContext ClerkAuthResult.NeedsVerification
                        }
                        
                        // Check if web signup is required (legacy - should not happen anymore)
                        if (data.status == "web_signup_required") {
                            return@withContext ClerkAuthResult.Failure(
                                Exception(data.message ?: "Please sign up via web first")
                            )
                        }
                        
                        // User created successfully
                        if (data.token != null && data.user != null) {
                            saveAuthToken(data.token)
                            saveUser(data.user)
                            return@withContext ClerkAuthResult.Success(
                                token = data.token,
                                userId = data.user.id,
                                user = data.user
                            )
                        }
                        
                        // If we have a message but no token, show the message
                        if (data.message != null && data.token == null) {
                            return@withContext ClerkAuthResult.Failure(Exception(data.message))
                        }
                    }
                }
                
                // Error response
                val errorMessage = authResponse.error ?: "Sign up failed"
                return@withContext ClerkAuthResult.Failure(Exception(errorMessage))
            }
            
            ClerkAuthResult.Failure(Exception("Empty response from server"))
        } catch (e: IOException) {
            ClerkAuthResult.Failure(e)
        } catch (e: Exception) {
            ClerkAuthResult.Failure(e)
        }
    }

    // MARK: - Sign In with Email
    suspend fun signIn(email: String, password: String): ClerkAuthResult = withContext(Dispatchers.IO) {
        val url = "${APIConfig.MOBILE_AUTH_URL}/signin"
        
        val body = mapOf(
            "email" to email,
            "password" to password
        )
        val requestBody = gson.toJson(body).toRequestBody("application/json".toMediaType())

        val request = Request.Builder()
            .url(url)
            .post(requestBody)
            .header("Content-Type", "application/json")
            .build()

        try {
            val response = okHttpClient.newCall(request).execute()
            val responseBody = response.body?.string()
            
            if (responseBody != null) {
                val authResponse = gson.fromJson(responseBody, AuthResponse::class.java)
                
                if (authResponse.success) {
                    authResponse.data?.let { data ->
                        if (data.token != null && data.user != null) {
                            saveAuthToken(data.token)
                            saveUser(data.user)
                            return@withContext ClerkAuthResult.Success(
                                token = data.token,
                                userId = data.user.id,
                                user = data.user
                            )
                        }
                    }
                }
                
                // Error response
                val errorMessage = authResponse.error ?: "Sign in failed"
                return@withContext ClerkAuthResult.Failure(Exception(errorMessage))
            }
            
            ClerkAuthResult.Failure(Exception("Empty response from server"))
        } catch (e: IOException) {
            ClerkAuthResult.Failure(e)
        } catch (e: Exception) {
            ClerkAuthResult.Failure(e)
        }
    }

    // MARK: - Verify Email Code
    suspend fun verifyEmailCode(code: String): ClerkAuthResult = withContext(Dispatchers.IO) {
        val email = pendingEmail ?: return@withContext ClerkAuthResult.Failure(
            Exception("No pending verification. Please sign up again.")
        )
        
        val url = "${APIConfig.MOBILE_AUTH_URL}/verify-email"
        
        val body = mapOf(
            "email" to email,
            "code" to code
        )
        val requestBody = gson.toJson(body).toRequestBody("application/json".toMediaType())

        val request = Request.Builder()
            .url(url)
            .post(requestBody)
            .header("Content-Type", "application/json")
            .build()

        try {
            val response = okHttpClient.newCall(request).execute()
            val responseBody = response.body?.string()
            
            if (responseBody != null) {
                val authResponse = gson.fromJson(responseBody, AuthResponse::class.java)
                
                if (authResponse.success) {
                    authResponse.data?.let { data ->
                        if (data.token != null && data.user != null) {
                            saveAuthToken(data.token)
                            saveUser(data.user)
                            pendingEmail = null
                            return@withContext ClerkAuthResult.Success(
                                token = data.token,
                                userId = data.user.id,
                                user = data.user
                            )
                        }
                    }
                }
                
                // Error response
                val errorMessage = authResponse.error ?: "Verification failed"
                return@withContext ClerkAuthResult.Failure(Exception(errorMessage))
            }
            
            ClerkAuthResult.Failure(Exception("Empty response from server"))
        } catch (e: IOException) {
            ClerkAuthResult.Failure(e)
        } catch (e: Exception) {
            ClerkAuthResult.Failure(e)
        }
    }

    // MARK: - Resend Verification Code
    suspend fun resendVerificationCode(): Boolean = withContext(Dispatchers.IO) {
        val email = pendingEmail ?: return@withContext false
        
        val url = "${APIConfig.MOBILE_AUTH_URL}/resend-code"
        
        val body = mapOf("email" to email)
        val requestBody = gson.toJson(body).toRequestBody("application/json".toMediaType())

        val request = Request.Builder()
            .url(url)
            .post(requestBody)
            .header("Content-Type", "application/json")
            .build()

        try {
            val response = okHttpClient.newCall(request).execute()
            response.isSuccessful
        } catch (e: Exception) {
            false
        }
    }

    // MARK: - Token Management
    private fun saveAuthToken(token: String) {
        prefs.edit().putString(TOKEN_KEY, token).apply()
    }

    fun getAuthToken(): String? {
        return prefs.getString(TOKEN_KEY, null)
    }

    private fun saveUser(user: UserData) {
        val userJson = gson.toJson(user)
        prefs.edit().putString(USER_KEY, userJson).apply()
    }

    fun getUser(): UserData? {
        val userJson = prefs.getString(USER_KEY, null)
        return if (userJson != null) {
            try {
                gson.fromJson(userJson, UserData::class.java)
            } catch (e: Exception) {
                null
            }
        } else {
            null
        }
    }

    fun clearSession() {
        prefs.edit().clear().apply()
        pendingEmail = null
    }

    // MARK: - Check Authentication
    fun isAuthenticated(): Boolean {
        return getAuthToken() != null
    }

    // MARK: - Set Pending Email
    fun setPendingEmail(email: String) {
        pendingEmail = email
    }

    fun getPendingEmail(): String? {
        return pendingEmail
    }

    // MARK: - Logout
    suspend fun logout(): Boolean = withContext(Dispatchers.IO) {
        val token = getAuthToken()
        if (token != null) {
            try {
                val url = "${APIConfig.MOBILE_AUTH_URL}/logout"
                val request = Request.Builder()
                    .url(url)
                    .post("{}".toRequestBody("application/json".toMediaType()))
                    .header("Authorization", "Bearer $token")
                    .build()
                
                okHttpClient.newCall(request).execute()
            } catch (e: Exception) {
                // Ignore logout errors
            }
        }
        clearSession()
        true
    }
}
