package com.baatcheet.app.ui.login

import androidx.compose.animation.AnimatedContent
import androidx.compose.animation.core.Spring
import androidx.compose.animation.core.animateFloatAsState
import androidx.compose.animation.core.spring
import androidx.compose.animation.core.tween
import androidx.compose.animation.animateColorAsState
import androidx.compose.animation.fadeIn
import androidx.compose.animation.fadeOut
import androidx.compose.animation.scaleIn
import androidx.compose.animation.scaleOut
import androidx.compose.animation.togetherWith
import androidx.compose.foundation.Image
import androidx.compose.foundation.background
import androidx.compose.foundation.layout.*
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material3.*
import androidx.compose.runtime.*
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.alpha
import androidx.compose.ui.draw.scale
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.graphics.ColorFilter
import androidx.compose.ui.res.painterResource
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.text.style.TextAlign
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import com.baatcheet.app.R
import kotlinx.coroutines.delay

/**
 * Login Screen with ChatGPT-style animated carousel
 * 
 * Features:
 * - Animated background color transitions
 * - Typewriter-style text animation
 * - Smooth logo animation when transitioning from slide 3 to slide 1
 * - Bottom sheet with auth buttons
 */

// Carousel slide data
data class CarouselSlide(
    val backgroundColor: Color,
    val text: String,
    val textColor: Color,
    val hasImage: Boolean
)

// Updated color constants
private val MintGreenBackground = Color(0xFF7BE8BE)    // First slide - with logo
private val CyanBackground = Color(0xFF9EF8EE)         // Second slide - "Let's brainstorm"
private val BlueBackground = Color(0xFF0000F5)         // Third slide - "Let's go"
private val BlueText = Color(0xFF0000F5)
private val CyanText = Color(0xFF9EF8EE)               // Cyan text for third slide
private val WhiteText = Color(0xFFFFFFFF)
private val GrayButton = Color(0x5C787880) // 36% opacity

@Composable
fun LoginScreen(
    onGoogleSignIn: () -> Unit = {},
    onEmailSignUp: () -> Unit = {},
    onLogin: () -> Unit = {},
    isGoogleLoading: Boolean = false
) {
    // Carousel slides with updated colors
    val slides = listOf(
        CarouselSlide(
            backgroundColor = MintGreenBackground,
            text = "",
            textColor = Color.Black,
            hasImage = true
        ),
        CarouselSlide(
            backgroundColor = CyanBackground,
            text = "Let's brainstorm",
            textColor = BlueText,
            hasImage = false
        ),
        CarouselSlide(
            backgroundColor = BlueBackground,
            text = "Let's go",
            textColor = CyanText,
            hasImage = false
        )
    )
    
    var currentSlideIndex by remember { mutableIntStateOf(0) }
    var displayedText by remember { mutableStateOf("") }
    var isTransitioningToFirst by remember { mutableStateOf(false) }
    
    // Animated background color with longer duration for smoother transition
    val backgroundColor by animateColorAsState(
        targetValue = slides[currentSlideIndex].backgroundColor,
        animationSpec = tween(1000),
        label = "backgroundColor"
    )
    
    // Logo animation states
    val logoScale by animateFloatAsState(
        targetValue = if (currentSlideIndex == 0 && !isTransitioningToFirst) 1f else 0.8f,
        animationSpec = spring(
            dampingRatio = Spring.DampingRatioMediumBouncy,
            stiffness = Spring.StiffnessLow
        ),
        label = "logoScale"
    )
    
    val logoAlpha by animateFloatAsState(
        targetValue = if (currentSlideIndex == 0) 1f else 0f,
        animationSpec = tween(500),
        label = "logoAlpha"
    )
    
    // Auto-advance carousel
    LaunchedEffect(Unit) {
        while (true) {
            delay(4000)
            val nextIndex = (currentSlideIndex + 1) % slides.size
            
            // Set flag when transitioning from last slide to first
            if (currentSlideIndex == 2 && nextIndex == 0) {
                isTransitioningToFirst = true
                delay(100) // Small delay before changing
            }
            
            currentSlideIndex = nextIndex
            
            // Reset flag after transition completes
            if (isTransitioningToFirst) {
                delay(500)
                isTransitioningToFirst = false
            }
        }
    }
    
    // Typewriter animation for text
    LaunchedEffect(currentSlideIndex) {
        val targetText = slides[currentSlideIndex].text
        displayedText = ""
        
        if (targetText.isNotEmpty()) {
            // Small delay before starting typewriter for smoother transition
            delay(300)
            targetText.forEachIndexed { index, _ ->
                delay(80)
                displayedText = targetText.substring(0, index + 1)
            }
        }
    }
    
    Box(
        modifier = Modifier
            .fillMaxSize()
            .background(backgroundColor)
    ) {
        Column(
            modifier = Modifier.fillMaxSize(),
            horizontalAlignment = Alignment.CenterHorizontally
        ) {
            Spacer(modifier = Modifier.weight(1f))
            
            // Content Area with animated transitions
            Box(
                modifier = Modifier.height(200.dp),
                contentAlignment = Alignment.Center
            ) {
                AnimatedContent(
                    targetState = currentSlideIndex,
                    transitionSpec = {
                        // Smooth fade + scale for logo, fade for text
                        (fadeIn(animationSpec = tween(600)) + 
                            scaleIn(initialScale = 0.92f, animationSpec = tween(600)))
                            .togetherWith(
                                fadeOut(animationSpec = tween(400)) + 
                                    scaleOut(targetScale = 0.92f, animationSpec = tween(400))
                            )
                    },
                    label = "contentAnimation"
                ) { slideIndex ->
                    if (slides[slideIndex].hasImage) {
                        // Logo Image for first slide with bounce animation
                        Image(
                            painter = painterResource(id = R.drawable.login_image),
                            contentDescription = "BaatCheet Logo",
                            modifier = Modifier
                                .size(width = 292.dp, height = 137.dp)
                                .scale(logoScale)
                        )
                    } else {
                        // Typewriter Text for other slides
                        Text(
                            text = if (slideIndex == currentSlideIndex) displayedText else slides[slideIndex].text,
                            fontSize = 34.sp,
                            fontWeight = FontWeight.Medium,
                            color = slides[slideIndex].textColor,
                            textAlign = TextAlign.Center
                        )
                    }
                }
            }
            
            Spacer(modifier = Modifier.weight(1f))
            
            // Bottom Sheet - extends to bottom (no page indicator)
            BottomSheet(
                onGoogleSignIn = onGoogleSignIn,
                onEmailSignUp = onEmailSignUp,
                onLogin = onLogin,
                isGoogleLoading = isGoogleLoading
            )
        }
    }
}

