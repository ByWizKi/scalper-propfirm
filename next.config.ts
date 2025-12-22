import type { NextConfig } from "next"

const nextConfig: NextConfig = {
  /* config options here */

  // Headers de sécurité HTTP
  async headers() {
    return [
      {
        source: "/:path*",
        headers: [
          {
            key: "X-DNS-Prefetch-Control",
            value: "on",
          },
          {
            key: "Strict-Transport-Security",
            value: "max-age=63072000; includeSubDomains; preload",
          },
          {
            key: "X-Frame-Options",
            value: "SAMEORIGIN",
          },
          {
            key: "X-Content-Type-Options",
            value: "nosniff",
          },
          {
            key: "X-XSS-Protection",
            value: "1; mode=block",
          },
          {
            key: "Referrer-Policy",
            value: "strict-origin-when-cross-origin",
          },
          {
            key: "Permissions-Policy",
            value: "camera=(), microphone=(), geolocation=()",
          },
        ],
      },
    ]
  },

  // Variables d'environnement publiques
  env: {
    NEXT_PUBLIC_APP_NAME: "Scalper Propfirm",
    NEXT_PUBLIC_APP_VERSION: "1.0.0",
  },

  // Optimisation des performances
  poweredByHeader: false, // Cacher "X-Powered-By: Next.js"
  compress: true,

  // Code splitting et lazy loading
  experimental: {
    optimizePackageImports: ["@dnd-kit/core", "@dnd-kit/sortable", "d3", "lucide-react"],
  },

  // Optimisation des images
  images: {
    formats: ["image/avif", "image/webp"],
    deviceSizes: [640, 750, 828, 1080, 1200, 1920, 2048, 3840],
    imageSizes: [16, 32, 48, 64, 96, 128, 256, 384],
  },

  // React strict mode pour détecter les problèmes
  reactStrictMode: true,
}

export default nextConfig
