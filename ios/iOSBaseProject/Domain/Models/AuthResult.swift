//
//  AuthResult.swift
//  BaatCheet
//
//  Domain model for authentication results - Pure Swift
//

import Foundation

/// Represents the result of an authentication operation.
/// Uses a sealed enum pattern for type-safe result handling.
enum AuthResult: Equatable {
    /// Authentication was successful
    case success(token: String, userId: String, user: User?)
    
    /// Email verification is required
    case needsVerification
    
    /// Authentication failed with an error
    case failure(AuthError)
    
    // MARK: - Convenience Properties
    
    var isSuccess: Bool {
        if case .success = self { return true }
        return false
    }
    
    var needsVerification: Bool {
        if case .needsVerification = self { return true }
        return false
    }
    
    var isFailure: Bool {
        if case .failure = self { return true }
        return false
    }
    
    /// Get the user if successful
    var user: User? {
        if case .success(_, _, let user) = self { return user }
        return nil
    }
    
    /// Get the token if successful
    var token: String? {
        if case .success(let token, _, _) = self { return token }
        return nil
    }
    
    /// Get the error if failed
    var error: AuthError? {
        if case .failure(let error) = self { return error }
        return nil
    }
}

/// Domain-specific authentication errors
enum AuthError: Error, Equatable {
    case invalidCredentials
    case userNotFound
    case emailAlreadyExists
    case weakPassword
    case invalidEmail
    case networkError
    case serverError(String)
    case verificationFailed
    case sessionExpired
    case unknown(String)
    
    var localizedDescription: String {
        switch self {
        case .invalidCredentials:
            return "Invalid email or password. Please check your credentials."
        case .userNotFound:
            return "No account found with this email. Please sign up."
        case .emailAlreadyExists:
            return "An account with this email already exists."
        case .weakPassword:
            return "Password must be at least 8 characters."
        case .invalidEmail:
            return "Please enter a valid email address."
        case .networkError:
            return "Network connection error. Please check your internet."
        case .serverError(let message):
            return message
        case .verificationFailed:
            return "Invalid verification code. Please try again."
        case .sessionExpired:
            return "Your session has expired. Please sign in again."
        case .unknown(let message):
            return message
        }
    }
}
