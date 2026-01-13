//
//  AlertManager.swift
//  BaseProject
//
//  Created by Nudrat Jabbar on 31/12/2024.
//

import Foundation
import SwiftUI

struct AlertData {
    let title: LocalizedStringKey
    let message: String?
    let messageLocalized: LocalizedStringKey?
    let primaryButton: Alert.Button
    let secondaryButton: Alert.Button?
}

class AlertManager: ObservableObject {
    static let shared = AlertManager() // Singleton instance
    
    @Published var isPresented = false
    var alertData: AlertData? = nil
    
    private init() {} // Prevent external instantiation
    
    func showAlert(title: LocalizedStringKey, message: String, dismissButton: Alert.Button = .default(Text("OK"))) {
        alertData = AlertData(title: title, message: message, messageLocalized: nil, primaryButton: dismissButton, secondaryButton: nil)
        isPresented = true
    }
    
    func showAlert(title: LocalizedStringKey, message: LocalizedStringKey, dismissButton: Alert.Button = .default(Text("OK"))) {
        alertData = AlertData(title: title, message: nil, messageLocalized: message, primaryButton: dismissButton, secondaryButton: nil)
        isPresented = true
    }
    
//    func showAlertWithTwoButton(title: LocalizedStringKey, message: LocalizedStringKey, firstButton: Alert.Button = .default(Text(LocalizedStringKey(""))), secondButton: Alert.Button = .destructive(Text(LocalizedStringKey("")))) {
//        alertData = AlertData(title: title, message: nil, messageLocalized: message, dismissButton: firstButton, actionButton: .cancel(), secondButton: secondButton, secondButtonAction: secondButton)
//        isPresented = true
//    }
//    
//    func showAlertWithTwoButton(title: LocalizedStringKey, message: String, firstButton: Alert.Button = .default(Text(LocalizedStringKey(""))), secondButton: Alert.Button = .destructive(Text(LocalizedStringKey("")))) {
//        alertData = AlertData(title: title, message: message, messageLocalized: nil, dismissButton: firstButton, actionButton: .cancel(), secondButton: secondButton, secondButtonAction: secondButton)
//        isPresented = true
//    }
    
    func showAlertWithTwoButton(
        title: LocalizedStringKey,
        message: LocalizedStringKey,
        firstButton: Alert.Button = .default(Text("OK")),
        secondButton: Alert.Button = .destructive(Text("Cancel"))
    ) {
        alertData = AlertData(
            title: title,
            message: nil,
            messageLocalized: message,
            primaryButton: firstButton,
            secondaryButton: secondButton
        )
        isPresented = true
    }

    
}

