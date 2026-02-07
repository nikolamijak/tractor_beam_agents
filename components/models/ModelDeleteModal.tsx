'use client';

import { useState, useEffect } from 'react';
import { Modal } from '@/components/ui/Modal';
import { ModelWithProvider } from '@/lib/db/types';
import { AlertTriangle, Loader2 } from 'lucide-react';

interface ModelDeleteModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
  model: ModelWithProvider | null;
}

interface ModelUsage {
  agentCount: number;
  agentNames: string[];
}

export function ModelDeleteModal({ isOpen, onClose, onSuccess, model }: ModelDeleteModalProps) {
  const [isDeleting, setIsDeleting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [usage, setUsage] = useState<ModelUsage | null>(null);
  const [loadingUsage, setLoadingUsage] = useState(false);

  useEffect(() => {
    async function checkUsage() {
      if (!model || !isOpen) return;

      setLoadingUsage(true);
      setError(null);

      try {
        const response = await fetch(`/api/models/${model.id}/usage`);
        const data = await response.json();

        if (response.ok) {
          setUsage(data.data);
        } else {
          setError(data.error || 'Failed to check model usage');
        }
      } catch (err) {
        console.error('Error checking model usage:', err);
        setError('Failed to check model usage');
      } finally {
        setLoadingUsage(false);
      }
    }

    checkUsage();
  }, [model, isOpen]);

  const handleDelete = async () => {
    if (!model) return;

    // Block deletion if agents are using this model
    if (usage && usage.agentCount > 0) {
      setError(
        `Cannot delete model: ${usage.agentCount} agent(s) are using this model. Please reassign these agents to a different model first.`
      );
      return;
    }

    setIsDeleting(true);
    setError(null);

    try {
      const response = await fetch(`/api/models/${model.id}`, {
        method: 'DELETE',
      });

      const result = await response.json();

      if (!response.ok) {
        setError(result.error || 'Failed to delete model');
        return;
      }

      onSuccess();
      onClose();
    } catch (err) {
      console.error('Error deleting model:', err);
      setError('Failed to delete model');
    } finally {
      setIsDeleting(false);
    }
  };

  const handleClose = () => {
    if (!isDeleting) {
      setError(null);
      setUsage(null);
      onClose();
    }
  };

  if (!model) return null;

  return (
    <Modal isOpen={isOpen} onClose={handleClose} title="Delete Model" maxWidth="md">
      <div className="space-y-4">
        {/* Warning Icon */}
        <div className="flex items-center justify-center w-12 h-12 mx-auto bg-red-100 dark:bg-red-900/30 rounded-full">
          <AlertTriangle className="w-6 h-6 text-red-600 dark:text-red-400" />
        </div>

        {/* Warning Message */}
        <div className="text-center">
          <p className="text-gray-700 dark:text-gray-300 mb-2">
            Are you sure you want to delete the model:
          </p>
          <p className="text-lg font-semibold text-gray-900 dark:text-gray-100">
            {model.display_name}
          </p>
          <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
            {model.model_name} ({model.provider.display_name})
          </p>
        </div>

        {/* Usage Information */}
        {loadingUsage ? (
          <div className="flex items-center justify-center py-4">
            <Loader2 className="w-5 h-5 text-blue-600 animate-spin" />
            <span className="ml-2 text-sm text-gray-600 dark:text-gray-400">
              Checking model usage...
            </span>
          </div>
        ) : usage && usage.agentCount > 0 ? (
          <div className="p-4 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg">
            <p className="text-red-800 dark:text-red-200 text-sm font-medium mb-2">
              ⚠️ Cannot delete: {usage.agentCount} agent(s) are using this model
            </p>
            <div className="max-h-32 overflow-y-auto">
              <ul className="text-sm text-red-700 dark:text-red-300 space-y-1">
                {usage.agentNames.map((name) => (
                  <li key={name} className="list-disc list-inside">
                    {name}
                  </li>
                ))}
              </ul>
            </div>
            <p className="text-xs text-red-600 dark:text-red-400 mt-2">
              Please reassign these agents to a different model before deleting.
            </p>
          </div>
        ) : (
          <div className="p-4 bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 rounded-lg">
            <p className="text-green-800 dark:text-green-200 text-sm">
              ✓ This model is not currently in use by any agents and can be safely deleted.
            </p>
          </div>
        )}

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
            disabled={isDeleting || loadingUsage || (usage !== null && usage.agentCount > 0)}
            className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {isDeleting ? 'Deleting...' : 'Delete Model'}
          </button>
        </div>
      </div>
    </Modal>
  );
}
