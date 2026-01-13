//
//  ClerkAuthService.swift
//  BaatCheet
//
//  Authentication Service for BaatCheet - Uses Backend API
//

import Foundation

// MARK: - API Configuration
struct APIConfig {
    // Backend API URL - adjust for your environment
    // Use your computer's local IP for physical device testing
    #if DEBUG
    static let baseURL = "http://192.168.18.110:5001/api/v1"
    #else
    static let baseURL = "https://api.baatcheet.com/api/v1"
    #endif
    
    static let mobileAuthURL = "\(baseURL)/mobile/auth"
}

// MARK: - Auth Result
enum ClerkAuthResult {
    case success(token: String, userId: String)
    case needsVerification
    case failure(Error)
}

// MARK: - API Response Types
struct AuthResponse: Codable {
    let success: Bool
    let data: AuthData?
    let error: String?
}

struct AuthData: Codable {
    let user: UserData?
    let token: String?
    let status: String?
    let message: String?
    let email: String?
}

struct UserData: Codable {
    let id: String
    let email: String
    let firstName: String?
    let lastName: String?
    let avatar: String?
    let role: String?
    let tier: String?
}

// MARK: - ClerkAuthService
class ClerkAuthService: ObservableObject {
    static let shared = ClerkAuthService()
    
    @Published var isAuthenticated = false
    @Published var currentUserId: String?
    @Published var currentUser: UserData?
    
    private let tokenKey = "baatcheet_auth_token"
    private let userKey = "baatcheet_user_data"
    private var pendingEmail: String?

    private init() {
        // Check for existing session on init
        if let token = getAuthToken() {
            isAuthenticated = true
            loadUserFromStorage()
            // Optionally verify token with server
            Task {
                await refreshUserInfo()
            }
        }
    }
    
    // MARK: - Sign Up with Email
    func signUp(email: String, password: String, firstName: String? = nil, lastName: String? = nil) async -> ClerkAuthResult {
        guard let url = URL(string: "\(APIConfig.mobileAuthURL)/signup") else {
            return .failure(AppError.apiError("Invalid URL"))
        }
        
        var request = URLRequest(url: url)
        request.httpMethod = "POST"
        request.setValue("application/json", forHTTPHeaderField: "Content-Type")
        
        var body: [String: Any] = [
            "email": email,
            "password": password
        ]
        if let firstName = firstName {
            body["firstName"] = firstName
        }
        if let lastName = lastName {
            body["lastName"] = lastName
        }
        
        do {
            request.httpBody = try JSONSerialization.data(withJSONObject: body)
            
            let (data, response) = try await URLSession.shared.data(for: request)
            
            guard let httpResponse = response as? HTTPURLResponse else {
                return .failure(AppError.apiError("Invalid response"))
            }
            
            let decoder = JSONDecoder()
            let authResponse = try decoder.decode(AuthResponse.self, from: data)
            
            if authResponse.success {
                if let authData = authResponse.data {
                    // Check if verification is needed
                    if authData.status == "verification_required" {
                        self.pendingEmail = email
                        return .needsVerification
                    }
                    
                    // User created successfully
                    if let token = authData.token, let user = authData.user {
                        await MainActor.run {
                            self.saveAuthToken(token)
                            self.saveUser(user)
                            self.isAuthenticated = true
                            self.currentUserId = user.id
                            self.currentUser = user
                        }
                        return .success(token: token, userId: user.id)
                    }
                }
            }
            
            // Error response
            let errorMessage = authResponse.error ?? "Sign up failed"
            return .failure(AppError.apiError(errorMessage))
            
        } catch {
            print("Sign up error: \(error.localizedDescription)")
            return .failure(error)
        }
    }
    
    // MARK: - Sign In with Email
    func signIn(email: String, password: String) async -> ClerkAuthResult {
        guard let url = URL(string: "\(APIConfig.mobileAuthURL)/signin") else {
            return .failure(AppError.apiError("Invalid URL"))
        }
        
        var request = URLRequest(url: url)
        request.httpMethod = "POST"
        request.setValue("application/json", forHTTPHeaderField: "Content-Type")
        
        let body: [String: Any] = [
            "email": email,
            "password": password
        ]
        
        do {
            request.httpBody = try JSONSerialization.data(withJSONObject: body)
            
            let (data, response) = try await URLSession.shared.data(for: request)
            
            guard let httpResponse = response as? HTTPURLResponse else {
                return .failure(AppError.apiError("Invalid response"))
            }
            
            let decoder = JSONDecoder()
            let authResponse = try decoder.decode(AuthResponse.self, from: data)
            
            if authResponse.success {
                if let authData = authResponse.data,
                   let token = authData.token,
                   let user = authData.user {
                    await MainActor.run {
                        self.saveAuthToken(token)
                        self.saveUser(user)
                        self.isAuthenticated = true
                        self.currentUserId = user.id
                        self.currentUser = user
                    }
                    return .success(token: token, userId: user.id)
                }
            }
            
            // Check for specific error
            let errorMessage = authResponse.error ?? "Sign in failed"
            
            // If user not found, they need to sign up
            if httpResponse.statusCode == 401 {
                return .failure(AppError.apiError("Invalid email or password. Please check your credentials or sign up."))
            }
            
            return .failure(AppError.apiError(errorMessage))
            
        } catch {
            print("Sign in error: \(error.localizedDescription)")
            return .failure(error)
        }
    }
    
