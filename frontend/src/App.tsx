/**
 * BaatCheet Frontend App
 * Full-featured AI chat application with modern UI
 */

import { Routes, Route, Navigate } from 'react-router-dom';
import { SignedIn, SignedOut, SignIn, SignUp, useUser } from '@clerk/clerk-react';
import Layout from './components/Layout';
import Chat from './pages/Chat';
import Projects from './pages/Projects';
import Analytics from './pages/Analytics';
import Settings from './pages/Settings';
import Home from './pages/Home';
import Contact from './pages/Contact';
import { useEffect } from 'react';
import api from './services/api';

// Sync user with backend after Clerk authentication
function UserSync() {
  const { isSignedIn, user } = useUser();

  useEffect(() => {
    if (isSignedIn && user) {
      // Sync user data with backend
      api.post('/auth/sync').catch(console.error);
    }
  }, [isSignedIn, user]);

  return null;
}

export default function App() {
  return (
    <>
      <UserSync />
      <Routes>
        {/* Public routes */}
        <Route path="/" element={<Home />} />
        <Route path="/contact" element={<Contact />} />
        
        {/* Auth routes */}
        <Route
          path="/sign-in/*"
          element={
            <div className="min-h-screen bg-dark-900 flex items-center justify-center p-4">
              <div className="w-full max-w-md">
                <div className="text-center mb-8">
                  <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-primary-500 to-primary-600 flex items-center justify-center mx-auto mb-4 shadow-xl shadow-primary-500/25">
                    <span className="text-white font-bold text-3xl">B</span>
                  </div>
                  <h1 className="text-2xl font-bold text-dark-100 mb-2">Welcome Back</h1>
                  <p className="text-dark-400">Sign in to continue to BaatCheet</p>
                </div>
                <SignIn 
                  routing="path" 
                  path="/sign-in"
                  appearance={{
                    elements: {
                      rootBox: 'w-full',
                      card: 'bg-dark-800 border border-dark-700 shadow-xl',
                      headerTitle: 'text-dark-100',
                      headerSubtitle: 'text-dark-400',
                      formFieldLabel: 'text-dark-300',
                      formFieldInput: 'bg-dark-900 border-dark-600 text-dark-100',
                      footerActionLink: 'text-primary-400 hover:text-primary-300',
                      formButtonPrimary: 'bg-primary-500 hover:bg-primary-600',
                      dividerLine: 'bg-dark-700',
                      dividerText: 'text-dark-500',
                      socialButtonsBlockButton: 'bg-dark-700 border-dark-600 text-dark-200 hover:bg-dark-600',
                    },
                  }}
                />
              </div>
            </div>
          }
        />
        <Route
          path="/sign-up/*"
          element={
            <div className="min-h-screen bg-dark-900 flex items-center justify-center p-4">
              <div className="w-full max-w-md">
                <div className="text-center mb-8">
                  <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-primary-500 to-primary-600 flex items-center justify-center mx-auto mb-4 shadow-xl shadow-primary-500/25">
                    <span className="text-white font-bold text-3xl">B</span>
                  </div>
                  <h1 className="text-2xl font-bold text-dark-100 mb-2">Create Account</h1>
                  <p className="text-dark-400">Start your AI journey with BaatCheet</p>
                </div>
                <SignUp 
                  routing="path" 
                  path="/sign-up"
                  appearance={{
                    elements: {
                      rootBox: 'w-full',
                      card: 'bg-dark-800 border border-dark-700 shadow-xl',
                      headerTitle: 'text-dark-100',
                      headerSubtitle: 'text-dark-400',
                      formFieldLabel: 'text-dark-300',
                      formFieldInput: 'bg-dark-900 border-dark-600 text-dark-100',
                      footerActionLink: 'text-primary-400 hover:text-primary-300',
                      formButtonPrimary: 'bg-primary-500 hover:bg-primary-600',
                      dividerLine: 'bg-dark-700',
                      dividerText: 'text-dark-500',
                      socialButtonsBlockButton: 'bg-dark-700 border-dark-600 text-dark-200 hover:bg-dark-600',
                    },
                  }}
                />
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
