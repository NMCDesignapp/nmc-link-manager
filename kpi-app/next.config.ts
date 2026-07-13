import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  typescript: {
    ignoreBuildErrors: true,
  },
  images: {
    unoptimized: true,
  },
  serverExternalPackages: ["@prisma/client", "@neondatabase/serverless"],
  // Fix: Turbopack không infer đúng workspace root khi có 2 lockfiles
  // (kpi-app/package-lock.json + parent package-lock.json)
  turbopack: {
    root: __dirname,
  },
  // Allow CORS from main nc-link app if needed (for future API sharing)
  async headers() {
    return [
      {
        source: "/(.*)",
        headers: [
          { key: "Access-Control-Allow-Origin", value: "*" },
          { key: "Access-Control-Allow-Methods", value: "GET,POST,PUT,DELETE,OPTIONS" },
          { key: "Access-Control-Allow-Headers", value: "Content-Type, Authorization" },
        ],
      },
    ];
  },
};

export default nextConfig;
