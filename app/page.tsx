import Link from 'next/link';
import { Users, LayoutDashboard, Workflow, Database } from 'lucide-react';

export default function Home() {
  return (
    <div className="min-h-screen flex flex-col items-center justify-center p-8 pt-24 bg-gradient-to-br from-gray-50 to-gray-100 dark:from-gray-900 dark:to-gray-800">
      <main className="max-w-4xl w-full">
        <div className="text-center mb-12">
          <h1 className="text-5xl font-bold mb-4 bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent">
            Tractor Beam
          </h1>
          <p className="text-xl text-gray-600 dark:text-gray-300">
            AI-powered SDLC management with DBOS orchestration
          </p>
        </div>

        <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
          <Link
            href="/dashboard"
            className="group p-6 bg-white dark:bg-gray-800 rounded-lg shadow-lg hover:shadow-xl transition-all duration-300 border border-gray-200 dark:border-gray-700"
          >
            <div className="flex flex-col items-center text-center">
              <div className="mb-4 p-3 bg-blue-100 dark:bg-blue-900 rounded-full group-hover:scale-110 transition-transform">
                <LayoutDashboard className="w-8 h-8 text-blue-600 dark:text-blue-400" />
              </div>
              <h2 className="text-xl font-semibold mb-2">Dashboard</h2>
              <p className="text-gray-600 dark:text-gray-400">
                System overview and agent statistics
              </p>
            </div>
          </Link>

          <Link
            href="/agents"
            className="group p-6 bg-white dark:bg-gray-800 rounded-lg shadow-lg hover:shadow-xl transition-all duration-300 border border-gray-200 dark:border-gray-700"
          >
            <div className="flex flex-col items-center text-center">
              <div className="mb-4 p-3 bg-purple-100 dark:bg-purple-900 rounded-full group-hover:scale-110 transition-transform">
                <Users className="w-8 h-8 text-purple-600 dark:text-purple-400" />
              </div>
              <h2 className="text-xl font-semibold mb-2">Agents</h2>
              <p className="text-gray-600 dark:text-gray-400">
                Browse and manage AI agents
              </p>
            </div>
          </Link>

          <Link
            href="/workflows"
            className="group p-6 bg-white dark:bg-gray-800 rounded-lg shadow-lg hover:shadow-xl transition-all duration-300 border border-gray-200 dark:border-gray-700"
          >
            <div className="flex flex-col items-center text-center">
              <div className="mb-4 p-3 bg-green-100 dark:bg-green-900 rounded-full group-hover:scale-110 transition-transform">
                <Workflow className="w-8 h-8 text-green-600 dark:text-green-400" />
              </div>
              <h2 className="text-xl font-semibold mb-2">Workflows</h2>
              <p className="text-gray-600 dark:text-gray-400">
                Launch and monitor multi-agent workflows
              </p>
            </div>
          </Link>

          <Link
            href="/providers-models"
            className="group p-6 bg-white dark:bg-gray-800 rounded-lg shadow-lg hover:shadow-xl transition-all duration-300 border border-gray-200 dark:border-gray-700"
          >
            <div className="flex flex-col items-center text-center">
              <div className="mb-4 p-3 bg-amber-100 dark:bg-amber-900 rounded-full group-hover:scale-110 transition-transform">
                <Database className="w-8 h-8 text-amber-600 dark:text-amber-400" />
              </div>
              <h2 className="text-xl font-semibold mb-2">Providers / Models</h2>
              <p className="text-gray-600 dark:text-gray-400">
                Configure AI providers and language models
              </p>
            </div>
          </Link>
        </div>
      </main>
    </div>
  );
}
