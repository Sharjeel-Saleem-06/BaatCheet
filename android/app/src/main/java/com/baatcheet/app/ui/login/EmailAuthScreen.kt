package com.baatcheet.app.ui.login

import androidx.compose.foundation.Image
import androidx.compose.foundation.background
import androidx.compose.foundation.clickable
import androidx.compose.foundation.layout.*
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.foundation.text.KeyboardActions
import androidx.compose.foundation.text.KeyboardOptions
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.automirrored.filled.ArrowBack
import androidx.compose.material.icons.filled.Visibility
import androidx.compose.material.icons.filled.VisibilityOff
import androidx.compose.material3.*
import androidx.compose.runtime.*
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.clip
import androidx.compose.ui.focus.FocusRequester
import androidx.compose.ui.focus.focusRequester
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.platform.LocalFocusManager
import androidx.compose.ui.platform.LocalUriHandler
import androidx.compose.ui.res.painterResource
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.text.input.ImeAction
import androidx.compose.ui.text.input.KeyboardType
import androidx.compose.ui.text.input.PasswordVisualTransformation
import androidx.compose.ui.text.input.VisualTransformation
import androidx.compose.ui.text.style.TextAlign
import androidx.compose.ui.text.style.TextDecoration
import androidx.compose.ui.tooling.preview.Preview
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import androidx.hilt.navigation.compose.hiltViewModel
import com.baatcheet.app.R
import com.baatcheet.app.ui.theme.BaatCheetTheme
import kotlinx.coroutines.delay
import kotlinx.coroutines.launch

/**
 * EmailAuthScreen - Email and password authentication
 *
 * Features:
 * - Email and password input
 * - Password visibility toggle
 * - Form validation
 * - Social login buttons (Google only for Android)
 * - Terms and Privacy links
 */

