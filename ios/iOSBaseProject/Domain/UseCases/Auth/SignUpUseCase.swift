//
//  SignUpUseCase.swift
//  BaatCheet
//
//  Domain layer - Sign Up Use Case
//

import Foundation

/// Use case for registering a new user.
/// Validates credentials and delegates to the repository.
protocol SignUpUseCaseProtocol {
    func execute(credentials: AuthCredentials) async -> AuthResult
}

final class SignUpUseCase: SignUpUseCaseProtocol {
    private let repository: AuthRepositoryProtocol
    
    init(repository: AuthRepositoryProtocol) {
        self.repository = repository
    }
    
    func execute(credentials: AuthCredentials) async -> AuthResult {
        // Validate credentials
        guard !credentials.email.isEmpty else {
            return .failure(.invalidEmail)
        }
        
        guard credentials.isEmailValid else {
            return .failure(.invalidEmail)
        }
        
        guard !credentials.password.isEmpty else {
            return .failure(.weakPassword)
        }
        
        guard credentials.isPasswordValid else {
            return .failure(.weakPassword)
        }
        
        // Delegate to repository
        return await repository.signUp(credentials: credentials)
    }
}
