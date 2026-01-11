/**
 * Chat Page
 * Main chat interface with streaming
 */

import { useState, useEffect, useRef, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import ReactMarkdown from 'react-markdown';
import {
  Send,
  Mic,
  Image as ImageIcon,
  Plus,
  Loader2,
  RefreshCw,
  Copy,
  Check,
  Bot,
  User,
  StopCircle,
  X,
  Paperclip,
} from 'lucide-react';
import { conversations, images } from '../services/api';
import { getClerkToken } from '../utils/auth';
import clsx from 'clsx';

interface Message {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  model?: string;
  imageUrl?: string; // Image attachment URL
  createdAt: string;
}

interface UploadedImage {
  id: string;
  url: string;
  file: File;
  previewUrl: string;
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
  const [uploadedImages, setUploadedImages] = useState<UploadedImage[]>([]);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);
  const abortControllerRef = useRef<AbortController | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

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

    // Add user message optimistically (with image if attached)
    const tempUserMsg: Message = {
      id: `temp-${Date.now()}`,
      role: 'user',
      content: userMessage,
      imageUrl: uploadedImages.length > 0 ? uploadedImages[0].previewUrl : undefined,
      createdAt: new Date().toISOString(),
    };
    setMessages((prev) => [...prev, tempUserMsg]);

    try {
      setStreaming(true);
      setStreamContent('');
      setError(null);
      
      abortControllerRef.current = new AbortController();
      
      // Get Clerk token properly
      const token = await getClerkToken();

      if (!token) {
        setError('Authentication required. Please sign in.');
        setLoading(false);
        setStreaming(false);
        return;
      }

      // Include image IDs if any
      const imageIds = uploadedImages.map(img => img.id);

      const response = await fetch('/api/v1/chat/completions', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          message: userMessage,
          conversationId: conversationId || conversation?.id,
          imageIds: imageIds.length > 0 ? imageIds : undefined,
          stream: true,
        }),
        signal: abortControllerRef.current.signal,
      });

      // Check for auth errors
      if (response.status === 401) {
        setError('Session expired. Please sign in again.');
        setLoading(false);
        setStreaming(false);
        return;
      }

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        setError(errorData.error || `Request failed: ${response.status}`);
        setLoading(false);
        setStreaming(false);
        return;
      }

      // Clear uploaded images after successful send
      setUploadedImages([]);

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

  // Handle image file selection
  const handleImageUpload = useCallback(async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;

    setUploading(true);
    setError(null);

    for (const file of Array.from(files)) {
      // Validate file type
      if (!file.type.startsWith('image/')) {
        setError('Please select an image file');
        continue;
      }

      // Validate file size (10MB max)
      if (file.size > 10 * 1024 * 1024) {
        setError('Image must be less than 10MB');
        continue;
      }

      // Create preview immediately (like ChatGPT)
      const previewUrl = URL.createObjectURL(file);
      const tempId = `temp-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;

      // Add to state with preview
      setUploadedImages(prev => [...prev, {
        id: tempId,
        url: '',
        file,
        previewUrl,
      }]);

      try {
        // Upload to backend
        const { data } = await images.upload(file);
        const imageData = data?.data;

        // Update with real ID and URL
        setUploadedImages(prev => prev.map(img => 
          img.id === tempId 
            ? { ...img, id: imageData?.id || tempId, url: imageData?.url || previewUrl }
            : img
        ));
      } catch (error) {
        console.error('Image upload error:', error);
        // Remove failed upload
        setUploadedImages(prev => prev.filter(img => img.id !== tempId));
        URL.revokeObjectURL(previewUrl);
        setError('Failed to upload image');
      }
    }

    setUploading(false);
    // Reset file input
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  }, []);

  // Remove uploaded image
  const removeImage = useCallback((imageId: string) => {
    setUploadedImages(prev => {
      const img = prev.find(i => i.id === imageId);
      if (img?.previewUrl) {
        URL.revokeObjectURL(img.previewUrl);
      }
      return prev.filter(i => i.id !== imageId);
    });
  }, []);

  // Handle paste for images
  const handlePaste = useCallback(async (e: React.ClipboardEvent) => {
    const items = e.clipboardData?.items;
    if (!items) return;

    for (const item of Array.from(items)) {
      if (item.type.startsWith('image/')) {
        e.preventDefault();
        const file = item.getAsFile();
        if (file) {
          // Create a synthetic event to reuse handleImageUpload
          const dt = new DataTransfer();
          dt.items.add(file);
          const syntheticEvent = {
            target: { files: dt.files }
          } as React.ChangeEvent<HTMLInputElement>;
          await handleImageUpload(syntheticEvent);
        }
      }
    }
  }, [handleImageUpload]);

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
                {/* Image attachment (show first, like ChatGPT) */}
                {msg.imageUrl && (
                  <div className="mb-3">
                    <img
                      src={msg.imageUrl}
                      alt="Attached"
                      className="max-w-sm max-h-64 rounded-lg border border-dark-600 cursor-pointer hover:opacity-90 transition-opacity"
                      onClick={() => window.open(msg.imageUrl, '_blank')}
                    />
                  </div>
                )}

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
          {/* Error message */}
          {error && (
            <div className="mb-3 p-3 bg-red-500/10 border border-red-500/20 rounded-lg flex items-center justify-between">
              <span className="text-red-400 text-sm">{error}</span>
              <button onClick={() => setError(null)} className="text-red-400 hover:text-red-300">
                <X size={16} />
              </button>
            </div>
          )}

          {/* Image previews (like ChatGPT) */}
          {uploadedImages.length > 0 && (
            <div className="mb-3 flex flex-wrap gap-2">
              {uploadedImages.map((img) => (
                <div key={img.id} className="relative group">
                  <img
                    src={img.previewUrl}
                    alt="To upload"
                    className="w-20 h-20 object-cover rounded-lg border border-dark-600"
                  />
                  <button
                    type="button"
                    onClick={() => removeImage(img.id)}
                    className="absolute -top-2 -right-2 w-5 h-5 bg-red-500 hover:bg-red-600 text-white rounded-full flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity"
                  >
                    <X size={12} />
                  </button>
                  {uploading && img.url === '' && (
                    <div className="absolute inset-0 bg-black/50 rounded-lg flex items-center justify-center">
                      <Loader2 className="animate-spin text-white" size={20} />
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}

          <form onSubmit={handleSubmit} className="flex items-end gap-2">
            {/* Image upload */}
            <label className={clsx(
              "p-2.5 cursor-pointer transition-colors",
              uploading ? "text-primary-400" : "text-dark-500 hover:text-dark-300"
            )}>
              {uploading ? (
                <Loader2 className="animate-spin" size={20} />
              ) : (
                <ImageIcon size={20} />
              )}
              <input
                ref={fileInputRef}
                type="file"
                accept="image/*"
                multiple
                className="hidden"
                onChange={handleImageUpload}
                disabled={loading || uploading}
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
                onPaste={handlePaste}
                placeholder={uploadedImages.length > 0 ? "Ask about these images..." : "Type a message..."}
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
