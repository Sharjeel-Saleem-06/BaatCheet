/**
 * VoiceCall Component - Full Voice Chat Interface
 * Matches the Android app's VoiceChatScreen functionality
 * 
 * Features:
 * - Intro screen with voice mode explanation
 * - Voice selection screen with preview
 * - Active call screen with animated cloud bubble
 * - Speech recognition (Web Speech API)
 * - Text-to-speech for AI responses
 */

import { useState, useEffect, useRef, useCallback } from 'react';
import { 
  X, Mic, Phone, ArrowRight, ArrowLeft, Play, Square, 
  Volume2, Loader2, PhoneOff
} from 'lucide-react';
import clsx from 'clsx';
import api from '../services/api';

// Types
interface AIVoice {
  id: string;
  name: string;
  description: string;
  color: string;
  icon: string;
}

interface VoiceCallProps {
  isOpen: boolean;
  onClose: () => void;
  onConversationCreated?: (conversationId: string) => void;
}

type VoiceStep = 'intro' | 'voice-select' | 'active-call';

// Default voices matching Android app
const defaultVoices: AIVoice[] = [
  {
    id: 'ur-PK-AsadNeural',
    name: 'Asad (اردو)',
    description: 'Pakistani Urdu • Best for Urdu & Roman Urdu',
    color: '#34C759',
    icon: '🇵🇰'
  },
  {
    id: 'ur-PK-UzmaNeural',
    name: 'Uzma (اردو)',
    description: 'Pakistani Urdu • Warm feminine voice',
    color: '#FF2D55',
    icon: '🇵🇰'
  },
  {
    id: 'en-US-GuyNeural',
    name: 'Guy (English)',
    description: 'American English • Clear male voice',
    color: '#007AFF',
    icon: '🇺🇸'
  },
  {
    id: 'en-US-JennyNeural',
    name: 'Jenny (English)',
    description: 'American English • Friendly female voice',
    color: '#6366F1',
    icon: '🇺🇸'
  }
];

