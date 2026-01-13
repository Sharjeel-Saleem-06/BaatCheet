//
//  EmailAuthScreen.swift
//  BaatCheet
//
//  ChatGPT-style email authentication screen with password
//

import SwiftUI

struct EmailAuthScreen: View {
    @Environment(\.dismiss) private var dismiss
    @StateObject private var clerkAuth = ClerkAuthService.shared
    
    @State private var email = ""
    @State private var password = ""
    @State private var isLoading = false
    @State private var showError = false
    @State private var errorMessage = ""
    @State private var isEmailValid = false
    @State private var isPasswordVisible = false
    @State private var showVerificationScreen = false
    
    var body: some View {
        ZStack {
            // White Background
            Color.white.ignoresSafeArea()
            
            ScrollView {
                VStack(spacing: 0) {
                    Spacer().frame(height: 20)
                    
                    // Logo - Compact size for better layout
                    Image("SplashLogo")
                        .resizable()
                        .scaledToFit()
                        .frame(width: 100, height: 100)
                        .clipShape(RoundedRectangle(cornerRadius: 20))
                    
                    Spacer().frame(height: 20)
                    
                    // Title
                    Text("Log in or sign up")
                        .font(.system(size: 26, weight: .bold))
                        .foregroundColor(.black)
                    
                    Spacer().frame(height: 8)
                    
                    // Subtitle
                    Text("You'll get smarter responses and can upload files, images and more.")
                        .font(.system(size: 14))
                        .foregroundColor(.gray)
                        .multilineTextAlignment(.center)
                        .padding(.horizontal, 32)
                    
                    Spacer().frame(height: 24)
                    
                    // Form Section
                    VStack(spacing: 16) {
                        // Email Field
                        VStack(alignment: .leading, spacing: 8) {
                            Text("Email")
                                .font(.system(size: 14, weight: .medium))
                                .foregroundColor(.gray)
                            
                            TextField("Enter your email", text: $email)
                                .keyboardType(.emailAddress)
                                .autocapitalization(.none)
                                .autocorrectionDisabled()
                                .font(.system(size: 16))
                                .foregroundColor(.black)
                                .padding(.horizontal, 16)
                                .padding(.vertical, 16)
                                .background(Color.white)
                                .overlay(
                                    RoundedRectangle(cornerRadius: 12)
                                        .stroke(Color.gray.opacity(0.3), lineWidth: 1)
                                )
                                .onChange(of: email) { _ in
                                    validateEmail()
                                }
                        }
                        .padding(.horizontal, 24)
                        
                        // Password Field
                        VStack(alignment: .leading, spacing: 8) {
                            Text("Password")
                                .font(.system(size: 14, weight: .medium))
                                .foregroundColor(.gray)
                            
                            HStack {
                                if isPasswordVisible {
                                    TextField("Enter your password", text: $password)
                                        .font(.system(size: 16))
                                        .foregroundColor(.black)
                                } else {
                                    SecureField("Enter your password", text: $password)
                                        .font(.system(size: 16))
                                        .foregroundColor(.black)
                                }
                                
                                Button(action: { isPasswordVisible.toggle() }) {
                                    Image(systemName: isPasswordVisible ? "eye.slash" : "eye")
                                        .foregroundColor(.gray)
                                }
                            }
                            .padding(.horizontal, 16)
                            .padding(.vertical, 16)
                            .background(Color.white)
                            .overlay(
                                RoundedRectangle(cornerRadius: 12)
                                    .stroke(Color.gray.opacity(0.3), lineWidth: 1)
                            )
                        }
                        .padding(.horizontal, 24)
                        
                        // Continue Button
                        Button(action: { handleContinue() }) {
                            HStack {
                                if isLoading {
                                    ProgressView()
                                        .progressViewStyle(CircularProgressViewStyle(tint: .gray))
                                } else {
                                    Text("Continue")
                                        .font(.system(size: 17, weight: .semibold))
                                }
                            }
                            .frame(maxWidth: .infinity)
                            .frame(height: 52)
                            .background(isFormValid ? Color.black : Color.gray.opacity(0.15))
                            .foregroundColor(isFormValid ? .white : .gray)
                            .cornerRadius(12)
                        }
                        .disabled(!isFormValid || isLoading)
                        .padding(.horizontal, 24)
                        .padding(.top, 8)
                        
                        // OR Divider
                        HStack {
                            Rectangle()
                                .fill(Color.gray.opacity(0.3))
                                .frame(height: 1)
                            
                            Text("OR")
                                .font(.system(size: 13, weight: .medium))
                                .foregroundColor(.gray)
                                .padding(.horizontal, 16)
                            
                            Rectangle()
                                .fill(Color.gray.opacity(0.3))
                                .frame(height: 1)
                        }
                        .padding(.horizontal, 24)
                        .padding(.vertical, 8)
                        
                        // Social Login Buttons
                        VStack(spacing: 12) {
                            // Continue with Apple
                            Button(action: { handleAppleSignIn() }) {
                                HStack(spacing: 12) {
                                    Image("AppleIcon")
                                        .resizable()
                                        .renderingMode(.template)
                                        .foregroundColor(.black)
                                        .frame(width: 20, height: 20)
                                    
                                    Text("Continue with Apple")
                                        .font(.system(size: 16, weight: .medium))
                                        .foregroundColor(.black)
                                }
                                .frame(maxWidth: .infinity)
                                .frame(height: 52)
                                .background(Color.white)
                                .overlay(
                                    RoundedRectangle(cornerRadius: 12)
                                        .stroke(Color.gray.opacity(0.3), lineWidth: 1)
                                )
                            }
                            
                            // Continue with Google
                            Button(action: { handleGoogleSignIn() }) {
                                HStack(spacing: 12) {
                                    Image("GoogleIcon")
                                        .resizable()
                                        .frame(width: 20, height: 20)
                                    
                                    Text("Continue with Google")
                                        .font(.system(size: 16, weight: .medium))
                                        .foregroundColor(.black)
                                }
                                .frame(maxWidth: .infinity)
                                .frame(height: 52)
                                .background(Color.white)
                                .overlay(
                                    RoundedRectangle(cornerRadius: 12)
                                        .stroke(Color.gray.opacity(0.3), lineWidth: 1)
                                )
                            }
                        }
                        .padding(.horizontal, 24)
                    }
                    
                    Spacer().frame(height: 24)
                    
                    // Terms and Privacy
                    HStack(spacing: 4) {
                        Button(action: { openTerms() }) {
                            Text("Terms of Use")
                                .font(.system(size: 13))
                                .foregroundColor(.gray)
                                .underline()
                        }
                        
                        Text("·")
                            .font(.system(size: 13))
                            .foregroundColor(.gray)
                        
                        Button(action: { openPrivacy() }) {
                            Text("Privacy Policy")
                                .font(.system(size: 13))
                                .foregroundColor(.gray)
                                .underline()
                        }
                    }
                    .padding(.bottom, 30)
                }
            }
        }
        .onTapGesture {
            hideKeyboard()
        }
        .alert("Error", isPresented: $showError) {
            Button("OK", role: .cancel) {}
        } message: {
            Text(errorMessage)
        }
        .fullScreenCover(isPresented: $showVerificationScreen) {
            EmailVerificationScreen(
                email: email,
                onVerificationSuccess: {
                    showVerificationScreen = false
                    // Update auth state and dismiss
                    AuthenticationManager.shared.login(email: email, password: password)
                    dismiss()
                },
                onBack: {
                    showVerificationScreen = false
                }
            )
        }
    }
    
