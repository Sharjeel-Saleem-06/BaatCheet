//
//  VerifyEmailUseCase.swift
//  BaatCheet
//
//  Domain layer - Email Verification Use Case
//

import Foundation

/// Use case for verifying user's email.
/// Validates the code and delegates to the repository.
protocol VerifyEmailUseCaseProtocol {
    func execute(email: String, code: String) async -> AuthResult
}

final class VerifyEmailUseCase: VerifyEmailUseCaseProtocol {
    private let repository: AuthRepositoryProtocol
    
    init(repository: AuthRepositoryProtocol) {
        self.repository = repository
    }
    
    func execute(email: String, code: String) async -> AuthResult {
        // Validate inputs
        guard !email.isEmpty else {
            return .failure(.invalidEmail)
        }
        
        guard !code.isEmpty else {
            return .failure(.verificationFailed)
        }
        
        guard code.count == 6 else {
            return .failure(.verificationFailed)
        }
        
        guard code.allSatisfy({ $0.isNumber }) else {
            return .failure(.verificationFailed)
        }
        
        // Delegate to repository
        return await repository.verifyEmail(email: email, code: code)
    }
}
