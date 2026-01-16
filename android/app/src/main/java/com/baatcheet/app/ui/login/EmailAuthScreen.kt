package com.baatcheet.app.ui.login

import androidx.compose.foundation.Image
import androidx.compose.foundation.background
import androidx.compose.foundation.clickable
import androidx.compose.foundation.interaction.MutableInteractionSource
import androidx.compose.foundation.layout.*
import androidx.compose.foundation.rememberScrollState
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.foundation.verticalScroll
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
import androidx.compose.ui.text.input.KeyboardCapitalization
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

// Auth mode enum
private enum class AuthMode {
    SIGN_IN,
    SIGN_UP
}

@OptIn(ExperimentalMaterial3Api::class)
@Composable
fun EmailAuthScreen(
    initialMode: String = "signin",
    onAuthSuccess: () -> Unit = {},
    onDismiss: () -> Unit = {},
    clerkAuthService: ClerkAuthService = hiltViewModel()
) {
    var authMode by remember { 
        mutableStateOf(if (initialMode == "signup") AuthMode.SIGN_UP else AuthMode.SIGN_IN) 
    }
    var email by remember { mutableStateOf("") }
    var password by remember { mutableStateOf("") }
    var firstName by remember { mutableStateOf("") }
    var lastName by remember { mutableStateOf("") }
    var isLoading by remember { mutableStateOf(false) }
    var isPasswordVisible by remember { mutableStateOf(false) }
    var errorMessage by remember { mutableStateOf<String?>(null) }
    var showVerificationScreen by remember { mutableStateOf(false) }
    var showForgotPasswordScreen by remember { mutableStateOf(false) }

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
    
    // Name validation for signup
    val isNameValid = remember(firstName) {
        firstName.isNotBlank()
    }

    val isFormValid = if (authMode == AuthMode.SIGN_UP) {
        isEmailValid && isPasswordValid && isNameValid
    } else {
        isEmailValid && isPasswordValid
    }

    val scrollState = rememberScrollState()
    
    if (showForgotPasswordScreen) {
        ForgotPasswordScreen(
            initialEmail = email,
            onBack = { showForgotPasswordScreen = false },
            onPasswordResetSuccess = {
                showForgotPasswordScreen = false
                // Optionally show a success message
            },
            clerkAuthService = clerkAuthService
        )
    } else if (showVerificationScreen) {
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
                .clickable(
                    interactionSource = remember { MutableInteractionSource() },
                    indication = null,
                    onClick = { focusManager.clearFocus() }
                )
                .imePadding()
        ) {
            Column(
                modifier = Modifier
                    .fillMaxSize()
                    .verticalScroll(scrollState)
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

                // Title - changes based on mode
                Text(
                    text = if (authMode == AuthMode.SIGN_UP) "Create your account" else "Welcome back",
                    fontSize = 26.sp,
                    fontWeight = FontWeight.Bold,
                    color = Color.Black
                )

                Spacer(modifier = Modifier.height(12.dp))

                // Subtitle
                Text(
                    text = if (authMode == AuthMode.SIGN_UP) 
                        "Sign up to get smarter responses and access all features." 
                    else 
                        "Sign in to continue your conversations.",
                    fontSize = 15.sp,
                    color = Color.Gray,
                    textAlign = TextAlign.Center,
                    modifier = Modifier.padding(horizontal = 16.dp)
                )

                Spacer(modifier = Modifier.height(40.dp))
                
                // Name fields for signup
                if (authMode == AuthMode.SIGN_UP) {
                    Row(
                        modifier = Modifier.fillMaxWidth(),
                        horizontalArrangement = Arrangement.spacedBy(12.dp)
                    ) {
                        // First Name
                        Column(modifier = Modifier.weight(1f)) {
                            Text(
                                text = "First Name *",
                                fontSize = 14.sp,
                                fontWeight = FontWeight.Medium,
                                color = Color.Gray,
                                modifier = Modifier.padding(bottom = 8.dp)
                            )

                            OutlinedTextField(
                                value = firstName,
                                onValueChange = { firstName = it; errorMessage = null },
                                modifier = Modifier.fillMaxWidth(),
                                placeholder = { Text("First", color = Color.Gray) },
                                singleLine = true,
                                keyboardOptions = KeyboardOptions(
                                    keyboardType = KeyboardType.Text,
                                    imeAction = ImeAction.Next,
                                    capitalization = KeyboardCapitalization.Words
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
                        
                        // Last Name
                        Column(modifier = Modifier.weight(1f)) {
                            Text(
                                text = "Last Name",
                                fontSize = 14.sp,
                                fontWeight = FontWeight.Medium,
                                color = Color.Gray,
                                modifier = Modifier.padding(bottom = 8.dp)
                            )

                            OutlinedTextField(
                                value = lastName,
                                onValueChange = { lastName = it; errorMessage = null },
                                modifier = Modifier.fillMaxWidth(),
                                placeholder = { Text("Last", color = Color.Gray) },
                                singleLine = true,
                                keyboardOptions = KeyboardOptions(
                                    keyboardType = KeyboardType.Text,
                                    imeAction = ImeAction.Next,
                                    capitalization = KeyboardCapitalization.Words
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
                    }
                    
                    Spacer(modifier = Modifier.height(16.dp))
                }

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
                    
                    // Forgot Password (only show for sign in mode)
                    if (authMode == AuthMode.SIGN_IN) {
                        Text(
                            text = "Forgot Password?",
                            fontSize = 14.sp,
                            color = Color(0xFF007AFF),
                            fontWeight = FontWeight.Medium,
                            modifier = Modifier
                                .align(Alignment.End)
                                .padding(top = 8.dp)
                                .clickable(
                                    interactionSource = remember { MutableInteractionSource() },
                                    indication = null
                                ) {
                                    showForgotPasswordScreen = true
                                }
                        )
                    }
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
                                
                                if (authMode == AuthMode.SIGN_IN) {
                                    // Sign in flow
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
                                            isLoading = false
                                            val signInError = signInResult.error.message?.lowercase() ?: ""
                                            errorMessage = if (signInError.contains("invalid email or password")) {
                                                "Invalid email or password. Don't have an account? Sign up below."
                                            } else {
                                                signInResult.error.message ?: "Sign in failed"
                                            }
                                        }
                                    }
                                } else {
                                    // Sign up flow
                                    when (val signUpResult = clerkAuthService.signUp(
                                        email = email, 
                                        password = password,
                                        firstName = firstName.trim().ifBlank { null },
                                        lastName = lastName.trim().ifBlank { null }
                                    )) {
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
                                            errorMessage = if (signUpError.contains("already exists") || signUpError.contains("taken")) {
                                                "An account with this email already exists. Please sign in instead."
                                            } else {
                                                signUpResult.error.message ?: "Sign up failed"
                                            }
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
                            text = if (authMode == AuthMode.SIGN_UP) "Create Account" else "Sign In",
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

                Spacer(modifier = Modifier.height(24.dp))
                
                // Toggle between Sign In and Sign Up
                Row(
                    modifier = Modifier.fillMaxWidth(),
                    horizontalArrangement = Arrangement.Center,
                    verticalAlignment = Alignment.CenterVertically
                ) {
                    Text(
                        text = if (authMode == AuthMode.SIGN_IN) "Don't have an account? " else "Already have an account? ",
                        fontSize = 14.sp,
                        color = Color.Gray
                    )
                    Text(
                        text = if (authMode == AuthMode.SIGN_IN) "Sign Up" else "Sign In",
                        fontSize = 14.sp,
                        fontWeight = FontWeight.Bold,
                        color = Color.Black,
                        modifier = Modifier.clickable(
                            interactionSource = remember { MutableInteractionSource() },
                            indication = null
                        ) { 
                            authMode = if (authMode == AuthMode.SIGN_IN) AuthMode.SIGN_UP else AuthMode.SIGN_IN
                            errorMessage = null
                        }
                    )
                }

                Spacer(modifier = Modifier.height(24.dp))

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
                        modifier = Modifier.clickable(
                            interactionSource = remember { MutableInteractionSource() },
                            indication = null
                        ) { uriHandler.openUri("https://baatcheet.app/terms") }
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
                        modifier = Modifier.clickable(
                            interactionSource = remember { MutableInteractionSource() },
                            indication = null
                        ) { uriHandler.openUri("https://baatcheet.app/privacy") }
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

    val scrollState = rememberScrollState()
    
    Box(
        modifier = Modifier
            .fillMaxSize()
            .background(Color.White)
            .imePadding()
    ) {
        Column(
            modifier = Modifier
                .fillMaxSize()
                .verticalScroll(scrollState)
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

            Spacer(modifier = Modifier.height(40.dp))
        }
    }
}

/**
 * ForgotPasswordScreen - Password reset flow
 * 
 * Steps:
 * 1. Enter email to receive reset code
 * 2. Enter verification code
 * 3. Enter new password
 */
@Composable
fun ForgotPasswordScreen(
    initialEmail: String = "",
    onBack: () -> Unit,
    onPasswordResetSuccess: () -> Unit,
    clerkAuthService: ClerkAuthService = hiltViewModel()
) {
    var email by remember { mutableStateOf(initialEmail) }
    var resetCode by remember { mutableStateOf("") }
    var newPassword by remember { mutableStateOf("") }
    var confirmPassword by remember { mutableStateOf("") }
    var isPasswordVisible by remember { mutableStateOf(false) }
    var isLoading by remember { mutableStateOf(false) }
    var errorMessage by remember { mutableStateOf<String?>(null) }
    var successMessage by remember { mutableStateOf<String?>(null) }
    var currentStep by remember { mutableIntStateOf(1) } // 1: Email, 2: Code, 3: New Password
    var resendCountdown by remember { mutableIntStateOf(0) }
    var canResend by remember { mutableStateOf(true) }
    
    val focusManager = LocalFocusManager.current
    val coroutineScope = rememberCoroutineScope()
    val scrollState = rememberScrollState()
    
    val isEmailValid = remember(email) {
        android.util.Patterns.EMAIL_ADDRESS.matcher(email).matches()
    }
    
    val isPasswordValid = remember(newPassword) {
        newPassword.length >= 8
    }
    
    val passwordsMatch = remember(newPassword, confirmPassword) {
        newPassword == confirmPassword && confirmPassword.isNotEmpty()
    }

    // Countdown timer for resend
    LaunchedEffect(resendCountdown) {
        if (resendCountdown > 0) {
            delay(1000)
            resendCountdown--
            if (resendCountdown == 0) {
                canResend = true
            }
        }
    }

    Box(
        modifier = Modifier
            .fillMaxSize()
            .background(Color.White)
            .clickable(
                interactionSource = remember { MutableInteractionSource() },
                indication = null,
                onClick = { focusManager.clearFocus() }
            )
            .imePadding()
    ) {
        Column(
            modifier = Modifier
                .fillMaxSize()
                .verticalScroll(scrollState)
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
                    onClick = {
                        if (currentStep > 1) {
                            currentStep--
                            errorMessage = null
                            successMessage = null
                        } else {
                            onBack()
                        }
                    },
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
            
            // Title
            Text(
                text = when (currentStep) {
                    1 -> "Reset Password"
                    2 -> "Enter Code"
                    else -> "New Password"
                },
                fontSize = 28.sp,
                fontWeight = FontWeight.Bold,
                color = Color.Black
            )
            
            Spacer(modifier = Modifier.height(12.dp))
            
            // Subtitle
            Text(
                text = when (currentStep) {
                    1 -> "Enter your email address and we'll send you a code to reset your password."
                    2 -> "We sent a 6-digit code to $email. Enter it below."
                    else -> "Create a new password for your account."
                },
                fontSize = 15.sp,
                color = Color.Gray,
                textAlign = TextAlign.Center,
                modifier = Modifier.padding(horizontal = 16.dp)
            )
            
            Spacer(modifier = Modifier.height(40.dp))
            
            when (currentStep) {
                1 -> {
                    // Email input
                    OutlinedTextField(
                        value = email,
                        onValueChange = { email = it; errorMessage = null },
                        modifier = Modifier.fillMaxWidth(),
                        label = { Text("Email Address") },
                        placeholder = { Text("Enter your email") },
                        singleLine = true,
                        keyboardOptions = KeyboardOptions(
                            keyboardType = KeyboardType.Email,
                            imeAction = ImeAction.Done
                        ),
                        colors = OutlinedTextFieldDefaults.colors(
                            focusedBorderColor = Color.Black,
                            unfocusedBorderColor = Color.Gray.copy(alpha = 0.3f)
                        ),
                        shape = RoundedCornerShape(12.dp)
                    )
                }
                2 -> {
                    // Verification code input
                    OutlinedTextField(
                        value = resetCode,
                        onValueChange = { 
                            if (it.length <= 6 && it.all { char -> char.isDigit() }) {
                                resetCode = it
                                errorMessage = null
                            }
                        },
                        modifier = Modifier.fillMaxWidth(),
                        label = { Text("Verification Code") },
                        placeholder = { Text("Enter 6-digit code") },
                        singleLine = true,
                        keyboardOptions = KeyboardOptions(
                            keyboardType = KeyboardType.Number,
                            imeAction = ImeAction.Done
                        ),
                        colors = OutlinedTextFieldDefaults.colors(
                            focusedBorderColor = Color.Black,
                            unfocusedBorderColor = Color.Gray.copy(alpha = 0.3f)
                        ),
                        shape = RoundedCornerShape(12.dp)
                    )
                    
                    Spacer(modifier = Modifier.height(16.dp))
                    
                    // Resend code option
                    if (canResend) {
                        TextButton(
                            onClick = {
                                coroutineScope.launch {
                                    canResend = false
                                    resendCountdown = 60
                                    clerkAuthService.forgotPassword(email)
                                }
                            }
                        ) {
                            Text(
                                text = "Resend code",
                                fontSize = 14.sp,
                                color = Color(0xFF007AFF)
                            )
                        }
                    } else {
                        Text(
                            text = "Resend code in ${resendCountdown}s",
                            fontSize = 14.sp,
                            color = Color.Gray
                        )
                    }
                }
                3 -> {
                    // New password input
                    OutlinedTextField(
                        value = newPassword,
                        onValueChange = { newPassword = it; errorMessage = null },
                        modifier = Modifier.fillMaxWidth(),
                        label = { Text("New Password") },
                        placeholder = { Text("Enter new password") },
                        singleLine = true,
                        visualTransformation = if (isPasswordVisible) VisualTransformation.None else PasswordVisualTransformation(),
                        keyboardOptions = KeyboardOptions(
                            keyboardType = KeyboardType.Password,
                            imeAction = ImeAction.Next
                        ),
                        trailingIcon = {
                            IconButton(onClick = { isPasswordVisible = !isPasswordVisible }) {
                                Icon(
                                    imageVector = if (isPasswordVisible) Icons.Filled.VisibilityOff else Icons.Filled.Visibility,
                                    contentDescription = null,
                                    tint = Color.Gray
                                )
                            }
                        },
                        supportingText = {
                            if (newPassword.isNotEmpty() && !isPasswordValid) {
                                Text("Password must be at least 8 characters", color = Color.Red)
                            }
                        },
                        colors = OutlinedTextFieldDefaults.colors(
                            focusedBorderColor = Color.Black,
                            unfocusedBorderColor = Color.Gray.copy(alpha = 0.3f)
                        ),
                        shape = RoundedCornerShape(12.dp)
                    )
                    
                    Spacer(modifier = Modifier.height(16.dp))
                    
                    // Confirm password input
                    OutlinedTextField(
                        value = confirmPassword,
                        onValueChange = { confirmPassword = it; errorMessage = null },
                        modifier = Modifier.fillMaxWidth(),
                        label = { Text("Confirm Password") },
                        placeholder = { Text("Confirm new password") },
                        singleLine = true,
                        visualTransformation = PasswordVisualTransformation(),
                        keyboardOptions = KeyboardOptions(
                            keyboardType = KeyboardType.Password,
                            imeAction = ImeAction.Done
                        ),
                        isError = confirmPassword.isNotEmpty() && !passwordsMatch,
                        supportingText = {
                            if (confirmPassword.isNotEmpty() && !passwordsMatch) {
                                Text("Passwords don't match", color = Color.Red)
                            }
                        },
                        colors = OutlinedTextFieldDefaults.colors(
                            focusedBorderColor = Color.Black,
                            unfocusedBorderColor = Color.Gray.copy(alpha = 0.3f),
                            errorBorderColor = Color.Red
                        ),
                        shape = RoundedCornerShape(12.dp)
                    )
                }
            }
            
            // Error message
            errorMessage?.let {
                Spacer(modifier = Modifier.height(8.dp))
                Text(
                    text = it,
                    color = Color.Red,
                    fontSize = 13.sp,
                    modifier = Modifier.fillMaxWidth()
                )
            }
            
            // Success message
            successMessage?.let {
                Spacer(modifier = Modifier.height(8.dp))
                Text(
                    text = it,
                    color = Color(0xFF34C759),
                    fontSize = 13.sp,
                    modifier = Modifier.fillMaxWidth()
                )
            }
            
            Spacer(modifier = Modifier.height(32.dp))
            
            // Action button
            Button(
                onClick = {
                    coroutineScope.launch {
                        isLoading = true
                        errorMessage = null
                        
                        when (currentStep) {
                            1 -> {
                                // Send reset code
                                when (val result = clerkAuthService.forgotPassword(email)) {
                                    is ClerkAuthResult.Success -> {
                                        isLoading = false
                                        currentStep = 2
                                        canResend = false
                                        resendCountdown = 60
                                    }
                                    is ClerkAuthResult.Failure -> {
                                        isLoading = false
                                        errorMessage = result.error.message ?: "Failed to send reset code"
                                    }
                                    else -> {
                                        isLoading = false
                                        currentStep = 2 // Proceed anyway as backend always returns success
                                        canResend = false
                                        resendCountdown = 60
                                    }
                                }
                            }
                            2 -> {
                                // Verify code - move to password step
                                if (resetCode.length == 6) {
                                    isLoading = false
                                    currentStep = 3
                                } else {
                                    isLoading = false
                                    errorMessage = "Please enter a 6-digit code"
                                }
                            }
                            3 -> {
                                // Reset password
                                when (val result = clerkAuthService.resetPassword(email, resetCode, newPassword)) {
                                    is ClerkAuthResult.Success -> {
                                        isLoading = false
                                        successMessage = "Password reset successfully! You can now sign in."
                                        delay(2000)
                                        onPasswordResetSuccess()
                                    }
                                    is ClerkAuthResult.Failure -> {
                                        isLoading = false
                                        errorMessage = result.error.message ?: "Failed to reset password"
                                    }
                                    else -> {
                                        isLoading = false
                                        errorMessage = "Failed to reset password"
                                    }
                                }
                            }
                        }
                    }
                },
                modifier = Modifier
                    .fillMaxWidth()
                    .height(52.dp),
                enabled = when (currentStep) {
                    1 -> isEmailValid && !isLoading
                    2 -> resetCode.length == 6 && !isLoading
                    else -> isPasswordValid && passwordsMatch && !isLoading
                },
                colors = ButtonDefaults.buttonColors(
                    containerColor = Color.Black,
                    disabledContainerColor = Color.Gray.copy(alpha = 0.3f)
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
                        text = when (currentStep) {
                            1 -> "Send Reset Code"
                            2 -> "Continue"
                            else -> "Reset Password"
                        },
                        fontSize = 17.sp,
                        fontWeight = FontWeight.SemiBold
                    )
                }
            }
            
            Spacer(modifier = Modifier.height(40.dp))
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
