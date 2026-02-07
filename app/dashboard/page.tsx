/**
 * Dashboard Page
 * Main landing page showing system overview, agent stats, and recent activity
 */
"use client"

import { useState, useEffect } from 'react';
import Link from 'next/link';

// Move helper function outside component
async function getAgentStats() {
  try {
    const baseUrl = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000';
    const response = await fetch(`${baseUrl}/api/agents`, {
      cache: 'no-store',
    });

    if (!response.ok) {
      throw new Error('Failed to fetch agents');
    }

    const data = await response.json();
    const agents = data.data || [];

    // Calculate stats
    const stats = {
      total: agents.length,
      workflow: agents.filter((a: any) => a.category === 'workflow').length,
      innovation: agents.filter((a: any) => a.category === 'innovation').length,
      utility: agents.filter((a: any) => a.category === 'utility').length,
      enabled: agents.filter((a: any) => a.is_enabled).length,
      core: agents.filter((a: any) => a.is_core).length,
    };

    return { agents, stats };
  } catch (error) {
    console.error('Error fetching agent stats:', error);
    return {
      agents: [],
      stats: { total: 0, workflow: 0, innovation: 0, utility: 0, enabled: 0, core: 0 },
    };
  }
}

export default function DashboardPage() {
  const [agents, setAgents] = useState<any[]>([]);
  const [stats, setStats] = useState({
    total: 0,
    workflow: 0,
    innovation: 0,
    utility: 0,
    enabled: 0,
    core: 0,
  });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function loadData() {
      const data = await getAgentStats();
      setAgents(data.agents);
      setStats(data.stats);
      setLoading(false);
    }
    loadData();
  }, []);

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-gray-50 to-gray-100 dark:from-gray-900 dark:to-gray-800 p-8 flex items-center justify-center">
        <div className="text-center">
          <div className="inline-block animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 dark:border-blue-400 mb-4"></div>
          <p className="text-gray-600 dark:text-gray-300">Loading dashboard...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 to-gray-100 dark:from-gray-900 dark:to-gray-800 p-8 pt-24">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="mb-8 text-center">
          <h1 className="text-5xl font-bold mb-4 bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent">
            Tractor Beam Dashboard
          </h1>
          <p className="text-xl text-gray-600 dark:text-gray-300">
            AI-powered software development lifecycle management
          </p>
        </div>

        {/* Stats Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
          <StatCard
            title="Total Agents"
            value={stats.total}
            subtitle={`${stats.enabled} enabled`}
            icon="🤖"
          />
          <StatCard
            title="Workflow Agents"
            value={stats.workflow}
            subtitle="SDLC automation"
            icon="🔄"
          />
          <StatCard
            title="Innovation Agents"
            value={stats.innovation}
            subtitle="Prototypes & pilots"
            icon="💡"
          />
          <StatCard
            title="Utility Agents"
            value={stats.utility}
            subtitle="Code review & security"
            icon="🔧"
          />
        </div>

        {/* Quick Actions */}
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow-lg p-6 mb-8 border border-gray-200 dark:border-gray-700">
          <h2 className="text-2xl font-bold text-gray-900 dark:text-gray-100 mb-4">Quick Actions</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <ActionButton
              href="/agents"
              title="Browse Agents"
              description="View and manage all available agents"
              icon="🤖"
            />
            <ActionButton
              href="/workflows"
              title="Launch Workflows"
              description="Start and monitor multi-agent workflows"
              icon="⚡"
            />
          </div>
        </div>

        {/* Recent Agents */}
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow-lg p-6 border border-gray-200 dark:border-gray-700">
          <div className="flex justify-between items-center mb-4">
            <h2 className="text-2xl font-bold text-gray-900 dark:text-gray-100">Core Agents</h2>
            <Link
              href="/agents"
              className="text-blue-600 dark:text-blue-400 hover:text-blue-700 dark:hover:text-blue-300 font-medium"
            >
              View All →
            </Link>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {agents.slice(0, 6).map((agent: any) => (
              <AgentCard key={agent.id} agent={agent} />
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}

// Components
function StatCard({
  title,
  value,
  subtitle,
  icon,
}: {
  title: string;
  value: number;
  subtitle: string;
  icon: string;
}) {
  return (
    <div className="bg-white dark:bg-gray-800 rounded-lg shadow-lg p-6 border border-gray-200 dark:border-gray-700 transition-all duration-300">
      <div className="flex items-center justify-between mb-2">
        <span className="text-3xl">{icon}</span>
        <span className="text-3xl font-bold text-gray-900 dark:text-gray-100">{value}</span>
      </div>
      <h3 className="text-sm font-medium text-gray-600 dark:text-gray-300 mb-1">{title}</h3>
      <p className="text-xs text-gray-500 dark:text-gray-400">{subtitle}</p>
    </div>
  );
}

function ActionButton({
  href,
  title,
  description,
  icon,
}: {
  href: string;
  title: string;
  description: string;
  icon: string;
}) {
  return (
    <Link
      href={href}
      className="group flex items-start p-6 bg-white dark:bg-gray-800 rounded-lg shadow-lg hover:shadow-xl transition-all duration-300 border border-gray-200 dark:border-gray-700"
    >
      <span className="text-3xl mr-4 group-hover:scale-110 transition-transform">{icon}</span>
      <div>
        <h3 className="font-semibold text-gray-900 dark:text-gray-100 mb-1">{title}</h3>
        <p className="text-sm text-gray-600 dark:text-gray-400">{description}</p>
      </div>
    </Link>
  );
}

function AgentCard({ agent }: { agent: any }) {
  const categoryColors = {
    workflow: 'bg-blue-100 dark:bg-blue-900 text-blue-800 dark:text-blue-200',
    innovation: 'bg-purple-100 dark:bg-purple-900 text-purple-800 dark:text-purple-200',
    utility: 'bg-green-100 dark:bg-green-900 text-green-800 dark:text-green-200',
  };

  return (
    <Link
      href={`/agents/${agent.id}`}
      className="group border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 rounded-lg p-4 hover:shadow-lg transition-all duration-300"
    >
      <div className="flex items-start justify-between mb-2">
        <h3 className="font-semibold text-gray-900 dark:text-gray-100 text-sm">{agent.display_name}</h3>
        {!agent.is_enabled && (
          <span className="text-xs bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-400 px-2 py-1 rounded">
            Disabled
          </span>
        )}
      </div>
      <p className="text-xs text-gray-600 dark:text-gray-400 mb-3 line-clamp-2">{agent.description}</p>
      <div className="flex items-center gap-2">
        <span
          className={`text-xs px-2 py-1 rounded ${
            categoryColors[agent.category as keyof typeof categoryColors] ||
            'bg-gray-100 dark:bg-gray-700 text-gray-800 dark:text-gray-200'
          }`}
        >
          {agent.category}
        </span>
        {agent.is_core && (
          <span className="text-xs bg-yellow-100 dark:bg-yellow-900 text-yellow-800 dark:text-yellow-200 px-2 py-1 rounded">
            Core
          </span>
        )}
      </div>
    </Link>
  );
}
