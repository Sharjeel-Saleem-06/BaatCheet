//
//  APIError.swift
//  SwiftAppTemplate
//
//  Created by Afaq Ahmad on 10/01/24.
//

import Foundation


enum AppError: Error, Identifiable {
    var id: String { localizedDescription }

    case apiError(String)
    case networkError
    case serverError(String)
    case decodingError
    case otherError(String)
    case genericError
    case unauthorizedAccess
    case failedToLoadToken
    case tokenStoringFailed


    var localizedDescription: String {
        switch self {
        case .apiError(let message):
            return message
        case .networkError:
            return "Network error: Please connect to internet"
        case .serverError(let message):
            return "Server error - \(message)"
        case .decodingError:
            return "Cannot parse data. Data is not in the correct format"
        case .otherError(let message):
            return message
        case .genericError:
            return "Something went wrong! Please try again."
        case .unauthorizedAccess:
            return "Access denied."
        case .failedToLoadToken:
            return "Something went wrong! Please try again."
        case .tokenStoringFailed:
            return "Failed to store token."
        }
    }
}

