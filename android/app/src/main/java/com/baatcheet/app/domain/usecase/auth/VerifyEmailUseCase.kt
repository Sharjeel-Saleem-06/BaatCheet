package com.baatcheet.app.domain.usecase.auth

import com.baatcheet.app.domain.model.AuthResult
import com.baatcheet.app.domain.repository.AuthRepository
import javax.inject.Inject

/**
 * Verify Email Use Case
 * 
 * Handles the business logic for email verification.
 */
class VerifyEmailUseCase @Inject constructor(
    private val authRepository: AuthRepository
) {
    /**
     * Execute email verification with code
     */
    suspend operator fun invoke(email: String, code: String): AuthResult {
        // Validate inputs
        if (email.isBlank()) {
            return AuthResult.Failure(IllegalArgumentException("Email cannot be empty"))
        }
        if (code.isBlank()) {
            return AuthResult.Failure(IllegalArgumentException("Verification code cannot be empty"))
        }
        if (code.length != 6) {
            return AuthResult.Failure(IllegalArgumentException("Verification code must be 6 digits"))
        }
        if (!code.all { it.isDigit() }) {
            return AuthResult.Failure(IllegalArgumentException("Verification code must contain only digits"))
        }
        
        return authRepository.verifyEmail(email, code)
    }
}
