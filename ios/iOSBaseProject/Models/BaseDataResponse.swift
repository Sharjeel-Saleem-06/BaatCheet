//
//  V.swift
//  BaseProjectApp
//
//  Created by Meesum Raza on 01/01/2025.
//

import Foundation

struct BaseDataResponse<T: Codable>: Codable {
    let status: String
    let message: String
    let statusCode: Int
    let data: T?
    
    enum CodingKeys: String, CodingKey {
        case status
        case message
        case statusCode = "status_code"
        case data
    }
}
