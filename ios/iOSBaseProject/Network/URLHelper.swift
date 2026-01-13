//
//  URLHelper.swift
//  BaseProjectApp
//
//  Created by Meesum Raza on 01/01/2025.
//

import Foundation

struct URLHelper {
    static func generateURL(
        baseEndpoint: String,
        withPath endpoint: APIEndpoints,
        pathParams: [String: String]? = nil, // New: Path parameters
        queryParams: [String: String]? = nil
    ) -> URL? {
        // Combine base URL and endpoint path
        var endPointString = endpoint.rawValue
        
        // Replace path parameters
        if let pathParams = pathParams {
            for (key, value) in pathParams {
                let placeholder = "{\(key)}"
                endPointString = endPointString.replacingOccurrences(of: placeholder, with: value)
            }
        }

        let fullPath = baseEndpoint + endPointString


        // Create URLComponents to append query parameters
        guard var urlComponents = URLComponents(string: fullPath) else {
            return nil
        }

        // Add query parameters if provided
        if let queryParams = queryParams {
            urlComponents.queryItems = queryParams.map { URLQueryItem(name: $0.key, value: $0.value) }
        }

        return urlComponents.url
    }
}
