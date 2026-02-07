'use client';

import { useState, useEffect } from 'react';
import { ModelWithProvider } from '@/lib/db/types';
import { ModelCard } from './ModelCard';
import { ModelCreateModal } from './ModelCreateModal';
import { ModelEditModal } from './ModelEditModal';
import { ModelDeleteModal } from './ModelDeleteModal';
import { Plus, Loader2 } from 'lucide-react';

export function ModelList() {
  const [models, setModels] = useState<ModelWithProvider[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [showCreateModal, setShowCreateModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [selectedModel, setSelectedModel] = useState<ModelWithProvider | null>(null);

  const loadModels = async () => {
    try {
      setLoading(true);
      setError(null);
      const response = await fetch('/api/models?withProvider=true');

      if (!response.ok) {
        throw new Error('Failed to load models');
      }

      const data = await response.json();
      setModels(data.data || []);
    } catch (err) {
      console.error('Error loading models:', err);
      setError(err instanceof Error ? err.message : 'Failed to load models');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadModels();
  }, []);

  const handleEdit = (model: ModelWithProvider) => {
    setSelectedModel(model);
    setShowEditModal(true);
  };

  const handleDelete = (model: ModelWithProvider) => {
    setSelectedModel(model);
    setShowDeleteModal(true);
  };

  const handleSuccess = () => {
    loadModels();
  };

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
          <h2 className="text-2xl font-bold text-gray-900 dark:text-gray-100">Models</h2>
          <p className="text-gray-600 dark:text-gray-400 mt-1">
            Manage language models and pricing
          </p>
        </div>
        <button
          onClick={() => setShowCreateModal(true)}
          className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
        >
          <Plus className="w-4 h-4" />
          Create Model
        </button>
      </div>

      {/* Model Grid (Grouped by Provider) */}
      {models.length === 0 ? (
        <div className="text-center py-12">
          <p className="text-gray-500 dark:text-gray-400 mb-4">No models found</p>
          <button
            onClick={() => setShowCreateModal(true)}
            className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
          >
            Create Your First Model
          </button>
        </div>
      ) : (
        <div className="space-y-8">
          {Object.entries(modelsByProvider).map(([providerName, providerModels]) => (
            <div key={providerName}>
              {/* Provider Header */}
              <div className="flex items-center gap-3 mb-4">
                <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100">
                  {providerName}
                </h3>
                <span className="px-2 py-1 bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-400 text-xs rounded">
                  {providerModels.length} {providerModels.length === 1 ? 'model' : 'models'}
                </span>
              </div>

              {/* Model Cards */}
              <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
                {providerModels.map((model) => (
                  <ModelCard
                    key={model.id}
                    model={model}
                    onEdit={handleEdit}
                    onDelete={handleDelete}
                  />
                ))}
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Modals */}
      <ModelCreateModal
        isOpen={showCreateModal}
        onClose={() => setShowCreateModal(false)}
        onSuccess={handleSuccess}
      />

      <ModelEditModal
        isOpen={showEditModal}
        onClose={() => {
          setShowEditModal(false);
          setSelectedModel(null);
        }}
        onSuccess={handleSuccess}
        model={selectedModel}
      />

      <ModelDeleteModal
        isOpen={showDeleteModal}
        onClose={() => {
          setShowDeleteModal(false);
          setSelectedModel(null);
        }}
        onSuccess={handleSuccess}
        model={selectedModel}
      />
    </div>
  );
}
