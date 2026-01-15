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
import androidx.navigation.NavType
import androidx.navigation.compose.NavHost
import androidx.navigation.compose.composable
import androidx.navigation.compose.rememberNavController
import androidx.navigation.navArgument
import com.baatcheet.app.ui.analytics.AnalyticsScreen
import com.baatcheet.app.ui.chat.ChatScreen
import com.baatcheet.app.ui.imagegen.ImageGenScreen
import com.baatcheet.app.ui.login.EmailAuthScreen
import com.baatcheet.app.ui.login.LoginScreen
import com.baatcheet.app.ui.memory.MemoryScreen
import com.baatcheet.app.ui.projects.ProjectsScreen
import com.baatcheet.app.ui.settings.SettingsScreen
import com.baatcheet.app.ui.splash.AnimatedSplashContent
import com.baatcheet.app.ui.settings.UserSettings
import com.baatcheet.app.ui.analytics.AnalyticsData

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
    
    // Skip splash screen entirely if user is logged in - go directly to main
    // The system splash (Android 12+) already provides a nice transition
    val startDestination = if (isLoggedIn) Routes.MAIN else Routes.SPLASH
    
    NavHost(
        navController = navController,
        startDestination = startDestination
    ) {
        // Animated Splash Screen (only shown for first-time/logged-out users)
        composable(Routes.SPLASH) {
            AnimatedSplashContent(
                onSplashComplete = {
                    // Navigate to login (user is not logged in if they see this)
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
                    navController.navigate("${Routes.EMAIL_AUTH}?mode=signup")
                },
                onLogin = {
                    navController.navigate("${Routes.EMAIL_AUTH}?mode=signin")
                }
            )
        }
        
        // Email Auth Screen (handles both sign up and login)
        composable(
            route = "${Routes.EMAIL_AUTH}?mode={mode}",
            arguments = listOf(
                navArgument("mode") { 
                    defaultValue = "signin"
                    type = NavType.StringType
                }
            )
        ) { backStackEntry ->
            val mode = backStackEntry.arguments?.getString("mode") ?: "signin"
            EmailAuthScreen(
                initialMode = mode,
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
            // Provide default UserSettings - in a real app, this would come from a ViewModel
            val defaultSettings = UserSettings(
                displayName = "User",
                email = "user@example.com",
                tier = "free"
            )
            
            SettingsScreen(
                userSettings = defaultSettings,
                onBack = { navController.popBackStack() },
                onLogout = {
                    SessionManager.clearSession(context)
                    navController.navigate(Routes.LOGIN) {
                        popUpTo(Routes.MAIN) { inclusive = true }
                    }
                },
                onDeleteAccount = { /* TODO: Implement delete account */ },
                onThemeChange = { /* TODO: Implement theme change */ },
                onLanguageChange = { /* TODO: Implement language change */ },
                onVoiceEnabledChange = { /* TODO: Implement voice toggle */ },
                onAutoPlayVoiceChange = { /* TODO: Implement auto-play toggle */ },
                onStreamingEnabledChange = { /* TODO: Implement streaming toggle */ },
                onHapticFeedbackChange = { /* TODO: Implement haptic toggle */ },
                onNotificationsChange = { /* TODO: Implement notifications toggle */ },
                onSaveHistoryChange = { /* TODO: Implement save history toggle */ },
                onShareAnalyticsChange = { /* TODO: Implement analytics toggle */ },
                onClearHistory = { /* TODO: Implement clear history */ },
                onExportData = { /* TODO: Implement export data */ },
                onPrivacyPolicy = { /* TODO: Open privacy policy */ },
                onTermsOfService = { /* TODO: Open terms of service */ },
                onHelpCenter = { /* TODO: Open help center */ },
                onContactSupport = { /* TODO: Open contact support */ },
                onUpgrade = { /* TODO: Implement upgrade */ }
            )
        }
        
        // Analytics Screen
        composable(Routes.ANALYTICS) {
            // Provide default AnalyticsData - in a real app, this would come from a ViewModel
            val defaultAnalytics = AnalyticsData(
                totalMessages = 0,
                totalConversations = 0,
                totalProjects = 0,
                streak = 0,
                lastActive = "Today"
            )
            
            AnalyticsScreen(
                analyticsData = defaultAnalytics,
                isLoading = false,
                onBack = { navController.popBackStack() },
                onRefresh = { /* TODO: Implement refresh */ }
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
