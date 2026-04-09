import type { NextConfig } from "next";

function getBackendProxyTarget() {
  const rawTarget = process.env.NEXT_PUBLIC_API_BASE_URL || "http://localhost:5000/api";

  try {
    const parsed = new URL(rawTarget);
    return `${parsed.protocol}//${parsed.host}`;
  } catch {
    return "http://localhost:5000";
  }
}

const nextConfig: NextConfig = {
  async rewrites() {
    const backendProxyTarget = getBackendProxyTarget();

    return [
      {
        source: "/api/:path*",
        destination: `${backendProxyTarget}/:path*`,
      },
    ];
  },
  images: {
    remotePatterns: [
      {
        protocol: "https",
        hostname: "cdn.prod.website-files.com",
      },
      {
        protocol: "https",
        hostname: "www.ycombinator.com",
      },
      {
        protocol: "https",
        hostname: "flagcdn.com",
      },
    ],
  },
};

export default nextConfig;
