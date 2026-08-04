import path from "node:path";
import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  typescript: {
    ignoreBuildErrors: true,
  },
  images: {
    unoptimized: true,
  },
  serverExternalPackages: ["ws", "xlsx"],
  turbopack: {
    resolveAlias: {
      xlsx: "./src/lib/xlsx-contest-wrapper.ts",
    },
  },
  webpack: (config, { isServer }) => {
    if (!isServer) {
      config.resolve.alias = {
        ...(config.resolve.alias || {}),
        xlsx: path.resolve(process.cwd(), "src/lib/xlsx-contest-wrapper.ts"),
      };
    }
    return config;
  },
  allowedDevOrigins: [
    "http://127.0.0.1:3099",
    "http://localhost:3099",
    "http://0.0.0.0:3099",
    "http://21.0.4.40:3099",
    "http://21.0.13.29:3000",
    "http://localhost:3000",
  ],
};

export default nextConfig;
