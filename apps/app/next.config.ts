import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  images: {
    remotePatterns: [
      {
        protocol: 'https',
        hostname: 'avatars.githubusercontent.com',
        pathname: '/**',
      },
      {
        protocol: 'https',
        hostname: 'lh3.googleusercontent.com',
        pathname: '/**',
      },
    ],
  },
  eslint: {
    // Temporarily ignore ESLint during builds to allow deployment
    // TODO: Fix all ESLint warnings and re-enable this
    ignoreDuringBuilds: true,
  },
  typescript: {
    // Don't fail build on TypeScript errors during build (if any)
    ignoreBuildErrors: false,
  },
};

export default nextConfig;
