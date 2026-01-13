//
//  LoaderView.swift
//  SwiftAppTemplate
//
//  Created by Afaq Ahmad on 09/01/24.
//

import SwiftUI

struct ThreeDotLoaderView: View {
    @State var loading = false
    
    // Define a single gradient using hex colors
    let gradient = LinearGradient(
        colors: [Color.fromHexString("#A4006D"), Color.fromHexString("#FF5500")],
        startPoint: .leading,
        endPoint: .trailing
    )
    
    var body: some View {
        ZStack {
            Color.white.opacity(0.3)
                .edgesIgnoringSafeArea(.all)
            
            HStack(spacing: 15) {
                Circle()
                    .fill(Color.fromHexString("#A4006D"))
                    .frame(width: 10, height: 10)
                    .scaleEffect(loading ? 1.5 : 0.9)
                    .animation(.easeInOut(duration: 0.8).repeatForever(autoreverses: true), value: loading)
                Circle()
                    .fill(gradient)
                    .frame(width: 10, height: 10)
                    .scaleEffect(loading ? 1.5 : 0.9)
                    .animation(.easeInOut(duration: 0.8).repeatForever(autoreverses: true).delay(0.2), value: loading)
                Circle()
                    .fill(Color.fromHexString("#FF5500"))
                    .frame(width: 10, height: 10)
                    .scaleEffect(loading ? 1.5 : 0.9)
                    .animation(.easeInOut(duration: 0.8).repeatForever(autoreverses: true).delay(0.4), value: loading)
            }
            .onAppear() {
                self.loading = true
            }
        }
    }
}


#Preview {
    ThreeDotLoaderView()
}