    // MARK: - Computed Properties
    private var isFormValid: Bool {
        isEmailValid && password.count >= 8
    }
    
    // MARK: - Validation
    private func validateEmail() {
        let emailRegex = "[A-Z0-9a-z._%+-]+@[A-Za-z0-9.-]+\\.[A-Za-z]{2,64}"
        let emailPredicate = NSPredicate(format: "SELF MATCHES %@", emailRegex)
        isEmailValid = emailPredicate.evaluate(with: email)
    }
    
    // MARK: - Actions
    private func handleContinue() {
        guard isFormValid else { return }
        
        isLoading = true
        errorMessage = ""
        
        Task {
            // Try sign in first
            let signInResult = await clerkAuth.signIn(email: email, password: password)
            
            await MainActor.run {
                switch signInResult {
                case .success(_, _):
                    // User signed in successfully
                    isLoading = false
                    AuthenticationManager.shared.login(email: email, password: password)
                    dismiss()
                    
                case .needsVerification:
                    // Sign-in returned needs verification
                    isLoading = false
                    clerkAuth.setPendingEmail(email)
                    showVerificationScreen = true
                    
                case .failure(let error):
                    // Sign-in failed - check if user doesn't exist
                    let errorMsg = error.localizedDescription.lowercased()
                    
                    // Check if this is a "user not found" error - try sign up
                    if errorMsg.contains("invalid email or password") {
                        // Could be wrong password OR user doesn't exist - try sign up
                        Task {
                            let signUpResult = await clerkAuth.signUp(email: email, password: password)
                            
                            await MainActor.run {
                                isLoading = false
                                
                                switch signUpResult {
                                case .success(_, _):
                                    AuthenticationManager.shared.login(email: email, password: password)
                                    dismiss()
                                    
                                case .needsVerification:
                                    clerkAuth.setPendingEmail(email)
                                    showVerificationScreen = true
                                    
                                case .failure(let signUpError):
                                    // If sign-up also fails with "already exists", it means wrong password
                                    let signUpErrorMsg = signUpError.localizedDescription.lowercased()
                                    if signUpErrorMsg.contains("already exists") {
                                        errorMessage = "Invalid password. Please try again."
                                    } else {
                                        errorMessage = signUpError.localizedDescription
                                    }
                                    showError = true
                                }
                            }
                        }
                    } else {
                        // Other error
                        isLoading = false
                        errorMessage = error.localizedDescription
                        showError = true
                    }
                }
            }
        }
    }
    