@OptIn(ExperimentalMaterial3Api::class)
@Composable
fun EmailAuthScreen(
    onAuthSuccess: () -> Unit = {},
    onDismiss: () -> Unit = {},
    clerkAuthService: ClerkAuthService = hiltViewModel()
) {
    var email by remember { mutableStateOf("") }
    var password by remember { mutableStateOf("") }
    var isLoading by remember { mutableStateOf(false) }
    var isPasswordVisible by remember { mutableStateOf(false) }
    var errorMessage by remember { mutableStateOf<String?>(null) }
    var showVerificationScreen by remember { mutableStateOf(false) }

    val focusManager = LocalFocusManager.current
    val uriHandler = LocalUriHandler.current
    val coroutineScope = rememberCoroutineScope()

    // Email validation
    val isEmailValid = remember(email) {
        android.util.Patterns.EMAIL_ADDRESS.matcher(email).matches()
    }

    // Password validation (minimum 8 characters)
    val isPasswordValid = remember(password) {
        password.length >= 8
    }

    val isFormValid = isEmailValid && isPasswordValid

    if (showVerificationScreen) {
        EmailVerificationScreen(
            email = email,
            onVerificationSuccess = {
                showVerificationScreen = false
                onAuthSuccess()
            },
            onBack = {
                showVerificationScreen = false
            },
            clerkAuthService = clerkAuthService
        )
    } else {
        Box(
            modifier = Modifier
                .fillMaxSize()
                .background(Color.White)
                .clickable(enabled = true, onClick = { focusManager.clearFocus() })
        ) {
            Column(
                modifier = Modifier
                    .fillMaxSize()
                    .padding(horizontal = 24.dp),
                horizontalAlignment = Alignment.CenterHorizontally
            ) {
                Spacer(modifier = Modifier.height(60.dp))

                // Logo - Larger size for better visibility
                Image(
                    painter = painterResource(id = R.drawable.splash_logo),
                    contentDescription = "BaatCheet Logo",
                    modifier = Modifier
                        .size(160.dp)
                        .clip(RoundedCornerShape(32.dp))
                )

                Spacer(modifier = Modifier.height(32.dp))

                // Title
                Text(
                    text = "Log in or sign up",
                    fontSize = 26.sp,
                    fontWeight = FontWeight.Bold,
                    color = Color.Black
                )

                Spacer(modifier = Modifier.height(12.dp))

                // Subtitle
                Text(
                    text = "You'll get smarter responses and can upload files, images and more.",
                    fontSize = 15.sp,
                    color = Color.Gray,
                    textAlign = TextAlign.Center,
                    modifier = Modifier.padding(horizontal = 16.dp)
                )

                Spacer(modifier = Modifier.height(40.dp))

                // Email Field
                Column(modifier = Modifier.fillMaxWidth()) {
                    Text(
                        text = "Email",
                        fontSize = 14.sp,
                        fontWeight = FontWeight.Medium,
                        color = Color.Gray,
                        modifier = Modifier.padding(bottom = 8.dp)
                    )

                    OutlinedTextField(
                        value = email,
                        onValueChange = { email = it; errorMessage = null },
                        modifier = Modifier.fillMaxWidth(),
                        placeholder = { Text("Enter your email", color = Color.Gray) },
                        singleLine = true,
                        keyboardOptions = KeyboardOptions(
                            keyboardType = KeyboardType.Email,
                            imeAction = ImeAction.Next
                        ),
                        colors = OutlinedTextFieldDefaults.colors(
                            focusedBorderColor = Color.Black,
                            unfocusedBorderColor = Color.Gray.copy(alpha = 0.3f),
                            focusedTextColor = Color.Black,
                            unfocusedTextColor = Color.Black,
                            cursorColor = Color.Black,
                            focusedContainerColor = Color.White,
                            unfocusedContainerColor = Color.White
                        ),
                        shape = RoundedCornerShape(12.dp)
                    )
                }

                Spacer(modifier = Modifier.height(16.dp))

                // Password Field
                Column(modifier = Modifier.fillMaxWidth()) {
                    Text(
                        text = "Password",
                        fontSize = 14.sp,
                        fontWeight = FontWeight.Medium,
                        color = Color.Gray,
                        modifier = Modifier.padding(bottom = 8.dp)
                    )

                    OutlinedTextField(
                        value = password,
                        onValueChange = { password = it; errorMessage = null },
                        modifier = Modifier.fillMaxWidth(),
                        placeholder = { Text("Enter your password", color = Color.Gray) },
                        singleLine = true,
                        visualTransformation = if (isPasswordVisible) VisualTransformation.None else PasswordVisualTransformation(),
                        keyboardOptions = KeyboardOptions(
                            keyboardType = KeyboardType.Password,
                            imeAction = ImeAction.Done
                        ),
                        keyboardActions = KeyboardActions(
                            onDone = { focusManager.clearFocus() }
                        ),
                        trailingIcon = {
                            IconButton(onClick = { isPasswordVisible = !isPasswordVisible }) {
                                Icon(
                                    imageVector = if (isPasswordVisible) Icons.Filled.VisibilityOff else Icons.Filled.Visibility,
                                    contentDescription = if (isPasswordVisible) "Hide password" else "Show password",
                                    tint = Color.Gray
                                )
                            }
                        },
                        colors = OutlinedTextFieldDefaults.colors(
                            focusedBorderColor = Color.Black,
                            unfocusedBorderColor = Color.Gray.copy(alpha = 0.3f),
                            focusedTextColor = Color.Black,
                            unfocusedTextColor = Color.Black,
                            cursorColor = Color.Black,
                            focusedContainerColor = Color.White,
                            unfocusedContainerColor = Color.White
                        ),
                        shape = RoundedCornerShape(12.dp)
                    )
                }

                // Error message
                errorMessage?.let {
                    Text(
                        text = it,
                        color = Color.Red,
                        fontSize = 13.sp,
                        modifier = Modifier
                            .fillMaxWidth()
                            .padding(top = 8.dp)
                    )
                }

                Spacer(modifier = Modifier.height(24.dp))

                // Continue Button
                Button(
                    onClick = {
                        if (isFormValid) {
                            coroutineScope.launch {
                                isLoading = true
                                errorMessage = null
                                
                                // Try sign in first
                                when (val signInResult = clerkAuthService.signIn(email, password)) {
                                    is ClerkAuthResult.Success -> {
                                        isLoading = false
                                        onAuthSuccess()
                                    }
                                    is ClerkAuthResult.NeedsVerification -> {
                                        isLoading = false
                                        clerkAuthService.setPendingEmail(email)
                                        showVerificationScreen = true
                                    }
                                    is ClerkAuthResult.Failure -> {
                                        // Sign-in failed - try sign up
                                        val signInError = signInResult.error.message?.lowercase() ?: ""
                                        
                                        if (signInError.contains("invalid email or password")) {
                                            // Try sign up
                                            when (val signUpResult = clerkAuthService.signUp(email, password)) {
                                                is ClerkAuthResult.Success -> {
                                                    isLoading = false
                                                    onAuthSuccess()
                                                }
                                                is ClerkAuthResult.NeedsVerification -> {
                                                    isLoading = false
                                                    clerkAuthService.setPendingEmail(email)
                                                    showVerificationScreen = true
                                                }
                                                is ClerkAuthResult.Failure -> {
                                                    isLoading = false
                                                    val signUpError = signUpResult.error.message?.lowercase() ?: ""
                                                    errorMessage = if (signUpError.contains("already exists")) {
                                                        "Invalid password. Please try again."
                                                    } else {
                                                        signUpResult.error.message ?: "Sign up failed"
                                                    }
                                                }
                                            }
                                        } else {
                                            isLoading = false
                                            errorMessage = signInResult.error.message ?: "Sign in failed"
                                        }
                                    }
                                }
                            }
                        }
                    },
                    modifier = Modifier
                        .fillMaxWidth()
                        .height(52.dp),
                    enabled = isFormValid && !isLoading,
                    colors = ButtonDefaults.buttonColors(
                        containerColor = if (isFormValid) Color.Black else Color.Gray.copy(alpha = 0.15f),
                        contentColor = if (isFormValid) Color.White else Color.Gray,
                        disabledContainerColor = Color.Gray.copy(alpha = 0.15f),
                        disabledContentColor = Color.Gray
                    ),
                    shape = RoundedCornerShape(12.dp)
                ) {
                    if (isLoading) {
                        CircularProgressIndicator(
                            color = Color.White,
                            modifier = Modifier.size(24.dp),
                            strokeWidth = 2.dp
                        )
                    } else {
                        Text(
                            text = "Continue",
                            fontSize = 17.sp,
                            fontWeight = FontWeight.SemiBold
                        )
                    }
                }

                Spacer(modifier = Modifier.height(24.dp))

                // OR Divider
                Row(
                    modifier = Modifier.fillMaxWidth(),
                    verticalAlignment = Alignment.CenterVertically
                ) {
                    HorizontalDivider(
                        modifier = Modifier.weight(1f),
                        color = Color.Gray.copy(alpha = 0.3f)
                    )
                    Text(
                        text = "OR",
                        fontSize = 13.sp,
                        fontWeight = FontWeight.Medium,
                        color = Color.Gray,
                        modifier = Modifier.padding(horizontal = 16.dp)
                    )
                    HorizontalDivider(
                        modifier = Modifier.weight(1f),
                        color = Color.Gray.copy(alpha = 0.3f)
                    )
                }

                Spacer(modifier = Modifier.height(24.dp))

                // Continue with Google Button
                OutlinedButton(
                    onClick = {
                        // TODO: Implement Google Sign In
                    },
                    modifier = Modifier
                        .fillMaxWidth()
                        .height(52.dp),
                    colors = ButtonDefaults.outlinedButtonColors(
                        containerColor = Color.White,
                        contentColor = Color.Black
                    ),
                    border = ButtonDefaults.outlinedButtonBorder.copy(
                        brush = androidx.compose.ui.graphics.SolidColor(Color.Gray.copy(alpha = 0.3f))
                    ),
                    shape = RoundedCornerShape(12.dp)
                ) {
                    Row(
                        horizontalArrangement = Arrangement.Center,
                        verticalAlignment = Alignment.CenterVertically
                    ) {
                        Image(
                            painter = painterResource(id = R.drawable.ic_google),
                            contentDescription = "Google",
                            modifier = Modifier.size(20.dp)
                        )
                        Spacer(modifier = Modifier.width(12.dp))
                        Text(
                            text = "Continue with Google",
                            fontSize = 16.sp,
                            fontWeight = FontWeight.Medium
                        )
                    }
                }

                Spacer(modifier = Modifier.weight(1f))

                // Terms and Privacy
                Row(
                    horizontalArrangement = Arrangement.Center,
                    verticalAlignment = Alignment.CenterVertically,
                    modifier = Modifier.padding(bottom = 40.dp)
                ) {
                    Text(
                        text = "Terms of Use",
                        fontSize = 13.sp,
                        color = Color.Gray,
                        textDecoration = TextDecoration.Underline,
                        modifier = Modifier.clickable { uriHandler.openUri("https://baatcheet.app/terms") }
                    )
                    Text(
                        text = " · ",
                        fontSize = 13.sp,
                        color = Color.Gray
                    )
                    Text(
                        text = "Privacy Policy",
                        fontSize = 13.sp,
                        color = Color.Gray,
                        textDecoration = TextDecoration.Underline,
                        modifier = Modifier.clickable { uriHandler.openUri("https://baatcheet.app/privacy") }
                    )
                }
            }
        }
    }
}

