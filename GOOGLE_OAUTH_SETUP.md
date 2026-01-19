# Google OAuth Setup Guide for BaatCheet

## Your OAuth Credentials

### Web Client (Used for Clerk & Backend)
- **Client ID:** `1042263517850-1iibs7u9ddhq9dq91cbe8prqlj1q858o.apps.googleusercontent.com`
- **Client Secret:** `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`

### Android Client
- **Client ID:** `1042263517850-s6hb8qtfh1ji7tiqac2geue1mi2u1gb8.apps.googleusercontent.com`
- **SHA-1 Fingerprint:** `83:69:D4:26:DE:B0:23:D3:F4:57:11:DE:AD:A8:3F:8E:5C:B3:5D:EC`

---

## Clerk Configuration

### Option 1: Built-in Providers (Recommended)

1. Go to Clerk Dashboard → **User & Authentication** → **Social Connections**
2. Click **"Built-in providers (25+)"** tab
3. Find and click **Google**
4. Enter:
   - **Client ID:** `1042263517850-1iibs7u9ddhq9dq91cbe8prqlj1q858o.apps.googleusercontent.com`
   - **Client Secret:** `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`
5. Click **Enable**

### Option 2: Custom Provider

If using Custom provider tab:
- **Name:** `BaatCheet` or `Google`
- **Key:** `oauth_custom_google`
- **Discovery Endpoint:** `https://accounts.google.com/.well-known/openid-configuration`
- **Client ID:** `1042263517850-1iibs7u9ddhq9dq91cbe8prqlj1q858o.apps.googleusercontent.com`
- **Client Secret:** `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`

---

## Backend Environment Variables

Add these to your HuggingFace Spaces secrets:

```env
# Google OAuth
GOOGLE_CLIENT_ID=1042263517850-1iibs7u9ddhq9dq91cbe8prqlj1q858o.apps.googleusercontent.com
GOOGLE_CLIENT_SECRET=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

# JWT for session tokens (generate your own secure key)
JWT_SECRET=your-secure-random-string-at-least-32-chars
```

---

## Android App Configuration

The `GoogleAuthHelper.kt` uses the **Web Client ID** for server verification:

```kotlin
const val WEB_CLIENT_ID = "1042263517850-1iibs7u9ddhq9dq91cbe8prqlj1q858o.apps.googleusercontent.com"
```

The Android Client ID is automatically handled by Google Play Services based on your app's SHA-1 fingerprint.

---

## How It Works

### Web Flow (Clerk)
1. User clicks "Sign in with Google" on web
2. Clerk handles OAuth flow with Google
3. Clerk creates/syncs user in Clerk database
4. Frontend gets Clerk session token
5. Backend validates Clerk token and syncs user to database

### Android Flow (Native)
1. User clicks "Sign in with Google" on Android
2. Android Credential Manager shows Google account picker
3. User selects account
4. App receives Google ID token
5. App sends token to backend `/api/v1/auth/google`
6. Backend verifies token with Google
7. Backend creates/syncs user in database
8. Backend returns JWT session token

---

## Database

The database is already configured to support OAuth users:
- `clerk_id` field stores Clerk user ID or `google_<googleId>` for native Google auth
- `email` is unique and used to match accounts across providers
- Same email = same account (no duplicate accounts)
