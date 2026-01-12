//
//  BaatCheetApp.swift
//  BaatCheet
//
//  Created by BaatCheet Team
//  Copyright © 2026 BaatCheet. All rights reserved.
//

import SwiftUI

@main
struct BaatCheetApp: App {
    // MARK: - State
    @StateObject private var appState = AppState()
    @State private var showSplash = true
    
    // MARK: - Body
    var body: some Scene {
        WindowGroup {
            ZStack {
                // Main content (will show after splash)
                ContentView()
                    .environmentObject(appState)
                
                // Splash screen overlay
                if showSplash {
                    SplashScreen(isPresented: $showSplash)
                        .transition(.opacity)
                        .zIndex(1)
                }
            }
            .animation(.easeInOut(duration: 0.5), value: showSplash)
        }
    }
}

// MARK: - App State
/// Global app state management
class AppState: ObservableObject {
    @Published var isAuthenticated: Bool = false
    @Published var user: User? = nil
    @Published var isLoading: Bool = false
    
    // Add more app-wide state as needed
}

// MARK: - User Model
struct User: Codable, Identifiable {
    let id: String
    let email: String
    let name: String?
    let avatarUrl: String?
}
