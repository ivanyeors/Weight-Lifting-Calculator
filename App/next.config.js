/** @type {import('next').NextConfig} */
const isProd = process.env.NODE_ENV === 'production'

const nextConfig = {
  // Only apply basePath/assetPrefix in production (e.g. GitHub Pages)
  basePath: isProd ? '/Weight-Lifting-Calculator' : undefined,
  assetPrefix: isProd ? '/Weight-Lifting-Calculator/' : undefined,
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
