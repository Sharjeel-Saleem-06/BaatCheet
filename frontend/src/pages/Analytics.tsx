/**
 * Analytics Page
 * Usage statistics and insights
 */

import { useState, useEffect } from 'react';
import {
  MessageSquare,
  Zap,
  FolderOpen,
  Image,
  Mic,
  TrendingUp,
  TrendingDown,
  Download,
  Loader2,
} from 'lucide-react';
import { analytics } from '../services/api';
import clsx from 'clsx';

interface DashboardStats {
  totalConversations: number;
  totalMessages: number;
  totalTokens: number;
  totalProjects: number;
  totalImages: number;
  totalAudioMinutes: number;
  averageResponseTime: number;
  topModels: string[];
  topTags: string[];
}

interface UsageData {
  date: string;
  messages: number;
  tokens: number;
  conversations: number;
}

interface Insight {
  type: string;
  message: string;
  icon: string;
}

export default function Analytics() {
  const [dashboard, setDashboard] = useState<DashboardStats | null>(null);
  const [usage, setUsage] = useState<UsageData[]>([]);
  const [insights, setInsights] = useState<Insight[]>([]);
  const [period, setPeriod] = useState('7d');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadData();
  }, [period]);

  const loadData = async () => {
    setLoading(true);
    try {
      const [dashboardRes, usageRes, insightsRes] = await Promise.all([
        analytics.getDashboard().catch(() => ({ data: { data: null } })),
        analytics.getUsage(period).catch(() => ({ data: { data: { usage: [] } } })),
        analytics.getInsights().catch(() => ({ data: { data: { insights: [] } } })),
      ]);

      setDashboard(dashboardRes?.data?.data || null);
      const usageData = usageRes?.data?.data?.usage || usageRes?.data?.data || [];
      setUsage(Array.isArray(usageData) ? usageData : []);
      const insightsData = insightsRes?.data?.data?.insights || insightsRes?.data?.data || [];
      setInsights(Array.isArray(insightsData) ? insightsData : []);
    } catch (error) {
      console.error('Failed to load analytics:', error);
      setDashboard(null);
      setUsage([]);
      setInsights([]);
    } finally {
      setLoading(false);
    }
  };

  const handleExport = async (format: 'json' | 'csv') => {
    try {
      const { data } = await analytics.export(format);
      const blob = new Blob([data], { type: format === 'json' ? 'application/json' : 'text/csv' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `analytics-${new Date().toISOString().split('T')[0]}.${format}`;
      a.click();
      URL.revokeObjectURL(url);
    } catch (error) {
      console.error('Export failed:', error);
    }
  };

  const maxMessages = Math.max(...usage.map((d) => d.messages), 1);

  if (loading) {
    return (
      <div className="flex items-center justify-center h-full">
        <Loader2 className="animate-spin text-primary-400" size={32} />
      </div>
    );
  }

  return (
    <div className="h-full overflow-y-auto p-6">
      <div className="max-w-6xl mx-auto">
        {/* Header */}
        <div className="flex items-center justify-between mb-6">
          <div>
            <h1 className="text-2xl font-semibold text-dark-100">Analytics</h1>
            <p className="text-dark-400">Your usage statistics and insights</p>
          </div>
          <div className="flex items-center gap-2">
            <select
              value={period}
              onChange={(e) => setPeriod(e.target.value)}
              className="px-3 py-2 bg-dark-700 border border-dark-600 rounded-lg text-dark-200 focus:outline-none focus:border-primary-500"
            >
              <option value="7d">Last 7 days</option>
              <option value="14d">Last 14 days</option>
              <option value="30d">Last 30 days</option>
            </select>
            <button
              onClick={() => handleExport('csv')}
              className="flex items-center gap-2 px-3 py-2 bg-dark-700 hover:bg-dark-600 text-dark-200 rounded-lg transition-colors"
            >
              <Download size={18} />
              <span>Export</span>
            </button>
          </div>
        </div>

        {/* Stats Grid */}
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4 mb-6">
          <StatCard
            icon={MessageSquare}
            label="Messages"
            value={dashboard?.totalMessages || 0}
            color="primary"
          />
          <StatCard
            icon={Zap}
            label="Tokens"
            value={formatNumber(dashboard?.totalTokens || 0)}
            color="yellow"
          />
          <StatCard
            icon={FolderOpen}
            label="Conversations"
            value={dashboard?.totalConversations || 0}
            color="blue"
          />
          <StatCard
            icon={FolderOpen}
            label="Projects"
            value={dashboard?.totalProjects || 0}
            color="purple"
          />
          <StatCard
            icon={Image}
            label="Images"
            value={dashboard?.totalImages || 0}
            color="pink"
          />
          <StatCard
            icon={Mic}
            label="Audio (min)"
            value={dashboard?.totalAudioMinutes || 0}
            color="cyan"
          />
        </div>

        {/* Insights */}
        {insights.length > 0 && (
          <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
            {insights.map((insight, i) => (
              <div
                key={i}
                className="p-4 bg-dark-800 rounded-xl border border-dark-700"
              >
                <div className="flex items-center gap-2 mb-2">
                  <span className="text-2xl">{insight.icon}</span>
                  {insight.type === 'growth' && (
                    <TrendingUp className="text-green-400" size={16} />
                  )}
                  {insight.type === 'decline' && (
                    <TrendingDown className="text-red-400" size={16} />
                  )}
                </div>
                <p className="text-sm text-dark-300">{insight.message}</p>
              </div>
            ))}
          </div>
        )}

        {/* Usage Chart */}
        <div className="bg-dark-800 rounded-xl border border-dark-700 p-6 mb-6">
          <h2 className="text-lg font-medium text-dark-100 mb-4">
            Messages Over Time
          </h2>
          <div className="h-48 flex items-end gap-1">
            {usage.map((day, i) => (
              <div
                key={i}
                className="flex-1 flex flex-col items-center gap-1"
              >
                <div
                  className="w-full bg-primary-500/20 hover:bg-primary-500/40 rounded-t transition-colors"
                  style={{
                    height: `${(day.messages / maxMessages) * 100}%`,
                    minHeight: day.messages > 0 ? '4px' : '0',
                  }}
                  title={`${day.messages} messages`}
                />
                <span className="text-xs text-dark-500 truncate w-full text-center">
                  {new Date(day.date).toLocaleDateString('en', { weekday: 'short' })}
                </span>
              </div>
            ))}
          </div>
        </div>

        {/* Top Models */}
        <div className="grid md:grid-cols-2 gap-6">
          <div className="bg-dark-800 rounded-xl border border-dark-700 p-6">
            <h2 className="text-lg font-medium text-dark-100 mb-4">
              Top Models
            </h2>
            <div className="space-y-3">
              {(dashboard?.topModels || []).slice(0, 5).map((model, i) => (
                <div
                  key={model}
                  className="flex items-center gap-3"
                >
                  <span className="w-6 h-6 rounded-full bg-primary-500/20 text-primary-400 text-sm flex items-center justify-center">
                    {i + 1}
                  </span>
                  <span className="text-dark-200 font-mono text-sm truncate">
                    {model}
                  </span>
                </div>
              ))}
              {(dashboard?.topModels || []).length === 0 && (
                <p className="text-dark-500">No data yet</p>
              )}
            </div>
          </div>

          <div className="bg-dark-800 rounded-xl border border-dark-700 p-6">
            <h2 className="text-lg font-medium text-dark-100 mb-4">
              Top Tags
            </h2>
            <div className="flex flex-wrap gap-2">
              {(dashboard?.topTags || []).map((tag) => (
                <span
                  key={tag}
                  className="px-3 py-1 bg-dark-700 text-dark-300 rounded-full text-sm"
                >
                  {tag}
                </span>
              ))}
              {(dashboard?.topTags || []).length === 0 && (
                <p className="text-dark-500">No tags yet</p>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

function StatCard({
  icon: Icon,
  label,
  value,
  color,
}: {
  icon: typeof MessageSquare;
  label: string;
  value: number | string;
  color: string;
}) {
  const colorClasses: Record<string, string> = {
    primary: 'bg-primary-500/10 text-primary-400',
    yellow: 'bg-yellow-500/10 text-yellow-400',
    blue: 'bg-blue-500/10 text-blue-400',
    purple: 'bg-purple-500/10 text-purple-400',
    pink: 'bg-pink-500/10 text-pink-400',
    cyan: 'bg-cyan-500/10 text-cyan-400',
  };

  return (
    <div className="bg-dark-800 rounded-xl border border-dark-700 p-4">
      <div
        className={clsx(
          'w-10 h-10 rounded-lg flex items-center justify-center mb-3',
          colorClasses[color]
        )}
      >
        <Icon size={20} />
      </div>
      <p className="text-2xl font-semibold text-dark-100">{value}</p>
      <p className="text-sm text-dark-500">{label}</p>
    </div>
  );
}

function formatNumber(num: number): string {
  if (num >= 1000000) return `${(num / 1000000).toFixed(1)}M`;
  if (num >= 1000) return `${(num / 1000).toFixed(1)}K`;
  return num.toString();
}
