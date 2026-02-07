'use client';

import { useState, useEffect } from 'react';
import { ModelWithProvider } from '@/lib/db/types';

interface ModelSelectorProps {
  value: string | null;
  onChange: (modelId: string) => void;
  error?: string;
  required?: boolean;
  className?: string;
}

export function ModelSelector({
  value,
  onChange,
  error,
  required = true,
  className = '',
}: ModelSelectorProps) {
  const [models, setModels] = useState<ModelWithProvider[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);

  useEffect(() => {
    async function loadModels() {
      try {
        setLoading(true);
        setLoadError(null);
        const response = await fetch('/api/models?withProvider=true&isActive=true');

        if (!response.ok) {
          throw new Error(`Failed to load models: ${response.statusText}`);
        }

        const data = await response.json();
        setModels(data.data || []);
      } catch (err) {
        console.error('Error loading models:', err);
        setLoadError(err instanceof Error ? err.message : 'Failed to load models');
      } finally {
        setLoading(false);
      }
    }

    loadModels();
  }, []);

  // Group models by provider
  const modelsByProvider = models.reduce(
    (acc, model) => {
      const providerName = model.provider.display_name;
      if (!acc[providerName]) {
        acc[providerName] = [];
      }
      acc[providerName].push(model);
      return acc;
    },
    {} as Record<string, ModelWithProvider[]>
  );

  // Get selected model for display
  const selectedModel = models.find((m) => m.id === value);

  if (loading) {
    return (
      <div className={className}>
        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
          Model {required && <span className="text-red-500">*</span>}
        </label>
        <div className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 rounded-lg">
          <span className="text-gray-500 dark:text-gray-400">Loading models...</span>
        </div>
      </div>
    );
  }

  if (loadError) {
    return (
      <div className={className}>
        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
          Model {required && <span className="text-red-500">*</span>}
        </label>
        <div className="w-full px-3 py-2 border border-red-300 dark:border-red-600 bg-red-50 dark:bg-red-900/20 rounded-lg">
          <span className="text-red-600 dark:text-red-400 text-sm">{loadError}</span>
        </div>
      </div>
    );
  }

  return (
    <div className={className}>
      <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
        Model {required && <span className="text-red-500">*</span>}
      </label>

      <select
        value={value || ''}
        onChange={(e) => onChange(e.target.value)}
        className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
        required={required}
      >
        <option value="">Select a model...</option>
        {Object.entries(modelsByProvider).map(([providerName, providerModels]) => (
          <optgroup key={providerName} label={providerName}>
            {providerModels.map((model) => (
              <option key={model.id} value={model.id}>
                {model.display_name}
                {model.is_recommended && ' (Recommended)'}
                {' - '}$
                {model.pricing.input_per_mtok.toFixed(2)}/$
                {model.pricing.output_per_mtok.toFixed(2)} per MTok
              </option>
            ))}
          </optgroup>
        ))}
      </select>

      {error && <p className="text-red-500 text-sm mt-1">{error}</p>}

      {/* Display selected model details */}
      {selectedModel && (
        <div className="mt-2 p-3 bg-gray-50 dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700">
          <div className="text-sm space-y-1">
            <div className="flex items-center justify-between">
              <span className="text-gray-600 dark:text-gray-400">Provider:</span>
              <span className="font-medium text-gray-900 dark:text-gray-100">
                {selectedModel.provider.display_name}
              </span>
            </div>
            {selectedModel.context_window && (
              <div className="flex items-center justify-between">
                <span className="text-gray-600 dark:text-gray-400">Context:</span>
                <span className="font-medium text-gray-900 dark:text-gray-100">
                  {selectedModel.context_window.toLocaleString()} tokens
                </span>
              </div>
            )}
            <div className="flex items-center justify-between">
              <span className="text-gray-600 dark:text-gray-400">Pricing:</span>
              <span className="font-medium text-gray-900 dark:text-gray-100">
                ${selectedModel.pricing.input_per_mtok.toFixed(2)} / $
                {selectedModel.pricing.output_per_mtok.toFixed(2)} per MTok
              </span>
            </div>
            <div className="flex items-center gap-2 flex-wrap mt-2">
              {selectedModel.supports_streaming && (
                <span className="px-2 py-0.5 bg-blue-100 dark:bg-blue-900 text-blue-700 dark:text-blue-300 text-xs rounded">
                  Streaming
                </span>
              )}
              {selectedModel.supports_function_calling && (
                <span className="px-2 py-0.5 bg-green-100 dark:bg-green-900 text-green-700 dark:text-green-300 text-xs rounded">
                  Function Calling
                </span>
              )}
              {selectedModel.supports_vision && (
                <span className="px-2 py-0.5 bg-purple-100 dark:bg-purple-900 text-purple-700 dark:text-purple-300 text-xs rounded">
                  Vision
                </span>
              )}
              {selectedModel.supports_prompt_caching && (
                <span className="px-2 py-0.5 bg-amber-100 dark:bg-amber-900 text-amber-700 dark:text-amber-300 text-xs rounded">
                  Prompt Caching
                </span>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
