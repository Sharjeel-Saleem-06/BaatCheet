//
//  GenericAlertView.swift
//  BaseProjectApp
//
//  Created by Nudrat Jabbar on 31/12/2024.
//

import SwiftUI

struct GenericAlertModifier: ViewModifier {
    @ObservedObject var alertManager = AlertManager.shared // Use shared instance

    func body(content: Content) -> some View {
        content
            .alert(isPresented: $alertManager.isPresented) {
                if let alertData = alertManager.alertData {
                    if let message = alertData.message{
                        if alertData.secondaryButton == nil {
                            return Alert(
                                title: Text(alertData.title),
                                message: Text(message),
                                dismissButton: alertData.primaryButton
                                )
                        } else {
                            return Alert(
                                title: Text(alertData.title),
                                message: Text(message),
                                primaryButton: alertData.primaryButton,
                                secondaryButton: alertData.secondaryButton ?? .cancel()
                            )
                        }
                        
                    }else{
                        if alertData.secondaryButton == nil {
                            return Alert(
                                title: Text(alertData.title),
                                message: Text(alertData.messageLocalized ?? LocalizedStringKey(AppStrings.error.stringValue())),
                                dismissButton: alertData.primaryButton
                                )
                        } else {
                            return Alert(
                                title: Text(alertData.title),
                                message: Text(alertData.messageLocalized ?? LocalizedStringKey(AppStrings.error.stringValue())),
                                primaryButton: alertData.primaryButton,
                                secondaryButton: alertData.secondaryButton ?? .cancel()
                            )
                        }
                    }
                } else {
                    return Alert(title: Text("Error"))
                }
            }
    }
}

extension View {
    func genericAlert() -> some View {
        modifier(GenericAlertModifier())
    }
}
