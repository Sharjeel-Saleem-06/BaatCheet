/**
 * BaatCheet Frontend App
 * Full-featured AI chat application with modern UI
 */

import { Routes, Route, Navigate } from 'react-router-dom';
import { SignedIn, SignedOut, SignIn, SignUp, useUser, useAuth } from '@clerk/clerk-react';
import Layout from './components/Layout';
import Chat from './pages/Chat';
import Projects from './pages/Projects';
import Analytics from './pages/Analytics';
import Settings from './pages/Settings';
import AdminPanel from './pages/AdminPanel';
import Home from './pages/Home';
import Contact from './pages/Contact';
import Privacy from './pages/Privacy';
import Terms from './pages/Terms';
import Help from './pages/Help';
import SharedChat from './pages/SharedChat';
import Header from './components/Header';
import { useEffect } from 'react';
import api from './services/api';

// Direct API URL to bypass Netlify proxy issues
const DIRECT_API = 'https://sharry121-baatcheet.hf.space/api/v1';

// Sync user with backend after Clerk authentication
function UserSync() {
  const { isSignedIn, user } = useUser();
  const { getToken } = useAuth();

  useEffect(() => {
    if (isSignedIn && user) {
      // Sync user data with backend using explicit token
      const syncUser = async () => {
        try {
          const token = await getToken();
          if (token) {
            // Use direct HuggingFace URL to bypass Netlify proxy
            const response = await fetch(`${DIRECT_API}/auth/sync`, {
              method: 'POST',
              headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${token}`,
              },
              body: JSON.stringify({}),
            });
            
            if (response.ok) {
              console.log('User synced with backend');
            } else {
              const error = await response.json();
              console.error('Sync failed:', error);
            }
          }
        } catch (error) {
          console.error('Failed to sync user:', error);
        }
      };
      syncUser();
    }
  }, [isSignedIn, user, getToken]);

  return null;
}

// Custom Clerk appearance to hide branding and match our theme
const clerkAppearance = {
  elements: {
    // Root & Card
    rootBox: 'w-full',
    card: 'bg-dark-800 border border-dark-700 shadow-2xl rounded-2xl',
    
    // Header
    headerTitle: 'text-dark-100 text-xl font-bold',
    headerSubtitle: 'text-dark-400',
    
    // Form
    formFieldLabel: 'text-dark-300 font-medium',
    formFieldInput: 'bg-dark-700 border-dark-600 text-dark-100 rounded-xl focus:border-primary-500 focus:ring-primary-500',
    formFieldInputShowPasswordButton: 'text-dark-500 hover:text-dark-300',
    formFieldSuccessText: 'text-green-400',
    formFieldErrorText: 'text-red-400',
    formFieldHintText: 'text-dark-500',
    formButtonPrimary: 'bg-gradient-to-r from-primary-500 to-primary-600 hover:from-primary-600 hover:to-primary-700 text-white font-semibold rounded-xl shadow-lg shadow-primary-500/20 py-3',
    formButtonReset: 'text-primary-400 hover:text-primary-300',
    
    // Footer
    footerAction: 'text-dark-400',
    footerActionLink: 'text-primary-400 hover:text-primary-300 font-medium',
    
    // Divider
    dividerLine: 'bg-dark-700',
    dividerText: 'text-dark-500 bg-dark-800',
    
    // Social buttons
    socialButtonsBlockButton: 'bg-dark-700 border-dark-600 text-dark-200 hover:bg-dark-600 hover:border-dark-500 rounded-xl',
    socialButtonsBlockButtonText: 'font-medium',
    socialButtonsProviderIcon: 'w-5 h-5',
    
    // Identity preview
    identityPreview: 'bg-dark-700 border-dark-600 rounded-xl',
    identityPreviewText: 'text-dark-200',
    identityPreviewEditButton: 'text-primary-400 hover:text-primary-300',
    
    // Internal elements
    internal: 'text-dark-400',
    
    // Alert
    alert: 'bg-dark-700 border-dark-600 rounded-xl',
    alertText: 'text-dark-300',
    
    // OTP
    otpCodeFieldInput: 'bg-dark-700 border-dark-600 text-dark-100 rounded-lg',
    
    // User button
    userButtonBox: 'rounded-xl',
    userButtonTrigger: 'rounded-xl',
    userButtonPopoverCard: 'bg-dark-800 border-dark-700 rounded-xl shadow-xl',
    userButtonPopoverActionButton: 'text-dark-300 hover:bg-dark-700 rounded-lg',
    userButtonPopoverActionButtonText: 'text-dark-300',
    userButtonPopoverFooter: 'hidden', // Hide "Secured by Clerk"
    
    // General
    avatarBox: 'rounded-xl',
    badge: 'bg-primary-500/20 text-primary-400 rounded-lg',
    
    // Hide powered by Clerk footer
    footer: 'hidden',
    footerPages: 'hidden',
    footerPagesLink: 'hidden',
  },
  layout: {
    socialButtonsPlacement: 'top' as const,
    showOptionalFields: false,
    termsPageUrl: '/terms',
    privacyPageUrl: '/privacy',
    helpPageUrl: '/help',
  },
  variables: {
    colorPrimary: '#22c55e',
    colorBackground: '#1a1a2e',
    colorInputBackground: '#252538',
    colorInputText: '#f5f5f7',
    colorTextOnPrimaryBackground: '#ffffff',
    colorTextSecondary: '#9ca3af',
    borderRadius: '0.75rem',
    fontFamily: 'Inter, system-ui, sans-serif',
  },
};

export default function App() {
  return (
    <>
      <UserSync />
      <Routes>
        {/* Public routes */}
        <Route path="/" element={<Home />} />
        <Route path="/contact" element={<Contact />} />
        <Route path="/privacy" element={<Privacy />} />
        <Route path="/terms" element={<Terms />} />
        <Route path="/help" element={<Help />} />
        <Route path="/share/:shareId" element={<SharedChat />} />
        <Route path="/about" element={<Navigate to="/" replace />} />
        <Route path="/cookies" element={<Privacy />} /> {/* Reuse privacy for now */}
        
        {/* Auth routes */}
        <Route
          path="/sign-in/*"
          element={
            <div className="min-h-screen bg-dark-900 flex flex-col">
              <Header transparent={false} />
              <div className="flex-1 flex items-center justify-center px-4 py-8 mt-20">
                <div className="w-full max-w-md">
                  <div className="text-center mb-6">
                    <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-primary-500 to-primary-600 flex items-center justify-center mx-auto mb-4 shadow-xl shadow-primary-500/25">
                      <span className="text-white font-bold text-3xl">B</span>
                    </div>
                    <h1 className="text-2xl font-bold text-dark-100 mb-2">Welcome Back</h1>
                    <p className="text-dark-400">Sign in to continue to BaatCheet</p>
                  </div>
                  <SignIn 
                    routing="path" 
                    path="/sign-in"
                    appearance={clerkAppearance}
                    afterSignInUrl="/app/chat"
                    signUpUrl="/sign-up"
                  />
                </div>
              </div>
            </div>
          }
        />
        <Route
          path="/sign-up/*"
          element={
            <div className="min-h-screen bg-dark-900 flex flex-col">
              <Header transparent={false} />
              <div className="flex-1 flex items-center justify-center px-4 py-8 mt-20">
                <div className="w-full max-w-md">
                  <div className="text-center mb-6">
                    <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-primary-500 to-primary-600 flex items-center justify-center mx-auto mb-4 shadow-xl shadow-primary-500/25">
                      <span className="text-white font-bold text-3xl">B</span>
                    </div>
                    <h1 className="text-2xl font-bold text-dark-100 mb-2">Create Account</h1>
                    <p className="text-dark-400">Start your AI journey with BaatCheet</p>
                  </div>
                  <SignUp 
                    routing="path" 
                    path="/sign-up"
                    appearance={clerkAppearance}
                    afterSignUpUrl="/app/chat"
                    signInUrl="/sign-in"
                  />
                </div>
              </div>
            </div>
          }
        />

        {/* Protected routes */}
        <Route
          path="/app"
          element={
            <>
              <SignedIn>
                <Layout />
              </SignedIn>
              <SignedOut>
                <Navigate to="/sign-in" replace />
              </SignedOut>
            </>
          }
        >
          <Route index element={<Navigate to="/app/chat" replace />} />
          <Route path="chat" element={<Chat />} />
          <Route path="chat/:conversationId" element={<Chat />} />
          <Route path="projects" element={<Projects />} />
          <Route path="analytics" element={<Analytics />} />
          <Route path="settings" element={<Settings />} />
          <Route path="admin" element={<AdminPanel />} />
        </Route>

        {/* Legacy routes - redirect to new structure */}
        <Route path="/chat" element={<Navigate to="/app/chat" replace />} />
        <Route path="/chat/:conversationId" element={<Navigate to="/app/chat/:conversationId" replace />} />
        <Route path="/projects" element={<Navigate to="/app/projects" replace />} />
        <Route path="/analytics" element={<Navigate to="/app/analytics" replace />} />
        <Route path="/settings" element={<Navigate to="/app/settings" replace />} />

        {/* Catch all - redirect to home */}
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </>
  );
}
