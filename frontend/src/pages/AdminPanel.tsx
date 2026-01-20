/**
 * Admin Panel - Comprehensive API Management Dashboard
 * 
 * Features:
 * - Real-time API status monitoring
 * - API key management and testing
 * - Swagger-like API documentation and testing
 * - System health monitoring
 * - User analytics
 * - All 127+ API endpoints documented
 */

import { useState, useEffect, useCallback } from 'react';
import { useUser } from '@clerk/clerk-react';
import { useNavigate } from 'react-router-dom';
import {
  Activity, Server, Key, Users, Database, Cpu,
  RefreshCw, Play, CheckCircle, XCircle, AlertTriangle, Clock,
  ChevronDown, ChevronRight, Copy, ExternalLink, Search,
  Zap, Image, MessageSquare, Globe, Volume2, Mail,
  Shield, Settings, BarChart3, Loader2, Terminal, Code,
  Mic, Upload, Tag, Share2, User, Lock,
  Download, Eye, Folder, Heart, Send,
} from 'lucide-react';
import clsx from 'clsx';
import { getClerkToken } from '../utils/auth';

// Types
interface ProviderHealth {
  name: string;
  status: 'available' | 'unavailable' | 'limited';
  keys: number;
  available: number;
  dailyCapacity: number;
  used: number;
  percentUsed: number;
}

interface ServiceStatus {
  status: string;
  latency?: number;
  message?: string;
}

interface SystemHealth {
  status: 'healthy' | 'degraded' | 'unhealthy';
  timestamp: string;
  version: string;
  environment: string;
  uptime: number;
  services: {
    database: ServiceStatus;
    redis: ServiceStatus;
    api: ServiceStatus;
  };
  providers?: ProviderHealth[];
}

interface ApiEndpoint {
  method: 'GET' | 'POST' | 'PUT' | 'DELETE' | 'PATCH';
  path: string;
  description: string;
  category: string;
  auth: boolean;
  params?: { name: string; type: string; required: boolean; description: string }[];
  body?: { name: string; type: string; required: boolean; description: string }[];
  response?: string;
  testable?: boolean;
}

interface TestResult {
  success: boolean;
  status: number;
  time: number;
  data?: unknown;
  error?: string;
}

