//
//  CustomSecureTextField.swift
//  BaseProjectApp
//
//  Created by Nudrat Jabbar on 30/12/2024.
//

import SwiftUI

struct CustomSecureTextField: View {
    @Binding var text: String
    @Binding var error: LocalizedStringKey?
    let placeholder: LocalizedStringKey
    let cornerRadius: CGFloat
    let backgroundColor: Color
    
    @State private var isPasswordVisible: Bool = false
    @FocusState private var isPasswordFocused: Bool
    
    var body: some View {
        VStack{
            HStack {
                if isPasswordVisible {
                    TextField(placeholder, text: $text)
                        .font(.interRegular15)
                        .autocapitalization(.none)
                        .disableAutocorrection(true)
                } else {
                    SecureField(placeholder, text: $text)
                        .font(.interRegular15)

                    
                }
                
                Button(action: {
                    isPasswordVisible.toggle()
                }) {
                    Image(systemName: isPasswordVisible ? "eye.slash" : "eye")
                        .foregroundColor(.gray)
                }
            }
            .padding(14)
            .frame(height: 50)
            .background(
                RoundedRectangle(cornerRadius: cornerRadius)
                    .fill(backgroundColor)
                    .overlay(
                        Group{
                            if error == nil {
                                RoundedRectangle(cornerRadius: cornerRadius)
                                    .stroke(isPasswordFocused ? Color.fromHexString("#A4006D") : Color.clear, lineWidth: 2)
                            }else{
                                RoundedRectangle(cornerRadius: cornerRadius)
                                    .stroke(error == nil ? Color.clear :  Color.red , lineWidth: 2)
                            }
                        }
                    )
            )
            .focused($isPasswordFocused)
        }
        
        //Error text below TextField
        if error != "", let errorMessage = error {
                Text(errorMessage)
                    .font(.interRegular14)
                    .foregroundColor(.red)
                    .frame(maxWidth: .infinity, alignment: .leading)
        }
    }
}
