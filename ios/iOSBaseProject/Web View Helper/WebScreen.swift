//
//  WebScreen.swift
//  SwiftAppTemplate
//
//  Created by Afaq Ahmad on 03/01/24.
//

import SwiftUI

struct WebScreen: View {
    @Environment(\.presentationMode) var presentationMode
    @State private var isLoading = true
    @State private var showError = false
    var urlString: String?
    var navigationTitle: LocalizedStringKey?

    var body: some View {
        NavigationView {
            ZStack {
                // WebView
                WebView(urlString: urlString ?? "", isLoading: $isLoading, showError: $showError)
                
                // Loader (if loading)
                if isLoading {
                    ProgressView("Loading...")
                        .padding()
                        .background(Color.white.opacity(0.8))
                        .cornerRadius(10)
                }
            }
            .navigationBarTitle(navigationTitle ?? "", displayMode: .inline)
            .navigationBarItems(
                leading: Button(action: {
                    presentationMode.wrappedValue.dismiss() // Dismiss screen
                }) {
                    Image("crossIcon")
                        .foregroundColor(.black)
                }
            )
        }
        .alert(isPresented: $showError) {
            Alert(
                title: Text("Error"),
                message: Text("Cannot load the webpage. Something went wrong."),
                dismissButton: .default(Text("OK"))
            )
        }
    }
}


#Preview {
    WebScreen()
}
