/**
 * Agent Detail Page
 * View agent details, health, and execute agent
 */

'use client';

import { useState, useEffect } from 'react';
import { use } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { AgentEditModal } from '@/components/agents/AgentEditModal';
import { AgentDeleteConfirm } from '@/components/agents/AgentDeleteConfirm';

interface Agent {
  id: string;
  agent_name: string;
  display_name: string;
  description: string;
  category: 'workflow' | 'innovation' | 'utility' | 'technology';
  technology: string | null;
  system_prompt: string;
  model_id: string;
  max_tokens: number;
  temperature: number;
  tools: any[];
  capabilities: Record<string, any>;
  is_core: boolean;
  is_enabled: boolean;
  version: string;
  created_at: string;
  updated_at: string;
  model?: {
    id: string;
    model_name: string;
    display_name: string;
    context_window: number;
    max_tokens: number;
    pricing: {
      input_per_mtok: number;
      output_per_mtok: number;
      cache_read_per_mtok?: number;
    };
    provider: {
      id: string;
      provider_name: string;
      display_name: string;
    };
  };
}

interface AgentHealth {
  status: string;
  last_health_check: string;
  response_time_ms: number | null;
  total_requests: number;
  failed_requests: number;
  total_tokens_used: number;
  error_message: string | null;
}

