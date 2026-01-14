//
//  GetCurrentUserUseCase.swift
//  BaatCheet
//
//  Domain layer - Get Current User Use Case
//

import Foundation

/// Use case for getting the currently authenticated user.
protocol GetCurrentUserUseCaseProtocol {
    func execute() -> User?
}

final class GetCurrentUserUseCase: GetCurrentUserUseCaseProtocol {
    private let repository: AuthRepositoryProtocol
    
    init(repository: AuthRepositoryProtocol) {
        self.repository = repository
    }
    
    func execute() -> User? {
        return repository.getCurrentUser()
    }
}
