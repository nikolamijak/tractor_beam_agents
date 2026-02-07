'use client';

import { useState } from 'react';
import { Modal } from '@/components/ui/Modal';
import { Provider } from '@/lib/db/types';
import { AlertTriangle } from 'lucide-react';

interface ProviderDeleteModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
  provider: Provider | null;
}

export function ProviderDeleteModal({
  isOpen,
  onClose,
  onSuccess,
  provider,
}: ProviderDeleteModalProps) {
  const [isDeleting, setIsDeleting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleDelete = async () => {
    if (!provider) return;

    setIsDeleting(true);
    setError(null);

    try {
      const response = await fetch(`/api/providers/${provider.id}`, {
        method: 'DELETE',
      });

      const result = await response.json();

      if (!response.ok) {
        setError(result.error || 'Failed to delete provider');
        return;
      }

      onSuccess();
      onClose();
    } catch (err) {
      console.error('Error deleting provider:', err);
      setError('Failed to delete provider');
    } finally {
      setIsDeleting(false);
    }
  };

  const handleClose = () => {
    if (!isDeleting) {
      setError(null);
      onClose();
    }
  };

  if (!provider) return null;

  return (
    <Modal isOpen={isOpen} onClose={handleClose} title="Delete Provider" maxWidth="md">
      <div className="space-y-4">
        {/* Warning Icon */}
        <div className="flex items-center justify-center w-12 h-12 mx-auto bg-red-100 dark:bg-red-900/30 rounded-full">
          <AlertTriangle className="w-6 h-6 text-red-600 dark:text-red-400" />
        </div>

        {/* Warning Message */}
        <div className="text-center">
          <p className="text-gray-700 dark:text-gray-300 mb-2">
            Are you sure you want to delete the provider:
          </p>
          <p className="text-lg font-semibold text-gray-900 dark:text-gray-100">
            {provider.display_name}
          </p>
          <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
            ({provider.provider_name})
          </p>
        </div>

        {/* Cascade Warning */}
        <div className="p-4 bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800 rounded-lg">
          <p className="text-amber-800 dark:text-amber-200 text-sm">
            <strong>Warning:</strong> This will also delete all models associated with this
            provider. Agents using these models will have their model_id set to NULL.
          </p>
        </div>

        {/* Error Message */}
        {error && (
          <div className="p-3 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg">
            <p className="text-red-600 dark:text-red-400 text-sm">{error}</p>
          </div>
        )}

        {/* Actions */}
        <div className="flex justify-end gap-3 pt-4">
          <button
            type="button"
            onClick={handleClose}
            disabled={isDeleting}
            className="px-4 py-2 border border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors disabled:opacity-50"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={handleDelete}
            disabled={isDeleting}
            className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors disabled:opacity-50"
          >
            {isDeleting ? 'Deleting...' : 'Delete Provider'}
          </button>
        </div>
      </div>
    </Modal>
  );
}
