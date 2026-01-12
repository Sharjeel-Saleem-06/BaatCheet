package com.baatcheet.app

import androidx.compose.runtime.Composable
import androidx.navigation.compose.NavHost
import androidx.navigation.compose.composable
import androidx.navigation.compose.rememberNavController
import com.baatcheet.app.ui.splash.AnimatedSplashContent

/**
 * BaatCheet Navigation Host
 * 
 * Manages navigation between screens using Jetpack Navigation Compose.
 */

// Navigation routes
object Routes {
    const val SPLASH = "splash"
    const val LOGIN = "login"
    const val MAIN = "main"
    const val CHAT = "chat"
}

@Composable
fun BaatCheetNavHost() {
    val navController = rememberNavController()
    
    NavHost(
        navController = navController,
        startDestination = Routes.SPLASH
    ) {
        // Animated Splash Screen (shown after system splash)
        composable(Routes.SPLASH) {
            AnimatedSplashContent(
                onSplashComplete = {
                    navController.navigate(Routes.LOGIN) {
                        popUpTo(Routes.SPLASH) { inclusive = true }
                    }
                }
            )
        }
        
        // Login Screen (placeholder)
        composable(Routes.LOGIN) {
            // TODO: Implement LoginScreen
            PlaceholderScreen(title = "Login")
        }
        
        // Main Screen (placeholder)
        composable(Routes.MAIN) {
            // TODO: Implement MainScreen
            PlaceholderScreen(title = "Main")
        }
        
        // Chat Screen (placeholder)
        composable(Routes.CHAT) {
            // TODO: Implement ChatScreen
            PlaceholderScreen(title = "Chat")
        }
    }
}

@Composable
fun PlaceholderScreen(title: String) {
    androidx.compose.foundation.layout.Box(
        modifier = androidx.compose.ui.Modifier.fillMaxSize(),
        contentAlignment = androidx.compose.ui.Alignment.Center
    ) {
        androidx.compose.material3.Text(
            text = "$title Screen\n(Coming Soon)",
            style = androidx.compose.material3.MaterialTheme.typography.headlineMedium,
            textAlign = androidx.compose.ui.text.style.TextAlign.Center
        )
    }
}

private fun androidx.compose.ui.Modifier.fillMaxSize() = 
    this.then(androidx.compose.foundation.layout.fillMaxSize())
