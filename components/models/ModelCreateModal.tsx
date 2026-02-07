'use client';

import { useState, useEffect } from 'react';
import { Modal } from '@/components/ui/Modal';
import { Provider } from '@/lib/db/types';

interface ModelCreateModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
}

export function ModelCreateModal({ isOpen, onClose, onSuccess }: ModelCreateModalProps) {
  const [providers, setProviders] = useState<Provider[]>([]);
  const [formData, setFormData] = useState({
    provider_id: '',
    model_name: '',
    display_name: '',
    description: '',
    model_family: '',
    is_active: true,
    is_recommended: false,
    max_tokens: 4096,
    context_window: 200000,
    supports_streaming: true,
    supports_function_calling: true,
    supports_vision: false,
    supports_prompt_caching: false,
    input_per_mtok: 3.0,
    output_per_mtok: 15.0,
    cache_creation_per_mtok: 3.75,
    cache_read_per_mtok: 0.3,
    performance_tier: 'balanced',
  });

  const [errors, setErrors] = useState<Record<string, string>>({});
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    async function loadProviders() {
      try {
        const response = await fetch('/api/providers?isActive=true');
        const data = await response.json();
        setProviders(data.data || []);
      } catch (err) {
        console.error('Error loading providers:', err);
      }
    }

    if (isOpen) {
      loadProviders();
    }
  }, [isOpen]);

  const validateForm = () => {
    const newErrors: Record<string, string> = {};

    if (!formData.provider_id) {
      newErrors.provider_id = 'Provider is required';
    }

    if (!formData.model_name.trim()) {
      newErrors.model_name = 'Model name is required';
    }

    if (!formData.display_name.trim()) {
      newErrors.display_name = 'Display name is required';
    }

    if (formData.input_per_mtok < 0) {
      newErrors.input_per_mtok = 'Input pricing must be non-negative';
    }

    if (formData.output_per_mtok < 0) {
      newErrors.output_per_mtok = 'Output pricing must be non-negative';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!validateForm()) return;

    setIsSubmitting(true);

    try {
      const pricing: any = {
        input_per_mtok: formData.input_per_mtok,
        output_per_mtok: formData.output_per_mtok,
      };

      if (formData.supports_prompt_caching) {
        pricing.cache_creation_per_mtok = formData.cache_creation_per_mtok;
        pricing.cache_read_per_mtok = formData.cache_read_per_mtok;
      }

      const payload = {
        provider_id: formData.provider_id,
        model_name: formData.model_name,
        display_name: formData.display_name,
        description: formData.description || null,
        model_family: formData.model_family || null,
        is_active: formData.is_active,
        is_recommended: formData.is_recommended,
        max_tokens: formData.max_tokens,
        context_window: formData.context_window,
        supports_streaming: formData.supports_streaming,
        supports_function_calling: formData.supports_function_calling,
        supports_vision: formData.supports_vision,
        supports_prompt_caching: formData.supports_prompt_caching,
        pricing,
        performance_tier: formData.performance_tier,
        capabilities: {},
        metadata: {},
      };

      const response = await fetch('/api/models', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });

      const result = await response.json();

      if (!response.ok) {
        setErrors({ submit: result.error || 'Failed to create model' });
        return;
      }

      // Reset form
      setFormData({
        provider_id: '',
        model_name: '',
        display_name: '',
        description: '',
        model_family: '',
        is_active: true,
        is_recommended: false,
        max_tokens: 4096,
        context_window: 200000,
        supports_streaming: true,
        supports_function_calling: true,
        supports_vision: false,
        supports_prompt_caching: false,
        input_per_mtok: 3.0,
        output_per_mtok: 15.0,
        cache_creation_per_mtok: 3.75,
        cache_read_per_mtok: 0.3,
        performance_tier: 'balanced',
      });
      setErrors({});
      onSuccess();
      onClose();
    } catch (error) {
      console.error('Error creating model:', error);
      setErrors({ submit: 'Failed to create model' });
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleClose = () => {
    if (!isSubmitting) {
      setErrors({});
      onClose();
    }
  };

  return (
    <Modal isOpen={isOpen} onClose={handleClose} title="Create Model" maxWidth="xl">
      <form onSubmit={handleSubmit} className="space-y-4">
        {/* Provider Selection */}
        <div>
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
            Provider <span className="text-red-500">*</span>
          </label>
          <select
            value={formData.provider_id}
            onChange={(e) => setFormData({ ...formData, provider_id: e.target.value })}
            className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
            required
          >
            <option value="">Select provider...</option>
            {providers.map((provider) => (
              <option key={provider.id} value={provider.id}>
                {provider.display_name}
              </option>
            ))}
          </select>
          {errors.provider_id && <p className="text-red-500 text-sm mt-1">{errors.provider_id}</p>}
        </div>

        {/* Model Name */}
        <div>
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
            Model Name <span className="text-red-500">*</span>
          </label>
          <input
            type="text"
            value={formData.model_name}
            onChange={(e) => setFormData({ ...formData, model_name: e.target.value })}
            className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
            placeholder="e.g., claude-sonnet-4-20250514"
            required
          />
          {errors.model_name && <p className="text-red-500 text-sm mt-1">{errors.model_name}</p>}
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
            placeholder="e.g., Claude Sonnet 4"
            required
          />
          {errors.display_name && <p className="text-red-500 text-sm mt-1">{errors.display_name}</p>}
        </div>

        {/* Description */}
        <div>
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
            Description
          </label>
          <textarea
            value={formData.description}
            onChange={(e) => setFormData({ ...formData, description: e.target.value })}
            className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
            rows={2}
            placeholder="Optional description..."
          />
        </div>

        <div className="grid grid-cols-2 gap-4">
          {/* Model Family */}
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
              Model Family
            </label>
            <input
              type="text"
              value={formData.model_family}
              onChange={(e) => setFormData({ ...formData, model_family: e.target.value })}
              className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
              placeholder="e.g., claude-4"
            />
          </div>

          {/* Performance Tier */}
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
              Performance Tier
            </label>
            <select
              value={formData.performance_tier}
              onChange={(e) => setFormData({ ...formData, performance_tier: e.target.value })}
              className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="fast">Fast</option>
              <option value="balanced">Balanced</option>
              <option value="powerful">Powerful</option>
            </select>
          </div>
        </div>

        <div className="grid grid-cols-2 gap-4">
          {/* Max Tokens */}
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
              Max Tokens
            </label>
            <input
              type="number"
              value={formData.max_tokens}
              onChange={(e) => setFormData({ ...formData, max_tokens: parseInt(e.target.value) })}
              className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
              min="1"
            />
          </div>

          {/* Context Window */}
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
              Context Window
            </label>
            <input
              type="number"
              value={formData.context_window}
              onChange={(e) =>
                setFormData({ ...formData, context_window: parseInt(e.target.value) })
              }
              className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
              min="1"
            />
          </div>
        </div>

        {/* Capabilities */}
        <div className="space-y-2">
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">
            Capabilities
          </label>
          <div className="grid grid-cols-2 gap-2">
            <label className="flex items-center">
              <input
                type="checkbox"
                checked={formData.supports_streaming}
                onChange={(e) =>
                  setFormData({ ...formData, supports_streaming: e.target.checked })
                }
                className="mr-2 w-4 h-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
              />
              <span className="text-sm text-gray-700 dark:text-gray-300">Streaming</span>
            </label>
            <label className="flex items-center">
              <input
                type="checkbox"
                checked={formData.supports_function_calling}
                onChange={(e) =>
                  setFormData({ ...formData, supports_function_calling: e.target.checked })
                }
                className="mr-2 w-4 h-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
              />
              <span className="text-sm text-gray-700 dark:text-gray-300">Function Calling</span>
            </label>
            <label className="flex items-center">
              <input
                type="checkbox"
                checked={formData.supports_vision}
                onChange={(e) => setFormData({ ...formData, supports_vision: e.target.checked })}
                className="mr-2 w-4 h-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
              />
              <span className="text-sm text-gray-700 dark:text-gray-300">Vision</span>
            </label>
            <label className="flex items-center">
              <input
                type="checkbox"
                checked={formData.supports_prompt_caching}
                onChange={(e) =>
                  setFormData({ ...formData, supports_prompt_caching: e.target.checked })
                }
                className="mr-2 w-4 h-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
              />
              <span className="text-sm text-gray-700 dark:text-gray-300">Prompt Caching</span>
            </label>
          </div>
        </div>

        {/* Pricing */}
        <div className="space-y-3 p-4 bg-blue-50 dark:bg-blue-900/20 rounded-lg border border-blue-200 dark:border-blue-800">
          <h3 className="text-sm font-medium text-blue-900 dark:text-blue-100">
            Pricing (per MTok)
          </h3>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-xs text-gray-600 dark:text-gray-400 mb-1">
                Input ($)
              </label>
              <input
                type="number"
                step="0.01"
                value={formData.input_per_mtok}
                onChange={(e) =>
                  setFormData({ ...formData, input_per_mtok: parseFloat(e.target.value) })
                }
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                min="0"
              />
            </div>
            <div>
              <label className="block text-xs text-gray-600 dark:text-gray-400 mb-1">
                Output ($)
              </label>
              <input
                type="number"
                step="0.01"
                value={formData.output_per_mtok}
                onChange={(e) =>
                  setFormData({ ...formData, output_per_mtok: parseFloat(e.target.value) })
                }
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                min="0"
              />
            </div>
          </div>

          {formData.supports_prompt_caching && (
            <div className="grid grid-cols-2 gap-4 pt-2 border-t border-blue-200 dark:border-blue-700">
              <div>
                <label className="block text-xs text-gray-600 dark:text-gray-400 mb-1">
                  Cache Creation ($)
                </label>
                <input
                  type="number"
                  step="0.01"
                  value={formData.cache_creation_per_mtok}
                  onChange={(e) =>
                    setFormData({
                      ...formData,
                      cache_creation_per_mtok: parseFloat(e.target.value),
                    })
                  }
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                  min="0"
                />
              </div>
              <div>
                <label className="block text-xs text-gray-600 dark:text-gray-400 mb-1">
                  Cache Read ($)
                </label>
                <input
                  type="number"
                  step="0.01"
                  value={formData.cache_read_per_mtok}
                  onChange={(e) =>
                    setFormData({ ...formData, cache_read_per_mtok: parseFloat(e.target.value) })
                  }
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                  min="0"
                />
              </div>
            </div>
          )}
        </div>

        {/* Status */}
        <div className="space-y-2">
          <label className="flex items-center">
            <input
              type="checkbox"
              checked={formData.is_active}
              onChange={(e) => setFormData({ ...formData, is_active: e.target.checked })}
              className="mr-2 w-4 h-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
            />
            <span className="text-sm text-gray-700 dark:text-gray-300">Active</span>
          </label>
          <label className="flex items-center">
            <input
              type="checkbox"
              checked={formData.is_recommended}
              onChange={(e) => setFormData({ ...formData, is_recommended: e.target.checked })}
              className="mr-2 w-4 h-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
            />
            <span className="text-sm text-gray-700 dark:text-gray-300">Recommended</span>
          </label>
        </div>

        {/* Error Message */}
        {errors.submit && (
          <div className="p-3 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg">
            <p className="text-red-600 dark:text-red-400 text-sm">{errors.submit}</p>
          </div>
        )}

        {/* Actions */}
        <div className="flex justify-end gap-3 pt-4">
          <button
            type="button"
            onClick={handleClose}
            disabled={isSubmitting}
            className="px-4 py-2 border border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors disabled:opacity-50"
          >
            Cancel
          </button>
          <button
            type="submit"
            disabled={isSubmitting}
            className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-50"
          >
            {isSubmitting ? 'Creating...' : 'Create Model'}
          </button>
        </div>
      </form>
    </Modal>
  );
}
