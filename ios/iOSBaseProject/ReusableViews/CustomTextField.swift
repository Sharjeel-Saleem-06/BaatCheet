//
//  CustomTextField.swift
//  SwiftAppTemplate
//
//  Created by Afaq Ahmad on 09/01/24.
//

import SwiftUI

struct CustomTextField: View {
    @Binding var inputText: String
    @Binding var error: LocalizedStringKey?
    var placeholder: LocalizedStringKey
    var cornerRadius: CGFloat
    var borderColor: Color
    var height : CGFloat?
    var width : CGFloat?
    
    @FocusState private var isFocused: Bool

    var body: some View {
        VStack {
            ZStack(alignment: .leading) {
                TextField(placeholder, text: $inputText)
                    .foregroundColor(.primary)
                    .font(.interRegular15)
                    .frame(width: width, height: height)
                    .padding(.horizontal, 8)
                    .padding(.vertical, 14)
                    .background(
                        RoundedRectangle(cornerRadius: cornerRadius)
                            .fill(Color.white)
                            .overlay(
                                Group {
                                    if error == nil {
                                        RoundedRectangle(cornerRadius: cornerRadius)
                                            .stroke(isFocused ? Color.fromHexString("#A4006D") : Color.clear, lineWidth: 2)
                                    } else {
                                        RoundedRectangle(cornerRadius: cornerRadius)
                                            .stroke(Color.red, lineWidth: 2)
                                    }
                                }
                            )
                    )
                    .textInputAutocapitalization(.never)
                    .focused($isFocused)
            }
            .frame(height: 50)

            // ✅ Error text below TextField
            if error != "", let errorMessage = error {
                    Text(errorMessage)
                        .font(.interRegular14)
                        .foregroundColor(.red)
                        .frame(maxWidth: .infinity, alignment: .leading)
            }
        }
    }
}


#Preview {
    CustomTextField(
        inputText: Binding.constant(""), error: Binding.constant(""),
        placeholder: "Enter Text",
        cornerRadius: 8,
        borderColor: Color.blue,
        height: UIScreen.main.bounds.height * 0.065,
        width: UIScreen.main.bounds.width
    )
}