// Complete API Endpoints Documentation (127+ endpoints)
const API_ENDPOINTS: ApiEndpoint[] = [
  // ============================================
  // HEALTH & SYSTEM (7 endpoints)
  // ============================================
  { method: 'GET', path: '/health', description: 'Get system health status', category: 'Health & System', auth: false, testable: true },
  { method: 'GET', path: '/health?detailed=true', description: 'Get detailed health with providers', category: 'Health & System', auth: false, testable: true },
  { method: 'GET', path: '/health/providers', description: 'Get AI provider status and capacity', category: 'Health & System', auth: false, testable: true },
  { method: 'GET', path: '/health/queues', description: 'Get background job queue status', category: 'Health & System', auth: false, testable: true },
  { method: 'GET', path: '/health/cache', description: 'Get Redis cache status', category: 'Health & System', auth: false, testable: true },
  { method: 'GET', path: '/health/ready', description: 'Kubernetes readiness probe', category: 'Health & System', auth: false, testable: true },
  { method: 'GET', path: '/health/live', description: 'Kubernetes liveness probe', category: 'Health & System', auth: false, testable: true },
  { method: 'GET', path: '/health/metrics', description: 'System metrics (CPU, memory, etc.)', category: 'Health & System', auth: false, testable: true },
  { method: 'GET', path: '/health/email', description: 'Email service status (Resend)', category: 'Health & System', auth: false, testable: true },
  
  // ============================================
  // CHAT (17 endpoints)
  // ============================================
  { method: 'POST', path: '/chat/completions', description: 'Send chat message (main AI endpoint)', category: 'Chat', auth: true, testable: true,
    body: [
      { name: 'message', type: 'string', required: true, description: 'User message' },
      { name: 'conversationId', type: 'string', required: false, description: 'Existing conversation ID' },
      { name: 'mode', type: 'string', required: false, description: 'Chat mode (chat, code, image-generation, research, creative, etc.)' },
      { name: 'stream', type: 'boolean', required: false, description: 'Enable streaming response' },
      { name: 'projectId', type: 'string', required: false, description: 'Project context ID' },
    ]
  },
  { method: 'POST', path: '/chat/stream', description: 'Stream chat response (SSE)', category: 'Chat', auth: true },
  { method: 'GET', path: '/chat/modes', description: 'Get available chat modes', category: 'Chat', auth: false, testable: true },
  { method: 'GET', path: '/chat/usage', description: 'Get user usage statistics', category: 'Chat', auth: true, testable: true },
  { method: 'GET', path: '/chat/models', description: 'Get available AI models', category: 'Chat', auth: false, testable: true },
  { method: 'GET', path: '/chat/providers/health', description: 'Get chat provider health', category: 'Chat', auth: false, testable: true },
  { method: 'GET', path: '/chat/providers/:provider/keys', description: 'Get provider key status', category: 'Chat', auth: false },
  { method: 'POST', path: '/chat/test', description: 'Test chat with simple message', category: 'Chat', auth: true, testable: true,
    body: [{ name: 'message', type: 'string', required: true, description: 'Test message' }]
  },
  { method: 'POST', path: '/chat/analyze', description: 'Analyze text (sentiment, entities, etc.)', category: 'Chat', auth: true,
    body: [{ name: 'text', type: 'string', required: true, description: 'Text to analyze' }]
  },
  { method: 'POST', path: '/chat/suggest', description: 'Get AI suggestions', category: 'Chat', auth: true },
  { method: 'POST', path: '/chat/feedback', description: 'Submit feedback on AI response', category: 'Chat', auth: true,
    body: [
      { name: 'messageId', type: 'string', required: true, description: 'Message ID' },
      { name: 'rating', type: 'number', required: true, description: 'Rating (1-5)' },
      { name: 'feedback', type: 'string', required: false, description: 'Text feedback' },
    ]
  },
  { method: 'POST', path: '/chat/share', description: 'Share a conversation', category: 'Chat', auth: true },
  { method: 'GET', path: '/chat/shared/:shareId', description: 'Get shared conversation', category: 'Chat', auth: true },
  { method: 'DELETE', path: '/chat/share/:shareId', description: 'Delete shared conversation', category: 'Chat', auth: true },
  
  // ============================================
  // CONVERSATIONS (10 endpoints)
  // ============================================
  { method: 'GET', path: '/conversations', description: 'List user conversations', category: 'Conversations', auth: true, testable: true,
    params: [
      { name: 'limit', type: 'number', required: false, description: 'Max results (default: 20)' },
      { name: 'offset', type: 'number', required: false, description: 'Pagination offset' },
      { name: 'projectId', type: 'string', required: false, description: 'Filter by project' },
    ]
  },
  { method: 'GET', path: '/conversations/:id', description: 'Get conversation by ID', category: 'Conversations', auth: true },
  { method: 'PUT', path: '/conversations/:id', description: 'Update conversation (title, etc.)', category: 'Conversations', auth: true },
  { method: 'DELETE', path: '/conversations/:id', description: 'Delete conversation', category: 'Conversations', auth: true },
  { method: 'POST', path: '/conversations/:id/messages', description: 'Add message to conversation', category: 'Conversations', auth: true },
  { method: 'GET', path: '/conversations/:id/messages', description: 'Get conversation messages', category: 'Conversations', auth: true },
  { method: 'POST', path: '/conversations/:id/share', description: 'Share conversation', category: 'Conversations', auth: true },
  { method: 'POST', path: '/conversations/:id/archive', description: 'Archive conversation', category: 'Conversations', auth: true },
  { method: 'POST', path: '/conversations/:id/unarchive', description: 'Unarchive conversation', category: 'Conversations', auth: true },
  { method: 'POST', path: '/conversations/:id/export', description: 'Export conversation', category: 'Conversations', auth: true },
  
  // ============================================
  // PROJECTS (16 endpoints)
  // ============================================
  { method: 'GET', path: '/projects', description: 'List user projects', category: 'Projects', auth: true, testable: true },
  { method: 'POST', path: '/projects', description: 'Create new project', category: 'Projects', auth: true, testable: true,
    body: [
      { name: 'name', type: 'string', required: true, description: 'Project name' },
      { name: 'description', type: 'string', required: false, description: 'Project description' },
      { name: 'color', type: 'string', required: false, description: 'Project color (hex)' },
      { name: 'emoji', type: 'string', required: false, description: 'Project emoji' },
    ]
  },
  { method: 'GET', path: '/projects/:id', description: 'Get project details', category: 'Projects', auth: true },
  { method: 'PUT', path: '/projects/:id', description: 'Update project', category: 'Projects', auth: true },
  { method: 'DELETE', path: '/projects/:id', description: 'Delete project', category: 'Projects', auth: true },
  { method: 'GET', path: '/projects/:id/conversations', description: 'Get project conversations', category: 'Projects', auth: true },
  { method: 'GET', path: '/projects/:id/collaborators', description: 'Get project collaborators', category: 'Projects', auth: true },
  { method: 'POST', path: '/projects/:id/invite', description: 'Invite user to project', category: 'Projects', auth: true,
    body: [
      { name: 'email', type: 'string', required: true, description: 'User email' },
      { name: 'role', type: 'string', required: true, description: 'Role (admin, moderator, viewer)' },
    ]
  },
  { method: 'GET', path: '/projects/invitations/pending', description: 'Get pending invitations', category: 'Projects', auth: true, testable: true },
  { method: 'POST', path: '/projects/invitations/:id/respond', description: 'Accept/decline invitation', category: 'Projects', auth: true,
    body: [{ name: 'accept', type: 'boolean', required: true, description: 'Accept or decline' }]
  },
  { method: 'GET', path: '/projects/:id/context', description: 'Get project AI context', category: 'Projects', auth: true },
  { method: 'POST', path: '/projects/:id/context', description: 'Update project AI context', category: 'Projects', auth: true },
  { method: 'GET', path: '/projects/:id/activity', description: 'Get project activity log', category: 'Projects', auth: true },
  { method: 'DELETE', path: '/projects/:id/collaborators/:userId', description: 'Remove collaborator', category: 'Projects', auth: true },
  { method: 'PUT', path: '/projects/:id/collaborators/:userId', description: 'Update collaborator role', category: 'Projects', auth: true },
  
  // ============================================
  // PROJECT CHAT (10 endpoints)
  // ============================================
  { method: 'GET', path: '/projects/:projectId/chat/settings', description: 'Get project chat settings', category: 'Project Chat', auth: true },
  { method: 'PUT', path: '/projects/:projectId/chat/settings', description: 'Update chat settings (admin)', category: 'Project Chat', auth: true,
    body: [
      { name: 'chatAccess', type: 'string', required: false, description: 'Who can send (all, admin_moderator, admin_only)' },
      { name: 'allowImages', type: 'boolean', required: false, description: 'Allow image uploads' },
      { name: 'allowEmojis', type: 'boolean', required: false, description: 'Allow emojis' },
      { name: 'allowEditing', type: 'boolean', required: false, description: 'Allow message editing' },
      { name: 'allowDeleting', type: 'boolean', required: false, description: 'Allow message deleting' },
    ]
  },
  { method: 'GET', path: '/projects/:projectId/chat/messages', description: 'Get project chat messages', category: 'Project Chat', auth: true,
    params: [
      { name: 'limit', type: 'number', required: false, description: 'Max messages' },
      { name: 'before', type: 'string', required: false, description: 'Messages before this ID' },
      { name: 'after', type: 'string', required: false, description: 'Messages after this ID' },
    ]
  },
  { method: 'POST', path: '/projects/:projectId/chat/messages', description: 'Send project chat message', category: 'Project Chat', auth: true,
    body: [
      { name: 'content', type: 'string', required: true, description: 'Message content' },
      { name: 'messageType', type: 'string', required: false, description: 'Type (text, image)' },
      { name: 'replyToId', type: 'string', required: false, description: 'Reply to message ID' },
    ]
  },
  { method: 'PUT', path: '/projects/:projectId/chat/messages/:messageId', description: 'Edit project chat message', category: 'Project Chat', auth: true },
  { method: 'DELETE', path: '/projects/:projectId/chat/messages/:messageId', description: 'Delete project chat message', category: 'Project Chat', auth: true,
    params: [{ name: 'deleteForEveryone', type: 'boolean', required: false, description: 'Delete for all or just me' }]
  },
  { method: 'POST', path: '/projects/:projectId/chat/read-all', description: 'Mark all messages as read', category: 'Project Chat', auth: true },
  { method: 'POST', path: '/projects/:projectId/chat/messages/:messageId/read', description: 'Mark message as read', category: 'Project Chat', auth: true },
  { method: 'GET', path: '/projects/:projectId/chat/unread-count', description: 'Get unread message count', category: 'Project Chat', auth: true },
  { method: 'POST', path: '/projects/:projectId/chat/messages/:messageId/unhide', description: 'Unhide deleted message', category: 'Project Chat', auth: true },
  
  // ============================================
  // IMAGE GENERATION (5 endpoints)
  // ============================================
  { method: 'POST', path: '/images/generate', description: 'Generate image from prompt', category: 'Image Generation', auth: true,
    body: [
      { name: 'prompt', type: 'string', required: true, description: 'Image description' },
      { name: 'style', type: 'string', required: false, description: 'Art style preset' },
      { name: 'aspectRatio', type: 'string', required: false, description: 'Aspect ratio (1:1, 16:9, 9:16, 4:3, 3:4)' },
      { name: 'enhancePrompt', type: 'boolean', required: false, description: 'AI enhance the prompt' },
    ]
  },
  { method: 'GET', path: '/images/styles', description: 'Get available image styles', category: 'Image Generation', auth: true, testable: true },
  { method: 'GET', path: '/images/status', description: 'Get image generation status', category: 'Image Generation', auth: true, testable: true },
  { method: 'GET', path: '/images/history', description: 'Get image generation history', category: 'Image Generation', auth: true },
  { method: 'POST', path: '/images/variations', description: 'Generate image variations', category: 'Image Generation', auth: true },
  
  // ============================================
  // TTS - TEXT TO SPEECH (6 endpoints)
  // ============================================
  { method: 'GET', path: '/tts/health', description: 'TTS service health', category: 'Text-to-Speech', auth: false, testable: true },
  { method: 'GET', path: '/tts/debug', description: 'TTS debug info (keys, test)', category: 'Text-to-Speech', auth: false, testable: true },
  { method: 'POST', path: '/tts/reset-keys', description: 'Reset exhausted TTS keys', category: 'Text-to-Speech', auth: false, testable: true },
  { method: 'POST', path: '/tts/generate', description: 'Generate speech from text', category: 'Text-to-Speech', auth: true,
    body: [
      { name: 'text', type: 'string', required: true, description: 'Text to convert (max 5000 chars)' },
      { name: 'voice', type: 'string', required: false, description: 'Voice ID' },
    ]
  },
  { method: 'GET', path: '/tts/voices', description: 'Get available voices', category: 'Text-to-Speech', auth: true, testable: true },
  { method: 'GET', path: '/tts/status', description: 'Get TTS service status', category: 'Text-to-Speech', auth: true, testable: true },
  
  // ============================================
  // AUDIO (10 endpoints)
  // ============================================
  { method: 'POST', path: '/audio/transcribe', description: 'Transcribe audio to text', category: 'Audio', auth: true },
  { method: 'POST', path: '/audio/translate', description: 'Translate audio', category: 'Audio', auth: true },
  { method: 'POST', path: '/audio/upload', description: 'Upload audio file', category: 'Audio', auth: true },
  { method: 'POST', path: '/audio/process', description: 'Process audio file', category: 'Audio', auth: true },
  { method: 'GET', path: '/audio/status/:jobId', description: 'Get audio processing status', category: 'Audio', auth: true },
  { method: 'DELETE', path: '/audio/:id', description: 'Delete audio file', category: 'Audio', auth: true },
  { method: 'POST', path: '/audio/voice-chat/start', description: 'Start voice chat session', category: 'Audio', auth: true },
  { method: 'POST', path: '/audio/voice-chat/send', description: 'Send voice message', category: 'Audio', auth: true },
  { method: 'GET', path: '/audio/languages', description: 'Get supported languages', category: 'Audio', auth: false, testable: true },
  { method: 'GET', path: '/audio/formats', description: 'Get supported audio formats', category: 'Audio', auth: false, testable: true },
  
  // ============================================
  // SEARCH (3 endpoints)
  // ============================================
  { method: 'POST', path: '/search/web', description: 'Web search (Brave/SerpAPI)', category: 'Search', auth: true,
    body: [
      { name: 'query', type: 'string', required: true, description: 'Search query' },
      { name: 'limit', type: 'number', required: false, description: 'Max results (default: 10)' },
    ]
  },
  { method: 'POST', path: '/search/images', description: 'Image search', category: 'Search', auth: true },
  { method: 'GET', path: '/search/history', description: 'Get search history', category: 'Search', auth: true },
  
  // ============================================
  // FILES (6 endpoints)
  // ============================================
  { method: 'POST', path: '/files/upload', description: 'Upload file', category: 'Files', auth: true },
  { method: 'GET', path: '/files/upload-status', description: 'Get upload status', category: 'Files', auth: true, testable: true },
  { method: 'GET', path: '/files/:id', description: 'Get file by ID', category: 'Files', auth: true },
  { method: 'DELETE', path: '/files/:id', description: 'Delete file', category: 'Files', auth: true },
  { method: 'POST', path: '/files/analyze', description: 'Analyze file (OCR, etc.)', category: 'Files', auth: true },
  { method: 'GET', path: '/files/list', description: 'List user files', category: 'Files', auth: true },
  
  // ============================================
  // PROFILE (11 endpoints)
  // ============================================
  { method: 'GET', path: '/profile/me', description: 'Get user profile', category: 'Profile', auth: true, testable: true },
  { method: 'GET', path: '/profile/stats', description: 'Get user statistics', category: 'Profile', auth: true, testable: true },
  { method: 'DELETE', path: '/profile/facts/:factId', description: 'Delete learned fact', category: 'Profile', auth: true },
  { method: 'POST', path: '/profile/teach', description: 'Teach AI about user', category: 'Profile', auth: true },
  { method: 'POST', path: '/profile/ask', description: 'Ask AI about user profile', category: 'Profile', auth: true },
  { method: 'PATCH', path: '/profile/settings', description: 'Update user settings', category: 'Profile', auth: true },
  { method: 'GET', path: '/profile/summaries', description: 'Get conversation summaries', category: 'Profile', auth: true },
  { method: 'POST', path: '/profile/summaries/:conversationId', description: 'Generate conversation summary', category: 'Profile', auth: true },
  { method: 'DELETE', path: '/profile/clear', description: 'Clear all profile data', category: 'Profile', auth: true },
  { method: 'PATCH', path: '/profile/goals/:goalKey', description: 'Update user goal', category: 'Profile', auth: true },
  { method: 'POST', path: '/profile/decay-interests', description: 'Decay old interests', category: 'Profile', auth: true },
  
  // ============================================
  // TAGS (5 endpoints)
  // ============================================
  { method: 'GET', path: '/tags', description: 'List all tags', category: 'Tags', auth: true, testable: true },
  { method: 'POST', path: '/tags', description: 'Create new tag', category: 'Tags', auth: true },
  { method: 'PUT', path: '/tags/:id', description: 'Update tag', category: 'Tags', auth: true },
  { method: 'DELETE', path: '/tags/:id', description: 'Delete tag', category: 'Tags', auth: true },
  { method: 'POST', path: '/tags/:id/conversations', description: 'Add tag to conversation', category: 'Tags', auth: true },
  
  // ============================================
  // SHARE (4 endpoints)
  // ============================================
  { method: 'POST', path: '/share', description: 'Create share link', category: 'Share', auth: true },
  { method: 'GET', path: '/share/:shareId', description: 'Get shared content', category: 'Share', auth: false },
  { method: 'GET', path: '/share/:shareId/preview', description: 'Get share preview', category: 'Share', auth: false },
  { method: 'DELETE', path: '/share/:shareId', description: 'Delete share link', category: 'Share', auth: true },
  
  // ============================================
  // MOBILE AUTH (10 endpoints)
  // ============================================
  { method: 'POST', path: '/auth/mobile/signup', description: 'Mobile user registration', category: 'Mobile Auth', auth: false,
    body: [
      { name: 'email', type: 'string', required: true, description: 'User email' },
      { name: 'password', type: 'string', required: true, description: 'Password (min 8 chars)' },
      { name: 'firstName', type: 'string', required: false, description: 'First name' },
      { name: 'lastName', type: 'string', required: false, description: 'Last name' },
    ]
  },
  { method: 'POST', path: '/auth/mobile/verify-email', description: 'Verify email with code', category: 'Mobile Auth', auth: false },
  { method: 'POST', path: '/auth/mobile/resend-code', description: 'Resend verification code', category: 'Mobile Auth', auth: false },
  { method: 'POST', path: '/auth/mobile/signin', description: 'Mobile sign in', category: 'Mobile Auth', auth: false,
    body: [
      { name: 'email', type: 'string', required: true, description: 'User email' },
      { name: 'password', type: 'string', required: true, description: 'Password' },
    ]
  },
  { method: 'GET', path: '/auth/mobile/me', description: 'Get current mobile user', category: 'Mobile Auth', auth: true, testable: true },
  { method: 'POST', path: '/auth/mobile/refresh', description: 'Refresh auth token', category: 'Mobile Auth', auth: true },
  { method: 'POST', path: '/auth/mobile/logout', description: 'Mobile logout', category: 'Mobile Auth', auth: true },
  { method: 'POST', path: '/auth/mobile/change-password', description: 'Change password', category: 'Mobile Auth', auth: true },
  { method: 'POST', path: '/auth/mobile/forgot-password', description: 'Request password reset', category: 'Mobile Auth', auth: false },
  { method: 'POST', path: '/auth/mobile/reset-password', description: 'Reset password with code', category: 'Mobile Auth', auth: false },
  
  // ============================================
  // GOOGLE AUTH (1 endpoint)
  // ============================================
  { method: 'POST', path: '/auth/google', description: 'Google OAuth sign in', category: 'Google Auth', auth: false,
    body: [{ name: 'idToken', type: 'string', required: true, description: 'Google ID token' }]
  },
  
  // ============================================
  // EXPORT (3 endpoints)
  // ============================================
  { method: 'POST', path: '/export/conversation/:id', description: 'Export conversation', category: 'Export', auth: true },
  { method: 'POST', path: '/export/project/:id', description: 'Export project', category: 'Export', auth: true },
  { method: 'GET', path: '/export/download/:exportId', description: 'Download export file', category: 'Export', auth: true },
  
  // ============================================
  // GDPR (4 endpoints)
  // ============================================
  { method: 'GET', path: '/gdpr/data', description: 'Get all user data (GDPR)', category: 'GDPR', auth: true },
  { method: 'POST', path: '/gdpr/export', description: 'Request data export', category: 'GDPR', auth: true },
  { method: 'DELETE', path: '/gdpr/delete', description: 'Delete all user data', category: 'GDPR', auth: true },
  { method: 'GET', path: '/gdpr/consent', description: 'Get consent status', category: 'GDPR', auth: true },
  
  // ============================================
  // ADMIN (20+ endpoints)
  // ============================================
  { method: 'GET', path: '/admin/dashboard', description: 'Admin dashboard overview', category: 'Admin', auth: true },
  { method: 'GET', path: '/admin/dashboard/stats', description: 'Quick statistics', category: 'Admin', auth: true },
  { method: 'GET', path: '/admin/users', description: 'List all users', category: 'Admin', auth: true },
  { method: 'GET', path: '/admin/users/:id', description: 'Get user details', category: 'Admin', auth: true },
  { method: 'PUT', path: '/admin/users/:id', description: 'Update user', category: 'Admin', auth: true },
  { method: 'POST', path: '/admin/users/:id/ban', description: 'Ban user', category: 'Admin', auth: true },
  { method: 'POST', path: '/admin/users/:id/unban', description: 'Unban user', category: 'Admin', auth: true },
  { method: 'DELETE', path: '/admin/users/:id', description: 'Delete user', category: 'Admin', auth: true },
  { method: 'POST', path: '/admin/users/:id/role', description: 'Change user role', category: 'Admin', auth: true },
  { method: 'GET', path: '/admin/moderation/queue', description: 'Get moderation queue', category: 'Admin', auth: true },
  { method: 'POST', path: '/admin/moderation/:id/approve', description: 'Approve content', category: 'Admin', auth: true },
  { method: 'GET', path: '/admin/moderation/reports', description: 'Get reports', category: 'Admin', auth: true },
  { method: 'POST', path: '/admin/moderation/reports/:id', description: 'Handle report', category: 'Admin', auth: true },
  { method: 'DELETE', path: '/admin/moderation/reports/:id', description: 'Dismiss report', category: 'Admin', auth: true },
  { method: 'GET', path: '/admin/analytics/overview', description: 'Analytics overview', category: 'Admin', auth: true },
  { method: 'POST', path: '/admin/analytics/export', description: 'Export analytics', category: 'Admin', auth: true },
  { method: 'GET', path: '/admin/analytics/users', description: 'User analytics', category: 'Admin', auth: true },
  { method: 'GET', path: '/admin/analytics/usage', description: 'Usage analytics', category: 'Admin', auth: true },
  { method: 'GET', path: '/admin/analytics/providers', description: 'Provider analytics', category: 'Admin', auth: true },
  { method: 'GET', path: '/admin/settings/providers', description: 'Get provider settings', category: 'Admin', auth: true },
  { method: 'PUT', path: '/admin/settings/providers', description: 'Update provider settings', category: 'Admin', auth: true },
  { method: 'GET', path: '/admin/settings/system', description: 'Get system settings', category: 'Admin', auth: true },
  { method: 'PUT', path: '/admin/settings/system', description: 'Update system settings', category: 'Admin', auth: true },
  { method: 'GET', path: '/admin/logs', description: 'Get system logs', category: 'Admin', auth: true },
  { method: 'GET', path: '/admin/logs/errors', description: 'Get error logs', category: 'Admin', auth: true },
];

