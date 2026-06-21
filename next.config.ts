import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Removed output: 'export' to support standard dynamic routing and preview stability
  images: {
    unoptimized: true,
  },
  eslint: {
    ignoreDuringBuilds: true,
  },
  typescript: {
    ignoreBuildErrors: false,
  }
};

export default nextConfig;
