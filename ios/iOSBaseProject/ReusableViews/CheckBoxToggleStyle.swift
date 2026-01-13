//
//  CheckBoxToggleStyle.swift
//  BaseProjectApp
//
//  Created by Nudrat Jabbar on 30/12/2024.
//

import SwiftUI

struct CheckBoxToggleStyle: ToggleStyle {
    func makeBody(configuration: Configuration) -> some View {
        HStack {
            Image(systemName: configuration.isOn ? "checkmark.square" : "square")
                .resizable()
                .frame(width: 24, height: 24)
                .foregroundColor(configuration.isOn ? .gray : .blue)
                .onTapGesture {
                    configuration.isOn.toggle()
                }
                .padding(.trailing, 20)
            
            configuration.label
        }
    }
}

