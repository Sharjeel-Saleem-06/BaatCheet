package com.baatcheet.app

import android.content.Intent
import android.os.Bundle
import android.util.Log
import androidx.activity.ComponentActivity
import androidx.activity.compose.setContent
import androidx.activity.enableEdgeToEdge
import androidx.activity.viewModels
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.Surface
import androidx.compose.runtime.mutableStateOf
import androidx.compose.ui.Modifier
import androidx.core.splashscreen.SplashScreen.Companion.installSplashScreen
import com.baatcheet.app.ui.theme.BaatCheetTheme
import com.baatcheet.app.ui.splash.SplashViewModel
import dagger.hilt.android.AndroidEntryPoint

/**
 * MainActivity - Entry point for the BaatCheet Android app
 * 
 * Uses Android 12+ Splash Screen API with backward compatibility.
 * Implements edge-to-edge display for modern Android UI.
 * Handles deep links for chat sharing.
 */
@AndroidEntryPoint
class MainActivity : ComponentActivity() {
    
    private val splashViewModel: SplashViewModel by viewModels()
    
    // Deep link state
    companion object {
        var pendingDeepLink = mutableStateOf<String?>(null)
    }
    
    override fun onCreate(savedInstanceState: Bundle?) {
        // Install splash screen BEFORE super.onCreate()
        val splashScreen = installSplashScreen()
        
        super.onCreate(savedInstanceState)
        
        // Handle deep link from intent
        handleDeepLink(intent)
        
        // Keep splash screen visible while loading
        splashScreen.setKeepOnScreenCondition {
            splashViewModel.isLoading.value
        }
        
        // Enable edge-to-edge display
        enableEdgeToEdge()
        
        setContent {
            BaatCheetTheme {
                Surface(
                    modifier = Modifier.fillMaxSize(),
                    color = MaterialTheme.colorScheme.background
                ) {
                    // Main app navigation will go here
                    BaatCheetNavHost(
                        deepLinkConversationId = pendingDeepLink.value
                    )
                }
            }
        }
    }
    
    override fun onNewIntent(intent: Intent) {
        super.onNewIntent(intent)
        handleDeepLink(intent)
    }
    
    private fun handleDeepLink(intent: Intent?) {
        intent?.data?.let { uri ->
            Log.d("DeepLink", "Received deep link: $uri")
            
            // Extract conversation ID from URL
            // Formats:
            // - https://baatcheet-web.netlify.app/app/chat/{conversationId}
            // - https://baatcheet-web.netlify.app/share/{shareId}
            // - baatcheet://chat/{conversationId}
            // - baatcheet://share/{shareId}
            
            val path = uri.path ?: return@let
            val conversationId = when {
                path.startsWith("/app/chat/") -> path.removePrefix("/app/chat/")
                path.startsWith("/share/") -> path.removePrefix("/share/")
                path.startsWith("/chat/") -> path.removePrefix("/chat/")
                else -> null
            }
            
            if (!conversationId.isNullOrBlank()) {
                Log.d("DeepLink", "Opening conversation: $conversationId")
                pendingDeepLink.value = conversationId
            }
        }
    }
}
