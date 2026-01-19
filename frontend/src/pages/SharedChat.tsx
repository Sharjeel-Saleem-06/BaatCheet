/**
 * Shared Chat Page
 * Displays a shared conversation with deep link support
 * 
 * This page handles:
 * - Viewing shared conversations
 * - Deep linking to mobile app if installed
 * - Beautiful read-only chat view
 */

import { useEffect, useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import { 
  Bot, User, ArrowLeft, Smartphone,
  Loader2, AlertCircle, Copy, Check, ExternalLink 
} from 'lucide-react';
import api from '../services/api';
import Header from '../components/Header';
import Footer from '../components/Footer';

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
}

export default function SharedChat() {
  const { shareId } = useParams();
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
      try {
        setLoading(true);
        const response = await api.get(`/chat/shared/${shareId}`);
        setConversation(response.data);
      } catch (err) {
        console.error('Failed to fetch shared chat:', err);
        setError('This chat link is invalid or has expired.');
      } finally {
        setLoading(false);
      }
    };

    if (shareId) {
      fetchSharedChat();
    }
  }, [shareId]);

  // Try to open in app on mobile
  const openInApp = () => {
    // Create hidden iframe to try app URL scheme
    const iframe = document.createElement('iframe');
    iframe.style.display = 'none';
    iframe.src = appDeepLink;
    document.body.appendChild(iframe);

    // Fallback to Play Store after timeout if app not installed
    setTimeout(() => {
      document.body.removeChild(iframe);
      // Could redirect to Play Store here
      // window.location.href = 'https://play.google.com/store/apps/details?id=com.baatcheet.app';
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

  if (loading) {
    return (
      <div className="min-h-screen bg-dark-900 flex items-center justify-center">
        <div className="text-center">
          <Loader2 className="animate-spin text-primary-400 mx-auto mb-4" size={48} />
          <p className="text-dark-300">Loading shared conversation...</p>
        </div>
      </div>
    );
  }

  if (error || !conversation) {
    return (
      <div className="min-h-screen bg-dark-900">
        <Header transparent={false} />
        <div className="flex items-center justify-center min-h-[60vh]">
          <div className="text-center max-w-md mx-auto px-4">
            <div className="w-20 h-20 rounded-full bg-red-500/10 flex items-center justify-center mx-auto mb-6">
              <AlertCircle className="text-red-400" size={40} />
            </div>
            <h1 className="text-2xl font-bold text-white mb-4">Chat Not Found</h1>
            <p className="text-dark-400 mb-8">{error || 'This shared chat link is invalid or has expired.'}</p>
            <Link
              to="/"
              className="inline-flex items-center gap-2 px-6 py-3 bg-primary-500 hover:bg-primary-600 text-white rounded-xl transition-colors"
            >
              <ArrowLeft size={18} />
              Go to Home
            </Link>
          </div>
        </div>
        <Footer />
      </div>
    );
  }

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
              to="/"
              className="flex items-center gap-2 text-dark-400 hover:text-dark-200 transition-colors"
            >
              <ArrowLeft size={20} />
              <span className="hidden sm:inline">BaatCheet</span>
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

      {/* Footer CTA */}
      <div className="sticky bottom-0 bg-dark-800/95 backdrop-blur border-t border-dark-700 px-4 py-4">
        <div className="max-w-4xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-4">
          <div className="text-center sm:text-left">
            <p className="text-dark-200 font-medium">Continue the conversation</p>
            <p className="text-dark-500 text-sm">Sign up for free to chat with AI</p>
          </div>
          <div className="flex items-center gap-3">
            <Link
              to="/sign-up"
              className="px-6 py-2.5 bg-primary-500 hover:bg-primary-600 text-white rounded-xl transition-colors flex items-center gap-2"
            >
              <ExternalLink size={18} />
              Get Started Free
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}