const CATEGORY_ICONS: Record<string, React.ReactNode> = {
  'Health & System': <Server className="w-4 h-4" />,
  'Chat': <MessageSquare className="w-4 h-4" />,
  'Conversations': <MessageSquare className="w-4 h-4" />,
  'Projects': <Folder className="w-4 h-4" />,
  'Project Chat': <Send className="w-4 h-4" />,
  'Image Generation': <Image className="w-4 h-4" />,
  'Text-to-Speech': <Volume2 className="w-4 h-4" />,
  'Audio': <Mic className="w-4 h-4" />,
  'Search': <Globe className="w-4 h-4" />,
  'Files': <Upload className="w-4 h-4" />,
  'Profile': <User className="w-4 h-4" />,
  'Tags': <Tag className="w-4 h-4" />,
  'Share': <Share2 className="w-4 h-4" />,
  'Mobile Auth': <Lock className="w-4 h-4" />,
  'Google Auth': <Shield className="w-4 h-4" />,
  'Export': <Download className="w-4 h-4" />,
  'GDPR': <Eye className="w-4 h-4" />,
  'Admin': <Shield className="w-4 h-4" />,
};

const METHOD_COLORS: Record<string, string> = {
  GET: 'bg-green-500/20 text-green-400 border-green-500/30',
  POST: 'bg-blue-500/20 text-blue-400 border-blue-500/30',
  PUT: 'bg-yellow-500/20 text-yellow-400 border-yellow-500/30',
  DELETE: 'bg-red-500/20 text-red-400 border-red-500/30',
  PATCH: 'bg-purple-500/20 text-purple-400 border-purple-500/30',
};

