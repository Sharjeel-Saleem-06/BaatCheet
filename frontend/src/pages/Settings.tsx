/**
 * Settings Page
 * API keys, webhooks, and preferences
 */

import { useState, useEffect } from 'react';
import {
  Key,
  Webhook,
  Copy,
  Trash2,
  Plus,
  RefreshCw,
  Check,
  X,
  Eye,
  EyeOff,
  Loader2,
  AlertCircle,
} from 'lucide-react';
import { apiKeys, webhooks } from '../services/api';
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

export default function Settings() {
  const [activeTab, setActiveTab] = useState<'apikeys' | 'webhooks'>('apikeys');
  const [apiKeyList, setApiKeyList] = useState<ApiKey[]>([]);
  const [webhookList, setWebhookList] = useState<WebhookData[]>([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [newApiKey, setNewApiKey] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);

  // API Key form
  const [keyName, setKeyName] = useState('');

  // Webhook form
  const [webhookUrl, setWebhookUrl] = useState('');
  const [webhookEvents, setWebhookEvents] = useState<string[]>([]);
  const [availableEvents, setAvailableEvents] = useState<{ event: string; description: string }[]>([]);

  useEffect(() => {
    loadData();
  }, [activeTab]);

  const loadData = async () => {
    setLoading(true);
    try {
      if (activeTab === 'apikeys') {
        const { data } = await apiKeys.list();
        setApiKeyList(data.data || []);
      } else {
        const [webhooksRes, eventsRes] = await Promise.all([
          webhooks.list(),
          webhooks.getEvents(),
        ]);
        setWebhookList(webhooksRes.data.data || []);
        setAvailableEvents(eventsRes.data.data || []);
      }
    } catch (error) {
      console.error('Failed to load data:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleCreateApiKey = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const { data } = await apiKeys.create(keyName);
      setNewApiKey(data.data.key);
      setKeyName('');
      loadData();
    } catch (error) {
      console.error('Failed to create API key:', error);
    }
  };

  const handleDeleteApiKey = async (id: string) => {
    if (!confirm('Revoke this API key? This cannot be undone.')) return;
    try {
      await apiKeys.delete(id);
      loadData();
    } catch (error) {
      console.error('Failed to delete API key:', error);
    }
  };

  const handleRotateApiKey = async (id: string) => {
    if (!confirm('Rotate this API key? The old key will stop working immediately.')) return;
    try {
      const { data } = await apiKeys.rotate(id);
      setNewApiKey(data.data.newKey);
      loadData();
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
      loadData();
    } catch (error) {
      console.error('Failed to create webhook:', error);
    }
  };

  const handleDeleteWebhook = async (id: string) => {
    if (!confirm('Delete this webhook?')) return;
    try {
      await webhooks.delete(id);
      loadData();
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

  return (
    <div className="h-full overflow-y-auto p-6">
      <div className="max-w-4xl mx-auto">
        <h1 className="text-2xl font-semibold text-dark-100 mb-6">Settings</h1>

        {/* Tabs */}
        <div className="flex gap-1 mb-6 bg-dark-800 rounded-lg p-1 w-fit">
          <button
            onClick={() => setActiveTab('apikeys')}
            className={clsx(
              'flex items-center gap-2 px-4 py-2 rounded-md text-sm font-medium transition-colors',
              activeTab === 'apikeys'
                ? 'bg-primary-500 text-white'
                : 'text-dark-400 hover:text-dark-200'
            )}
          >
            <Key size={18} />
            <span>API Keys</span>
          </button>
          <button
            onClick={() => setActiveTab('webhooks')}
            className={clsx(
              'flex items-center gap-2 px-4 py-2 rounded-md text-sm font-medium transition-colors',
              activeTab === 'webhooks'
                ? 'bg-primary-500 text-white'
                : 'text-dark-400 hover:text-dark-200'
            )}
          >
            <Webhook size={18} />
            <span>Webhooks</span>
          </button>
        </div>

        {loading ? (
          <div className="flex items-center justify-center py-12">
            <Loader2 className="animate-spin text-primary-400" size={32} />
          </div>
        ) : activeTab === 'apikeys' ? (
          <div className="space-y-6">
            {/* New API Key Alert */}
            {newApiKey && (
              <div className="p-4 bg-primary-500/10 border border-primary-500/20 rounded-xl">
                <div className="flex items-start gap-3">
                  <AlertCircle className="text-primary-400 flex-shrink-0 mt-0.5" size={20} />
                  <div className="flex-1">
                    <p className="text-primary-400 font-medium mb-2">
                      Save your API key now - it won't be shown again!
                    </p>
                    <div className="flex items-center gap-2 bg-dark-800 rounded-lg p-2">
                      <code className="flex-1 text-sm text-dark-200 font-mono break-all">
                        {newApiKey}
                      </code>
                      <button
                        onClick={() => copyToClipboard(newApiKey)}
                        className="p-2 hover:bg-dark-700 rounded-lg transition-colors"
                      >
                        {copied ? (
                          <Check className="text-primary-400" size={18} />
                        ) : (
                          <Copy className="text-dark-400" size={18} />
                        )}
                      </button>
                    </div>
                  </div>
                  <button
                    onClick={() => setNewApiKey(null)}
                    className="text-dark-500 hover:text-dark-300"
                  >
                    <X size={20} />
                  </button>
                </div>
              </div>
            )}

            {/* Create API Key */}
            <div className="bg-dark-800 rounded-xl border border-dark-700 p-6">
              <h2 className="text-lg font-medium text-dark-100 mb-4">
                Create API Key
              </h2>
              <form onSubmit={handleCreateApiKey} className="flex gap-3">
                <input
                  type="text"
                  value={keyName}
                  onChange={(e) => setKeyName(e.target.value)}
                  placeholder="Key name (e.g., My App)"
                  required
                  className="flex-1 px-4 py-2.5 bg-dark-700 border border-dark-600 rounded-lg text-dark-100 focus:outline-none focus:border-primary-500"
                />
                <button
                  type="submit"
                  className="flex items-center gap-2 px-4 py-2.5 bg-primary-500 hover:bg-primary-600 text-white rounded-lg transition-colors"
                >
                  <Plus size={18} />
                  <span>Create</span>
                </button>
              </form>
            </div>

            {/* API Keys List */}
            <div className="bg-dark-800 rounded-xl border border-dark-700">
              <div className="p-4 border-b border-dark-700">
                <h2 className="text-lg font-medium text-dark-100">
                  Your API Keys
                </h2>
              </div>
              <div className="divide-y divide-dark-700">
                {apiKeyList.map((key) => (
                  <div key={key.id} className="p-4 flex items-center gap-4">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <span className="font-medium text-dark-200">
                          {key.name}
                        </span>
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
                      <div className="flex items-center gap-3 mt-1 text-sm text-dark-500">
                        <code className="font-mono">{key.keyPrefix}...</code>
                        <span>•</span>
                        <span>{key.usageCount} requests</span>
                        <span>•</span>
                        <span>{key.rateLimit}/hour limit</span>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <button
                        onClick={() => handleRotateApiKey(key.id)}
                        className="p-2 text-dark-500 hover:text-dark-300 transition-colors"
                        title="Rotate key"
                      >
                        <RefreshCw size={18} />
                      </button>
                      <button
                        onClick={() => handleDeleteApiKey(key.id)}
                        className="p-2 text-dark-500 hover:text-red-400 transition-colors"
                        title="Revoke key"
                      >
                        <Trash2 size={18} />
                      </button>
                    </div>
                  </div>
                ))}
                {apiKeyList.length === 0 && (
                  <div className="p-8 text-center text-dark-500">
                    No API keys yet
                  </div>
                )}
              </div>
            </div>
          </div>
        ) : (
          <div className="space-y-6">
            {/* Create Webhook Button */}
            <button
              onClick={() => setShowModal(true)}
              className="flex items-center gap-2 px-4 py-2.5 bg-primary-500 hover:bg-primary-600 text-white rounded-lg transition-colors"
            >
              <Plus size={18} />
              <span>Create Webhook</span>
            </button>

            {/* Webhooks List */}
            <div className="bg-dark-800 rounded-xl border border-dark-700">
              <div className="p-4 border-b border-dark-700">
                <h2 className="text-lg font-medium text-dark-100">
                  Your Webhooks
                </h2>
              </div>
              <div className="divide-y divide-dark-700">
                {webhookList.map((webhook) => (
                  <div key={webhook.id} className="p-4">
                    <div className="flex items-start justify-between gap-4">
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2">
                          <code className="text-sm text-dark-200 font-mono truncate">
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
                              className="px-2 py-0.5 text-xs bg-dark-700 text-dark-400 rounded"
                            >
                              {event}
                            </span>
                          ))}
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        <button
                          onClick={() => handleTestWebhook(webhook.id)}
                          className="px-3 py-1.5 text-sm bg-dark-700 hover:bg-dark-600 text-dark-200 rounded-lg transition-colors"
                        >
                          Test
                        </button>
                        <button
                          onClick={() => handleDeleteWebhook(webhook.id)}
                          className="p-2 text-dark-500 hover:text-red-400 transition-colors"
                        >
                          <Trash2 size={18} />
                        </button>
                      </div>
                    </div>
                  </div>
                ))}
                {webhookList.length === 0 && (
                  <div className="p-8 text-center text-dark-500">
                    No webhooks yet
                  </div>
                )}
              </div>
            </div>
          </div>
        )}

        {/* Create Webhook Modal */}
        {showModal && (
          <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
            <div className="bg-dark-800 rounded-2xl border border-dark-700 w-full max-w-md">
              <div className="flex items-center justify-between p-4 border-b border-dark-700">
                <h2 className="text-lg font-semibold text-dark-100">
                  Create Webhook
                </h2>
                <button
                  onClick={() => setShowModal(false)}
                  className="text-dark-500 hover:text-dark-300"
                >
                  <X size={20} />
                </button>
              </div>

              <form onSubmit={handleCreateWebhook} className="p-4 space-y-4">
                <div>
                  <label className="block text-sm font-medium text-dark-300 mb-1.5">
                    URL
                  </label>
                  <input
                    type="url"
                    value={webhookUrl}
                    onChange={(e) => setWebhookUrl(e.target.value)}
                    placeholder="https://example.com/webhook"
                    required
                    className="w-full px-4 py-2.5 bg-dark-700 border border-dark-600 rounded-lg text-dark-100 focus:outline-none focus:border-primary-500"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-dark-300 mb-1.5">
                    Events
                  </label>
                  <div className="space-y-2 max-h-48 overflow-y-auto">
                    {availableEvents.map(({ event, description }) => (
                      <label
                        key={event}
                        className="flex items-start gap-3 p-2 rounded-lg hover:bg-dark-700 cursor-pointer"
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
                          <p className="text-sm text-dark-200">{event}</p>
                          <p className="text-xs text-dark-500">{description}</p>
                        </div>
                      </label>
                    ))}
                  </div>
                </div>

                <div className="flex gap-3 pt-2">
                  <button
                    type="button"
                    onClick={() => setShowModal(false)}
                    className="flex-1 px-4 py-2.5 bg-dark-700 hover:bg-dark-600 text-dark-200 rounded-lg transition-colors"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={webhookEvents.length === 0}
                    className="flex-1 px-4 py-2.5 bg-primary-500 hover:bg-primary-600 disabled:bg-dark-700 disabled:text-dark-500 text-white rounded-lg transition-colors"
                  >
                    Create
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
