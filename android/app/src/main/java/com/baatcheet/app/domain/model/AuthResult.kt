package com.baatcheet.app.domain.model

/**
 * Sealed class representing authentication result states.
 * 
 * This is a pure domain model without any framework dependencies.
 * Follows the Result pattern for clean error handling.
 */
sealed class AuthResult {
    /**
     * Authentication was successful
     */
    data class Success(
        val token: String,
        val userId: String,
        val user: User? = null
    ) : AuthResult()
    
    /**
     * Email verification is required before completing authentication
     */
    data object NeedsVerification : AuthResult()
    
    /**
     * Authentication failed with an error
     */
    data class Failure(val error: Throwable) : AuthResult()
    
    /**
     * Helper functions for result handling
     */
    val isSuccess: Boolean get() = this is Success
    val isFailure: Boolean get() = this is Failure
    val needsVerification: Boolean get() = this is NeedsVerification
    
    /**
     * Get the user if successful, null otherwise
     */
    fun getOrNull(): User? = (this as? Success)?.user
    
    /**
     * Get the error if failed, null otherwise
     */
    fun exceptionOrNull(): Throwable? = (this as? Failure)?.error
}
