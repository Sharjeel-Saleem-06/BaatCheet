package com.baatcheet.app.domain.usecase.auth

import com.baatcheet.app.domain.model.AuthResult
import com.baatcheet.app.domain.repository.AuthRepository
import javax.inject.Inject

/**
 * Sign Up Use Case
 * 
 * Handles the business logic for user registration.
 * Validates inputs and delegates to the repository.
 */
class SignUpUseCase @Inject constructor(
    private val authRepository: AuthRepository
) {
    /**
     * Execute sign up with email and password
     */
    suspend operator fun invoke(
        email: String,
        password: String,
        firstName: String? = null,
        lastName: String? = null
    ): AuthResult {
        // Validate inputs
        if (email.isBlank()) {
            return AuthResult.Failure(IllegalArgumentException("Email cannot be empty"))
        }
        if (password.isBlank()) {
            return AuthResult.Failure(IllegalArgumentException("Password cannot be empty"))
        }
        if (password.length < 8) {
            return AuthResult.Failure(IllegalArgumentException("Password must be at least 8 characters"))
        }
        
        return authRepository.signUp(email, password, firstName, lastName)
    }
}
