/**
 * Settings Page
 * Profile, preferences, API keys, and webhooks
 */

import { useState, useEffect } from 'react';
import { useUser } from '@clerk/clerk-react';
import {
  Key,
  Webhook,
  Copy,
  Trash2,
  Plus,
  RefreshCw,
  Check,
  X,
  Loader2,
  AlertCircle,
  User,
  Brain,
  Shield,
  Palette,
  Volume2,
  Edit2,
  Save,
  Sparkles,
  MessageSquare,
  Zap,
  Download,
  LogOut,
  Mic,
} from 'lucide-react';
import { useClerk } from '@clerk/clerk-react';
import { apiKeys, webhooks, profile } from '../services/api';
import { getClerkToken } from '../utils/auth';
import clsx from 'clsx';

interface ApiKey {
  id: string;
  name: string;
  keyPrefix: string;
  permissions: string[];
  rateLimit: number;
  lastUsed?: string;
  isActive: boolean;
  usageCount: number;
  createdAt: string;
}

interface WebhookData {
  id: string;
  url: string;
  events: string[];
  secret: string;
  isActive: boolean;
}

interface ProfileFact {
  id: string;
  fact: string;
  category: string;
  isActive: boolean;
  createdAt: string;
}

interface UsageData {
  messagesUsed: number;
  messagesLimit: number;
  imagesUsed: number;
  imagesLimit: number;
  voiceUsed: number;
  voiceLimit: number;
  tier: string;
}

type TabType = 'profile' | 'preferences' | 'voice' | 'privacy' | 'usage' | 'apikeys' | 'webhooks';

