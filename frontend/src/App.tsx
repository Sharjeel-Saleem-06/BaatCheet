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

// Custom Clerk appearance - Light theme with elegant styling
const clerkAppearance = {
  baseTheme: undefined, // Reset base theme
  elements: {
    // Root & Card - Force white background with proper sizing
    rootBox: '!w-full !max-w-[400px] !mx-auto',
    card: '!bg-white !border !border-slate-200 !shadow-xl !rounded-2xl !p-6',
    cardBox: '!bg-white',
    
    // Header - Hide default header since we have custom
    headerTitle: '!hidden',
    headerSubtitle: '!hidden',
    header: '!hidden',
    
    // Main container
    main: '!bg-white !gap-4',
    
    // Form
    formFieldLabel: '!text-slate-700 !font-medium !text-sm',
    formFieldInput: '!bg-slate-50 !border-slate-200 !text-slate-800 !rounded-xl focus:!border-emerald-500 focus:!ring-2 focus:!ring-emerald-100 !placeholder-slate-400 !py-3',
    formFieldInputShowPasswordButton: '!text-slate-400 hover:!text-slate-600',
    formFieldSuccessText: '!text-emerald-600',
    formFieldErrorText: '!text-red-500',
    formFieldHintText: '!text-slate-500 !text-xs',
    formButtonPrimary: '!bg-gradient-to-r !from-emerald-500 !via-teal-500 !to-cyan-500 hover:!from-emerald-600 hover:!via-teal-600 hover:!to-cyan-600 !text-white !font-semibold !rounded-xl !shadow-lg !shadow-emerald-500/25 !py-3 !border-0 !mt-2',
    formButtonReset: '!text-emerald-600 hover:!text-emerald-500',
    
    // Footer
    footerAction: '!text-slate-500 !mt-4',
    footerActionLink: '!text-emerald-600 hover:!text-emerald-500 !font-medium',
    footerActionText: '!text-slate-500',
    
    // Divider
    dividerLine: '!bg-slate-200',
    dividerText: '!text-slate-400 !bg-white !text-sm',
    dividerRow: '!text-slate-400 !my-4',
    
    // Social buttons - Show full text "Continue with Google"
    socialButtonsBlockButton: '!bg-white !border !border-slate-200 !text-slate-700 hover:!bg-slate-50 hover:!border-slate-300 !rounded-xl !py-3 !gap-3 !w-full !flex !items-center !justify-center',
    socialButtonsBlockButtonText: '!font-medium !text-slate-700',
    socialButtonsProviderIcon: '!w-5 !h-5',
    socialButtonsIconButton: '!hidden',
    socialButtons: '!w-full',
    socialButtonsBlockButtonRow: '!w-full !flex !flex-col !gap-3',
    
    // Identity preview
    identityPreview: '!bg-slate-50 !border-slate-200 !rounded-xl',
    identityPreviewText: '!text-slate-700',
    identityPreviewEditButton: '!text-emerald-600 hover:!text-emerald-500',
    identityPreviewEditButtonIcon: '!text-emerald-600',
    
    // Internal elements
    internal: '!text-slate-500',
    
    // Alert
    alert: '!bg-amber-50 !border-amber-200 !rounded-xl !text-sm',
    alertText: '!text-amber-700',
    
    // OTP
    otpCodeFieldInput: '!bg-slate-50 !border-slate-200 !text-slate-800 !rounded-lg',
    
    // User button
    userButtonBox: '!rounded-xl',
    userButtonTrigger: '!rounded-xl',
    userButtonPopoverCard: '!bg-white !border-slate-200 !rounded-xl !shadow-xl',
    userButtonPopoverActionButton: '!text-slate-600 hover:!bg-slate-50 !rounded-lg',
    userButtonPopoverActionButtonText: '!text-slate-600',
    userButtonPopoverFooter: '!hidden',
    
    // General
    avatarBox: '!rounded-xl',
    badge: '!bg-emerald-50 !text-emerald-600 !rounded-lg',
    
    // Hide powered by Clerk footer
    footer: '!hidden',
    footerPages: '!hidden',
    footerPagesLink: '!hidden',
    
    // Form field row
    formFieldRow: '!text-slate-700',
    form: '!bg-white !gap-4',
    formField: '!bg-white',
    formFieldLabelRow: '!text-slate-700 !mb-1',
    formFieldAction: '!text-emerald-600 !text-sm',
  },
  layout: {
    socialButtonsPlacement: 'top' as const,
    socialButtonsVariant: 'blockButton' as const, // Force full-width buttons with text
    showOptionalFields: false,
    termsPageUrl: '/terms',
    privacyPageUrl: '/privacy',
    helpPageUrl: '/help',
  },
  variables: {
    colorPrimary: '#10b981',
    colorBackground: '#ffffff',
    colorInputBackground: '#f8fafc',
    colorInputText: '#1e293b',
    colorTextOnPrimaryBackground: '#ffffff',
    colorTextSecondary: '#64748b',
    colorText: '#1e293b',
    colorDanger: '#ef4444',
    colorSuccess: '#10b981',
    colorWarning: '#f59e0b',
    colorNeutral: '#64748b',
    borderRadius: '0.75rem',
    fontFamily: 'Inter, system-ui, sans-serif',
    spacingUnit: '0.875rem',
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
            <div className="min-h-screen bg-gradient-to-br from-slate-50 via-white to-emerald-50/30 flex flex-col">
              <Header transparent={false} />
              <div className="flex-1 flex items-center justify-center px-4 py-8 mt-16">
                <div className="w-full max-w-md">
                  {/* Custom header with logo */}
                  <div className="text-center mb-8">
                    <div className="relative inline-block">
                      <div className="absolute inset-0 bg-gradient-to-br from-emerald-400 via-teal-400 to-cyan-400 rounded-2xl blur-xl opacity-40 animate-pulse" />
                      <div className="relative w-20 h-20 rounded-2xl bg-gradient-to-br from-white to-slate-50 border border-slate-200/80 shadow-2xl shadow-emerald-500/20 flex items-center justify-center mx-auto mb-5 overflow-hidden">
                        <img src="/logo.png" alt="BaatCheet" className="w-14 h-14 object-contain" />
                      </div>
                    </div>
                    <h1 className="text-3xl font-bold bg-gradient-to-r from-slate-800 via-slate-700 to-slate-600 bg-clip-text text-transparent mb-2">Welcome Back</h1>
                    <p className="text-slate-500">Sign in to continue your AI journey</p>
                  </div>
                  
                  {/* Clerk SignIn component */}
                  <SignIn 
                    routing="path" 
                    path="/sign-in"
                    appearance={clerkAppearance}
                    afterSignInUrl="/app/chat"
                    signUpUrl="/sign-up"
                  />
                  
                  {/* Footer text */}
                  <p className="text-center text-xs text-slate-400 mt-6">
                    By signing in, you agree to our{' '}
                    <a href="/terms" className="text-emerald-600 hover:underline">Terms</a>
                    {' '}and{' '}
                    <a href="/privacy" className="text-emerald-600 hover:underline">Privacy Policy</a>
                  </p>
                </div>
              </div>
            </div>
          }
        />
        <Route
          path="/sign-up/*"
          element={
            <div className="min-h-screen bg-gradient-to-br from-slate-50 via-white to-emerald-50/30 flex flex-col">
              <Header transparent={false} />
              <div className="flex-1 flex items-center justify-center px-4 py-8 mt-16">
                <div className="w-full max-w-md">
                  {/* Custom header with logo */}
                  <div className="text-center mb-8">
                    <div className="relative inline-block">
                      <div className="absolute inset-0 bg-gradient-to-br from-emerald-400 via-teal-400 to-cyan-400 rounded-2xl blur-xl opacity-40 animate-pulse" />
                      <div className="relative w-20 h-20 rounded-2xl bg-gradient-to-br from-white to-slate-50 border border-slate-200/80 shadow-2xl shadow-emerald-500/20 flex items-center justify-center mx-auto mb-5 overflow-hidden">
                        <img src="/logo.png" alt="BaatCheet" className="w-14 h-14 object-contain" />
                      </div>
                    </div>
                    <h1 className="text-3xl font-bold bg-gradient-to-r from-slate-800 via-slate-700 to-slate-600 bg-clip-text text-transparent mb-2">Create Account</h1>
                    <p className="text-slate-500">Start your AI journey with BaatCheet</p>
                  </div>
                  
                  {/* Clerk SignUp component */}
                  <SignUp 
                    routing="path" 
                    path="/sign-up"
                    appearance={clerkAppearance}
                    afterSignUpUrl="/app/chat"
                    signInUrl="/sign-in"
                  />
                  
                  {/* Footer text */}
                  <p className="text-center text-xs text-slate-400 mt-6">
                    By signing up, you agree to our{' '}
                    <a href="/terms" className="text-emerald-600 hover:underline">Terms</a>
                    {' '}and{' '}
                    <a href="/privacy" className="text-emerald-600 hover:underline">Privacy Policy</a>
                  </p>
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
