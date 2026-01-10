/**
 * BaatCheet Frontend App
 * Testing interface with Clerk authentication
 */

import { Routes, Route, Navigate } from 'react-router-dom';
import { SignedIn, SignedOut, SignIn, SignUp, useUser } from '@clerk/clerk-react';
import Layout from './components/Layout';
import Chat from './pages/Chat';
import Projects from './pages/Projects';
import Analytics from './pages/Analytics';
import Settings from './pages/Settings';
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
        {/* Public auth routes */}
        <Route
          path="/sign-in/*"
          element={
            <div className="min-h-screen bg-dark-900 flex items-center justify-center p-4">
              <SignIn routing="path" path="/sign-in" />
            </div>
          }
        />
        <Route
          path="/sign-up/*"
          element={
            <div className="min-h-screen bg-dark-900 flex items-center justify-center p-4">
              <SignUp routing="path" path="/sign-up" />
            </div>
          }
        />

        {/* Protected routes */}
        <Route
          path="/"
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
          <Route index element={<Chat />} />
          <Route path="chat" element={<Chat />} />
          <Route path="chat/:conversationId" element={<Chat />} />
          <Route path="projects" element={<Projects />} />
          <Route path="analytics" element={<Analytics />} />
          <Route path="settings" element={<Settings />} />
        </Route>
      </Routes>
    </>
  );
}
