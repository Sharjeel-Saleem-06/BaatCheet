package com.baatcheet.app.ui.splash

import androidx.compose.animation.core.*
import androidx.compose.foundation.Canvas
import androidx.compose.foundation.background
import androidx.compose.foundation.layout.*
import androidx.compose.material3.CircularProgressIndicator
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.Text
import androidx.compose.runtime.*
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.alpha
import androidx.compose.ui.draw.scale
import androidx.compose.ui.geometry.Offset
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.graphics.Path
import androidx.compose.ui.graphics.StrokeCap
import androidx.compose.ui.graphics.drawscope.Stroke
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import com.baatcheet.app.ui.theme.BrandBlue
import com.baatcheet.app.ui.theme.BrandGreen
import com.baatcheet.app.ui.theme.BrandTeal
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
    
    val textAlpha by animateFloatAsState(
        targetValue = if (startAnimation) 1f else 0f,
        animationSpec = tween(
            durationMillis = ANIMATION_DURATION,
            delayMillis = STAGGER_DELAY
        ),
        label = "textAlpha"
    )
    
    val urduAlpha by animateFloatAsState(
        targetValue = if (startAnimation) 1f else 0f,
        animationSpec = tween(
            durationMillis = ANIMATION_DURATION,
            delayMillis = STAGGER_DELAY * 2
        ),
        label = "urduAlpha"
    )
    
    val loaderAlpha by animateFloatAsState(
        targetValue = if (startAnimation) 1f else 0f,
        animationSpec = tween(
            durationMillis = ANIMATION_DURATION,
            delayMillis = STAGGER_DELAY * 3
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
            // Logo and Text Row
            Row(
                verticalAlignment = Alignment.CenterVertically,
                horizontalArrangement = Arrangement.Center
            ) {
                // Chat Bubble Icon
                ChatBubbleIcon(
                    modifier = Modifier
                        .size(80.dp)
                        .scale(logoScale)
                        .alpha(logoAlpha)
                )
                
                Spacer(modifier = Modifier.width(8.dp))
                
                // Brand Text
                Column {
                    Text(
                        text = "BaatCheet",
                        fontSize = 42.sp,
                        fontWeight = FontWeight.Bold,
                        color = BrandBlue,
                        modifier = Modifier.alpha(textAlpha)
                    )
                    
                    Text(
                        text = "باتچیت",
                        fontSize = 24.sp,
                        fontWeight = FontWeight.Medium,
                        color = BrandGreen,
                        modifier = Modifier.alpha(urduAlpha)
                    )
                }
            }
            
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

/**
 * Custom Chat Bubble Icon with Circuit Nodes
 * Matches the Figma design
 */
@Composable
fun ChatBubbleIcon(
    modifier: Modifier = Modifier
) {
    Canvas(modifier = modifier) {
        val width = size.width
        val height = size.height
        val strokeWidth = width * 0.04f
        
        // Chat bubble path
        val bubblePath = Path().apply {
            val cornerRadius = width * 0.15f
            val tailWidth = width * 0.12f
            val tailHeight = height * 0.15f
            val bubbleHeight = height * 0.75f
            
            // Start from bottom left (after tail)
            moveTo(tailWidth, bubbleHeight)
            
            // Bottom left corner
            lineTo(cornerRadius, bubbleHeight)
            quadraticBezierTo(0f, bubbleHeight, 0f, bubbleHeight - cornerRadius)
            
            // Left side
            lineTo(0f, cornerRadius)
            
            // Top left corner
            quadraticBezierTo(0f, 0f, cornerRadius, 0f)
            
            // Top side
            lineTo(width - cornerRadius, 0f)
            
            // Top right corner
            quadraticBezierTo(width, 0f, width, cornerRadius)
            
            // Right side
            lineTo(width, bubbleHeight - cornerRadius)
            
            // Bottom right corner
            quadraticBezierTo(width, bubbleHeight, width - cornerRadius, bubbleHeight)
            
            // Bottom side to tail
            lineTo(tailWidth + cornerRadius, bubbleHeight)
            
            // Tail
            lineTo(tailWidth * 0.3f, bubbleHeight + tailHeight)
            lineTo(tailWidth, bubbleHeight)
            
            close()
        }
        
        // Draw bubble outline
        drawPath(
            path = bubblePath,
            color = BrandBlue,
            style = Stroke(width = strokeWidth, cap = StrokeCap.Round)
        )
        
        // Draw circuit nodes
        val nodeRadius = width * 0.04f
        val lineY1 = height * 0.25f
        val lineY2 = height * 0.42f
        val lineY3 = height * 0.59f
        val lineStartX = width * 0.2f
        val lineEndX = width * 0.8f
        
        // Draw horizontal lines
        listOf(lineY1, lineY2, lineY3).forEach { y ->
            drawLine(
                color = BrandTeal,
                start = Offset(lineStartX, y),
                end = Offset(lineEndX, y),
                strokeWidth = strokeWidth * 0.6f,
                cap = StrokeCap.Round
            )
        }
        
        // Draw nodes on lines
        val nodePositions = listOf(
            // Line 1 nodes
            Offset(width * 0.35f, lineY1),
            Offset(width * 0.65f, lineY1),
            // Line 2 nodes
            Offset(width * 0.3f, lineY2),
            Offset(width * 0.7f, lineY2),
            // Line 3 nodes
            Offset(width * 0.25f, lineY3),
            Offset(width * 0.5f, lineY3),
            Offset(width * 0.75f, lineY3),
        )
        
        nodePositions.forEach { position ->
            drawCircle(
                color = BrandTeal,
                radius = nodeRadius,
                center = position
            )
        }
    }
}
