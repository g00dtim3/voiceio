import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // API proxying: forward /api/* to the Express backend
  async rewrites() {
    return [
      {
        source: "/api/:path*",
        destination: `${process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:4000"}/api/:path*`,
      },
    ];
  },
};

export default nextConfig;
