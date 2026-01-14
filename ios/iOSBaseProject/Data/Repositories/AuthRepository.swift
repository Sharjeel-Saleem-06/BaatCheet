//
//  AuthRepository.swift
//  BaatCheet
//
//  Data layer - Repository implementation for authentication
//

import Foundation

/// Implementation of AuthRepositoryProtocol
final class AuthRepository: AuthRepositoryProtocol {
    
    private let apiClient: AuthAPIClientProtocol
    private let localStorage: AuthLocalStorageProtocol
    
    init(
        apiClient: AuthAPIClientProtocol = AuthAPIClient(),
        localStorage: AuthLocalStorageProtocol = AuthLocalStorage()
    ) {
        self.apiClient = apiClient
        self.localStorage = localStorage
    }
    
    // MARK: - Sign Up
    
    func signUp(credentials: AuthCredentials) async -> AuthResult {
        let request = SignUpRequestDTO(
            email: credentials.email,
            password: credentials.password,
            firstName: credentials.firstName,
            lastName: credentials.lastName
        )
        
        do {
            let response = try await apiClient.signUp(request: request)
            return handleAuthResponse(response, email: credentials.email)
        } catch {
            return .failure(mapError(error))
        }
    }
    
    // MARK: - Sign In
    
    func signIn(email: String, password: String) async -> AuthResult {
        let request = SignInRequestDTO(email: email, password: password)
        
        do {
            let response = try await apiClient.signIn(request: request)
            return handleAuthResponse(response, email: email)
        } catch {
            return .failure(mapError(error))
        }
    }
    
    // MARK: - Verify Email
    
    func verifyEmail(email: String, code: String) async -> AuthResult {
        let request = VerifyEmailRequestDTO(email: email, code: code)
        
        do {
            let response = try await apiClient.verifyEmail(request: request)
            return handleAuthResponse(response, email: email)
        } catch {
            return .failure(mapError(error))
        }
    }
    
    // MARK: - Resend Verification Code
    
    func resendVerificationCode(email: String) async -> Bool {
        let request = ResendCodeRequestDTO(email: email)
        
        do {
            let response = try await apiClient.resendCode(request: request)
            return response.success
        } catch {
            return false
        }
    }
    
    // MARK: - Sign Out
    
    func signOut() async {
        if let token = localStorage.getAuthToken() {
            try? await apiClient.logout(token: token)
        }
        localStorage.clearAll()
    }
    
    // MARK: - Refresh User Info
    
    func refreshUserInfo() async {
        guard let token = localStorage.getAuthToken() else { return }
        
        do {
            let response = try await apiClient.getMe(token: token)
            if let userDTO = response.data?.user {
                let user = userDTO.toDomain()
                localStorage.saveUser(user)
            }
        } catch {
            // If token is invalid, clear session
            if case APIError.serverError(401, _) = error {
                localStorage.clearAll()
            }
        }
    }
    
    // MARK: - Token Management
    
    func getAuthToken() -> String? {
        localStorage.getAuthToken()
    }
    
    func getCurrentUser() -> User? {
        localStorage.getUser()
    }
    
    func isAuthenticated() -> Bool {
        localStorage.getAuthToken() != nil
    }
    
    func clearSession() {
        localStorage.clearAll()
    }
    
    // MARK: - Private Helpers
    
    private func handleAuthResponse(_ response: AuthResponseDTO, email: String) -> AuthResult {
        if response.success {
            if let data = response.data {
                // Check if verification is needed
                if data.status == "verification_required" {
                    localStorage.savePendingEmail(email)
                    return .needsVerification
                }
                
                // Check if we have token and user
                if let token = data.token, let userDTO = data.user {
                    let user = userDTO.toDomain()
                    localStorage.saveAuthToken(token)
                    localStorage.saveUser(user)
                    localStorage.clearPendingEmail()
                    return .success(token: token, userId: user.id, user: user)
                }
            }
        }
        
        // Handle error
        let errorMessage = response.error ?? "Authentication failed"
        return .failure(parseErrorMessage(errorMessage))
    }
    
    private func mapError(_ error: Error) -> AuthError {
        if let apiError = error as? APIError {
            switch apiError {
            case .networkError:
                return .networkError
            case .serverError(let code, let message):
                if code == 401 {
                    return .invalidCredentials
                }
                return .serverError(message ?? "Server error")
            default:
                return .unknown(apiError.localizedDescription)
            }
        }
        return .unknown(error.localizedDescription)
    }
    
    private func parseErrorMessage(_ message: String) -> AuthError {
        let lowercased = message.lowercased()
        
        if lowercased.contains("invalid email or password") ||
           lowercased.contains("invalid credentials") {
            return .invalidCredentials
        }
        
        if lowercased.contains("user not found") ||
           lowercased.contains("no user") {
            return .userNotFound
        }
        
        if lowercased.contains("already exists") ||
           lowercased.contains("email taken") {
            return .emailAlreadyExists
        }
        
        if lowercased.contains("verification") {
            return .verificationFailed
        }
        
        return .serverError(message)
    }
}
