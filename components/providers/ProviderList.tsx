'use client';

import { useState, useEffect } from 'react';
import { Provider } from '@/lib/db/types';
import { ProviderCard } from './ProviderCard';
import { ProviderCreateModal } from './ProviderCreateModal';
import { ProviderEditModal } from './ProviderEditModal';
import { ProviderDeleteModal } from './ProviderDeleteModal';
import { Plus, Loader2 } from 'lucide-react';

export function ProviderList() {
  const [providers, setProviders] = useState<Provider[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [showCreateModal, setShowCreateModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [selectedProvider, setSelectedProvider] = useState<Provider | null>(null);

  const loadProviders = async () => {
    try {
      setLoading(true);
      setError(null);
      const response = await fetch('/api/providers');

      if (!response.ok) {
        throw new Error('Failed to load providers');
      }

      const data = await response.json();
      setProviders(data.data || []);
    } catch (err) {
      console.error('Error loading providers:', err);
      setError(err instanceof Error ? err.message : 'Failed to load providers');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadProviders();
  }, []);

  const handleEdit = (provider: Provider) => {
    setSelectedProvider(provider);
    setShowEditModal(true);
  };

  const handleDelete = (provider: Provider) => {
    setSelectedProvider(provider);
    setShowDeleteModal(true);
  };

  const handleSetDefault = async (provider: Provider) => {
    try {
      const response = await fetch(`/api/providers/${provider.id}/set-default`, {
        method: 'POST',
      });

      if (!response.ok) {
        const result = await response.json();
        alert(result.error || 'Failed to set default provider');
        return;
      }

      loadProviders();
    } catch (err) {
      console.error('Error setting default provider:', err);
      alert('Failed to set default provider');
    }
  };

  const handleSuccess = () => {
    loadProviders();
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="w-8 h-8 text-blue-600 animate-spin" />
      </div>
    );
  }

  if (error) {
    return (
      <div className="p-4 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg">
        <p className="text-red-600 dark:text-red-400">{error}</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-gray-900 dark:text-gray-100">Providers</h2>
          <p className="text-gray-600 dark:text-gray-400 mt-1">
            Manage AI provider configurations
          </p>
        </div>
        <button
          onClick={() => setShowCreateModal(true)}
          className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
        >
          <Plus className="w-4 h-4" />
          Create Provider
        </button>
      </div>

      {/* Provider Grid */}
      {providers.length === 0 ? (
        <div className="text-center py-12">
          <p className="text-gray-500 dark:text-gray-400 mb-4">No providers found</p>
          <button
            onClick={() => setShowCreateModal(true)}
            className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
          >
            Create Your First Provider
          </button>
        </div>
      ) : (
        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
          {providers.map((provider) => (
            <ProviderCard
              key={provider.id}
              provider={provider}
              onEdit={handleEdit}
              onDelete={handleDelete}
              onSetDefault={handleSetDefault}
            />
          ))}
        </div>
      )}

      {/* Modals */}
      <ProviderCreateModal
        isOpen={showCreateModal}
        onClose={() => setShowCreateModal(false)}
        onSuccess={handleSuccess}
      />

      <ProviderEditModal
        isOpen={showEditModal}
        onClose={() => {
          setShowEditModal(false);
          setSelectedProvider(null);
        }}
        onSuccess={handleSuccess}
        provider={selectedProvider}
      />

      <ProviderDeleteModal
        isOpen={showDeleteModal}
        onClose={() => {
          setShowDeleteModal(false);
          setSelectedProvider(null);
        }}
        onSuccess={handleSuccess}
        provider={selectedProvider}
      />
    </div>
  );
}
