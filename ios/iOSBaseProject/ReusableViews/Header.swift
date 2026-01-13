//
//  Header.swift
//  SwiftAppTemplate
//
//  Created by Afaq Ahmad on 04/01/24.
//

import SwiftUI

struct Header : View {
    var titleText: LocalizedStringKey?
    var hasBackButton: Bool = false
    var onBackArrowClick: () -> Void = {}
    var hasRightBarButtonItem: Bool = false
    var rightBarButtonItemImageName: String?
    var rightBarButtonItemText: LocalizedStringKey?
    var rightBarButtonItemAction: () -> Void = {}
    var titleAlignment: TextAlignment? = .leading
    var subTitle: LocalizedStringKey? = ""
    var titleImageURL: String?
    var description: String? = ""
    
    var body: some View {
        ZStack(alignment: .leading) {
            HStack {
                if(hasBackButton == true) {
                    Button(action: onBackArrowClick) {
                        Image("backArrow")
                            .foregroundStyle(Color.black)
                    }
                }
                VStack(spacing: 0) {
                    if titleAlignment == .center {
                        Image("profileImage").frame(width: 14, height: 14, alignment: .center)
                            .padding(.bottom, 10)
                        Text(titleText ?? "")
                            .frame(maxWidth: .infinity, alignment: .center)
                            .font(.interBold24)
                            .foregroundColor(.black)
                    } else {
                        Text(titleText ?? "")
                            .frame(maxWidth: .infinity, alignment: .leading)
                            .padding(.leading, 16)
                            .font(.interBold20)
                            .foregroundColor(.black)
                        if subTitle != "" {
                            Text(subTitle ?? "")
                                .frame(maxWidth: .infinity, alignment: .leading)
                                .padding(.leading, 16)
                                .font(.interRegular14)
                                .foregroundColor(.gray)
//                                .textSelection(.disabled)
                        }
                        
                        if description != "" {
                            Text(description ?? "")
                                .frame(maxWidth: .infinity, alignment: .leading)
                                .padding(.leading, 16)
                                .padding(.top, 4)
                                .font(.interRegular12)
                                .foregroundColor(.gray)
                        }
                    }
                }
                
                Button(action: rightBarButtonItemAction) {
                    if(hasRightBarButtonItem) {
                        if (titleImageURL != nil && rightBarButtonItemImageName != "") {
                            if (titleImageURL != "") {
                                AsyncImage(url: URL(string: titleImageURL ?? "")) { image in
                                    image
                                        .resizable() // Make the image resizable
                                        .scaledToFill() // Or .scaledToFill() to fill the frame
                                } placeholder: {
                                    ProgressView() // Show a progress view while loading
                                }
                                .frame(width: 36, height: 36)
                                .cornerRadius(36/2)
                                
                            } else {
                                let initials = rightBarButtonItemImageName ?? "" // Handle nil cases
                                
                                Text(initials) // Display the initials
                                    .font(.interRegular10) // Adjust font size as needed
                                    .frame(width: 36, height: 36)
                                    .foregroundColor(.white) // Or any color you prefer
                                    .background(Color.gray) // Or any background color
                                    .clipShape(Circle()) // Make it a circle
                            }
                        }
                        else if(rightBarButtonItemImageName != nil) {
                            
                            Image(rightBarButtonItemImageName ?? "").foregroundStyle(Color.blue)
                        } else {
                            Text(rightBarButtonItemText ?? "")
                                .fontWeight(.semibold)
                                .foregroundStyle(.blue)
                        }
                    }
                }
            }
        }
        
    }
}

#Preview {
    Header(titleText: "Heading", hasBackButton: true, onBackArrowClick: {
        print("Nothing for now")
    }, hasRightBarButtonItem: true, rightBarButtonItemImageName: nil, rightBarButtonItemText: "Button", rightBarButtonItemAction: {
        print("Nothing for now")
    }, titleAlignment: .leading, subTitle: "abc@gmail.com", titleImageURL: nil)
}
