//
//  KeyChainStorage.swift
//  SwiftAppTemplate
//
//  Created by Afaq Ahmad on 10/01/24.
//

import KeychainSwift

class KeyChainStorage {
    static let shared = KeyChainStorage()
    
    private init() {}
    
    private let keychainInstance = KeychainSwift()
    
    private let AUTH_TOKEN: String = "AUTH_TOKEN"
    private let CLIENT: String = "CLIENT"
    private let PASSWORD: String = "PASSWORD"
    private let uid: String = "UID"
    
    func setAuthToken(_ value: String) -> Bool {
        return keychainInstance.set(value, forKey: AUTH_TOKEN)
    }
    
    func setClient(_ value: String) -> Bool {
        return keychainInstance.set(value, forKey: CLIENT)
    }
    
    func getClient() -> String? {
        keychainInstance.get(CLIENT)
    }
    
    func setuid(_ value: String) -> Bool {
        return keychainInstance.set(value, forKey: uid)
    }
    
    func getuid() -> String? {
        keychainInstance.get(uid)
    }
    
    func getAuthToken() -> String? {
        keychainInstance.get(AUTH_TOKEN)
    }
    
    func setPassword(_ value: String) {
        keychainInstance.set(value, forKey: PASSWORD)
    }
    
    func getPassword() -> String {
        keychainInstance.get(PASSWORD)!
    }
    
    func deleteAllKey(){
        keychainInstance.delete(AUTH_TOKEN)
        keychainInstance.delete(PASSWORD)
    }
}
