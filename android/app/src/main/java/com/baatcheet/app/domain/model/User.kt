package com.baatcheet.app.domain.model

/**
 * Domain model for User
 * 
 * This is a pure Kotlin model without any Android or framework dependencies.
 * It represents the core user entity in the application.
 */
data class User(
    val id: String,
    val email: String,
    val firstName: String? = null,
    val lastName: String? = null,
    val avatar: String? = null,
    val role: String? = null,
    val tier: String? = null
) {
    val displayName: String
        get() = when {
            !firstName.isNullOrBlank() && !lastName.isNullOrBlank() -> "$firstName $lastName"
            !firstName.isNullOrBlank() -> firstName
            !lastName.isNullOrBlank() -> lastName
            else -> email.substringBefore("@")
        }
}
