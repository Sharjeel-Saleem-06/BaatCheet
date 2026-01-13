//
//  LoginScreen.swift
//  BaatCheet
//
//  ChatGPT-style login screen with animated carousel backgrounds
//

import SwiftUI

// MARK: - Carousel Slide Model
struct CarouselSlide: Identifiable {
    let id = UUID()
    let backgroundColor: Color
    let text: String
    let textColor: Color
    let hasImage: Bool
}

// MARK: - Login Screen
struct LoginScreen: View {
    
    // MARK: - Properties
    @State private var currentSlideIndex = 0
    @State private var displayedText = ""
    @State private var isTyping = false
    @State private var timer: Timer?
    @State private var typingTimer: Timer?
    @State private var logoScale: CGFloat = 1.0
    @State private var showContent = true
    @State private var showEmailAuth = false
    
    // Updated colors as requested
    private let slides: [CarouselSlide] = [
        CarouselSlide(
            backgroundColor: Color(hex: "7BE8BE"), // Mint green with logo
            text: "",
            textColor: .black,
            hasImage: true
        ),
        CarouselSlide(
            backgroundColor: Color(hex: "9EF8EE"), // Cyan/Aqua - "Let's brainstorm"
            text: "Let's brainstorm",
            textColor: Color(hex: "0000F5"), // Blue text
            hasImage: false
        ),
        CarouselSlide(
            backgroundColor: Color(hex: "0000F5"), // Blue - "Let's go"
            text: "Let's go",
            textColor: Color(hex: "9EF8EE"), // Cyan text
            hasImage: false
        )
    ]
    
    private let slideInterval: TimeInterval = 4.0
    private let typingSpeed: TimeInterval = 0.08
    
    // MARK: - Body
    var body: some View {
        GeometryReader { geometry in
            ZStack {
                // Animated Background with longer duration for smoother transition
                slides[currentSlideIndex].backgroundColor
                    .ignoresSafeArea()
                    .animation(.easeInOut(duration: 0.8), value: currentSlideIndex)
                
                VStack {
                    Spacer()
                    
                    // Content Area - Clean rendering without fade glitch
                    ZStack {
                        if showContent {
                            if slides[currentSlideIndex].hasImage {
                                // Logo for first slide with bounce
                                Image("LoginImage")
                                    .resizable()
                                    .scaledToFit()
                                    .frame(width: 292, height: 137)
                                    .scaleEffect(logoScale)
                            } else {
                                // Typewriter text for other slides
                                Text(displayedText)
                                    .font(.system(size: 34, weight: .medium))
                                    .foregroundColor(slides[currentSlideIndex].textColor)
                                    .frame(height: 50)
                            }
                        }
                    }
                    .frame(height: 200)
                    
                    Spacer()
                    
                    // Bottom Sheet - extends to bottom
                    bottomSheet
                }
            }
        }
        .onAppear {
            startCarousel()
        }
        .onDisappear {
            timer?.invalidate()
            typingTimer?.invalidate()
        }
        .fullScreenCover(isPresented: $showEmailAuth) {
            EmailAuthScreen()
        }
    }
    