export default function Settings() {
  const { user } = useUser();
  const { signOut } = useClerk();
  const [activeTab, setActiveTab] = useState<TabType>('profile');
  const [loading, setLoading] = useState(false);
  
  // API Keys
  const [apiKeyList, setApiKeyList] = useState<ApiKey[]>([]);
  const [webhookList, setWebhookList] = useState<WebhookData[]>([]);
  const [showModal, setShowModal] = useState(false);
  const [newApiKey, setNewApiKey] = useState<string | null>(null);
  
  // Upgrade Modal
  const [showUpgradeModal, setShowUpgradeModal] = useState(false);
  const [copied, setCopied] = useState(false);
  const [keyName, setKeyName] = useState('');
  const [webhookUrl, setWebhookUrl] = useState('');
  const [webhookEvents, setWebhookEvents] = useState<string[]>([]);
  const [availableEvents, setAvailableEvents] = useState<{ event: string; description: string }[]>([]);
  
  // Profile
  const [customInstructions, setCustomInstructions] = useState('');
  const [editingInstructions, setEditingInstructions] = useState(false);
  const [profileFacts, setProfileFacts] = useState<ProfileFact[]>([]);
  const [savingInstructions, setSavingInstructions] = useState(false);
  const [profileAvatar, setProfileAvatar] = useState<string | null>(null);
  const [uploadingAvatar, setUploadingAvatar] = useState(false);
  
  // Usage
  const [usageData, setUsageData] = useState<UsageData | null>(null);
  
  // Preferences
  const [preferences, setPreferences] = useState({
    theme: 'dark',
    language: 'en',
    defaultMode: 'chat',
    autoTTS: false,
    soundEffects: true,
    notifications: true,
  });
  
  // Voice settings
  const [voiceSettings, setVoiceSettings] = useState({
    selectedVoice: 'bilal',
    speed: 1.0,
    pitch: 1.0,
    autoSpeak: false,
  });
  
  // Privacy settings
  const [privacySettings, setPrivacySettings] = useState({
    saveHistory: true,
    shareAnalytics: true,
    allowDataTraining: false,
  });
  
  // Available voices
  const availableVoices = [
    { id: 'bilal', name: 'Bilal (Urdu Male)', language: 'ur' },
    { id: 'fatima', name: 'Fatima (Urdu Female)', language: 'ur' },
    { id: 'matthew', name: 'Matthew (English Male)', language: 'en' },
    { id: 'jenny', name: 'Jenny (English Female)', language: 'en' },
  ];

  useEffect(() => {
    loadTabData();
  }, [activeTab]);

  const loadTabData = async () => {
    setLoading(true);
    try {
      switch (activeTab) {
        case 'apikeys':
          const { data: keysData } = await apiKeys.list();
          const items = keysData?.data?.items || keysData?.data || [];
          setApiKeyList(Array.isArray(items) ? items : []);
          break;
          
        case 'webhooks':
          const [webhooksRes, eventsRes] = await Promise.all([
            webhooks.list().catch(() => ({ data: { data: [] } })),
            webhooks.getEvents().catch(() => ({ data: { data: [] } })),
          ]);
          const webhookItems = webhooksRes?.data?.data?.items || webhooksRes?.data?.data || [];
          const eventItems = eventsRes?.data?.data?.items || eventsRes?.data?.data || [];
          setWebhookList(Array.isArray(webhookItems) ? webhookItems : []);
          setAvailableEvents(Array.isArray(eventItems) ? eventItems : []);
          break;
          
        case 'profile':
          try {
            const [profileRes, factsRes] = await Promise.all([
              profile.get().catch(() => ({ data: { data: {} } })),
              profile.getFacts().catch(() => ({ data: { data: { facts: [] } } })),
            ]);
            setCustomInstructions(profileRes?.data?.data?.customInstructions || '');
            setProfileFacts(factsRes?.data?.data?.facts || []);
            // Load avatar from profile if available
            if (profileRes?.data?.data?.user?.avatar) {
              setProfileAvatar(profileRes.data.data.user.avatar);
            }
          } catch (e) {
            console.error('Failed to load profile:', e);
          }
          break;
          
        case 'usage':
          try {
            const usageRes = await profile.getUsage();
            setUsageData(usageRes?.data?.data || null);
          } catch (e) {
            console.error('Failed to load usage:', e);
          }
          break;
      }
    } catch (error) {
      console.error('Failed to load data:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleSaveInstructions = async () => {
    setSavingInstructions(true);
    try {
      await profile.updateInstructions(customInstructions);
      setEditingInstructions(false);
    } catch (error) {
      console.error('Failed to save instructions:', error);
    } finally {
      setSavingInstructions(false);
    }
  };

  const handleAvatarUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    
    // Validate file type
    if (!file.type.startsWith('image/')) {
      alert('Please select an image file');
      return;
    }
    
    // Validate file size (max 5MB)
    if (file.size > 5 * 1024 * 1024) {
      alert('Image must be smaller than 5MB');
      return;
    }
    
    setUploadingAvatar(true);
    try {
      const token = await getClerkToken();
      const formData = new FormData();
      formData.append('avatar', file);
      
      const response = await fetch('/api/v1/images/avatar', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
        },
        body: formData,
      });
      
      const data = await response.json();
      
      if (data.success && data.data?.avatarUrl) {
        setProfileAvatar(data.data.avatarUrl);
        console.log('Avatar uploaded successfully:', data.data.avatarUrl);
      } else {
        throw new Error(data.error || 'Failed to upload avatar');
      }
    } catch (error) {
      console.error('Failed to upload avatar:', error);
      alert('Failed to upload avatar. Please try again.');
    } finally {
      setUploadingAvatar(false);
    }
  };

  const handleToggleFact = async (factId: string, isActive: boolean) => {
    try {
      await profile.updateFact(factId, { isActive: !isActive });
      setProfileFacts(prev => prev.map(f => 
        f.id === factId ? { ...f, isActive: !isActive } : f
      ));
    } catch (error) {
      console.error('Failed to toggle fact:', error);
    }
  };

  const handleCreateApiKey = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const { data } = await apiKeys.create(keyName);
      setNewApiKey(data.data.key);
      setKeyName('');
      loadTabData();
    } catch (error) {
      console.error('Failed to create API key:', error);
    }
  };

  const handleDeleteApiKey = async (id: string) => {
    if (!confirm('Revoke this API key? This cannot be undone.')) return;
    try {
      await apiKeys.delete(id);
      loadTabData();
    } catch (error) {
      console.error('Failed to delete API key:', error);
    }
  };

  const handleRotateApiKey = async (id: string) => {
    if (!confirm('Rotate this API key? The old key will stop working immediately.')) return;
    try {
      const { data } = await apiKeys.rotate(id);
      setNewApiKey(data.data.newKey);
      loadTabData();
    } catch (error) {
      console.error('Failed to rotate API key:', error);
    }
  };

  const handleCreateWebhook = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await webhooks.create(webhookUrl, webhookEvents);
      setWebhookUrl('');
      setWebhookEvents([]);
      setShowModal(false);
      loadTabData();
    } catch (error) {
      console.error('Failed to create webhook:', error);
    }
  };

  const handleDeleteWebhook = async (id: string) => {
    if (!confirm('Delete this webhook?')) return;
    try {
      await webhooks.delete(id);
      loadTabData();
    } catch (error) {
      console.error('Failed to delete webhook:', error);
    }
  };

  const handleTestWebhook = async (id: string) => {
    try {
      await webhooks.test(id);
      alert('Test webhook sent!');
    } catch (error) {
      console.error('Failed to test webhook:', error);
      alert('Failed to send test webhook');
    }
  };

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const tabs = [
    { id: 'profile' as const, label: 'Profile', icon: User },
    { id: 'preferences' as const, label: 'Preferences', icon: Palette },
    { id: 'voice' as const, label: 'Voice', icon: Mic },
    { id: 'privacy' as const, label: 'Privacy', icon: Shield },
    { id: 'usage' as const, label: 'Usage', icon: Zap },
    { id: 'apikeys' as const, label: 'API Keys', icon: Key },
    { id: 'webhooks' as const, label: 'Webhooks', icon: Webhook },
  ];
  
  const handleExportData = async () => {
    try {
      const token = await getClerkToken();
      const response = await fetch('/api/v1/user/export', {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (response.ok) {
        const blob = await response.blob();
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = 'baatcheet-data-export.json';
        a.click();
        URL.revokeObjectURL(url);
      }
    } catch (error) {
      console.error('Failed to export data:', error);
    }
  };
  
  const handleDeleteAllData = async () => {
    if (!confirm('Are you sure you want to delete ALL your data? This action cannot be undone.')) return;
    if (!confirm('This will permanently delete all your conversations, projects, and settings. Continue?')) return;
    
    try {
      const token = await getClerkToken();
      await fetch('/api/v1/user/data', {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${token}` },
      });
      alert('All data has been deleted.');
    } catch (error) {
      console.error('Failed to delete data:', error);
    }
  };
  
  const handleSignOut = () => {
    signOut();
  };

  return (
    <div className="h-full overflow-y-auto p-6">
      <div className="max-w-4xl mx-auto">
        <h1 className="text-2xl font-bold text-slate-800 mb-6">Settings</h1>

        {/* Tabs */}
        <div className="flex flex-wrap gap-1 mb-6 bg-white rounded-xl p-1">
          {tabs.map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={clsx(
                'flex items-center gap-2 px-4 py-2.5 rounded-lg text-sm font-medium transition-all',
                activeTab === tab.id
                  ? 'bg-gradient-to-r from-primary-500 to-primary-600 text-white shadow-lg shadow-primary-500/20'
                  : 'text-slate-500 hover:text-slate-700 hover:bg-slate-100'
              )}
            >
              <tab.icon size={18} />
              <span>{tab.label}</span>
            </button>
          ))}
        </div>

        {loading ? (
          <div className="flex items-center justify-center py-12">
            <Loader2 className="animate-spin text-primary-400" size={32} />
          </div>
        ) : (
          <>
            {/* Profile Tab */}
            {activeTab === 'profile' && (
              <div className="space-y-6">
                {/* User Info */}
                <div className="bg-white rounded-2xl border border-slate-200 p-6">
                  <div className="flex items-center gap-4 mb-6">
                    <div className="relative group">
                      {profileAvatar ? (
                        <img 
                          src={profileAvatar} 
                          alt="Profile" 
                          className="w-16 h-16 rounded-xl object-cover"
                        />
                      ) : user?.imageUrl ? (
                        <img 
                          src={user.imageUrl} 
                          alt="Profile" 
                          className="w-16 h-16 rounded-xl object-cover"
                        />
                      ) : (
                        <div className="w-16 h-16 rounded-xl bg-gradient-to-br from-primary-500 to-primary-600 flex items-center justify-center text-white text-2xl font-bold">
                          {user?.firstName?.[0] || user?.username?.[0] || 'U'}
                        </div>
                      )}
                      <label 
                        htmlFor="avatar-upload"
                        className="absolute inset-0 bg-black/50 rounded-xl opacity-0 group-hover:opacity-100 flex items-center justify-center cursor-pointer transition-opacity"
                      >
                        {uploadingAvatar ? (
                          <Loader2 className="animate-spin text-white" size={20} />
                        ) : (
                          <Edit2 className="text-white" size={20} />
                        )}
                      </label>
                      <input
                        id="avatar-upload"
                        type="file"
                        accept="image/*"
                        className="hidden"
                        onChange={handleAvatarUpload}
                        disabled={uploadingAvatar}
                      />
                    </div>
                    <div>
                      <h2 className="text-xl font-bold text-slate-800">
                        {user?.fullName || user?.username || 'User'}
                      </h2>
                      <p className="text-slate-500">{user?.primaryEmailAddress?.emailAddress}</p>
                      <p className="text-xs text-slate-400 mt-1">Click avatar to change</p>
                    </div>
                  </div>
                </div>

                {/* Custom Instructions */}
                <div className="bg-white rounded-2xl border border-slate-200 p-6">
                  <div className="flex items-center justify-between mb-4">
                    <div className="flex items-center gap-2">
                      <Brain className="text-primary-400" size={20} />
                      <h3 className="text-lg font-semibold text-slate-800">Custom Instructions</h3>
                    </div>
                    {!editingInstructions ? (
                      <button
                        onClick={() => setEditingInstructions(true)}
                        className="flex items-center gap-1 px-3 py-1.5 text-sm text-slate-500 hover:text-slate-700 transition-colors"
                      >
                        <Edit2 size={14} />
                        Edit
                      </button>
                    ) : (
                      <button
                        onClick={handleSaveInstructions}
                        disabled={savingInstructions}
                        className="flex items-center gap-1 px-3 py-1.5 text-sm bg-primary-500 hover:bg-primary-600 text-white rounded-lg transition-colors"
                      >
                        {savingInstructions ? (
                          <Loader2 className="animate-spin" size={14} />
                        ) : (
                          <Save size={14} />
                        )}
                        Save
                      </button>
                    )}
                  </div>
                  <p className="text-slate-400 text-sm mb-3">
                    Tell the AI how you'd like it to respond. These instructions apply to all conversations.
                  </p>
                  {editingInstructions ? (
                    <textarea
                      value={customInstructions}
                      onChange={(e) => setCustomInstructions(e.target.value)}
                      rows={4}
                      placeholder="e.g., Always respond in a professional tone. I'm a software developer working with React and Node.js."
                      className="w-full px-4 py-3 bg-slate-100 border border-slate-300 rounded-xl text-slate-800 placeholder-dark-500 focus:outline-none focus:border-primary-500 resize-none"
                    />
                  ) : (
                    <div className="px-4 py-3 bg-slate-100 rounded-xl text-slate-600 min-h-[100px]">
                      {customInstructions || <span className="text-slate-400 italic">No custom instructions set</span>}
                    </div>
                  )}
                </div>

                {/* Learned Facts */}
                <div className="bg-white rounded-2xl border border-slate-200 p-6">
                  <div className="flex items-center gap-2 mb-4">
                    <Sparkles className="text-primary-400" size={20} />
                    <h3 className="text-lg font-semibold text-slate-800">What I Know About You</h3>
                  </div>
                  <p className="text-slate-400 text-sm mb-4">
                    The AI learns these facts from your conversations to personalize responses.
                  </p>
                  <div className="space-y-2">
                    {profileFacts.map((fact) => (
                      <div
                        key={fact.id}
                        className={clsx(
                          'flex items-center gap-3 p-3 rounded-lg border transition-colors',
                          fact.isActive
                            ? 'bg-slate-100 border-slate-300'
                            : 'bg-white border-slate-200 opacity-50'
                        )}
                      >
                        <button
                          onClick={() => handleToggleFact(fact.id, fact.isActive)}
                          className={clsx(
                            'w-5 h-5 rounded flex items-center justify-center transition-colors',
                            fact.isActive
                              ? 'bg-primary-500 text-white'
                              : 'bg-slate-200 text-slate-500'
                          )}
                        >
                          {fact.isActive && <Check size={12} />}
                        </button>
                        <span className="flex-1 text-slate-600 text-sm">{fact.fact}</span>
                        <span className="text-xs text-slate-400 capitalize">{fact.category}</span>
                      </div>
                    ))}
                    {profileFacts.length === 0 && (
                      <div className="text-center py-8 text-slate-400">
                        <MessageSquare className="mx-auto mb-2" size={24} />
                        <p>No facts learned yet. Start chatting!</p>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            )}

            {/* Preferences Tab */}
            {activeTab === 'preferences' && (
              <div className="space-y-6">
                <div className="bg-white rounded-2xl border border-slate-200 p-6">
                  <h3 className="text-lg font-semibold text-slate-800 mb-4">Appearance</h3>
                  <div className="space-y-4">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-slate-700">Theme</p>
                        <p className="text-sm text-slate-400">Choose your preferred color scheme</p>
                      </div>
                      <select
                        value={preferences.theme}
                        onChange={(e) => setPreferences({ ...preferences, theme: e.target.value })}
                        className="px-4 py-2 bg-slate-100 border border-slate-300 rounded-lg text-slate-700"
                      >
                        <option value="dark">Dark</option>
                        <option value="light">Light</option>
                        <option value="system">System</option>
                      </select>
                    </div>
                  </div>
                </div>

                <div className="bg-white rounded-2xl border border-slate-200 p-6">
                  <h3 className="text-lg font-semibold text-slate-800 mb-4">Chat</h3>
                  <div className="space-y-4">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-slate-700">Default AI Mode</p>
                        <p className="text-sm text-slate-400">Mode to use for new conversations</p>
                      </div>
                      <select
                        value={preferences.defaultMode}
                        onChange={(e) => setPreferences({ ...preferences, defaultMode: e.target.value })}
                        className="px-4 py-2 bg-slate-100 border border-slate-300 rounded-lg text-slate-700"
                      >
                        <option value="chat">Chat</option>
                        <option value="code">Code</option>
                        <option value="research">Research</option>
                        <option value="creative">Creative</option>
                      </select>
                    </div>
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-slate-700">Auto Text-to-Speech</p>
                        <p className="text-sm text-slate-400">Automatically read AI responses aloud</p>
                      </div>
                      <button
                        onClick={() => setPreferences({ ...preferences, autoTTS: !preferences.autoTTS })}
                        className={clsx(
                          'w-12 h-6 rounded-full transition-colors',
                          preferences.autoTTS ? 'bg-primary-500' : 'bg-slate-200'
                        )}
                      >
                        <div
                          className={clsx(
                            'w-5 h-5 rounded-full bg-white transition-transform',
                            preferences.autoTTS ? 'translate-x-6' : 'translate-x-0.5'
                          )}
                        />
                      </button>
                    </div>
                  </div>
                </div>

                <div className="bg-white rounded-2xl border border-slate-200 p-6">
                  <h3 className="text-lg font-semibold text-slate-800 mb-4">Notifications</h3>
                  <div className="space-y-4">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-slate-700">Sound Effects</p>
                        <p className="text-sm text-slate-400">Play sounds for messages</p>
                      </div>
                      <button
                        onClick={() => setPreferences({ ...preferences, soundEffects: !preferences.soundEffects })}
                        className={clsx(
                          'w-12 h-6 rounded-full transition-colors',
                          preferences.soundEffects ? 'bg-primary-500' : 'bg-slate-200'
                        )}
                      >
                        <div
                          className={clsx(
                            'w-5 h-5 rounded-full bg-white transition-transform',
                            preferences.soundEffects ? 'translate-x-6' : 'translate-x-0.5'
                          )}
                        />
                      </button>
                    </div>
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-slate-700">Push Notifications</p>
                        <p className="text-sm text-slate-400">Get notified about updates</p>
                      </div>
                      <button
                        onClick={() => setPreferences({ ...preferences, notifications: !preferences.notifications })}
                        className={clsx(
                          'w-12 h-6 rounded-full transition-colors',
                          preferences.notifications ? 'bg-primary-500' : 'bg-slate-200'
                        )}
                      >
                        <div
                          className={clsx(
                            'w-5 h-5 rounded-full bg-white transition-transform',
                            preferences.notifications ? 'translate-x-6' : 'translate-x-0.5'
                          )}
                        />
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* Voice Tab */}
            {activeTab === 'voice' && (
              <div className="space-y-6">
                <div className="bg-white rounded-2xl border border-slate-200 p-6">
                  <div className="flex items-center gap-2 mb-4">
                    <Mic className="text-primary-400" size={20} />
                    <h3 className="text-lg font-semibold text-slate-800">Voice Selection</h3>
                  </div>
                  <p className="text-slate-400 text-sm mb-4">
                    Choose your preferred voice for text-to-speech and voice calls.
                  </p>
                  <div className="grid grid-cols-2 gap-3">
                    {availableVoices.map((voice) => (
                      <button
                        key={voice.id}
                        onClick={() => setVoiceSettings({ ...voiceSettings, selectedVoice: voice.id })}
                        className={clsx(
                          'p-4 rounded-xl border transition-all text-left',
                          voiceSettings.selectedVoice === voice.id
                            ? 'bg-primary-500/10 border-primary-500/50'
                            : 'bg-slate-100 border-slate-300 hover:border-dark-500'
                        )}
                      >
                        <div className="flex items-center gap-3">
                          <div className={clsx(
                            'w-10 h-10 rounded-xl flex items-center justify-center',
                            voice.language === 'ur' ? 'bg-green-500/20' : 'bg-blue-500/20'
                          )}>
                            <Volume2 size={18} className={voice.language === 'ur' ? 'text-green-400' : 'text-blue-400'} />
                          </div>
                          <div>
                            <p className="font-medium text-slate-700">{voice.name}</p>
                            <p className="text-xs text-slate-400">{voice.language === 'ur' ? 'Urdu' : 'English'}</p>
                          </div>
                        </div>
                      </button>
                    ))}
                  </div>
                </div>

                <div className="bg-white rounded-2xl border border-slate-200 p-6">
                  <h3 className="text-lg font-semibold text-slate-800 mb-4">Voice Settings</h3>
                  <div className="space-y-6">
                    <div>
                      <div className="flex items-center justify-between mb-2">
                        <span className="text-slate-600">Speed</span>
                        <span className="text-slate-400">{voiceSettings.speed.toFixed(1)}x</span>
                      </div>
                      <input
                        type="range"
                        min="0.5"
                        max="2"
                        step="0.1"
                        value={voiceSettings.speed}
                        onChange={(e) => setVoiceSettings({ ...voiceSettings, speed: parseFloat(e.target.value) })}
                        className="w-full accent-primary-500"
                      />
                    </div>
                    <div>
                      <div className="flex items-center justify-between mb-2">
                        <span className="text-slate-600">Pitch</span>
                        <span className="text-slate-400">{voiceSettings.pitch.toFixed(1)}x</span>
                      </div>
                      <input
                        type="range"
                        min="0.5"
                        max="2"
                        step="0.1"
                        value={voiceSettings.pitch}
                        onChange={(e) => setVoiceSettings({ ...voiceSettings, pitch: parseFloat(e.target.value) })}
                        className="w-full accent-primary-500"
                      />
                    </div>
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-slate-700">Auto-speak Responses</p>
                        <p className="text-sm text-slate-400">Automatically read AI responses aloud</p>
                      </div>
                      <button
                        onClick={() => setVoiceSettings({ ...voiceSettings, autoSpeak: !voiceSettings.autoSpeak })}
                        className={clsx(
                          'w-12 h-6 rounded-full transition-colors',
                          voiceSettings.autoSpeak ? 'bg-primary-500' : 'bg-slate-200'
                        )}
                      >
                        <div
                          className={clsx(
                            'w-5 h-5 rounded-full bg-white transition-transform',
                            voiceSettings.autoSpeak ? 'translate-x-6' : 'translate-x-0.5'
                          )}
                        />
                      </button>
                    </div>
                  </div>
                </div>

                <div className="bg-white rounded-2xl border border-slate-200 p-6">
                  <h3 className="text-lg font-semibold text-slate-800 mb-4">Test Voice</h3>
                  <button className="flex items-center gap-2 px-4 py-2.5 bg-primary-500/20 hover:bg-primary-500/30 text-primary-400 rounded-xl transition-colors">
                    <Volume2 size={18} />
                    <span>Play Sample</span>
                  </button>
                </div>
              </div>
            )}

            {/* Privacy Tab */}
            {activeTab === 'privacy' && (
              <div className="space-y-6">
                <div className="bg-white rounded-2xl border border-slate-200 p-6">
                  <div className="flex items-center gap-2 mb-4">
                    <Shield className="text-primary-400" size={20} />
                    <h3 className="text-lg font-semibold text-slate-800">Privacy Settings</h3>
                  </div>
                  <div className="space-y-4">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-slate-700">Save Chat History</p>
                        <p className="text-sm text-slate-400">Keep your conversation history for future reference</p>
                      </div>
                      <button
                        onClick={() => setPrivacySettings({ ...privacySettings, saveHistory: !privacySettings.saveHistory })}
                        className={clsx(
                          'w-12 h-6 rounded-full transition-colors',
                          privacySettings.saveHistory ? 'bg-primary-500' : 'bg-slate-200'
                        )}
                      >
                        <div
                          className={clsx(
                            'w-5 h-5 rounded-full bg-white transition-transform',
                            privacySettings.saveHistory ? 'translate-x-6' : 'translate-x-0.5'
                          )}
                        />
                      </button>
                    </div>
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-slate-700">Share Analytics</p>
                        <p className="text-sm text-slate-400">Help improve BaatCheet with anonymous usage data</p>
                      </div>
                      <button
                        onClick={() => setPrivacySettings({ ...privacySettings, shareAnalytics: !privacySettings.shareAnalytics })}
                        className={clsx(
                          'w-12 h-6 rounded-full transition-colors',
                          privacySettings.shareAnalytics ? 'bg-primary-500' : 'bg-slate-200'
                        )}
                      >
                        <div
                          className={clsx(
                            'w-5 h-5 rounded-full bg-white transition-transform',
                            privacySettings.shareAnalytics ? 'translate-x-6' : 'translate-x-0.5'
                          )}
                        />
                      </button>
                    </div>
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-slate-700">Allow Data Training</p>
                        <p className="text-sm text-slate-400">Let AI learn from your conversations to improve</p>
                      </div>
                      <button
                        onClick={() => setPrivacySettings({ ...privacySettings, allowDataTraining: !privacySettings.allowDataTraining })}
                        className={clsx(
                          'w-12 h-6 rounded-full transition-colors',
                          privacySettings.allowDataTraining ? 'bg-primary-500' : 'bg-slate-200'
                        )}
                      >
                        <div
                          className={clsx(
                            'w-5 h-5 rounded-full bg-white transition-transform',
                            privacySettings.allowDataTraining ? 'translate-x-6' : 'translate-x-0.5'
                          )}
                        />
                      </button>
                    </div>
                  </div>
                </div>

                <div className="bg-white rounded-2xl border border-slate-200 p-6">
                  <h3 className="text-lg font-semibold text-slate-800 mb-4">Data Management</h3>
                  <div className="space-y-3">
                    <button
                      onClick={handleExportData}
                      className="w-full flex items-center gap-3 px-4 py-3 bg-slate-100 hover:bg-slate-200 rounded-xl transition-colors"
                    >
                      <Download className="text-primary-400" size={20} />
                      <div className="text-left flex-1">
                        <p className="text-slate-700 font-medium">Export Data</p>
                        <p className="text-sm text-slate-400">Download all your conversations and settings</p>
                      </div>
                    </button>
                    <button
                      onClick={handleDeleteAllData}
                      className="w-full flex items-center gap-3 px-4 py-3 bg-red-500/10 hover:bg-red-500/20 border border-red-500/20 rounded-xl transition-colors"
                    >
                      <Trash2 className="text-red-400" size={20} />
                      <div className="text-left flex-1">
                        <p className="text-red-400 font-medium">Delete All Data</p>
                        <p className="text-sm text-red-400/70">Permanently remove all your data</p>
                      </div>
                    </button>
                  </div>
                </div>

                <div className="bg-white rounded-2xl border border-slate-200 p-6">
                  <h3 className="text-lg font-semibold text-slate-800 mb-4">Account</h3>
                  <button
                    onClick={handleSignOut}
                    className="flex items-center gap-3 px-4 py-3 bg-slate-100 hover:bg-slate-200 rounded-xl transition-colors"
                  >
                    <LogOut className="text-slate-500" size={20} />
                    <span className="text-slate-700">Sign Out</span>
                  </button>
                </div>
              </div>
            )}

            {/* Usage Tab */}
            {activeTab === 'usage' && (
              <div className="space-y-6">
                <div className="bg-white rounded-2xl border border-slate-200 p-6">
                  <div className="flex items-center justify-between mb-6">
                    <div>
                      <h3 className="text-lg font-semibold text-slate-800">Your Plan</h3>
                      <p className="text-slate-500 capitalize">{usageData?.tier || 'Free'} Tier</p>
                    </div>
                    <button 
                      onClick={() => setShowUpgradeModal(true)}
                      className="px-4 py-2 bg-gradient-to-r from-primary-500 to-primary-600 text-white rounded-lg hover:from-primary-600 hover:to-primary-700 transition-all"
                    >
                      Upgrade
                    </button>
                  </div>

                  <div className="space-y-4">
                    {/* Messages */}
                    <div>
                      <div className="flex items-center justify-between mb-2">
                        <span className="text-slate-600">Messages</span>
                        <span className="text-slate-500 text-sm">
                          {usageData?.messagesUsed || 0} / {usageData?.messagesLimit || 50}
                        </span>
                      </div>
                      <div className="h-2 bg-slate-100 rounded-full overflow-hidden">
                        <div
                          className="h-full bg-gradient-to-r from-primary-500 to-primary-600 rounded-full transition-all"
                          style={{
                            width: `${Math.min(100, ((usageData?.messagesUsed || 0) / (usageData?.messagesLimit || 50)) * 100)}%`,
                          }}
                        />
                      </div>
                    </div>

                    {/* Images */}
                    <div>
                      <div className="flex items-center justify-between mb-2">
                        <span className="text-slate-600">Image Generations</span>
                        <span className="text-slate-500 text-sm">
                          {usageData?.imagesUsed || 0} / {usageData?.imagesLimit || 5}
                        </span>
                      </div>
                      <div className="h-2 bg-slate-100 rounded-full overflow-hidden">
                        <div
                          className="h-full bg-gradient-to-r from-purple-500 to-pink-500 rounded-full transition-all"
                          style={{
                            width: `${Math.min(100, ((usageData?.imagesUsed || 0) / (usageData?.imagesLimit || 5)) * 100)}%`,
                          }}
                        />
                      </div>
                    </div>

                    {/* Voice */}
                    <div>
                      <div className="flex items-center justify-between mb-2">
                        <span className="text-slate-600">Voice Messages</span>
                        <span className="text-slate-500 text-sm">
                          {usageData?.voiceUsed || 0} / {usageData?.voiceLimit || 10}
                        </span>
                      </div>
                      <div className="h-2 bg-slate-100 rounded-full overflow-hidden">
                        <div
                          className="h-full bg-gradient-to-r from-green-500 to-emerald-500 rounded-full transition-all"
                          style={{
                            width: `${Math.min(100, ((usageData?.voiceUsed || 0) / (usageData?.voiceLimit || 10)) * 100)}%`,
                          }}
                        />
                      </div>
                    </div>
                  </div>
                </div>

                <div className="bg-white rounded-2xl border border-slate-200 p-6">
                  <h3 className="text-lg font-semibold text-slate-800 mb-4">Usage Resets</h3>
                  <p className="text-slate-500">
                    Your daily limits reset at midnight UTC. Upgrade to Pro for unlimited access.
                  </p>
                </div>
              </div>
            )}

            {/* API Keys Tab */}
            {activeTab === 'apikeys' && (
              <div className="space-y-6">
                {newApiKey && (
                  <div className="p-4 bg-primary-500/10 border border-primary-500/20 rounded-xl">
                    <div className="flex items-start gap-3">
                      <AlertCircle className="text-primary-400 flex-shrink-0 mt-0.5" size={20} />
                      <div className="flex-1">
                        <p className="text-primary-400 font-medium mb-2">
                          Save your API key now - it won't be shown again!
                        </p>
                        <div className="flex items-center gap-2 bg-white rounded-lg p-2">
                          <code className="flex-1 text-sm text-slate-700 font-mono break-all">
                            {newApiKey}
                          </code>
                          <button
                            onClick={() => copyToClipboard(newApiKey)}
                            className="p-2 hover:bg-slate-100 rounded-lg transition-colors"
                          >
                            {copied ? (
                              <Check className="text-primary-400" size={18} />
                            ) : (
                              <Copy className="text-slate-500" size={18} />
                            )}
                          </button>
                        </div>
                      </div>
                      <button onClick={() => setNewApiKey(null)} className="text-slate-400 hover:text-slate-600">
                        <X size={20} />
                      </button>
                    </div>
                  </div>
                )}

                <div className="bg-white rounded-2xl border border-slate-200 p-6">
                  <h2 className="text-lg font-semibold text-slate-800 mb-4">Create API Key</h2>
                  <form onSubmit={handleCreateApiKey} className="flex gap-3">
                    <input
                      type="text"
                      value={keyName}
                      onChange={(e) => setKeyName(e.target.value)}
                      placeholder="Key name (e.g., My App)"
                      required
                      className="flex-1 px-4 py-2.5 bg-slate-100 border border-slate-300 rounded-xl text-slate-800 focus:outline-none focus:border-primary-500"
                    />
                    <button
                      type="submit"
                      className="flex items-center gap-2 px-4 py-2.5 bg-gradient-to-r from-primary-500 to-primary-600 hover:from-primary-600 hover:to-primary-700 text-white rounded-xl transition-all"
                    >
                      <Plus size={18} />
                      <span>Create</span>
                    </button>
                  </form>
                </div>

                <div className="bg-white rounded-2xl border border-slate-200">
                  <div className="p-4 border-b border-slate-200">
                    <h2 className="text-lg font-semibold text-slate-800">Your API Keys</h2>
                  </div>
                  <div className="divide-y divide-dark-700">
                    {apiKeyList.map((key) => (
                      <div key={key.id} className="p-4 flex items-center gap-4">
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2">
                            <span className="font-medium text-slate-700">{key.name}</span>
                            <span
                              className={clsx(
                                'px-2 py-0.5 text-xs rounded-full',
                                key.isActive
                                  ? 'bg-green-500/10 text-green-400'
                                  : 'bg-red-500/10 text-red-400'
                              )}
                            >
                              {key.isActive ? 'Active' : 'Inactive'}
                            </span>
                          </div>
                          <div className="flex items-center gap-3 mt-1 text-sm text-slate-400">
                            <code className="font-mono">{key.keyPrefix}...</code>
                            <span>•</span>
                            <span>{key.usageCount} requests</span>
                          </div>
                        </div>
                        <div className="flex items-center gap-2">
                          <button
                            onClick={() => handleRotateApiKey(key.id)}
                            className="p-2 text-slate-400 hover:text-slate-600 transition-colors"
                            title="Rotate key"
                          >
                            <RefreshCw size={18} />
                          </button>
                          <button
                            onClick={() => handleDeleteApiKey(key.id)}
                            className="p-2 text-slate-400 hover:text-red-400 transition-colors"
                            title="Revoke key"
                          >
                            <Trash2 size={18} />
                          </button>
                        </div>
                      </div>
                    ))}
                    {apiKeyList.length === 0 && (
                      <div className="p-8 text-center text-slate-400">No API keys yet</div>
                    )}
                  </div>
                </div>
              </div>
            )}

            {/* Webhooks Tab */}
            {activeTab === 'webhooks' && (
              <div className="space-y-6">
                <button
                  onClick={() => setShowModal(true)}
                  className="flex items-center gap-2 px-4 py-2.5 bg-gradient-to-r from-primary-500 to-primary-600 hover:from-primary-600 hover:to-primary-700 text-white rounded-xl transition-all"
                >
                  <Plus size={18} />
                  <span>Create Webhook</span>
                </button>

                <div className="bg-white rounded-2xl border border-slate-200">
                  <div className="p-4 border-b border-slate-200">
                    <h2 className="text-lg font-semibold text-slate-800">Your Webhooks</h2>
                  </div>
                  <div className="divide-y divide-dark-700">
                    {webhookList.map((webhook) => (
                      <div key={webhook.id} className="p-4">
                        <div className="flex items-start justify-between gap-4">
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2">
                              <code className="text-sm text-slate-700 font-mono truncate">
                                {webhook.url}
                              </code>
                              <span
                                className={clsx(
                                  'px-2 py-0.5 text-xs rounded-full',
                                  webhook.isActive
                                    ? 'bg-green-500/10 text-green-400'
                                    : 'bg-red-500/10 text-red-400'
                                )}
                              >
                                {webhook.isActive ? 'Active' : 'Inactive'}
                              </span>
                            </div>
                            <div className="flex flex-wrap gap-1 mt-2">
                              {webhook.events.map((event) => (
                                <span
                                  key={event}
                                  className="px-2 py-0.5 text-xs bg-slate-100 text-slate-500 rounded"
                                >
                                  {event}
                                </span>
                              ))}
                            </div>
                          </div>
                          <div className="flex items-center gap-2">
                            <button
                              onClick={() => handleTestWebhook(webhook.id)}
                              className="px-3 py-1.5 text-sm bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-lg transition-colors"
                            >
                              Test
                            </button>
                            <button
                              onClick={() => handleDeleteWebhook(webhook.id)}
                              className="p-2 text-slate-400 hover:text-red-400 transition-colors"
                            >
                              <Trash2 size={18} />
                            </button>
                          </div>
                        </div>
                      </div>
                    ))}
                    {webhookList.length === 0 && (
                      <div className="p-8 text-center text-slate-400">No webhooks yet</div>
                    )}
                  </div>
                </div>
              </div>
            )}
          </>
        )}

        {/* Create Webhook Modal */}
        {showModal && (
          <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
            <div className="bg-white rounded-2xl border border-slate-200 w-full max-w-md">
              <div className="flex items-center justify-between p-4 border-b border-slate-200">
                <h2 className="text-lg font-semibold text-slate-800">Create Webhook</h2>
                <button onClick={() => setShowModal(false)} className="text-slate-400 hover:text-slate-600">
                  <X size={20} />
                </button>
              </div>

              <form onSubmit={handleCreateWebhook} className="p-4 space-y-4">
                <div>
                  <label className="block text-sm font-medium text-slate-600 mb-1.5">URL</label>
                  <input
                    type="url"
                    value={webhookUrl}
                    onChange={(e) => setWebhookUrl(e.target.value)}
                    placeholder="https://example.com/webhook"
                    required
                    className="w-full px-4 py-2.5 bg-slate-100 border border-slate-300 rounded-xl text-slate-800 focus:outline-none focus:border-primary-500"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-slate-600 mb-1.5">Events</label>
                  <div className="space-y-2 max-h-48 overflow-y-auto">
                    {availableEvents.map(({ event, description }) => (
                      <label
                        key={event}
                        className="flex items-start gap-3 p-2 rounded-lg hover:bg-slate-100 cursor-pointer"
                      >
                        <input
                          type="checkbox"
                          checked={webhookEvents.includes(event)}
                          onChange={(e) => {
                            if (e.target.checked) {
                              setWebhookEvents([...webhookEvents, event]);
                            } else {
                              setWebhookEvents(webhookEvents.filter((e) => e !== event));
                            }
                          }}
                          className="mt-1"
                        />
                        <div>
                          <p className="text-sm text-slate-700">{event}</p>
                          <p className="text-xs text-slate-400">{description}</p>
                        </div>
                      </label>
                    ))}
                  </div>
                </div>

                <div className="flex gap-3 pt-2">
                  <button
                    type="button"
                    onClick={() => setShowModal(false)}
                    className="flex-1 px-4 py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl transition-colors"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={webhookEvents.length === 0}
                    className="flex-1 px-4 py-2.5 bg-gradient-to-r from-primary-500 to-primary-600 hover:from-primary-600 hover:to-primary-700 disabled:bg-slate-100 disabled:text-slate-400 text-white rounded-xl transition-all"
                  >
                    Create
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}

        {/* Upgrade to Pro Modal */}
        {showUpgradeModal && (
          <UpgradeModal onClose={() => setShowUpgradeModal(false)} />
        )}
      </div>
    </div>
  );
}

/**
 * Upgrade to Pro Modal Component
 */
function UpgradeModal({ onClose }: { onClose: () => void }) {
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [message, setMessage] = useState('');
  const [sending, setSending] = useState(false);
  const [sent, setSent] = useState(false);
  
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSending(true);
    
    try {
      // Use EmailJS (same as Contact page)
      const emailjs = await import('@emailjs/browser');
      
      await emailjs.send(
        'service_zukq4lf',
        'template_24gtxc6',
        {
          from_name: name,
          from_email: email,
          subject: `BaatCheet Pro Upgrade Request from ${name}`,
          message: `Upgrade Request:\n\nName: ${name}\nEmail: ${email}\n\nMessage:\n${message || 'I would like to upgrade to BaatCheet Pro.'}`,
          to_name: 'Muhammad Sharjeel',
        },
        'Mq2IhyUUB3uKd1WsS'
      );
      
      setSent(true);
      setTimeout(() => {
        onClose();
      }, 2000);
    } catch (error) {
      console.error('Failed to send upgrade request:', error);
      // Fallback to mailto
      window.location.href = `mailto:sharry00010@gmail.com?subject=BaatCheet Pro Upgrade Request&body=Name: ${encodeURIComponent(name)}%0AEmail: ${encodeURIComponent(email)}%0A%0AMessage:%0A${encodeURIComponent(message || 'I would like to upgrade to BaatCheet Pro.')}`;
    } finally {
      setSending(false);
    }
  };
  
  return (
    <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl border border-slate-200 w-full max-w-md overflow-hidden">
        <div className="p-6 border-b border-slate-200">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-yellow-500 to-orange-500 flex items-center justify-center">
                <Sparkles className="text-white" size={20} />
              </div>
              <h2 className="text-xl font-bold text-slate-800">Upgrade to Pro</h2>
            </div>
            <button
              onClick={onClose}
              className="p-2 hover:bg-slate-100 rounded-lg transition-colors"
            >
              <X className="text-slate-500" size={20} />
            </button>
          </div>
        </div>
        
        <div className="p-6 space-y-5">
          {sent ? (
            <div className="text-center py-8">
              <div className="w-16 h-16 rounded-full bg-green-500/20 flex items-center justify-center mx-auto mb-4">
                <Check className="text-green-400" size={32} />
              </div>
              <h3 className="text-lg font-semibold text-slate-800 mb-2">Request Sent!</h3>
              <p className="text-slate-500">We'll get back to you within 24 hours.</p>
            </div>
          ) : (
            <>
              {/* Pro Benefits */}
              <div className="p-4 bg-gradient-to-br from-yellow-500/10 to-orange-500/10 rounded-xl border border-yellow-500/20">
                <h3 className="text-sm font-semibold text-yellow-400 mb-3 flex items-center gap-2">
                  <Zap size={16} />
                  Pro Benefits
                </h3>
                <ul className="space-y-2 text-sm text-slate-600">
                  <li className="flex items-center gap-2">
                    <Check size={14} className="text-green-400" />
                    50 image generations/day
                  </li>
                  <li className="flex items-center gap-2">
                    <Check size={14} className="text-green-400" />
                    100 file uploads/day
                  </li>
                  <li className="flex items-center gap-2">
                    <Check size={14} className="text-green-400" />
                    Priority support
                  </li>
                  <li className="flex items-center gap-2">
                    <Check size={14} className="text-green-400" />
                    Advanced AI modes
                  </li>
                  <li className="flex items-center gap-2">
                    <Check size={14} className="text-green-400" />
                    Unlimited projects
                  </li>
                </ul>
              </div>
              
              {/* Notice */}
              <p className="text-sm text-slate-500">
                We haven't added payment yet. Contact admin to upgrade your account manually.
              </p>
              
              <form onSubmit={handleSubmit} className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-slate-600 mb-1.5">
                    Your Name
                  </label>
                  <input
                    type="text"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    required
                    placeholder="Muhammad Sharjeel"
                    className="w-full px-4 py-2.5 bg-slate-100 border border-slate-300 rounded-xl text-slate-800 placeholder-dark-500 focus:outline-none focus:border-primary-500 transition-colors"
                  />
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-slate-600 mb-1.5">
                    Your Email
                  </label>
                  <input
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    required
                    placeholder="your@email.com"
                    className="w-full px-4 py-2.5 bg-slate-100 border border-slate-300 rounded-xl text-slate-800 placeholder-dark-500 focus:outline-none focus:border-primary-500 transition-colors"
                  />
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-slate-600 mb-1.5">
                    Message (optional)
                  </label>
                  <textarea
                    value={message}
                    onChange={(e) => setMessage(e.target.value)}
                    rows={3}
                    placeholder="Why do you want to upgrade?"
                    className="w-full px-4 py-2.5 bg-slate-100 border border-slate-300 rounded-xl text-slate-800 placeholder-dark-500 focus:outline-none focus:border-primary-500 transition-colors resize-none"
                  />
                </div>
                
                {/* Admin contact */}
                <div className="p-3 bg-slate-100 rounded-lg flex items-center gap-3">
                  <div className="w-8 h-8 rounded-lg bg-primary-500/20 flex items-center justify-center">
                    <MessageSquare className="text-primary-400" size={16} />
                  </div>
                  <span className="text-sm text-slate-600">sharry00010@gmail.com</span>
                </div>
                
                <div className="flex gap-3 pt-2">
                  <button
                    type="button"
                    onClick={onClose}
                    className="flex-1 px-4 py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl transition-colors"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={sending || !name || !email}
                    className="flex-1 px-4 py-2.5 bg-gradient-to-r from-primary-500 to-primary-600 hover:from-primary-600 hover:to-primary-700 disabled:opacity-50 text-white rounded-xl transition-all flex items-center justify-center gap-2"
                  >
                    {sending ? (
                      <>
                        <Loader2 className="animate-spin" size={18} />
                        Sending...
                      </>
                    ) : (
                      <>
                        <Zap size={18} />
                        Send Request
                      </>
                    )}
                  </button>
                </div>
              </form>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