    private func handleAppleSignIn() {
        // TODO: Implement Apple Sign In
        print("Apple Sign In tapped")
    }
    
    private func handleGoogleSignIn() {
        // TODO: Implement Google Sign In
        print("Google Sign In tapped")
    }
    
    private func openTerms() {
        if let url = URL(string: "https://baatcheet.app/terms") {
            UIApplication.shared.open(url)
        }
    }
    
    private func openPrivacy() {
        if let url = URL(string: "https://baatcheet.app/privacy") {
            UIApplication.shared.open(url)
        }
    }
    
    private func hideKeyboard() {
        UIApplication.shared.sendAction(#selector(UIResponder.resignFirstResponder), to: nil, from: nil, for: nil)
    }
}

// MARK: - Email Verification Screen
struct EmailVerificationScreen: View {
    let email: String
    let onVerificationSuccess: () -> Void
    let onBack: () -> Void
    
    @State private var verificationCode = ""
    @State private var isLoading = false
    @State private var errorMessage = ""
    @State private var showError = false
    @State private var resendCountdown = 60
    @State private var canResend = false
    @FocusState private var isCodeFocused: Bool
    
    var body: some View {
        ZStack {
            Color.white.ignoresSafeArea()
            
            VStack(spacing: 0) {
                // Back button only (no cross button)
                HStack {
                    Button(action: onBack) {
                        Image(systemName: "arrow.left")
                            .font(.system(size: 20, weight: .medium))
                            .foregroundColor(.black)
                            .padding(12)
                            .background(Color.gray.opacity(0.1))
                            .clipShape(Circle())
                    }
                    Spacer()
                }
                .padding(.horizontal, 16)
                .padding(.top, 16)
                
                Spacer().frame(height: 40)
                
                // Email Icon
                Image(systemName: "envelope.circle.fill")
                    .font(.system(size: 70))
                    .foregroundColor(.black)
                
                Spacer().frame(height: 24)
                
                // Title
                Text("Check your email")
                    .font(.system(size: 26, weight: .bold))
                    .foregroundColor(.black)
                
                Spacer().frame(height: 12)
                
                // Subtitle
                Text("We sent a verification code to")
                    .font(.system(size: 15))
                    .foregroundColor(.gray)
                
                Text(email)
                    .font(.system(size: 15, weight: .semibold))
                    .foregroundColor(.black)
                
                Spacer().frame(height: 32)
                
                // Code Input - Individual digits style
                VStack(alignment: .center, spacing: 12) {
                    Text("Enter verification code")
                        .font(.system(size: 14, weight: .medium))
                        .foregroundColor(.gray)
                    
                    // 6-digit code boxes
                    HStack(spacing: 8) {
                        ForEach(0..<6, id: \.self) { index in
                            CodeDigitBox(
                                digit: getDigit(at: index),
                                isFocused: verificationCode.count == index
                            )
                        }
                    }
                    .overlay(
                        TextField("", text: $verificationCode)
                            .keyboardType(.numberPad)
                            .foregroundColor(.clear)
                            .accentColor(.clear)
                            .focused($isCodeFocused)
                            .frame(width: 1, height: 1)
                            .opacity(0.01)
                            .onChange(of: verificationCode) { newValue in
                                let filtered = newValue.filter { $0.isNumber }
                                if filtered.count > 6 {
                                    verificationCode = String(filtered.prefix(6))
                                } else {
                                    verificationCode = filtered
                                }
                                if verificationCode.count == 6 {
                                    handleVerify()
                                }
                            }
                    )
                    .onTapGesture {
                        isCodeFocused = true
                    }
                }
                .padding(.horizontal, 24)
                
                Spacer().frame(height: 24)
                
                // Verify Button
                Button(action: { handleVerify() }) {
                    HStack {
                        if isLoading {
                            ProgressView()
                                .progressViewStyle(CircularProgressViewStyle(tint: .white))
                        } else {
                            Text("Verify")
                                .font(.system(size: 17, weight: .semibold))
                        }
                    }
                    .frame(maxWidth: .infinity)
                    .frame(height: 52)
                    .background(verificationCode.count == 6 ? Color.black : Color.gray.opacity(0.15))
                    .foregroundColor(verificationCode.count == 6 ? .white : .gray)
                    .cornerRadius(12)
                }
                .disabled(verificationCode.count != 6 || isLoading)
                .padding(.horizontal, 24)
                
                Spacer().frame(height: 24)
                
                // Resend Code
                if canResend {
                    Button(action: { handleResend() }) {
                        Text("Resend code")
                            .font(.system(size: 15, weight: .medium))
                            .foregroundColor(.blue)
                    }
                } else {
                    Text("Resend code in \(resendCountdown)s")
                        .font(.system(size: 15))
                        .foregroundColor(.gray)
                }
                
                Spacer()
            }
        }
        .onAppear {
            isCodeFocused = true
            startResendTimer()
        }
        .alert("Error", isPresented: $showError) {
            Button("OK", role: .cancel) {}
        } message: {
            Text(errorMessage)
        }
    }
    
