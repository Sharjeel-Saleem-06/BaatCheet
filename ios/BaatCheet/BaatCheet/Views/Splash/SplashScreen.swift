//
//  SplashScreen.swift
//  BaatCheet
//
//  Created by BaatCheet Team
//  Copyright © 2026 BaatCheet. All rights reserved.
//

import SwiftUI

/// Splash screen following Apple's HIG (Human Interface Guidelines)
/// - Displays the BaatCheet logo with smooth animations
/// - Auto-dismisses after a brief delay
/// - Supports both light and dark mode
struct SplashScreen: View {
    // MARK: - Properties
    @Binding var isPresented: Bool
    
    // Animation states
    @State private var logoScale: CGFloat = 0.5
    @State private var logoOpacity: Double = 0
    @State private var textOpacity: Double = 0
    @State private var urduTextOpacity: Double = 0
    @State private var isAnimating: Bool = false
    
    // MARK: - Constants
    private enum Constants {
        static let animationDuration: Double = 0.8
        static let staggerDelay: Double = 0.2
        static let displayDuration: Double = 2.5
        static let logoSize: CGFloat = 80
        static let titleFontSize: CGFloat = 42
        static let urduFontSize: CGFloat = 24
    }
    
    // MARK: - Colors (matching Figma design)
    private enum BrandColors {
        static let primary = Color(hex: "1E3A8A")      // Deep Blue
        static let secondary = Color(hex: "10B981")    // Teal/Green for Urdu text
        static let iconTeal = Color(hex: "14B8A6")     // Teal for icon accents
        static let background = Color.white
    }
    
    // MARK: - Body
    var body: some View {
        ZStack {
            // Background
            BrandColors.background
                .ignoresSafeArea()
            
            // Content
            VStack(spacing: 0) {
                Spacer()
                
                // Logo and Text Container
                HStack(alignment: .center, spacing: 8) {
                    // Chat Bubble Icon with circuit nodes
                    ChatBubbleIcon()
                        .frame(width: Constants.logoSize, height: Constants.logoSize)
                        .scaleEffect(logoScale)
                        .opacity(logoOpacity)
                    
                    // Brand Name
                    VStack(alignment: .leading, spacing: 2) {
                        Text("BaatCheet")
                            .font(.system(size: Constants.titleFontSize, weight: .bold, design: .rounded))
                            .foregroundColor(BrandColors.primary)
                            .opacity(textOpacity)
                        
                        // Urdu Text
                        Text("باتچیت")
                            .font(.system(size: Constants.urduFontSize, weight: .medium))
                            .foregroundColor(BrandColors.secondary)
                            .opacity(urduTextOpacity)
                    }
                }
                
                Spacer()
                
                // Optional: Loading indicator
                if isAnimating {
                    ProgressView()
                        .progressViewStyle(CircularProgressViewStyle(tint: BrandColors.primary))
                        .scaleEffect(1.2)
                        .padding(.bottom, 50)
                        .opacity(urduTextOpacity)
                }
            }
        }
        .onAppear {
            startAnimations()
        }
    }
    
    // MARK: - Animations
    private func startAnimations() {
        // Logo scale and fade in
        withAnimation(.spring(response: 0.6, dampingFraction: 0.7)) {
            logoScale = 1.0
            logoOpacity = 1.0
        }
        
        // Title text fade in (staggered)
        withAnimation(.easeOut(duration: Constants.animationDuration).delay(Constants.staggerDelay)) {
            textOpacity = 1.0
        }
        
        // Urdu text fade in (more staggered)
        withAnimation(.easeOut(duration: Constants.animationDuration).delay(Constants.staggerDelay * 2)) {
            urduTextOpacity = 1.0
            isAnimating = true
        }
        
        // Dismiss splash after display duration
        DispatchQueue.main.asyncAfter(deadline: .now() + Constants.displayDuration) {
            withAnimation(.easeOut(duration: 0.5)) {
                isPresented = false
            }
        }
    }
}

// MARK: - Chat Bubble Icon
/// Custom chat bubble icon with circuit/AI nodes (matching Figma design)
struct ChatBubbleIcon: View {
    private let primaryColor = Color(hex: "1E3A8A")
    private let tealColor = Color(hex: "14B8A6")
    
