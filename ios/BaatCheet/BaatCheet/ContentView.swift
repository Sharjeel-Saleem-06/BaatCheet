//
//  ContentView.swift
//  BaatCheet
//
//  Created by BaatCheet Team
//  Copyright © 2026 BaatCheet. All rights reserved.
//

import SwiftUI

/// Main content view - Entry point after splash screen
struct ContentView: View {
    @EnvironmentObject var appState: AppState
    
    var body: some View {
        Group {
            if appState.isAuthenticated {
                // Main app content (to be implemented)
                MainTabView()
            } else {
                // Login/Onboarding flow
                LoginView()
            }
        }
    }
}

// MARK: - Placeholder Views
struct MainTabView: View {
    var body: some View {
        TabView {
            Text("Chat")
                .tabItem {
                    Image(systemName: "message.fill")
                    Text("Chat")
                }
            
            Text("History")
                .tabItem {
                    Image(systemName: "clock.fill")
                    Text("History")
                }
            
            Text("Settings")
                .tabItem {
                    Image(systemName: "gearshape.fill")
                    Text("Settings")
                }
        }
    }
}

struct LoginView: View {
    var body: some View {
        // Placeholder - will be implemented next
        Text("Login View")
    }
}

#Preview {
    ContentView()
        .environmentObject(AppState())
}
