//
//  AuthViewModel.swift
//  BaatCheet
//
//  ViewModel for Authentication - MVVM Pattern
//

import Foundation
import Combine

/// Authentication UI State
struct AuthState: Equatable {
    var isLoading: Bool = false
    var isAuthenticated: Bool = false
    var needsVerification: Bool = false
    var currentUser: User? = nil
    var pendingEmail: String? = nil
    var error: String? = nil
    
    static func == (lhs: AuthState, rhs: AuthState) -> Bool {
        lhs.isLoading == rhs.isLoading &&
        lhs.isAuthenticated == rhs.isAuthenticated &&
        lhs.needsVerification == rhs.needsVerification &&
        lhs.currentUser?.id == rhs.currentUser?.id &&
        lhs.pendingEmail == rhs.pendingEmail &&
        lhs.error == rhs.error
    }
}

/// Authentication Events
enum AuthEvent {
    case signIn(email: String, password: String)
    case signUp(email: String, password: String, firstName: String?, lastName: String?)
    case verifyEmail(code: String)
    case resendCode
    case logout
    case clearError
    case setPendingEmail(String)
}

/// Authentication ViewModel
/// Follows MVVM pattern with unidirectional data flow.
@MainActor
final class AuthViewModel: ObservableObject {
    
    // MARK: - Published State
    
    @Published private(set) var state = AuthState()
    
    // MARK: - Dependencies (Use Cases)
    
    private let signInUseCase: SignInUseCaseProtocol
    private let signUpUseCase: SignUpUseCaseProtocol
    private let verifyEmailUseCase: VerifyEmailUseCaseProtocol
    private let logoutUseCase: LogoutUseCaseProtocol
    private let getCurrentUserUseCase: GetCurrentUserUseCaseProtocol
    private let isAuthenticatedUseCase: IsAuthenticatedUseCaseProtocol
    
    // MARK: - Private State
    
    private var pendingEmail: String?
    
    // MARK: - Initialization
    
    init(
        signInUseCase: SignInUseCaseProtocol,
        signUpUseCase: SignUpUseCaseProtocol,
        verifyEmailUseCase: VerifyEmailUseCaseProtocol,
        logoutUseCase: LogoutUseCaseProtocol,
        getCurrentUserUseCase: GetCurrentUserUseCaseProtocol,
        isAuthenticatedUseCase: IsAuthenticatedUseCaseProtocol
    ) {
        self.signInUseCase = signInUseCase
        self.signUpUseCase = signUpUseCase
        self.verifyEmailUseCase = verifyEmailUseCase
        self.logoutUseCase = logoutUseCase
        self.getCurrentUserUseCase = getCurrentUserUseCase
        self.isAuthenticatedUseCase = isAuthenticatedUseCase
        
        // Check initial auth state
        checkAuthState()
    }
    
    // MARK: - Event Handling
    
    func handle(_ event: AuthEvent) {
        switch event {
        case .signIn(let email, let password):
            Task { await signIn(email: email, password: password) }
            
        case .signUp(let email, let password, let firstName, let lastName):
            Task { await signUp(email: email, password: password, firstName: firstName, lastName: lastName) }
            
        case .verifyEmail(let code):
            Task { await verifyEmail(code: code) }
            
        case .resendCode:
            Task { await resendCode() }
            
        case .logout:
            Task { await logout() }
            
        case .clearError:
            state.error = nil
            
        case .setPendingEmail(let email):
            pendingEmail = email
            state.pendingEmail = email
        }
    }
    
    // MARK: - Private Methods
    
    private func checkAuthState() {
        if isAuthenticatedUseCase.execute() {
            state.isAuthenticated = true
            state.currentUser = getCurrentUserUseCase.execute()
        }
    }
    
    private func signIn(email: String, password: String) async {
        state.isLoading = true
        state.error = nil
        
        let result = await signInUseCase.execute(email: email, password: password)
        
        handleAuthResult(result, email: email)
    }
    
    private func signUp(email: String, password: String, firstName: String?, lastName: String?) async {
        state.isLoading = true
        state.error = nil
        
        let credentials = AuthCredentials(
            email: email,
            password: password,
            firstName: firstName,
            lastName: lastName
        )
        
        let result = await signUpUseCase.execute(credentials: credentials)
        
        handleAuthResult(result, email: email)
    }
    
    private func verifyEmail(code: String) async {
        guard let email = pendingEmail ?? state.pendingEmail else {
            state.error = "No pending email for verification"
            return
        }
        
        state.isLoading = true
        state.error = nil
        
        let result = await verifyEmailUseCase.execute(email: email, code: code)
        
        switch result {
        case .success(_, _, let user):
            pendingEmail = nil
            state.isLoading = false
            state.isAuthenticated = true
            state.needsVerification = false
            state.currentUser = user
            state.pendingEmail = nil
            state.error = nil
            
        case .needsVerification:
            state.isLoading = false
            state.error = "Invalid code. Please try again."
            
        case .failure(let error):
            state.isLoading = false
            state.error = error.localizedDescription
        }
    }
    
    private func resendCode() async {
        // This would typically call a resend use case
        // For now, just clear any error
        state.error = nil
    }
    
    private func logout() async {
        state.isLoading = true
        
        await logoutUseCase.execute()
        
        // Reset state
        state = AuthState()
    }
    
    private func handleAuthResult(_ result: AuthResult, email: String) {
        switch result {
        case .success(_, _, let user):
            state.isLoading = false
            state.isAuthenticated = true
            state.currentUser = user
            state.error = nil
            
        case .needsVerification:
            pendingEmail = email
            state.isLoading = false
            state.needsVerification = true
            state.pendingEmail = email
            
        case .failure(let error):
            state.isLoading = false
            state.error = error.localizedDescription
        }
    }
}

// MARK: - Convenience Factory

extension AuthViewModel {
    /// Create AuthViewModel with default dependencies
    static func create() -> AuthViewModel {
        DependencyContainer.shared.makeAuthViewModel()
    }
}
