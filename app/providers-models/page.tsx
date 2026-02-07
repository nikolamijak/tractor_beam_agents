'use client';

import { useState } from 'react';
import { ProviderList } from '@/components/providers/ProviderList';
import { ModelList } from '@/components/models/ModelList';

export default function ProvidersModelsPage() {
  const [activeTab, setActiveTab] = useState<'providers' | 'models'>(
    'providers'
  );

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900 p-8 pt-24">
      <div className="max-w-7xl mx-auto">
        {/* Header */}

        <div className="mb-8">
          <div className="flex items-center justify-between mb-4">
            <div className="text-center flex-1">
              <h1 className="text-5xl font-bold mb-4 bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent">
                Providers & Models
              </h1>
              <p className="text-xl text-gray-600 dark:text-gray-300">
                Manage AI providers and language models
              </p>
            </div>
          </div>
        </div>

        {/* Tabs */}
        <div className="border-b border-gray-200 dark:border-gray-700 mb-6">
          <nav className="flex space-x-8">
            <button
              onClick={() => setActiveTab('providers')}
              className={`py-4 px-1 border-b-2 font-medium text-sm transition-colors ${
                activeTab === 'providers'
                  ? 'border-blue-500 text-blue-600 dark:text-blue-400'
                  : 'border-transparent text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-300'
              }`}
            >
              Providers
            </button>
            <button
              onClick={() => setActiveTab('models')}
              className={`py-4 px-1 border-b-2 font-medium text-sm transition-colors ${
                activeTab === 'models'
                  ? 'border-blue-500 text-blue-600 dark:text-blue-400'
                  : 'border-transparent text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-300'
              }`}
            >
              Models
            </button>
          </nav>
        </div>

        {/* Tab Content */}
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow-lg p-6">
          {activeTab === 'providers' ? <ProviderList /> : <ModelList />}
        </div>
      </div>
    </div>
  );
}
