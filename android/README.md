# 🤖 BaatCheet Android App

## Overview

Native Android application for BaatCheet AI Chat, built with Jetpack Compose following Material Design 3 guidelines.

## Requirements

- Android Studio Hedgehog (2023.1.1) or newer
- JDK 17+
- Android SDK 34
- Minimum Android 8.0 (API 26)
- Kotlin 1.9.22+

## Project Structure

```
android/
├── app/
│   ├── build.gradle.kts          # App-level build config
│   ├── proguard-rules.pro        # ProGuard rules
│   └── src/main/
│       ├── AndroidManifest.xml   # App manifest
│       ├── java/com/baatcheet/app/
│       │   ├── BaatCheetApplication.kt  # Application class
│       │   ├── MainActivity.kt          # Main activity
│       │   ├── BaatCheetNavHost.kt      # Navigation
│       │   └── ui/
│       │       ├── splash/
│       │       │   ├── SplashViewModel.kt
│       │       │   └── AnimatedSplashContent.kt
│       │       └── theme/
│       │           ├── Color.kt
│       │           ├── Theme.kt
│       │           └── Type.kt
│       └── res/
│           ├── drawable/         # Vector drawables
│           ├── values/           # Colors, strings, themes
│           └── xml/              # Backup rules
├── build.gradle.kts              # Project-level build config
├── settings.gradle.kts           # Project settings
├── gradle.properties             # Gradle properties
└── gradle/
    └── libs.versions.toml        # Version catalog
```

## Features

### Splash Screen
- ✅ Android 12+ Splash Screen API
- ✅ Backward compatible to Android 8.0
- ✅ Animated logo with spring effect
- ✅ Staggered text animations
- ✅ Custom chat bubble icon with circuit nodes
- ✅ Light/Dark mode support
- ✅ Edge-to-edge display

### Architecture
- **Jetpack Compose** - Modern declarative UI
- **MVVM** - Clean architecture pattern
- **Hilt** - Dependency injection
- **Coroutines/Flow** - Reactive programming
- **Navigation Compose** - Type-safe navigation

## Getting Started

### 1. Open Project
```bash
cd android
# Open in Android Studio
```

### 2. Sync Gradle
Android Studio will automatically sync Gradle files.

### 3. Run
- Select an emulator or connected device
- Press `Shift + F10` or click Run

## Brand Colors

| Color | Hex | Usage |
|-------|-----|-------|
| Primary Blue | #1E3A8A | Main brand color |
| Teal | #14B8A6 | Accents, circuit nodes |
| Green | #10B981 | Urdu text |
| Background (Light) | #FFFFFF | Light mode |
| Background (Dark) | #1C1B1F | Dark mode |

## Dependencies

| Library | Version | Purpose |
|---------|---------|---------|
| Compose BOM | 2024.02.00 | UI toolkit |
| Material 3 | Latest | Design system |
| Hilt | 2.50 | DI |
| Navigation | 2.7.7 | Navigation |
| Retrofit | 2.9.0 | Networking |
| Coil | 2.5.0 | Image loading |
| Room | 2.6.1 | Local database |
| DataStore | 1.0.0 | Preferences |

## Build Variants

| Variant | BASE_URL | Description |
|---------|----------|-------------|
| Debug | localhost:5001 | Development |
| Release | api.baatcheet.com | Production |

## Permissions

| Permission | Purpose |
|------------|---------|
| INTERNET | API calls |
| RECORD_AUDIO | Voice input |
| CAMERA | Image capture |
| READ_MEDIA_IMAGES | Gallery access |

## Best Practices Implemented

1. **Splash Screen API** - Uses Android 12+ native splash
2. **Hilt DI** - Constructor injection throughout
3. **StateFlow** - Reactive UI state
4. **Navigation Compose** - Type-safe navigation
5. **Material 3** - Latest design system
6. **ProGuard** - Code obfuscation for release
7. **Edge-to-Edge** - Modern UI appearance
8. **Version Catalog** - Centralized dependencies

## Next Steps

- [ ] Implement Login screen (matching Figma)
- [ ] Add Clerk authentication
- [ ] Create Chat interface
- [ ] Implement voice input
- [ ] Add image upload
- [ ] Connect to backend API

## Testing

```bash
# Run unit tests
./gradlew test

# Run instrumented tests
./gradlew connectedAndroidTest
```

## Building APK

```bash
# Debug APK
./gradlew assembleDebug

# Release APK (requires signing config)
./gradlew assembleRelease
```

## License

Copyright © 2026 BaatCheet. All rights reserved.
