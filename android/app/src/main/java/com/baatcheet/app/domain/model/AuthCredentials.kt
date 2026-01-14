package com.baatcheet.app.domain.model

/**
 * Domain model for authentication credentials
 */
data class AuthCredentials(
    val email: String,
    val password: String,
    val firstName: String? = null,
    val lastName: String? = null
) {
    /**
     * Validate email format
     */
    val isEmailValid: Boolean
        get() = android.util.Patterns.EMAIL_ADDRESS.matcher(email).matches()
    
    /**
     * Validate password (minimum 8 characters)
     */
    val isPasswordValid: Boolean
        get() = password.length >= 8
    
    /**
     * Check if credentials are valid for submission
     */
    val isValid: Boolean
        get() = isEmailValid && isPasswordValid
}
