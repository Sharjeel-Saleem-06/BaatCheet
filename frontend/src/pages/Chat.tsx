/**
 * Chat Page
 * Main chat interface with streaming
 */

import { useState, useEffect, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import ReactMarkdown from 'react-markdown';
import {
  Send,
  Mic,
  Image,
  Plus,
  Loader2,
  RefreshCw,
  Copy,
  Check,
  Bot,
  User,
  StopCircle,
} from 'lucide-react';
import { chat, conversations, images, audio } from '../services/api';
import clsx from 'clsx';

interface Message {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  model?: string;
  createdAt: string;
}

interface Conversation {
  id: string;
  title: string;
  messages: Message[];
}

export default function Chat() {
  const { conversationId } = useParams();
  const navigate = useNavigate();
  
  const [conversation, setConversation] = useState<Conversation | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [streaming, setStreaming] = useState(false);
  const [streamContent, setStreamContent] = useState('');
  const [recentConversations, setRecentConversations] = useState<Conversation[]>([]);
  const [copied, setCopied] = useState<string | null>(null);
  const [recording, setRecording] = useState(false);
  const [mediaRecorder, setMediaRecorder] = useState<MediaRecorder | null>(null);

  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);
  const abortControllerRef = useRef<AbortController | null>(null);

  // Load conversation
  useEffect(() => {
    if (conversationId) {
      loadConversation(conversationId);
    } else {
      setConversation(null);
      setMessages([]);
    }
  }, [conversationId]);

  // Load recent conversations
  useEffect(() => {
    loadRecentConversations();
  }, []);

  // Scroll to bottom
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, streamContent]);

  const loadConversation = async (id: string) => {
    try {
      const { data } = await conversations.get(id);
      const conv = data?.data;
      if (conv) {
        setConversation(conv);
        setMessages(Array.isArray(conv.messages) ? conv.messages : []);
      }
    } catch (error) {
      console.error('Failed to load conversation:', error);
      setMessages([]);
    }
  };

  const loadRecentConversations = async () => {
    try {
      const { data } = await conversations.list({ limit: 10 });
      // API returns data.data.items, handle both formats for safety
      const items = data?.data?.items || data?.data || [];
      setRecentConversations(Array.isArray(items) ? items : []);
    } catch (error) {
      console.error('Failed to load conversations:', error);
      setRecentConversations([]);
    }
  };

  const handleSubmit = async (e?: React.FormEvent) => {
    e?.preventDefault();
    if (!input.trim() || loading || streaming) return;

    const userMessage = input.trim();
    setInput('');
    setLoading(true);

    // Add user message optimistically
    const tempUserMsg: Message = {
      id: `temp-${Date.now()}`,
      role: 'user',
      content: userMessage,
      createdAt: new Date().toISOString(),
    };
    setMessages((prev) => [...prev, tempUserMsg]);

    try {
      setStreaming(true);
      setStreamContent('');
      
      abortControllerRef.current = new AbortController();
      const token = localStorage.getItem('token');

      const response = await fetch('/api/v1/chat/completions', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          message: userMessage,
          conversationId: conversationId || conversation?.id,
          stream: true,
        }),
        signal: abortControllerRef.current.signal,
      });

      const reader = response.body?.getReader();
      const decoder = new TextDecoder();
      let fullContent = '';
      let newConversationId = conversationId || conversation?.id;

      if (reader) {
        while (true) {
          const { done, value } = await reader.read();
          if (done) break;

          const chunk = decoder.decode(value);
          const lines = chunk.split('\n');

          for (const line of lines) {
            if (line.startsWith('data: ')) {
              try {
                const data = JSON.parse(line.slice(6));
                if (data.content) {
                  fullContent += data.content;
                  setStreamContent(fullContent);
                }
                if (data.conversationId) {
                  newConversationId = data.conversationId;
                }
              } catch {
                // Skip invalid JSON
              }
            }
          }
        }
      }

      // Add assistant message
      const assistantMsg: Message = {
        id: `msg-${Date.now()}`,
        role: 'assistant',
        content: fullContent,
        createdAt: new Date().toISOString(),
      };
      setMessages((prev) => [...prev, assistantMsg]);
      setStreamContent('');

      // Navigate to new conversation if created
      if (newConversationId && !conversationId) {
        navigate(`/chat/${newConversationId}`, { replace: true });
      }

      loadRecentConversations();
    } catch (error) {
      if ((error as Error).name !== 'AbortError') {
        console.error('Chat error:', error);
      }
    } finally {
      setLoading(false);
      setStreaming(false);
      abortControllerRef.current = null;
    }
  };

  const handleStop = () => {
    abortControllerRef.current?.abort();
    setStreaming(false);
    if (streamContent) {
      const assistantMsg: Message = {
        id: `msg-${Date.now()}`,
        role: 'assistant',
        content: streamContent + ' [stopped]',
        createdAt: new Date().toISOString(),
      };
      setMessages((prev) => [...prev, assistantMsg]);
      setStreamContent('');
    }
  };

  const handleNewChat = () => {
    navigate('/chat');
    setConversation(null);
    setMessages([]);
  };

  const handleCopy = (content: string, id: string) => {
    navigator.clipboard.writeText(content);
    setCopied(id);
    setTimeout(() => setCopied(null), 2000);
  };

  const handleRegenerate = async () => {
    if (!conversationId) return;
    setLoading(true);
    try {
      await chat.regenerate(conversationId);
      loadConversation(conversationId);
    } catch (error) {
      console.error('Regenerate error:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setLoading(true);
    try {
      const { data } = await images.analyze(file, 'Describe this image in detail');
      setInput((prev) => prev + `\n[Image Analysis: ${data.data.analysis}]`);
    } catch (error) {
      console.error('Image upload error:', error);
    } finally {
      setLoading(false);
    }
  };

  const startRecording = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const recorder = new MediaRecorder(stream);
      const chunks: Blob[] = [];

      recorder.ondataavailable = (e) => chunks.push(e.data);
      recorder.onstop = async () => {
        const blob = new Blob(chunks, { type: 'audio/webm' });
        const file = new File([blob], 'recording.webm', { type: 'audio/webm' });
        
        setLoading(true);
        try {
          const { data } = await audio.transcribeUpload(file);
          if (data.success && data.data.text) {
            setInput(data.data.text);
          }
        } catch (error) {
          console.error('Transcription error:', error);
        } finally {
          setLoading(false);
        }

        stream.getTracks().forEach((track) => track.stop());
      };

      recorder.start();
      setMediaRecorder(recorder);
      setRecording(true);
    } catch (error) {
      console.error('Recording error:', error);
    }
  };

  const stopRecording = () => {
    if (mediaRecorder) {
      mediaRecorder.stop();
      setRecording(false);
      setMediaRecorder(null);
    }
  };

  return (
    <div className="flex h-full">
      {/* Conversation sidebar */}
      <div className="hidden md:flex w-64 flex-col border-r border-dark-700 bg-dark-800/50">
        <div className="p-4">
          <button
            onClick={handleNewChat}
            className="w-full flex items-center gap-2 px-4 py-2.5 bg-primary-500 hover:bg-primary-600 text-white rounded-lg transition-colors"
          >
            <Plus size={20} />
            <span>New Chat</span>
          </button>
        </div>

        <div className="flex-1 overflow-y-auto p-2 space-y-1">
          {recentConversations.map((conv) => (
            <button
              key={conv.id}
              onClick={() => navigate(`/chat/${conv.id}`)}
              className={clsx(
                'w-full text-left px-3 py-2 rounded-lg text-sm truncate transition-colors',
                conv.id === conversationId
                  ? 'bg-primary-500/10 text-primary-400'
                  : 'text-dark-400 hover:bg-dark-700 hover:text-dark-200'
              )}
            >
              {conv.title || 'New Conversation'}
            </button>
          ))}
        </div>
      </div>

      {/* Chat area */}
      <div className="flex-1 flex flex-col min-w-0">
        {/* Messages */}
        <div className="flex-1 overflow-y-auto p-4 space-y-4">
          {messages.length === 0 && !streaming && (
            <div className="flex flex-col items-center justify-center h-full text-center">
              <div className="w-16 h-16 rounded-2xl bg-primary-500/10 flex items-center justify-center mb-4">
                <Bot className="text-primary-400" size={32} />
              </div>
              <h2 className="text-xl font-semibold text-dark-100 mb-2">
                Start a Conversation
              </h2>
              <p className="text-dark-400 max-w-md">
                Ask me anything! I can help with coding, writing, analysis, and more.
              </p>
            </div>
          )}

          {messages.map((msg) => (
            <div
              key={msg.id}
              className={clsx(
                'flex gap-3',
                msg.role === 'user' ? 'flex-row-reverse' : ''
              )}
            >
              <div
                className={clsx(
                  'w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0',
                  msg.role === 'user'
                    ? 'bg-primary-500/20'
                    : 'bg-dark-700'
                )}
              >
                {msg.role === 'user' ? (
                  <User className="text-primary-400" size={18} />
                ) : (
                  <Bot className="text-dark-300" size={18} />
                )}
              </div>

              <div
                className={clsx(
                  'flex-1 max-w-3xl rounded-xl p-4',
                  msg.role === 'user'
                    ? 'bg-primary-500/10 ml-12'
                    : 'bg-dark-800 mr-12'
                )}
              >
                <div className="prose prose-invert max-w-none">
                  <ReactMarkdown>{msg.content}</ReactMarkdown>
                </div>

                {msg.role === 'assistant' && (
                  <div className="flex items-center gap-2 mt-3 pt-3 border-t border-dark-700">
                    <button
                      onClick={() => handleCopy(msg.content, msg.id)}
                      className="p-1.5 text-dark-500 hover:text-dark-300 transition-colors"
                      title="Copy"
                    >
                      {copied === msg.id ? (
                        <Check size={16} className="text-primary-400" />
                      ) : (
                        <Copy size={16} />
                      )}
                    </button>
                    {msg.model && (
                      <span className="text-xs text-dark-500 ml-auto">
                        {msg.model}
                      </span>
                    )}
                  </div>
                )}
              </div>
            </div>
          ))}

          {/* Streaming message */}
          {streaming && streamContent && (
            <div className="flex gap-3">
              <div className="w-8 h-8 rounded-lg bg-dark-700 flex items-center justify-center flex-shrink-0">
                <Bot className="text-dark-300" size={18} />
              </div>
              <div className="flex-1 max-w-3xl bg-dark-800 rounded-xl p-4 mr-12">
                <div className="prose prose-invert max-w-none">
                  <ReactMarkdown>{streamContent}</ReactMarkdown>
                  <span className="streaming-cursor" />
                </div>
              </div>
            </div>
          )}

          <div ref={messagesEndRef} />
        </div>

        {/* Input area */}
        <div className="border-t border-dark-700 p-4 bg-dark-800/50">
          <form onSubmit={handleSubmit} className="flex items-end gap-2">
            {/* Image upload */}
            <label className="p-2.5 text-dark-500 hover:text-dark-300 cursor-pointer transition-colors">
              <Image size={20} />
              <input
                type="file"
                accept="image/*"
                className="hidden"
                onChange={handleImageUpload}
                disabled={loading}
              />
            </label>

            {/* Voice input */}
            <button
              type="button"
              onClick={recording ? stopRecording : startRecording}
              className={clsx(
                'p-2.5 transition-colors',
                recording
                  ? 'text-red-400 animate-pulse'
                  : 'text-dark-500 hover:text-dark-300'
              )}
              disabled={loading}
            >
              <Mic size={20} />
            </button>

            {/* Text input */}
            <div className="flex-1 relative">
              <textarea
                ref={inputRef}
                value={input}
                onChange={(e) => setInput(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' && !e.shiftKey) {
                    e.preventDefault();
                    handleSubmit();
                  }
                }}
                placeholder="Type a message..."
                rows={1}
                className="w-full px-4 py-2.5 bg-dark-700 border border-dark-600 rounded-xl text-dark-100 placeholder-dark-500 focus:outline-none focus:border-primary-500 resize-none transition-colors"
                style={{ minHeight: '44px', maxHeight: '200px' }}
                disabled={loading || streaming}
              />
            </div>

            {/* Send/Stop button */}
            {streaming ? (
              <button
                type="button"
                onClick={handleStop}
                className="p-2.5 bg-red-500 hover:bg-red-600 text-white rounded-xl transition-colors"
              >
                <StopCircle size={20} />
              </button>
            ) : (
              <button
                type="submit"
                disabled={!input.trim() || loading}
                className="p-2.5 bg-primary-500 hover:bg-primary-600 disabled:bg-dark-700 disabled:text-dark-500 text-white rounded-xl transition-colors"
              >
                {loading ? (
                  <Loader2 className="animate-spin" size={20} />
                ) : (
                  <Send size={20} />
                )}
              </button>
            )}
          </form>

          {/* Regenerate button */}
          {messages.length > 0 && !streaming && (
            <div className="flex justify-center mt-2">
              <button
                onClick={handleRegenerate}
                disabled={loading}
                className="flex items-center gap-1.5 text-xs text-dark-500 hover:text-dark-300 transition-colors"
              >
                <RefreshCw size={14} />
                <span>Regenerate response</span>
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
