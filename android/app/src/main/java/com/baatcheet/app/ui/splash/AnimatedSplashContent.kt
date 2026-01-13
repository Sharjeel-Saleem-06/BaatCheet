package com.baatcheet.app.ui.splash

import androidx.compose.animation.core.*
import androidx.compose.foundation.Image
import androidx.compose.foundation.background
import androidx.compose.foundation.layout.*
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material3.CircularProgressIndicator
import androidx.compose.runtime.*
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.alpha
import androidx.compose.ui.draw.clip
import androidx.compose.ui.draw.scale
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.res.painterResource
import androidx.compose.ui.unit.dp
import com.baatcheet.app.R
import com.baatcheet.app.ui.theme.BrandBlue
import kotlinx.coroutines.delay

/**
 * Animated Splash Content
 * 
 * Shows an animated version of the BaatCheet logo after the system splash screen.
 * Includes smooth animations for the logo, text, and loading indicator.
 */

private const val ANIMATION_DURATION = 800
private const val STAGGER_DELAY = 200
private const val SPLASH_DISPLAY_TIME = 2500L

@Composable
fun AnimatedSplashContent(
    onSplashComplete: () -> Unit
) {
    // Animation states
    var startAnimation by remember { mutableStateOf(false) }
    
    val logoScale by animateFloatAsState(
        targetValue = if (startAnimation) 1f else 0.5f,
        animationSpec = spring(
            dampingRatio = Spring.DampingRatioMediumBouncy,
            stiffness = Spring.StiffnessLow
        ),
        label = "logoScale"
    )
    
    val logoAlpha by animateFloatAsState(
        targetValue = if (startAnimation) 1f else 0f,
        animationSpec = tween(ANIMATION_DURATION),
        label = "logoAlpha"
    )
    
    val loaderAlpha by animateFloatAsState(
        targetValue = if (startAnimation) 1f else 0f,
        animationSpec = tween(
            durationMillis = ANIMATION_DURATION,
            delayMillis = STAGGER_DELAY
        ),
        label = "loaderAlpha"
    )
    
    // Start animation and navigate after delay
    LaunchedEffect(Unit) {
        startAnimation = true
        delay(SPLASH_DISPLAY_TIME)
        onSplashComplete()
    }
    
    // UI
    Box(
        modifier = Modifier
            .fillMaxSize()
            .background(Color.White),
        contentAlignment = Alignment.Center
    ) {
        Column(
            horizontalAlignment = Alignment.CenterHorizontally,
            verticalArrangement = Arrangement.Center
        ) {
            // BaatCheet Logo - larger size for better visibility
            Image(
                painter = painterResource(id = R.drawable.splash_logo),
                contentDescription = "BaatCheet Logo",
                modifier = Modifier
                    .size(280.dp)
                    .scale(logoScale)
                    .alpha(logoAlpha)
                    .clip(RoundedCornerShape(56.dp))
            )
            
            Spacer(modifier = Modifier.height(48.dp))
            
            // Loading indicator
            CircularProgressIndicator(
                modifier = Modifier
                    .size(32.dp)
                    .alpha(loaderAlpha),
                color = BrandBlue,
                strokeWidth = 3.dp
            )
        }
    }
}
