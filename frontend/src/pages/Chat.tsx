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
  ChevronDown,
  ThumbsUp,
  ThumbsDown,
  Volume2,
  VolumeX,
  Share2,
  Tag,
  Sparkles,
  Code,
  Globe,
  Search,
  Calculator,
  BookOpen,
  Lightbulb,
  Languages,
  FileText,
  Bug,
  GraduationCap,
  Briefcase,
  Wand2,
  MoreHorizontal,
  Settings,
  Folder,
} from 'lucide-react';
import { conversations, images, audio, modes as modesApi } from '../services/api';
import { getClerkToken } from '../utils/auth';
import TranslationButton from '../components/TranslationButton';
import MarkdownRenderer from '../components/MarkdownRenderer';
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

// Mode icons mapping
const modeIcons: Record<string, React.ComponentType<{ size?: number; className?: string }>> = {
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
  const [showModeSelector, setShowModeSelector] = useState(false);
  
  // TTS
  const [speakingMessageId, setSpeakingMessageId] = useState<string | null>(null);
  const [ttsAudio, setTtsAudio] = useState<HTMLAudioElement | null>(null);
  
  // Feedback
  const [feedbackLoading, setFeedbackLoading] = useState<string | null>(null);
  
  // Tags
  const [showTagsModal, setShowTagsModal] = useState(false);
  const [conversationTags, setConversationTags] = useState<string[]>([]);
  
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
  const silenceTimeoutRef = useRef<NodeJS.Timeout | null>(null);
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
  const modeSelectorRef = useRef<HTMLDivElement>(null);

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

  // Close mode selector on outside click
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (modeSelectorRef.current && !modeSelectorRef.current.contains(event.target as Node)) {
        setShowModeSelector(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const loadModes = async () => {
    try {
      const token = await getClerkToken();
      const response = await fetch('/api/v1/modes', {
        headers: token ? { Authorization: `Bearer ${token}` } : {},
      });
      if (response.ok) {
        const data = await response.json();
        if (data.success && data.data?.modes) {
          setAvailableModes(data.data.modes);
        }
      }
    } catch (error) {
      console.error('Failed to load modes:', error);
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
        if (conv.tags) setConversationTags(conv.tags);
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
    setConversationTags([]);
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
        recognition.maxAlternatives = 1;
        
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
    <div className="flex h-full">
      {/* Conversation sidebar */}
      <div className="hidden md:flex w-72 flex-col border-r border-dark-700 bg-dark-800/50">
        <div className="p-4">
          <button
            onClick={handleNewChat}
            className="w-full flex items-center gap-2 px-4 py-2.5 bg-gradient-to-r from-primary-500 to-primary-600 hover:from-primary-600 hover:to-primary-700 text-white rounded-xl transition-all shadow-lg shadow-primary-500/20"
          >
            <Plus size={20} />
            <span>New Chat</span>
          </button>
        </div>

        {/* Mode selector in sidebar */}
        <div className="px-4 pb-4">
          <div className="relative" ref={modeSelectorRef}>
            <button
              onClick={() => setShowModeSelector(!showModeSelector)}
              className="w-full flex items-center gap-3 px-3 py-2.5 bg-dark-700/50 border border-dark-600 rounded-xl hover:bg-dark-700 transition-colors"
            >
              {(() => {
                const ModeIcon = getModeIcon(selectedMode);
                return <ModeIcon size={18} className="text-primary-400" />;
              })()}
              <span className="flex-1 text-left text-sm text-dark-200">
                {selectedModeData?.name || 'Chat'}
              </span>
              <ChevronDown size={16} className={`text-dark-400 transition-transform ${showModeSelector ? 'rotate-180' : ''}`} />
            </button>

            {showModeSelector && (
              <div className="absolute top-full left-0 right-0 mt-2 bg-dark-800 border border-dark-700 rounded-xl shadow-xl z-50 max-h-80 overflow-y-auto">
                {availableModes.map((mode) => {
                  const ModeIcon = getModeIcon(mode.id);
                  return (
                    <button
                      key={mode.id}
                      onClick={() => {
                        setSelectedMode(mode.id);
                        setShowModeSelector(false);
                      }}
                      className={clsx(
                        'w-full flex items-center gap-3 px-3 py-2.5 hover:bg-dark-700 transition-colors',
                        selectedMode === mode.id && 'bg-primary-500/10'
                      )}
                    >
                      <div className={`w-8 h-8 rounded-lg bg-gradient-to-br ${modeColors[mode.id] || 'from-gray-500 to-gray-600'} flex items-center justify-center`}>
                        <ModeIcon size={16} className="text-white" />
                      </div>
                      <div className="flex-1 text-left">
                        <p className="text-sm font-medium text-dark-200">{mode.name}</p>
                        <p className="text-xs text-dark-500 truncate">{mode.description}</p>
                      </div>
                      {selectedMode === mode.id && (
                        <Check size={16} className="text-primary-400" />
                      )}
                    </button>
                  );
                })}
              </div>
            )}
          </div>
        </div>

        <div className="flex-1 overflow-y-auto p-2 space-y-1">
          {(recentConversations || []).map((conv) => (
            <button
              key={conv.id}
              onClick={() => navigate(`/app/chat/${conv.id}`)}
              className={clsx(
                'w-full text-left px-3 py-2.5 rounded-xl text-sm transition-colors group',
                conv.id === conversationId
                  ? 'bg-primary-500/10 text-primary-400 border border-primary-500/20'
                  : 'text-dark-400 hover:bg-dark-700 hover:text-dark-200'
              )}
            >
              <div className="flex items-center gap-2">
                <MessageSquare size={14} className="flex-shrink-0" />
                <span className="truncate">{conv.title || 'New Conversation'}</span>
              </div>
              {conv.tags && conv.tags.length > 0 && (
                <div className="flex gap-1 mt-1">
                  {conv.tags.slice(0, 2).map((tag, i) => (
                    <span key={i} className="text-xs px-1.5 py-0.5 bg-dark-600 rounded text-dark-400">
                      {tag}
                    </span>
                  ))}
                </div>
              )}
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
              <div className="w-20 h-20 rounded-2xl bg-gradient-to-br from-primary-500/20 to-primary-600/20 flex items-center justify-center mb-6">
                <Bot className="text-primary-400" size={40} />
              </div>
              <h2 className="text-2xl font-bold text-dark-100 mb-2">
                Start a Conversation
              </h2>
              <p className="text-dark-400 max-w-md mb-8">
                Ask me anything! I can help with coding, writing, research, image generation, and more.
              </p>
              
              {/* Quick mode suggestions */}
              <div className="grid grid-cols-2 md:grid-cols-4 gap-3 max-w-2xl">
                {availableModes.slice(0, 8).map((mode) => {
                  const ModeIcon = getModeIcon(mode.id);
                  return (
                    <button
                      key={mode.id}
                      onClick={() => setSelectedMode(mode.id)}
                      className={clsx(
                        'flex flex-col items-center gap-2 p-4 rounded-xl border transition-all',
                        selectedMode === mode.id
                          ? 'bg-primary-500/10 border-primary-500/50'
                          : 'bg-dark-800 border-dark-700 hover:border-dark-600'
                      )}
                    >
                      <div className={`w-10 h-10 rounded-lg bg-gradient-to-br ${modeColors[mode.id] || 'from-gray-500 to-gray-600'} flex items-center justify-center`}>
                        <ModeIcon size={20} className="text-white" />
                      </div>
                      <span className="text-sm text-dark-300">{mode.name}</span>
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
                {/* Image attachment */}
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

                {/* Generated image */}
                {msg.generatedImageUrl && (
                  <div className="mb-3">
                    <img
                      src={msg.generatedImageUrl}
                      alt="Generated"
                      className="max-w-md rounded-lg border border-dark-600 cursor-pointer hover:opacity-90 transition-opacity"
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
                  <div className="mt-2 flex items-center gap-2">
                    <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs bg-dark-600/50 text-dark-400">
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
                  <div className="flex items-center gap-2 mt-3 pt-3 border-t border-dark-700">
                    {/* Copy */}
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

                    {/* TTS */}
                    <button
                      onClick={() => handleSpeak(msg.id, msg.content)}
                      className={clsx(
                        'p-1.5 transition-colors',
                        speakingMessageId === msg.id
                          ? 'text-primary-400'
                          : 'text-dark-500 hover:text-dark-300'
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
                    <div className="flex items-center gap-1 ml-2">
                      <button
                        onClick={() => handleFeedback(msg.id, 'like')}
                        disabled={feedbackLoading === msg.id}
                        className={clsx(
                          'p-1.5 transition-colors',
                          msg.feedback === 'like'
                            ? 'text-green-500'
                            : 'text-dark-500 hover:text-green-400'
                        )}
                        title="Good response"
                      >
                        <ThumbsUp size={14} />
                      </button>
                      <button
                        onClick={() => handleFeedback(msg.id, 'dislike')}
                        disabled={feedbackLoading === msg.id}
                        className={clsx(
                          'p-1.5 transition-colors',
                          msg.feedback === 'dislike'
                            ? 'text-red-500'
                            : 'text-dark-500 hover:text-red-400'
                        )}
                        title="Bad response"
                      >
                        <ThumbsDown size={14} />
                      </button>
                    </div>

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
                <MarkdownRenderer content={streamContent} />
                <span className="streaming-cursor" />
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

          {/* File previews */}
          {uploadedImages.length > 0 && (
            <div className="mb-3">
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
                    
                    <button
                      type="button"
                      onClick={() => removeImage(file.id)}
                      className="absolute -top-2 -right-2 w-5 h-5 bg-red-500 hover:bg-red-600 text-white rounded-full flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity z-10"
                    >
                      <X size={12} />
                    </button>
                    
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
                  </div>
                ))}
              </div>
            </div>
          )}

          <form onSubmit={handleSubmit} className="flex items-end gap-2">
            {/* File upload */}
            <label 
              className={clsx(
                "p-2.5 cursor-pointer transition-colors rounded-lg hover:bg-dark-700",
                uploading ? "text-primary-400" : "text-dark-500 hover:text-dark-300"
              )}
              title="Upload images or documents"
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
                'p-2.5 transition-colors relative rounded-lg hover:bg-dark-700',
                recording
                  ? 'text-red-400'
                  : transcribing
                    ? 'text-primary-400'
                    : 'text-dark-500 hover:text-dark-300'
              )}
              disabled={loading || transcribing}
              title={recording ? "Click to stop recording" : "Click to start voice input"}
            >
              {transcribing ? (
                <Loader2 className="animate-spin" size={20} />
              ) : (
                <>
                  <Mic size={20} />
                  {recording && (
                    <span 
                      className="absolute inset-0 rounded-full bg-red-400/30 animate-ping"
                      style={{ 
                        transform: `scale(${1 + audioLevel * 0.5})`,
                        opacity: 0.3 + audioLevel * 0.4
                      }}
                    />
                  )}
                </>
              )}
            </button>

            {/* Text input */}
            <div className="flex-1 relative">
              {recording && (
                <div className="absolute inset-0 z-10 bg-dark-700 border border-red-500/50 rounded-xl flex items-center px-3 gap-2">
                  <div className="flex items-center gap-0.5 h-6 flex-shrink-0">
                    {[...Array(5)].map((_, i) => (
                      <div
                        key={i}
                        className="w-1 bg-red-400 rounded-full transition-all duration-75"
                        style={{
                          height: `${Math.max(4, Math.min(24, 4 + audioLevel * 20 * (1 + Math.sin(Date.now() / 100 + i) * 0.3)))}px`,
                        }}
                      />
                    ))}
                  </div>
                  
                  <div className="flex-1 overflow-hidden min-w-0">
                    {liveTranscript ? (
                      <p className="text-dark-100 text-sm truncate">
                        {liveTranscript}
                      </p>
                    ) : (
                      <p className="text-dark-400 text-sm flex items-center gap-2">
                        <span className="w-2 h-2 bg-red-500 rounded-full animate-pulse flex-shrink-0" />
                        <span className="truncate">Listening... Speak now</span>
                      </p>
                    )}
                  </div>
                  
                  <button
                    type="button"
                    onClick={cancelRecording}
                    className="px-2 py-1 text-dark-400 hover:text-dark-200 text-sm transition-colors flex-shrink-0"
                    title="Cancel recording"
                  >
                    <X size={18} />
                  </button>
                  
                  <button
                    type="button"
                    onClick={stopRecording}
                    className="px-3 py-1 bg-green-500/20 hover:bg-green-500/30 text-green-400 rounded-lg text-sm font-medium transition-colors flex items-center gap-1 flex-shrink-0"
                    title="Done - use transcribed text"
                  >
                    <Check size={14} />
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
                  "w-full px-4 py-2.5 bg-dark-700 border border-dark-600 rounded-xl text-dark-100 placeholder-dark-500 focus:outline-none focus:border-primary-500 resize-none transition-colors",
                  recording && "opacity-0"
                )}
                style={{ minHeight: '44px', maxHeight: '200px' }}
                disabled={loading || streaming || imagesProcessing || recording}
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
                    : "bg-gradient-to-r from-primary-500 to-primary-600 hover:from-primary-600 hover:to-primary-700 disabled:bg-dark-700 disabled:text-dark-500 text-white"
                )}
                title={imagesProcessing ? "Wait for file analysis to complete" : "Send message"}
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
                onClick={() => {}}
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
