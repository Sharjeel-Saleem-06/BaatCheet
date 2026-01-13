//
//  SplashScreen.swift
//  BaatCheet
//
//  Created by Afaq Ahmad on 04/01/24.
//  Updated for BaatCheet app
//

import SwiftUI

struct SplashScreen: View {
    
    @Environment(\.colorScheme) var colorScheme
    @StateObject var languageManager = AppLanguageManager()
    
    var body: some View {
        ZStack {
            // White background as per Figma design
            Color.white
                .ignoresSafeArea()
            
            VStack {
                Spacer()
                
                // BaatCheet Logo from Figma - increased size for better visibility
                Image("SplashLogo")
                    .resizable()
                    .scaledToFit()
                    .frame(width: 320, height: 320)
                    .clipShape(RoundedRectangle(cornerRadius: 64))
                
                Spacer()
            }
            .padding()
        }
        .environment(\.locale, Locale(identifier: languageManager.language))
        .onAppear {
            setUpColorScheme()
            setUpLocale()
        }
    }
}

#Preview {
    SplashScreen()
}

extension SplashScreen {
    
    func setUpColorScheme() {
        if colorScheme == .dark {
            Preferences.applyAppearance(.dark)
        } else {
            Preferences.applyAppearance(.light)
        }
    }
    
    func setUpLocale() {
        if languageManager.language == "nl" {
            UserPreferences.shared.selectedLanguageCode = LanguagePrefreces.dutch.rawValue
        } else {
            UserPreferences.shared.selectedLanguageCode = LanguagePrefreces.english.rawValue
        }
    }
}
