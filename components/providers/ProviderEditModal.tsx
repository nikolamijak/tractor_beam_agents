'use client';

import { useState, useEffect } from 'react';
import { Modal } from '@/components/ui/Modal';
import { Provider } from '@/lib/db/types';

interface ProviderEditModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
  provider: Provider | null;
}

export function ProviderEditModal({
  isOpen,
  onClose,
  onSuccess,
  provider,
}: ProviderEditModalProps) {
  const [formData, setFormData] = useState({
    display_name: '',
    provider_type: 'api' as 'api' | 'self_hosted' | 'cloud',
    api_base_url: '',
    auth_type: 'api_key',
    api_key: '',
    update_api_key: false, // Flag to indicate if user wants to update API key
    is_active: true,
    supports_streaming: true,
    supports_function_calling: true,
    supports_vision: false,
  });

  const [errors, setErrors] = useState<Record<string, string>>({});
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    if (provider && isOpen) {
      setFormData({
        display_name: provider.display_name,
        provider_type: provider.provider_type,
        api_base_url: provider.api_base_url || '',
        auth_type: provider.auth_type || 'api_key',
        api_key: '', // Don't populate API key for security
        update_api_key: false,
        is_active: provider.is_active,
        supports_streaming: provider.supports_streaming,
        supports_function_calling: provider.supports_function_calling,
        supports_vision: provider.supports_vision,
      });
    }
  }, [provider, isOpen]);

  const validateForm = () => {
    const newErrors: Record<string, string> = {};

    if (!formData.display_name.trim()) {
      newErrors.display_name = 'Display name is required';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!provider || !validateForm()) return;

    setIsSubmitting(true);

    try {
      const payload: any = {
        display_name: formData.display_name,
        provider_type: formData.provider_type,
        api_base_url: formData.api_base_url || null,
        auth_type: formData.auth_type || null,
        is_active: formData.is_active,
        supports_streaming: formData.supports_streaming,
        supports_function_calling: formData.supports_function_calling,
        supports_vision: formData.supports_vision,
      };

      // Only include API key if user wants to update it
      if (formData.update_api_key && formData.api_key) {
        payload.api_key = formData.api_key;
      }

      const response = await fetch(`/api/providers/${provider.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });

      const result = await response.json();

      if (!response.ok) {
        setErrors({ submit: result.error || 'Failed to update provider' });
        return;
      }

      setErrors({});
      onSuccess();
      onClose();
    } catch (error) {
      console.error('Error updating provider:', error);
      setErrors({ submit: 'Failed to update provider' });
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

  if (!provider) return null;

  return (
    <Modal isOpen={isOpen} onClose={handleClose} title="Edit Provider" maxWidth="xl">
      <form onSubmit={handleSubmit} className="space-y-4">
        {/* Provider Name (Read-only) */}
        <div>
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
            Provider Name
          </label>
          <input
            type="text"
            value={provider.provider_name}
            disabled
            className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 bg-gray-100 dark:bg-gray-800 text-gray-500 dark:text-gray-400 rounded-lg cursor-not-allowed"
          />
          <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
            Provider name cannot be changed
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

        {/* Provider Type */}
        <div>
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
            Provider Type
          </label>
          <select
            value={formData.provider_type}
            onChange={(e) =>
              setFormData({
                ...formData,
                provider_type: e.target.value as 'api' | 'self_hosted' | 'cloud',
              })
            }
            className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
          >
            <option value="api">API</option>
            <option value="self_hosted">Self-Hosted</option>
            <option value="cloud">Cloud</option>
          </select>
        </div>

        {/* API Base URL */}
        <div>
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
            API Base URL
          </label>
          <input
            type="url"
            value={formData.api_base_url}
            onChange={(e) => setFormData({ ...formData, api_base_url: e.target.value })}
            className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
            placeholder="https://api.provider.com/v1"
          />
        </div>

        {/* Auth Type */}
        <div>
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
            Auth Type
          </label>
          <select
            value={formData.auth_type}
            onChange={(e) => setFormData({ ...formData, auth_type: e.target.value })}
            className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
          >
            <option value="api_key">API Key</option>
            <option value="oauth">OAuth</option>
            <option value="service_account">Service Account</option>
          </select>
        </div>

        {/* API Key */}
        <div>
          <div className="flex items-center mb-2">
            <input
              type="checkbox"
              checked={formData.update_api_key}
              onChange={(e) =>
                setFormData({ ...formData, update_api_key: e.target.checked, api_key: '' })
              }
              className="mr-2 w-4 h-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
            />
            <label className="text-sm font-medium text-gray-700 dark:text-gray-300">
              Update API Key
            </label>
          </div>
          {formData.update_api_key && (
            <>
              <input
                type="password"
                value={formData.api_key}
                onChange={(e) => setFormData({ ...formData, api_key: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 font-mono"
                placeholder="Enter new API key..."
              />
              <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                Leave empty to keep existing key unchanged.
              </p>
            </>
          )}
          {!formData.update_api_key && provider?.api_key && (
            <p className="text-sm text-gray-600 dark:text-gray-400">
              API Key: ••••••••{provider.api_key.slice(-4)}
            </p>
          )}
        </div>

        {/* Capabilities */}
        <div className="space-y-2">
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">
            Capabilities
          </label>
          <div className="space-y-2">
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
          </div>
        </div>

        {/* Active Status */}
        <div>
          <label className="flex items-center">
            <input
              type="checkbox"
              checked={formData.is_active}
              onChange={(e) => setFormData({ ...formData, is_active: e.target.checked })}
              className="mr-2 w-4 h-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
            />
            <span className="text-sm text-gray-700 dark:text-gray-300">Active</span>
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
