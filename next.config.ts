import type { NextConfig } from "next";

import { initOpenNextCloudflareForDev } from "@opennextjs/cloudflare";

initOpenNextCloudflareForDev();

const nextConfig: NextConfig = {
  // OpenNext packages the traced runtime from this output for Cloudflare Workers.
  output: "standalone",
  allowedDevOrigins: ["127.0.0.1"],
  reactStrictMode: true,
  typedRoutes: true,
  experimental: {
    serverActions: {
      bodySizeLimit: "15mb",
    },
  },
  images: {
    // Cloudflare Workers cannot bundle the native Sharp optimizer used by Next.js
    // on this Windows development path. Source images are already optimized and
    // served directly, keeping the zero-cost deployment compatible.
    unoptimized: true,
    formats: ["image/avif", "image/webp"],
  },
  async headers() {
    return [
      {
        source: "/admin/:path*",
        headers: [{ key: "X-Robots-Tag", value: "noindex, nofollow" }],
      },
      {
        source: "/api/admin/:path*",
        headers: [{ key: "X-Robots-Tag", value: "noindex, nofollow" }],
      },
    ];
  },
};

export default nextConfig;
