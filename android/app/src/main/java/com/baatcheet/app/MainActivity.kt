package com.baatcheet.app

import android.os.Bundle
import androidx.activity.ComponentActivity
import androidx.activity.compose.setContent
import androidx.activity.enableEdgeToEdge
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.Surface
import androidx.compose.ui.Modifier
import androidx.core.splashscreen.SplashScreen.Companion.installSplashScreen
import com.baatcheet.app.ui.theme.BaatCheetTheme
import com.baatcheet.app.ui.splash.SplashViewModel
import dagger.hilt.android.AndroidEntryPoint
import javax.inject.Inject

/**
 * MainActivity - Entry point for the BaatCheet Android app
 * 
 * Uses Android 12+ Splash Screen API with backward compatibility.
 * Implements edge-to-edge display for modern Android UI.
 */
@AndroidEntryPoint
class MainActivity : ComponentActivity() {
    
    @Inject
    lateinit var splashViewModel: SplashViewModel
    
    override fun onCreate(savedInstanceState: Bundle?) {
        // Install splash screen BEFORE super.onCreate()
        val splashScreen = installSplashScreen()
        
        super.onCreate(savedInstanceState)
        
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
                    BaatCheetNavHost()
                }
            }
        }
    }
}
