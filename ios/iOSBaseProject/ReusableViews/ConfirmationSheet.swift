//
//  ConfirmationSheet.swift
//  SwiftAppTemplate
//
//  Created by Afaq Ahmad on 12/01/24.
//

import SwiftUI

struct ConfirmationSheet: View {
    @Binding var isConfirmationGiven: Bool
    @Binding var isOpen: Bool
    var title: LocalizedStringKey = "Are you sure?"
    var subTitle: LocalizedStringKey = "Are you really really sure that you want to go ahead with this action. It can have permanent consequences?"

    
    var body: some View {
        VStack{
            Text(title)
                .fixedSize(horizontal: false, vertical: true)
                .multilineTextAlignment(.center)
                .font(.interBold24)
            Text(subTitle)
                .fixedSize(horizontal: false, vertical: true)
                .multilineTextAlignment(.center)
                .font(.interRegular12)
                .padding()
            HStack{
                TextButton(onClick: {
                    isOpen.toggle()
                }, text: LocalizedStringKey(AppStrings.cancel.stringValue()), style: .outline, color: .primaryNavyBlue)
                TextButton(onClick: {
                    isConfirmationGiven.toggle()
                    isOpen.toggle()
                }, text: LocalizedStringKey(AppStrings.yesSure.stringValue()), style: .filled, color: .primaryNavyBlue)
            }.padding(.bottom, 20)
        }.padding()
    }
}

#Preview {
    ConfirmationSheet(isConfirmationGiven: Binding.constant(false), isOpen: Binding.constant(true))
}
