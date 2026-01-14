//
//  User.swift
//  BaatCheet
//
//  Domain model for User - Pure Swift, no dependencies
//

import Foundation

/// Domain model representing a user in the application.
/// This model is framework-agnostic and contains only business logic.
struct User: Equatable, Identifiable {
    let id: String
    let email: String
    let firstName: String?
    let lastName: String?
    let avatar: String?
    let role: String?
    let tier: String?
    
    /// Computed property for display name
    var displayName: String {
        if let first = firstName, !first.isEmpty {
            if let last = lastName, !last.isEmpty {
                return "\(first) \(last)"
            }
            return first
        }
        if let last = lastName, !last.isEmpty {
            return last
        }
        return email.components(separatedBy: "@").first ?? email
    }
    
    /// User's initials for avatar placeholder
    var initials: String {
        let first = firstName?.prefix(1) ?? ""
        let last = lastName?.prefix(1) ?? ""
        if first.isEmpty && last.isEmpty {
            return String(email.prefix(2)).uppercased()
        }
        return "\(first)\(last)".uppercased()
    }
}

// MARK: - User Extensions
extension User {
    /// Check if user has premium tier
    var isPremium: Bool {
        tier?.lowercased() == "premium" || tier?.lowercased() == "pro"
    }
    
    /// Check if user is admin
    var isAdmin: Bool {
        role?.lowercased() == "admin"
    }
}
