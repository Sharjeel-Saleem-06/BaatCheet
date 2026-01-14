package com.baatcheet.app

import android.content.Context
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import androidx.compose.runtime.LaunchedEffect
import androidx.compose.runtime.remember
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.platform.LocalContext
import androidx.compose.ui.text.style.TextAlign
import androidx.navigation.compose.NavHost
import androidx.navigation.compose.composable
import androidx.navigation.compose.rememberNavController
import com.baatcheet.app.ui.analytics.AnalyticsScreen
import com.baatcheet.app.ui.chat.ChatScreen
import com.baatcheet.app.ui.imagegen.ImageGenScreen
import com.baatcheet.app.ui.login.EmailAuthScreen
import com.baatcheet.app.ui.login.LoginScreen
import com.baatcheet.app.ui.memory.MemoryScreen
import com.baatcheet.app.ui.projects.ProjectsScreen
import com.baatcheet.app.ui.settings.SettingsScreen
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
    const val PROJECTS = "projects"
    const val SETTINGS = "settings"
    const val ANALYTICS = "analytics"
    const val IMAGE_GEN = "image_gen"
    const val MEMORY = "memory"
}

/**
 * Session Manager - Check if user is authenticated
 */
object SessionManager {
    private const val PREFS_NAME = "baatcheet_auth"
    private const val KEY_AUTH_TOKEN = "auth_token"
    
    fun isLoggedIn(context: Context): Boolean {
        val prefs = context.getSharedPreferences(PREFS_NAME, Context.MODE_PRIVATE)
        return prefs.getString(KEY_AUTH_TOKEN, null) != null
    }
    
    fun clearSession(context: Context) {
        val prefs = context.getSharedPreferences(PREFS_NAME, Context.MODE_PRIVATE)
        prefs.edit().clear().apply()
    }
}

@Composable
fun BaatCheetNavHost() {
    val navController = rememberNavController()
    val context = LocalContext.current
    
    // Check if user is already logged in
    val isLoggedIn = remember { SessionManager.isLoggedIn(context) }
    
    NavHost(
        navController = navController,
        startDestination = Routes.SPLASH
    ) {
        // Animated Splash Screen (shown after system splash)
        composable(Routes.SPLASH) {
            AnimatedSplashContent(
                onSplashComplete = {
                    // Navigate based on login state
                    if (isLoggedIn) {
                        navController.navigate(Routes.MAIN) {
                            popUpTo(Routes.SPLASH) { inclusive = true }
                        }
                    } else {
                        navController.navigate(Routes.LOGIN) {
                            popUpTo(Routes.SPLASH) { inclusive = true }
                        }
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
        
        // Main Screen - Chat
        composable(Routes.MAIN) {
            ChatScreen(
                onLogout = {
                    // Clear session and navigate to login
                    SessionManager.clearSession(context)
                    navController.navigate(Routes.LOGIN) {
                        popUpTo(Routes.MAIN) { inclusive = true }
                    }
                }
            )
        }
        
        // Chat Screen - Same as Main for now
        composable(Routes.CHAT) {
            ChatScreen(
                onLogout = {
                    // Clear session and navigate to login
                    SessionManager.clearSession(context)
                    navController.navigate(Routes.LOGIN) {
                        popUpTo(Routes.CHAT) { inclusive = true }
                    }
                }
            )
        }
        
        // Projects Screen
        composable(Routes.PROJECTS) {
            ProjectsScreen(
                onNavigateToChat = { conversationId ->
                    // Navigate to chat with specific conversation
                    navController.navigate(Routes.MAIN)
                },
                onBack = { navController.popBackStack() }
            )
        }
        
        // Settings Screen
        composable(Routes.SETTINGS) {
            SettingsScreen(
                onBack = { navController.popBackStack() },
                onLogout = {
                    SessionManager.clearSession(context)
                    navController.navigate(Routes.LOGIN) {
                        popUpTo(Routes.MAIN) { inclusive = true }
                    }
                }
            )
        }
        
        // Analytics Screen
        composable(Routes.ANALYTICS) {
            AnalyticsScreen(
                onBack = { navController.popBackStack() }
            )
        }
        
        // Image Generation Screen
        composable(Routes.IMAGE_GEN) {
            ImageGenScreen(
                onBack = { navController.popBackStack() }
            )
        }
        
        // Memory Screen
        composable(Routes.MEMORY) {
            MemoryScreen(
                onBack = { navController.popBackStack() }
            )
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
