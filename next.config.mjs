/** @type {import('next').NextConfig} */
const nextConfig = {
  images: {
    remotePatterns: [
      {
        protocol: "https",
        hostname: "www.paypalobjects.com",
      },
    ],
  },
  typescript: {
    // Rely on GitHub Actions to catch type errors instead of Vercel build
    ignoreBuildErrors: true,
  },
  experimental: {},
}

export default nextConfig