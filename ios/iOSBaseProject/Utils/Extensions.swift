//
//  Extensions.swift
//  BaseProjectApp
//
//  Created by Meesum Raza on 27/12/2024.
//

import Foundation
import SwiftUI
import UIKit

//extension LinearGradient {
//        
//    static let landingBG = LinearGradient(gradient: Gradient(colors: [Color(hex: "#A4006D"), Color(hex: "#FF5500")]),
//                                          startPoint: .leading,
//                                          endPoint: .trailing)
//    
//    static let clearBG = LinearGradient(gradient: Gradient(colors: [Color.clear, Color.clear]),
//                                          startPoint: .leading,
//                                          endPoint: .trailing)
//    
//    
//  static let screenBg =    LinearGradient(
//      gradient: Gradient(colors: [
//        Color.gradientStart,
//        Color.gradientEnd
//      ]), startPoint: .top, endPoint: .bottom)
//    
//    
////    LinearGradient(
////    gradient: Gradient(colors: [
////        Color(red: 34/255, green: 0/255, blue: 64/255), // Top color (purple)
////        Color(red: 10/255, green: 10/255, blue: 40/255)  // Bottom color (dark blue)
////    ]),
////    startPoint: .top,
////    endPoint: .bottom
////)
//    
//
//    
//    
//  static let notifBG = LinearGradient(gradient: Gradient(colors: [Color(hex: "#A4006D").opacity(0.6), Color(hex: "#FF5500").opacity(0), Color(hex: "#A4006D").opacity(0)]),
//                      startPoint: .bottom,
//                      endPoint: .top)
//}

extension UIColor {
    
    func toHex() -> String {
        guard let components = cgColor.components, components.count >= 3 else {
            return ""
        }
        
        let red = components[0]
        let green = components[1]
        let blue = components[2]
        let alpha = components.count >= 4 ? components[3] : 1.0
        
        return String(format: "#%02lX%02lX%02lX%02lX", lroundf(Float(red) * 255), lroundf(Float(green) * 255), lroundf(Float(blue) * 255), lroundf(Float(alpha) * 255))
    }
}

extension Color {
    
    /// Light Color Code : #F3F2F0 - 100% opacity
    /// Dark Color Code : #101928 - 100% opacity
    var mainBackgroundColor: Color {
        Color("mainBackgroundColor")
    }
    
//    /// Light Color Code : #7095FF - 100% opacity
//    /// Dark Color Code : #7095FF - 100% opacity
//    var blueTextColor: Color {
//        Color("blueTextColor")
//    }
//    
//    /// Light Color Code : #8D92A7 - 100% opacity
//    /// Dark Color Code : #101928 - 100% opacity
//    var greyBlackTextColor: Color {
//        Color("greyBlackTextColor")
//    }
//    
//    /// Light Color Code : #FFFFFF - 100% opacity
//    /// Dark Color Code : #050E17 - 100% opacity
//    var contentViewbackgroundColor: Color {
//        Color("contentViewbackgroundColor")
//    }
//    
//    /// Light Color Code : #1A242E - 100% opacity
//    /// Dark Color Code : #F3F2F0 - 100% opacity
//    var primaryTextColor: Color {
//        Color("primaryTextColor")
//    }
//    
//    /// Light Color Code : #8D92A7 - 100% opacity
//    /// Dark Color Code : #8D92A7 - 100% opacity
//    var secondaryTextColor: Color {
//        Color("secondaryTextColor")
//    }
//    
//    /// Light Color Code : #5856D6 - 100% opacity
//    /// Dark Color Code : #FFFFFF - 100% opacity
//    var selectedTabBarColor: Color {
//        Color("selectedTabBarColor")
//    }
//    
//    /// Light Color Code : #8D92A7 - 100% opacity
//    /// Dark Color Code : #8D92A7 - 100% opacity
//    var unselectedTabBarColor: Color {
//        Color("unslectedTabBarColor")
//    }
//    
//    /// Light Color Code : #1A242E - 10% opacity
//    /// Dark Color Code : #F0F2F5 - 10% opacity
//    var separatorColor: Color {
//        Color("separatorColor")
//    }
//    
//    /// Light Color Code : #FFFFFF - 100% opacity
//    /// Dark Color Code : #FFFFFF - 100% opacity
//    var whiteText: Color {
//        Color("whiteText")
//    }
//    
//    /// Light Color Code : #FF5500 - 100% opacity
//    /// Dark Color Code : #FD5000 - 100% opacity
//    var deleteRed: Color {
//        Color("deleteRed")
//    }
    
    
    
    init(hex: String) {
        let hex = hex.trimmingCharacters(in: CharacterSet.alphanumerics.inverted)
        var int: UInt64 = 0
        Scanner(string: hex).scanHexInt64(&int)
        let a, r, g, b: UInt64
        switch hex.count {
        case 3: // RGB (12-bit)
            (a, r, g, b) = (255, (int >> 8) * 17, (int >> 4 & 0xF) * 17, (int & 0xF) * 17)
        case 6: // RGB (24-bit)
            (a, r, g, b) = (255, int >> 16, int >> 8 & 0xFF, int & 0xFF)
        case 8: // ARGB (32-bit)
            (a, r, g, b) = (int >> 24, int >> 16 & 0xFF, int >> 8 & 0xFF, int & 0xFF)
        default:
            (a, r, g, b) = (1, 1, 1, 0)
        }

        self.init(
            .sRGB,
            red: Double(r) / 255,
            green: Double(g) / 255,
            blue:  Double(b) / 255,
            opacity: Double(a) / 255
        )
        
        func toHex() -> String {
              if #available(iOS 14.0, *) {
                  let uiColor = UIColor(self)
                  return uiColor.toHex()
              } else {
                  return ""
              }
          }
    }
}






