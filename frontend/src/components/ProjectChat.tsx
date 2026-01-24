/**
 * Project Chat Component
 * Real-time chat for project collaborators with role-based permissions
 */

import { useState, useEffect, useRef, useCallback } from 'react';
import {
  Send,
  Image as ImageIcon,
  Smile,
  Edit2,
  Trash2,
  Reply,
  X,
  Settings,
  Shield,
  Crown,
  Eye,
  Users,
  Check,
  Loader2,
  MessageSquare,
  AlertCircle,
} from 'lucide-react';
import clsx from 'clsx';
import { getClerkToken } from '../utils/auth';

interface ChatMessage {
  id: string;
  content: string;
  messageType: 'text' | 'image' | 'system';
  imageUrl?: string;
  senderId: string;
  sender?: {
    id: string;
    firstName?: string;
    lastName?: string;
    username?: string;
    avatar?: string;
    email?: string;
  };
  senderRole: 'admin' | 'moderator' | 'viewer';
  isOwner: boolean;
  isEdited: boolean;
  editedAt?: string;
  replyTo?: {
    id: string;
    content: string;
    senderId: string;
  };
  canEdit: boolean;
  canDeleteForMe: boolean;
  canDeleteForEveryone: boolean;
  createdAt: string;
}

interface ChatSettings {
  chatAccess: 'all' | 'admin_moderator' | 'admin_only';
  allowImages: boolean;
  allowEmojis: boolean;
  allowEditing: boolean;
  allowDeleting: boolean;
}

interface ProjectChatProps {
  projectId: string;
  projectName: string;
  isOwner: boolean;
  myRole: 'admin' | 'moderator' | 'viewer';
}

const EMOJI_LIST = ['👍', '👎', '❤️', '😀', '😂', '🎉', '🔥', '💯', '✅', '❌', '🤔', '👀', '🙏', '💪', '🚀', '⭐'];

