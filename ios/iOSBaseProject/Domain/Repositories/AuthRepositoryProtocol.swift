//
//  AuthRepositoryProtocol.swift
//  BaatCheet
//
//  Domain layer - Repository protocol for authentication
//

import Foundation

/// Protocol defining authentication operations.
/// Implementations will be in the Data layer.
protocol AuthRepositoryProtocol {
    
    /// Sign up a new user with email and password
    /// - Parameters:
    ///   - credentials: User credentials including email and password
    /// - Returns: AuthResult indicating success, verification needed, or failure
    func signUp(credentials: AuthCredentials) async -> AuthResult
    
    /// Sign in an existing user with email and password
    /// - Parameters:
    ///   - email: User's email address
    ///   - password: User's password
    /// - Returns: AuthResult indicating success or failure
    func signIn(email: String, password: String) async -> AuthResult
    
    /// Verify email with verification code
    /// - Parameters:
    ///   - email: User's email address
    ///   - code: 6-digit verification code
    /// - Returns: AuthResult indicating success or failure
    func verifyEmail(email: String, code: String) async -> AuthResult
    
    /// Resend verification code to email
    /// - Parameter email: User's email address
    /// - Returns: Boolean indicating success
    func resendVerificationCode(email: String) async -> Bool
    
    /// Sign out the current user
    func signOut() async
    
    /// Refresh user information from server
    func refreshUserInfo() async
    
    /// Get current authentication token
    func getAuthToken() -> String?
    
    /// Get currently logged in user
    func getCurrentUser() -> User?
    
    /// Check if user is authenticated
    func isAuthenticated() -> Bool
    
    /// Clear all session data
    func clearSession()
}
