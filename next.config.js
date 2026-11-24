/** @type {import('next').NextConfig} */
const nextConfig = {
  eslint: { ignoreDuringBuilds: true },
  experimental: { serverComponentsExternalPackages: ['mongoose', 'bcryptjs', 'jsonwebtoken'] },
};
module.exports = nextConfig;
