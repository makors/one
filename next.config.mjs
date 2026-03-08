/** @type {import('next').NextConfig} */
const nextConfig = {
  watchOptions: {
    ignored: ['**/mobile/**'],
  },
  webpack: (config) => {
    config.watchOptions = {
      ...config.watchOptions,
      ignored: [...(config.watchOptions?.ignored || []), '**/mobile/**'],
    }
    return config
  },
}

export default nextConfig
