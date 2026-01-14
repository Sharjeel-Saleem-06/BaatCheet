//
//  DependencyContainer.swift
//  BaatCheet
//
//  Dependency Injection Container
//

import Foundation

/// Dependency container for managing app dependencies.
/// Uses the Service Locator pattern for simplicity.
/// For larger apps, consider using a DI framework like Swinject or Factory.
final class DependencyContainer {
    
    // MARK: - Singleton
    
    static let shared = DependencyContainer()
    
    private init() {}
    
    // MARK: - Data Layer
    
    /// API Client singleton
    lazy var authAPIClient: AuthAPIClientProtocol = {
        AuthAPIClient()
    }()
    
    /// Local storage singleton
    lazy var authLocalStorage: AuthLocalStorageProtocol = {
        AuthLocalStorage()
    }()
    
    // MARK: - Repositories
    
    /// Auth repository singleton
    lazy var authRepository: AuthRepositoryProtocol = {
        AuthRepository(
            apiClient: authAPIClient,
            localStorage: authLocalStorage
        )
    }()
    
    // MARK: - Use Cases
    
    func makeSignInUseCase() -> SignInUseCaseProtocol {
        SignInUseCase(repository: authRepository)
    }
    
    func makeSignUpUseCase() -> SignUpUseCaseProtocol {
        SignUpUseCase(repository: authRepository)
    }
    
    func makeVerifyEmailUseCase() -> VerifyEmailUseCaseProtocol {
        VerifyEmailUseCase(repository: authRepository)
    }
    
    func makeLogoutUseCase() -> LogoutUseCaseProtocol {
        LogoutUseCase(repository: authRepository)
    }
    
    func makeGetCurrentUserUseCase() -> GetCurrentUserUseCaseProtocol {
        GetCurrentUserUseCase(repository: authRepository)
    }
    
    func makeIsAuthenticatedUseCase() -> IsAuthenticatedUseCaseProtocol {
        IsAuthenticatedUseCase(repository: authRepository)
    }
    
    // MARK: - ViewModels
    
    @MainActor
    func makeAuthViewModel() -> AuthViewModel {
        AuthViewModel(
            signInUseCase: makeSignInUseCase(),
            signUpUseCase: makeSignUpUseCase(),
            verifyEmailUseCase: makeVerifyEmailUseCase(),
            logoutUseCase: makeLogoutUseCase(),
            getCurrentUserUseCase: makeGetCurrentUserUseCase(),
            isAuthenticatedUseCase: makeIsAuthenticatedUseCase()
        )
    }
}

// MARK: - Convenience Extensions

extension DependencyContainer {
    /// Quick access to check if user is authenticated
    var isAuthenticated: Bool {
        authRepository.isAuthenticated()
    }
    
    /// Quick access to current user
    var currentUser: User? {
        authRepository.getCurrentUser()
    }
}
