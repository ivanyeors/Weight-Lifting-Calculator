/** @type {import('next').NextConfig} */
const isProd = process.env.NODE_ENV === 'production'

const repoName = process.env.GITHUB_REPOSITORY
  ? `/${process.env.GITHUB_REPOSITORY.split('/')[1]}`
  : '/Weight-Lifting-Calculator'

const nextConfig = {
  // Only apply basePath/assetPrefix in production (e.g. GitHub Pages)
  basePath: isProd ? repoName : undefined,
  assetPrefix: isProd ? `${repoName}` : undefined,
  trailingSlash: true,
  output: isProd ? 'export' : undefined,
  eslint: {
    ignoreDuringBuilds: true,
  },
  typescript: {
    ignoreBuildErrors: true,
  },
  images: {
    unoptimized: true
  },

  async redirects() {
    return [
      {
        source: '/favicon.ico',
        destination: '/logo-dark.svg',
        permanent: true,
      },
    ]
  },
  webpack(config) {
    config.module.rules.push({
      test: /\.svg$/,
      use: ['@svgr/webpack'],
    });
    return config;
  },
}

export default nextConfig