export default function AgentDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = use(params);
  const router = useRouter();
  const [agent, setAgent] = useState<Agent | null>(null);
  const [health, setHealth] = useState<AgentHealth | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [executing, setExecuting] = useState(false);
  const [executionInput, setExecutionInput] = useState('');
  const [executionResult, setExecutionResult] = useState<any>(null);
  const [showEditModal, setShowEditModal] = useState(false);
  const [showDeleteModal, setShowDeleteModal] = useState(false);

  useEffect(() => {
    fetchAgentDetails();
    fetchAgentHealth();
  }, [id]);

  async function fetchAgentDetails() {
    try {
      setLoading(true);
      const response = await fetch(`/api/agents/${id}?withModel=true`);
      const result = await response.json();

      if (result.success) {
        setAgent(result.data);
      } else {
        setError(result.error || 'Failed to fetch agent details');
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to fetch agent details');
    } finally {
      setLoading(false);
    }
  }

  async function fetchAgentHealth() {
    try {
      const response = await fetch(`/api/agents/${id}/health`);
      const result = await response.json();

      if (result.success) {
        setHealth(result.data);
      }
    } catch (err) {
      console.error('Failed to fetch health:', err);
    }
  }

  async function executeAgent() {
    if (!executionInput.trim()) {
      alert('Please enter input for the agent');
      return;
    }

    try {
      setExecuting(true);
      setExecutionResult(null);

      const response = await fetch(`/api/agents/${id}/execute`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          input: executionInput,
          userId: 'demo-user',
        }),
      });

      const result = await response.json();
      setExecutionResult(result);

      if (result.success) {
        setExecutionInput('');
        fetchAgentHealth();
      }
    } catch (err) {
      setExecutionResult({
        success: false,
        error: err instanceof Error ? err.message : 'Execution failed',
      });
    } finally {
      setExecuting(false);
    }
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 p-8 pt-24">
        <div className="max-w-7xl mx-auto">
          <div className="flex items-center justify-center h-64">
            <div className="text-gray-600 dark:text-gray-400">Loading agent details...</div>
          </div>
        </div>
      </div>
    );
  }

  if (error || !agent) {
    return (
      <div className="min-h-screen bg-gray-50 p-8 pt-24">
        <div className="max-w-7xl mx-auto">
          <div className="bg-red-50 border border-red-200 rounded-lg p-4">
            <p className="text-red-800">Error: {error || 'Agent not found'}</p>
          </div>
          <Link
            href="/agents"
            className="inline-block mt-4 text-blue-600 hover:text-blue-700"
          >
            ← Back to Agents
          </Link>
        </div>
      </div>
    );
  }

  const categoryColors = {
    workflow: 'bg-blue-100 text-blue-800',
    innovation: 'bg-purple-100 text-purple-800',
    utility: 'bg-green-100 text-green-800',
    technology: 'bg-orange-100 text-orange-800',
  };

  const healthStatusColors = {
    healthy: 'bg-green-100 text-green-800',
    degraded: 'bg-yellow-100 text-yellow-800',
    down: 'bg-red-100 text-red-800',
  };

  const successRate = health
    ? health.total_requests > 0
      ? ((health.total_requests - health.failed_requests) / health.total_requests * 100).toFixed(1)
      : '100.0'
    : '0.0';

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 to-gray-100 dark:from-gray-900 dark:to-gray-800 p-8 pt-24">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="mb-8">
          <div className="text-center mb-6">
            <Link
              href="/agents"
              className="inline-block px-6 py-2 bg-white dark:bg-gray-800 text-gray-700 dark:text-gray-300 rounded-lg hover:shadow-lg transition-all duration-300 font-medium border border-gray-200 dark:border-gray-700 mb-6"
            >
              ← Back to Agents
            </Link>
            <h1 className="text-5xl font-bold mb-4 bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent">
              {agent.display_name}
            </h1>
            <p className="text-xl text-gray-600 dark:text-gray-300 mb-4">{agent.description}</p>
            <div className="flex items-center justify-center gap-2 flex-wrap mb-4">
              <span
                className={`text-sm px-3 py-1 rounded ${
                  categoryColors[agent.category] || 'bg-gray-100 dark:bg-gray-700 text-gray-800 dark:text-gray-200'
                }`}
              >
                {agent.category}
              </span>
              {agent.is_core && (
                <span className="text-sm bg-yellow-100 dark:bg-yellow-900 text-yellow-800 dark:text-yellow-200 px-3 py-1 rounded">
                  Core Agent
                </span>
              )}
              {agent.technology && (
                <span className="text-sm bg-indigo-100 dark:bg-indigo-900 text-indigo-800 dark:text-indigo-200 px-3 py-1 rounded">
                  {agent.technology}
                </span>
              )}
              <span
                className={`text-sm px-3 py-1 rounded ${
                  agent.is_enabled
                    ? 'bg-green-100 dark:bg-green-900 text-green-800 dark:text-green-200'
                    : 'bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-400'
                }`}
              >
                {agent.is_enabled ? 'Enabled' : 'Disabled'}
              </span>
            </div>
            <div className="flex items-center justify-center gap-3">
              <button
                onClick={() => setShowEditModal(true)}
                className="px-6 py-2 bg-blue-600 dark:bg-blue-700 text-white rounded-lg hover:bg-blue-700 dark:hover:bg-blue-600 shadow-lg hover:shadow-xl transition-all duration-300 font-medium"
              >
                Edit
              </button>
              <button
                onClick={() => setShowDeleteModal(true)}
                className="px-6 py-2 bg-red-600 dark:bg-red-700 text-white rounded-lg hover:bg-red-700 dark:hover:bg-red-600 shadow-lg hover:shadow-xl transition-all duration-300 font-medium"
              >
                Delete
              </button>
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Main Content */}
          <div className="lg:col-span-2 space-y-6">
            {/* Configuration */}
            <div className="bg-white dark:bg-gray-800 rounded-lg shadow-lg p-6 border border-gray-200 dark:border-gray-700">
              <h2 className="text-2xl font-bold text-gray-900 mb-4">Configuration</h2>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 dark:text-gray-300 mb-1">
                    Agent Name
                  </label>
                  <div className="text-gray-900 font-mono text-sm bg-gray-50 px-3 py-2 rounded">
                    {agent.agent_name}
                  </div>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 dark:text-gray-300 mb-1">
                    Version
                  </label>
                  <div className="text-gray-900 font-mono text-sm bg-gray-50 px-3 py-2 rounded">
                    {agent.version}
                  </div>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                    Model
                  </label>
                  {agent.model ? (
                    <div className="bg-gray-50 dark:bg-gray-700 px-3 py-2 rounded space-y-1">
                      <div className="text-gray-900 dark:text-gray-100 font-medium">
                        {agent.model.display_name}
                      </div>
                      <div className="text-xs text-gray-500 dark:text-gray-400">
                        {agent.model.provider.display_name}
                      </div>
                      <div className="text-xs text-gray-600 dark:text-gray-400 mt-1">
                        Context: {agent.model.context_window?.toLocaleString() || 'N/A'} tokens
                      </div>
                      <div className="text-xs text-gray-600 dark:text-gray-400">
                        Pricing: ${agent.model.pricing.input_per_mtok}/{agent.model.pricing.output_per_mtok} per MTok
                      </div>
                    </div>
                  ) : (
                    <div className="text-gray-900 dark:text-gray-100 font-mono text-xs bg-gray-50 dark:bg-gray-700 px-3 py-2 rounded break-all">
                      {agent.model_id}
                    </div>
                  )}
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 dark:text-gray-300 mb-1">
                    Max Tokens
                  </label>
                  <div className="text-gray-900 font-mono text-sm bg-gray-50 px-3 py-2 rounded">
                    {agent.max_tokens.toLocaleString()}
                  </div>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 dark:text-gray-300 mb-1">
                    Temperature
                  </label>
                  <div className="text-gray-900 font-mono text-sm bg-gray-50 px-3 py-2 rounded">
                    {agent.temperature}
                  </div>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 dark:text-gray-300 mb-1">
                    Category
                  </label>
                  <div className="text-gray-900 text-sm bg-gray-50 px-3 py-2 rounded">
                    {agent.category}
                  </div>
                </div>
              </div>
            </div>

            {/* System Prompt */}
            <div className="bg-white dark:bg-gray-800 rounded-lg shadow-lg p-6 border border-gray-200 dark:border-gray-700">
              <h2 className="text-2xl font-bold text-gray-900 mb-4">System Prompt</h2>
              <div className="bg-gray-50 rounded-lg p-4 max-h-96 overflow-y-auto">
                <pre className="text-sm text-gray-800 whitespace-pre-wrap font-mono">
                  {agent.system_prompt}
                </pre>
              </div>
            </div>

            {/* Capabilities */}
            {Object.keys(agent.capabilities || {}).length > 0 && (
              <div className="bg-white dark:bg-gray-800 rounded-lg shadow-lg p-6 border border-gray-200 dark:border-gray-700">
                <h2 className="text-2xl font-bold text-gray-900 mb-4">Capabilities</h2>
                <div className="bg-gray-50 rounded-lg p-4">
                  <pre className="text-sm text-gray-800">
                    {JSON.stringify(agent.capabilities, null, 2)}
                  </pre>
                </div>
              </div>
            )}

            {/* Tools */}
            {agent.tools && agent.tools.length > 0 && (
              <div className="bg-white dark:bg-gray-800 rounded-lg shadow-lg p-6 border border-gray-200 dark:border-gray-700">
                <h2 className="text-2xl font-bold text-gray-900 mb-4">
                  Tools ({agent.tools.length})
                </h2>
                <div className="bg-gray-50 rounded-lg p-4">
                  <pre className="text-sm text-gray-800">
                    {JSON.stringify(agent.tools, null, 2)}
                  </pre>
                </div>
              </div>
            )}
          </div>

          {/* Sidebar */}
          <div className="space-y-6">
            {/* Health Status */}
            {health && (
              <div className="bg-white dark:bg-gray-800 rounded-lg shadow-lg p-6 border border-gray-200 dark:border-gray-700">
                <h2 className="text-xl font-bold text-gray-900 dark:text-gray-100 mb-4">Health Status</h2>
                <div className="space-y-3">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 dark:text-gray-300 mb-1">
                      Status
                    </label>
                    <span
                      className={`inline-block text-sm px-3 py-1 rounded ${
                        healthStatusColors[health.status as keyof typeof healthStatusColors] ||
                        'bg-gray-100 text-gray-800'
                      }`}
                    >
                      {health.status}
                    </span>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 dark:text-gray-300 mb-1">
                      Total Requests
                    </label>
                    <div className="text-2xl font-bold text-gray-900">
                      {(health.total_requests ?? 0).toLocaleString()}
                    </div>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 dark:text-gray-300 mb-1">
                      Success Rate
                    </label>
                    <div className="text-2xl font-bold text-green-600">{successRate}%</div>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 dark:text-gray-300 mb-1">
                      Total Tokens Used
                    </label>
                    <div className="text-lg font-semibold text-gray-900">
                      {health.total_tokens_used?.toLocaleString() || '0'}
                    </div>
                  </div>
                  {health.response_time_ms !== null && (
                    <div>
                      <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 dark:text-gray-300 mb-1">
                        Avg Response Time
                      </label>
                      <div className="text-lg font-semibold text-gray-900">
                        {health.response_time_ms}ms
                      </div>
                    </div>
                  )}
                  {health.error_message && (
                    <div>
                      <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 dark:text-gray-300 mb-1">
                        Last Error
                      </label>
                      <div className="text-sm text-red-600 bg-red-50 p-2 rounded">
                        {health.error_message}
                      </div>
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* Execute Agent */}
            <div className="bg-white dark:bg-gray-800 rounded-lg shadow-lg p-6 border border-gray-200 dark:border-gray-700">
              <h2 className="text-xl font-bold text-gray-900 dark:text-gray-100 mb-4">Execute Agent</h2>
              <div className="space-y-3">
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 dark:text-gray-300 mb-2">
                    Input
                  </label>
                  <textarea
                    value={executionInput}
                    onChange={(e) => setExecutionInput(e.target.value)}
                    placeholder="Enter your request for the agent..."
                    className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 min-h-[120px]"
                    disabled={executing || !agent.is_enabled}
                  />
                </div>
                <button
                  onClick={executeAgent}
                  disabled={executing || !agent.is_enabled}
                  className="w-full px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:bg-gray-300 disabled:cursor-not-allowed transition-colors"
                >
                  {executing ? 'Executing...' : 'Execute'}
                </button>
                {!agent.is_enabled && (
                  <p className="text-sm text-gray-500 text-center">
                    Agent is disabled
                  </p>
                )}
              </div>

              {/* Execution Result */}
              {executionResult && (
                <div className="mt-4">
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 dark:text-gray-300 mb-2">
                    Result
                  </label>
                  <div
                    className={`p-4 rounded-lg ${
                      executionResult.success
                        ? 'bg-green-50 border border-green-200'
                        : 'bg-red-50 border border-red-200'
                    }`}
                  >
                    {executionResult.success ? (
                      <div className="space-y-2">
                        <div className="text-sm text-green-800">
                          <strong>Output:</strong>
                        </div>
                        <div className="text-sm text-gray-800 whitespace-pre-wrap bg-white p-3 rounded">
                          {executionResult.output}
                        </div>
                        <div className="text-xs text-green-700 mt-2">
                          Tokens used: {executionResult.tokensUsed?.toLocaleString() || 'N/A'}
                        </div>
                      </div>
                    ) : (
                      <div className="text-sm text-red-800">
                        <strong>Error:</strong> {executionResult.error}
                      </div>
                    )}
                  </div>
                </div>
              )}
            </div>

            {/* Metadata */}
            <div className="bg-white dark:bg-gray-800 rounded-lg shadow-lg p-6 border border-gray-200 dark:border-gray-700">
              <h2 className="text-xl font-bold text-gray-900 dark:text-gray-100 mb-4">Metadata</h2>
              <div className="space-y-2 text-sm">
                <div>
                  <span className="font-medium text-gray-700 dark:text-gray-300">Created:</span>
                  <div className="text-gray-600 dark:text-gray-400">
                    {new Date(agent.created_at).toLocaleString()}
                  </div>
                </div>
                <div>
                  <span className="font-medium text-gray-700 dark:text-gray-300">Updated:</span>
                  <div className="text-gray-600 dark:text-gray-400">
                    {new Date(agent.updated_at).toLocaleString()}
                  </div>
                </div>
                <div>
                  <span className="font-medium text-gray-700 dark:text-gray-300">Agent ID:</span>
                  <div className="text-gray-600 font-mono text-xs break-all">
                    {agent.id}
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Edit Agent Modal */}
      {agent && (
        <AgentEditModal
          isOpen={showEditModal}
          onClose={() => setShowEditModal(false)}
          onSuccess={() => {
            fetchAgentDetails();
            setShowEditModal(false);
          }}
          agent={agent}
        />
      )}

      {/* Delete Agent Confirmation */}
      {agent && (
        <AgentDeleteConfirm
          isOpen={showDeleteModal}
          onClose={() => setShowDeleteModal(false)}
          onConfirm={() => router.push('/agents')}
          agent={agent}
        />
      )}
    </div>
  );
}
