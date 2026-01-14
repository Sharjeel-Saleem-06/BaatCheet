//
//  LogoutUseCase.swift
//  BaatCheet
//
//  Domain layer - Logout Use Case
//

import Foundation

/// Use case for logging out the user.
protocol LogoutUseCaseProtocol {
    func execute() async
}

final class LogoutUseCase: LogoutUseCaseProtocol {
    private let repository: AuthRepositoryProtocol
    
    init(repository: AuthRepositoryProtocol) {
        self.repository = repository
    }
    
    func execute() async {
        await repository.signOut()
    }
}
