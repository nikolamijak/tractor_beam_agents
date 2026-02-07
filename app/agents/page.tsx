/**
 * Agents List Page
 * Browse and filter all available agents
 */

'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { AgentCreateModal } from '@/components/agents/AgentCreateModal';

interface Agent {
  id: string;
  agent_name: string;
  display_name: string;
  description: string;
  category: 'workflow' | 'innovation' | 'utility' | 'technology';
  technology: string | null;
  is_enabled: boolean;
  is_core: boolean;
  model_id: string;
  model?: {
    id: string;
    model_name: string;
    display_name: string;
    provider: {
      id: string;
      provider_name: string;
      display_name: string;
    };
  };
}

export default function AgentsPage() {
  const [agents, setAgents] = useState<Agent[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [categoryFilter, setCategoryFilter] = useState<string>('all');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [showCreateModal, setShowCreateModal] = useState(false);

  useEffect(() => {
    fetchAgents();
  }, []);

  async function fetchAgents() {
    try {
      setLoading(true);
      const response = await fetch('/api/agents?withModels=true');
      const result = await response.json();

      if (result.success) {
        setAgents(result.data);
      } else {
        setError(result.error || 'Failed to fetch agents');
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to fetch agents');
    } finally {
      setLoading(false);
    }
  }

  // Filter agents based on search and filters
  const filteredAgents = agents.filter((agent) => {
    const matchesSearch =
      agent.display_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      agent.description?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      agent.agent_name.toLowerCase().includes(searchTerm.toLowerCase());

    const matchesCategory =
      categoryFilter === 'all' || agent.category === categoryFilter;

    const matchesStatus =
      statusFilter === 'all' ||
      (statusFilter === 'enabled' && agent.is_enabled) ||
      (statusFilter === 'disabled' && !agent.is_enabled) ||
      (statusFilter === 'core' && agent.is_core);

    return matchesSearch && matchesCategory && matchesStatus;
  });

  // Group agents by category
  const agentsByCategory = {
    workflow: filteredAgents.filter(a => a.category === 'workflow'),
    innovation: filteredAgents.filter(a => a.category === 'innovation'),
    utility: filteredAgents.filter(a => a.category === 'utility'),
    technology: filteredAgents.filter(a => a.category === 'technology'),
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 p-8 pt-24">
        <div className="max-w-7xl mx-auto">
          <div className="flex items-center justify-center h-64">
            <div className="text-gray-600">Loading agents...</div>
          </div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-gray-50 p-8 pt-24">
        <div className="max-w-7xl mx-auto">
          <div className="bg-red-50 border border-red-200 rounded-lg p-4">
            <p className="text-red-800">Error: {error}</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 to-gray-100 dark:from-gray-900 dark:to-gray-800 p-8 pt-24">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="mb-8">
          <div className="text-center mb-6">
            <h1 className="text-5xl font-bold mb-4 bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent">
              Agent Registry
            </h1>
            <p className="text-xl text-gray-600 dark:text-gray-300">
              Browse and manage {agents.length} AI agents
            </p>
          </div>
          <div className="flex items-center justify-center gap-3 mb-6">
            <button
              onClick={() => setShowCreateModal(true)}
              className="px-6 py-2 bg-blue-600 dark:bg-blue-700 text-white rounded-lg hover:bg-blue-700 dark:hover:bg-blue-600 transition-colors font-medium shadow-lg hover:shadow-xl"
            >
              + Create Agent
            </button>
            <Link
              href="/dashboard"
              className="px-6 py-2 bg-white dark:bg-gray-800 text-gray-700 dark:text-gray-300 rounded-lg hover:shadow-lg transition-all duration-300 font-medium border border-gray-200 dark:border-gray-700"
            >
              ← Dashboard
            </Link>
          </div>

          {/* Search and Filters */}
          <div className="bg-white dark:bg-gray-800 rounded-lg shadow-lg p-6 border border-gray-200 dark:border-gray-700">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              {/* Search */}
              <div className="md:col-span-1">
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Search
                </label>
                <input
                  type="text"
                  placeholder="Search agents..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>

              {/* Category Filter */}
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Category
                </label>
                <select
                  value={categoryFilter}
                  onChange={(e) => setCategoryFilter(e.target.value)}
                  className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  <option value="all">All Categories</option>
                  <option value="workflow">Workflow</option>
                  <option value="innovation">Innovation</option>
                  <option value="utility">Utility</option>
                  <option value="technology">Technology</option>
                </select>
              </div>

              {/* Status Filter */}
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Status
                </label>
                <select
                  value={statusFilter}
                  onChange={(e) => setStatusFilter(e.target.value)}
                  className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  <option value="all">All Agents</option>
                  <option value="enabled">Enabled Only</option>
                  <option value="disabled">Disabled Only</option>
                  <option value="core">Core Agents</option>
                </select>
              </div>
            </div>

            {/* Results Count */}
            <div className="mt-4 text-sm text-gray-600">
              Showing {filteredAgents.length} of {agents.length} agents
            </div>
          </div>
        </div>

        {/* Agents by Category */}
        {categoryFilter === 'all' ? (
          <>
            {/* Workflow Agents */}
            {agentsByCategory.workflow.length > 0 && (
              <AgentSection
                title="Workflow Agents"
                subtitle="SDLC automation and orchestration"
                icon="🔄"
                agents={agentsByCategory.workflow}
                color="blue"
              />
            )}

            {/* Innovation Agents */}
            {agentsByCategory.innovation.length > 0 && (
              <AgentSection
                title="Innovation Agents"
                subtitle="Prototypes, pilots, and strategic planning"
                icon="💡"
                agents={agentsByCategory.innovation}
                color="purple"
              />
            )}

            {/* Utility Agents */}
            {agentsByCategory.utility.length > 0 && (
              <AgentSection
                title="Utility Agents"
                subtitle="Code review, security, and quality assurance"
                icon="🔧"
                agents={agentsByCategory.utility}
                color="green"
              />
            )}

            {/* Technology Agents */}
            {agentsByCategory.technology.length > 0 && (
              <AgentSection
                title="Technology Extensions"
                subtitle="Language-specific implementation agents"
                icon="⚙️"
                agents={agentsByCategory.technology}
                color="orange"
              />
            )}

            {filteredAgents.length === 0 && (
              <div className="bg-white rounded-lg shadow-sm p-12 text-center">
                <p className="text-gray-600">No agents found matching your criteria</p>
              </div>
            )}
          </>
        ) : (
          <div className="bg-white rounded-lg shadow-sm p-6">
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {filteredAgents.map((agent) => (
                <AgentCard key={agent.id} agent={agent} />
              ))}
            </div>
            {filteredAgents.length === 0 && (
              <div className="text-center py-12">
                <p className="text-gray-600">No agents found matching your criteria</p>
              </div>
            )}
          </div>
        )}
      </div>

      {/* Create Agent Modal */}
      <AgentCreateModal
        isOpen={showCreateModal}
        onClose={() => setShowCreateModal(false)}
        onSuccess={() => {
          fetchAgents();
          setShowCreateModal(false);
        }}
      />
    </div>
  );
}

function AgentSection({
  title,
  subtitle,
  icon,
  agents,
  color,
}: {
  title: string;
  subtitle: string;
  icon: string;
  agents: Agent[];
  color: string;
}) {
  return (
    <div className="mb-8">
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow-lg p-6 border border-gray-200 dark:border-gray-700">
        <div className="flex items-center mb-4">
          <span className="text-3xl mr-3">{icon}</span>
          <div>
            <h2 className="text-2xl font-bold text-gray-900 dark:text-gray-100">{title}</h2>
            <p className="text-sm text-gray-600 dark:text-gray-400">{subtitle}</p>
          </div>
          <span className="ml-auto bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 px-3 py-1 rounded-full text-sm font-medium">
            {agents.length}
          </span>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {agents.map((agent) => (
            <AgentCard key={agent.id} agent={agent} />
          ))}
        </div>
      </div>
    </div>
  );
}

function AgentCard({ agent }: { agent: Agent }) {
  const categoryColors = {
    workflow: 'bg-blue-100 dark:bg-blue-900 text-blue-800 dark:text-blue-200',
    innovation: 'bg-purple-100 dark:bg-purple-900 text-purple-800 dark:text-purple-200',
    utility: 'bg-green-100 dark:bg-green-900 text-green-800 dark:text-green-200',
    technology: 'bg-orange-100 dark:bg-orange-900 text-orange-800 dark:text-orange-200',
  };

  return (
    <Link
      href={`/agents/${agent.id}`}
      className="group border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 rounded-lg p-4 hover:shadow-lg transition-all duration-300"
    >
      <div className="flex items-start justify-between mb-2">
        <h3 className="font-semibold text-gray-900 dark:text-gray-100 text-sm line-clamp-1">
          {agent.display_name}
        </h3>
        {!agent.is_enabled && (
          <span className="text-xs bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-400 px-2 py-1 rounded flex-shrink-0 ml-2">
            Disabled
          </span>
        )}
      </div>

      <p className="text-xs text-gray-600 dark:text-gray-400 mb-3 line-clamp-2 min-h-[2.5rem]">
        {agent.description || 'No description available'}
      </p>

      <div className="flex items-center gap-2 flex-wrap">
        <span
          className={`text-xs px-2 py-1 rounded ${
            categoryColors[agent.category] || 'bg-gray-100 dark:bg-gray-700 text-gray-800 dark:text-gray-200'
          }`}
        >
          {agent.category}
        </span>
        {agent.is_core && (
          <span className="text-xs bg-yellow-100 dark:bg-yellow-900 text-yellow-800 dark:text-yellow-200 px-2 py-1 rounded">
            Core
          </span>
        )}
        {agent.technology && (
          <span className="text-xs bg-indigo-100 dark:bg-indigo-900 text-indigo-800 dark:text-indigo-200 px-2 py-1 rounded">
            {agent.technology}
          </span>
        )}
      </div>

      <div className="mt-3 pt-3 border-t border-gray-100 dark:border-gray-700">
        <p className="text-xs text-gray-500 dark:text-gray-400">
          Model: <span className="font-medium">{agent.model?.display_name || 'Unknown'}</span>
        </p>
        {agent.model?.provider && (
          <p className="text-[10px] text-gray-400 dark:text-gray-500 mt-0.5">
            {agent.model.provider.display_name}
          </p>
        )}
      </div>
    </Link>
  );
}