    // MARK: - Bottom Sheet
    private var bottomSheet: some View {
        VStack(spacing: 12) {
            // Continue with Apple Button
            Button(action: { handleAppleSignIn() }) {
                HStack(spacing: 6) {
                    Image("AppleIcon")
                        .resizable()
                        .renderingMode(.template)
                        .foregroundColor(.black)
                        .frame(width: 14, height: 14)
                    
                    Text("Continue with Apple")
                        .font(.system(size: 20, weight: .medium))
                        .foregroundColor(.black)
                }
                .frame(maxWidth: .infinity)
                .frame(height: 50)
                .background(Color.white)
                .cornerRadius(14)
            }
            
            // Continue with Google Button
            Button(action: { handleGoogleSignIn() }) {
                HStack(spacing: 6) {
                    Image("GoogleIcon")
                        .resizable()
                        .frame(width: 16, height: 16)
                    
                    Text("Continue with Google")
                        .font(.system(size: 20, weight: .medium))
                        .foregroundColor(.white)
                }
                .frame(maxWidth: .infinity)
                .frame(height: 50)
                .background(Color.gray.opacity(0.36))
                .cornerRadius(14)
            }
            
            // Sign up with Email Button
            Button(action: { handleEmailSignUp() }) {
                HStack(spacing: 6) {
                    Image("MailIcon")
                        .resizable()
                        .renderingMode(.template)
                        .foregroundColor(.white)
                        .frame(width: 24, height: 24)
                    
                    Text("Sign up with email")
                        .font(.system(size: 20, weight: .medium))
                        .foregroundColor(.white)
                }
                .frame(maxWidth: .infinity)
                .frame(height: 50)
                .background(Color.gray.opacity(0.36))
                .cornerRadius(14)
            }
            
            // Log in Button
            Button(action: { handleLogin() }) {
                Text("Log in")
                    .font(.system(size: 20, weight: .medium))
                    .foregroundColor(.white)
                    .frame(maxWidth: .infinity)
                    .frame(height: 50)
                    .background(Color.black)
                    .overlay(
                        RoundedRectangle(cornerRadius: 14)
                            .stroke(Color.gray.opacity(0.5), lineWidth: 1.5)
                    )
                    .cornerRadius(14)
            }
        }
        .padding(.horizontal, 25)
        .padding(.top, 25)
        .padding(.bottom, 50) // More bottom padding to push buttons up from bottom
        .frame(maxWidth: .infinity)
        .background(
            Color.black
                .ignoresSafeArea(edges: .bottom)
        )
        .clipShape(LoginRoundedCorner(radius: 38, corners: [.topLeft, .topRight]))
    }
    
    // MARK: - Carousel Logic
    private func startCarousel() {
        // Initial setup - show logo with bounce animation
        if slides[currentSlideIndex].hasImage {
            logoScale = 0.8
            withAnimation(.spring(response: 0.6, dampingFraction: 0.7)) {
                logoScale = 1.0
            }
        } else {
            startTypingAnimation()
        }
        
        // Auto-advance slides
        timer = Timer.scheduledTimer(withTimeInterval: slideInterval, repeats: true) { _ in
            advanceToNextSlide()
        }
    }
    
    private func advanceToNextSlide() {
        // Stop any ongoing typing animation
        typingTimer?.invalidate()
        typingTimer = nil
        
        // Hide content instantly to avoid glitch
        showContent = false
        displayedText = ""
        
        // Move to next slide
        currentSlideIndex = (currentSlideIndex + 1) % slides.count
        
        // Show new content after a brief delay
        DispatchQueue.main.asyncAfter(deadline: .now() + 0.2) {
            showContent = true
            
            if slides[currentSlideIndex].hasImage {
                // Logo with bounce animation
                logoScale = 0.7
                withAnimation(.spring(response: 0.6, dampingFraction: 0.6)) {
                    logoScale = 1.0
                }
            } else {
                // Start typewriter for text slides
                startTypingAnimation()
            }
        }
    }
    
    private func startTypingAnimation() {
        displayedText = ""
        let targetText = slides[currentSlideIndex].text
        
        guard !targetText.isEmpty else { return }
        
        isTyping = true
        var charIndex = 0
        
        typingTimer = Timer.scheduledTimer(withTimeInterval: typingSpeed, repeats: true) { timer in
            if charIndex < targetText.count {
                let index = targetText.index(targetText.startIndex, offsetBy: charIndex)
                displayedText += String(targetText[index])
                charIndex += 1
            } else {
                timer.invalidate()
                isTyping = false
            }
        }
    }
    
    // MARK: - Auth Actions
    private func handleAppleSignIn() {
        // TODO: Implement Apple Sign In
        print("Apple Sign In tapped")
    }
    
    private func handleGoogleSignIn() {
        // TODO: Implement Google Sign In
        print("Google Sign In tapped")
    }
    
    private func handleEmailSignUp() {
        showEmailAuth = true
    }
    
    private func handleLogin() {
        showEmailAuth = true
    }
}


// MARK: - Rounded Corner Shape (Login specific)
struct LoginRoundedCorner: Shape {
    var radius: CGFloat = .infinity
    var corners: UIRectCorner = .allCorners
    
    func path(in rect: CGRect) -> Path {
        let path = UIBezierPath(
            roundedRect: rect,
            byRoundingCorners: corners,
            cornerRadii: CGSize(width: radius, height: radius)
        )
        return Path(path.cgPath)
    }
}

// MARK: - Preview
#Preview {
    LoginScreen()
}
