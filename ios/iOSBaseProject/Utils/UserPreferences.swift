//
//  UserPreferences.swift
//  SwiftAppTemplate
//
//  Created by Afaq Ahmad on 10/01/24.
//

import Foundation

class UserPreferences{
    
    static let shared = UserPreferences()

    private let defaults = UserDefaults.standard

    private init() {}
    
    enum Keys {
        static let user = "user"
        static let userID = "userID"
        static let userDataKey = "userData"
        static let userEmailKey = "userEmailKeyAcess"
        static let isAuthenticated = "isAuthenticated"
        static let isProfileComplete = "isProfileComplete"
        static let isPrivacyPolicyAccepted = "isPrivacyPolicyAccepted"
        static let isOnboardingCompleted = "isOnboardingCompleted"
        static let selectedAppearance = "selectedAppearance"
        static let selectedLanguage = "AppLanguages"
        static let apiHeadersKey = "ApiHeadersKey"
        static let userStatus = "UserLoginStatus_KEY"
        static let userRoleKey = "UserLoginRole_KEY"
        static let termsAndConditions = "terms_and_conditions"
        static let helpCentreLink = "HelpCentre_Link"
        static let localisationversion = "localizationVersion"
    }
    
    func deleteAllUserDefaults() {
        let domain = Bundle.main.bundleIdentifier!
        defaults.removePersistentDomain(forName: domain)
        defaults.synchronize()
    }

    
    func setString(value: String, forKey key: String){
        defaults.set(value, forKey: key)
    }
    
    var userID: Int {
        set{
            defaults.setValue(newValue, forKey: Keys.userID)
        }
        get{
            return defaults.integer(forKey: Keys.userID)
        }
    }
    
//    func getUser() -> User? {
//        if let savedUser = defaults.object(forKey: Keys.user) as? Data {
//            let decoder = JSONDecoder()
//            if let loadedUser = try? decoder.decode(User.self, from: savedUser) {
//                return loadedUser
//            }
//        }
//        return nil
//    }
    
    func getString(forKey key:String) -> String?{
        return defaults.string(forKey: key)
    }
    
    
    func save<T: Codable>(_ object: T, forKey key: String) {
        let encoder = JSONEncoder()
        if let encoded = try? encoder.encode(object) {
            defaults.set(encoded, forKey: key)
            
        }
    }
    
    func get<T: Codable>(forKey key: String, as type: T.Type) -> T? {
        if let savedData = defaults.data(forKey: key) {
            let decoder = JSONDecoder()
            return try? decoder.decode(T.self, from: savedData)
        }
        return nil
    }
    
    func remove(forkey key: String){
        defaults.removeObject(forKey: key)
    }
    
    //Save User Login Status
    func updateUserLoginStatus(status:UserStateEnum){
        defaults.set(status.rawValue, forKey: Keys.userStatus)
    }
    
    // Retrieve User Login Status
    func getUserLoginStatus() -> UserStateEnum? {
        if let rawValue = defaults.string(forKey: Keys.userStatus) {
            return UserStateEnum(rawValue: rawValue)  // Convert back to enum
        }
        return UserStateEnum.LoggedOut
    }
    
//    //Save User Role Status
//    func saveUserRole(status:UserRoleEnum){
//        defaults.set(status.rawValue, forKey: Keys.userRoleKey)
//    }
//    
//    // Retrieve User Role Status
//    func getUserRole() -> UserRoleEnum? {
//        if let rawValue = defaults.string(forKey: Keys.userRoleKey) {
//            return UserRoleEnum(rawValue: rawValue)  // Convert back to enum
//        }
//        return nil
//    }
    
    
    var isAuthenticated: Bool {
        set{
            defaults.setValue(newValue, forKey: Keys.isAuthenticated)
        }
        get{
            return defaults.bool(forKey: Keys.isAuthenticated)
        }
    }
    
    var isProfileComplete: Bool {
        set{
            defaults.setValue(newValue, forKey: Keys.isProfileComplete)
        }
        get{
            return defaults.bool(forKey: Keys.isProfileComplete)
        }
    }
    
    var isPrivacyPolicyAccepted: Bool {
        set{
            defaults.setValue(newValue, forKey: Keys.isPrivacyPolicyAccepted)
        }
        get{
            return defaults.bool(forKey: Keys.isPrivacyPolicyAccepted)
        }
    }
    
    var isOnboardingCompleted: Bool {
        set{
            defaults.setValue(newValue, forKey: Keys.isOnboardingCompleted)
        }
        get{
            return defaults.bool(forKey: Keys.isOnboardingCompleted)
        }
    }
    
    var selectedAppearance: String {
        set{
            defaults.setValue(newValue, forKey: Keys.selectedAppearance)
        }
        get{
            return defaults.string(forKey: Keys.selectedAppearance) ?? ""
        }
    }
    
    var selectedLanguageCode: String {
        set{
            defaults.setValue(newValue, forKey: Keys.selectedLanguage)
        }
        get{
            return defaults.string(forKey: Keys.selectedLanguage) ?? LanguagePrefreces.dutch.rawValue
        }
    }
}
