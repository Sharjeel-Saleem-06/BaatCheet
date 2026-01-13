//
//  TextKeyValueView.swift
//  SwiftAppTemplate
//
//  Created by Afaq Ahmad on 09/01/24.
//

import SwiftUI

struct TextKeyValueView: View {
    var key: LocalizedStringKey
    var value: String
    
    var body: some View {
        HStack{
            Text(key) + Text(":")
            Text(value)
        }.frame(alignment: .leading)
    }
}

#Preview {
    TextKeyValueView(key:"Name", value: "User Name")
}
