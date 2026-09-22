/** @type {import('next').NextConfig} */
export default {
  // The workspace packages ship TypeScript source rather than build output, so
  // Next compiles them alongside the app.
  transpilePackages: [
    '@preflight/core',
    '@preflight/config',
    '@preflight/agents',
    '@preflight/metrics',
  ],
  webpack(config) {
    // Those packages are Node ESM, so their internal imports carry a .js
    // extension even though the files on disk are .ts. Node resolves that;
    // webpack needs telling.
    config.resolve.extensionAlias = {
      ...config.resolve.extensionAlias,
      '.js': ['.ts', '.tsx', '.js'],
    }
    return config
  },
}
