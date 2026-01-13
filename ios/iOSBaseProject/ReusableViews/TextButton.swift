//  TextButton.swift
//  SwiftAppTemplate
//
//  Created by Afaq Ahmad on 05/01/24.
//

import SwiftUI

struct TextButton : View {
    enum Style {
        case filled, outline, textOnly, gradientBG
    }
    
    // MARK: - Attributes
    var onClick: () -> Void
    var text: LocalizedStringKey
    var style: Style = .filled
    var color: Color = .white
    var buttonGradient: LinearGradient = LinearGradient(colors: [Color(hex: "#A4006D"), Color(hex: "#FF5500")], startPoint: .top, endPoint: .bottom)
    
    // MARK: - Views
    var body: some View {
        if #available(iOS 16.0, *) {
            Button(action: onClick){
                if #available(iOS 16.0, *) {
                    Text(text)
                        .font(.interRegular12)
                        .frame(maxWidth: .infinity)
                        .padding(8)
                        .padding(.vertical, 10)
                        .foregroundColor((style == .filled || style == .gradientBG) ? .white : color)
                        .background(
                            LinearGradient(colors: [Color(hex: "#A4006D"), Color(hex: "#FF5500")], startPoint: .top, endPoint: .bottom)
                        )
                        .cornerRadius(16)
                        .overlay(
                            RoundedRectangle(cornerRadius: 16)
                                .inset(by: 0.75)
                                .stroke(style == .outline ? color : .clear, lineWidth: 1.5)
                        )
                        .contentShape(Rectangle())
                } else {
                    // Fallback on earlier versions
                }
                
            }
            .buttonStyle(.plain)
        } else {
            // Fallback on earlier versions
        }
        
    }
}

#Preview {
    VStack{
        TextButton(onClick: {}, text: "Click Me", style: .filled, color: .primaryNavyBlue)
        TextButton(onClick: {}, text: "Click Me", style: .outline, color: .primaryNavyBlue)
        TextButton(onClick: {}, text: "Click Me", style: .textOnly, color: .primaryNavyBlue)
        HStack{
            TextButton(onClick: {}, text: "Click Me", style: .outline, color: .primaryNavyBlue)
            TextButton(onClick: {}, text: "Click Me", style: .filled, color: .primaryNavyBlue)
        }
    }
    .padding()
}
