package com.baatcheet.app

import android.app.Application
import dagger.hilt.android.HiltAndroidApp

/**
 * BaatCheet Application class
 * 
 * Entry point for the Android application.
 * Annotated with @HiltAndroidApp to enable Hilt dependency injection.
 */
@HiltAndroidApp
class BaatCheetApplication : Application() {
    
    override fun onCreate() {
        super.onCreate()
        // Initialize any app-wide configurations here
    }
}
