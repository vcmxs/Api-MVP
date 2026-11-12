import path from 'node:path'
import { fileURLToPath } from 'node:url'

// The repo root also contains a package-lock.json (the Express API), so Next
// would infer *that* as the workspace root, look for `tailwindcss` in the root
// node_modules and fail to compile the app in dev. Pinning the root to this
// folder keeps module resolution (and file tracing) inside the web app.
const projectRoot = path.dirname(fileURLToPath(import.meta.url))

/** @type {import('next').NextConfig} */
const nextConfig = {
  turbopack: {
    root: projectRoot,
  },
  typescript: {
    ignoreBuildErrors: true,
  },
  images: {
    unoptimized: true,
  },
  output: 'standalone',
}

export default nextConfig
