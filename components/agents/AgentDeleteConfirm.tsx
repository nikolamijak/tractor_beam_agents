'use client';

import { useState } from 'react';
import { Modal } from '@/components/ui/Modal';

interface Agent {
  id: string;
  agent_name: string;
  display_name: string;
  is_core: boolean;
}

interface AgentDeleteConfirmProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: () => void;
  agent: Agent;
}

export function AgentDeleteConfirm({ isOpen, onClose, onConfirm, agent }: AgentDeleteConfirmProps) {
  const [confirmText, setConfirmText] = useState('');
  const [isDeleting, setIsDeleting] = useState(false);
  const [error, setError] = useState('');

  const requireConfirmation = agent.is_core;
  const isConfirmed = requireConfirmation ? confirmText === agent.agent_name : true;

  const handleDelete = async () => {
    if (!isConfirmed) return;

    setIsDeleting(true);
    setError('');

    try {
      const response = await fetch(`/api/agents/${agent.id}`, {
        method: 'DELETE',
      });

      const result = await response.json();

      if (result.success) {
        setConfirmText('');
        onConfirm();
      } else {
        setError(result.error || 'Failed to delete agent');
      }
    } catch (err) {
      setError('Network error. Please try again.');
    } finally {
      setIsDeleting(false);
    }
  };

  const handleClose = () => {
    setConfirmText('');
    setError('');
    onClose();
  };

  return (
    <Modal isOpen={isOpen} onClose={handleClose} title="Delete Agent" maxWidth="md">
      <div className="space-y-4">
        {/* Warning Icon */}
        <div className="flex items-center justify-center">
          <div className="w-16 h-16 rounded-full bg-red-100 flex items-center justify-center">
            <svg
              className="w-8 h-8 text-red-600"
              fill="none"
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth="2"
              viewBox="0 0 24 24"
              stroke="currentColor"
            >
              <path d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"></path>
            </svg>
          </div>
        </div>

        {/* Warning Message */}
        <div className="text-center">
          <h3 className="text-lg font-semibold text-gray-900 mb-2">Are you sure?</h3>
          <p className="text-gray-600 mb-4">
            You are about to delete the agent <span className="font-semibold">{agent.display_name}</span>.
          </p>
          {agent.is_core && (
            <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-3 mb-4">
              <p className="text-sm text-yellow-900">
                ⚠️ This is a <strong>core agent</strong>. Deleting it may affect system functionality.
              </p>
            </div>
          )}
          <p className="text-sm text-red-600 font-medium">
            This action cannot be undone.
          </p>
        </div>

        {/* Confirmation Input (for core agents) */}
        {requireConfirmation && (
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              Type <code className="bg-gray-100 px-2 py-1 rounded text-red-600">{agent.agent_name}</code> to
              confirm:
            </label>
            <input
              type="text"
              value={confirmText}
              onChange={(e) => setConfirmText(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-red-500"
              placeholder={agent.agent_name}
            />
          </div>
        )}

        {/* Error Message */}
        {error && (
          <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg p-3">
            <p className="text-red-800 dark:text-red-200 text-sm">{error}</p>
          </div>
        )}

        {/* Actions */}
        <div className="flex items-center justify-end gap-3 pt-4">
          <button
            type="button"
            onClick={handleClose}
            className="px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg text-gray-700 dark:text-gray-300 bg-white dark:bg-gray-700 hover:bg-gray-50 dark:hover:bg-gray-600"
            disabled={isDeleting}
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={handleDelete}
            className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 disabled:opacity-50"
            disabled={!isConfirmed || isDeleting}
          >
            {isDeleting ? 'Deleting...' : 'Delete Agent'}
          </button>
        </div>
      </div>
    </Modal>
  );
}
