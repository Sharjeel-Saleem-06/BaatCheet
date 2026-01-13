//
//  LocalisationManager.swift
//  BaseProjectApp
//
//  Created by Meesum Raza on 13/03/2025.
//

import FirebaseCore
import FirebaseRemoteConfig
import FirebaseStorage
import Foundation
import SwiftUI

enum FileFormat {
    case strings
    case json
}

class LocalisationManager {
    
    static let shared = LocalisationManager()
    private var translations: [String: [String: String]] = [:] // [Language: [Key: Value]]
    private var currentLanguage: String = Locale.current.languageCode ?? "en"
    
    private init() {
        loadLocalization(for: currentLanguage)
    }

    func setLanguage(_ languageCode: String) {
        currentLanguage = languageCode
        loadLocalization(for: languageCode)
    }

    private func loadLocalization(for language: String) {
        let fileURL = getLocalFilePath(fileName: "text_\(language).json", version: getLocalVersion())
        
        guard let data = try? Data(contentsOf: fileURL),
              let content = String(data: data, encoding: .utf8) else {
            print("Failed to load localization file for \(language)")
            return
        }
        
        translations[language] = parseLocalizationFile(content, format: .json)
        self.languageDownloadedSuccessfully()
    }
    
    private func parseLocalizationFile(_ content: String, format: FileFormat) -> [String: String] {
        var localizedData: [String: String] = [:]

        switch format {
        case .strings:
            let lines = content.components(separatedBy: "\n")
            for line in lines {
                guard line.contains("=") else { continue }
                let parts = line.components(separatedBy: "=").map { $0.trimmingCharacters(in: .whitespacesAndNewlines) }
                if parts.count == 2 {
                    let key = parts[0].trimmingCharacters(in: CharacterSet(charactersIn: "\""))
                    let value = parts[1].trimmingCharacters(in: CharacterSet(charactersIn: "\";"))
                    localizedData[key] = value
                }
            }

        case .json:
            if let data = content.data(using: .utf8) {
                do {
                    if let jsonDict = try JSONSerialization.jsonObject(with: data, options: []) as? [String: String] {
                        localizedData = jsonDict
                    }
                } catch {
                    print("Error parsing JSON: \(error.localizedDescription)")
                }
            }
        }
        for (key, value) in localizedData {
            print("Loaded localization: \(key) -> \(value)")
        }
        return localizedData
    }

    func getLocalizedText(for key: String, language: String) -> String? {
        return translations[language]?[key]
    }
    
    func fetchAndActivateRemoteConfig() {
        let remoteConfig = RemoteConfig.remoteConfig()
        let settings = RemoteConfigSettings()
        settings.minimumFetchInterval = 0 // Ensures fresh fetch every time
        remoteConfig.configSettings = settings
        // Fetch Remote Config
        remoteConfig.fetchAndActivate { status, error in
            if status == .successFetchedFromRemote {
                let remoteVersion = remoteConfig[Constants.localisationVersion_FirebaseKey].stringValue ?? ""
                let helpCentreLink = remoteConfig[Constants.helpCentreLink_FirebaseKey].stringValue ?? ""
                let termsAndConditionLink = remoteConfig[Constants.termsAndConditionsLink_FierbaseKey].stringValue ?? ""
                
                self.saveHelpCentreAndTermsAndConidtionLink(helpCentreLink: helpCentreLink, termsAndConditionLink: termsAndConditionLink)
                let localVersion = self.getLocalVersion()
                
                if remoteVersion != localVersion {
                    self.downloadAndSaveLocalization(version: remoteVersion)
                    self.saveLocalVersion(version: remoteVersion)
                }
            } else {
                // Handle fetch failure
                print("Remote Config fetch failed: \(error?.localizedDescription ?? "")")
            }
        }
    }
    

    func downloadAndSaveLocalization(version: String) {
        let storageRef = Storage.storage().reference().child("Localization")

        storageRef.listAll { result, error in
            if let error = error {
                print("Error listing files: \(error.localizedDescription)")
                return
            }
            guard let items = result?.items else { return }
            for item in items {
                item.downloadURL { url, error in
                    if let url = url {
                        self.downloadFile(from: url, to: self.getLocalFilePath(fileName: item.name, version: version).path) { success in
                            if success {
                                print("Downloaded \(item.name) successfully.")
                                DispatchQueue.main.async {
                                    self.loadLocalization(for: self.currentLanguage)
                                }
                            }
                        }
                    }
                }
            }
        }
    }

    
    func downloadFile(from url: URL, to localPath: String, completion: @escaping (Bool) -> Void) {
        let task = URLSession.shared.downloadTask(with: url) { localURL, response, error in
            guard let localURL = localURL, error == nil else {
                print("Download failed: \(error?.localizedDescription ?? "Unknown error")")
                completion(false)
                return
            }

            let destinationURL = URL(fileURLWithPath: localPath)
            let destinationFolder = destinationURL.deletingLastPathComponent() // Get folder path

            let fileManager = FileManager.default

            do {
                if !fileManager.fileExists(atPath: destinationFolder.path) {
                    try fileManager.createDirectory(at: destinationFolder, withIntermediateDirectories: true)
                }
                try fileManager.moveItem(at: localURL, to: destinationURL)
                print("File moved to \(destinationURL.path)")
                completion(true)
            } catch {
                print("Error moving file: \(error.localizedDescription)")
                completion(false)
            }
        }
        task.resume()
    }



    func getLocalFilePath(fileName: String, version: String) -> URL {
        let documentsDirectory = FileManager.default.urls(for: .documentDirectory, in: .userDomainMask)[0]
        let fileURL = documentsDirectory.appendingPathComponent("localization/\(version)/\(fileName)")
        print("File saved at: \(fileURL)")
        return fileURL
    }

    func saveLocalVersion(version: String) {
        UserPreferences.shared.setString(value: version, forKey: UserPreferences.Keys.localisationversion)
    }

    func getLocalVersion() -> String {
        return UserPreferences.shared.getString(forKey: UserPreferences.Keys.localisationversion) ?? "0.0"
    }
    
    func saveHelpCentreAndTermsAndConidtionLink(helpCentreLink: String, termsAndConditionLink: String) {
        UserPreferences.shared.setString(value: helpCentreLink, forKey: Constants.helpCentreLink_FirebaseKey)
        UserPreferences.shared.setString(value: termsAndConditionLink, forKey: Constants.termsAndConditionsLink_FierbaseKey)
    }
    
    func languageDownloadedSuccessfully() {
        Task {
            do {
                try await RootViewModel().languageDownloadedSuccessfully()
            } catch {
                ErrorHandler.logError(message: "Failed to get language downloaded", error: error)
            }
        }
    }

}