export default function ProjectChat({ projectId, myRole }: ProjectChatProps) {
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [newMessage, setNewMessage] = useState('');
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);
  const [settings, setSettings] = useState<ChatSettings | null>(null);
  const [canSendMessage, setCanSendMessage] = useState(false);
  const [showSettings, setShowSettings] = useState(false);
  const [showEmojiPicker, setShowEmojiPicker] = useState(false);
  const [editingMessage, setEditingMessage] = useState<string | null>(null);
  const [editContent, setEditContent] = useState('');
  const [replyingTo, setReplyingTo] = useState<ChatMessage | null>(null);
  const [error, setError] = useState<string | null>(null);
  
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const prevMessageCountRef = useRef<number>(0);
  const userScrolledRef = useRef<boolean>(false);
  const chatContainerRef = useRef<HTMLDivElement>(null);

  // Load messages
  const loadMessages = useCallback(async () => {
    try {
      const token = await getClerkToken();
      const response = await fetch(`/api/v1/projects/${projectId}/chat/messages`, {
        headers: { Authorization: `Bearer ${token}` },
      });

      if (!response.ok) throw new Error('Failed to load messages');

      const data = await response.json();
      setMessages(data.data?.messages || []);
      setSettings(data.data?.settings || null);
      setCanSendMessage(data.data?.canSendMessage ?? false);
      setError(null);
    } catch (err) {
      console.error('Load messages error:', err);
      setError('Failed to load chat messages');
    } finally {
      setLoading(false);
    }
  }, [projectId]);

  useEffect(() => {
    loadMessages();
    // Poll for new messages every 5 seconds
    const interval = setInterval(loadMessages, 5000);
    return () => clearInterval(interval);
  }, [loadMessages]);

  // Only scroll to bottom when new messages are added (not on every poll)
  useEffect(() => {
    const newCount = messages.length;
    const prevCount = prevMessageCountRef.current;
    
    // Only auto-scroll if:
    // 1. New messages were added (count increased)
    // 2. User hasn't manually scrolled up
    if (newCount > prevCount && !userScrolledRef.current) {
      messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    }
    
    prevMessageCountRef.current = newCount;
  }, [messages]);

  // Track user scroll to prevent auto-scroll when they're reading history
  const handleScroll = useCallback(() => {
    if (!chatContainerRef.current) return;
    
    const { scrollTop, scrollHeight, clientHeight } = chatContainerRef.current;
    const isAtBottom = scrollHeight - scrollTop - clientHeight < 100;
    
    // If user scrolled away from bottom, don't auto-scroll
    userScrolledRef.current = !isAtBottom;
  }, []);

  // Send message
  const handleSendMessage = async (e?: React.FormEvent) => {
    e?.preventDefault();
    if (!newMessage.trim() || sending || !canSendMessage) return;

    setSending(true);
    try {
      const token = await getClerkToken();
      const response = await fetch(`/api/v1/projects/${projectId}/chat/messages`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          content: newMessage.trim(),
          replyToId: replyingTo?.id,
        }),
      });

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || 'Failed to send message');
      }

      const data = await response.json();
      setMessages(prev => [...prev, data.data]);
      setNewMessage('');
      setReplyingTo(null);
      userScrolledRef.current = false; // Reset scroll flag so we scroll to our new message
      inputRef.current?.focus();
    } catch (err) {
      console.error('Send message error:', err);
      setError((err as Error).message);
    } finally {
      setSending(false);
    }
  };

  // Edit message
  const handleEditMessage = async (messageId: string) => {
    if (!editContent.trim()) return;

    try {
      const token = await getClerkToken();
      const response = await fetch(`/api/v1/projects/${projectId}/chat/messages/${messageId}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ content: editContent.trim() }),
      });

      if (!response.ok) throw new Error('Failed to edit message');

      setMessages(prev =>
        prev.map(m =>
          m.id === messageId ? { ...m, content: editContent.trim(), isEdited: true } : m
        )
      );
      setEditingMessage(null);
      setEditContent('');
    } catch (err) {
      console.error('Edit message error:', err);
      setError('Failed to edit message');
    }
  };

  // Delete message - supports both "delete for me" and "delete for everyone"
  const handleDeleteMessage = async (messageId: string, deleteForEveryone: boolean = false) => {
    const confirmMsg = deleteForEveryone 
      ? 'Delete this message for everyone? This cannot be undone.'
      : 'Hide this message? Only you won\'t see it anymore.';
    
    if (!confirm(confirmMsg)) return;

    try {
      const token = await getClerkToken();
      const response = await fetch(
        `/api/v1/projects/${projectId}/chat/messages/${messageId}?deleteForEveryone=${deleteForEveryone}`, 
        {
          method: 'DELETE',
          headers: { Authorization: `Bearer ${token}` },
        }
      );

      if (!response.ok) throw new Error('Failed to delete message');

      // Remove from local state
      setMessages(prev => prev.filter(m => m.id !== messageId));
    } catch (err) {
      console.error('Delete message error:', err);
      setError('Failed to delete message');
    }
  };

  // State for delete menu
  const [showDeleteMenu, setShowDeleteMenu] = useState<string | null>(null);

  // Update chat settings (admin only)
  const handleUpdateSettings = async (newSettings: Partial<ChatSettings>) => {
    try {
      const token = await getClerkToken();
      const response = await fetch(`/api/v1/projects/${projectId}/chat/settings`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify(newSettings),
      });

      if (!response.ok) throw new Error('Failed to update settings');

      const data = await response.json();
      setSettings(data.data);
      loadMessages(); // Reload to get updated permissions
    } catch (err) {
      console.error('Update settings error:', err);
      setError('Failed to update settings');
    }
  };

  // Handle image upload
  const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !settings?.allowImages) return;

    // Convert to base64 for now (could upload to server)
    const reader = new FileReader();
    reader.onload = async () => {
      const base64 = reader.result as string;
      
      setSending(true);
      try {
        const token = await getClerkToken();
        const response = await fetch(`/api/v1/projects/${projectId}/chat/messages`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${token}`,
          },
          body: JSON.stringify({
            content: file.name,
            imageUrl: base64,
          }),
        });

        if (!response.ok) throw new Error('Failed to send image');

        const data = await response.json();
        setMessages(prev => [...prev, data.data]);
      } catch (err) {
        console.error('Upload image error:', err);
        setError('Failed to send image');
      } finally {
        setSending(false);
      }
    };
    reader.readAsDataURL(file);
  };

  // Add emoji to message
  const handleAddEmoji = (emoji: string) => {
    setNewMessage(prev => prev + emoji);
    setShowEmojiPicker(false);
    inputRef.current?.focus();
  };

  // Get role icon
  const getRoleIcon = (role: string, isOwner: boolean) => {
    if (isOwner) return <Crown className="w-3 h-3 text-yellow-500" />;
    if (role === 'admin') return <Shield className="w-3 h-3 text-purple-500" />;
    if (role === 'moderator') return <Shield className="w-3 h-3 text-blue-500" />;
    return <Eye className="w-3 h-3 text-slate-400" />;
  };

  // Get sender display name
  const getSenderName = (msg: ChatMessage) => {
    if (msg.sender) {
      if (msg.sender.firstName || msg.sender.lastName) {
        return `${msg.sender.firstName || ''} ${msg.sender.lastName || ''}`.trim();
      }
      return msg.sender.username || msg.sender.email || 'Unknown';
    }
    return 'Unknown';
  };

  // Format timestamp
  const formatTime = (dateStr: string) => {
    const date = new Date(dateStr);
    const now = new Date();
    const diff = now.getTime() - date.getTime();
    
    if (diff < 60000) return 'Just now';
    if (diff < 3600000) return `${Math.floor(diff / 60000)}m ago`;
    if (diff < 86400000) return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    return date.toLocaleDateString([], { month: 'short', day: 'numeric' });
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="w-8 h-8 animate-spin text-emerald-500" />
      </div>
    );
  }

  return (
    <div className="flex flex-col h-full bg-white rounded-xl border border-slate-200 shadow-sm">
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-3 border-b border-slate-200 bg-gradient-to-r from-slate-50 to-white">
        <div className="flex items-center gap-2">
          <MessageSquare className="w-5 h-5 text-emerald-500" />
          <h3 className="font-semibold text-slate-800">Team Chat</h3>
          <span className="text-xs text-slate-400">({messages.length} messages)</span>
        </div>
        
        <div className="flex items-center gap-2">
          {/* Chat access indicator */}
          <div className="flex items-center gap-1 text-xs text-slate-500">
            <Users className="w-4 h-4" />
            {settings?.chatAccess === 'all' && 'All can chat'}
            {settings?.chatAccess === 'admin_moderator' && 'Admin & Mods only'}
            {settings?.chatAccess === 'admin_only' && 'Admin only'}
          </div>
          
          {/* Settings button (admin only) */}
          {myRole === 'admin' && (
            <button
              onClick={() => setShowSettings(!showSettings)}
              className="p-1.5 rounded-lg hover:bg-slate-100 text-slate-400 hover:text-slate-600 transition-colors"
              title="Chat Settings"
            >
              <Settings className="w-4 h-4" />
            </button>
          )}
        </div>
      </div>

      {/* Settings Panel (admin only) */}
      {showSettings && myRole === 'admin' && (
        <div className="px-4 py-3 bg-slate-50 border-b border-slate-200 space-y-3">
          <div className="flex items-center justify-between">
            <span className="text-sm text-slate-600">Who can send messages?</span>
            <select
              value={settings?.chatAccess || 'all'}
              onChange={(e) => handleUpdateSettings({ chatAccess: e.target.value as ChatSettings['chatAccess'] })}
              className="bg-white border border-slate-200 rounded-lg px-2 py-1 text-sm text-slate-700 focus:outline-none focus:border-emerald-400"
            >
              <option value="all">Everyone</option>
              <option value="admin_moderator">Admin & Moderators</option>
              <option value="admin_only">Admin Only</option>
            </select>
          </div>
          
          <div className="flex items-center justify-between">
            <span className="text-sm text-slate-600">Allow images</span>
            <button
              onClick={() => handleUpdateSettings({ allowImages: !settings?.allowImages })}
              className={clsx(
                'w-10 h-5 rounded-full transition-colors relative',
                settings?.allowImages ? 'bg-emerald-500' : 'bg-slate-300'
              )}
            >
              <div
                className={clsx(
                  'absolute top-0.5 w-4 h-4 rounded-full bg-white shadow-sm transition-transform',
                  settings?.allowImages ? 'translate-x-5' : 'translate-x-0.5'
                )}
              />
            </button>
          </div>
          
          <div className="flex items-center justify-between">
            <span className="text-sm text-slate-600">Allow message editing</span>
            <button
              onClick={() => handleUpdateSettings({ allowEditing: !settings?.allowEditing })}
              className={clsx(
                'w-10 h-5 rounded-full transition-colors relative',
                settings?.allowEditing ? 'bg-emerald-500' : 'bg-slate-300'
              )}
            >
              <div
                className={clsx(
                  'absolute top-0.5 w-4 h-4 rounded-full bg-white shadow-sm transition-transform',
                  settings?.allowEditing ? 'translate-x-5' : 'translate-x-0.5'
                )}
              />
            </button>
          </div>
          
          <div className="flex items-center justify-between">
            <span className="text-sm text-slate-600">Allow message deletion</span>
            <button
              onClick={() => handleUpdateSettings({ allowDeleting: !settings?.allowDeleting })}
              className={clsx(
                'w-10 h-5 rounded-full transition-colors relative',
                settings?.allowDeleting ? 'bg-emerald-500' : 'bg-slate-300'
              )}
            >
              <div
                className={clsx(
                  'absolute top-0.5 w-4 h-4 rounded-full bg-white shadow-sm transition-transform',
                  settings?.allowDeleting ? 'translate-x-5' : 'translate-x-0.5'
                )}
              />
            </button>
          </div>
        </div>
      )}

      {/* Error message */}
      {error && (
        <div className="px-4 py-2 bg-red-50 border-b border-red-200 flex items-center gap-2 text-red-600 text-sm">
          <AlertCircle className="w-4 h-4" />
          {error}
          <button onClick={() => setError(null)} className="ml-auto">
            <X className="w-4 h-4" />
          </button>
        </div>
      )}

      {/* Messages */}
      <div 
        ref={chatContainerRef}
        onScroll={handleScroll}
        className="flex-1 overflow-y-auto p-4 space-y-4 min-h-[300px] max-h-[500px] bg-gradient-to-b from-slate-50/50 to-white"
      >
        {messages.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-full text-slate-400">
            <MessageSquare className="w-12 h-12 mb-2 opacity-50" />
            <p>No messages yet</p>
            <p className="text-sm">Start the conversation!</p>
          </div>
        ) : (
          messages.map((msg) => (
            <div
              key={msg.id}
              className={clsx(
                'group relative',
                msg.messageType === 'system' && 'text-center'
              )}
            >
              {/* System message */}
              {msg.messageType === 'system' ? (
                <div className="text-xs text-slate-400 italic py-1">
                  {msg.content}
                </div>
              ) : (
                <div className="flex gap-3">
                  {/* Avatar */}
                  <div className="flex-shrink-0">
                    {msg.sender?.avatar ? (
                      <img
                        src={msg.sender.avatar}
                        alt=""
                        className="w-8 h-8 rounded-full"
                      />
                    ) : (
                      <div className="w-8 h-8 rounded-full bg-gradient-to-br from-emerald-400 to-teal-500 flex items-center justify-center text-white text-sm font-medium shadow-sm">
                        {getSenderName(msg).charAt(0).toUpperCase()}
                      </div>
                    )}
                  </div>

                  {/* Message content */}
                  <div className="flex-1 min-w-0">
                    {/* Header */}
                    <div className="flex items-center gap-2 mb-1">
                      <span className="font-medium text-slate-800 text-sm">
                        {getSenderName(msg)}
                      </span>
                      {getRoleIcon(msg.senderRole, msg.isOwner)}
                      <span className="text-xs text-slate-400">
                        {formatTime(msg.createdAt)}
                      </span>
                      {msg.isEdited && (
                        <span className="text-xs text-slate-400">(edited)</span>
                      )}
                    </div>

                    {/* Reply indicator */}
                    {msg.replyTo && (
                      <div className="text-xs text-slate-500 bg-slate-100 rounded-lg px-3 py-1.5 mb-2 border-l-2 border-emerald-400">
                        Replying to: {msg.replyTo.content.substring(0, 50)}...
                      </div>
                    )}

                    {/* Content */}
                    {editingMessage === msg.id ? (
                      <div className="flex gap-2">
                        <input
                          type="text"
                          value={editContent}
                          onChange={(e) => setEditContent(e.target.value)}
                          className="flex-1 bg-white border border-slate-200 rounded-lg px-3 py-1.5 text-sm text-slate-700 focus:outline-none focus:border-emerald-400"
                          autoFocus
                          onKeyDown={(e) => {
                            if (e.key === 'Enter') handleEditMessage(msg.id);
                            if (e.key === 'Escape') {
                              setEditingMessage(null);
                              setEditContent('');
                            }
                          }}
                        />
                        <button
                          onClick={() => handleEditMessage(msg.id)}
                          className="p-1.5 text-emerald-500 hover:bg-emerald-50 rounded-lg"
                        >
                          <Check className="w-4 h-4" />
                        </button>
                        <button
                          onClick={() => {
                            setEditingMessage(null);
                            setEditContent('');
                          }}
                          className="p-1.5 text-red-500 hover:bg-red-50 rounded-lg"
                        >
                          <X className="w-4 h-4" />
                        </button>
                      </div>
                    ) : (
                      <>
                        {msg.messageType === 'image' && msg.imageUrl && (
                          <img
                            src={msg.imageUrl}
                            alt=""
                            className="max-w-xs rounded-lg mb-1 border border-slate-200"
                          />
                        )}
                        <p className="text-slate-700 text-sm whitespace-pre-wrap break-words">
                          {msg.content}
                        </p>
                      </>
                    )}
                  </div>

                  {/* Actions */}
                  {(msg.canEdit || msg.canDeleteForMe || msg.canDeleteForEveryone || canSendMessage) && (
                    <div className="opacity-0 group-hover:opacity-100 transition-opacity flex items-start gap-1 relative">
                      {canSendMessage && (
                        <button
                          onClick={() => setReplyingTo(msg)}
                          className="p-1.5 text-slate-400 hover:text-emerald-600 hover:bg-emerald-50 rounded-lg"
                          title="Reply"
                        >
                          <Reply className="w-4 h-4" />
                        </button>
                      )}
                      {msg.canEdit && (
                        <button
                          onClick={() => {
                            setEditingMessage(msg.id);
                            setEditContent(msg.content);
                          }}
                          className="p-1.5 text-slate-400 hover:text-blue-600 hover:bg-blue-50 rounded-lg"
                          title="Edit"
                        >
                          <Edit2 className="w-4 h-4" />
                        </button>
                      )}
                      {/* Delete button with dropdown menu */}
                      {(msg.canDeleteForMe || msg.canDeleteForEveryone) && (
                        <div className="relative">
                          <button
                            onClick={() => setShowDeleteMenu(showDeleteMenu === msg.id ? null : msg.id)}
                            className="p-1.5 text-slate-400 hover:text-red-500 hover:bg-red-50 rounded-lg"
                            title="Delete"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                          {showDeleteMenu === msg.id && (
                            <div className="absolute right-0 top-full mt-1 bg-white border border-slate-200 rounded-xl shadow-lg z-20 min-w-[180px] py-1 overflow-hidden">
                              {msg.canDeleteForMe && (
                                <button
                                  onClick={() => {
                                    handleDeleteMessage(msg.id, false);
                                    setShowDeleteMenu(null);
                                  }}
                                  className="w-full px-3 py-2 text-left text-sm text-slate-600 hover:bg-slate-50 flex items-center gap-2"
                                >
                                  <Eye className="w-4 h-4" />
                                  Delete for me
                                </button>
                              )}
                              {msg.canDeleteForEveryone && (
                                <button
                                  onClick={() => {
                                    handleDeleteMessage(msg.id, true);
                                    setShowDeleteMenu(null);
                                  }}
                                  className="w-full px-3 py-2 text-left text-sm text-red-500 hover:bg-red-50 flex items-center gap-2"
                                >
                                  <Trash2 className="w-4 h-4" />
                                  Delete for everyone
                                </button>
                              )}
                            </div>
                          )}
                        </div>
                      )}
                    </div>
                  )}
                </div>
              )}
            </div>
          ))
        )}
        <div ref={messagesEndRef} />
      </div>

      {/* Reply indicator */}
      {replyingTo && (
        <div className="px-4 py-2 bg-emerald-50 border-t border-emerald-200 flex items-center gap-2">
          <Reply className="w-4 h-4 text-emerald-500" />
          <span className="text-sm text-slate-600 flex-1 truncate">
            Replying to {getSenderName(replyingTo)}: {replyingTo.content.substring(0, 50)}...
          </span>
          <button onClick={() => setReplyingTo(null)} className="text-slate-400 hover:text-slate-600">
            <X className="w-4 h-4" />
          </button>
        </div>
      )}

      {/* Input */}
      <div className="px-4 py-3 border-t border-slate-200 bg-white rounded-b-xl">
        {canSendMessage ? (
          <form onSubmit={handleSendMessage} className="flex items-center gap-2">
            {/* Image upload */}
            {settings?.allowImages && (
              <>
                <input
                  ref={fileInputRef}
                  type="file"
                  accept="image/*"
                  onChange={handleImageUpload}
                  className="hidden"
                />
                <button
                  type="button"
                  onClick={() => fileInputRef.current?.click()}
                  className="p-2 text-slate-400 hover:text-emerald-600 hover:bg-emerald-50 rounded-lg transition-colors"
                  title="Send image"
                >
                  <ImageIcon className="w-5 h-5" />
                </button>
              </>
            )}

            {/* Emoji picker */}
            {settings?.allowEmojis && (
              <div className="relative">
                <button
                  type="button"
                  onClick={() => setShowEmojiPicker(!showEmojiPicker)}
                  className="p-2 text-slate-400 hover:text-amber-500 hover:bg-amber-50 rounded-lg transition-colors"
                  title="Add emoji"
                >
                  <Smile className="w-5 h-5" />
                </button>
                {showEmojiPicker && (
                  <div className="absolute bottom-full left-0 mb-2 p-2 bg-white border border-slate-200 rounded-xl shadow-lg grid grid-cols-8 gap-1 z-10">
                    {EMOJI_LIST.map((emoji) => (
                      <button
                        key={emoji}
                        type="button"
                        onClick={() => handleAddEmoji(emoji)}
                        className="w-8 h-8 flex items-center justify-center hover:bg-slate-100 rounded text-lg"
                      >
                        {emoji}
                      </button>
                    ))}
                  </div>
                )}
              </div>
            )}

            {/* Message input */}
            <input
              ref={inputRef}
              type="text"
              value={newMessage}
              onChange={(e) => setNewMessage(e.target.value)}
              placeholder="Type a message..."
              className="flex-1 bg-slate-50 border border-slate-200 rounded-xl px-4 py-2.5 text-slate-700 placeholder-slate-400 focus:outline-none focus:border-emerald-400 focus:ring-2 focus:ring-emerald-100"
            />

            {/* Send button */}
            <button
              type="submit"
              disabled={!newMessage.trim() || sending}
              className={clsx(
                'p-2.5 rounded-xl transition-all',
                newMessage.trim() && !sending
                  ? 'bg-gradient-to-r from-emerald-500 to-teal-500 text-white hover:from-emerald-600 hover:to-teal-600 shadow-lg shadow-emerald-500/25'
                  : 'bg-slate-100 text-slate-400 cursor-not-allowed'
              )}
            >
              {sending ? (
                <Loader2 className="w-5 h-5 animate-spin" />
              ) : (
                <Send className="w-5 h-5" />
              )}
            </button>
          </form>
        ) : (
          <div className="text-center text-slate-500 text-sm py-2">
            <Shield className="w-4 h-4 inline mr-1" />
            {settings?.chatAccess === 'admin_only' 
              ? 'Only the admin can send messages in this chat'
              : 'Only admins and moderators can send messages in this chat'}
          </div>
        )}
      </div>
    </div>
  );
}
