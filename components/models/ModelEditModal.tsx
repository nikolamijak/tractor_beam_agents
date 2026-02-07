'use client';

import { useState, useEffect } from 'react';
import { Modal } from '@/components/ui/Modal';
import { ModelWithProvider } from '@/lib/db/types';

interface ModelEditModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
  model: ModelWithProvider | null;
}

export function ModelEditModal({ isOpen, onClose, onSuccess, model }: ModelEditModalProps) {
  const [formData, setFormData] = useState({
    display_name: '',
    description: '',
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
    if (model && isOpen) {
      setFormData({
        display_name: model.display_name,
        description: model.description || '',
        is_active: model.is_active,
        is_recommended: model.is_recommended,
        max_tokens: model.max_tokens || 4096,
        context_window: model.context_window || 200000,
        supports_streaming: model.supports_streaming,
        supports_function_calling: model.supports_function_calling,
        supports_vision: model.supports_vision,
        supports_prompt_caching: model.supports_prompt_caching,
        input_per_mtok: model.pricing.input_per_mtok,
        output_per_mtok: model.pricing.output_per_mtok,
        cache_creation_per_mtok: model.pricing.cache_creation_per_mtok || 3.75,
        cache_read_per_mtok: model.pricing.cache_read_per_mtok || 0.3,
        performance_tier: model.performance_tier || 'balanced',
      });
    }
  }, [model, isOpen]);

  const validateForm = () => {
    const newErrors: Record<string, string> = {};

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

    if (!model || !validateForm()) return;

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
        display_name: formData.display_name,
        description: formData.description || null,
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
      };

      const response = await fetch(`/api/models/${model.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });

      const result = await response.json();

      if (!response.ok) {
        setErrors({ submit: result.error || 'Failed to update model' });
        return;
      }

      setErrors({});
      onSuccess();
      onClose();
    } catch (error) {
      console.error('Error updating model:', error);
      setErrors({ submit: 'Failed to update model' });
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

  if (!model) return null;

  return (
    <Modal isOpen={isOpen} onClose={handleClose} title="Edit Model" maxWidth="xl">
      <form onSubmit={handleSubmit} className="space-y-4">
        {/* Model Name (Read-only) */}
        <div>
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
            Model Name
          </label>
          <input
            type="text"
            value={model.model_name}
            disabled
            className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 bg-gray-100 dark:bg-gray-800 text-gray-500 dark:text-gray-400 rounded-lg cursor-not-allowed"
          />
          <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
            Model name cannot be changed
          </p>
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
          />
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
            {isSubmitting ? 'Saving...' : 'Save Changes'}
          </button>
        </div>
      </form>
    </Modal>
  );
}