@Composable
private fun BottomSheet(
    onGoogleSignIn: () -> Unit,
    onEmailSignUp: () -> Unit,
    onLogin: () -> Unit,
    isGoogleLoading: Boolean = false
) {
    Surface(
        modifier = Modifier.fillMaxWidth(),
        color = Color.Black,
        shape = RoundedCornerShape(topStart = 38.dp, topEnd = 38.dp)
    ) {
        Column(
            modifier = Modifier
                .padding(horizontal = 25.dp)
                .padding(top = 25.dp, bottom = 40.dp)
                .navigationBarsPadding(), // Extend to bottom safely
            verticalArrangement = Arrangement.spacedBy(12.dp)
        ) {
            // Continue with Google Button
            Button(
                onClick = { if (!isGoogleLoading) onGoogleSignIn() },
                enabled = !isGoogleLoading,
                modifier = Modifier
                    .fillMaxWidth()
                    .height(50.dp),
                colors = ButtonDefaults.buttonColors(
                    containerColor = GrayButton,
                    disabledContainerColor = GrayButton.copy(alpha = 0.6f)
                ),
                shape = RoundedCornerShape(14.dp)
            ) {
                Row(
                    horizontalArrangement = Arrangement.Center,
                    verticalAlignment = Alignment.CenterVertically
                ) {
                    if (isGoogleLoading) {
                        CircularProgressIndicator(
                            modifier = Modifier.size(20.dp),
                            color = Color.White,
                            strokeWidth = 2.dp
                        )
                    } else {
                        Image(
                            painter = painterResource(id = R.drawable.ic_google),
                            contentDescription = "Google",
                            modifier = Modifier.size(16.dp)
                        )
                    }
                    Spacer(modifier = Modifier.width(6.dp))
                    Text(
                        text = if (isGoogleLoading) "Signing in..." else "Continue with Google",
                        fontSize = 20.sp,
                        fontWeight = FontWeight.Medium,
                        color = Color.White
                    )
                }
            }
            
            // Sign up with Email Button
            Button(
                onClick = onEmailSignUp,
                modifier = Modifier
                    .fillMaxWidth()
                    .height(50.dp),
                colors = ButtonDefaults.buttonColors(
                    containerColor = GrayButton
                ),
                shape = RoundedCornerShape(14.dp)
            ) {
                Row(
                    horizontalArrangement = Arrangement.Center,
                    verticalAlignment = Alignment.CenterVertically
                ) {
                    Image(
                        painter = painterResource(id = R.drawable.ic_mail),
                        contentDescription = "Email",
                        modifier = Modifier.size(24.dp),
                        colorFilter = ColorFilter.tint(Color.White)
                    )
                    Spacer(modifier = Modifier.width(6.dp))
                    Text(
                        text = "Sign up with email",
                        fontSize = 20.sp,
                        fontWeight = FontWeight.Medium,
                        color = Color.White
                    )
                }
            }
            
            // Log in Button
            OutlinedButton(
                onClick = onLogin,
                modifier = Modifier
                    .fillMaxWidth()
                    .height(50.dp),
                colors = ButtonDefaults.outlinedButtonColors(
                    containerColor = Color.Black
                ),
                border = ButtonDefaults.outlinedButtonBorder.copy(
                    brush = androidx.compose.ui.graphics.SolidColor(Color(0xFF38383A))
                ),
                shape = RoundedCornerShape(14.dp)
            ) {
                Text(
                    text = "Log in",
                    fontSize = 20.sp,
                    fontWeight = FontWeight.Medium,
                    color = Color.White
                )
            }
        }
    }
}
