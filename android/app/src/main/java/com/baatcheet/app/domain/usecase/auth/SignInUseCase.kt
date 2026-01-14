package com.baatcheet.app.domain.usecase.auth

import com.baatcheet.app.domain.model.AuthResult
import com.baatcheet.app.domain.repository.AuthRepository
import javax.inject.Inject

/**
 * Sign In Use Case
 * 
 * Handles the business logic for user sign-in.
 * This use case validates credentials and delegates to the repository.
 */
class SignInUseCase @Inject constructor(
    private val authRepository: AuthRepository
) {
    /**
     * Execute sign in with email and password
     */
    suspend operator fun invoke(email: String, password: String): AuthResult {
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
        
        return authRepository.signIn(email, password)
    }
}
