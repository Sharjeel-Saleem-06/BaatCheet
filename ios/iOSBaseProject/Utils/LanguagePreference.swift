//
//  LanguagePrefreces.swift
//  BaseProjectApp
//
//  Created by Meesum Raza on 26/12/2024.
//

import Foundation
import SwiftUI

enum LanguagePrefreces: String, Codable {
    case english = "en-gb"
    case dutch = "nl-nl"
    
    var localized: String {
        switch self {
        case .english: return "English"
        case .dutch: return "Dutch"
        }
    }
}

class AppLanguageManager: ObservableObject {
    @Published var language: String = Locale.current.language.languageCode?.identifier ?? "en"

    init() {
        NotificationCenter.default.addObserver(
            self,
            selector: #selector(updateLanguage),
            name: NSLocale.currentLocaleDidChangeNotification,
            object: nil
        )
    }

    @objc func updateLanguage() {
        DispatchQueue.main.async {
            self.language = Locale.current.language.languageCode?.identifier ?? "en"
        }
    }
}
