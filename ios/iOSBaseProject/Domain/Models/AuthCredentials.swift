//
//  AuthCredentials.swift
//  BaatCheet
//
//  Domain model for authentication credentials
//

import Foundation

/// Represents user credentials for authentication.
struct AuthCredentials {
    let email: String
    let password: String
    let firstName: String?
    let lastName: String?
    
    init(email: String, password: String, firstName: String? = nil, lastName: String? = nil) {
        self.email = email
        self.password = password
        self.firstName = firstName
        self.lastName = lastName
    }
    
    // MARK: - Validation
    
    /// Check if email format is valid
    var isEmailValid: Bool {
        let emailRegex = "[A-Z0-9a-z._%+-]+@[A-Za-z0-9.-]+\\.[A-Za-z]{2,64}"
        let emailPredicate = NSPredicate(format: "SELF MATCHES %@", emailRegex)
        return emailPredicate.evaluate(with: email)
    }
    
    /// Check if password meets minimum requirements (8+ characters)
    var isPasswordValid: Bool {
        password.count >= 8
    }
    
    /// Check if all required credentials are valid
    var isValid: Bool {
        isEmailValid && isPasswordValid
    }
    
    /// Get validation error message if any
    var validationError: String? {
        if email.isEmpty {
            return "Email is required"
        }
        if !isEmailValid {
            return "Please enter a valid email address"
        }
        if password.isEmpty {
            return "Password is required"
        }
        if !isPasswordValid {
            return "Password must be at least 8 characters"
        }
        return nil
    }
}
