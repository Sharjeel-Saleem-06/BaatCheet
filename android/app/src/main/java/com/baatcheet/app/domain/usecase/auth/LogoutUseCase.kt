package com.baatcheet.app.domain.usecase.auth

import com.baatcheet.app.domain.repository.AuthRepository
import javax.inject.Inject

/**
 * Logout Use Case
 * 
 * Handles the business logic for user logout.
 */
class LogoutUseCase @Inject constructor(
    private val authRepository: AuthRepository
) {
    /**
     * Execute logout
     */
    suspend operator fun invoke(): Boolean {
        return authRepository.logout()
    }
}
