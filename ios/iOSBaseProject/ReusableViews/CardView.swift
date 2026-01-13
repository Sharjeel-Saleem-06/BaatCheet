//
//  CardView.swift
//  SwiftAppTemplate
//
//  Created by Afaq Ahmad on 04/01/24.
//

import SwiftUI

struct CardView: View {
    var title = "Title"
    var subTitle = "SubTitle"
    var backgroundColor = Color.mainBackground
    var cornerRadius = 10.0
    var shadowRadius = 5.0
    var infoAction: () -> Void = {}
    
    var body: some View {
        HStack{
            VStack(spacing: 20){
                Text(title)
                    .font(.interBold20)
                    .foregroundColor(.primaryNavyBlue)
                    .frame(maxWidth: .infinity, alignment: .leading)
                Text(subTitle)
                    .font(.interRegular16)
                    .frame(maxWidth: .infinity, alignment: .leading)
                    .foregroundColor(.secondaryLightBlue)
                    .multilineTextAlignment(.leading)
            }
            Image(systemName: "info.circle")
                .resizable()
                .frame(width: 25, height: 25)
                .foregroundColor(.secondaryLightBlue)
        }
        .padding()
        .background(backgroundColor)
        .cornerRadius(cornerRadius)
        .shadow(color: Color.gray.opacity(0.5), radius: shadowRadius)
    }
}

#Preview {
    CardView(infoAction: {})
}
