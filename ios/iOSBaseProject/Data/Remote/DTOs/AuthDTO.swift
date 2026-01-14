//
//  AuthDTO.swift
//  BaatCheet
//
//  Data Transfer Objects for Authentication API
//

import Foundation

// MARK: - Response DTOs

/// API Response wrapper
struct AuthResponseDTO: Codable {
    let success: Bool
    let data: AuthDataDTO?
    let error: String?
}

/// Auth data from API
struct AuthDataDTO: Codable {
    let user: UserDTO?
    let token: String?
    let status: String?
    let message: String?
    let email: String?
}

/// User data from API
struct UserDTO: Codable {
    let id: String
    let email: String
    let firstName: String?
    let lastName: String?
    let avatar: String?
    let role: String?
    let tier: String?
    
    /// Map DTO to domain model
    func toDomain() -> User {
        User(
            id: id,
            email: email,
            firstName: firstName,
            lastName: lastName,
            avatar: avatar,
            role: role,
            tier: tier
        )
    }
}

// MARK: - Request DTOs

/// Sign in request body
struct SignInRequestDTO: Codable {
    let email: String
    let password: String
}

/// Sign up request body
struct SignUpRequestDTO: Codable {
    let email: String
    let password: String
    let firstName: String?
    let lastName: String?
}

/// Email verification request body
struct VerifyEmailRequestDTO: Codable {
    let email: String
    let code: String
}

/// Resend code request body
struct ResendCodeRequestDTO: Codable {
    let email: String
}

// MARK: - Me Response DTO

struct MeResponseDTO: Codable {
    let success: Bool
    let data: MeDataDTO?
}

struct MeDataDTO: Codable {
    let user: UserDTO
}
