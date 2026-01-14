package com.baatcheet.app.data.remote.dto

import com.baatcheet.app.domain.model.User
import com.google.gson.annotations.SerializedName

/**
 * Data Transfer Objects for Authentication API
 * 
 * These DTOs represent the exact structure of API responses.
 * They are mapped to domain models before being used in the app.
 */

// Response wrapper
data class AuthResponseDto(
    val success: Boolean,
    val data: AuthDataDto?,
    val error: String?
)

// Auth data
data class AuthDataDto(
    val user: UserDto?,
    val token: String?,
    val status: String?,
    val message: String?,
    val email: String?
)

// User DTO
data class UserDto(
    val id: String,
    val email: String,
    @SerializedName("firstName") val firstName: String?,
    @SerializedName("lastName") val lastName: String?,
    val avatar: String?,
    val role: String?,
    val tier: String?
) {
    /**
     * Map DTO to domain model
     */
    fun toDomain(): User = User(
        id = id,
        email = email,
        firstName = firstName,
        lastName = lastName,
        avatar = avatar,
        role = role,
        tier = tier
    )
}

// Request DTOs
data class SignInRequestDto(
    val email: String,
    val password: String
)

data class SignUpRequestDto(
    val email: String,
    val password: String,
    val firstName: String? = null,
    val lastName: String? = null
)

data class VerifyEmailRequestDto(
    val email: String,
    val code: String
)

data class ResendCodeRequestDto(
    val email: String
)
