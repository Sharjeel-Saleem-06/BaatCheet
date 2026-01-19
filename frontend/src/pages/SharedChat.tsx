/**
 * Shared Chat Page
 * Displays a shared conversation with deep link support
 * 
 * This page handles:
 * - Requiring login to view shared chats
 * - Redirecting to the same chat after login
 * - Deep linking to mobile app if installed
 * - Beautiful chat view
 */

import { useEffect, useState } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import { SignedIn, SignedOut, useUser } from '@clerk/clerk-react';
import { 
  Bot, User, ArrowLeft, Smartphone, Lock,
  Loader2, AlertCircle, Copy, Check, MessageSquare 
} from 'lucide-react';
import api from '../services/api';

interface Message {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  timestamp: string;
}

interface SharedConversation {
  id: string;
  title: string;
  messages: Message[];
  sharedAt: string;
  sharedBy: string;
  originalConversationId: string;
}

export default function SharedChat() {
  const { shareId } = useParams();
  const navigate = useNavigate();
  const { isSignedIn, user } = useUser();
  const [conversation, setConversation] = useState<SharedConversation | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);
  const [showAppBanner, setShowAppBanner] = useState(true);

  // Check if user is on mobile
  const isMobile = /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(
    navigator.userAgent
  );

  // Deep link URL for mobile app
  const appDeepLink = `baatcheet://share/${shareId}`;
  const webUrl = window.location.href;

  useEffect(() => {
    const fetchSharedChat = async () => {
      if (!isSignedIn) {
        setLoading(false);
        return;
      }
      
      try {
        setLoading(true);
        const response = await api.get(`/chat/shared/${shareId}`);
        setConversation(response.data);
      } catch (err: unknown) {
        console.error('Failed to fetch shared chat:', err);
        const error = err as { response?: { status?: number } };
        if (error.response?.status === 404) {
          setError('This chat link is invalid or has expired.');
        } else if (error.response?.status === 403) {
          setError('You do not have permission to view this chat.');
        } else {
          setError('Failed to load the shared chat. Please try again.');
        }
      } finally {
        setLoading(false);
      }
    };

    if (shareId && isSignedIn) {
      fetchSharedChat();
    } else if (!isSignedIn) {
      setLoading(false);
    }
  }, [shareId, isSignedIn]);

  // Try to open in app on mobile
  const openInApp = () => {
    // Try to open with app scheme
    window.location.href = appDeepLink;
    
    // Fallback - if app doesn't open in 2 seconds, redirect to Play Store
    setTimeout(() => {
      // Check if page is still visible (app didn't open)
      if (!document.hidden) {
        // Could redirect to Play Store here
        // window.location.href = 'https://play.google.com/store/apps/details?id=com.baatcheet.app';
      }
    }, 2000);
  };

  const copyLink = async () => {
    try {
      await navigator.clipboard.writeText(webUrl);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      console.error('Failed to copy');
    }
  };

  const formatTime = (timestamp: string) => {
    return new Date(timestamp).toLocaleTimeString('en-US', {
      hour: 'numeric',
      minute: '2-digit',
      hour12: true,
    });
  };

  // Continue conversation - navigate to chat with the original conversation
  const continueConversation = () => {
    if (conversation?.originalConversationId) {
      navigate(`/app/chat/${conversation.originalConversationId}`);
    } else {
      navigate('/app/chat');
    }
  };

  // Show login required screen for signed out users
  return (
    <>
      <SignedOut>
        <LoginRequiredScreen 
          shareId={shareId || ''} 
          isMobile={isMobile}
          openInApp={openInApp}
          showAppBanner={showAppBanner}
          setShowAppBanner={setShowAppBanner}
        />
      </SignedOut>
      
      <SignedIn>
        {loading ? (
          <div className="min-h-screen bg-dark-900 flex items-center justify-center">
            <div className="text-center">
              <Loader2 className="animate-spin text-primary-400 mx-auto mb-4" size={48} />
              <p className="text-dark-300">Loading shared conversation...</p>
            </div>
          </div>
        ) : error || !conversation ? (
          <ErrorScreen error={error} />
        ) : (
          <ChatViewScreen 
            conversation={conversation}
            isMobile={isMobile}
            showAppBanner={showAppBanner}
            setShowAppBanner={setShowAppBanner}
            openInApp={openInApp}
            copyLink={copyLink}
            copied={copied}
            formatTime={formatTime}
            continueConversation={continueConversation}
            user={user}
          />
        )}
      </SignedIn>
    </>
  );
}

