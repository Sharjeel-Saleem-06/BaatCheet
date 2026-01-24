/**
 * Chat Page
 * Enhanced chat interface with AI modes, TTS, image generation, and feedback
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
  ThumbsUp,
  ThumbsDown,
  Volume2,
  VolumeX,
  Share2,
  Sparkles,
  Code,
  Globe,
  Search,
  Calculator,
  Lightbulb,
  Languages,
  FileText,
  Bug,
  GraduationCap,
  Briefcase,
  Wand2,
  Phone,
  MessageSquare,
} from 'lucide-react';
import { conversations, audio } from '../services/api';
import { getClerkToken } from '../utils/auth';
import TranslationButton from '../components/TranslationButton';
import MarkdownRenderer from '../components/MarkdownRenderer';
import VoiceCall from '../components/VoiceCall';
import clsx from 'clsx';

// Web Speech API TypeScript declarations
interface SpeechRecognitionEvent extends Event {
  resultIndex: number;
  results: SpeechRecognitionResultList;
}

interface SpeechRecognitionErrorEvent extends Event {
  error: string;
  message: string;
}

interface SpeechRecognition extends EventTarget {
  continuous: boolean;
  interimResults: boolean;
  lang: string;
  onresult: ((event: SpeechRecognitionEvent) => void) | null;
  onerror: ((event: SpeechRecognitionErrorEvent) => void) | null;
  onend: (() => void) | null;
  start: () => void;
  stop: () => void;
  abort: () => void;
}

declare global {
  interface Window {
    SpeechRecognition: new () => SpeechRecognition;
    webkitSpeechRecognition: new () => SpeechRecognition;
  }
}

interface Message {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  model?: string;
  imageUrl?: string;
  generatedImageUrl?: string;
  createdAt: string;
  isRomanUrdu?: boolean;
  isMixedLanguage?: boolean;
  primaryLanguage?: string;
  inputMethod?: 'text' | 'voice';
  feedback?: 'like' | 'dislike' | null;
}

interface UploadedFile {
  id: string;
  url: string;
  file: File;
  previewUrl: string;
  status: 'uploading' | 'processing' | 'ready' | 'failed';
  extractedText?: string;
  type: 'image' | 'document';
  name: string;
  size: number;
}

interface Conversation {
  id: string;
  title: string;
  messages: Message[];
  mode?: string;
  tags?: string[];
}

interface AIMode {
  id: string;
  name: string;
  icon: string;
  description: string;
  capabilities: string[];
}

// Mode icons mapping - using 'any' to avoid LucideIcon compatibility issues
// eslint-disable-next-line @typescript-eslint/no-explicit-any
const modeIcons: Record<string, any> = {
  'chat': Bot,
  'image-generation': ImageIcon,
  'vision': Sparkles,
  'web-search': Globe,
  'code': Code,
  'data-analysis': FileText,
  'math': Calculator,
  'creative': Wand2,
  'translate': Languages,
  'summarize': FileText,
  'explain': Lightbulb,
  'research': Search,
  'debug': Bug,
  'tutor': GraduationCap,
  'business': Briefcase,
};

// Mode colors
const modeColors: Record<string, string> = {
  'chat': 'from-blue-500 to-cyan-500',
  'image-generation': 'from-purple-500 to-pink-500',
  'vision': 'from-indigo-500 to-violet-500',
  'web-search': 'from-green-500 to-emerald-500',
  'code': 'from-orange-500 to-amber-500',
  'data-analysis': 'from-teal-500 to-cyan-500',
  'math': 'from-red-500 to-orange-500',
  'creative': 'from-pink-500 to-rose-500',
  'translate': 'from-sky-500 to-blue-500',
  'summarize': 'from-violet-500 to-purple-500',
  'explain': 'from-yellow-500 to-amber-500',
  'research': 'from-emerald-500 to-teal-500',
  'debug': 'from-rose-500 to-red-500',
  'tutor': 'from-blue-500 to-indigo-500',
  'business': 'from-slate-500 to-gray-500',
};

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
  const [liveTranscript, setLiveTranscript] = useState('');
  const [audioLevel, setAudioLevel] = useState(0);
  const [transcribing, setTranscribing] = useState(false);
  
  // AI Modes
  const [availableModes, setAvailableModes] = useState<AIMode[]>([]);
  const [selectedMode, setSelectedMode] = useState<string>('chat');
  
  // TTS
  const [speakingMessageId, setSpeakingMessageId] = useState<string | null>(null);
  const [ttsAudio, setTtsAudio] = useState<HTMLAudioElement | null>(null);
  
  // Feedback
  const [feedbackLoading, setFeedbackLoading] = useState<string | null>(null);
  
  // Share
  const [showShareModal, setShowShareModal] = useState(false);
  const [shareLink, setShareLink] = useState<string | null>(null);
  const [shareLoading, setShareLoading] = useState(false);
  const [shareCopied, setShareCopied] = useState(false);
  
  // Voice Call
  const [showVoiceCall, setShowVoiceCall] = useState(false);
  
  // Quick action tags
  const quickTags = [
    { id: 'image', icon: ImageIcon, label: 'Image', color: 'from-purple-500 to-pink-500', prompt: 'Generate an image of ' },
    { id: 'code', icon: Code, label: 'Code', color: 'from-orange-500 to-amber-500', prompt: 'Write code for ' },
    { id: 'research', icon: Search, label: 'Research', color: 'from-green-500 to-emerald-500', prompt: 'Research about ' },
    { id: 'translate', icon: Languages, label: 'Translate', color: 'from-blue-500 to-cyan-500', prompt: 'Translate to Urdu: ' },
    { id: 'explain', icon: Lightbulb, label: 'Explain', color: 'from-yellow-500 to-amber-500', prompt: 'Explain in simple terms: ' },
    { id: 'summarize', icon: FileText, label: 'Summarize', color: 'from-violet-500 to-purple-500', prompt: 'Summarize this: ' },
  ];
  
  // Language metadata for voice input
  const [voiceInputMetadata, setVoiceInputMetadata] = useState<{
    isRomanUrdu: boolean;
    isMixedLanguage: boolean;
    primaryLanguage: string;
    inputMethod: 'voice' | 'text';
  } | null>(null);
  
  // Refs
  const speechRecognitionRef = useRef<SpeechRecognition | null>(null);
  const audioContextRef = useRef<AudioContext | null>(null);
  const analyserRef = useRef<AnalyserNode | null>(null);
  const silenceTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const audioStreamRef = useRef<MediaStream | null>(null);
  const animationFrameRef = useRef<number | null>(null);
  const isRecordingRef = useRef(false);
  const recognitionActiveRef = useRef(false);
  const [uploadedImages, setUploadedImages] = useState<UploadedFile[]>([]);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);
  const abortControllerRef = useRef<AbortController | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Load available modes
  useEffect(() => {
    loadModes();
  }, []);

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
    const retryTimeout = setTimeout(() => {
      loadRecentConversations();
    }, 1000);
    return () => clearTimeout(retryTimeout);
  }, []);

  useEffect(() => {
    if (!conversationId) {
      loadRecentConversations();
    }
  }, [conversationId]);

  // Scroll to bottom
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, streamContent]);


  // Default modes for fallback when API is unavailable
  const defaultModes: AIMode[] = [
    { id: 'chat', name: 'Chat', icon: 'Bot', description: 'General conversation', capabilities: ['chat'] },
    { id: 'image-generation', name: 'Image Generation', icon: 'Image', description: 'Create images from text', capabilities: ['image'] },
    { id: 'code', name: 'Code Assistant', icon: 'Code', description: 'Help with programming', capabilities: ['code'] },
    { id: 'web-search', name: 'Web Search', icon: 'Globe', description: 'Search the internet', capabilities: ['search'] },
    { id: 'translate', name: 'Translate', icon: 'Languages', description: 'Translate text between languages', capabilities: ['translate'] },
    { id: 'creative', name: 'Creative Writing', icon: 'Wand2', description: 'Creative content generation', capabilities: ['creative'] },
  ];

  const loadModes = async () => {
    // Set default modes first
    setAvailableModes(defaultModes);
    
    try {
      const token = await getClerkToken();
      const response = await fetch('/api/v1/modes', {
        headers: token ? { Authorization: `Bearer ${token}` } : {},
      });
      if (response.ok) {
        const data = await response.json();
        if (data.success && data.data?.modes && data.data.modes.length > 0) {
          setAvailableModes(data.data.modes);
        }
      }
    } catch (error) {
      console.error('Failed to load modes, using defaults:', error);
      // Keep default modes on error
    }
  };

  const loadConversation = async (id: string) => {
    try {
      const { data } = await conversations.get(id);
      const conv = data?.data;
      if (conv) {
        setConversation(conv);
        setMessages(Array.isArray(conv.messages) ? conv.messages : []);
        if (conv.mode) setSelectedMode(conv.mode);
        // Tags loaded with conversation
      }
    } catch (error) {
      console.error('Failed to load conversation:', error);
      setMessages([]);
    }
  };

  const loadRecentConversations = async () => {
    try {
      const response = await conversations.list({ limit: 20 });
      const data = response?.data;
      
      let items: Conversation[] = [];
      
      if (Array.isArray(data)) {
        items = data;
      } else if (data?.data?.items && Array.isArray(data.data.items)) {
        items = data.data.items;
      } else if (data?.data && Array.isArray(data.data)) {
        items = data.data;
      } else if (data?.items && Array.isArray(data.items)) {
        items = data.items;
      } else if (data?.conversations && Array.isArray(data.conversations)) {
        items = data.conversations;
      } else if (typeof data === 'object' && data !== null) {
        const values = Object.values(data);
        const arrValue = values.find(v => Array.isArray(v));
        if (arrValue) {
          items = arrValue as Conversation[];
        }
      }
      
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

    const tempUserMsg: Message = {
      id: `temp-${Date.now()}`,
      role: 'user',
      content: userMessage,
      imageUrl: uploadedImages.length > 0 ? uploadedImages[0].previewUrl : undefined,
      createdAt: new Date().toISOString(),
      ...(voiceInputMetadata && {
        isRomanUrdu: voiceInputMetadata.isRomanUrdu,
        isMixedLanguage: voiceInputMetadata.isMixedLanguage,
        primaryLanguage: voiceInputMetadata.primaryLanguage,
        inputMethod: voiceInputMetadata.inputMethod,
      }),
    };
    setMessages((prev) => [...prev, tempUserMsg]);
    setVoiceInputMetadata(null);

    try {
      setStreaming(true);
      setStreamContent('');
      setError(null);
      
      abortControllerRef.current = new AbortController();
      
      const token = await getClerkToken();

      if (!token) {
        setError('Authentication required. Please sign in.');
        setLoading(false);
        setStreaming(false);
        return;
      }

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
          mode: selectedMode,
          stream: true,
        }),
        signal: abortControllerRef.current.signal,
      });

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

      setUploadedImages([]);

      const reader = response.body?.getReader();
      const decoder = new TextDecoder();
      let fullContent = '';
      let newConversationId = conversationId || conversation?.id;
      let generatedImageUrl: string | undefined;

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
                if (data.imageUrl) {
                  generatedImageUrl = data.imageUrl;
                }
              } catch {
                // Skip invalid JSON
              }
            }
          }
        }
      }

      const assistantMsg: Message = {
        id: `msg-${Date.now()}`,
        role: 'assistant',
        content: fullContent,
        generatedImageUrl,
        createdAt: new Date().toISOString(),
      };
      setMessages((prev) => [...prev, assistantMsg]);
      setStreamContent('');

      if (newConversationId && !conversationId) {
        navigate(`/app/chat/${newConversationId}`, { replace: true });
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
    navigate('/app/chat');
    setConversation(null);
    setMessages([]);
  };

  const handleCopy = (content: string, id: string) => {
    navigator.clipboard.writeText(content);
    setCopied(id);
    setTimeout(() => setCopied(null), 2000);
  };

  // TTS functions
  const handleSpeak = async (messageId: string, content: string) => {
    // If already speaking this message, stop it
    if (speakingMessageId === messageId) {
      if (ttsAudio) {
        ttsAudio.pause();
        ttsAudio.currentTime = 0;
      }
      setSpeakingMessageId(null);
      setTtsAudio(null);
      return;
    }

    // Stop any currently playing audio
    if (ttsAudio) {
      ttsAudio.pause();
      ttsAudio.currentTime = 0;
    }

    try {
      setSpeakingMessageId(messageId);
      
      const token = await getClerkToken();
      const response = await fetch('/api/v1/tts/speak', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ text: content }),
      });

      if (!response.ok) throw new Error('TTS failed');

      const audioBlob = await response.blob();
      const audioUrl = URL.createObjectURL(audioBlob);
      const audio = new Audio(audioUrl);
      
      audio.onended = () => {
        setSpeakingMessageId(null);
        setTtsAudio(null);
        URL.revokeObjectURL(audioUrl);
      };

      audio.onerror = () => {
        setSpeakingMessageId(null);
        setTtsAudio(null);
      };

      setTtsAudio(audio);
      await audio.play();
    } catch (error) {
      console.error('TTS error:', error);
      setSpeakingMessageId(null);
      setTtsAudio(null);
    }
  };

  // Feedback functions
  const handleFeedback = async (messageId: string, feedbackType: 'like' | 'dislike') => {
    if (feedbackLoading) return;
    
    setFeedbackLoading(messageId);
    try {
      const token = await getClerkToken();
      await fetch('/api/v1/chat/feedback', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          messageId,
          conversationId: conversationId || conversation?.id,
          feedbackType,
        }),
      });

      // Update local state
      setMessages(prev => prev.map(msg => 
        msg.id === messageId ? { ...msg, feedback: feedbackType } : msg
      ));
    } catch (error) {
      console.error('Feedback error:', error);
    } finally {
      setFeedbackLoading(null);
    }
  };

  // Share conversation
  const handleShare = async () => {
    if (!conversationId && !conversation?.id) return;
    
    setShareLoading(true);
    setShowShareModal(true);
    
    try {
      const token = await getClerkToken();
      const response = await fetch(`/api/v1/share/${conversationId || conversation?.id}`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ expiresInDays: 7 }),
      });

      if (response.ok) {
        const data = await response.json();
        const shareUrl = `${window.location.origin}/shared/${data.data?.shareId || data.shareId}`;
        setShareLink(shareUrl);
      } else {
        const errorData = await response.json();
        setError(errorData.error || 'Failed to create share link');
      }
    } catch (err) {
      console.error('Share error:', err);
      setError('Failed to create share link');
    } finally {
      setShareLoading(false);
    }
  };

  const copyShareLink = () => {
    if (shareLink) {
      navigator.clipboard.writeText(shareLink);
      setShareCopied(true);
      setTimeout(() => setShareCopied(false), 2000);
    }
  };
  
  // Quick tag handler
  const handleQuickTag = (prompt: string, modeId: string) => {
    setInput(prompt);
    if (modeId === 'image') setSelectedMode('image-generation');
    else if (modeId === 'code') setSelectedMode('code');
    else if (modeId === 'research') setSelectedMode('research');
    else if (modeId === 'translate') setSelectedMode('translate');
    inputRef.current?.focus();
  };
  
  // Voice call - opens full screen voice call modal
  const openVoiceCall = () => {
    setShowVoiceCall(true);
  };
  
  const handleVoiceCallConversationCreated = (newConversationId: string) => {
    // Navigate to the new conversation and refresh list
    navigate(`/app/chat/${newConversationId}`);
    // Reload recent conversations
    loadRecentConversations();
  };

  // File handling
  const FILE_SIZE_LIMITS = {
    image: 10 * 1024 * 1024,
    document: 5 * 1024 * 1024,
    pdf: 5 * 1024 * 1024,
  };

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

  const getFileCategory = (mimeType: string): 'image' | 'document' | null => {
    if (ALLOWED_FILE_TYPES.image.includes(mimeType)) return 'image';
    if (ALLOWED_FILE_TYPES.document.includes(mimeType)) return 'document';
    if (mimeType.startsWith('text/')) return 'document';
    return null;
  };

  const formatFileSize = (bytes: number): string => {
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  };

  const pollFileStatus = useCallback(async (fileId: string, tempId: string, fileType: 'image' | 'document') => {
    const maxAttempts = 60;
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

  const handleFileUpload = useCallback(async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;

    setUploading(true);
    setError(null);

    for (const file of Array.from(files)) {
      const fileCategory = getFileCategory(file.type);
      
      if (!fileCategory) {
        setError(`Unsupported file type: ${file.type || file.name.split('.').pop()}`);
        continue;
      }

      const sizeLimit = fileCategory === 'image' ? FILE_SIZE_LIMITS.image : FILE_SIZE_LIMITS.document;
      if (file.size > sizeLimit) {
        setError(`${fileCategory === 'image' ? 'Image' : 'Document'} must be less than ${formatFileSize(sizeLimit)}`);
        continue;
      }

      const previewUrl = fileCategory === 'image' ? URL.createObjectURL(file) : '';
      const tempId = `temp-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;

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

  const removeImage = useCallback((imageId: string) => {
    setUploadedImages(prev => {
      const img = prev.find(i => i.id === imageId);
      if (img?.previewUrl) {
        URL.revokeObjectURL(img.previewUrl);
      }
      return prev.filter(i => i.id !== imageId);
    });
  }, []);

  const allImagesReady = uploadedImages.length === 0 || 
    uploadedImages.every(img => img.status === 'ready');
  
  const imagesProcessing = uploadedImages.some(
    img => img.status === 'uploading' || img.status === 'processing'
  );

  const handlePaste = useCallback(async (e: React.ClipboardEvent) => {
    const items = e.clipboardData?.items;
    if (!items) return;

    for (const item of Array.from(items)) {
      if (item.type.startsWith('image/')) {
        e.preventDefault();
        const file = item.getAsFile();
        if (file) {
          const dt = new DataTransfer();
          dt.items.add(file);
          const syntheticEvent = {
            target: { files: dt.files }
          } as React.ChangeEvent<HTMLInputElement>;
          await handleFileUpload(syntheticEvent);
        }
      }
    }
  }, [handleFileUpload]);

  // Voice recording functions
  const cleanupVoiceMode = useCallback(() => {
    isRecordingRef.current = false;
    recognitionActiveRef.current = false;
    
    if (speechRecognitionRef.current) {
      try {
        speechRecognitionRef.current.abort();
      } catch (e) {}
      speechRecognitionRef.current = null;
    }
    
    if (audioStreamRef.current) {
      audioStreamRef.current.getTracks().forEach(track => track.stop());
      audioStreamRef.current = null;
    }
    
    if (audioContextRef.current && audioContextRef.current.state !== 'closed') {
      try {
        audioContextRef.current.close();
      } catch (e) {}
      audioContextRef.current = null;
    }
    
    if (silenceTimeoutRef.current) {
      clearTimeout(silenceTimeoutRef.current);
      silenceTimeoutRef.current = null;
    }
    if (animationFrameRef.current) {
      cancelAnimationFrame(animationFrameRef.current);
      animationFrameRef.current = null;
    }
    
    analyserRef.current = null;
    setRecording(false);
    setAudioLevel(0);
    setLiveTranscript('');
  }, []);

  const monitorAudioLevel = useCallback(() => {
    if (!analyserRef.current) return;
    
    const dataArray = new Uint8Array(analyserRef.current.frequencyBinCount);
    
    const updateLevel = () => {
      if (!analyserRef.current || !isRecordingRef.current) {
        setAudioLevel(0);
        return;
      }
      
      analyserRef.current.getByteFrequencyData(dataArray);
      const average = dataArray.reduce((a, b) => a + b, 0) / dataArray.length;
      const normalizedLevel = Math.min(average / 128, 1);
      
      setAudioLevel(normalizedLevel);
      animationFrameRef.current = requestAnimationFrame(updateLevel);
    };
    
    updateLevel();
  }, []);

  const cancelRecording = useCallback(() => {
    if (mediaRecorder) {
      mediaRecorder.ondataavailable = null;
      mediaRecorder.onstop = null;
      if (mediaRecorder.state !== 'inactive') {
        mediaRecorder.stop();
      }
    }
    setMediaRecorder(null);
    cleanupVoiceMode();
    setLiveTranscript('');
  }, [mediaRecorder, cleanupVoiceMode]);

  const stopRecording = useCallback(() => {
    isRecordingRef.current = false;
    recognitionActiveRef.current = false;
    
    if (speechRecognitionRef.current) {
      try {
        speechRecognitionRef.current.stop();
      } catch (e) {}
      speechRecognitionRef.current = null;
    }
    
    if (mediaRecorder && mediaRecorder.state !== 'inactive') {
      mediaRecorder.stop();
    }
    setMediaRecorder(null);
    cleanupVoiceMode();
  }, [mediaRecorder, cleanupVoiceMode]);

  const startRecording = async () => {
    if (isRecordingRef.current) return;
    
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ 
        audio: {
          echoCancellation: true,
          noiseSuppression: true,
          autoGainControl: true,
        } 
      });
      audioStreamRef.current = stream;
      
      isRecordingRef.current = true;
      recognitionActiveRef.current = true;
      setRecording(true);
      setLiveTranscript('');
      
      const audioContext = new AudioContext();
      audioContextRef.current = audioContext;
      
      const analyser = audioContext.createAnalyser();
      analyser.fftSize = 256;
      analyserRef.current = analyser;
      
      const source = audioContext.createMediaStreamSource(stream);
      source.connect(analyser);
      
      monitorAudioLevel();
      
      let recorder: MediaRecorder;
      try {
        recorder = new MediaRecorder(stream, { mimeType: 'audio/webm' });
      } catch {
        recorder = new MediaRecorder(stream);
      }
      const chunks: Blob[] = [];
      
      recorder.ondataavailable = (e) => {
        if (e.data.size > 0) {
          chunks.push(e.data);
        }
      };
      
      recorder.onstop = async () => {
        const currentTranscript = liveTranscript.trim();
        if (!currentTranscript && chunks.length > 0) {
          setTranscribing(true);
          try {
            const blob = new Blob(chunks, { type: 'audio/webm' });
            const file = new File([blob], 'recording.webm', { type: 'audio/webm' });
            const { data } = await audio.transcribeUpload(file);
            if (data.success && data.data.text) {
              setInput(prev => prev ? `${prev} ${data.data.text}` : data.data.text);
              setVoiceInputMetadata({
                isRomanUrdu: data.data.isRomanUrdu || false,
                isMixedLanguage: data.data.isMixedLanguage || false,
                primaryLanguage: data.data.primaryLanguage || data.data.language || 'english',
                inputMethod: 'voice',
              });
            }
          } catch (error) {
            console.error('Fallback transcription error:', error);
          } finally {
            setTranscribing(false);
          }
        } else if (currentTranscript) {
          try {
            const { data } = await audio.detectLanguage(currentTranscript);
            if (data.success) {
              setVoiceInputMetadata({
                isRomanUrdu: data.data.isRomanUrdu || false,
                isMixedLanguage: data.data.primaryLanguage === 'mixed',
                primaryLanguage: data.data.primaryLanguage || 'english',
                inputMethod: 'voice',
              });
            }
          } catch (error) {
            console.error('Language detection error:', error);
          }
        }
      };
      
      setMediaRecorder(recorder);
      recorder.start(1000);
      
      const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
      
      if (SpeechRecognition) {
        const recognition = new SpeechRecognition();
        recognition.continuous = true;
        recognition.interimResults = true;
        recognition.lang = 'en-US';
        
        let finalTranscript = '';
        let lastSpeechTime = Date.now();
        
        recognition.onresult = (event: SpeechRecognitionEvent) => {
          if (!recognitionActiveRef.current) return;
          
          let interimTranscript = '';
          
          for (let i = event.resultIndex; i < event.results.length; i++) {
            const transcript = event.results[i][0].transcript;
            if (event.results[i].isFinal) {
              finalTranscript += transcript + ' ';
              setInput(prev => {
                const newText = prev ? `${prev} ${transcript}` : transcript;
                return newText.trim();
              });
            } else {
              interimTranscript += transcript;
            }
          }
          
          setLiveTranscript(finalTranscript + interimTranscript);
          lastSpeechTime = Date.now();
          
          if (silenceTimeoutRef.current) {
            clearTimeout(silenceTimeoutRef.current);
          }
          
          if (finalTranscript.trim()) {
            silenceTimeoutRef.current = setTimeout(() => {
              if (recognitionActiveRef.current && Date.now() - lastSpeechTime >= 3000) {
                stopRecording();
              }
            }, 3500);
          }
        };
        
        recognition.onerror = (event: SpeechRecognitionErrorEvent) => {
          if (event.error !== 'aborted' && event.error !== 'no-speech') {
            console.error('Speech recognition error:', event.error);
          }
        };
        
        recognition.onend = () => {
          if (recognitionActiveRef.current && speechRecognitionRef.current) {
            try {
              setTimeout(() => {
                if (recognitionActiveRef.current && speechRecognitionRef.current) {
                  speechRecognitionRef.current.start();
                }
              }, 100);
            } catch (e) {}
          }
        };
        
        speechRecognitionRef.current = recognition;
        
        try {
          recognition.start();
        } catch (e) {
          console.error('Failed to start speech recognition:', e);
        }
      }
      
    } catch (error) {
      console.error('Recording error:', error);
      setError('Failed to access microphone. Please check permissions.');
      cleanupVoiceMode();
    }
  };

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      isRecordingRef.current = false;
      recognitionActiveRef.current = false;
      cleanupVoiceMode();
    };
  }, [cleanupVoiceMode]);

  // Get mode icon component
  const getModeIcon = (modeId: string) => {
    return modeIcons[modeId] || Bot;
  };

  const selectedModeData = availableModes.find(m => m.id === selectedMode);

  return (
    <div className="flex h-full bg-gradient-to-br from-slate-50 via-white to-slate-100">
      {/* Conversation sidebar */}
      <div className="hidden md:flex w-72 flex-col border-r border-slate-200 bg-white">
        <div className="p-4">
          <button
            onClick={handleNewChat}
            className="group w-full flex items-center gap-2.5 px-4 py-3 bg-gradient-to-r from-emerald-500 to-teal-500 hover:from-emerald-600 hover:to-teal-600 text-white rounded-xl transition-all shadow-lg shadow-emerald-500/20 hover:shadow-emerald-500/30 hover:scale-[1.02]"
          >
            <Plus size={20} />
            <span className="font-semibold">New Chat</span>
          </button>
        </div>

        {/* Chat label in sidebar */}
        <div className="px-4 pb-4">
          <div className="w-full flex items-center gap-3 px-3 py-3 bg-slate-50 border border-slate-200 rounded-xl">
            <Bot size={18} className="text-emerald-600" />
            <span className="text-sm text-slate-700 font-medium">Chat</span>
          </div>
        </div>

        {/* Recent Conversations Header */}
        <div className="px-4 py-2.5 border-b border-slate-200">
          <span className="text-xs text-slate-500 font-semibold uppercase tracking-wider">Recent Chats</span>
        </div>

        <div className="flex-1 overflow-y-auto p-2 space-y-1">
          {(recentConversations || []).length === 0 ? (
            <div className="flex flex-col items-center justify-center py-10 text-center">
              <div className="w-14 h-14 rounded-2xl bg-slate-50 border border-slate-200 flex items-center justify-center mb-3">
                <MessageSquare className="text-slate-400" size={24} />
              </div>
              <p className="text-slate-600 text-sm font-medium">No conversations yet</p>
              <p className="text-slate-400 text-xs mt-1">Start a new chat to begin</p>
            </div>
          ) : (
            (recentConversations || []).map((conv) => (
              <button
                key={conv.id}
                onClick={() => navigate(`/app/chat/${conv.id}`)}
                className={clsx(
                  'w-full text-left px-3 py-3 rounded-xl text-sm transition-all group',
                  conv.id === conversationId
                    ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                    : 'text-slate-600 hover:bg-slate-50 hover:text-slate-800'
                )}
              >
                <div className="flex items-center gap-2.5">
                  <MessageSquare size={14} className="flex-shrink-0 opacity-50" />
                  <span className="truncate flex-1 font-medium">{conv.title || 'New Conversation'}</span>
                </div>
                {conv.tags && conv.tags.length > 0 && (
                  <div className="flex gap-1 mt-1.5 ml-5">
                    {conv.tags.slice(0, 2).map((tag, i) => (
                      <span key={i} className="text-xs px-2 py-0.5 bg-slate-100 rounded-full text-slate-500">
                        {tag}
                      </span>
                    ))}
                  </div>
                )}
              </button>
            ))
          )}
        </div>
      </div>

      {/* Chat area */}
      <div className="flex-1 flex flex-col min-w-0 bg-gradient-to-b from-slate-50 to-white">
        {/* Chat header with share button */}
        {conversationId && conversation && (
          <div className="flex items-center justify-between px-5 py-4 border-b border-slate-200 bg-white/90 backdrop-blur-xl">
            <div className="flex items-center gap-3 min-w-0">
              <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-emerald-500 to-teal-500 flex items-center justify-center shadow-lg shadow-emerald-500/25">
                <Bot className="text-white" size={20} />
              </div>
              <div>
                <h2 className="text-slate-800 font-semibold truncate">
                  {conversation.title || 'New Conversation'}
                </h2>
                {selectedModeData && (
                  <span className="text-xs text-emerald-600 flex items-center gap-1">
                    <span className="w-1.5 h-1.5 bg-emerald-500 rounded-full animate-pulse" />
                    {selectedModeData.name} Mode
                  </span>
                )}
              </div>
            </div>
            <div className="flex items-center gap-1">
              {/* Voice call button */}
              <button
                onClick={openVoiceCall}
                className="flex items-center gap-2 px-4 py-2 rounded-xl transition-all text-slate-600 hover:text-emerald-600 hover:bg-emerald-50"
                title="Start voice call"
              >
                <Phone size={18} />
                <span className="hidden sm:inline text-sm font-medium">Call</span>
              </button>
              <button
                onClick={handleShare}
                className="flex items-center gap-2 px-4 py-2 text-slate-600 hover:text-emerald-600 hover:bg-emerald-50 rounded-xl transition-all"
                title="Share conversation"
              >
                <Share2 size={18} />
                <span className="hidden sm:inline text-sm font-medium">Share</span>
              </button>
            </div>
          </div>
        )}

        {/* Messages */}
        <div className="flex-1 overflow-y-auto p-4 sm:p-6 space-y-6">
          {messages.length === 0 && !streaming && (
            <div className="flex flex-col items-center justify-center min-h-full text-center px-4 py-8">
              {/* Logo and Welcome - with top margin to prevent cut-off */}
              <div className="relative mb-8 mt-4">
                <div className="absolute inset-0 bg-gradient-to-br from-emerald-400 via-teal-400 to-cyan-400 rounded-3xl blur-3xl opacity-30 animate-pulse" />
                <div className="relative w-24 h-24 rounded-2xl bg-gradient-to-br from-white to-slate-50 border border-slate-200/60 shadow-2xl flex items-center justify-center overflow-hidden backdrop-blur-sm">
                  <img src="/logo.png" alt="BaatCheet" className="w-20 h-20 object-contain drop-shadow-sm" />
                </div>
              </div>
              <h2 className="text-3xl font-bold bg-gradient-to-r from-slate-800 via-slate-700 to-slate-600 bg-clip-text text-transparent mb-3">
                How can I help you today?
              </h2>
              <p className="text-slate-500 max-w-md mb-8 text-base">
                I can help with coding, writing, research, image generation, and much more.
              </p>
              
              {/* Voice Call Button */}
              <button
                onClick={openVoiceCall}
                className="group flex items-center gap-3 px-8 py-4 mb-8 bg-gradient-to-r from-emerald-500 via-teal-500 to-cyan-500 hover:from-emerald-600 hover:via-teal-600 hover:to-cyan-600 text-white rounded-2xl transition-all duration-300 shadow-xl shadow-emerald-500/25 hover:shadow-emerald-500/40 hover:scale-[1.02] border border-white/20"
              >
                <Phone size={22} className="group-hover:animate-pulse" />
                <span className="font-semibold text-lg">Start Voice Call</span>
              </button>
              
              {/* Quick Action Tags */}
              <div className="mb-8">
                <p className="text-slate-400 text-sm font-semibold uppercase tracking-wider mb-4">Quick Actions</p>
                <div className="flex flex-wrap justify-center gap-2 max-w-2xl">
                  {quickTags.map((tag) => (
                    <button
                      key={tag.id}
                      onClick={() => handleQuickTag(tag.prompt, tag.id)}
                      className="group flex items-center gap-2.5 px-4 py-2.5 bg-gradient-to-br from-white to-slate-50 border border-slate-200/80 rounded-xl hover:border-emerald-400 hover:shadow-lg hover:shadow-emerald-500/10 transition-all duration-200"
                    >
                      <div className={`w-7 h-7 rounded-lg bg-gradient-to-br ${tag.color} flex items-center justify-center transition-transform group-hover:scale-110 shadow-md`}>
                        <tag.icon size={14} className="text-white" />
                      </div>
                      <span className="text-sm font-medium text-slate-700 group-hover:text-emerald-600">{tag.label}</span>
                    </button>
                  ))}
                </div>
              </div>
              
              {/* Quick mode suggestions */}
              <div className="grid grid-cols-2 md:grid-cols-4 gap-3 max-w-3xl">
                {availableModes.slice(0, 8).map((mode) => {
                  const ModeIcon = getModeIcon(mode.id);
                  return (
                    <button
                      key={mode.id}
                      onClick={() => setSelectedMode(mode.id)}
                      className={clsx(
                        'flex flex-col items-center gap-3 p-5 rounded-2xl border transition-all duration-200',
                        selectedMode === mode.id
                          ? 'bg-gradient-to-br from-emerald-50 to-teal-50 border-emerald-400 shadow-lg shadow-emerald-500/15 ring-2 ring-emerald-400/30'
                          : 'bg-gradient-to-br from-white to-slate-50 border-slate-200/80 hover:border-slate-300 hover:shadow-lg hover:shadow-slate-500/10'
                      )}
                    >
                      <div className={`w-12 h-12 rounded-xl bg-gradient-to-br ${modeColors[mode.id] || 'from-gray-500 to-gray-600'} flex items-center justify-center shadow-lg shadow-black/10`}>
                        <ModeIcon size={22} className="text-white drop-shadow" />
                      </div>
                      <span className="text-sm font-medium text-slate-700">{mode.name}</span>
                    </button>
                  );
                })}
              </div>
            </div>
          )}

          {messages.map((msg) => (
            <div
              key={msg.id}
              className={clsx(
                'flex gap-4',
                msg.role === 'user' ? 'flex-row-reverse' : ''
              )}
            >
              <div
                className={clsx(
                  'w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0',
                  msg.role === 'user'
                    ? 'bg-gradient-to-br from-emerald-500 via-teal-500 to-cyan-500 shadow-lg shadow-emerald-500/20'
                    : 'bg-gradient-to-br from-white to-slate-50 border border-slate-200/80 shadow-lg shadow-slate-500/10'
                )}
              >
                {msg.role === 'user' ? (
                  <User className="text-white drop-shadow" size={20} />
                ) : (
                  <img src="/logo.png" alt="AI" className="w-7 h-7 object-contain" />
                )}
              </div>

              <div
                className={clsx(
                  'flex-1 max-w-3xl rounded-2xl p-5',
                  msg.role === 'user'
                    ? 'bg-gradient-to-br from-emerald-500 via-teal-500 to-cyan-500 text-white ml-12 shadow-xl shadow-emerald-500/25 border border-white/10'
                    : 'bg-gradient-to-br from-white to-slate-50 border border-slate-200/80 mr-12 shadow-lg shadow-slate-500/10'
                )}
              >
                {/* Image attachment */}
                {msg.imageUrl && (
                  <div className="mb-4">
                    <img
                      src={msg.imageUrl}
                      alt="Attached"
                      className="max-w-sm max-h-64 rounded-xl border border-slate-200 cursor-pointer hover:opacity-90 transition-opacity shadow-md"
                      onClick={() => window.open(msg.imageUrl, '_blank')}
                    />
                  </div>
                )}

                {/* Generated image */}
                {msg.generatedImageUrl && (
                  <div className="mb-4">
                    <img
                      src={msg.generatedImageUrl}
                      alt="Generated"
                      className="max-w-md rounded-xl border border-slate-200 cursor-pointer hover:opacity-90 transition-opacity shadow-md"
                      onClick={() => window.open(msg.generatedImageUrl, '_blank')}
                    />
                  </div>
                )}

                {msg.role === 'assistant' ? (
                  <MarkdownRenderer content={msg.content} />
                ) : (
                  <div className="prose prose-invert max-w-none">
                    <ReactMarkdown>{msg.content}</ReactMarkdown>
                  </div>
                )}

                {/* Language indicator */}
                {msg.role === 'user' && msg.isRomanUrdu && (
                  <div className="mt-3 flex items-center gap-2">
                    <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs bg-white/20 text-white/90">
                      {msg.isMixedLanguage ? '🌐 Mixed' : '🇵🇰 Roman Urdu'}
                      {msg.inputMethod === 'voice' && ' • Voice'}
                    </span>
                    <TranslationButton
                      originalText={msg.content}
                      isRomanUrdu={msg.isRomanUrdu}
                    />
                  </div>
                )}

                {/* Assistant message actions */}
                {msg.role === 'assistant' && (
                  <div className="flex items-center gap-1 mt-4 pt-4 border-t border-slate-100">
                    {/* Copy */}
                    <button
                      onClick={() => handleCopy(msg.content, msg.id)}
                      className="p-2 rounded-lg text-slate-400 hover:text-emerald-600 hover:bg-emerald-50 transition-all"
                      title="Copy"
                    >
                      {copied === msg.id ? (
                        <Check size={16} className="text-emerald-500" />
                      ) : (
                        <Copy size={16} />
                      )}
                    </button>

                    {/* TTS */}
                    <button
                      onClick={() => handleSpeak(msg.id, msg.content)}
                      className={clsx(
                        'p-2 rounded-lg transition-all',
                        speakingMessageId === msg.id
                          ? 'text-emerald-500 bg-emerald-50'
                          : 'text-slate-400 hover:text-emerald-600 hover:bg-emerald-50'
                      )}
                      title={speakingMessageId === msg.id ? 'Stop' : 'Listen'}
                    >
                      {speakingMessageId === msg.id ? (
                        <VolumeX size={16} />
                      ) : (
                        <Volume2 size={16} />
                      )}
                    </button>

                    {/* Feedback */}
                    <div className="flex items-center gap-0.5 ml-2 px-1 py-0.5 rounded-lg bg-slate-50 border border-slate-200">
                      <button
                        onClick={() => handleFeedback(msg.id, 'like')}
                        disabled={feedbackLoading === msg.id}
                        className={clsx(
                          'p-1.5 rounded-md transition-all',
                          msg.feedback === 'like'
                            ? 'text-emerald-500 bg-emerald-100'
                            : 'text-slate-400 hover:text-emerald-500 hover:bg-emerald-50'
                        )}
                        title="Good response"
                      >
                        <ThumbsUp size={14} />
                      </button>
                      <button
                        onClick={() => handleFeedback(msg.id, 'dislike')}
                        disabled={feedbackLoading === msg.id}
                        className={clsx(
                          'p-1.5 rounded-md transition-all',
                          msg.feedback === 'dislike'
                            ? 'text-red-500 bg-red-100'
                            : 'text-slate-400 hover:text-red-500 hover:bg-red-50'
                        )}
                        title="Bad response"
                      >
                        <ThumbsDown size={14} />
                      </button>
                    </div>

                    {msg.model && (
                      <span className="text-xs text-slate-500 ml-auto px-2 py-1 bg-slate-100 rounded-lg">
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
            <div className="flex gap-4">
              <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-white to-slate-50 border border-slate-200/80 flex items-center justify-center flex-shrink-0 shadow-lg shadow-slate-500/10">
                <img src="/logo.png" alt="AI" className="w-7 h-7 object-contain" />
              </div>
              <div className="flex-1 max-w-3xl bg-gradient-to-br from-white to-slate-50 border border-slate-200/80 rounded-2xl p-5 mr-12 shadow-lg shadow-slate-500/10">
                <MarkdownRenderer content={streamContent} />
                <span className="inline-block w-2 h-5 bg-gradient-to-b from-emerald-500 to-teal-500 animate-pulse rounded-sm ml-1" />
              </div>
            </div>
          )}

          <div ref={messagesEndRef} />
        </div>

        {/* Input area */}
        <div className="border-t border-slate-200 p-4 sm:p-5 bg-white safe-area-bottom">
          {/* Error message */}
          {error && (
            <div className="mb-4 p-4 bg-red-50 border border-red-200 rounded-xl flex items-center justify-between">
              <span className="text-red-600 text-sm font-medium">{error}</span>
              <button onClick={() => setError(null)} className="text-red-500 hover:text-red-700 p-1 hover:bg-red-100 rounded-lg transition-all">
                <X size={18} />
              </button>
            </div>
          )}

          {/* File previews */}
          {uploadedImages.length > 0 && (
            <div className="mb-4">
              {imagesProcessing && (
                <div className="mb-3 p-3 bg-emerald-50 border border-emerald-200 rounded-xl flex items-center gap-3">
                  <Loader2 className="animate-spin text-emerald-500" size={18} />
                  <span className="text-emerald-600 text-sm font-medium">
                    Analyzing file{uploadedImages.length > 1 ? 's' : ''}... Please wait
                  </span>
                </div>
              )}
              
              <div className="flex flex-wrap gap-3">
                {uploadedImages.map((file) => (
                  <div key={file.id} className="relative group">
                    {file.type === 'image' && file.previewUrl ? (
                      <img
                        src={file.previewUrl}
                        alt="To upload"
                        className={clsx(
                          "w-20 h-20 object-cover rounded-xl border-2 transition-all shadow-lg",
                          file.status === 'ready' ? "border-emerald-500" :
                          file.status === 'failed' ? "border-red-500" :
                          "border-cyan-500 animate-pulse"
                        )}
                      />
                    ) : (
                      <div className={clsx(
                        "w-20 h-20 rounded-xl border-2 transition-all flex flex-col items-center justify-center bg-slate-50 p-2",
                        file.status === 'ready' ? "border-emerald-500" :
                        file.status === 'failed' ? "border-red-500" :
                        "border-teal-500 animate-pulse"
                      )}>
                        <Paperclip className="text-slate-500" size={20} />
                        <span className="text-slate-700 text-xs mt-1 truncate w-full text-center px-1 font-medium">
                          {file.name?.split('.').pop()?.toUpperCase() || 'DOC'}
                        </span>
                        <span className="text-slate-500 text-xs">
                          {formatFileSize(file.size || 0)}
                        </span>
                      </div>
                    )}
                    
                    <button
                      type="button"
                      onClick={() => removeImage(file.id)}
                      className="absolute -top-2 -right-2 w-6 h-6 bg-red-500 hover:bg-red-600 text-white rounded-full flex items-center justify-center opacity-0 group-hover:opacity-100 transition-all shadow-lg"
                    >
                      <X size={14} />
                    </button>
                    
                    {file.status === 'uploading' && (
                      <div className="absolute inset-0 bg-black/70 rounded-xl flex flex-col items-center justify-center backdrop-blur-sm">
                        <Loader2 className="animate-spin text-white" size={22} />
                        <span className="text-white text-xs mt-1 font-medium">Uploading</span>
                      </div>
                    )}
                    {file.status === 'processing' && (
                      <div className="absolute inset-0 bg-black/70 rounded-xl flex flex-col items-center justify-center backdrop-blur-sm">
                        <Loader2 className="animate-spin text-emerald-400" size={22} />
                        <span className="text-emerald-400 text-xs mt-1 font-medium">Reading</span>
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
                  </div>
                ))}
              </div>
            </div>
          )}

          <form onSubmit={handleSubmit} className="flex items-end gap-2">
            {/* File upload */}
            <label 
              className={clsx(
                "p-3 cursor-pointer transition-all rounded-xl hover:bg-slate-100",
                uploading ? "text-emerald-500" : "text-slate-500 hover:text-emerald-600"
              )}
              title="Upload images or documents"
            >
              {uploading ? (
                <Loader2 className="animate-spin" size={22} />
              ) : (
                <Paperclip size={22} />
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
                'p-3 transition-all relative rounded-xl hover:bg-slate-100',
                recording
                  ? 'text-red-500 bg-red-50'
                  : transcribing
                    ? 'text-emerald-500 bg-emerald-50'
                    : 'text-slate-500 hover:text-emerald-600'
              )}
              disabled={loading || transcribing}
              title={recording ? "Click to stop recording" : "Click to start voice input"}
            >
              {transcribing ? (
                <Loader2 className="animate-spin" size={22} />
              ) : (
                <>
                  <Mic size={22} />
                  {recording && (
                    <span 
                      className="absolute inset-0 rounded-xl bg-red-100 animate-ping"
                      style={{ 
                        transform: `scale(${1 + audioLevel * 0.3})`,
                        opacity: 0.4 + audioLevel * 0.4
                      }}
                    />
                  )}
                </>
              )}
            </button>

            {/* Text input */}
            <div className="flex-1 relative">
              {recording && (
                <div className="absolute inset-0 z-10 bg-white border border-red-200 rounded-2xl flex items-center px-4 gap-3 shadow-lg">
                  <div className="flex items-center gap-1 h-8 flex-shrink-0">
                    {[...Array(5)].map((_, i) => (
                      <div
                        key={i}
                        className="w-1.5 bg-gradient-to-t from-red-500 to-red-400 rounded-full transition-all duration-75"
                        style={{
                          height: `${Math.max(6, Math.min(28, 6 + audioLevel * 22 * (1 + Math.sin(Date.now() / 100 + i) * 0.3)))}px`,
                        }}
                      />
                    ))}
                  </div>
                  
                  <div className="flex-1 overflow-hidden min-w-0">
                    {liveTranscript ? (
                      <p className="text-slate-800 text-sm truncate font-medium">
                        {liveTranscript}
                      </p>
                    ) : (
                      <p className="text-slate-500 text-sm flex items-center gap-2 font-medium">
                        <span className="w-2 h-2 bg-red-500 rounded-full animate-pulse flex-shrink-0" />
                        <span className="truncate">Listening... Speak now</span>
                      </p>
                    )}
                  </div>
                  
                  <button
                    type="button"
                    onClick={cancelRecording}
                    className="p-2 text-slate-400 hover:text-slate-700 hover:bg-slate-100 rounded-lg transition-all flex-shrink-0"
                    title="Cancel recording"
                  >
                    <X size={18} />
                  </button>
                  
                  <button
                    type="button"
                    onClick={stopRecording}
                    className="px-4 py-2 bg-emerald-100 hover:bg-emerald-200 text-emerald-700 rounded-xl text-sm font-semibold transition-all flex items-center gap-1.5 flex-shrink-0"
                    title="Done - use transcribed text"
                  >
                    <Check size={16} />
                    Done
                  </button>
                </div>
              )}
              
              <textarea
                ref={inputRef}
                value={input}
                onChange={(e) => setInput(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' && !e.shiftKey && allImagesReady && !recording) {
                    e.preventDefault();
                    handleSubmit();
                  }
                }}
                onPaste={handlePaste}
                placeholder={
                  transcribing
                    ? "Transcribing audio..."
                    : imagesProcessing 
                      ? "Wait for file analysis to complete..." 
                      : uploadedImages.length > 0 
                        ? "Ask about these files..." 
                        : selectedMode === 'image-generation'
                          ? "Describe the image you want to generate..."
                          : "Type a message..."
                }
                rows={1}
                className={clsx(
                  "w-full px-5 py-3.5 bg-gradient-to-br from-white to-slate-50 border border-slate-200/80 rounded-2xl text-slate-800 placeholder-slate-400 focus:outline-none focus:border-emerald-400 focus:ring-4 focus:ring-emerald-100/50 focus:shadow-lg focus:shadow-emerald-500/10 resize-none transition-all duration-200",
                  recording && "opacity-0"
                )}
                style={{ minHeight: '52px', maxHeight: '200px' }}
                disabled={loading || streaming || imagesProcessing || recording}
              />
            </div>

            {/* Send/Stop button */}
            {streaming ? (
              <button
                type="button"
                onClick={handleStop}
                className="p-3 bg-gradient-to-r from-red-500 to-rose-500 hover:from-red-600 hover:to-rose-600 text-white rounded-xl transition-all duration-200 shadow-lg shadow-red-500/25 hover:shadow-red-500/40 border border-white/10"
              >
                <StopCircle size={22} className="drop-shadow" />
              </button>
            ) : (
              <button
                type="submit"
                disabled={!input.trim() || loading || imagesProcessing}
                className={clsx(
                  "p-3 rounded-xl transition-all duration-200 flex items-center justify-center",
                  imagesProcessing
                    ? "bg-gradient-to-r from-emerald-200 to-teal-200 text-emerald-500 cursor-not-allowed border border-emerald-300"
                    : input.trim() && !loading
                      ? "bg-gradient-to-r from-emerald-500 via-teal-500 to-cyan-500 hover:from-emerald-600 hover:via-teal-600 hover:to-cyan-600 text-white shadow-lg shadow-emerald-500/30 hover:shadow-emerald-500/50 border border-white/10"
                      : "bg-gradient-to-br from-slate-100 to-slate-200 text-slate-400 border border-slate-300 cursor-not-allowed"
                )}
                title={imagesProcessing ? "Wait for file analysis to complete" : "Send message"}
              >
                {loading ? (
                  <Loader2 className="animate-spin" size={22} />
                ) : imagesProcessing ? (
                  <Loader2 className="animate-spin" size={22} />
                ) : (
                  <Send size={22} className={input.trim() ? "drop-shadow text-white" : "text-slate-400"} />
                )}
              </button>
            )}
          </form>

          {/* Regenerate button */}
          {messages.length > 0 && !streaming && (
            <div className="flex justify-center mt-3">
              <button
                onClick={() => {}}
                disabled={loading}
                className="flex items-center gap-2 px-4 py-2 text-xs font-medium text-slate-500 hover:text-emerald-600 hover:bg-emerald-50 rounded-lg transition-all"
              >
                <RefreshCw size={14} />
                <span>Regenerate response</span>
              </button>
            </div>
          )}
        </div>
      </div>

      {/* Share Modal */}
      {showShareModal && (
        <div className="fixed inset-0 bg-black/30 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl border border-slate-200 w-full max-w-md shadow-2xl">
            <div className="flex items-center justify-between p-4 border-b border-slate-200">
              <div className="flex items-center gap-2">
                <Share2 className="text-emerald-500" size={20} />
                <h2 className="text-lg font-semibold text-slate-800">Share Conversation</h2>
              </div>
              <button
                onClick={() => {
                  setShowShareModal(false);
                  setShareLink(null);
                }}
                className="p-2 text-slate-400 hover:text-slate-700 hover:bg-slate-100 rounded-lg transition-all"
              >
                <X size={20} />
              </button>
            </div>

            <div className="p-6">
              {shareLoading ? (
                <div className="flex flex-col items-center py-8">
                  <Loader2 className="animate-spin text-emerald-500 mb-3" size={32} />
                  <p className="text-slate-500 font-medium">Creating share link...</p>
                </div>
              ) : shareLink ? (
                <div className="space-y-5">
                  <p className="text-slate-500 text-sm">
                    Anyone with this link can view this conversation. The link expires in 7 days.
                  </p>
                  <div className="flex items-center gap-2">
                    <input
                      type="text"
                      value={shareLink}
                      readOnly
                      className="flex-1 px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl text-slate-700 text-sm focus:outline-none"
                    />
                    <button
                      onClick={copyShareLink}
                      className={clsx(
                        'px-4 py-3 rounded-xl transition-all flex items-center gap-2 font-medium',
                        shareCopied
                          ? 'bg-emerald-100 text-emerald-700'
                          : 'bg-gradient-to-r from-emerald-500 to-teal-500 text-white hover:from-emerald-600 hover:to-teal-600'
                      )}
                    >
                      {shareCopied ? (
                        <>
                          <Check size={18} />
                          <span>Copied!</span>
                        </>
                      ) : (
                        <>
                          <Copy size={18} />
                          <span>Copy</span>
                        </>
                      )}
                    </button>
                  </div>
                  <div className="flex gap-3 pt-2">
                    <a
                      href={`https://twitter.com/intent/tweet?url=${encodeURIComponent(shareLink)}&text=${encodeURIComponent('Check out my AI conversation on BaatCheet!')}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="flex-1 py-3 bg-slate-50 hover:bg-slate-100 text-slate-700 rounded-xl transition-all text-center text-sm font-medium border border-slate-200"
                    >
                      Share on Twitter
                    </a>
                    <a
                      href={`https://www.linkedin.com/sharing/share-offsite/?url=${encodeURIComponent(shareLink)}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="flex-1 py-3 bg-slate-50 hover:bg-slate-100 text-slate-700 rounded-xl transition-all text-center text-sm font-medium border border-slate-200"
                    >
                      Share on LinkedIn
                    </a>
                  </div>
                </div>
              ) : (
                <div className="text-center py-4">
                  <p className="text-red-500 font-medium">Failed to create share link. Please try again.</p>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
      
      {/* Voice Call Modal */}
      <VoiceCall
        isOpen={showVoiceCall}
        onClose={() => setShowVoiceCall(false)}
        onConversationCreated={handleVoiceCallConversationCreated}
      />
    </div>
  );
}
