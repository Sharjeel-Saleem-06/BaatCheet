# Clerk Configuration Guide for BaatCheet

## Overview
BaatCheet uses Clerk for authentication. This guide shows how to configure Clerk for **email/password only** authentication with **email verification**.

---

## Step 1: Clerk Dashboard Configuration

### 1.1 Go to Clerk Dashboard
1. Visit https://dashboard.clerk.com
2. Select your BaatCheet application (or create one)

### 1.2 Configure Authentication Methods

Navigate to **Configure → Email, Phone, Username**

#### Enable:
- ✅ **Email address** - Required
- ✅ **Password** - Required

#### Disable:
- ❌ **Phone number** - Turn OFF
- ❌ **Username** - Turn OFF (optional, keep if you want)

### 1.3 Disable Social Connections

Navigate to **Configure → Social Connections**

**Turn OFF all social providers:**
- ❌ Google
- ❌ GitHub
- ❌ Facebook
- ❌ Apple
- ❌ Twitter
- ❌ LinkedIn
- ❌ Microsoft
- ❌ Discord
- ❌ All others

### 1.4 Enable Email Verification

Navigate to **Configure → Email, Phone, Username → Email address**

**Settings:**
- ✅ **Require email verification** - Enable this
- **Verification method**: Choose one:
  - **Email code** (6-digit code sent to email)
  - **Email link** (Magic link sent to email)

**Recommended: Email code** (more secure, works better on mobile)

### 1.5 Configure Email Templates (Optional)

Navigate to **Configure → Emails**

Customize email templates:
- **Verification code** - The code sent for email verification
- **Password reset** - For forgot password flow
- **Welcome email** - After successful registration

---

## Step 2: Security Settings

### 2.1 Password Requirements

Navigate to **Configure → Restrictions → Password**

**Recommended settings:**
- Minimum length: **8 characters**
- Require uppercase: ✅
- Require lowercase: ✅
- Require number: ✅
- Require special character: ✅
- Check against breached passwords: ✅

### 2.2 Session Settings

Navigate to **Configure → Sessions**

**Recommended settings:**
- Session lifetime: **7 days**
- Inactivity timeout: **24 hours**
- Multi-session: ✅ Allow (for multiple devices)

### 2.3 Attack Protection

Navigate to **Configure → Attack Protection**

**Enable all:**
- ✅ Bot protection
- ✅ Brute force protection
- ✅ Rate limiting

---

## Step 3: Webhook Configuration

### 3.1 Create Webhook

Navigate to **Configure → Webhooks → Add Endpoint**

**Settings:**
- **Endpoint URL**: `https://your-domain.com/api/v1/clerk/webhook`
  - For local development: Use ngrok or similar
- **Events to subscribe:**
  - ✅ `user.created`
  - ✅ `user.updated`
  - ✅ `user.deleted`

### 3.2 Copy Webhook Secret

After creating the webhook, copy the **Signing Secret** and add it to your `.env`:

```env
CLERK_WEBHOOK_SECRET=whsec_xxxxxxxxxxxxxxxxxxxxxxxx
```

---

## Step 4: Get API Keys

### 4.1 Navigate to API Keys

Go to **Configure → API Keys**

### 4.2 Copy Keys

Copy these keys to your `.env` file:

```env
# Backend
CLERK_SECRET_KEY=<your-clerk-secret-key>

# Frontend
NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY=<your-clerk-publishable-key>
# OR for Vite:
VITE_CLERK_PUBLISHABLE_KEY=<your-clerk-publishable-key>
```

---

## Step 5: Environment Variables

### Backend `.env`:
```env
# Clerk Authentication
CLERK_SECRET_KEY=<your-clerk-secret-key>
CLERK_PUBLISHABLE_KEY=<your-clerk-publishable-key>
CLERK_WEBHOOK_SECRET=<your-clerk-webhook-secret>
```

### Frontend `.env`:
```env
# For Vite (React)
VITE_CLERK_PUBLISHABLE_KEY=<your-clerk-publishable-key>
```

---

## Step 6: Verify Configuration

### Test Registration Flow:
1. Go to your app's sign-up page
2. Enter email and password
3. Should receive verification email/code
4. Verify email
5. User should be created in Clerk AND synced to your database via webhook

### Test Login Flow:
1. Go to sign-in page
2. Enter email and password
3. Should be authenticated
4. Check that user data is available in your app

### Test Webhook:
1. Register a new user
2. Check your backend logs for webhook received
3. Check database for new user record with `clerkId`

---

## Troubleshooting

### "Social login still showing"
- Go to **Social Connections** and ensure ALL are disabled
- Clear browser cache and refresh

### "Email verification not required"
- Go to **Email, Phone, Username → Email address**
- Ensure "Require email verification" is enabled

### "Webhook not receiving events"
- Verify webhook URL is correct and publicly accessible
- Check webhook signing secret matches
- Check Clerk dashboard webhook logs for delivery status

### "User not syncing to database"
- Verify webhook endpoint is working
- Check backend logs for errors
- Ensure `user.created` event is subscribed

---

## Summary Checklist

| Setting | Status |
|---------|--------|
| Email authentication | ✅ Enabled |
| Password authentication | ✅ Enabled |
| Email verification | ✅ Required |
| Google OAuth | ❌ Disabled |
| GitHub OAuth | ❌ Disabled |
| All other OAuth | ❌ Disabled |
| Webhook for user.created | ✅ Configured |
| Webhook for user.updated | ✅ Configured |
| Webhook for user.deleted | ✅ Configured |
| Password complexity | ✅ Configured |
| Bot protection | ✅ Enabled |

---

## Frontend Integration

With email/password only, your sign-in component should look like:

```tsx
import { SignIn } from '@clerk/clerk-react';

function LoginPage() {
  return (
    <SignIn 
      appearance={{
        elements: {
          socialButtonsBlockButton: { display: 'none' }, // Hide social buttons
        }
      }}
    />
  );
}
```

Or use the built-in components which will automatically show only enabled auth methods.
