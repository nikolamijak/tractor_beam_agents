'use client';

import { Provider } from '@/lib/db/types';
import { Edit, Trash2, CheckCircle, XCircle, Star } from 'lucide-react';

interface ProviderCardProps {
  provider: Provider;
  onEdit: (provider: Provider) => void;
  onDelete: (provider: Provider) => void;
  onSetDefault: (provider: Provider) => void;
}

export function ProviderCard({ provider, onEdit, onDelete, onSetDefault }: ProviderCardProps) {
  return (
    <div className="bg-white dark:bg-gray-800 rounded-lg shadow-md border border-gray-200 dark:border-gray-700 p-6 hover:shadow-lg transition-shadow">
      {/* Header */}
      <div className="flex items-start justify-between mb-4">
        <div className="flex-1">
          <div className="flex items-center gap-2">
            <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100">
              {provider.display_name}
            </h3>
            {provider.is_default && (
              <Star className="w-4 h-4 text-amber-500 fill-amber-500" aria-label="Default Provider" />
            )}
          </div>
          <p className="text-sm text-gray-500 dark:text-gray-400">{provider.provider_name}</p>
        </div>

        <div className="flex items-center gap-2">
          {provider.is_active ? (
            <CheckCircle className="w-5 h-5 text-green-500" aria-label="Active" />
          ) : (
            <XCircle className="w-5 h-5 text-red-500" aria-label="Inactive" />
          )}
        </div>
      </div>

      {/* Provider Type */}
      <div className="mb-3">
        <span className="inline-block px-2 py-1 bg-blue-100 dark:bg-blue-900 text-blue-700 dark:text-blue-300 text-xs rounded">
          {provider.provider_type}
        </span>
      </div>

      {/* API Base URL */}
      {provider.api_base_url && (
        <div className="mb-3">
          <p className="text-xs text-gray-500 dark:text-gray-400">API Base URL</p>
          <p className="text-sm text-gray-700 dark:text-gray-300 font-mono truncate">
            {provider.api_base_url}
          </p>
        </div>
      )}

      {/* API Key */}
      {provider.api_key && (
        <div className="mb-3">
          <p className="text-xs text-gray-500 dark:text-gray-400">API Key</p>
          <p className="text-sm text-gray-700 dark:text-gray-300 font-mono">
            ••••••••{provider.api_key.slice(-4)}
          </p>
        </div>
      )}

      {/* Capabilities */}
      <div className="flex items-center gap-2 flex-wrap mb-4">
        {provider.supports_streaming && (
          <span className="px-2 py-0.5 bg-purple-100 dark:bg-purple-900 text-purple-700 dark:text-purple-300 text-xs rounded">
            Streaming
          </span>
        )}
        {provider.supports_function_calling && (
          <span className="px-2 py-0.5 bg-green-100 dark:bg-green-900 text-green-700 dark:text-green-300 text-xs rounded">
            Function Calling
          </span>
        )}
        {provider.supports_vision && (
          <span className="px-2 py-0.5 bg-blue-100 dark:bg-blue-900 text-blue-700 dark:text-blue-300 text-xs rounded">
            Vision
          </span>
        )}
      </div>

      {/* Actions */}
      <div className="flex items-center gap-2 pt-4 border-t border-gray-200 dark:border-gray-700">
        {!provider.is_default && (
          <button
            onClick={() => onSetDefault(provider)}
            className="flex-1 px-3 py-2 text-sm bg-amber-100 dark:bg-amber-900 text-amber-700 dark:text-amber-300 rounded hover:bg-amber-200 dark:hover:bg-amber-800 transition-colors"
          >
            Set as Default
          </button>
        )}
        <button
          onClick={() => onEdit(provider)}
          className="p-2 text-blue-600 dark:text-blue-400 hover:bg-blue-50 dark:hover:bg-blue-900/30 rounded transition-colors"
          title="Edit Provider"
        >
          <Edit className="w-4 h-4" />
        </button>
        <button
          onClick={() => onDelete(provider)}
          className="p-2 text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/30 rounded transition-colors"
          title="Delete Provider"
        >
          <Trash2 className="w-4 h-4" />
        </button>
      </div>
    </div>
  );
}
