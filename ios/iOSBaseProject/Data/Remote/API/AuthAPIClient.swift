//
//  AuthAPIClient.swift
//  BaatCheet
//
//  API Client for Authentication endpoints
//

import Foundation

/// API Configuration
struct APIConfiguration {
    static let baseURL = "https://sharry121-baatcheet.hf.space/api/v1"
    static let mobileAuthURL = "\(baseURL)/mobile/auth"
}

/// API Errors
enum APIError: Error, LocalizedError {
    case invalidURL
    case invalidResponse
    case networkError(Error)
    case serverError(Int, String?)
    case decodingError(Error)
    
    var errorDescription: String? {
        switch self {
        case .invalidURL:
            return "Invalid URL"
        case .invalidResponse:
            return "Invalid response from server"
        case .networkError(let error):
            return "Network error: \(error.localizedDescription)"
        case .serverError(let code, let message):
            return message ?? "Server error: \(code)"
        case .decodingError(let error):
            return "Failed to parse response: \(error.localizedDescription)"
        }
    }
}

/// Protocol for Auth API operations
protocol AuthAPIClientProtocol {
    func signIn(request: SignInRequestDTO) async throws -> AuthResponseDTO
    func signUp(request: SignUpRequestDTO) async throws -> AuthResponseDTO
    func verifyEmail(request: VerifyEmailRequestDTO) async throws -> AuthResponseDTO
    func resendCode(request: ResendCodeRequestDTO) async throws -> AuthResponseDTO
    func logout(token: String) async throws
    func getMe(token: String) async throws -> MeResponseDTO
}

/// Implementation of Auth API Client
final class AuthAPIClient: AuthAPIClientProtocol {
    
    private let session: URLSession
    private let decoder: JSONDecoder
    private let encoder: JSONEncoder
    
    init(session: URLSession = .shared) {
        self.session = session
        self.decoder = JSONDecoder()
        self.encoder = JSONEncoder()
    }
    
    // MARK: - API Methods
    
    func signIn(request: SignInRequestDTO) async throws -> AuthResponseDTO {
        let url = try makeURL(path: "/signin")
        return try await post(url: url, body: request)
    }
    
    func signUp(request: SignUpRequestDTO) async throws -> AuthResponseDTO {
        let url = try makeURL(path: "/signup")
        return try await post(url: url, body: request)
    }
    
    func verifyEmail(request: VerifyEmailRequestDTO) async throws -> AuthResponseDTO {
        let url = try makeURL(path: "/verify-email")
        return try await post(url: url, body: request)
    }
    
    func resendCode(request: ResendCodeRequestDTO) async throws -> AuthResponseDTO {
        let url = try makeURL(path: "/resend-code")
        return try await post(url: url, body: request)
    }
    
    func logout(token: String) async throws {
        let url = try makeURL(path: "/logout")
        var urlRequest = URLRequest(url: url)
        urlRequest.httpMethod = "POST"
        urlRequest.setValue("Bearer \(token)", forHTTPHeaderField: "Authorization")
        urlRequest.setValue("application/json", forHTTPHeaderField: "Content-Type")
        
        _ = try await session.data(for: urlRequest)
    }
    
    func getMe(token: String) async throws -> MeResponseDTO {
        let url = try makeURL(path: "/me")
        var urlRequest = URLRequest(url: url)
        urlRequest.httpMethod = "GET"
        urlRequest.setValue("Bearer \(token)", forHTTPHeaderField: "Authorization")
        
        let (data, response) = try await session.data(for: urlRequest)
        
        guard let httpResponse = response as? HTTPURLResponse else {
            throw APIError.invalidResponse
        }
        
        guard (200...299).contains(httpResponse.statusCode) else {
            throw APIError.serverError(httpResponse.statusCode, nil)
        }
        
        return try decoder.decode(MeResponseDTO.self, from: data)
    }
    
    // MARK: - Private Helpers
    
    private func makeURL(path: String) throws -> URL {
        guard let url = URL(string: APIConfiguration.mobileAuthURL + path) else {
            throw APIError.invalidURL
        }
        return url
    }
    
    private func post<T: Encodable, R: Decodable>(url: URL, body: T) async throws -> R {
        var request = URLRequest(url: url)
        request.httpMethod = "POST"
        request.setValue("application/json", forHTTPHeaderField: "Content-Type")
        request.httpBody = try encoder.encode(body)
        
        let (data, response) = try await session.data(for: request)
        
        guard let httpResponse = response as? HTTPURLResponse else {
            throw APIError.invalidResponse
        }
        
        // Even for error status codes, try to decode the response
        // as the API returns error messages in the response body
        do {
            return try decoder.decode(R.self, from: data)
        } catch {
            if !(200...299).contains(httpResponse.statusCode) {
                throw APIError.serverError(httpResponse.statusCode, nil)
            }
            throw APIError.decodingError(error)
        }
    }
}
