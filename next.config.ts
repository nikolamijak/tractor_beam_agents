import type { NextConfig } from 'next';

const nextConfig: NextConfig = {
  /* config options here */
  experimental: {
    serverActions: {
      bodySizeLimit: '10mb',
    },
  },

  // Externalize packages that should not be bundled
  serverExternalPackages: ['knex', 'pg', 'pg-native', '@dbos-inc/dbos-sdk'],
};

export default nextConfig;
