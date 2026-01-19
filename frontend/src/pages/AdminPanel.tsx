/**
 * Admin Panel - Comprehensive API Management Dashboard
 * 
 * Features:
 * - Real-time API status monitoring
 * - API key management and testing
 * - Swagger-like API documentation and testing
 * - System health monitoring
 * - User analytics
 */

import { useState, useEffect, useCallback } from 'react';
import { useUser } from '@clerk/clerk-react';
import { useNavigate } from 'react-router-dom';
import {
  Activity, Server, Key, Users, Database, Cpu,
  RefreshCw, Play, CheckCircle, XCircle, AlertTriangle, Clock,
  ChevronDown, ChevronRight, Copy, ExternalLink, Search,
  Zap, Image, MessageSquare, Globe, FileText, Volume2,
  Shield, Settings, BarChart3, Loader2, Terminal, Code,
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
}

interface TestResult {
  success: boolean;
  status: number;
  time: number;
  data?: unknown;
  error?: string;
}

// API Endpoints Documentation
const API_ENDPOINTS: ApiEndpoint[] = [
  // Health & Status
  { method: 'GET', path: '/health', description: 'Get system health status', category: 'System', auth: false },
  { method: 'GET', path: '/health?detailed=true', description: 'Get detailed health with providers', category: 'System', auth: false },
  { method: 'GET', path: '/health/providers', description: 'Get AI provider status', category: 'System', auth: false },
  { method: 'GET', path: '/health/ready', description: 'Readiness probe', category: 'System', auth: false },
  { method: 'GET', path: '/health/live', description: 'Liveness probe', category: 'System', auth: false },
  { method: 'GET', path: '/health/metrics', description: 'System metrics', category: 'System', auth: false },
  
  // Chat
  { method: 'POST', path: '/chat/completions', description: 'Send chat message', category: 'Chat', auth: true,
    body: [
      { name: 'message', type: 'string', required: true, description: 'User message' },
      { name: 'conversationId', type: 'string', required: false, description: 'Existing conversation ID' },
      { name: 'mode', type: 'string', required: false, description: 'Chat mode (chat, code, image-generation, etc.)' },
      { name: 'stream', type: 'boolean', required: false, description: 'Enable streaming response' },
    ]
  },
  { method: 'GET', path: '/chat/modes', description: 'Get available chat modes', category: 'Chat', auth: true },
  { method: 'GET', path: '/chat/usage', description: 'Get user usage statistics', category: 'Chat', auth: true },
  
  // Conversations
  { method: 'GET', path: '/conversations', description: 'List user conversations', category: 'Conversations', auth: true,
    params: [
      { name: 'limit', type: 'number', required: false, description: 'Max results (default: 20)' },
      { name: 'offset', type: 'number', required: false, description: 'Pagination offset' },
    ]
  },
  { method: 'GET', path: '/conversations/:id', description: 'Get conversation by ID', category: 'Conversations', auth: true },
  { method: 'DELETE', path: '/conversations/:id', description: 'Delete conversation', category: 'Conversations', auth: true },
  { method: 'POST', path: '/conversations/:id/share', description: 'Share conversation', category: 'Conversations', auth: true },
  
  // Projects
  { method: 'GET', path: '/projects', description: 'List user projects', category: 'Projects', auth: true },
  { method: 'POST', path: '/projects', description: 'Create new project', category: 'Projects', auth: true,
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
  { method: 'POST', path: '/projects/:id/invite', description: 'Invite user to project', category: 'Projects', auth: true },
  
  // Project Chat
  { method: 'GET', path: '/projects/:projectId/chat/messages', description: 'Get project chat messages', category: 'Project Chat', auth: true },
  { method: 'POST', path: '/projects/:projectId/chat/messages', description: 'Send project chat message', category: 'Project Chat', auth: true },
  { method: 'GET', path: '/projects/:projectId/chat/settings', description: 'Get chat settings', category: 'Project Chat', auth: true },
  { method: 'PUT', path: '/projects/:projectId/chat/settings', description: 'Update chat settings (admin)', category: 'Project Chat', auth: true },
  
  // Image Generation
  { method: 'POST', path: '/images/generate', description: 'Generate image from prompt', category: 'Images', auth: true,
    body: [
      { name: 'prompt', type: 'string', required: true, description: 'Image description' },
      { name: 'style', type: 'string', required: false, description: 'Art style preset' },
      { name: 'aspectRatio', type: 'string', required: false, description: 'Aspect ratio (1:1, 16:9, etc.)' },
    ]
  },
  { method: 'GET', path: '/images/styles', description: 'Get available image styles', category: 'Images', auth: true },
  { method: 'GET', path: '/images/status', description: 'Get image generation status', category: 'Images', auth: true },
  
  // TTS
  { method: 'GET', path: '/tts/health', description: 'TTS service health', category: 'TTS', auth: false },
  { method: 'GET', path: '/tts/debug', description: 'TTS debug info', category: 'TTS', auth: false },
  { method: 'POST', path: '/tts/generate', description: 'Generate speech from text', category: 'TTS', auth: true,
    body: [
      { name: 'text', type: 'string', required: true, description: 'Text to convert to speech' },
      { name: 'voice', type: 'string', required: false, description: 'Voice ID' },
    ]
  },
  { method: 'GET', path: '/tts/voices', description: 'Get available voices', category: 'TTS', auth: true },
  
  // Search
  { method: 'POST', path: '/search/web', description: 'Web search', category: 'Search', auth: true,
    body: [
      { name: 'query', type: 'string', required: true, description: 'Search query' },
      { name: 'limit', type: 'number', required: false, description: 'Max results' },
    ]
  },
  
  // Files
  { method: 'POST', path: '/files/upload', description: 'Upload file', category: 'Files', auth: true },
  { method: 'GET', path: '/files/upload-status', description: 'Get upload status', category: 'Files', auth: true },
  
  // Profile
  { method: 'GET', path: '/profile', description: 'Get user profile', category: 'Profile', auth: true },
  { method: 'PUT', path: '/profile', description: 'Update user profile', category: 'Profile', auth: true },
  { method: 'GET', path: '/profile/preferences', description: 'Get user preferences', category: 'Profile', auth: true },
  
  // Auth
  { method: 'POST', path: '/auth/mobile/login', description: 'Mobile login', category: 'Auth', auth: false,
    body: [
      { name: 'email', type: 'string', required: true, description: 'User email' },
      { name: 'password', type: 'string', required: true, description: 'User password' },
    ]
  },
  { method: 'POST', path: '/auth/mobile/register', description: 'Mobile registration', category: 'Auth', auth: false },
  { method: 'POST', path: '/auth/google', description: 'Google OAuth', category: 'Auth', auth: false },
];

const CATEGORY_ICONS: Record<string, React.ReactNode> = {
  System: <Server className="w-4 h-4" />,
  Chat: <MessageSquare className="w-4 h-4" />,
  Conversations: <MessageSquare className="w-4 h-4" />,
  Projects: <Database className="w-4 h-4" />,
  'Project Chat': <MessageSquare className="w-4 h-4" />,
  Images: <Image className="w-4 h-4" />,
  TTS: <Volume2 className="w-4 h-4" />,
  Search: <Globe className="w-4 h-4" />,
  Files: <FileText className="w-4 h-4" />,
  Profile: <Users className="w-4 h-4" />,
  Auth: <Shield className="w-4 h-4" />,
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
  
  const [activeTab, setActiveTab] = useState<'dashboard' | 'apis' | 'providers' | 'logs'>('dashboard');
  const [health, setHealth] = useState<SystemHealth | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [expandedCategories, setExpandedCategories] = useState<Set<string>>(new Set(['System']));
  const [selectedEndpoint, setSelectedEndpoint] = useState<ApiEndpoint | null>(null);
  const [testResult, setTestResult] = useState<TestResult | null>(null);
  const [testing, setTesting] = useState(false);
  const [requestBody, setRequestBody] = useState<string>('{}');
  
  // Admin emails (you can configure this)
  const ADMIN_EMAILS = ['muhammadsharjeelsaleem06@gmail.com', 'onseason10@gmail.com'];
  
  const isAdmin = user?.primaryEmailAddress?.emailAddress && 
    ADMIN_EMAILS.includes(user.primaryEmailAddress.emailAddress);
  
  const fetchHealth = useCallback(async () => {
    try {
      const response = await fetch('/api/v1/health?detailed=true');
      const data = await response.json();
      setHealth(data);
    } catch (error) {
      console.error('Failed to fetch health:', error);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);
  
  useEffect(() => {
    if (isLoaded && !isAdmin) {
      navigate('/app/chat');
      return;
    }
    fetchHealth();
    const interval = setInterval(fetchHealth, 30000); // Refresh every 30s
    return () => clearInterval(interval);
  }, [isLoaded, isAdmin, navigate, fetchHealth]);
  
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
  
  const testEndpoint = async (endpoint: ApiEndpoint) => {
    setTesting(true);
    setTestResult(null);
    
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
      // Replace path params with test values
      url = url.replace(':id', 'test-id')
               .replace(':projectId', 'test-project-id')
               .replace(':conversationId', 'test-conv-id');
      
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
      
      setTestResult({
        success: response.ok,
        status: response.status,
        time,
        data,
      });
    } catch (error: unknown) {
      const time = Date.now() - startTime;
      setTestResult({
        success: false,
        status: 0,
        time,
        error: error instanceof Error ? error.message : 'Unknown error',
      });
    } finally {
      setTesting(false);
    }
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
    <div className="min-h-screen bg-dark-900 text-white">
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
                <p className="text-sm text-dark-400">BaatCheet API Management</p>
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
          <div className="flex gap-1 mt-4">
            {[
              { id: 'dashboard', label: 'Dashboard', icon: <BarChart3 className="w-4 h-4" /> },
              { id: 'apis', label: 'API Explorer', icon: <Code className="w-4 h-4" /> },
              { id: 'providers', label: 'Providers', icon: <Zap className="w-4 h-4" /> },
              { id: 'logs', label: 'Logs', icon: <Terminal className="w-4 h-4" /> },
            ].map(tab => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id as typeof activeTab)}
                className={clsx(
                  'flex items-center gap-2 px-4 py-2 rounded-lg transition-colors',
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
        {/* Dashboard Tab */}
        {activeTab === 'dashboard' && (
          <div className="space-y-6">
            {/* Stats Grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
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
                value={health?.providers?.filter(p => p.status === 'available').length || 0}
                icon={<Zap className="w-5 h-5" />}
                color="green"
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
                    {service.latency && (
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
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <QuickActionButton
                  label="Test Chat API"
                  icon={<MessageSquare className="w-5 h-5" />}
                  onClick={() => {
                    setActiveTab('apis');
                    setSelectedEndpoint(API_ENDPOINTS.find(e => e.path === '/chat/completions') || null);
                  }}
                />
                <QuickActionButton
                  label="Test Image Gen"
                  icon={<Image className="w-5 h-5" />}
                  onClick={() => {
                    setActiveTab('apis');
                    setSelectedEndpoint(API_ENDPOINTS.find(e => e.path === '/images/generate') || null);
                  }}
                />
                <QuickActionButton
                  label="Test TTS"
                  icon={<Volume2 className="w-5 h-5" />}
                  onClick={() => window.open('/api/v1/tts/debug', '_blank')}
                />
                <QuickActionButton
                  label="View Providers"
                  icon={<Zap className="w-5 h-5" />}
                  onClick={() => setActiveTab('providers')}
                />
              </div>
            </div>
          </div>
        )}
        
        {/* API Explorer Tab */}
        {activeTab === 'apis' && (
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
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
              </div>
              
              <div className="max-h-[600px] overflow-y-auto">
                {Object.entries(groupedEndpoints).map(([category, endpoints]) => (
                  <div key={category} className="border-b border-dark-700 last:border-b-0">
                    <button
                      onClick={() => toggleCategory(category)}
                      className="w-full flex items-center justify-between p-3 hover:bg-dark-700 transition-colors"
                    >
                      <div className="flex items-center gap-2">
                        {CATEGORY_ICONS[category]}
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
                              // Set default request body
                              if (endpoint.body) {
                                const defaultBody: Record<string, unknown> = {};
                                endpoint.body.forEach(b => {
                                  if (b.type === 'string') defaultBody[b.name] = '';
                                  else if (b.type === 'number') defaultBody[b.name] = 0;
                                  else if (b.type === 'boolean') defaultBody[b.name] = false;
                                });
                                setRequestBody(JSON.stringify(defaultBody, null, 2));
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
                            {!endpoint.auth && (
                              <span className="text-xs text-green-400">Public</span>
                            )}
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
                <div className="p-4 space-y-4">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <span className={clsx(
                        'px-3 py-1 text-sm font-mono rounded border',
                        METHOD_COLORS[selectedEndpoint.method]
                      )}>
                        {selectedEndpoint.method}
                      </span>
                      <code className="text-sm">/api/v1{selectedEndpoint.path}</code>
                    </div>
                    <button
                      onClick={() => copyToClipboard(`/api/v1${selectedEndpoint.path}`)}
                      className="p-2 hover:bg-dark-700 rounded-lg transition-colors"
                    >
                      <Copy className="w-4 h-4" />
                    </button>
                  </div>
                  
                  <p className="text-dark-300">{selectedEndpoint.description}</p>
                  
                  <div className="flex items-center gap-2 text-sm">
                    <span className={clsx(
                      'px-2 py-0.5 rounded',
                      selectedEndpoint.auth ? 'bg-yellow-500/20 text-yellow-400' : 'bg-green-500/20 text-green-400'
                    )}>
                      {selectedEndpoint.auth ? 'Requires Auth' : 'Public'}
                    </span>
                  </div>
                  
                  {/* Parameters */}
                  {selectedEndpoint.params && selectedEndpoint.params.length > 0 && (
                    <div>
                      <h3 className="text-sm font-semibold mb-2">Query Parameters</h3>
                      <div className="bg-dark-700 rounded-lg p-3 space-y-2">
                        {selectedEndpoint.params.map((param, idx) => (
                          <div key={idx} className="flex items-start gap-2 text-sm">
                            <code className="text-green-400">{param.name}</code>
                            <span className="text-dark-400">({param.type})</span>
                            {param.required && <span className="text-red-400">*</span>}
                            <span className="text-dark-300">- {param.description}</span>
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
                          <div key={idx} className="flex items-start gap-2 text-sm">
                            <code className="text-green-400">{field.name}</code>
                            <span className="text-dark-400">({field.type})</span>
                            {field.required && <span className="text-red-400">*</span>}
                            <span className="text-dark-300">- {field.description}</span>
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
                </div>
              ) : (
                <div className="flex flex-col items-center justify-center h-96 text-dark-400">
                  <Code className="w-12 h-12 mb-4" />
                  <p>Select an endpoint to test</p>
                </div>
              )}
            </div>
          </div>
        )}
        
        {/* Providers Tab */}
        {activeTab === 'providers' && (
          <div className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {health?.providers?.map((provider) => (
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
                    <h3 className="font-semibold capitalize">{provider.name}</h3>
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
                      <span>{provider.available} / {provider.keys}</span>
                    </div>
                    <div className="flex justify-between text-sm">
                      <span className="text-dark-400">Daily Capacity</span>
                      <span>{provider.dailyCapacity.toLocaleString()}</span>
                    </div>
                    <div className="flex justify-between text-sm">
                      <span className="text-dark-400">Used Today</span>
                      <span>{provider.used.toLocaleString()}</span>
                    </div>
                    
                    {/* Usage Bar */}
                    <div className="mt-2">
                      <div className="h-2 bg-dark-700 rounded-full overflow-hidden">
                        <div
                          className={clsx(
                            'h-full rounded-full transition-all',
                            provider.percentUsed < 50 && 'bg-green-500',
                            provider.percentUsed >= 50 && provider.percentUsed < 80 && 'bg-yellow-500',
                            provider.percentUsed >= 80 && 'bg-red-500',
                          )}
                          style={{ width: `${Math.min(provider.percentUsed, 100)}%` }}
                        />
                      </div>
                      <p className="text-xs text-dark-400 mt-1 text-right">
                        {provider.percentUsed}% used
                      </p>
                    </div>
                  </div>
                </div>
              ))}
            </div>
            
            {/* Provider Summary */}
            <div className="bg-dark-800 rounded-xl p-6 border border-dark-700">
              <h2 className="text-lg font-semibold mb-4">Provider Summary</h2>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <div className="text-center">
                  <p className="text-3xl font-bold text-green-500">
                    {health?.providers?.reduce((sum, p) => sum + p.keys, 0) || 0}
                  </p>
                  <p className="text-sm text-dark-400">Total Keys</p>
                </div>
                <div className="text-center">
                  <p className="text-3xl font-bold text-blue-500">
                    {health?.providers?.reduce((sum, p) => sum + p.dailyCapacity, 0)?.toLocaleString() || 0}
                  </p>
                  <p className="text-sm text-dark-400">Daily Capacity</p>
                </div>
                <div className="text-center">
                  <p className="text-3xl font-bold text-yellow-500">
                    {health?.providers?.reduce((sum, p) => sum + p.used, 0)?.toLocaleString() || 0}
                  </p>
                  <p className="text-sm text-dark-400">Used Today</p>
                </div>
                <div className="text-center">
                  <p className="text-3xl font-bold text-purple-500">
                    {health?.providers?.filter(p => p.status === 'available').length || 0} / {health?.providers?.length || 0}
                  </p>
                  <p className="text-sm text-dark-400">Active Providers</p>
                </div>
              </div>
            </div>
          </div>
        )}
        
        {/* Logs Tab */}
        {activeTab === 'logs' && (
          <div className="bg-dark-800 rounded-xl border border-dark-700 p-6">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-lg font-semibold flex items-center gap-2">
                <Terminal className="w-5 h-5 text-green-500" />
                System Logs
              </h2>
              <button
                onClick={() => window.open('/api/v1/health/metrics', '_blank')}
                className="flex items-center gap-2 px-3 py-2 bg-dark-700 hover:bg-dark-600 rounded-lg transition-colors text-sm"
              >
                <ExternalLink className="w-4 h-4" />
                View Metrics
              </button>
            </div>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
              <a
                href="/api/v1/health?detailed=true"
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center justify-between p-4 bg-dark-700 rounded-lg hover:bg-dark-600 transition-colors"
              >
                <div className="flex items-center gap-3">
                  <Activity className="w-5 h-5 text-green-500" />
                  <span>Health Check (Detailed)</span>
                </div>
                <ExternalLink className="w-4 h-4 text-dark-400" />
              </a>
              
              <a
                href="/api/v1/health/providers"
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center justify-between p-4 bg-dark-700 rounded-lg hover:bg-dark-600 transition-colors"
              >
                <div className="flex items-center gap-3">
                  <Zap className="w-5 h-5 text-yellow-500" />
                  <span>Provider Status</span>
                </div>
                <ExternalLink className="w-4 h-4 text-dark-400" />
              </a>
              
              <a
                href="/api/v1/tts/debug"
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center justify-between p-4 bg-dark-700 rounded-lg hover:bg-dark-600 transition-colors"
              >
                <div className="flex items-center gap-3">
                  <Volume2 className="w-5 h-5 text-blue-500" />
                  <span>TTS Debug</span>
                </div>
                <ExternalLink className="w-4 h-4 text-dark-400" />
              </a>
              
              <a
                href="/api/v1/health/metrics"
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center justify-between p-4 bg-dark-700 rounded-lg hover:bg-dark-600 transition-colors"
              >
                <div className="flex items-center gap-3">
                  <Cpu className="w-5 h-5 text-purple-500" />
                  <span>System Metrics</span>
                </div>
                <ExternalLink className="w-4 h-4 text-dark-400" />
              </a>
            </div>
            
            <div className="bg-dark-900 rounded-lg p-4">
              <p className="text-dark-400 text-center">
                For detailed logs, check the HuggingFace Space logs at:{' '}
                <a
                  href="https://huggingface.co/spaces/sharry121/baatcheet"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-green-400 hover:underline"
                >
                  huggingface.co/spaces/sharry121/baatcheet
                </a>
              </p>
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
      <span className="text-sm">{label}</span>
    </button>
  );
}
