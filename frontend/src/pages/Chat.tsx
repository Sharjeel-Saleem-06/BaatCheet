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
import { conversations, images, audio } from '../services/api';
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

interface UploadedFile {
  id: string;
  url: string;
  file: File;
  previewUrl: string;
  status: 'uploading' | 'processing' | 'ready' | 'failed';
  extractedText?: string; // OCR/text extraction result
  type: 'image' | 'document'; // File type
  name: string; // Original filename
  size: number; // File size in bytes
}

// Keep old interface name for compatibility
type UploadedImage = UploadedFile;

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

  // Load recent conversations on mount and when auth is ready
  useEffect(() => {
    // Initial load
    loadRecentConversations();
    
    // Retry after a short delay to ensure Clerk is ready
    const retryTimeout = setTimeout(() => {
      loadRecentConversations();
    }, 1000);

    return () => clearTimeout(retryTimeout);
  }, []);

  // Also reload conversations when navigating back to chat
  useEffect(() => {
    if (!conversationId) {
      loadRecentConversations();
    }
  }, [conversationId]);

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

  // File size limits (to control token consumption)
  const FILE_SIZE_LIMITS = {
    image: 10 * 1024 * 1024,      // 10MB for images
    document: 5 * 1024 * 1024,    // 5MB for documents (text extraction is expensive)
    pdf: 5 * 1024 * 1024,         // 5MB for PDFs
  };

  // Allowed file types
  const ALLOWED_FILE_TYPES = {
    image: ['image/jpeg', 'image/png', 'image/gif', 'image/webp'],
    document: [
      'application/pdf',
      'text/plain',
      'text/markdown',
      'application/msword',
      'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
      'text/csv',
      'application/json',
    ],
  };

  // Get file type category
  const getFileCategory = (mimeType: string): 'image' | 'document' | null => {
    if (ALLOWED_FILE_TYPES.image.includes(mimeType)) return 'image';
    if (ALLOWED_FILE_TYPES.document.includes(mimeType)) return 'document';
    if (mimeType.startsWith('text/')) return 'document';
    return null;
  };

  // Format file size
  const formatFileSize = (bytes: number): string => {
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  };

  // Poll for file processing status
  const pollFileStatus = useCallback(async (fileId: string, tempId: string, fileType: 'image' | 'document') => {
    const maxAttempts = 60; // 60 seconds max for documents (they take longer)
    let attempts = 0;

    const poll = async () => {
      try {
        const token = await getClerkToken();
        const endpoint = fileType === 'image' 
          ? `/api/v1/images/${fileId}/status`
          : `/api/v1/files/${fileId}/status`;
          
        const response = await fetch(endpoint, {
          headers: { Authorization: `Bearer ${token}` }
        });
        
        if (response.ok) {
          const data = await response.json();
          const status = data?.data?.status;
          
          if (status === 'completed') {
            setUploadedImages(prev => prev.map(img =>
              img.id === fileId || img.id === tempId
                ? { ...img, status: 'ready', extractedText: data?.data?.extractedText }
                : img
            ));
            return;
          } else if (status === 'failed') {
            setUploadedImages(prev => prev.map(img =>
              img.id === fileId || img.id === tempId
                ? { ...img, status: 'ready' }
                : img
            ));
            return;
          }
        }
        
        attempts++;
        if (attempts < maxAttempts) {
          setTimeout(poll, 1000);
        } else {
          setUploadedImages(prev => prev.map(img =>
            img.id === fileId || img.id === tempId
              ? { ...img, status: 'ready' }
              : img
          ));
        }
      } catch (error) {
        console.error('Status poll error:', error);
        setUploadedImages(prev => prev.map(img =>
          img.id === fileId || img.id === tempId
            ? { ...img, status: 'ready' }
            : img
        ));
      }
    };

    poll();
  }, []);

  // Handle file selection (images and documents)
  const handleFileUpload = useCallback(async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;

    setUploading(true);
    setError(null);

    for (const file of Array.from(files)) {
      const fileCategory = getFileCategory(file.type);
      
      // Validate file type
      if (!fileCategory) {
        setError(`Unsupported file type: ${file.type || file.name.split('.').pop()}`);
        continue;
      }

      // Validate file size based on type
      const sizeLimit = fileCategory === 'image' ? FILE_SIZE_LIMITS.image : FILE_SIZE_LIMITS.document;
      if (file.size > sizeLimit) {
        setError(`${fileCategory === 'image' ? 'Image' : 'Document'} must be less than ${formatFileSize(sizeLimit)}`);
        continue;
      }

      // Create preview
      const previewUrl = fileCategory === 'image' 
        ? URL.createObjectURL(file) 
        : ''; // No preview for documents
      const tempId = `temp-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;

      // Add to state
      setUploadedImages(prev => [...prev, {
        id: tempId,
        url: '',
        file,
        previewUrl,
        status: 'uploading',
        type: fileCategory,
        name: file.name,
        size: file.size,
      }]);

      try {
        // Upload to appropriate endpoint
        const token = await getClerkToken();
        const formData = new FormData();
        
        if (fileCategory === 'image') {
          formData.append('images', file);
        } else {
          formData.append('file', file);
        }

        const endpoint = fileCategory === 'image' ? '/api/v1/images/upload' : '/api/v1/files/upload';
        const response = await fetch(endpoint, {
          method: 'POST',
          headers: { Authorization: `Bearer ${token}` },
          body: formData,
        });

        if (!response.ok) {
          throw new Error(`Upload failed: ${response.status}`);
        }

        const data = await response.json();
        const fileData = data?.data?.images?.[0] || data?.data;

        if (!fileData?.id) {
          throw new Error('No file ID returned');
        }

        // Update with real ID and URL
        setUploadedImages(prev => prev.map(img => 
          img.id === tempId 
            ? { 
                ...img, 
                id: fileData.id, 
                url: fileData.url || previewUrl,
                status: 'processing'
              }
            : img
        ));

        // Start polling for processing completion
        pollFileStatus(fileData.id, tempId, fileCategory);

      } catch (error) {
        console.error('File upload error:', error);
        setUploadedImages(prev => prev.map(img =>
          img.id === tempId
            ? { ...img, status: 'failed' }
            : img
        ));
        setError('Failed to upload file');
      }
    }

    setUploading(false);
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  }, [pollFileStatus]);

  // Legacy handler for backward compatibility
  const handleImageUpload = handleFileUpload;

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

  // Check if all images are ready
  const allImagesReady = uploadedImages.length === 0 || 
    uploadedImages.every(img => img.status === 'ready');
  
  // Check if any images are still processing
  const imagesProcessing = uploadedImages.some(
    img => img.status === 'uploading' || img.status === 'processing'
  );

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

          {/* File previews (images and documents) */}
          {uploadedImages.length > 0 && (
            <div className="mb-3">
              {/* Processing notice */}
              {imagesProcessing && (
                <div className="mb-2 p-2 bg-primary-500/10 border border-primary-500/20 rounded-lg flex items-center gap-2">
                  <Loader2 className="animate-spin text-primary-400" size={16} />
                  <span className="text-primary-400 text-sm">
                    Analyzing file{uploadedImages.length > 1 ? 's' : ''}... Please wait
                  </span>
                </div>
              )}
              
              <div className="flex flex-wrap gap-2">
                {uploadedImages.map((file) => (
                  <div key={file.id} className="relative group">
                    {/* Image preview */}
                    {file.type === 'image' && file.previewUrl ? (
                      <img
                        src={file.previewUrl}
                        alt="To upload"
                        className={clsx(
                          "w-20 h-20 object-cover rounded-lg border-2 transition-all",
                          file.status === 'ready' ? "border-green-500" :
                          file.status === 'failed' ? "border-red-500" :
                          "border-primary-500 animate-pulse"
                        )}
                      />
                    ) : (
                      /* Document preview */
                      <div className={clsx(
                        "w-20 h-20 rounded-lg border-2 transition-all flex flex-col items-center justify-center bg-dark-700 p-1",
                        file.status === 'ready' ? "border-green-500" :
                        file.status === 'failed' ? "border-red-500" :
                        "border-primary-500 animate-pulse"
                      )}>
                        <Paperclip className="text-dark-400" size={20} />
                        <span className="text-dark-300 text-xs mt-1 truncate w-full text-center px-1">
                          {file.name?.split('.').pop()?.toUpperCase() || 'DOC'}
                        </span>
                        <span className="text-dark-500 text-xs">
                          {formatFileSize(file.size || 0)}
                        </span>
                      </div>
                    )}
                    
                    {/* Remove button */}
                    <button
                      type="button"
                      onClick={() => removeImage(file.id)}
                      className="absolute -top-2 -right-2 w-5 h-5 bg-red-500 hover:bg-red-600 text-white rounded-full flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity z-10"
                    >
                      <X size={12} />
                    </button>
                    
                    {/* Status overlay */}
                    {file.status === 'uploading' && (
                      <div className="absolute inset-0 bg-black/60 rounded-lg flex flex-col items-center justify-center">
                        <Loader2 className="animate-spin text-white" size={20} />
                        <span className="text-white text-xs mt-1">Uploading</span>
                      </div>
                    )}
                    {file.status === 'processing' && (
                      <div className="absolute inset-0 bg-black/60 rounded-lg flex flex-col items-center justify-center">
                        <Loader2 className="animate-spin text-primary-400" size={20} />
                        <span className="text-primary-400 text-xs mt-1">Reading</span>
                      </div>
                    )}
                    {file.status === 'ready' && (
                      <div className="absolute bottom-1 right-1 w-4 h-4 bg-green-500 rounded-full flex items-center justify-center">
                        <Check size={10} className="text-white" />
                      </div>
                    )}
                    {file.status === 'failed' && (
                      <div className="absolute bottom-1 right-1 w-4 h-4 bg-red-500 rounded-full flex items-center justify-center">
                        <X size={10} className="text-white" />
                      </div>
                    )}
                    
                    {/* File name tooltip for documents */}
                    {file.type === 'document' && file.name && (
                      <div className="absolute -bottom-6 left-0 right-0 text-center opacity-0 group-hover:opacity-100 transition-opacity">
                        <span className="text-xs text-dark-400 bg-dark-800 px-1 py-0.5 rounded truncate max-w-[80px] inline-block">
                          {file.name}
                        </span>
                      </div>
                    )}
                  </div>
                ))}
              </div>
              
              {/* File size info */}
              <div className="mt-2 text-xs text-dark-500">
                {uploadedImages.filter(f => f.type === 'image').length > 0 && (
                  <span className="mr-3">
                    📷 {uploadedImages.filter(f => f.type === 'image').length} image(s)
                  </span>
                )}
                {uploadedImages.filter(f => f.type === 'document').length > 0 && (
                  <span>
                    📄 {uploadedImages.filter(f => f.type === 'document').length} document(s)
                  </span>
                )}
              </div>
            </div>
          )}

          <form onSubmit={handleSubmit} className="flex items-end gap-2">
            {/* File upload (images and documents) */}
            <label 
              className={clsx(
                "p-2.5 cursor-pointer transition-colors",
                uploading ? "text-primary-400" : "text-dark-500 hover:text-dark-300"
              )}
              title="Upload images or documents (PDF, TXT, DOC, etc.)"
            >
              {uploading ? (
                <Loader2 className="animate-spin" size={20} />
              ) : (
                <Paperclip size={20} />
              )}
              <input
                ref={fileInputRef}
                type="file"
                accept="image/*,.pdf,.txt,.md,.doc,.docx,.csv,.json"
                multiple
                className="hidden"
                onChange={handleFileUpload}
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
                  if (e.key === 'Enter' && !e.shiftKey && allImagesReady) {
                    e.preventDefault();
                    handleSubmit();
                  }
                }}
                onPaste={handlePaste}
                placeholder={
                  imagesProcessing 
                    ? "Wait for image analysis to complete..." 
                    : uploadedImages.length > 0 
                      ? "Ask about these images..." 
                      : "Type a message..."
                }
                rows={1}
                className="w-full px-4 py-2.5 bg-dark-700 border border-dark-600 rounded-xl text-dark-100 placeholder-dark-500 focus:outline-none focus:border-primary-500 resize-none transition-colors"
                style={{ minHeight: '44px', maxHeight: '200px' }}
                disabled={loading || streaming || imagesProcessing}
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
                disabled={!input.trim() || loading || imagesProcessing}
                className={clsx(
                  "p-2.5 rounded-xl transition-colors",
                  imagesProcessing
                    ? "bg-primary-500/50 text-white/50 cursor-not-allowed"
                    : "bg-primary-500 hover:bg-primary-600 disabled:bg-dark-700 disabled:text-dark-500 text-white"
                )}
                title={imagesProcessing ? "Wait for image analysis to complete" : "Send message"}
              >
                {loading ? (
                  <Loader2 className="animate-spin" size={20} />
                ) : imagesProcessing ? (
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
