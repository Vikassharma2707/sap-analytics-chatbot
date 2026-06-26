import type { NextConfig } from 'next';

const isVercel = Boolean(process.env.VERCEL);

const nextConfig: NextConfig = {
  reactStrictMode: true,
  output: isVercel ? 'standalone' : undefined,
  experimental: {
    optimizePackageImports: ['echarts', 'lucide-react'],
  },
  async rewrites() {
    // On Vercel: /api/v1/* is handled by the Python serverless function — no rewrite needed.
    // Locally: proxy to the FastAPI dev server.
    if (isVercel) return [];
    return [
      {
        source: '/api/v1/:path*',
        destination: `${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000/api/v1'}/:path*`,
      },
    ];
  },
};

export default nextConfig;
