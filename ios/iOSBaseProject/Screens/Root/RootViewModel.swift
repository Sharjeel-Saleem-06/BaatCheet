//
//  RootViewModel.swift
//  SwiftAppTemplate
//
//  Created by Afaq Ahmad on 03/01/24.
//

import Foundation

@MainActor
class RootViewModel : ObservableObject {
    
    // MARK: - Attributs
    
    @Published var isAppStartCompleted: Bool = false
    @Published var isUserDetailsFilled: Bool = UserPreferences.shared.isProfileComplete
    @Published private(set) var isOnboardingCompleted: Bool = UserPreferences.shared.isOnboardingCompleted
    @Published var isAutheticated: Bool = UserPreferences.shared.isAuthenticated
    
    // MARK: - Functions
    
    func start() async throws {
        guard !isAppStartCompleted else { return }
        
        // All starting set up will be done here
        // testing load time 2 seconds
        DispatchQueue.main.asyncAfter(deadline: .now() + .milliseconds(Int(2 * 1000))) {
            Task {
                do {
                    try await self.languageDownloadedSuccessfully()
                } catch {
                    print("there is some issue")
                }
            }
//            LocalisationManager.shared.fetchAndActivateRemoteConfig()
        }
       
    }
    
    func setInitialScreenVisitedStatus() {
        isUserDetailsFilled = UserPreferences.shared.isProfileComplete
        isOnboardingCompleted = UserPreferences.shared.isOnboardingCompleted
    }
    
    func markUserDetailsCompleted() {
        guard !isUserDetailsFilled else { return }
        
        UserPreferences.shared.isProfileComplete = true
        isUserDetailsFilled = true
    }
    
    func languageDownloadedSuccessfully() async throws {
        await MainActor.run {
            NotificationCenter.default.post(name: .appStartCompleted, object: nil)
           }
    }
    
    func markOnboardingDone() {
        guard !isOnboardingCompleted else { return }
        
        UserPreferences.shared.isOnboardingCompleted = true
        isOnboardingCompleted = true
    }
}

extension Notification.Name {
    static let appStartCompleted = Notification.Name("appStartCompleted")
}
