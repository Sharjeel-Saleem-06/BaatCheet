//
//  ModelToDictionaryProtocol.swift
//  BaseProjectApp
//
//  Created by Sanam on 10/02/2025.
//

import Foundation

protocol ModelToDictionaryProtocol: Codable {
    var dictionary: [String: Any]? { get }
}

extension ModelToDictionaryProtocol {
    
    var dictionary: [String: Any]? {
        let encoder = JSONEncoder()
        do {
            // Encode the model into Data
            let data = try encoder.encode(self)
            
            // Convert the data into a dictionary
            let dictionary = try JSONSerialization.jsonObject(with: data, options: []) as? [String: Any]
            return dictionary
        } catch {
            print("Error converting model to dictionary: \(error)")
            return nil
        }
    }
}
