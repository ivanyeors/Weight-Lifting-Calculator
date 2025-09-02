/** @type {import('next').NextConfig} */
const isProd = process.env.NODE_ENV === 'production'

const repoName = process.env.GITHUB_REPOSITORY
  ? `/${process.env.GITHUB_REPOSITORY.split('/')[1]}`
  : '/Weight-Lifting-Calculator'

const nextConfig = {
  // Custom domain configuration - no basePath needed
  trailingSlash: true,
  output: isProd ? 'export' : undefined,
  transpilePackages: ['three'],
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
    config.module.rules.push({
      test: /\.(glsl|vert|frag)$/i,
      exclude: /node_modules/,
      use: [
        {
          loader: 'raw-loader',
        },
      ],
    });
    return config;
  },
}

export default nextConfig
