//
//  IsAuthenticatedUseCase.swift
//  BaatCheet
//
//  Domain layer - Check Authentication Status Use Case
//

import Foundation

/// Use case for checking if user is authenticated.
protocol IsAuthenticatedUseCaseProtocol {
    func execute() -> Bool
}

final class IsAuthenticatedUseCase: IsAuthenticatedUseCaseProtocol {
    private let repository: AuthRepositoryProtocol
    
    init(repository: AuthRepositoryProtocol) {
        self.repository = repository
    }
    
    func execute() -> Bool {
        return repository.isAuthenticated()
    }
}
