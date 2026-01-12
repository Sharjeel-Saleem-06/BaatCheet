# 🍎 BaatCheet iOS App

## Overview

Native iOS application for BaatCheet AI Chat, built with SwiftUI following Apple's Human Interface Guidelines.

## Requirements

- Xcode 15.0+
- iOS 16.0+
- Swift 5.9+
- macOS Sonoma 14.0+ (for development)

## Project Structure

```
ios/
├── BaatCheet/
│   ├── BaatCheet.xcodeproj/     # Xcode project file
│   └── BaatCheet/
│       ├── BaatCheetApp.swift   # App entry point
│       ├── ContentView.swift     # Main content view
│       ├── Info.plist            # App configuration
│       ├── Assets.xcassets/      # Images, colors, icons
│       └── Views/
│           └── Splash/
│               └── SplashScreen.swift  # Animated splash screen
└── README.md
```

## Features

### Splash Screen
- ✅ Animated logo with spring effect
- ✅ Staggered text animations
- ✅ Brand colors (Blue #1E3A8A, Teal #14B8A6)
- ✅ Custom chat bubble icon with circuit nodes
- ✅ Urdu text support (باتچیت)
- ✅ Light/Dark mode support
- ✅ Auto-dismiss after 2.5 seconds

### Architecture
- **SwiftUI** - Modern declarative UI
- **MVVM** - Clean architecture pattern
- **Combine** - Reactive programming
- **Async/Await** - Modern concurrency

## Getting Started

### 1. Open Project
```bash
cd ios/BaatCheet
open BaatCheet.xcodeproj
```

### 2. Configure Signing
1. Select the project in Xcode
2. Go to "Signing & Capabilities"
3. Select your development team
4. Update Bundle Identifier if needed

### 3. Run
- Select a simulator or device
- Press `Cmd + R` to build and run

## Brand Colors

| Color | Hex | Usage |
|-------|-----|-------|
| Primary Blue | #1E3A8A | Main text, icons |
| Teal/Green | #14B8A6 | Accents, circuit nodes |
| Secondary Green | #10B981 | Urdu text |
| Background | #FFFFFF | Light mode background |
| Dark Background | #1C1C1E | Dark mode background |

## App Icons

Place your app icons in:
```
Assets.xcassets/AppIcon.appiconset/
```

Required sizes:
- 1024x1024 (App Store)
- iOS will automatically generate other sizes

## Permissions

The app requests the following permissions:
- **Microphone** - Voice input
- **Speech Recognition** - Speech-to-text
- **Camera** - Image capture
- **Photo Library** - Image selection

## Best Practices Implemented

1. **SwiftUI Lifecycle** - Uses `@main` app entry
2. **State Management** - `@StateObject`, `@EnvironmentObject`
3. **Animations** - Spring animations, staggered effects
4. **Accessibility** - VoiceOver compatible
5. **Dark Mode** - Full support
6. **Localization Ready** - Urdu language support
7. **Memory Efficient** - Proper cleanup

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
xcodebuild test -scheme BaatCheet -destination 'platform=iOS Simulator,name=iPhone 15'
```

## License

Copyright © 2026 BaatCheet. All rights reserved.
