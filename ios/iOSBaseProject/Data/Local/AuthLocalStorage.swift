//
//  AuthLocalStorage.swift
//  BaatCheet
//
//  Local storage for authentication data
//

import Foundation

/// Protocol for auth local storage operations
protocol AuthLocalStorageProtocol {
    func saveAuthToken(_ token: String)
    func getAuthToken() -> String?
    func saveUser(_ user: User)
    func getUser() -> User?
    func savePendingEmail(_ email: String)
    func getPendingEmail() -> String?
    func clearPendingEmail()
    func clearAll()
}

/// Implementation using UserDefaults
/// Note: In production, tokens should be stored in Keychain for security
final class AuthLocalStorage: AuthLocalStorageProtocol {
    
    private let userDefaults: UserDefaults
    private let encoder: JSONEncoder
    private let decoder: JSONDecoder
    
    // Keys
    private enum Keys {
        static let authToken = "baatcheet_auth_token"
        static let userData = "baatcheet_user_data"
        static let pendingEmail = "baatcheet_pending_email"
    }
    
    init(userDefaults: UserDefaults = .standard) {
        self.userDefaults = userDefaults
        self.encoder = JSONEncoder()
        self.decoder = JSONDecoder()
    }
    
    // MARK: - Token Management
    
    func saveAuthToken(_ token: String) {
        userDefaults.set(token, forKey: Keys.authToken)
    }
    
    func getAuthToken() -> String? {
        userDefaults.string(forKey: Keys.authToken)
    }
    
    // MARK: - User Management
    
    func saveUser(_ user: User) {
        // Convert domain model to DTO for storage
        let dto = UserDTO(
            id: user.id,
            email: user.email,
            firstName: user.firstName,
            lastName: user.lastName,
            avatar: user.avatar,
            role: user.role,
            tier: user.tier
        )
        
        if let encoded = try? encoder.encode(dto) {
            userDefaults.set(encoded, forKey: Keys.userData)
        }
    }
    
    func getUser() -> User? {
        guard let data = userDefaults.data(forKey: Keys.userData),
              let dto = try? decoder.decode(UserDTO.self, from: data) else {
            return nil
        }
        return dto.toDomain()
    }
    
    // MARK: - Pending Email (for verification flow)
    
    func savePendingEmail(_ email: String) {
        userDefaults.set(email, forKey: Keys.pendingEmail)
    }
    
    func getPendingEmail() -> String? {
        userDefaults.string(forKey: Keys.pendingEmail)
    }
    
    func clearPendingEmail() {
        userDefaults.removeObject(forKey: Keys.pendingEmail)
    }
    
    // MARK: - Clear All
    
    func clearAll() {
        userDefaults.removeObject(forKey: Keys.authToken)
        userDefaults.removeObject(forKey: Keys.userData)
        userDefaults.removeObject(forKey: Keys.pendingEmail)
    }
}
