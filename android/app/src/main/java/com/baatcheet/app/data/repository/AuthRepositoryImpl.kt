package com.baatcheet.app.data.repository

import com.baatcheet.app.data.local.AuthPreferences
import com.baatcheet.app.data.remote.api.AuthApi
import com.baatcheet.app.data.remote.dto.ResendCodeRequestDto
import com.baatcheet.app.data.remote.dto.SignInRequestDto
import com.baatcheet.app.data.remote.dto.SignUpRequestDto
import com.baatcheet.app.data.remote.dto.VerifyEmailRequestDto
import com.baatcheet.app.domain.model.AuthResult
import com.baatcheet.app.domain.model.User
import com.baatcheet.app.domain.repository.AuthRepository
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.withContext
import javax.inject.Inject
import javax.inject.Singleton

/**
 * Auth Repository Implementation
 * 
 * Implements the AuthRepository interface from the domain layer.
 * Handles all authentication operations including API calls and local storage.
 */
@Singleton
class AuthRepositoryImpl @Inject constructor(
    private val authApi: AuthApi,
    private val authPreferences: AuthPreferences
) : AuthRepository {
    
    override suspend fun signUp(
        email: String,
        password: String,
        firstName: String?,
        lastName: String?
    ): AuthResult = withContext(Dispatchers.IO) {
        try {
            val request = SignUpRequestDto(email, password, firstName, lastName)
            val response = authApi.signUp(request)
            
            if (response.isSuccessful) {
                val body = response.body()
                if (body?.success == true) {
                    body.data?.let { data ->
                        // Check if verification is needed
                        if (data.status == "verification_required") {
                            authPreferences.savePendingEmail(email)
                            return@withContext AuthResult.NeedsVerification
                        }
                        
                        // User created successfully
                        if (data.token != null && data.user != null) {
                            val user = data.user.toDomain()
                            authPreferences.saveAuthToken(data.token)
                            authPreferences.saveUser(user)
                            return@withContext AuthResult.Success(
                                token = data.token,
                                userId = data.user.id,
                                user = user
                            )
                        }
                    }
                }
                
                // Error response
                val errorMessage = body?.error ?: "Sign up failed"
                return@withContext AuthResult.Failure(Exception(errorMessage))
            }
            
            AuthResult.Failure(Exception("Server error: ${response.code()}"))
        } catch (e: Exception) {
            AuthResult.Failure(e)
        }
    }
    
    override suspend fun signIn(email: String, password: String): AuthResult = 
        withContext(Dispatchers.IO) {
            try {
                val request = SignInRequestDto(email, password)
                val response = authApi.signIn(request)
                
                if (response.isSuccessful) {
                    val body = response.body()
                    if (body?.success == true) {
                        body.data?.let { data ->
                            if (data.token != null && data.user != null) {
                                val user = data.user.toDomain()
                                authPreferences.saveAuthToken(data.token)
                                authPreferences.saveUser(user)
                                return@withContext AuthResult.Success(
                                    token = data.token,
                                    userId = data.user.id,
                                    user = user
                                )
                            }
                        }
                    }
                    
                    // Error response
                    val errorMessage = body?.error ?: "Sign in failed"
                    return@withContext AuthResult.Failure(Exception(errorMessage))
                }
                
                AuthResult.Failure(Exception("Server error: ${response.code()}"))
            } catch (e: Exception) {
                AuthResult.Failure(e)
            }
        }
    
    override suspend fun verifyEmail(email: String, code: String): AuthResult = 
        withContext(Dispatchers.IO) {
            try {
                val request = VerifyEmailRequestDto(email, code)
                val response = authApi.verifyEmail(request)
                
                if (response.isSuccessful) {
                    val body = response.body()
                    if (body?.success == true) {
                        body.data?.let { data ->
                            if (data.token != null && data.user != null) {
                                val user = data.user.toDomain()
                                authPreferences.saveAuthToken(data.token)
                                authPreferences.saveUser(user)
                                authPreferences.clearPendingEmail()
                                return@withContext AuthResult.Success(
                                    token = data.token,
                                    userId = data.user.id,
                                    user = user
                                )
                            }
                        }
                    }
                    
                    // Error response
                    val errorMessage = body?.error ?: "Verification failed"
                    return@withContext AuthResult.Failure(Exception(errorMessage))
                }
                
                AuthResult.Failure(Exception("Server error: ${response.code()}"))
            } catch (e: Exception) {
                AuthResult.Failure(e)
            }
        }
    
    override suspend fun resendVerificationCode(email: String): Boolean = 
        withContext(Dispatchers.IO) {
            try {
                val request = ResendCodeRequestDto(email)
                val response = authApi.resendVerificationCode(request)
                response.isSuccessful && response.body()?.success == true
            } catch (e: Exception) {
                false
            }
        }
    
    override suspend fun logout(): Boolean = withContext(Dispatchers.IO) {
        try {
            val token = authPreferences.getAuthToken()
            if (token != null) {
                try {
                    authApi.logout("Bearer $token")
                } catch (e: Exception) {
                    // Ignore logout API errors
                }
            }
            authPreferences.clearSession()
            true
        } catch (e: Exception) {
            authPreferences.clearSession()
            true
        }
    }
    
    override fun getAuthToken(): String? = authPreferences.getAuthToken()
    
    override fun getCurrentUser(): User? = authPreferences.getUser()
    
    override fun isAuthenticated(): Boolean = authPreferences.isAuthenticated()
    
    override fun clearSession() = authPreferences.clearSession()
}
