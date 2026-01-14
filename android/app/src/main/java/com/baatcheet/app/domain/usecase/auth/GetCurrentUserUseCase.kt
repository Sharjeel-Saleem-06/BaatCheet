package com.baatcheet.app.domain.usecase.auth

import com.baatcheet.app.domain.model.User
import com.baatcheet.app.domain.repository.AuthRepository
import javax.inject.Inject

/**
 * Get Current User Use Case
 * 
 * Retrieves the currently authenticated user.
 */
class GetCurrentUserUseCase @Inject constructor(
    private val authRepository: AuthRepository
) {
    /**
     * Get current user if authenticated
     */
    operator fun invoke(): User? {
        return authRepository.getCurrentUser()
    }
}
