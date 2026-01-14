//
//  SignInUseCase.swift
//  BaatCheet
//
//  Domain layer - Sign In Use Case
//

import Foundation

/// Use case for signing in a user.
/// Validates credentials and delegates to the repository.
protocol SignInUseCaseProtocol {
    func execute(email: String, password: String) async -> AuthResult
}

final class SignInUseCase: SignInUseCaseProtocol {
    private let repository: AuthRepositoryProtocol
    
    init(repository: AuthRepositoryProtocol) {
        self.repository = repository
    }
    
    func execute(email: String, password: String) async -> AuthResult {
        // Validate inputs
        guard !email.isEmpty else {
            return .failure(.invalidEmail)
        }
        
        guard !password.isEmpty else {
            return .failure(.weakPassword)
        }
        
        guard password.count >= 8 else {
            return .failure(.weakPassword)
        }
        
        // Validate email format
        let credentials = AuthCredentials(email: email, password: password)
        guard credentials.isEmailValid else {
            return .failure(.invalidEmail)
        }
        
        // Delegate to repository
        return await repository.signIn(email: email, password: password)
    }
}
