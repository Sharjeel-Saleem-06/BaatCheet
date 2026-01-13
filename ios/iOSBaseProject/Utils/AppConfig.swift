//
//  AppConfig.swift
//  SwiftAppTemplate
//
//  Created by Afaq Ahmad on 08/01/24.
//
import Foundation

enum AppConfig {
    
    private static let configDict: [String: Any] = {
        guard let dict = Bundle.main.infoDictionary else {
            fatalError("info.plist not found")
        }
        return dict
    }()
    
    static let BASE_URL: String = {
        guard let urlString = configDict[Constants.BASE_URL] as? String else {
            fatalError("base url not found")
        }
        return urlString
    }()
    
    static let EXAMPLE_KEY : String = {
        guard let key = configDict[Constants.EXAMPLE_KEY] as? String else {
            fatalError("example key not found")
        }
        return key
    }()
    
    static let APP_VERSION : String = {
        guard let key = configDict[Constants.APP_VERSION] as? String else {
            fatalError("App version key not found")
        }
        return key
    }()
}