    var body: some View {
        GeometryReader { geometry in
            let size = min(geometry.size.width, geometry.size.height)
            
            ZStack {
                // Chat bubble outline
                ChatBubbleShape()
                    .stroke(primaryColor, lineWidth: size * 0.04)
                    .frame(width: size * 0.9, height: size * 0.75)
                
                // Circuit nodes inside bubble
                CircuitNodes(size: size)
            }
            .frame(width: size, height: size)
        }
    }
}

// MARK: - Chat Bubble Shape
struct ChatBubbleShape: Shape {
    func path(in rect: CGRect) -> Path {
        var path = Path()
        
        let width = rect.width
        let height = rect.height
        let cornerRadius = width * 0.2
        let tailWidth = width * 0.15
        let tailHeight = height * 0.2
        
        // Start from bottom left (after tail)
        path.move(to: CGPoint(x: tailWidth, y: height - tailHeight))
        
        // Bottom left corner
        path.addLine(to: CGPoint(x: cornerRadius, y: height - tailHeight))
        path.addQuadCurve(
            to: CGPoint(x: 0, y: height - tailHeight - cornerRadius),
            control: CGPoint(x: 0, y: height - tailHeight)
        )
        
        // Left side
        path.addLine(to: CGPoint(x: 0, y: cornerRadius))
        
        // Top left corner
        path.addQuadCurve(
            to: CGPoint(x: cornerRadius, y: 0),
            control: CGPoint(x: 0, y: 0)
        )
        
        // Top side
        path.addLine(to: CGPoint(x: width - cornerRadius, y: 0))
        
        // Top right corner
        path.addQuadCurve(
            to: CGPoint(x: width, y: cornerRadius),
            control: CGPoint(x: width, y: 0)
        )
        
        // Right side
        path.addLine(to: CGPoint(x: width, y: height - tailHeight - cornerRadius))
        
        // Bottom right corner
        path.addQuadCurve(
            to: CGPoint(x: width - cornerRadius, y: height - tailHeight),
            control: CGPoint(x: width, y: height - tailHeight)
        )
        
        // Bottom side to tail
        path.addLine(to: CGPoint(x: tailWidth + cornerRadius, y: height - tailHeight))
        
        // Tail
        path.addLine(to: CGPoint(x: tailWidth * 0.5, y: height))
        path.addLine(to: CGPoint(x: tailWidth, y: height - tailHeight))
        
        path.closeSubpath()
        
        return path
    }
}

// MARK: - Circuit Nodes
/// The AI/circuit nodes inside the chat bubble
struct CircuitNodes: View {
    let size: CGFloat
    private let tealColor = Color(hex: "14B8A6")
    
    var body: some View {
        let nodeSize = size * 0.08
        let lineWidth = size * 0.02
        
        ZStack {
            // Horizontal lines
            VStack(spacing: size * 0.12) {
                HorizontalLine(width: size * 0.45)
                HorizontalLine(width: size * 0.45)
                HorizontalLine(width: size * 0.45)
            }
            .stroke(tealColor, lineWidth: lineWidth)
            .offset(y: -size * 0.08)
            
            // Nodes on lines
            VStack(spacing: size * 0.12) {
                HStack(spacing: size * 0.15) {
                    Circle().fill(tealColor).frame(width: nodeSize, height: nodeSize)
                    Circle().fill(tealColor).frame(width: nodeSize, height: nodeSize)
                }
                HStack(spacing: size * 0.25) {
                    Circle().fill(tealColor).frame(width: nodeSize, height: nodeSize)
                    Circle().fill(tealColor).frame(width: nodeSize, height: nodeSize)
                }
                HStack(spacing: size * 0.1) {
                    Circle().fill(tealColor).frame(width: nodeSize, height: nodeSize)
                    Circle().fill(tealColor).frame(width: nodeSize, height: nodeSize)
                    Circle().fill(tealColor).frame(width: nodeSize, height: nodeSize)
                }
            }
            .offset(y: -size * 0.08)
        }
    }
}

// MARK: - Horizontal Line Shape
struct HorizontalLine: Shape {
    let width: CGFloat
    
    func path(in rect: CGRect) -> Path {
        var path = Path()
        let centerY = rect.midY
        let centerX = rect.midX
        
        path.move(to: CGPoint(x: centerX - width/2, y: centerY))
        path.addLine(to: CGPoint(x: centerX + width/2, y: centerY))
        
        return path
    }
}

// MARK: - Color Extension
extension Color {
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
            blue: Double(b) / 255,
            opacity: Double(a) / 255
        )
    }
}

// MARK: - Preview
#Preview {
    SplashScreen(isPresented: .constant(true))
}
