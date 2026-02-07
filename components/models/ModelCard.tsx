'use client';

import { ModelWithProvider } from '@/lib/db/types';
import { Edit, Trash2, CheckCircle, XCircle, Star, DollarSign } from 'lucide-react';

interface ModelCardProps {
  model: ModelWithProvider;
  onEdit: (model: ModelWithProvider) => void;
  onDelete: (model: ModelWithProvider) => void;
}

export function ModelCard({ model, onEdit, onDelete }: ModelCardProps) {
  return (
    <div className="bg-white dark:bg-gray-800 rounded-lg shadow-md border border-gray-200 dark:border-gray-700 p-6 hover:shadow-lg transition-shadow">
      {/* Header */}
      <div className="flex items-start justify-between mb-4">
        <div className="flex-1">
          <div className="flex items-center gap-2 mb-1">
            <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100">
              {model.display_name}
            </h3>
            {model.is_recommended && (
              <Star className="w-4 h-4 text-amber-500 fill-amber-500" aria-label="Recommended" />
            )}
          </div>
          <p className="text-sm text-gray-500 dark:text-gray-400">{model.model_name}</p>
          <p className="text-xs text-gray-400 dark:text-gray-500">
            {model.provider.display_name}
          </p>
        </div>

        <div className="flex items-center gap-2">
          {model.is_active ? (
            <CheckCircle className="w-5 h-5 text-green-500" aria-label="Active" />
          ) : (
            <XCircle className="w-5 h-5 text-red-500" aria-label="Inactive" />
          )}
        </div>
      </div>

      {/* Description */}
      {model.description && (
        <p className="text-sm text-gray-600 dark:text-gray-400 mb-3 line-clamp-2">
          {model.description}
        </p>
      )}

      {/* Pricing */}
      <div className="mb-3 p-3 bg-blue-50 dark:bg-blue-900/20 rounded-lg border border-blue-200 dark:border-blue-800">
        <div className="flex items-center gap-2 mb-1">
          <DollarSign className="w-4 h-4 text-blue-600 dark:text-blue-400" />
          <span className="text-xs font-medium text-blue-700 dark:text-blue-300">
            Pricing (per MTok)
          </span>
        </div>
        <div className="text-sm space-y-0.5">
          <div className="flex justify-between">
            <span className="text-gray-600 dark:text-gray-400">Input:</span>
            <span className="font-medium text-gray-900 dark:text-gray-100">
              ${model.pricing.input_per_mtok.toFixed(2)}
            </span>
          </div>
          <div className="flex justify-between">
            <span className="text-gray-600 dark:text-gray-400">Output:</span>
            <span className="font-medium text-gray-900 dark:text-gray-100">
              ${model.pricing.output_per_mtok.toFixed(2)}
            </span>
          </div>
          {model.supports_prompt_caching && model.pricing.cache_read_per_mtok && (
            <div className="flex justify-between text-xs">
              <span className="text-gray-500 dark:text-gray-400">Cache Read:</span>
              <span className="text-gray-700 dark:text-gray-300">
                ${model.pricing.cache_read_per_mtok.toFixed(2)}
              </span>
            </div>
          )}
        </div>
      </div>

      {/* Context Window */}
      {model.context_window && (
        <div className="mb-3">
          <p className="text-xs text-gray-500 dark:text-gray-400">Context Window</p>
          <p className="text-sm font-medium text-gray-700 dark:text-gray-300">
            {model.context_window.toLocaleString()} tokens
          </p>
        </div>
      )}

      {/* Capabilities */}
      <div className="flex items-center gap-2 flex-wrap mb-4">
        {model.supports_streaming && (
          <span className="px-2 py-0.5 bg-purple-100 dark:bg-purple-900 text-purple-700 dark:text-purple-300 text-xs rounded">
            Streaming
          </span>
        )}
        {model.supports_function_calling && (
          <span className="px-2 py-0.5 bg-green-100 dark:bg-green-900 text-green-700 dark:text-green-300 text-xs rounded">
            Function Calling
          </span>
        )}
        {model.supports_vision && (
          <span className="px-2 py-0.5 bg-blue-100 dark:bg-blue-900 text-blue-700 dark:text-blue-300 text-xs rounded">
            Vision
          </span>
        )}
        {model.supports_prompt_caching && (
          <span className="px-2 py-0.5 bg-amber-100 dark:bg-amber-900 text-amber-700 dark:text-amber-300 text-xs rounded">
            Caching
          </span>
        )}
      </div>

      {/* Actions */}
      <div className="flex items-center gap-2 pt-4 border-t border-gray-200 dark:border-gray-700">
        <button
          onClick={() => onEdit(model)}
          className="flex-1 flex items-center justify-center gap-2 px-3 py-2 text-sm bg-blue-100 dark:bg-blue-900 text-blue-700 dark:text-blue-300 rounded hover:bg-blue-200 dark:hover:bg-blue-800 transition-colors"
        >
          <Edit className="w-4 h-4" />
          Edit
        </button>
        <button
          onClick={() => onDelete(model)}
          className="p-2 text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/30 rounded transition-colors"
          title="Delete Model"
        >
          <Trash2 className="w-4 h-4" />
        </button>
      </div>
    </div>
  );
}