@Composable
fun EmailVerificationScreen(
    email: String,
    onVerificationSuccess: () -> Unit,
    onBack: () -> Unit,
    clerkAuthService: ClerkAuthService = hiltViewModel()
) {
    var verificationCode by remember { mutableStateOf("") }
    var isLoading by remember { mutableStateOf(false) }
    var errorMessage by remember { mutableStateOf<String?>(null) }
    var resendCountdown by remember { mutableIntStateOf(60) }
    var canResend by remember { mutableStateOf(false) }
    val focusRequester = remember { FocusRequester() }
    val coroutineScope = rememberCoroutineScope()

    // Start countdown timer
    LaunchedEffect(Unit) {
        focusRequester.requestFocus()
        while (resendCountdown > 0) {
            delay(1000)
            resendCountdown--
        }
        canResend = true
    }

    // Auto-verify when code is complete
    LaunchedEffect(verificationCode) {
        if (verificationCode.length == 6) {
            isLoading = true
            errorMessage = null
            
            when (val result = clerkAuthService.verifyEmailCode(verificationCode)) {
                is ClerkAuthResult.Success -> {
                    isLoading = false
                    onVerificationSuccess()
                }
                is ClerkAuthResult.NeedsVerification -> {
                    isLoading = false
                    errorMessage = "Invalid code. Please try again."
                    verificationCode = ""
                }
                is ClerkAuthResult.Failure -> {
                    isLoading = false
                    errorMessage = result.error.message ?: "Verification failed"
                    verificationCode = ""
                }
            }
        }
    }

    Box(
        modifier = Modifier
            .fillMaxSize()
            .background(Color.White)
    ) {
        Column(
            modifier = Modifier
                .fillMaxSize()
                .padding(horizontal = 24.dp),
            horizontalAlignment = Alignment.CenterHorizontally
        ) {
            // Back button
            Row(
                modifier = Modifier
                    .fillMaxWidth()
                    .padding(top = 16.dp),
                horizontalArrangement = Arrangement.Start
            ) {
                IconButton(
                    onClick = onBack,
                    modifier = Modifier
                        .size(48.dp)
                        .background(
                            color = Color.Gray.copy(alpha = 0.1f),
                            shape = RoundedCornerShape(24.dp)
                        )
                ) {
                    Icon(
                        imageVector = Icons.AutoMirrored.Filled.ArrowBack,
                        contentDescription = "Back",
                        tint = Color.Black
                    )
                }
            }

            Spacer(modifier = Modifier.height(40.dp))

            // Email Icon
            Icon(
                painter = painterResource(id = R.drawable.ic_mail),
                contentDescription = "Email Verification",
                modifier = Modifier.size(80.dp),
                tint = Color.Black
            )

            Spacer(modifier = Modifier.height(32.dp))

            // Title
            Text(
                text = "Check your email",
                fontSize = 26.sp,
                fontWeight = FontWeight.Bold,
                color = Color.Black
            )

            Spacer(modifier = Modifier.height(12.dp))

            // Subtitle
            Text(
                text = "We sent a verification code to",
                fontSize = 15.sp,
                color = Color.Gray
            )

            Text(
                text = email,
                fontSize = 15.sp,
                fontWeight = FontWeight.SemiBold,
                color = Color.Black
            )

            Spacer(modifier = Modifier.height(40.dp))

            // Code Input
            Column(modifier = Modifier.fillMaxWidth()) {
                Text(
                    text = "Verification Code",
                    fontSize = 14.sp,
                    fontWeight = FontWeight.Medium,
                    color = Color.Gray,
                    modifier = Modifier.padding(bottom = 8.dp)
                )

                OutlinedTextField(
                    value = verificationCode,
                    onValueChange = { newValue ->
                        if (newValue.length <= 6 && newValue.all { it.isDigit() }) {
                            verificationCode = newValue
                        }
                    },
                    modifier = Modifier
                        .fillMaxWidth()
                        .focusRequester(focusRequester),
                    placeholder = { Text("Enter 6-digit code", color = Color.Gray) },
                    singleLine = true,
                    keyboardOptions = KeyboardOptions(
                        keyboardType = KeyboardType.Number,
                        imeAction = ImeAction.Done
                    ),
                    colors = OutlinedTextFieldDefaults.colors(
                        focusedBorderColor = Color.Black,
                        unfocusedBorderColor = Color.Gray.copy(alpha = 0.3f),
                        focusedTextColor = Color.Black,
                        unfocusedTextColor = Color.Black,
                        cursorColor = Color.Black,
                        focusedContainerColor = Color.White,
                        unfocusedContainerColor = Color.White
                    ),
                    shape = RoundedCornerShape(12.dp)
                )
            }

            errorMessage?.let {
                Text(
                    text = it,
                    color = Color.Red,
                    fontSize = 13.sp,
                    modifier = Modifier
                        .fillMaxWidth()
                        .padding(top = 8.dp)
                )
            }

            Spacer(modifier = Modifier.height(24.dp))

            // Verify Button
            Button(
                onClick = {
                    if (verificationCode.length == 6) {
                        coroutineScope.launch {
                            isLoading = true
                            errorMessage = null
                            
                            when (val result = clerkAuthService.verifyEmailCode(verificationCode)) {
                                is ClerkAuthResult.Success -> {
                                    isLoading = false
                                    onVerificationSuccess()
                                }
                                is ClerkAuthResult.NeedsVerification -> {
                                    isLoading = false
                                    errorMessage = "Invalid code. Please try again."
                                    verificationCode = ""
                                }
                                is ClerkAuthResult.Failure -> {
                                    isLoading = false
                                    errorMessage = result.error.message ?: "Verification failed"
                                    verificationCode = ""
                                }
                            }
                        }
                    }
                },
                modifier = Modifier
                    .fillMaxWidth()
                    .height(52.dp),
                enabled = verificationCode.length == 6 && !isLoading,
                colors = ButtonDefaults.buttonColors(
                    containerColor = if (verificationCode.length == 6) Color.Black else Color.Gray.copy(alpha = 0.15f),
                    contentColor = if (verificationCode.length == 6) Color.White else Color.Gray,
                    disabledContainerColor = Color.Gray.copy(alpha = 0.15f),
                    disabledContentColor = Color.Gray
                ),
                shape = RoundedCornerShape(12.dp)
            ) {
                if (isLoading) {
                    CircularProgressIndicator(
                        color = Color.White,
                        modifier = Modifier.size(24.dp),
                        strokeWidth = 2.dp
                    )
                } else {
                    Text(
                        text = "Verify",
                        fontSize = 17.sp,
                        fontWeight = FontWeight.SemiBold
                    )
                }
            }

            Spacer(modifier = Modifier.height(24.dp))

            // Resend Code
            if (canResend) {
                TextButton(
                    onClick = {
                        coroutineScope.launch {
                            canResend = false
                            resendCountdown = 60
                            clerkAuthService.resendVerificationCode()
                            // Restart countdown
                            while (resendCountdown > 0) {
                                delay(1000)
                                resendCountdown--
                            }
                            canResend = true
                        }
                    }
                ) {
                    Text(
                        text = "Resend code",
                        fontSize = 15.sp,
                        fontWeight = FontWeight.Medium,
                        color = MaterialTheme.colorScheme.primary
                    )
                }
            } else {
                Text(
                    text = "Resend code in ${resendCountdown}s",
                    fontSize = 15.sp,
                    color = Color.Gray
                )
            }

            Spacer(modifier = Modifier.weight(1f))
        }
    }
}

@Preview(showBackground = true)
@Composable
fun PreviewEmailAuthScreen() {
    BaatCheetTheme {
        // Cannot preview with hiltViewModel, so just show placeholder
        Box(
            modifier = Modifier
                .fillMaxSize()
                .background(Color.White),
            contentAlignment = Alignment.Center
        ) {
            Text("Email Auth Screen Preview")
        }
    }
}
