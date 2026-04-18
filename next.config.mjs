import path from "node:path"
import { fileURLToPath } from "node:url"

/** @type {import('next').NextConfig} */
const configDir = path.dirname(fileURLToPath(import.meta.url))
const remotePatterns = [
  {
    protocol: "https",
    hostname: "**.amazonaws.com",
  },
]

if (process.env.S3_PUBLIC_BASE_URL) {
  const publicUrl = new URL(process.env.S3_PUBLIC_BASE_URL)
  remotePatterns.push({
    protocol: publicUrl.protocol.replace(":", ""),
    hostname: publicUrl.hostname,
  })
}

const nextConfig = {
  reactStrictMode: true,
  images: {
    remotePatterns,
  },
  turbopack: {
    root: configDir,
  },
}

export default nextConfig