export default function AdminPanel() {
  const { user, isLoaded } = useUser();
  const navigate = useNavigate();
  
  const [activeTab, setActiveTab] = useState<'dashboard' | 'apis' | 'providers' | 'testing' | 'logs'>('dashboard');
  const [health, setHealth] = useState<SystemHealth | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [expandedCategories, setExpandedCategories] = useState<Set<string>>(new Set(['Health & System']));
  const [selectedEndpoint, setSelectedEndpoint] = useState<ApiEndpoint | null>(null);
  const [testResult, setTestResult] = useState<TestResult | null>(null);
  const [testing, setTesting] = useState(false);
  const [requestBody, setRequestBody] = useState<string>('{}');
  const [batchTestResults, setBatchTestResults] = useState<Map<string, TestResult>>(new Map());
  const [batchTesting, setBatchTesting] = useState(false);
  const [providers, setProviders] = useState<any>(null);
  const [providerTestResults, setProviderTestResults] = useState<Record<string, any>>({});
  const [testingProvider, setTestingProvider] = useState<string | null>(null);
  
  // Admin emails
  const ADMIN_EMAILS = ['muhammadsharjeelsaleem06@gmail.com', 'onseason10@gmail.com'];
  
  const isAdmin = user?.primaryEmailAddress?.emailAddress && 
    ADMIN_EMAILS.includes(user.primaryEmailAddress.emailAddress);
  
  const fetchHealth = useCallback(async () => {
    try {
      // Try direct HuggingFace URL first (bypass Netlify proxy which times out)
      const directUrl = 'https://sharry121-baatcheet.hf.space/api/v1/health?detailed=true';
      const proxyUrl = '/api/v1/health?detailed=true';
      
      let response;
      try {
        response = await fetch(directUrl, { signal: AbortSignal.timeout(10000) });
      } catch {
        // Fallback to proxy
        response = await fetch(proxyUrl, { signal: AbortSignal.timeout(10000) });
      }
      
      if (!response.ok) {
        throw new Error(`HTTP ${response.status}`);
      }
      const data = await response.json();
      setHealth(data);
      setError(null);
    } catch (err) {
      console.error('Failed to fetch health:', err);
      setError('Failed to connect to backend. The server might be restarting.');
      setHealth({
        status: 'unhealthy',
        timestamp: new Date().toISOString(),
        version: 'unknown',
        environment: 'unknown',
        uptime: 0,
        services: {
          database: { status: 'unhealthy', message: 'Unable to connect' },
          redis: { status: 'unhealthy', message: 'Unable to connect' },
          api: { status: 'unhealthy', message: 'Unable to connect' },
        },
      });
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);
  
  const fetchProviders = useCallback(async () => {
    try {
      const directUrl = 'https://sharry121-baatcheet.hf.space/api/v1/health/providers';
      const response = await fetch(directUrl, { signal: AbortSignal.timeout(10000) });
      if (response.ok) {
        const data = await response.json();
        setProviders(data);
      }
    } catch (err) {
      console.error('Failed to fetch providers:', err);
    }
  }, []);
  
  const testProvider = async (providerName: string) => {
    setTestingProvider(providerName);
    try {
      const response = await fetch('https://sharry121-baatcheet.hf.space/api/v1/health/providers/test', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ provider: providerName }),
        signal: AbortSignal.timeout(15000),
      });
      const data = await response.json();
      setProviderTestResults(prev => ({ ...prev, [providerName]: data }));
    } catch (err: any) {
      setProviderTestResults(prev => ({ 
        ...prev, 
        [providerName]: { success: false, error: err.message } 
      }));
    } finally {
      setTestingProvider(null);
    }
  };
  
  const testAllProviders = async () => {
    const providerNames = ['groq', 'openrouter', 'deepseek', 'gemini', 'huggingface', 'ocrspace'];
    for (const name of providerNames) {
      await testProvider(name);
      await new Promise(r => setTimeout(r, 500)); // Small delay between tests
    }
  };
  
  useEffect(() => {
    if (!isLoaded) return; // Wait for Clerk to load
    
    if (!isAdmin) {
      navigate('/app/chat');
      return;
    }
    
    // Fetch health and providers if user is admin
    fetchHealth();
    fetchProviders();
    const healthInterval = setInterval(fetchHealth, 30000);
    const providerInterval = setInterval(fetchProviders, 60000);
    return () => {
      clearInterval(healthInterval);
      clearInterval(providerInterval);
    };
  }, [isLoaded, isAdmin, navigate, fetchHealth, fetchProviders]);
  
  const handleRefresh = () => {
    setRefreshing(true);
    fetchHealth();
  };
  
  const toggleCategory = (category: string) => {
    const newExpanded = new Set(expandedCategories);
    if (newExpanded.has(category)) {
      newExpanded.delete(category);
    } else {
      newExpanded.add(category);
    }
    setExpandedCategories(newExpanded);
  };
  
  const testEndpoint = async (endpoint: ApiEndpoint, silent = false): Promise<TestResult> => {
    if (!silent) {
      setTesting(true);
      setTestResult(null);
    }
    
    const startTime = Date.now();
    
    try {
      const token = endpoint.auth ? await getClerkToken() : null;
      const headers: Record<string, string> = {
        'Content-Type': 'application/json',
      };
      if (token) {
        headers['Authorization'] = `Bearer ${token}`;
      }
      
      let url = `/api/v1${endpoint.path}`;
      url = url.replace(':id', 'test-id')
               .replace(':projectId', 'test-project-id')
               .replace(':conversationId', 'test-conv-id')
               .replace(':messageId', 'test-msg-id')
               .replace(':shareId', 'test-share-id')
               .replace(':userId', 'test-user-id')
               .replace(':factId', 'test-fact-id')
               .replace(':goalKey', 'test-goal')
               .replace(':exportId', 'test-export')
               .replace(':jobId', 'test-job')
               .replace(':provider', 'groq');
      
      const options: RequestInit = {
        method: endpoint.method,
        headers,
      };
      
      if (['POST', 'PUT', 'PATCH'].includes(endpoint.method)) {
        try {
          options.body = requestBody;
        } catch {
          options.body = '{}';
        }
      }
      
      const response = await fetch(url, options);
      const time = Date.now() - startTime;
      
      let data;
      const contentType = response.headers.get('content-type');
      if (contentType?.includes('application/json')) {
        data = await response.json();
      } else {
        data = await response.text();
      }
      
      const result: TestResult = {
        success: response.ok,
        status: response.status,
        time,
        data,
      };
      
      if (!silent) {
        setTestResult(result);
      }
      
      return result;
    } catch (error: unknown) {
      const time = Date.now() - startTime;
      const result: TestResult = {
        success: false,
        status: 0,
        time,
        error: error instanceof Error ? error.message : 'Unknown error',
      };
      
      if (!silent) {
        setTestResult(result);
      }
      
      return result;
    } finally {
      if (!silent) {
        setTesting(false);
      }
    }
  };
  
  const runBatchTest = async () => {
    setBatchTesting(true);
    const results = new Map<string, TestResult>();
    
    const testableEndpoints = API_ENDPOINTS.filter(ep => ep.testable);
    
    for (const endpoint of testableEndpoints) {
      const result = await testEndpoint(endpoint, true);
      results.set(endpoint.path, result);
      setBatchTestResults(new Map(results));
      await new Promise(r => setTimeout(r, 200)); // Small delay between tests
    }
    
    setBatchTesting(false);
  };
  
  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
  };
  
  const formatUptime = (seconds: number) => {
    const days = Math.floor(seconds / 86400);
    const hours = Math.floor((seconds % 86400) / 3600);
    const mins = Math.floor((seconds % 3600) / 60);
    if (days > 0) return `${days}d ${hours}h ${mins}m`;
    if (hours > 0) return `${hours}h ${mins}m`;
    return `${mins}m`;
  };
  
  const filteredEndpoints = API_ENDPOINTS.filter(ep =>
    ep.path.toLowerCase().includes(searchQuery.toLowerCase()) ||
    ep.description.toLowerCase().includes(searchQuery.toLowerCase()) ||
    ep.category.toLowerCase().includes(searchQuery.toLowerCase())
  );
  
  const groupedEndpoints = filteredEndpoints.reduce((acc, ep) => {
    if (!acc[ep.category]) acc[ep.category] = [];
    acc[ep.category].push(ep);
    return acc;
  }, {} as Record<string, ApiEndpoint[]>);
  
  const totalEndpoints = API_ENDPOINTS.length;
  const testableCount = API_ENDPOINTS.filter(ep => ep.testable).length;
  const passedTests = Array.from(batchTestResults.values()).filter(r => r.success).length;
  
  if (!isLoaded || loading) {
    return (
      <div className="min-h-screen bg-dark-900 flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-green-500" />
      </div>
    );
  }
  
  if (!isAdmin) {
    return null;
  }
  
  return (
    <div className="min-h-screen bg-dark-900 text-white overflow-y-auto">
      {/* Header */}
      <header className="bg-dark-800 border-b border-dark-700 sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-4 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-green-500/20 rounded-lg">
                <Shield className="w-6 h-6 text-green-500" />
              </div>
              <div>
                <h1 className="text-xl font-bold">Admin Panel</h1>
                <p className="text-sm text-dark-400">BaatCheet API Management • {totalEndpoints} Endpoints</p>
              </div>
            </div>
            
            <div className="flex items-center gap-4">
              <button
                onClick={handleRefresh}
                disabled={refreshing}
                className="flex items-center gap-2 px-3 py-2 bg-dark-700 hover:bg-dark-600 rounded-lg transition-colors"
              >
                <RefreshCw className={clsx('w-4 h-4', refreshing && 'animate-spin')} />
                Refresh
              </button>
              
              <div className={clsx(
                'px-3 py-1 rounded-full text-sm font-medium',
                health?.status === 'healthy' && 'bg-green-500/20 text-green-400',
                health?.status === 'degraded' && 'bg-yellow-500/20 text-yellow-400',
                health?.status === 'unhealthy' && 'bg-red-500/20 text-red-400',
              )}>
                {health?.status || 'Unknown'}
              </div>
            </div>
          </div>
          
          {/* Tabs */}
          <div className="flex gap-1 mt-4 overflow-x-auto">
            {[
              { id: 'dashboard', label: 'Dashboard', icon: <BarChart3 className="w-4 h-4" /> },
              { id: 'apis', label: 'API Explorer', icon: <Code className="w-4 h-4" /> },
              { id: 'providers', label: 'Providers', icon: <Zap className="w-4 h-4" /> },
              { id: 'testing', label: 'Batch Testing', icon: <Play className="w-4 h-4" /> },
              { id: 'logs', label: 'Logs & Debug', icon: <Terminal className="w-4 h-4" /> },
            ].map(tab => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id as typeof activeTab)}
                className={clsx(
                  'flex items-center gap-2 px-4 py-2 rounded-lg transition-colors whitespace-nowrap',
                  activeTab === tab.id
                    ? 'bg-green-500/20 text-green-400'
                    : 'text-dark-400 hover:text-white hover:bg-dark-700'
                )}
              >
                {tab.icon}
                {tab.label}
              </button>
            ))}
          </div>
        </div>
      </header>
      
      <main className="max-w-7xl mx-auto px-4 py-6">
        {/* Error Banner */}
        {error && (
          <div className="mb-6 p-4 bg-red-500/20 border border-red-500/30 rounded-xl flex items-center gap-3">
            <AlertTriangle className="w-5 h-5 text-red-500 flex-shrink-0" />
            <div className="flex-1">
              <p className="text-red-400 font-medium">{error}</p>
              <p className="text-red-400/70 text-sm">Try refreshing or check the HuggingFace Space logs.</p>
            </div>
            <button
              onClick={handleRefresh}
              className="px-3 py-1 bg-red-500/20 hover:bg-red-500/30 text-red-400 rounded-lg text-sm transition-colors"
            >
              Retry
            </button>
          </div>
        )}
        
        {/* Dashboard Tab */}
        {activeTab === 'dashboard' && (
          <div className="space-y-6 max-h-[calc(100vh-200px)] overflow-y-auto pb-8">
            {/* Stats Grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4">
              <StatCard
                title="API Status"
                value={health?.status || 'Unknown'}
                icon={<Activity className="w-5 h-5" />}
                color={health?.status === 'healthy' ? 'green' : health?.status === 'degraded' ? 'yellow' : 'red'}
              />
              <StatCard
                title="Uptime"
                value={health?.uptime ? formatUptime(health.uptime) : 'N/A'}
                icon={<Clock className="w-5 h-5" />}
                color="blue"
              />
              <StatCard
                title="Total API Keys"
                value={health?.providers?.reduce((sum, p) => sum + p.keys, 0) || 0}
                icon={<Key className="w-5 h-5" />}
                color="purple"
              />
              <StatCard
                title="Active Providers"
                value={`${health?.providers?.filter(p => p.status === 'available').length || 0}/${health?.providers?.length || 0}`}
                icon={<Zap className="w-5 h-5" />}
                color="green"
              />
              <StatCard
                title="API Endpoints"
                value={totalEndpoints}
                icon={<Code className="w-5 h-5" />}
                color="cyan"
              />
            </div>
            
            {/* Services Status */}
            <div className="bg-dark-800 rounded-xl p-6 border border-dark-700">
              <h2 className="text-lg font-semibold mb-4 flex items-center gap-2">
                <Server className="w-5 h-5 text-green-500" />
                Services Status
              </h2>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                {health?.services && Object.entries(health.services).map(([name, service]) => (
                  <div
                    key={name}
                    className={clsx(
                      'p-4 rounded-lg border',
                      service.status === 'healthy' && 'bg-green-500/10 border-green-500/30',
                      service.status === 'degraded' && 'bg-yellow-500/10 border-yellow-500/30',
                      service.status === 'unhealthy' && 'bg-red-500/10 border-red-500/30',
                    )}
                  >
                    <div className="flex items-center justify-between">
                      <span className="font-medium capitalize">{name}</span>
                      {service.status === 'healthy' && <CheckCircle className="w-5 h-5 text-green-500" />}
                      {service.status === 'degraded' && <AlertTriangle className="w-5 h-5 text-yellow-500" />}
                      {service.status === 'unhealthy' && <XCircle className="w-5 h-5 text-red-500" />}
                    </div>
                    {service.latency !== undefined && (
                      <p className="text-sm text-dark-400 mt-1">Latency: {service.latency}ms</p>
                    )}
                    {service.message && (
                      <p className="text-sm text-dark-400 mt-1">{service.message}</p>
                    )}
                  </div>
                ))}
              </div>
            </div>
            
            {/* Quick Actions */}
            <div className="bg-dark-800 rounded-xl p-6 border border-dark-700">
              <h2 className="text-lg font-semibold mb-4 flex items-center gap-2">
                <Settings className="w-5 h-5 text-green-500" />
                Quick Actions
              </h2>
              <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-4">
                <QuickActionButton
                  label="Test All APIs"
                  icon={<Play className="w-5 h-5" />}
                  onClick={() => { setActiveTab('testing'); runBatchTest(); }}
                />
                <QuickActionButton
                  label="API Explorer"
                  icon={<Code className="w-5 h-5" />}
                  onClick={() => setActiveTab('apis')}
                />
                <QuickActionButton
                  label="View Providers"
                  icon={<Zap className="w-5 h-5" />}
                  onClick={() => setActiveTab('providers')}
                />
                <QuickActionButton
                  label="TTS Debug"
                  icon={<Volume2 className="w-5 h-5" />}
                  onClick={() => window.open('/api/v1/tts/debug', '_blank')}
                />
                <QuickActionButton
                  label="Health Check"
                  icon={<Heart className="w-5 h-5" />}
                  onClick={() => window.open('/api/v1/health?detailed=true', '_blank')}
                />
                <QuickActionButton
                  label="System Metrics"
                  icon={<Cpu className="w-5 h-5" />}
                  onClick={() => window.open('/api/v1/health/metrics', '_blank')}
                />
              </div>
            </div>
            
            {/* API Categories Overview */}
            <div className="bg-dark-800 rounded-xl p-6 border border-dark-700">
              <h2 className="text-lg font-semibold mb-4 flex items-center gap-2">
                <Database className="w-5 h-5 text-green-500" />
                API Categories ({Object.keys(groupedEndpoints).length})
              </h2>
              <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3">
                {Object.entries(groupedEndpoints).map(([category, endpoints]) => (
                  <button
                    key={category}
                    onClick={() => {
                      setActiveTab('apis');
                      setExpandedCategories(new Set([category]));
                    }}
                    className="flex items-center gap-3 p-3 bg-dark-700 hover:bg-dark-600 rounded-lg transition-colors text-left"
                  >
                    <div className="p-2 bg-dark-600 rounded-lg">
                      {CATEGORY_ICONS[category] || <Code className="w-4 h-4" />}
                    </div>
                    <div>
                      <p className="font-medium text-sm">{category}</p>
                      <p className="text-xs text-dark-400">{endpoints.length} endpoints</p>
                    </div>
                  </button>
                ))}
              </div>
            </div>
          </div>
        )}
        
        {/* API Explorer Tab */}
        {activeTab === 'apis' && (
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 max-h-[calc(100vh-200px)] overflow-y-auto pb-8">
            {/* Endpoints List */}
            <div className="bg-dark-800 rounded-xl border border-dark-700 overflow-hidden">
              <div className="p-4 border-b border-dark-700">
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-dark-400" />
                  <input
                    type="text"
                    placeholder="Search APIs..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="w-full pl-10 pr-4 py-2 bg-dark-700 border border-dark-600 rounded-lg text-white placeholder-dark-400 focus:outline-none focus:border-green-500"
                  />
                </div>
                <p className="text-xs text-dark-400 mt-2">
                  {filteredEndpoints.length} of {totalEndpoints} endpoints
                </p>
              </div>
              
              <div className="max-h-[600px] overflow-y-auto">
                {Object.entries(groupedEndpoints).map(([category, endpoints]) => (
                  <div key={category} className="border-b border-dark-700 last:border-b-0">
                    <button
                      onClick={() => toggleCategory(category)}
                      className="w-full flex items-center justify-between p-3 hover:bg-dark-700 transition-colors"
                    >
                      <div className="flex items-center gap-2">
                        {CATEGORY_ICONS[category] || <Code className="w-4 h-4" />}
                        <span className="font-medium">{category}</span>
                        <span className="text-xs text-dark-400">({endpoints.length})</span>
                      </div>
                      {expandedCategories.has(category) ? (
                        <ChevronDown className="w-4 h-4 text-dark-400" />
                      ) : (
                        <ChevronRight className="w-4 h-4 text-dark-400" />
                      )}
                    </button>
                    
                    {expandedCategories.has(category) && (
                      <div className="pb-2">
                        {endpoints.map((endpoint, idx) => (
                          <button
                            key={idx}
                            onClick={() => {
                              setSelectedEndpoint(endpoint);
                              setTestResult(null);
                              if (endpoint.body) {
                                const defaultBody: Record<string, unknown> = {};
                                endpoint.body.forEach(b => {
                                  if (b.type === 'string') defaultBody[b.name] = b.name === 'message' ? 'Hello, test message' : '';
                                  else if (b.type === 'number') defaultBody[b.name] = 0;
                                  else if (b.type === 'boolean') defaultBody[b.name] = false;
                                });
                                setRequestBody(JSON.stringify(defaultBody, null, 2));
                              } else {
                                setRequestBody('{}');
                              }
                            }}
                            className={clsx(
                              'w-full flex items-center gap-3 px-4 py-2 text-left hover:bg-dark-700 transition-colors',
                              selectedEndpoint?.path === endpoint.path && 'bg-dark-700'
                            )}
                          >
                            <span className={clsx(
                              'px-2 py-0.5 text-xs font-mono rounded border',
                              METHOD_COLORS[endpoint.method]
                            )}>
                              {endpoint.method}
                            </span>
                            <div className="flex-1 min-w-0">
                              <p className="text-sm font-mono truncate">{endpoint.path}</p>
                              <p className="text-xs text-dark-400 truncate">{endpoint.description}</p>
                            </div>
                            <div className="flex items-center gap-1">
                              {endpoint.testable && (
                                <span className="text-xs text-blue-400">●</span>
                              )}
                              {!endpoint.auth && (
                                <span className="text-xs text-green-400">Public</span>
                              )}
                            </div>
                          </button>
                        ))}
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </div>
            
            {/* Endpoint Details & Testing */}
            <div className="bg-dark-800 rounded-xl border border-dark-700 overflow-hidden">
              {selectedEndpoint ? (
                <div className="p-4 space-y-4 max-h-[700px] overflow-y-auto">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <span className={clsx(
                        'px-3 py-1 text-sm font-mono rounded border',
                        METHOD_COLORS[selectedEndpoint.method]
                      )}>
                        {selectedEndpoint.method}
                      </span>
                    </div>
                    <button
                      onClick={() => copyToClipboard(`/api/v1${selectedEndpoint.path}`)}
                      className="p-2 hover:bg-dark-700 rounded-lg transition-colors"
                      title="Copy path"
                    >
                      <Copy className="w-4 h-4" />
                    </button>
                  </div>
                  
                  <code className="block text-sm bg-dark-900 p-2 rounded">/api/v1{selectedEndpoint.path}</code>
                  
                  <p className="text-dark-300">{selectedEndpoint.description}</p>
                  
                  <div className="flex items-center gap-2 text-sm flex-wrap">
                    <span className={clsx(
                      'px-2 py-0.5 rounded',
                      selectedEndpoint.auth ? 'bg-yellow-500/20 text-yellow-400' : 'bg-green-500/20 text-green-400'
                    )}>
                      {selectedEndpoint.auth ? '🔒 Requires Auth' : '🌐 Public'}
                    </span>
                    {selectedEndpoint.testable && (
                      <span className="px-2 py-0.5 rounded bg-blue-500/20 text-blue-400">
                        ✓ Auto-testable
                      </span>
                    )}
                  </div>
                  
                  {/* Parameters */}
                  {selectedEndpoint.params && selectedEndpoint.params.length > 0 && (
                    <div>
                      <h3 className="text-sm font-semibold mb-2">Query Parameters</h3>
                      <div className="bg-dark-700 rounded-lg p-3 space-y-2">
                        {selectedEndpoint.params.map((param, idx) => (
                          <div key={idx} className="text-sm">
                            <code className="text-green-400">{param.name}</code>
                            <span className="text-dark-400 ml-2">({param.type})</span>
                            {param.required && <span className="text-red-400 ml-1">*</span>}
                            <p className="text-dark-300 text-xs mt-0.5">{param.description}</p>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                  
                  {/* Request Body */}
                  {selectedEndpoint.body && selectedEndpoint.body.length > 0 && (
                    <div>
                      <h3 className="text-sm font-semibold mb-2">Request Body</h3>
                      <div className="bg-dark-700 rounded-lg p-3 space-y-2 mb-2">
                        {selectedEndpoint.body.map((field, idx) => (
                          <div key={idx} className="text-sm">
                            <code className="text-green-400">{field.name}</code>
                            <span className="text-dark-400 ml-2">({field.type})</span>
                            {field.required && <span className="text-red-400 ml-1">*</span>}
                            <p className="text-dark-300 text-xs mt-0.5">{field.description}</p>
                          </div>
                        ))}
                      </div>
                      <textarea
                        value={requestBody}
                        onChange={(e) => setRequestBody(e.target.value)}
                        className="w-full h-32 bg-dark-900 border border-dark-600 rounded-lg p-3 font-mono text-sm text-white focus:outline-none focus:border-green-500"
                        placeholder="Request body (JSON)"
                      />
                    </div>
                  )}
                  
                  {/* Test Button */}
                  <button
                    onClick={() => testEndpoint(selectedEndpoint)}
                    disabled={testing}
                    className="w-full flex items-center justify-center gap-2 px-4 py-3 bg-green-500 hover:bg-green-600 disabled:opacity-50 rounded-lg font-medium transition-colors"
                  >
                    {testing ? (
                      <Loader2 className="w-5 h-5 animate-spin" />
                    ) : (
                      <Play className="w-5 h-5" />
                    )}
                    {testing ? 'Testing...' : 'Test Endpoint'}
                  </button>
                  
                  {/* Test Result */}
                  {testResult && (
                    <div className={clsx(
                      'rounded-lg border p-4',
                      testResult.success
                        ? 'bg-green-500/10 border-green-500/30'
                        : 'bg-red-500/10 border-red-500/30'
                    )}>
                      <div className="flex items-center justify-between mb-2">
                        <div className="flex items-center gap-2">
                          {testResult.success ? (
                            <CheckCircle className="w-5 h-5 text-green-500" />
                          ) : (
                            <XCircle className="w-5 h-5 text-red-500" />
                          )}
                          <span className="font-medium">
                            Status: {testResult.status}
                          </span>
                        </div>
                        <span className="text-sm text-dark-400">
                          {testResult.time}ms
                        </span>
                      </div>
                      <pre className="bg-dark-900 rounded p-3 text-xs overflow-auto max-h-64">
                        {JSON.stringify(testResult.data || testResult.error, null, 2)}
                      </pre>
                    </div>
                  )}
                  
                  {/* cURL Example */}
                  <div>
                    <h3 className="text-sm font-semibold mb-2">cURL Example</h3>
                    <div className="bg-dark-900 rounded-lg p-3 relative">
                      <button
                        onClick={() => {
                          const curl = `curl -X ${selectedEndpoint.method} "https://sharry121-baatcheet.hf.space/api/v1${selectedEndpoint.path}"${selectedEndpoint.auth ? ' \\\n  -H "Authorization: Bearer YOUR_TOKEN"' : ''}${['POST', 'PUT', 'PATCH'].includes(selectedEndpoint.method) ? ` \\\n  -H "Content-Type: application/json" \\\n  -d '${requestBody}'` : ''}`;
                          copyToClipboard(curl);
                        }}
                        className="absolute top-2 right-2 p-1 hover:bg-dark-700 rounded"
                        title="Copy cURL"
                      >
                        <Copy className="w-4 h-4" />
                      </button>
                      <pre className="text-xs text-dark-300 overflow-x-auto">
{`curl -X ${selectedEndpoint.method} "https://sharry121-baatcheet.hf.space/api/v1${selectedEndpoint.path}"${selectedEndpoint.auth ? ' \\\n  -H "Authorization: Bearer YOUR_TOKEN"' : ''}${['POST', 'PUT', 'PATCH'].includes(selectedEndpoint.method) ? ` \\\n  -H "Content-Type: application/json" \\\n  -d '...'` : ''}`}
                      </pre>
                    </div>
                  </div>
                </div>
              ) : (
                <div className="flex flex-col items-center justify-center h-96 text-dark-400">
                  <Code className="w-12 h-12 mb-4" />
                  <p>Select an endpoint to test</p>
                  <p className="text-sm mt-2">Blue dot = Auto-testable</p>
                </div>
              )}
            </div>
          </div>
        )}
        
        {/* Providers Tab */}
        {activeTab === 'providers' && (
          <div className="space-y-6 max-h-[calc(100vh-200px)] overflow-y-auto pb-8">
            {/* Test All Providers Button */}
            <div className="flex justify-between items-center">
              <h2 className="text-lg font-semibold">API Provider Status & Key Testing</h2>
              <button
                onClick={testAllProviders}
                disabled={testingProvider !== null}
                className="flex items-center gap-2 px-4 py-2 bg-green-500/20 hover:bg-green-500/30 text-green-400 rounded-lg transition-colors disabled:opacity-50"
              >
                {testingProvider ? (
                  <Loader2 className="w-4 h-4 animate-spin" />
                ) : (
                  <Play className="w-4 h-4" />
                )}
                Test All Providers
              </button>
            </div>
            
            {/* Provider Cards */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {(providers?.providers || health?.providers || []).map((provider: any) => {
                const testResult = providerTestResults[provider.name];
                return (
                  <div
                    key={provider.name}
                    className={clsx(
                      'bg-dark-800 rounded-xl p-6 border',
                      provider.status === 'available' && 'border-green-500/30',
                      provider.status === 'limited' && 'border-yellow-500/30',
                      provider.status === 'unavailable' && 'border-red-500/30',
                    )}
                  >
                    <div className="flex items-center justify-between mb-4">
                      <h3 className="font-semibold capitalize text-lg">{provider.name}</h3>
                      <span className={clsx(
                        'px-2 py-1 text-xs rounded-full',
                        provider.status === 'available' && 'bg-green-500/20 text-green-400',
                        provider.status === 'limited' && 'bg-yellow-500/20 text-yellow-400',
                        provider.status === 'unavailable' && 'bg-red-500/20 text-red-400',
                      )}>
                        {provider.status}
                      </span>
                    </div>
                    
                    <div className="space-y-3">
                      <div className="flex justify-between text-sm">
                        <span className="text-dark-400">API Keys</span>
                        <span className="font-medium">{provider.available || provider.keys} / {provider.keys}</span>
                      </div>
                      <div className="flex justify-between text-sm">
                        <span className="text-dark-400">Daily Capacity</span>
                        <span className="font-medium">{(provider.dailyCapacity || 0).toLocaleString()}</span>
                      </div>
                      <div className="flex justify-between text-sm">
                        <span className="text-dark-400">Used Today</span>
                        <span className="font-medium">{(provider.used || 0).toLocaleString()}</span>
                      </div>
                      
                      <div className="mt-2">
                        <div className="h-2 bg-dark-700 rounded-full overflow-hidden">
                          <div
                            className={clsx(
                              'h-full rounded-full transition-all',
                              (provider.percentUsed || 0) < 50 && 'bg-green-500',
                              (provider.percentUsed || 0) >= 50 && (provider.percentUsed || 0) < 80 && 'bg-yellow-500',
                              (provider.percentUsed || 0) >= 80 && 'bg-red-500',
                            )}
                            style={{ width: `${Math.min(provider.percentUsed || 0, 100)}%` }}
                          />
                        </div>
                        <p className="text-xs text-dark-400 mt-1 text-right">
                          {provider.percentUsed || 0}% used
                        </p>
                      </div>
                      
                      {/* Test Button */}
                      <button
                        onClick={() => testProvider(provider.name)}
                        disabled={testingProvider === provider.name}
                        className="w-full mt-3 flex items-center justify-center gap-2 px-3 py-2 bg-dark-700 hover:bg-dark-600 rounded-lg transition-colors text-sm disabled:opacity-50"
                      >
                        {testingProvider === provider.name ? (
                          <Loader2 className="w-4 h-4 animate-spin" />
                        ) : (
                          <Zap className="w-4 h-4" />
                        )}
                        Test API Key
                      </button>
                      
                      {/* Test Result */}
                      {testResult && (
                        <div className={clsx(
                          'mt-2 p-3 rounded-lg text-sm',
                          testResult.success ? 'bg-green-500/10 text-green-400' : 'bg-red-500/10 text-red-400'
                        )}>
                          <div className="flex items-center gap-2">
                            {testResult.success ? (
                              <CheckCircle className="w-4 h-4" />
                            ) : (
                              <XCircle className="w-4 h-4" />
                            )}
                            <span className="font-medium">{testResult.success ? 'Valid' : 'Failed'}</span>
                          </div>
                          <p className="mt-1 text-xs opacity-80">
                            {testResult.message || testResult.error}
                          </p>
                          {testResult.latency && (
                            <p className="text-xs opacity-60 mt-1">{testResult.latency}ms</p>
                          )}
                        </div>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
            
            {/* Provider Summary */}
            <div className="bg-dark-800 rounded-xl p-6 border border-dark-700">
              <h2 className="text-lg font-semibold mb-4">Provider Summary</h2>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <div className="text-center">
                  <p className="text-3xl font-bold text-green-500">
                    {providers?.summary?.totalKeys || health?.providers?.reduce((sum: number, p: any) => sum + p.keys, 0) || 0}
                  </p>
                  <p className="text-sm text-dark-400">Total Keys</p>
                </div>
                <div className="text-center">
                  <p className="text-3xl font-bold text-blue-500">
                    {(providers?.summary?.totalCapacity || health?.providers?.reduce((sum: number, p: any) => sum + p.dailyCapacity, 0) || 0).toLocaleString()}
                  </p>
                  <p className="text-sm text-dark-400">Daily Capacity</p>
                </div>
                <div className="text-center">
                  <p className="text-3xl font-bold text-yellow-500">
                    {(providers?.summary?.totalUsed || health?.providers?.reduce((sum: number, p: any) => sum + p.used, 0) || 0).toLocaleString()}
                  </p>
                  <p className="text-sm text-dark-400">Used Today</p>
                </div>
                <div className="text-center">
                  <p className="text-3xl font-bold text-purple-500">
                    {providers?.summary?.activeProviders || health?.providers?.filter((p: any) => p.status === 'available').length || 0} / {providers?.summary?.totalProviders || health?.providers?.length || 0}
                  </p>
                  <p className="text-sm text-dark-400">Active Providers</p>
                </div>
              </div>
            </div>
            
            {/* Fallback Chain Info */}
            <div className="bg-dark-800 rounded-xl p-6 border border-dark-700">
              <h2 className="text-lg font-semibold mb-4">🔄 Fallback Chain</h2>
              <p className="text-sm text-dark-400 mb-4">
                When an API key fails or is exhausted, the system automatically tries the next available key.
                If all keys for a provider fail, it falls back to the next provider in the chain.
              </p>
              <div className="flex flex-wrap gap-2 items-center">
                {['Groq', 'OpenRouter', 'DeepSeek', 'Gemini'].map((name, i) => (
                  <div key={name} className="flex items-center gap-2">
                    <span className="px-3 py-1 bg-dark-700 rounded-lg text-sm">{name}</span>
                    {i < 3 && <span className="text-dark-500">→</span>}
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}
        
        {/* Batch Testing Tab */}
        {activeTab === 'testing' && (
          <div className="space-y-6 max-h-[calc(100vh-200px)] overflow-y-auto pb-8">
            <div className="bg-dark-800 rounded-xl p-6 border border-dark-700">
              <div className="flex items-center justify-between mb-6">
                <div>
                  <h2 className="text-lg font-semibold">Batch API Testing</h2>
                  <p className="text-sm text-dark-400">
                    Test all {testableCount} auto-testable endpoints at once
                  </p>
                </div>
                <button
                  onClick={runBatchTest}
                  disabled={batchTesting}
                  className="flex items-center gap-2 px-4 py-2 bg-green-500 hover:bg-green-600 disabled:opacity-50 rounded-lg font-medium transition-colors"
                >
                  {batchTesting ? (
                    <Loader2 className="w-5 h-5 animate-spin" />
                  ) : (
                    <Play className="w-5 h-5" />
                  )}
                  {batchTesting ? 'Testing...' : 'Run All Tests'}
                </button>
              </div>
              
              {batchTestResults.size > 0 && (
                <div className="mb-4 p-4 bg-dark-700 rounded-lg">
                  <div className="flex items-center gap-4">
                    <div className="flex items-center gap-2">
                      <CheckCircle className="w-5 h-5 text-green-500" />
                      <span>{passedTests} passed</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <XCircle className="w-5 h-5 text-red-500" />
                      <span>{batchTestResults.size - passedTests} failed</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <Clock className="w-5 h-5 text-dark-400" />
                      <span>{batchTestResults.size} / {testableCount} tested</span>
                    </div>
                  </div>
                </div>
              )}
              
              <div className="space-y-2 max-h-[500px] overflow-y-auto">
                {API_ENDPOINTS.filter(ep => ep.testable).map((endpoint) => {
                  const result = batchTestResults.get(endpoint.path);
                  return (
                    <div
                      key={endpoint.path}
                      className={clsx(
                        'flex items-center justify-between p-3 rounded-lg border',
                        !result && 'bg-dark-700 border-dark-600',
                        result?.success && 'bg-green-500/10 border-green-500/30',
                        result && !result.success && 'bg-red-500/10 border-red-500/30',
                      )}
                    >
                      <div className="flex items-center gap-3">
                        <span className={clsx(
                          'px-2 py-0.5 text-xs font-mono rounded border',
                          METHOD_COLORS[endpoint.method]
                        )}>
                          {endpoint.method}
                        </span>
                        <div>
                          <p className="text-sm font-mono">{endpoint.path}</p>
                          <p className="text-xs text-dark-400">{endpoint.description}</p>
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        {result ? (
                          <>
                            {result.success ? (
                              <CheckCircle className="w-5 h-5 text-green-500" />
                            ) : (
                              <XCircle className="w-5 h-5 text-red-500" />
                            )}
                            <span className="text-sm text-dark-400">{result.time}ms</span>
                          </>
                        ) : batchTesting ? (
                          <Loader2 className="w-5 h-5 animate-spin text-dark-400" />
                        ) : (
                          <span className="text-sm text-dark-400">Not tested</span>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
        )}
        
        {/* Logs Tab */}
        {activeTab === 'logs' && (
          <div className="space-y-6 max-h-[calc(100vh-200px)] overflow-y-auto pb-8">
            <div className="bg-dark-800 rounded-xl border border-dark-700 p-6">
              <h2 className="text-lg font-semibold flex items-center gap-2 mb-4">
                <Terminal className="w-5 h-5 text-green-500" />
                Debug Endpoints
              </h2>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {[
                  { path: '/health?detailed=true', label: 'Health Check (Detailed)', icon: <Activity className="w-5 h-5 text-green-500" /> },
                  { path: '/health/providers', label: 'Provider Status', icon: <Zap className="w-5 h-5 text-yellow-500" /> },
                  { path: '/health/metrics', label: 'System Metrics', icon: <Cpu className="w-5 h-5 text-purple-500" /> },
                  { path: '/health/email', label: 'Email Service', icon: <Mail className="w-5 h-5 text-orange-500" /> },
                  { path: '/health/queues', label: 'Queue Status', icon: <Database className="w-5 h-5 text-blue-500" /> },
                  { path: '/health/cache', label: 'Cache Status', icon: <Server className="w-5 h-5 text-cyan-500" /> },
                  { path: '/tts/debug', label: 'TTS Debug', icon: <Volume2 className="w-5 h-5 text-pink-500" /> },
                  { path: '/tts/health', label: 'TTS Health', icon: <Heart className="w-5 h-5 text-red-500" /> },
                  { path: '/chat/modes', label: 'Chat Modes', icon: <MessageSquare className="w-5 h-5 text-green-500" /> },
                ].map(item => (
                  <a
                    key={item.path}
                    href={`/api/v1${item.path}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex items-center justify-between p-4 bg-dark-700 rounded-lg hover:bg-dark-600 transition-colors"
                  >
                    <div className="flex items-center gap-3">
                      {item.icon}
                      <div>
                        <span className="font-medium">{item.label}</span>
                        <p className="text-xs text-dark-400 font-mono">{item.path}</p>
                      </div>
                    </div>
                    <ExternalLink className="w-4 h-4 text-dark-400" />
                  </a>
                ))}
              </div>
            </div>
            
            <div className="bg-dark-800 rounded-xl border border-dark-700 p-6">
              <h2 className="text-lg font-semibold flex items-center gap-2 mb-4">
                <ExternalLink className="w-5 h-5 text-green-500" />
                External Links
              </h2>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <a
                  href="https://huggingface.co/spaces/sharry121/baatcheet"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center justify-between p-4 bg-dark-700 rounded-lg hover:bg-dark-600 transition-colors"
                >
                  <div className="flex items-center gap-3">
                    <Server className="w-5 h-5 text-yellow-500" />
                    <div>
                      <span className="font-medium">HuggingFace Space</span>
                      <p className="text-xs text-dark-400">View logs & settings</p>
                    </div>
                  </div>
                  <ExternalLink className="w-4 h-4 text-dark-400" />
                </a>
                
                <a
                  href="https://app.netlify.com/projects/baatcheet-web"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center justify-between p-4 bg-dark-700 rounded-lg hover:bg-dark-600 transition-colors"
                >
                  <div className="flex items-center gap-3">
                    <Globe className="w-5 h-5 text-cyan-500" />
                    <div>
                      <span className="font-medium">Netlify Dashboard</span>
                      <p className="text-xs text-dark-400">Frontend deployments</p>
                    </div>
                  </div>
                  <ExternalLink className="w-4 h-4 text-dark-400" />
                </a>
                
                <a
                  href="https://dashboard.clerk.com"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center justify-between p-4 bg-dark-700 rounded-lg hover:bg-dark-600 transition-colors"
                >
                  <div className="flex items-center gap-3">
                    <Users className="w-5 h-5 text-purple-500" />
                    <div>
                      <span className="font-medium">Clerk Dashboard</span>
                      <p className="text-xs text-dark-400">User management</p>
                    </div>
                  </div>
                  <ExternalLink className="w-4 h-4 text-dark-400" />
                </a>
                
                <a
                  href="https://console.neon.tech"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center justify-between p-4 bg-dark-700 rounded-lg hover:bg-dark-600 transition-colors"
                >
                  <div className="flex items-center gap-3">
                    <Database className="w-5 h-5 text-green-500" />
                    <div>
                      <span className="font-medium">Neon Database</span>
                      <p className="text-xs text-dark-400">PostgreSQL console</p>
                    </div>
                  </div>
                  <ExternalLink className="w-4 h-4 text-dark-400" />
                </a>
              </div>
            </div>
          </div>
        )}
      </main>
    </div>
  );
}

// Helper Components
function StatCard({ title, value, icon, color }: { title: string; value: string | number; icon: React.ReactNode; color: string }) {
  const colorClasses: Record<string, string> = {
    green: 'bg-green-500/20 text-green-500',
    blue: 'bg-blue-500/20 text-blue-500',
    yellow: 'bg-yellow-500/20 text-yellow-500',
    red: 'bg-red-500/20 text-red-500',
    purple: 'bg-purple-500/20 text-purple-500',
    cyan: 'bg-cyan-500/20 text-cyan-500',
  };
  
  return (
    <div className="bg-dark-800 rounded-xl p-6 border border-dark-700">
      <div className="flex items-center justify-between mb-4">
        <span className="text-dark-400 text-sm">{title}</span>
        <div className={clsx('p-2 rounded-lg', colorClasses[color])}>
          {icon}
        </div>
      </div>
      <p className="text-2xl font-bold">{value}</p>
    </div>
  );
}

function QuickActionButton({ label, icon, onClick }: { label: string; icon: React.ReactNode; onClick: () => void }) {
  return (
    <button
      onClick={onClick}
      className="flex flex-col items-center gap-2 p-4 bg-dark-700 hover:bg-dark-600 rounded-lg transition-colors"
    >
      <div className="p-3 bg-dark-600 rounded-lg">
        {icon}
      </div>
      <span className="text-sm text-center">{label}</span>
    </button>
  );
}
