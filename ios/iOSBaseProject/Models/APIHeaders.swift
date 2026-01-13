//
//  APIHeaders.swift
//  BaseProjectApp
//
//  Created by Sanam on 11/02/2025.
//


import Foundation

class APIHeaders: ModelToDictionaryProtocol {
    var language: String?
    var platform: String?
    var accessToken: String?
    var accept: String?
    var client: String?
    var uid: String?
    var contentType: String?
    
    enum CodingKeys: String, CodingKey {
        case client
        case accessToken = "access-token"
        case uid
        case accept
        case language
        case platform
        case contentType = "Content-Type"
    }
    
    init(language: String = UserPreferences.shared.selectedLanguageCode, platform: String = "ios", accessToken: String, client: String, uid: String, contentType: String = "application/json", accept: String = "application/json") {
        
        self.language = language
        self.accessToken = accessToken
        self.client = client
        self.platform = platform
        self.uid = uid
        self.contentType = contentType
        self.accept = accept
    }
    
    init(language: String = UserPreferences.shared.selectedLanguageCode, platform: String = "ios", contentType: String = "application/json", accept: String = "application/json") {
        self.language = language
        self.platform = platform
        self.contentType = contentType
        self.accept = accept
    }
    
    
    required init(from decoder: Decoder) throws {
        let container = try decoder.container(keyedBy: CodingKeys.self)
        accessToken = try container.decodeIfPresent(String.self, forKey: .accessToken)
        platform = try container.decodeIfPresent(String.self, forKey: .platform)
        uid = try container.decodeIfPresent(String.self, forKey: .uid)
        client = try container.decodeIfPresent(String.self, forKey: .client)
        contentType = try container.decodeIfPresent(String.self, forKey: .contentType)
        accept = try container.decodeIfPresent(String.self, forKey: .accept)
        language = UserPreferences.shared.selectedLanguageCode

    }
}
