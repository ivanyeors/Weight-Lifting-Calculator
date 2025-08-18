/** @type {import('next').NextConfig} */
const isProd = process.env.NODE_ENV === 'production'

const repoName = process.env.GITHUB_REPOSITORY
  ? `/${process.env.GITHUB_REPOSITORY.split('/')[1]}`
  : '/Weight-Lifting-Calculator'

const nextConfig = {
  // Only apply basePath/assetPrefix in production (e.g. GitHub Pages)
  basePath: isProd ? repoName : undefined,
  assetPrefix: isProd ? `${repoName}/` : undefined,
  trailingSlash: true,
  output: 'export',
  images: {
    unoptimized: true
  },
  webpack(config) {
    config.module.rules.push({
      test: /\.svg$/,
      use: ['@svgr/webpack'],
    });
    return config;
  },
}

module.exports = nextConfig
