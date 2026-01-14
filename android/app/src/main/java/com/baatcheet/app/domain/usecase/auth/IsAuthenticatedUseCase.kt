package com.baatcheet.app.domain.usecase.auth

import com.baatcheet.app.domain.repository.AuthRepository
import javax.inject.Inject

/**
 * Is Authenticated Use Case
 * 
 * Checks if user is currently authenticated.
 */
class IsAuthenticatedUseCase @Inject constructor(
    private val authRepository: AuthRepository
) {
    /**
     * Check if user is authenticated
     */
    operator fun invoke(): Boolean {
        return authRepository.isAuthenticated()
    }
}