export default function VoiceCall({ isOpen, onClose, onConversationCreated }: VoiceCallProps) {
  // State
  const [step, setStep] = useState<VoiceStep>('intro');
  const [selectedVoice, setSelectedVoice] = useState<AIVoice | null>(defaultVoices[0]);
  const [playingVoiceId, setPlayingVoiceId] = useState<string | null>(null);
  
  // Call state
  const [isRecording, setIsRecording] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const [isAISpeaking, setIsAISpeaking] = useState(false);
  const [transcript, setTranscript] = useState('');
  const [conversationId, setConversationId] = useState<string | null>(null);
  const [callDuration, setCallDuration] = useState(0);
  const [error, setError] = useState<string | null>(null);
  
  // Refs
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const recognitionRef = useRef<any>(null);
  const synthRef = useRef<SpeechSynthesisUtterance | null>(null);
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  
  // Check for speech recognition support
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
  const hasSpeechRecognition = !!SpeechRecognition;

  // Setup speech recognition
  useEffect(() => {
    if (!hasSpeechRecognition) return;
    
    const recognition = new SpeechRecognition();
    recognition.continuous = false;
    recognition.interimResults = true;
    recognition.lang = 'en-US';
    
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    recognition.onresult = (event: any) => {
      const results = Array.from(event.results) as SpeechRecognitionResult[];
      const transcriptText = results
        .map((result: SpeechRecognitionResult) => result[0].transcript)
        .join('');
      setTranscript(transcriptText);
      
      // Check if final result
      if (results.some((r: SpeechRecognitionResult) => r.isFinal)) {
        handleSendMessage(transcriptText);
      }
    };
    
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    recognition.onerror = (event: any) => {
      console.error('Speech recognition error:', event.error);
      setIsRecording(false);
      if (event.error !== 'no-speech') {
        setError(`Speech error: ${event.error}`);
      }
    };
    
    recognition.onend = () => {
      setIsRecording(false);
    };
    
    recognitionRef.current = recognition;
    
    return () => {
      recognition.abort();
    };
  }, [hasSpeechRecognition]);

  // Call timer
  useEffect(() => {
    if (step === 'active-call') {
      timerRef.current = setInterval(() => {
        setCallDuration(d => d + 1);
      }, 1000);
    }
    
    return () => {
      if (timerRef.current) {
        clearInterval(timerRef.current);
      }
    };
  }, [step]);

  // Format duration
  const formatDuration = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  // Start recording
  const startRecording = useCallback(() => {
    if (!recognitionRef.current) {
      setError('Speech recognition not supported in this browser');
      return;
    }
    
    setTranscript('');
    setIsRecording(true);
    setError(null);
    
    try {
      recognitionRef.current.start();
    } catch (e) {
      console.error('Failed to start recognition:', e);
      setIsRecording(false);
    }
  }, []);

  // Stop recording
  const stopRecording = useCallback(() => {
    if (recognitionRef.current) {
      recognitionRef.current.stop();
    }
    setIsRecording(false);
  }, []);

  // Send message to AI
  const handleSendMessage = async (text: string) => {
    if (!text.trim()) return;
    
    setIsProcessing(true);
    setError(null);
    
    try {
      const response = await api.post('/chat', {
        message: text,
        conversationId,
        mode: 'voice',
        maxTokens: 150, // Short responses for voice
      });
      
      const data = response.data;
      if (data.success) {
        const aiText = data.data.content || data.data.message;
        // AI response received - speak it
        setConversationId(data.data.conversationId);
        
        // Speak the response
        speakResponse(aiText);
      } else {
        throw new Error(data.error || 'Failed to get response');
      }
    } catch (e) {
      console.error('Chat error:', e);
      setError('Failed to get AI response');
      setIsProcessing(false);
    }
  };

  // Speak AI response using TTS
  const speakResponse = async (text: string) => {
    setIsProcessing(false);
    setIsAISpeaking(true);
    
    try {
      // Try backend TTS first
      const response = await api.post('/tts/generate', {
        text,
        voice: selectedVoice?.id || 'en-US-GuyNeural',
      }, {
        responseType: 'arraybuffer'
      });
      
      // Create audio from response
      const blob = new Blob([response.data], { type: 'audio/mpeg' });
      const url = URL.createObjectURL(blob);
      
      if (audioRef.current) {
        audioRef.current.pause();
      }
      
      const audio = new Audio(url);
      audioRef.current = audio;
      
      audio.onended = () => {
        setIsAISpeaking(false);
        URL.revokeObjectURL(url);
      };
      
      audio.onerror = () => {
        // Fallback to browser TTS
        speakWithBrowserTTS(text);
      };
      
      await audio.play();
    } catch (e) {
      // Fallback to browser TTS
      speakWithBrowserTTS(text);
    }
  };

  // Browser TTS fallback
  const speakWithBrowserTTS = (text: string) => {
    if (!window.speechSynthesis) {
      setIsAISpeaking(false);
      return;
    }
    
    // Cancel any ongoing speech
    window.speechSynthesis.cancel();
    
    const utterance = new SpeechSynthesisUtterance(text);
    utterance.rate = 1.0;
    utterance.pitch = 1.0;
    
    utterance.onend = () => {
      setIsAISpeaking(false);
    };
    
    utterance.onerror = () => {
      setIsAISpeaking(false);
    };
    
    synthRef.current = utterance;
    window.speechSynthesis.speak(utterance);
  };

  // Play voice preview
  const playVoicePreview = async (voice: AIVoice) => {
    if (playingVoiceId === voice.id) {
      // Stop playing
      if (audioRef.current) {
        audioRef.current.pause();
        audioRef.current = null;
      }
      window.speechSynthesis.cancel();
      setPlayingVoiceId(null);
      return;
    }
    
    setPlayingVoiceId(voice.id);
    
    try {
      // Try backend TTS
      const response = await api.post('/tts/generate', {
        text: `Hi, I'm ${voice.name.split(' ')[0]}!`,
        voice: voice.id,
      }, {
        responseType: 'arraybuffer'
      });
      
      const blob = new Blob([response.data], { type: 'audio/mpeg' });
      const url = URL.createObjectURL(blob);
      
      const audio = new Audio(url);
      audioRef.current = audio;
      
      audio.onended = () => {
        setPlayingVoiceId(null);
        URL.revokeObjectURL(url);
      };
      
      audio.onerror = () => {
        // Fallback to browser TTS
        previewWithBrowserTTS(voice);
      };
      
      await audio.play();
    } catch (e) {
      previewWithBrowserTTS(voice);
    }
  };

  // Browser TTS preview fallback
  const previewWithBrowserTTS = (voice: AIVoice) => {
    if (!window.speechSynthesis) {
      setPlayingVoiceId(null);
      return;
    }
    
    window.speechSynthesis.cancel();
    
    const utterance = new SpeechSynthesisUtterance(`Hi, I'm ${voice.name.split(' ')[0]}!`);
    utterance.rate = 1.0;
    
    utterance.onend = () => setPlayingVoiceId(null);
    utterance.onerror = () => setPlayingVoiceId(null);
    
    window.speechSynthesis.speak(utterance);
  };

  // End call
  const endCall = () => {
    if (recognitionRef.current) {
      recognitionRef.current.abort();
    }
    if (audioRef.current) {
      audioRef.current.pause();
    }
    window.speechSynthesis.cancel();
    if (timerRef.current) {
      clearInterval(timerRef.current);
    }
    
    if (conversationId && onConversationCreated) {
      onConversationCreated(conversationId);
    }
    
    // Reset state
    setStep('intro');
    setIsRecording(false);
    setIsProcessing(false);
    setIsAISpeaking(false);
    setTranscript('');
    setCallDuration(0);
    setError(null);
    
    onClose();
  };

  // Reset when closed
  useEffect(() => {
    if (!isOpen) {
      setStep('intro');
      setCallDuration(0);
      setTranscript('');
      setError(null);
    }
  }, [isOpen]);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      {/* Backdrop */}
      <div className="absolute inset-0 bg-black/90" onClick={endCall} />
      
      {/* Content */}
      <div className="relative w-full h-full max-w-2xl mx-auto flex flex-col bg-black">
        {/* Intro Screen */}
        {step === 'intro' && (
          <div className="flex-1 flex flex-col items-center justify-center px-8">
            {/* Close button */}
            <button 
              onClick={onClose}
              className="absolute top-4 right-4 p-2 text-white/70 hover:text-white transition-colors"
            >
              <X size={28} />
            </button>
            
            {/* Animated mic icon */}
            <div className="relative mb-12">
              <div className="absolute inset-0 animate-ping bg-primary-500/30 rounded-full" style={{ animationDuration: '2s' }} />
              <div className="absolute inset-0 animate-pulse bg-primary-500/20 rounded-full scale-150" />
              <div className="relative w-32 h-32 bg-primary-500 rounded-full flex items-center justify-center">
                <Mic size={48} className="text-white" />
              </div>
            </div>
            
            <h1 className="text-3xl font-bold text-white mb-3">Voice Mode</h1>
            <p className="text-gray-400 text-center mb-12 max-w-sm">
              Have a natural conversation with AI using your voice
            </p>
            
            {/* Features */}
            <div className="space-y-4 mb-12">
              <div className="flex items-center gap-4 text-white/90">
                <Volume2 size={24} className="text-primary-500" />
                <span>Natural voice conversation</span>
              </div>
              <div className="flex items-center gap-4 text-white/90">
                <Loader2 size={24} className="text-primary-500" />
                <span>Real-time AI responses</span>
              </div>
              <div className="flex items-center gap-4 text-white/90">
                <Mic size={24} className="text-primary-500" />
                <span>Choose your AI voice</span>
              </div>
            </div>
            
            {/* Continue button */}
            <button
              onClick={() => setStep('voice-select')}
              className="w-full max-w-xs py-4 bg-primary-500 hover:bg-primary-600 text-white font-semibold rounded-full flex items-center justify-center gap-2 transition-colors"
            >
              Choose Voice
              <ArrowRight size={20} />
            </button>
          </div>
        )}

        {/* Voice Selection Screen */}
        {step === 'voice-select' && (
          <div className="flex-1 flex flex-col">
            {/* Header */}
            <div className="flex items-center justify-between p-4 border-b border-white/10">
              <button onClick={() => setStep('intro')} className="p-2 text-white">
                <ArrowLeft size={24} />
              </button>
              <h2 className="text-lg font-semibold text-white">Choose Voice</h2>
              <button onClick={onClose} className="p-2 text-white/70">
                <X size={24} />
              </button>
            </div>
            
            <p className="text-gray-400 text-sm px-4 py-3">
              Select a voice for your AI assistant
            </p>
            
            {/* Voice list */}
            <div className="flex-1 overflow-y-auto px-4 pb-4 space-y-3">
              {defaultVoices.map((voice) => (
                <button
                  key={voice.id}
                  onClick={() => setSelectedVoice(voice)}
                  className={clsx(
                    'w-full p-4 rounded-2xl border-2 transition-all flex items-center gap-4',
                    selectedVoice?.id === voice.id
                      ? 'border-primary-500 bg-primary-500/10'
                      : 'border-white/10 bg-white/5 hover:bg-white/10'
                  )}
                >
                  {/* Icon */}
                  <div 
                    className="w-14 h-14 rounded-full flex items-center justify-center text-2xl"
                    style={{ backgroundColor: voice.color + '33' }}
                  >
                    {voice.icon}
                  </div>
                  
                  {/* Info */}
                  <div className="flex-1 text-left">
                    <div className="font-semibold text-white">{voice.name}</div>
                    <div className="text-sm text-gray-400">{voice.description}</div>
                  </div>
                  
                  {/* Play button */}
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      playVoicePreview(voice);
                    }}
                    className={clsx(
                      'w-11 h-11 rounded-full flex items-center justify-center transition-colors',
                      playingVoiceId === voice.id
                        ? 'bg-white text-black'
                        : 'bg-white/10 text-white hover:bg-white/20'
                    )}
                    style={playingVoiceId === voice.id ? { backgroundColor: voice.color } : {}}
                  >
                    {playingVoiceId === voice.id ? (
                      <Loader2 size={20} className="animate-spin text-white" />
                    ) : (
                      <Play size={20} />
                    )}
                  </button>
                </button>
              ))}
            </div>
            
            {/* Start call button */}
            <div className="p-4">
              <button
                onClick={() => {
                  setStep('active-call');
                  setCallDuration(0);
                }}
                disabled={!selectedVoice}
                className="w-full py-4 bg-primary-500 hover:bg-primary-600 disabled:bg-gray-700 disabled:text-gray-500 text-white font-semibold rounded-full flex items-center justify-center gap-2 transition-colors"
              >
                <Phone size={20} />
                Start Voice Call
              </button>
            </div>
          </div>
        )}

        {/* Active Call Screen */}
        {step === 'active-call' && (
          <div className="flex-1 flex flex-col items-center justify-between py-8">
            {/* Call duration */}
            <div className="text-center">
              <div className="text-white/60 text-sm mb-1">Voice Call</div>
              <div className="text-white text-lg font-mono">{formatDuration(callDuration)}</div>
            </div>
            
            {/* Animated cloud bubble */}
            <div className="relative flex-1 flex items-center justify-center">
              <div 
                className={clsx(
                  'relative w-64 h-64 transition-all duration-300',
                  isRecording && 'scale-110',
                  isAISpeaking && 'scale-105'
                )}
              >
                {/* Outer glow */}
                <div 
                  className={clsx(
                    'absolute inset-0 rounded-full blur-3xl transition-all duration-500',
                    isAISpeaking ? 'bg-primary-500/40 animate-pulse' : 
                    isRecording ? 'bg-primary-500/30 animate-pulse' :
                    isProcessing ? 'bg-purple-500/30 animate-pulse' :
                    'bg-white/10'
                  )}
                  style={{ animationDuration: isAISpeaking ? '0.4s' : '1.5s' }}
                />
                
                {/* Main bubble */}
                <div 
                  className={clsx(
                    'absolute inset-8 rounded-full transition-all duration-300',
                    isAISpeaking ? 'bg-primary-500' : 
                    isRecording ? 'bg-primary-500/90' :
                    isProcessing ? 'bg-purple-500/80' :
                    'bg-white'
                  )}
                />
                
                {/* Secondary bubbles for cloud effect */}
                <div 
                  className={clsx(
                    'absolute w-20 h-20 rounded-full -top-2 left-4 transition-all duration-300',
                    isAISpeaking ? 'bg-primary-500' : 
                    isRecording ? 'bg-primary-500/90' :
                    isProcessing ? 'bg-purple-500/80' :
                    'bg-white'
                  )}
                />
                <div 
                  className={clsx(
                    'absolute w-16 h-16 rounded-full -top-1 right-8 transition-all duration-300',
                    isAISpeaking ? 'bg-primary-500' : 
                    isRecording ? 'bg-primary-500/90' :
                    isProcessing ? 'bg-purple-500/80' :
                    'bg-white'
                  )}
                />
                <div 
                  className={clsx(
                    'absolute w-12 h-12 rounded-full bottom-16 -right-2 transition-all duration-300',
                    isAISpeaking ? 'bg-primary-500' : 
                    isRecording ? 'bg-primary-500/90' :
                    isProcessing ? 'bg-purple-500/80' :
                    'bg-white'
                  )}
                />
                
                {/* Small thought bubbles */}
                <div 
                  className={clsx(
                    'absolute w-6 h-6 rounded-full bottom-8 -left-8 transition-all duration-300',
                    isAISpeaking ? 'bg-primary-500/80' : 'bg-white/80'
                  )}
                />
                <div 
                  className={clsx(
                    'absolute w-3 h-3 rounded-full bottom-4 -left-12 transition-all duration-300',
                    isAISpeaking ? 'bg-primary-500/60' : 'bg-white/60'
                  )}
                />
              </div>
            </div>
            
            {/* Status text */}
            <div className="text-center mb-8">
              <p className="text-white text-lg font-medium mb-2">
                {isAISpeaking ? 'AI is speaking...' :
                 isProcessing ? 'Analyzing...' :
                 isRecording ? 'Listening to you...' :
                 'Tap to speak'}
              </p>
              {transcript && (
                <p className="text-white/60 text-sm max-w-xs mx-auto">{transcript}</p>
              )}
              {error && (
                <p className="text-red-400 text-sm mt-2">{error}</p>
              )}
              {!isRecording && !isProcessing && !isAISpeaking && (
                <p className="text-white/40 text-sm">Tap the mic button to start</p>
              )}
            </div>
            
            {/* Controls */}
            <div className="flex items-center justify-center gap-8 px-8 pb-8">
              {/* End call button */}
              <button
                onClick={endCall}
                className="w-16 h-16 bg-red-500 hover:bg-red-600 rounded-full flex items-center justify-center transition-colors"
              >
                <PhoneOff size={28} className="text-white" />
              </button>
              
              {/* Main mic button */}
              <button
                onClick={isRecording ? stopRecording : startRecording}
                disabled={isProcessing || isAISpeaking}
                className={clsx(
                  'w-20 h-20 rounded-full flex items-center justify-center transition-all transform',
                  isRecording ? 'bg-red-500 hover:bg-red-600 scale-110' :
                  isProcessing ? 'bg-purple-500/60 cursor-not-allowed' :
                  isAISpeaking ? 'bg-gray-500/40 cursor-not-allowed' :
                  'bg-primary-500 hover:bg-primary-600 hover:scale-105'
                )}
              >
                {isRecording ? (
                  <Square size={28} className="text-white" />
                ) : isProcessing ? (
                  <Loader2 size={32} className="text-white animate-spin" />
                ) : (
                  <Mic size={36} className="text-white" />
                )}
              </button>
              
              {/* Placeholder for symmetry */}
              <div className="w-16 h-16" />
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

