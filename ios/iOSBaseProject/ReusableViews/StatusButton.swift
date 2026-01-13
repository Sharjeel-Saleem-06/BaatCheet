//
//  StatusButton.swift
//  BaseProjectApp
//
//  Created by Afaq Ahmad on 03/03/2025.
//


import SwiftUI

struct StatusButton: View {
    var statusMessage: String? = ""
    var action: () -> Void

    var body: some View {
        Button(action: {
            action()
        }) {
            HStack {
                Image("person-running")
                    .foregroundColor(.white)
                    .font(.title2)
                    .padding(.leading, 10)

                Text("Status")
                    .foregroundColor(.white)
                    .font(.headline)
                    .padding(.leading, 5)

                Spacer()

                Text(statusMessage ?? "")
                    .foregroundColor(.white)
                    .font(.headline)

                Image(systemName: "chevron.right")
                    .foregroundColor(.white)
                    .font(.title3)
                    .padding(.trailing, 10)
            }
            .frame(height: 50)
            .padding(.horizontal)
            .background(LinearGradient(colors: [Color(hex: "#A4006D"), Color(hex: "#FF5500")], startPoint: .top, endPoint: .bottom))
            .cornerRadius(12)
        }
        .buttonStyle(PlainButtonStyle()) // Removes default button styling
    }
}
