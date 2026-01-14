package com.baatcheet.app.domain.repository

import com.baatcheet.app.domain.model.AuthResult
import com.baatcheet.app.domain.model.User

/**
 * Auth Repository Interface
 * 
 * Defines the contract for authentication operations.
 * This interface belongs to the domain layer and has no implementation details.
 * Implementations will be in the data layer.
 */
interface AuthRepository {
    
    /**
     * Sign up with email and password
     */
    suspend fun signUp(
        email: String,
        password: String,
        firstName: String? = null,
        lastName: String? = null
    ): AuthResult
    
    /**
     * Sign in with email and password
     */
    suspend fun signIn(email: String, password: String): AuthResult
    
    /**
     * Verify email with verification code
     */
    suspend fun verifyEmail(email: String, code: String): AuthResult
    
    /**
     * Resend verification code
     */
    suspend fun resendVerificationCode(email: String): Boolean
    
    /**
     * Log out current user
     */
    suspend fun logout(): Boolean
    
    /**
     * Get current authentication token
     */
    fun getAuthToken(): String?
    
    /**
     * Get currently logged in user
     */
    fun getCurrentUser(): User?
    
    /**
     * Check if user is authenticated
     */
    fun isAuthenticated(): Boolean
    
    /**
     * Clear current session
     */
    fun clearSession()
}
