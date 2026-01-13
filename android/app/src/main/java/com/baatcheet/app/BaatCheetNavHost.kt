package com.baatcheet.app

import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.text.style.TextAlign
import androidx.navigation.compose.NavHost
import androidx.navigation.compose.composable
import androidx.navigation.compose.rememberNavController
import com.baatcheet.app.ui.login.EmailAuthScreen
import com.baatcheet.app.ui.login.LoginScreen
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
    const val EMAIL_AUTH = "email_auth"
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
        
        // Login Screen with animated carousel (no Apple Sign In on Android)
        composable(Routes.LOGIN) {
            LoginScreen(
                onGoogleSignIn = {
                    // TODO: Implement Google Sign In
                },
                onEmailSignUp = {
                    navController.navigate(Routes.EMAIL_AUTH)
                },
                onLogin = {
                    navController.navigate(Routes.EMAIL_AUTH)
                }
            )
        }
        
        // Email Auth Screen (handles both sign up and login)
        composable(Routes.EMAIL_AUTH) {
            EmailAuthScreen(
                onDismiss = { navController.popBackStack() },
                onAuthSuccess = {
                    navController.navigate(Routes.MAIN) {
                        popUpTo(Routes.LOGIN) { inclusive = true }
                    }
                }
            )
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
    Box(
        modifier = Modifier.fillMaxSize(),
        contentAlignment = Alignment.Center
    ) {
        Text(
            text = "$title Screen\n(Coming Soon)",
            style = MaterialTheme.typography.headlineMedium,
            textAlign = TextAlign.Center
        )
    }
}