// Login required screen
function LoginRequiredScreen({ 
  shareId, 
  isMobile, 
  openInApp, 
  showAppBanner, 
  setShowAppBanner 
}: { 
  shareId: string; 
  isMobile: boolean; 
  openInApp: () => void;
  showAppBanner: boolean;
  setShowAppBanner: (show: boolean) => void;
}) {
  return (
    <div className="min-h-screen bg-dark-900 flex flex-col">
      {/* Mobile App Banner */}
      {isMobile && showAppBanner && (
        <div className="bg-gradient-to-r from-primary-500/20 to-purple-500/20 border-b border-primary-500/30 px-4 py-3">
          <div className="flex items-center justify-between max-w-4xl mx-auto">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-primary-500 flex items-center justify-center">
                <Smartphone size={20} className="text-white" />
              </div>
              <div>
                <p className="text-white text-sm font-medium">Open in BaatCheet App</p>
                <p className="text-dark-400 text-xs">Login with the app instead</p>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <button
                onClick={openInApp}
                className="px-4 py-2 bg-primary-500 hover:bg-primary-600 text-white text-sm rounded-lg transition-colors"
              >
                Open App
              </button>
              <button
                onClick={() => setShowAppBanner(false)}
                className="text-dark-400 hover:text-dark-200 p-1"
              >
                ✕
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Main content */}
      <div className="flex-1 flex items-center justify-center px-4">
        <div className="max-w-md w-full text-center">
          {/* Icon */}
          <div className="w-24 h-24 rounded-full bg-gradient-to-br from-primary-500/20 to-purple-500/20 flex items-center justify-center mx-auto mb-8 border border-primary-500/30">
            <Lock className="text-primary-400" size={40} />
          </div>

          {/* Title */}
          <h1 className="text-3xl font-bold text-white mb-4">
            Login Required
          </h1>
          
          {/* Description */}
          <p className="text-dark-400 mb-8 leading-relaxed">
            Someone shared a conversation with you! Please sign in to view the full chat and continue the conversation.
          </p>

          {/* Chat preview card */}
          <div className="bg-dark-800/50 border border-dark-700 rounded-2xl p-6 mb-8">
            <div className="flex items-center justify-center gap-3 mb-4">
              <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-primary-500 to-primary-600 flex items-center justify-center">
                <MessageSquare size={24} className="text-white" />
              </div>
            </div>
            <p className="text-dark-300 text-sm">
              A shared conversation is waiting for you
            </p>
            <p className="text-dark-500 text-xs mt-2">
              Share ID: {shareId?.slice(0, 8)}...
            </p>
          </div>

          {/* Auth buttons */}
          <div className="space-y-4">
            <Link
              to={`/sign-in?redirect_url=/share/${shareId}`}
              className="w-full flex items-center justify-center gap-2 px-6 py-3 bg-primary-500 hover:bg-primary-600 text-white rounded-xl transition-colors font-medium"
            >
              Sign In to View
            </Link>
            
            <Link
              to={`/sign-up?redirect_url=/share/${shareId}`}
              className="w-full flex items-center justify-center gap-2 px-6 py-3 bg-dark-700 hover:bg-dark-600 text-white rounded-xl transition-colors"
            >
              Create Account
            </Link>
          </div>

          {/* Footer link */}
          <p className="text-dark-500 text-sm mt-8">
            Don't have an account?{' '}
            <Link to="/" className="text-primary-400 hover:text-primary-300">
              Learn about BaatCheet
            </Link>
          </p>
        </div>
      </div>
    </div>
  );
}

// Error screen
function ErrorScreen({ error }: { error: string | null }) {
  return (
    <div className="min-h-screen bg-dark-900 flex items-center justify-center px-4">
      <div className="text-center max-w-md mx-auto">
        <div className="w-20 h-20 rounded-full bg-red-500/10 flex items-center justify-center mx-auto mb-6">
          <AlertCircle className="text-red-400" size={40} />
        </div>
        <h1 className="text-2xl font-bold text-white mb-4">Chat Not Found</h1>
        <p className="text-dark-400 mb-8">{error || 'This shared chat link is invalid or has expired.'}</p>
        <Link
          to="/app/chat"
          className="inline-flex items-center gap-2 px-6 py-3 bg-primary-500 hover:bg-primary-600 text-white rounded-xl transition-colors"
        >
          <ArrowLeft size={18} />
          Go to Chat
        </Link>
      </div>
    </div>
  );
}

// Chat view screen (when logged in)
function ChatViewScreen({
  conversation,
  isMobile,
  showAppBanner,
  setShowAppBanner,
  openInApp,
  copyLink,
  copied,
  formatTime,
  continueConversation,
  user,
}: {
  conversation: SharedConversation;
  isMobile: boolean;
  showAppBanner: boolean;
  setShowAppBanner: (show: boolean) => void;
  openInApp: () => void;
  copyLink: () => void;
  copied: boolean;
  formatTime: (timestamp: string) => string;
  continueConversation: () => void;
  user: ReturnType<typeof useUser>['user'];
}) {
  return (
    <div className="min-h-screen bg-dark-900 flex flex-col">
      {/* Mobile App Banner */}
      {isMobile && showAppBanner && (
        <div className="bg-gradient-to-r from-primary-500/20 to-purple-500/20 border-b border-primary-500/30 px-4 py-3">
          <div className="flex items-center justify-between max-w-4xl mx-auto">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-primary-500 flex items-center justify-center">
                <Smartphone size={20} className="text-white" />
              </div>
              <div>
                <p className="text-white text-sm font-medium">Open in BaatCheet App</p>
                <p className="text-dark-400 text-xs">Get the full experience</p>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <button
                onClick={openInApp}
                className="px-4 py-2 bg-primary-500 hover:bg-primary-600 text-white text-sm rounded-lg transition-colors"
              >
                Open App
              </button>
              <button
                onClick={() => setShowAppBanner(false)}
                className="text-dark-400 hover:text-dark-200 p-1"
              >
                ✕
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Header */}
      <header className="sticky top-0 z-40 bg-dark-800/95 backdrop-blur border-b border-dark-700">
        <div className="max-w-4xl mx-auto px-4 py-4 flex items-center justify-between">
          <div className="flex items-center gap-4">
            <Link
              to="/app/chat"
              className="flex items-center gap-2 text-dark-400 hover:text-dark-200 transition-colors"
            >
              <ArrowLeft size={20} />
              <span className="hidden sm:inline">Back to Chat</span>
            </Link>
            <div className="h-6 w-px bg-dark-700" />
            <div>
              <h1 className="text-white font-medium truncate max-w-[200px] sm:max-w-none">
                {conversation.title}
              </h1>
              <p className="text-dark-500 text-xs">
                Shared by {conversation.sharedBy}
              </p>
            </div>
          </div>
          
          <div className="flex items-center gap-2">
            <button
              onClick={copyLink}
              className="flex items-center gap-2 px-3 py-2 text-dark-400 hover:text-dark-200 hover:bg-dark-700 rounded-lg transition-colors"
              title="Copy link"
            >
              {copied ? <Check size={18} className="text-green-400" /> : <Copy size={18} />}
              <span className="hidden sm:inline">{copied ? 'Copied!' : 'Copy Link'}</span>
            </button>
          </div>
        </div>
      </header>

      {/* Chat Messages */}
      <main className="flex-1 overflow-y-auto">
        <div className="max-w-4xl mx-auto px-4 py-6 space-y-4">
          {conversation.messages.map((message) => (
            <div
              key={message.id}
              className={`flex gap-4 ${message.role === 'user' ? 'justify-end' : ''}`}
            >
              {message.role === 'assistant' && (
                <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-primary-500 to-primary-600 flex items-center justify-center flex-shrink-0">
                  <Bot size={20} className="text-white" />
                </div>
              )}
              
              <div
                className={`max-w-[80%] sm:max-w-[70%] ${
                  message.role === 'user'
                    ? 'bg-primary-500 text-white rounded-2xl rounded-br-md'
                    : 'bg-dark-800 border border-dark-700 text-dark-200 rounded-2xl rounded-bl-md'
                } px-4 py-3`}
              >
                <p className="whitespace-pre-wrap text-sm sm:text-base">{message.content}</p>
                <p className={`text-xs mt-2 ${message.role === 'user' ? 'text-primary-200' : 'text-dark-500'}`}>
                  {formatTime(message.timestamp)}
                </p>
              </div>
              
              {message.role === 'user' && (
                <div className="w-10 h-10 rounded-xl bg-dark-700 flex items-center justify-center flex-shrink-0">
                  <User size={20} className="text-dark-300" />
                </div>
              )}
            </div>
          ))}
        </div>
      </main>

      {/* Footer CTA - Continue conversation */}
      <div className="sticky bottom-0 bg-dark-800/95 backdrop-blur border-t border-dark-700 px-4 py-4 safe-area-bottom">
        <div className="max-w-4xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-4">
          <div className="text-center sm:text-left">
            <p className="text-dark-200 font-medium">
              {user?.firstName ? `Hi ${user.firstName}!` : 'Continue the conversation'}
            </p>
            <p className="text-dark-500 text-sm">Start chatting from where this left off</p>
          </div>
          <div className="flex items-center gap-3">
            <button
              onClick={continueConversation}
              className="px-6 py-2.5 bg-primary-500 hover:bg-primary-600 text-white rounded-xl transition-colors flex items-center gap-2"
            >
              <MessageSquare size={18} />
              Continue Chat
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
