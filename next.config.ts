import type { NextConfig } from 'next';
import path from 'path';

const nextConfig: NextConfig = {
  output: 'standalone',
  outputFileTracingRoot: path.join(__dirname),
  serverExternalPackages: ['sharp'],
  allowedDevOrigins: ['http://localhost:3002'],
};

export default nextConfig;
