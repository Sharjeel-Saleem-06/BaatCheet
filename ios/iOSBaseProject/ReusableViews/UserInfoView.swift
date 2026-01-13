//
//  UserInfoView.swift
//  SwiftAppTemplate
//
//  Created by Afaq Ahmad on 12/01/24.
//

import SwiftUI

struct UserInfoView: View{
    @Binding var name: String
    @Binding var email: String
    
    var body: some View{
        VStack{
            Image(systemName: "person.crop.rectangle.fill")
                .resizable()
                .frame(width: 150, height: 100)
                .clipShape(Circle())
            TextKeyValueView(key: LocalizedStringKey(AppStrings.name.stringValue()), value: name)
            TextKeyValueView(key: LocalizedStringKey(AppStrings.email.stringValue()), value: email)
        }
        .foregroundColor(.primaryNavyBlue)
    }
}

#Preview {
    UserInfoView(name: Binding.constant("name"), email: Binding.constant("email"))
}
