import type { NextConfig } from 'next'

const nextConfig: NextConfig = {
  // Disable ESLint during builds (we check separately)
  eslint: {
    ignoreDuringBuilds: true,
  },
  // Disable TypeScript errors during build (we check separately)
  typescript: {
    ignoreBuildErrors: false,
  },
  // Server external packages — don't bundle these on server
  serverExternalPackages: ['@prisma/client', '@prisma/adapter-pg', 'pg'],
  experimental: {
    // serverComponentsExternalPackages is replaced by serverExternalPackages in Next 14+
  },
}

export default nextConfig