    private func getDigit(at index: Int) -> String {
        if index < verificationCode.count {
            let startIndex = verificationCode.index(verificationCode.startIndex, offsetBy: index)
            return String(verificationCode[startIndex])
        }
        return ""
    }
    
    private func handleVerify() {
        guard verificationCode.count == 6 else { return }
        
        isLoading = true
        
        Task {
            let result = await ClerkAuthService.shared.verifyEmailCode(code: verificationCode)
            
            await MainActor.run {
                isLoading = false
                
                switch result {
                case .success(_, _):
                    onVerificationSuccess()
                    
                case .needsVerification:
                    errorMessage = "Invalid code. Please try again."
                    showError = true
                    verificationCode = ""
                    
                case .failure(let error):
                    errorMessage = error.localizedDescription
                    showError = true
                    verificationCode = ""
                }
            }
        }
    }
    
    private func handleResend() {
        canResend = false
        resendCountdown = 60
        startResendTimer()
        
        Task {
            _ = await ClerkAuthService.shared.resendVerificationCode()
        }
    }
    
    private func startResendTimer() {
        Timer.scheduledTimer(withTimeInterval: 1.0, repeats: true) { timer in
            if resendCountdown > 0 {
                resendCountdown -= 1
            } else {
                canResend = true
                timer.invalidate()
            }
        }
    }
}

// MARK: - Code Digit Box
struct CodeDigitBox: View {
    let digit: String
    let isFocused: Bool
    
    var body: some View {
        ZStack {
            RoundedRectangle(cornerRadius: 10)
                .stroke(isFocused ? Color.black : Color.gray.opacity(0.3), lineWidth: isFocused ? 2 : 1)
                .background(
                    RoundedRectangle(cornerRadius: 10)
                        .fill(Color.white)
                )
                .frame(width: 48, height: 56)
            
            Text(digit)
                .font(.system(size: 24, weight: .semibold))
                .foregroundColor(.black)
        }
    }
}

// MARK: - Preview
#Preview {
    EmailAuthScreen()
}