    // MARK: - Verify Email Code
    func verifyEmailCode(code: String) async -> ClerkAuthResult {
        guard let email = pendingEmail else {
            return .failure(AppError.apiError("No pending verification. Please sign up again."))
        }
        
        guard let url = URL(string: "\(APIConfig.mobileAuthURL)/verify-email") else {
            return .failure(AppError.apiError("Invalid URL"))
        }
        
        var request = URLRequest(url: url)
        request.httpMethod = "POST"
        request.setValue("application/json", forHTTPHeaderField: "Content-Type")
        
        let body: [String: Any] = [
            "email": email,
            "code": code
        ]
        
        do {
            request.httpBody = try JSONSerialization.data(withJSONObject: body)
            
            let (data, response) = try await URLSession.shared.data(for: request)
            
            let decoder = JSONDecoder()
            let authResponse = try decoder.decode(AuthResponse.self, from: data)
            
            if authResponse.success {
                if let authData = authResponse.data,
                   let token = authData.token,
                   let user = authData.user {
                    await MainActor.run {
                        self.saveAuthToken(token)
                        self.saveUser(user)
                        self.isAuthenticated = true
                        self.currentUserId = user.id
                        self.currentUser = user
                        self.pendingEmail = nil
                    }
                    return .success(token: token, userId: user.id)
                }
            }
            
            let errorMessage = authResponse.error ?? "Verification failed"
            return .failure(AppError.apiError(errorMessage))
            
        } catch {
            print("Verify email error: \(error.localizedDescription)")
            return .failure(error)
        }
    }
    
    // MARK: - Resend Verification Code
    func resendVerificationCode() async -> Bool {
        guard let email = pendingEmail else {
            print("No pending email for resend")
            return false
        }
        
        guard let url = URL(string: "\(APIConfig.mobileAuthURL)/resend-code") else {
            return false
        }
        
        var request = URLRequest(url: url)
        request.httpMethod = "POST"
        request.setValue("application/json", forHTTPHeaderField: "Content-Type")
        
        let body: [String: Any] = ["email": email]
        
        do {
            request.httpBody = try JSONSerialization.data(withJSONObject: body)
            let (data, response) = try await URLSession.shared.data(for: request)
            
            guard let httpResponse = response as? HTTPURLResponse else {
                return false
            }
            
            return httpResponse.statusCode == 200
        } catch {
            print("Resend code error: \(error.localizedDescription)")
            return false
        }
    }
    
    // MARK: - Refresh User Info
    func refreshUserInfo() async {
        guard let token = getAuthToken() else { return }
        
        guard let url = URL(string: "\(APIConfig.mobileAuthURL)/me") else { return }
        
        var request = URLRequest(url: url)
        request.httpMethod = "GET"
        request.setValue("Bearer \(token)", forHTTPHeaderField: "Authorization")
        
        do {
            let (data, response) = try await URLSession.shared.data(for: request)
            
            guard let httpResponse = response as? HTTPURLResponse,
                  httpResponse.statusCode == 200 else {
                // Token might be invalid
                if (response as? HTTPURLResponse)?.statusCode == 401 {
                    await MainActor.run {
                        self.clearSession()
                    }
                }
                return
            }
            
            struct MeResponse: Codable {
                let success: Bool
                let data: MeData?
            }
            struct MeData: Codable {
                let user: UserData
            }
            
            let decoder = JSONDecoder()
            let meResponse = try decoder.decode(MeResponse.self, from: data)
            
            if let user = meResponse.data?.user {
                await MainActor.run {
                    self.saveUser(user)
                    self.currentUser = user
                    self.currentUserId = user.id
                }
            }
        } catch {
            print("Refresh user info error: \(error.localizedDescription)")
        }
    }
    
    // MARK: - Token Management
    func saveAuthToken(_ token: String) {
        UserDefaults.standard.set(token, forKey: tokenKey)
    }
    
    func getAuthToken() -> String? {
        return UserDefaults.standard.string(forKey: tokenKey)
    }
    
    private func saveUser(_ user: UserData) {
        if let encoded = try? JSONEncoder().encode(user) {
            UserDefaults.standard.set(encoded, forKey: userKey)
        }
    }
    
    private func loadUserFromStorage() {
        if let data = UserDefaults.standard.data(forKey: userKey),
           let user = try? JSONDecoder().decode(UserData.self, from: data) {
            self.currentUser = user
            self.currentUserId = user.id
        }
    }
    
    func clearSession() {
        UserDefaults.standard.removeObject(forKey: tokenKey)
        UserDefaults.standard.removeObject(forKey: userKey)
        isAuthenticated = false
        currentUserId = nil
        currentUser = nil
        pendingEmail = nil
    }
    
    // MARK: - Sign Out
    @MainActor
    func signOut() {
        Task {
            // Call logout endpoint
            if let token = getAuthToken(),
               let url = URL(string: "\(APIConfig.mobileAuthURL)/logout") {
                var request = URLRequest(url: url)
                request.httpMethod = "POST"
                request.setValue("Bearer \(token)", forHTTPHeaderField: "Authorization")
                
                _ = try? await URLSession.shared.data(for: request)
            }
        }
        
        clearSession()
        AuthenticationManager.shared.logout()
    }
    
    // MARK: - Set Pending Email (for verification flow)
    func setPendingEmail(_ email: String) {
        self.pendingEmail = email
    }
    
    func getPendingEmail() -> String? {
        return pendingEmail
    }
}
