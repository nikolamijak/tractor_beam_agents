'use client';

import { useState, useEffect } from 'react';
import { Modal } from '@/components/ui/Modal';

interface Agent {
  id: string;
  agent_name: string;
  display_name: string;
  description: string | null;
  category: string;
  technology: string | null;
  system_prompt: string;
  model_id: string;
  max_tokens: number;
  temperature: number;
  tools: any[];
  capabilities: any;
  is_enabled: boolean;
}

interface Provider {
  id: string;
  provider_name: string;
  display_name: string;
}

interface Model {
  id: string;
  provider_id: string;
  model_name: string;
  display_name: string;
  is_active: boolean;
  is_recommended: boolean;
  pricing: {
    input_per_mtok: number;
    output_per_mtok: number;
  };
}

interface AgentEditModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
  agent: Agent;
}

export function AgentEditModal({ isOpen, onClose, onSuccess, agent }: AgentEditModalProps) {
  const [formData, setFormData] = useState({
    display_name: '',
    description: '',
    category: 'utility',
    technology: '',
    system_prompt: '',
    model_id: '',
    max_tokens: 4096,
    temperature: 0.7,
    tools: '',
    capabilities: '',
    is_enabled: true,
  });

  const [providers, setProviders] = useState<Provider[]>([]);
  const [models, setModels] = useState<Model[]>([]);
  const [selectedProviderId, setSelectedProviderId] = useState<string>('');
  const [loadingData, setLoadingData] = useState(false);

  const [errors, setErrors] = useState<Record<string, string>>({});
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Load providers and models on mount
  useEffect(() => {
    async function loadData() {
      if (!isOpen) return;

      setLoadingData(true);
      try {
        // Load providers
        const providersRes = await fetch('/api/providers?isActive=true');
        const providersData = await providersRes.json();
        setProviders(providersData.data || []);

        // Load all models
        const modelsRes = await fetch('/api/models?isActive=true');
        const modelsData = await modelsRes.json();
        setModels(modelsData.data || []);

        // Pre-select provider based on agent's current model
        if (agent?.model_id) {
          const currentModel = modelsData.data?.find((m: Model) => m.id === agent.model_id);
          if (currentModel) {
            setSelectedProviderId(currentModel.provider_id);
          }
        }
      } catch (error) {
        console.error('Error loading providers/models:', error);
      } finally {
        setLoadingData(false);
      }
    }

    loadData();
  }, [isOpen, agent?.model_id]);

  // Update form data when agent changes
  useEffect(() => {
    if (isOpen && agent) {
      setFormData({
        display_name: agent.display_name,
        description: agent.description || '',
        category: agent.category,
        technology: agent.technology || '',
        system_prompt: agent.system_prompt,
        model_id: agent.model_id,
        max_tokens: agent.max_tokens,
        temperature: agent.temperature,
        tools: JSON.stringify(agent.tools || [], null, 2),
        capabilities: JSON.stringify(agent.capabilities || {}, null, 2),
        is_enabled: agent.is_enabled,
      });
      setErrors({});
    }
  }, [isOpen, agent]);

  const validateForm = () => {
    const newErrors: Record<string, string> = {};

    if (!formData.display_name.trim()) {
      newErrors.display_name = 'Display name is required';
    }

    if (!formData.system_prompt.trim()) {
      newErrors.system_prompt = 'System prompt is required';
    }

    if (!formData.model_id) {
      newErrors.model_id = 'Model is required';
    }

    if (formData.temperature < 0 || formData.temperature > 1) {
      newErrors.temperature = 'Temperature must be between 0 and 1';
    }

    if (formData.tools.trim()) {
      try {
        JSON.parse(formData.tools);
      } catch {
        newErrors.tools = 'Tools must be valid JSON array';
      }
    }

    if (formData.capabilities.trim()) {
      try {
        JSON.parse(formData.capabilities);
      } catch {
        newErrors.capabilities = 'Capabilities must be valid JSON object';
      }
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!validateForm()) return;

    setIsSubmitting(true);

    try {
      const payload = {
        display_name: formData.display_name,
        description: formData.description || null,
        category: formData.category,
        technology: formData.category === 'technology' && formData.technology ? formData.technology : null,
        system_prompt: formData.system_prompt,
        model_id: formData.model_id,
        max_tokens: formData.max_tokens,
        temperature: formData.temperature,
        tools: formData.tools.trim() ? JSON.parse(formData.tools) : [],
        capabilities: formData.capabilities.trim() ? JSON.parse(formData.capabilities) : {},
        is_enabled: formData.is_enabled,
      };

      const response = await fetch(`/api/agents/${agent.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });

      const result = await response.json();

      if (result.success) {
        onSuccess();
      } else {
        setErrors({ submit: result.error || 'Failed to update agent' });
      }
    } catch (error) {
      setErrors({ submit: 'Network error. Please try again.' });
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="Edit Agent" maxWidth="xl">
      <form onSubmit={handleSubmit} className="space-y-4">
        {/* Agent Name (Read-only) */}
        <div>
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Agent Name</label>
          <input
            type="text"
            value={agent.agent_name}
            disabled
            className="w-full px-3 py-2 border border-gray-300 rounded-lg bg-gray-100 text-gray-600 cursor-not-allowed"
          />
          <p className="text-xs text-gray-500 mt-1">Agent name cannot be changed</p>
        </div>

        {/* Display Name */}
        <div>
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
            Display Name <span className="text-red-500">*</span>
          </label>
          <input
            type="text"
            value={formData.display_name}
            onChange={(e) => setFormData({ ...formData, display_name: e.target.value })}
            className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
          {errors.display_name && <p className="text-red-500 text-sm mt-1">{errors.display_name}</p>}
        </div>

        {/* Description */}
        <div>
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Description</label>
          <textarea
            value={formData.description}
            onChange={(e) => setFormData({ ...formData, description: e.target.value })}
            className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
            rows={3}
          />
        </div>

        {/* Category */}
        <div>
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
            Category <span className="text-red-500">*</span>
          </label>
          <select
            value={formData.category}
            onChange={(e) => setFormData({ ...formData, category: e.target.value })}
            className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
          >
            <option value="workflow">Workflow</option>
            <option value="innovation">Innovation</option>
            <option value="utility">Utility</option>
            <option value="technology">Technology</option>
          </select>
        </div>

        {/* Technology (conditional) */}
        {formData.category === 'technology' && (
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Technology</label>
            <select
              value={formData.technology}
              onChange={(e) => setFormData({ ...formData, technology: e.target.value })}
              className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="">Select technology</option>
              <option value="dotnet">.NET</option>
              <option value="nodejs">Node.js</option>
              <option value="python">Python</option>
              <option value="java">Java</option>
              <option value="go">Go</option>
            </select>
          </div>
        )}

        {/* System Prompt */}
        <div>
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
            System Prompt <span className="text-red-500">*</span>
          </label>
          <textarea
            value={formData.system_prompt}
            onChange={(e) => setFormData({ ...formData, system_prompt: e.target.value })}
            className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 font-mono text-sm"
            rows={10}
          />
          {errors.system_prompt && <p className="text-red-500 text-sm mt-1">{errors.system_prompt}</p>}
        </div>

        {/* Provider Selection */}
        <div>
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
            Provider <span className="text-red-500">*</span>
          </label>
          <select
            value={selectedProviderId}
            onChange={(e) => {
              setSelectedProviderId(e.target.value);
              // Reset model selection when provider changes
              setFormData({ ...formData, model_id: '' });
            }}
            className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
            required
            disabled={loadingData}
          >
            <option value="">Select provider...</option>
            {providers.map((provider) => (
              <option key={provider.id} value={provider.id}>
                {provider.display_name}
              </option>
            ))}
          </select>
          {errors.provider && <p className="text-red-500 text-sm mt-1">{errors.provider}</p>}
        </div>

        {/* Model Selection */}
        <div>
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
            Model <span className="text-red-500">*</span>
          </label>
          <select
            value={formData.model_id}
            onChange={(e) => setFormData({ ...formData, model_id: e.target.value })}
            className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
            required
            disabled={!selectedProviderId || loadingData}
          >
            <option value="">
              {!selectedProviderId ? 'Select provider first...' : 'Select model...'}
            </option>
            {models
              .filter((model) => model.provider_id === selectedProviderId && model.is_active)
              .map((model) => (
                <option key={model.id} value={model.id}>
                  {model.display_name}
                  {model.is_recommended && ' (Recommended)'}
                  {' - '}$
                  {model.pricing.input_per_mtok.toFixed(2)}/$
                  {model.pricing.output_per_mtok.toFixed(2)} per MTok
                </option>
              ))}
          </select>
          {errors.model_id && <p className="text-red-500 text-sm mt-1">{errors.model_id}</p>}

          {/* Selected Model Info */}
          {formData.model_id && (
            <div className="mt-2 p-2 bg-gray-50 dark:bg-gray-800 rounded text-xs text-gray-600 dark:text-gray-400">
              {(() => {
                const selectedModel = models.find((m) => m.id === formData.model_id);
                return selectedModel ? (
                  <span>
                    {selectedModel.display_name} - $
                    {selectedModel.pricing.input_per_mtok.toFixed(2)}/$
                    {selectedModel.pricing.output_per_mtok.toFixed(2)} per MTok
                  </span>
                ) : null;
              })()}
            </div>
          )}
        </div>

        {/* Max Tokens */}
        <div>
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Max Tokens</label>
          <input
            type="number"
            value={formData.max_tokens}
            onChange={(e) => setFormData({ ...formData, max_tokens: parseInt(e.target.value) })}
            className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
            min="1"
            max="8192"
          />
        </div>

        {/* Temperature */}
        <div>
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Temperature</label>
          <input
            type="number"
            value={formData.temperature}
            onChange={(e) => setFormData({ ...formData, temperature: parseFloat(e.target.value) })}
            className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
            min="0"
            max="1"
            step="0.1"
          />
          {errors.temperature && <p className="text-red-500 text-sm mt-1">{errors.temperature}</p>}
        </div>

        {/* Tools (JSON) */}
        <div>
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Tools (JSON Array)</label>
          <textarea
            value={formData.tools}
            onChange={(e) => setFormData({ ...formData, tools: e.target.value })}
            className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 font-mono text-sm"
            rows={4}
          />
          {errors.tools && <p className="text-red-500 text-sm mt-1">{errors.tools}</p>}
        </div>

        {/* Capabilities (JSON) */}
        <div>
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Capabilities (JSON Object)</label>
          <textarea
            value={formData.capabilities}
            onChange={(e) => setFormData({ ...formData, capabilities: e.target.value })}
            className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 font-mono text-sm"
            rows={4}
          />
          {errors.capabilities && <p className="text-red-500 text-sm mt-1">{errors.capabilities}</p>}
        </div>

        {/* Is Enabled */}
        <div className="flex items-center gap-2">
          <input
            type="checkbox"
            id="is_enabled"
            checked={formData.is_enabled}
            onChange={(e) => setFormData({ ...formData, is_enabled: e.target.checked })}
            className="w-4 h-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
          />
          <label htmlFor="is_enabled" className="text-sm font-medium text-gray-700">
            Agent Enabled
          </label>
        </div>

        {/* Submit Error */}
        {errors.submit && (
          <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg p-3">
            <p className="text-red-800 dark:text-red-200 text-sm">{errors.submit}</p>
          </div>
        )}

        {/* Actions */}
        <div className="flex items-center justify-end gap-3 pt-4">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg text-gray-700 dark:text-gray-300 bg-white dark:bg-gray-700 hover:bg-gray-50 dark:hover:bg-gray-600"
            disabled={isSubmitting}
          >
            Cancel
          </button>
          <button
            type="submit"
            className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50"
            disabled={isSubmitting}
          >
            {isSubmitting ? 'Saving...' : 'Save Changes'}
          </button>
        </div>
      </form>
    </Modal>
  );
}
